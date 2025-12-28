import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ClubsService } from '../clubs/clubs.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ClubsService)) private clubsService: ClubsService
  ) { }

  // Busca usuário pelo Email (usado no login)
  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Busca todos os usuários
  async findAll(currentUser?: any) {
    // 1. Get total requirements count per class
    const requirements = await this.prisma.requirement.findMany({
      where: { dbvClass: { not: null } },
      select: { dbvClass: true }
    });

    const classTotals: Record<string, number> = {};
    requirements.forEach(r => {
      if (r.dbvClass) {
        classTotals[r.dbvClass] = (classTotals[r.dbvClass] || 0) + 1;
      }
    });

    // Build Where Clause
    const where: Prisma.UserWhereInput = {};
    if (currentUser && currentUser.role === 'COUNSELOR') {
      if (!currentUser.unitId) {
        // If Counselor has no unit, they see no one (or just themselves?)
        // Let's assume they see no one to avoid confusion, or handle error.
        // Returning empty list is safer.
        return [];
      }
      where.unitId = currentUser.unitId;
    } else if (currentUser && currentUser.role === 'INSTRUCTOR') {
      // Instructor sees only their assigned class (assuming their profile has dbvClass set)
      if (currentUser.dbvClass) {
        where.dbvClass = currentUser.dbvClass;
      }
      // Also restrict by Club
      if (currentUser.clubId) where.clubId = currentUser.clubId;

    } else if (currentUser?.clubId && currentUser.email !== 'master@cantinhodbv.com') {
      where.clubId = currentUser.clubId;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clubId: true,
        club: { select: { name: true } },
        unitId: true,
        dbvClass: true,

        isActive: true, // Needed for frontend edit
        status: true, // Needed for approvals
        requirements: {
          where: {
            status: 'APPROVED',
            requirement: { dbvClass: { not: null } }
          },
          select: {
            requirement: {
              select: { dbvClass: true }
            }
          }
        },
        // Extended Profile
        sex: true,
        birthDate: true,
        maritalStatus: true,
        phone: true,
        mobile: true,
        isBaptized: true,
        rg: true,
        issuingOrg: true,
        cpf: true,
        shirtSize: true,
        address: true,
        addressNumber: true,
        neighborhood: true,
        cep: true,
        city: true,
        state: true,
        complement: true,
        educationLevel: true,
        educationStatus: true,
        knowledgeArea: true,
        courseName: true,
        institution: true,
        schoolShift: true,
        isHealthProfessional: true,
        healthProfessionalType: true,
        fatherName: true,
        fatherEmail: true,
        fatherPhone: true,
        motherName: true,
        motherEmail: true,
        motherPhone: true,
        emergencyName: true,
        emergencyPhone: true,
        emergencyRelation: true,
        // Medical Record
        susNumber: true,
        healthPlan: true,
        bloodType: true,
        rhFactor: true,
        diseasesHistory: true,
        hasHeartProblem: true,
        heartProblemDesc: true,
        hasDiabetes: true,
        hasRenalProblem: true,
        hasPsychProblem: true,
        regularMedications: true,
        specificAllergies: true,
        recentTrauma: true,
        recentFracture: true,
        recentSurgery: true,
        disabilities: true,
        healthNotes: true,
        parentId: true,
        children: {
          select: { id: true }
        }
      }
    });

    return users.map(user => {
      let progress = 0;
      if (user.dbvClass && classTotals[user.dbvClass]) {
        const completed = user.requirements.filter(ur => ur.requirement.dbvClass === user.dbvClass).length;
        progress = Math.round((completed / classTotals[user.dbvClass]) * 100);
      }
      const { requirements, ...userData } = user;
      return { ...userData, classProgress: progress };
    });
  }

  // Ranking de usuários por pontos
  async findRanking(currentUser?: any) {
    const where: any = {
      isActive: true
    };

    const isMaster = currentUser?.email?.toLowerCase() === 'master@cantinhodbv.com';

    if (!isMaster) {
      if (!currentUser?.clubId) {
        return [];
      }
      where.clubId = currentUser.clubId;

      // Removed Unit restriction to allow Counselors to see full Club Ranking
      // if (currentUser.role === 'COUNSELOR' && currentUser.unitId) {
      //   where.unitId = currentUser.unitId;
      // }
    }

    return this.prisma.user.findMany({
      where,
      orderBy: {
        points: 'desc',
      },
      take: 100, // Top 100
      select: {
        id: true,
        name: true,
        points: true,
        role: true,
        photoUrl: true,
        club: {
          select: {
            name: true
          }
        }
      }
    });
  }

  // Busca usuário pelo ID (usado para validar token)
  // Busca usuário pelo ID (usado para validar token)
  async findOne(id: string, currentUser?: any): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        club: true,
        unit: true,
        specialties: { include: { specialty: true } },
        requirements: { include: { requirement: true } },
        logs: { take: 10, orderBy: { awardedAt: 'desc' } },
        attendances: { take: 10, orderBy: { createdAt: 'desc' } }
      },
    });

    if (!user) return null;

    // Strict ACL Check if context is provided
    if (currentUser) {
      if (currentUser.email === 'master@cantinhodbv.com') return user; // Master sees all
      if (user.id === currentUser.userId) return user; // Self sees self

      // Club Director
      if (['OWNER', 'ADMIN', 'DIRECTOR'].includes(currentUser.role)) {
        if (user.clubId !== currentUser.clubId) throw new UnauthorizedException('Acesso negado: Outro clube.');
        return user;
      }

      // Counselor
      if (currentUser.role === 'COUNSELOR') {
        if (user.unitId !== currentUser.unitId) throw new UnauthorizedException('Acesso negado: Outra unidade.');
        return user;
      }

      // Instructor
      if (currentUser.role === 'INSTRUCTOR') {
        // Allow if same class (assuming Instructor has dbvClass set)
        if (currentUser.dbvClass && user.dbvClass === currentUser.dbvClass && user.clubId === currentUser.clubId) return user;
        throw new UnauthorizedException('Acesso negado: Aluno não atribuído.');
      }

      // Parent
      if (currentUser.role === 'PARENT') {
        if (user.parentId !== currentUser.userId) throw new UnauthorizedException('Acesso negado: Não é seu filho.');
        return user;
      }

      // Pathfinder / Others trying to see others
      if (currentUser.role === 'PATHFINDER') {
        throw new UnauthorizedException('Acesso restrito ao próprio perfil.');
      }
    }

    return user;
  }

  // Cria um novo usuário
  async create(createUserDto: any): Promise<User> {
    const { clubId, unitId, dbvClass, birthDate, schoolShift, clubName, region, mission, union, childrenIds, ...rest } = createUserDto; // Strip extra fields

    // 1. Check Subscription Limits
    if (clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: clubId },
        // include: { _count: { select: { users: true } } } // Old logic
      });

      if (club) {
        // Cast to any because IDE types might be stale after migration
        const clubData = club as any;

        // Check BILLING Status first (Robust Dynamic Check)
        await this.clubsService.checkWriteAccess(clubId);

        // Calculate PAID/Liable Members (Everyone except PARENTS/MASTER)
        const paidCount = await this.prisma.user.count({
          where: {
            clubId,
            role: { notIn: ['PARENT', 'MASTER'] },
            isActive: true
          }
        });

        const limit = clubData.memberLimit;

        // Check Limit if creating a NON-PARENT
        if (rest.role !== 'PARENT') {
          if (paidCount >= limit) {
            throw new UnauthorizedException(`Limite do plano atingido (${paidCount}/${limit} membros ativos). Faça upgrade para adicionar mais.`);
          }
        }
      }
    }

    // Sanitize Enum and Relations
    const validDbvClass = dbvClass === '' ? undefined : dbvClass;
    const validUnitId = unitId === '' ? undefined : unitId;

    // Sanitize Date
    let validBirthDate: Date | undefined;
    if (birthDate && typeof birthDate === 'string' && birthDate.trim() !== '') {
      validBirthDate = new Date(birthDate);
      if (isNaN(validBirthDate.getTime())) validBirthDate = undefined;
    }

    const childrenConnect = childrenIds && Array.isArray(childrenIds)
      ? childrenIds.map((id: string) => ({ id }))
      : [];

    return this.prisma.user.create({
      data: {
        ...rest,
        birthDate: validBirthDate,
        dbvClass: validDbvClass as any, // Cast to any or correct Enum type if imported
        schoolShift: schoolShift, // Explicitly add it back
        club: clubId ? { connect: { id: clubId } } : undefined,
        unit: validUnitId ? { connect: { id: validUnitId } } : undefined,
        children: childrenConnect.length > 0 ? { connect: childrenConnect } : undefined
      },
    });
  }



  async linkChild(parentId: string, childEmail: string) {
    const child = await this.prisma.user.findUnique({
      where: { email: childEmail }
    });

    if (!child) {
      throw new Error('Filho não encontrado');
    }

    return this.prisma.user.update({
      where: { id: child.id },
      data: { parentId }
    });
  }

  // Atualiza um usuário
  async update(id: string, updateUserDto: UpdateUserDto, currentUser?: any): Promise<User> {
    console.log('UsersService.update:', id, updateUserDto);
    // Destructure properties to sanitize or exclude
    const {
      password,
      birthDate,
      schoolShift,
      requirements,
      classProgress,
      club,
      unit,
      id: _id, // exclude id from data
      createdAt,
      updatedAt,
      pointsHistory,
      childrenIds, // Extract childrenIds
      ...rest
    } = updateUserDto as any;

    // Strict ACL Check for Update
    if (currentUser) {
      const userToUpdate = await this.prisma.user.findUnique({ where: { id } });
      if (!userToUpdate) throw new Error('Usuário não encontrado');

      const isMaster = currentUser.email === 'master@cantinhodbv.com';
      const isSelf = currentUser.userId === id;
      const isClubAdmin = ['OWNER', 'ADMIN', 'DIRECTOR'].includes(currentUser.role) && userToUpdate.clubId === currentUser.clubId;

      // Allow: Master, Self, or Club Admin (for non-master/non-self updates to their club members)
      if (!isMaster && !isSelf && !isClubAdmin) {
        throw new UnauthorizedException('Permissão negada para editar este usuário.');
      }
    }

    let dataToUpdate: any = { ...rest };
    if (pointsHistory) {
      dataToUpdate.pointsHistory = pointsHistory;
    }

    if (dataToUpdate.role === 'OWNER' || dataToUpdate.role === 'REGIONAL') {
      // Allow if Master
      const isMaster = currentUser?.email === 'master@cantinhodbv.com';
      if (!isMaster) {
        // If not Master, check if we are simply maintaining the existing role
        const userToUpdate = await this.prisma.user.findUnique({ where: { id }, select: { role: true } });
        if (userToUpdate && userToUpdate.role === dataToUpdate.role) {
          // Allow keeping the same role
        } else {
          // Prevent escalation to OWNER/REGIONAL
          dataToUpdate.role = 'PATHFINDER';
        }
      }
    }

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    // Sanitize empty strings to null for relations and enums
    if (dataToUpdate.clubId === '') dataToUpdate.clubId = null;
    if (dataToUpdate.unitId === '') dataToUpdate.unitId = null;
    if (dataToUpdate.dbvClass === '') dataToUpdate.dbvClass = null;

    // Sanitize Date
    if (birthDate !== undefined) {
      if (typeof birthDate === 'string' && birthDate.trim() !== '') {
        const d = new Date(birthDate);
        if (!isNaN(d.getTime())) {
          dataToUpdate.birthDate = d;
        } else {
          dataToUpdate.birthDate = null;
        }
      } else if (birthDate === '' || birthDate === null) {
        dataToUpdate.birthDate = null;
      }
      // If birthDate is Date object, leave it (rare if from JSON)
    }

    // Handle Manual Point Adjustment
    if (dataToUpdate.points !== undefined && !dataToUpdate.pointsHistory) {
      const currentUserState = await this.prisma.user.findUnique({ where: { id }, select: { points: true } });
      if (currentUserState) {
        const delta = Number(dataToUpdate.points) - currentUserState.points;
        if (delta !== 0) {
          dataToUpdate.pointsHistory = {
            create: {
              amount: delta,
              reason: 'Ajuste Manual de Cadastro',
              source: 'MANUAL'
            }
          };
        }
      }
    }

    if (childrenIds && Array.isArray(childrenIds)) {
      // Create connection objects
      const childrenConnect = childrenIds.map((cid: string) => ({ id: cid }));

      // Update data with children connection
      // We use 'set' to replace existing children with the new list
      dataToUpdate.children = {
        set: childrenConnect
      };
    }

    try {
      const result = await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
      });
      console.log('User Updated:', result);
      return result;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async findChildren(parentId: string) {
    // Get requirements for class calc
    const requirements = await this.prisma.requirement.findMany({
      where: { dbvClass: { not: null } },
      select: { dbvClass: true }
    });
    const classTotals: Record<string, number> = {};
    requirements.forEach(r => {
      if (r.dbvClass) classTotals[r.dbvClass] = (classTotals[r.dbvClass] || 0) + 1;
    });

    const children = await this.prisma.user.findMany({
      where: { parentId },
      include: {
        logs: true,
        attendances: true,
        specialties: { include: { specialty: true } },
        unit: true,
        requirements: {
          include: {
            requirement: true
          }
        }
      }
    });

    return children.map(child => {
      const classProgress: Record<string, number> = {};

      // Calculate progress ONLY from APPROVED requirements
      child.requirements.forEach(ur => {
        if (ur.status === 'APPROVED' && ur.requirement.dbvClass) {
          const cls = ur.requirement.dbvClass;
          classProgress[cls] = (classProgress[cls] || 0) + 1;
        }
      });

      // If child has a class, calc percentage
      let progressPercent = 0;
      if (child.dbvClass && classTotals[child.dbvClass]) {
        const total = classTotals[child.dbvClass];
        const completed = classProgress[child.dbvClass] || 0;
        progressPercent = Math.round((completed / total) * 100);
      }

      return {
        ...child,
        progressPercent
      };
    });
  }
  async remove(id: string, currentUser?: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Usuário não encontrado');

    if (currentUser) {
      const isMaster = currentUser.email === 'master@cantinhodbv.com';
      const isClubAdmin = ['OWNER', 'ADMIN', 'DIRECTOR'].includes(currentUser.role) && user.clubId === currentUser.clubId;

      if (!isMaster && !isClubAdmin) {
        throw new UnauthorizedException('Apenas Diretores podem remover membros.');
      }
    }

    return this.prisma.user.delete({ where: { id } });
  }
}
