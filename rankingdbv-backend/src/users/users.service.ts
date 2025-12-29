import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ClubsService } from '../clubs/clubs.service';
import { firebaseAdmin } from '../firebase-admin';

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
  async findAll(currentUser?: any, clubId?: string) {
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

    if (currentUser?.email === 'master@cantinhodbv.com') {
      // Master can filter by clubId if provided, otherwise see all
      if (clubId) where.clubId = clubId;
    } else if (currentUser && currentUser.role === 'COUNSELOR') {
      if (!currentUser.unitId) {
        return [];
      }
      where.unitId = currentUser.unitId;
    } else if (currentUser && currentUser.role === 'INSTRUCTOR') {
      if (currentUser.dbvClass) {
        where.dbvClass = currentUser.dbvClass;
      }
      if (currentUser.clubId) where.clubId = currentUser.clubId;
    } else if (currentUser?.clubId) {
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
        // Extended Profile - OPTIMIZED: Fetch only essentials for List View
        sex: true,
        birthDate: true,
        // maritalStatus: true, // Heavy/Unused in list
        phone: true,
        mobile: true,
        // isBaptized: true,
        // rg: true,
        // issuingOrg: true,
        cpf: true, // Used for search?
        // shirtSize: true, // Unused in list
        // address: true,
        // addressNumber: true,
        // neighborhood: true,
        // cep: true,
        // city: true,
        // state: true,
        // complement: true,
        // educationLevel: true,
        // educationStatus: true,
        // knowledgeArea: true,
        // courseName: true,
        // institution: true,
        // schoolShift: true,
        // isHealthProfessional: true,
        // healthProfessionalType: true,
        // fatherName: true,
        // fatherEmail: true,
        // fatherPhone: true,
        // motherName: true,
        // motherEmail: true,
        // motherPhone: true,
        // emergencyName: true,
        // emergencyPhone: true,
        // emergencyRelation: true,
        // Medical Record - HEAVY - OMITTED
        // susNumber: true,
        // healthPlan: true,
        // bloodType: true,
        // rhFactor: true,
        // diseasesHistory: true,
        // hasHeartProblem: true,
        // heartProblemDesc: true,
        // hasDiabetes: true,
        // hasRenalProblem: true,
        // hasPsychProblem: true,
        // regularMedications: true,
        // specificAllergies: true,
        // recentTrauma: true,
        // recentFracture: true,
        // recentSurgery: true,
        // disabilities: true,
        // healthNotes: true,
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
    const { clubId, unitId, dbvClass, birthDate, schoolShift, clubName, region, mission, union, childrenIds, password, ...rest } = createUserDto; // Strip extra fields

    // 1. Check Subscription Limits
    if (clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: clubId },
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

    // --- FIREBASE SYNC START ---
    if (rest.email && password) {
      try {
        console.log(`[FirebaseSync] Creating user ${rest.email}...`);
        await firebaseAdmin.auth().createUser({
          email: rest.email,
          password: password,
          displayName: rest.name,
          emailVerified: true
        });
        console.log(`[FirebaseSync] User ${rest.email} created.`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
          console.warn(`[FirebaseSync] User ${rest.email} already exists. Syncing password...`);
          try {
            const fbUser = await firebaseAdmin.auth().getUserByEmail(rest.email);
            // Update password to match current system registry
            await firebaseAdmin.auth().updateUser(fbUser.uid, {
              password: password,
              displayName: rest.name
            });
            console.log(`[FirebaseSync] User ${rest.email} updated.`);
          } catch (updErr) {
            console.error(`[FirebaseSync] Failed to update existing user:`, updErr);
          }
        } else {
          console.error(`[FirebaseSync] Failed to create user:`, error);
          // Non-blocking error? Proceed to DB creation anyway so we don't block system usage.
        }
      }
    }
    // --- FIREBASE SYNC END ---

    // Hash password for DB
    const hashedPassword = await bcrypt.hash(password, 10);

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
        password: hashedPassword, // Use Hashed Password
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

      // Logic to ensure only ONE OWNER per club
      if (dataToUpdate.role === 'OWNER') {
        const userToUpdate = await this.prisma.user.findUnique({ where: { id }, select: { clubId: true } });
        const targetClubId = dataToUpdate.clubId !== undefined ? dataToUpdate.clubId : userToUpdate?.clubId;

        if (targetClubId) {
          await this.prisma.user.updateMany({
            where: {
              clubId: targetClubId,
              role: 'OWNER',
              id: { not: id }
            },
            data: { role: 'ADMIN' }
          });
          console.log(`[ACL] Other owners for club ${targetClubId} demoted to ADMIN.`);
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
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
      });

      // Firebase Sync: Support updating password if provided
      if (password && updatedUser.email) {
        try {
          console.log(`[FirebaseSync] Attempting to sync password for ${updatedUser.email}...`);
          // 1. Try to find user by email
          const fbUser = await firebaseAdmin.auth().getUserByEmail(updatedUser.email);
          if (fbUser) {
            await firebaseAdmin.auth().updateUser(fbUser.uid, {
              password: password,
              emailVerified: true // Ensure it's verified
            });
            console.log(`[FirebaseSync] Password updated successfully for existing user ${updatedUser.email} (UID: ${fbUser.uid})`);
          }
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            console.warn(`[FirebaseSync] User ${updatedUser.email} not found in Firebase. Creating new Firebase user...`);
            try {
              const newUser = await firebaseAdmin.auth().createUser({
                uid: updatedUser.id, // Try to enforce same ID if possible, but might fail if format differs
                email: updatedUser.email,
                password: password,
                displayName: updatedUser.name,
                emailVerified: true
              });
              console.log(`[FirebaseSync] User ${updatedUser.email} CREATED successfully in Firebase (UID: ${newUser.uid}).`);
            } catch (createError: any) {
              // Edge Case: Email exists but GetByEmail failed? Or Race condition?
              if (createError.code === 'auth/email-already-exists') {
                console.warn(`[FirebaseSync] Creation failed because email already exists. Retrying update...`);
                try {
                  const existingUser = await firebaseAdmin.auth().getUserByEmail(updatedUser.email);
                  await firebaseAdmin.auth().updateUser(existingUser.uid, { password: password });
                  console.log(`[FirebaseSync] Recovered: Password updated for ${updatedUser.email} after creation conflict.`);
                } catch (retryError) {
                  console.error(`[FirebaseSync] CRITICAL: Failed to recover password update for ${updatedUser.email}:`, retryError);
                }
              } else if (createError.code === 'auth/uid-already-exists') {
                // Try creating without enforcing UID
                console.warn(`[FirebaseSync] UID collision. Creating with auto-generated UID...`);
                try {
                  await firebaseAdmin.auth().createUser({
                    email: updatedUser.email,
                    password: password,
                    displayName: updatedUser.name,
                    emailVerified: true
                  });
                  console.log(`[FirebaseSync] User ${updatedUser.email} created with auto-UID.`);
                } catch (finalError) {
                  console.error(`[FirebaseSync] Failed auto-UID creation for ${updatedUser.email}:`, finalError);
                }
              } else {
                console.error(`[FirebaseSync] Failed to create user ${updatedUser.email}:`, createError);
              }
            }
          } else {
            console.error(`[FirebaseSync] Unexpected error looking up ${updatedUser.email}:`, error);
          }
        }
      }

      console.log('User Updated:', updatedUser);
      return updatedUser;
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

    // 1. Delete from Firebase First
    if (user.email) {
      try {
        console.log(`[FirebaseSync] Deleting user ${user.email}...`);
        try {
          // Try by UID (Ideal case)
          await firebaseAdmin.auth().deleteUser(id);
          console.log(`[FirebaseSync] User ${id} deleted from Firebase by UID.`);
        } catch (uidError: any) {
          if (uidError.code === 'auth/user-not-found') {
            // Fallback: Try by Email (Legacy/Desync case)
            const fbUser = await firebaseAdmin.auth().getUserByEmail(user.email);
            if (fbUser) {
              await firebaseAdmin.auth().deleteUser(fbUser.uid);
              console.log(`[FirebaseSync] User ${user.email} deleted from Firebase by Email (UID: ${fbUser.uid}).`);
            }
          } else {
            throw uidError;
          }
        }
      } catch (error) {
        console.error(`[FirebaseSync] Error deleting user ${user.email} from Firebase:`, error);
        // We continue to delete from DB to avoid locking the user, 
        // but log the error. In strict mode, we might want to throw.
      }
    }

    return this.prisma.user.delete({ where: { id } });
  }
}
