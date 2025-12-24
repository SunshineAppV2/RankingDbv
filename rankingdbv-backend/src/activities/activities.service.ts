import { Injectable, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ScoreDto } from './dto/score.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ClubsService } from '../clubs/clubs.service';

@Injectable()
export class ActivitiesService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        @Inject(forwardRef(() => ClubsService)) private clubsService: ClubsService
    ) { }

    // Criar Atividade
    async create(createActivityDto: CreateActivityDto) {
        if (createActivityDto.clubId) {
            await this.clubsService.checkWriteAccess(createActivityDto.clubId);
        }
        return this.prisma.activity.create({
            data: createActivityDto,
        });
    }

    // Listar Atividades por Clube
    async findAllByClub(clubId: string) {
        return this.prisma.activity.findMany({
            where: { clubId },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Pontuar Usuário ou Unidade
    async awardPoints(scoreDto: ScoreDto) {
        const activity = await this.prisma.activity.findUnique({
            where: { id: scoreDto.activityId }
        });

        if (!activity) throw new Error('Activity not found');

        // Check Access
        await this.clubsService.checkWriteAccess(activity.clubId);

        // CASE 1: UNIT AWARD
        if (scoreDto.unitId) {
            const unit = await this.prisma.unit.findUnique({
                where: { id: scoreDto.unitId },
                include: {
                    members: {
                        where: { isActive: true, role: 'PATHFINDER' }
                    }
                }
            });

            if (!unit) throw new Error('Unit not found');

            const promises = unit.members.map(member => this.awardPointsToUser(member.id, activity));
            await Promise.all(promises);

            return { message: `Points awarded to ${unit.members.length} members of ${unit.name}` };
        }

        // CASE 2: SINGLE USER AWARD
        if (scoreDto.userId) {
            return this.awardPointsToUser(scoreDto.userId, activity);
        }

        throw new Error('UserId or UnitId must be provided');
    }

    private async awardPointsToUser(userId: string, activity: any) {
        // 1. Criar Log
        await this.prisma.activityLog.create({
            data: {
                userId: userId,
                activityId: activity.id,
            }
        });

        // 2. Atualizar Pontos do Usuário
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                points: { increment: activity.points },
                pointsHistory: {
                    create: {
                        amount: activity.points,
                        reason: `Atividade: ${activity.title}`,
                        source: 'ACTIVITY'
                    }
                }
            }
        });

        // 3. Notificar
        try {
            await this.notificationsService.send(
                userId,
                'Nova Pontuação!',
                `Você ganhou ${activity.points} XP em: ${activity.title}`,
                'SUCCESS'
            );
        } catch (e) { console.error('Notification error', e); }

        return updatedUser;
    }
    // Obter Ranking do Clube
    async getLeaderboard(filters: { clubId?: string, union?: string, mission?: string, district?: string }) {
        const where: any = {
            role: { not: 'PARENT' },
            isActive: true
        };

        // Apply Club Filter (Priority)
        if (filters.clubId) {
            where.clubId = filters.clubId;
        } else {
            // Apply Hierarchy Filters if no specific club selected
            if (filters.union || filters.mission || filters.district) {
                where.club = {};
                if (filters.union) where.club.union = filters.union;
                if (filters.mission) where.club.mission = filters.mission;
                if (filters.district) where.club.district = filters.district;
            }
        }

        return this.prisma.user.findMany({
            where,
            orderBy: { points: 'desc' },
            take: 100, // Limit global lists to prevent overload
            select: {
                id: true,
                name: true,
                points: true,
                photoUrl: true,
                role: true,
                email: true,
                dbvClass: true,
                unitId: true,
                birthDate: true,
                club: {
                    select: {
                        name: true,
                        union: true,
                        mission: true
                    }
                }
            }
        });
    }

    // Histórico de Pontos (Últimos 7 dias)
    async getRecentScores(clubId: string) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const logs = await this.prisma.activityLog.findMany({
            where: {
                activity: { clubId },
                awardedAt: { gte: sevenDaysAgo }
            },
            include: { activity: true },
            orderBy: { awardedAt: 'asc' }
        });

        // Agrupar por dia
        const grouped = logs.reduce((acc, log) => {
            const date = log.awardedAt.toISOString().split('T')[0]; // YYYY-MM-DD
            acc[date] = (acc[date] || 0) + log.activity.points;
            return acc;
        }, {});

        // Formatar para array
        return Object.entries(grouped).map(([date, points]) => ({
            date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            points
        }));
    }

    // Resetar Pontos (Desclassificar)
    async resetPoints(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('Usuario não encontrado');

        // Zera pontuação
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                points: 0,
                pointsHistory: {
                    create: {
                        amount: -user.points,
                        reason: 'Desclassificação (Reset Manual)',
                        source: 'MANUAL'
                    }
                }
            }
        });
    }

    // Importar via Excel
    async importActivities(file: Express.Multer.File, clubId: string) {
        const XLSX = require('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const activitiesToCreate = rows.map((row: any) => ({
            title: row['Titulo'] || row['Título'] || 'Sem Título',
            description: row['Descricao'] || row['Descrição'] || '',
            points: Number(row['Pontos']) || 10,
            clubId
        })).filter(a => a.title !== 'Sem Título'); // Basic validation

        if (activitiesToCreate.length === 0) {
            throw new Error('Nenhuma atividade válida encontrada na planilha.');
        }

        return this.prisma.activity.createMany({
            data: activitiesToCreate
        });
    }

    // Excluir Atividade
    async remove(id: string) {
        return this.prisma.activity.delete({
            where: { id }
        });
    }

    // Listar Logs de um Usuário (Histórico Detalhado)
    async getLogsByUser(userId: string) {
        return this.prisma.pointHistory.findMany({
            where: {
                userId,
                amount: { not: 0 } // Exibe apenas pontos válidos (diferente de zero)
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Ranking de Unidades (Média)
    async getUnitRanking(clubId: string) {
        // Buscar Unidades e seus membros
        const units = await this.prisma.unit.findMany({
            where: { clubId },
            include: {
                members: {
                    where: {
                        role: 'PATHFINDER', // Apenas Desbravadores
                        isActive: true
                    },
                    select: { points: true }
                }
            }
        });

        return units.map(unit => {
            const memberCount = unit.members.length;
            const totalPoints = unit.members.reduce((sum, u) => sum + (u.points || 0), 0);
            const average = memberCount > 0 ? totalPoints / memberCount : 0;

            return {
                id: unit.id,
                name: unit.name,
                memberCount,
                totalPoints,
                average: parseFloat(average.toFixed(1))
            };
        }).sort((a, b) => b.average - a.average);
    }
}


