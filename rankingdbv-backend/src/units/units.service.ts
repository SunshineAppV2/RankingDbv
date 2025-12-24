import { Injectable } from '@nestjs/common';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) { }

  create(createUnitDto: CreateUnitDto) {
    return this.prisma.unit.create({
      data: createUnitDto
    });
  }

  findAllByClub(clubId: string) {
    return this.prisma.unit.findMany({
      where: { clubId },
      include: { _count: { select: { members: true } } }
    });
  }

  findOne(id: string) {
    return this.prisma.unit.findUnique({ where: { id } });
  }

  update(id: string, updateUnitDto: UpdateUnitDto) {
    const { members, ...data } = updateUnitDto;

    return this.prisma.unit.update({
      where: { id },
      data: {
        ...data,
        members: members ? {
          set: members.map(memberId => ({ id: memberId }))
        } : undefined
      },
    });
  }

  remove(id: string) {
    return this.prisma.unit.delete({ where: { id } });
  }

  async assignMember(userId: string, unitId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { unitId }
    });
  }
}
