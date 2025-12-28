import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto } from './dto/create-club.dto';
import { HIERARCHY_DATA, UNIONS_LIST } from './data/hierarchy.data';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ClubsService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    async create(createClubDto: CreateClubDto) {
        return this.prisma.club.create({
            data: {
                name: createClubDto.name,
                region: createClubDto.region,
                mission: createClubDto.mission,
                union: createClubDto.union,
                // slug could be generated here
            },
        });
    }

    async getExportData(clubId: string) {
        return this.prisma.club.findUnique({
            where: { id: clubId },
            include: {
                users: {
                    include: {
                        specialties: true,
                        requirements: true,
                        // Include profile fields automatically
                    }
                },
                activities: {
                    include: {
                        logs: true
                    }
                },
                units: true,
                meetings: {
                    include: {
                        attendances: true
                    }
                },
                transactions: true,
                products: {
                    include: {
                        purchases: true
                    }
                },
                events: {
                    include: {
                        registrations: true
                    }
                }
            }
        });
    }

    async findAll() {
        return this.prisma.club.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });
    }

    async getAllClubsDetailed() {
        // We need advanced aggregation here.
        // Prisma doesn't support conditional count in select easily without raw query or grouping.
        // Let's fetch all necessary counts via groupBy

        const clubs = await this.prisma.club.findMany({
            orderBy: { name: 'asc' }
        });

        // Group active users by club and role type (broadly) is hard in one go.
        // Group by clubId and role
        const roleCounts = await this.prisma.user.groupBy({
            by: ['clubId', 'role'],
            where: { isActive: true },
            _count: { id: true }
        });

        // Process results
        return clubs.map(club => {
            // Filter counts for this club
            const clubCounts = roleCounts.filter(rc => rc.clubId === club.id);

            let paid = 0;
            let free = 0;

            clubCounts.forEach(rc => {
                if (rc.role !== 'PARENT' && rc.role !== 'MASTER') {
                    paid += rc._count.id;
                } else {
                    free += rc._count.id;
                }
            });

            return {
                ...club,
                activeMembers: paid,
                freeMembers: free,
                totalMembers: paid + free
            };
        });
    }

    async getHierarchyOptions() {
        // 1. Fetch distinct values from DB
        const [regions, missions, unions] = await Promise.all([
            this.prisma.club.findMany({
                select: { region: true },
                distinct: ['region'],
                where: { region: { not: null } },
                orderBy: { region: 'asc' }
            }),
            this.prisma.club.findMany({
                select: { mission: true },
                distinct: ['mission'],
                where: { mission: { not: null } },
                orderBy: { mission: 'asc' }
            }),
            this.prisma.club.findMany({
                select: { union: true },
                distinct: ['union'],
                where: { union: { not: null } },
                orderBy: { union: 'asc' }
            })
        ]);

        // 2. Merge with Static Data

        // Unions: DB + Static
        const dbUnions = unions.map(u => u.union).filter(Boolean);
        const allUnions = Array.from(new Set([...UNIONS_LIST, ...dbUnions])).sort();

        // Missions: DB + Static (Flattened)
        const dbMissions = missions.map(m => m.mission).filter(Boolean);
        const staticMissions = Object.values(HIERARCHY_DATA).flat();
        const allMissions = Array.from(new Set([...staticMissions, ...dbMissions])).sort();

        return {
            regions: regions.map(d => d.region).filter(Boolean),
            missions: allMissions,
            unions: allUnions,
            hierarchyTree: HIERARCHY_DATA // Pass the tree for frontend filtering
        };
    }

    async getHierarchyTree() {
        const clubs = await this.prisma.club.findMany({
            select: { id: true, name: true, region: true, mission: true, union: true },
            orderBy: { name: 'asc' }
        });

        const tree: any = {};

        for (const club of clubs) {
            const u = club.union || 'Sem União';
            const m = club.mission || 'Sem Missão';
            const r = club.region || 'Sem Região';

            if (!tree[u]) tree[u] = {};
            if (!tree[u][m]) tree[u][m] = {};
            if (!tree[u][m][r]) tree[u][m][r] = [];

            tree[u][m][r].push({ id: club.id, name: club.name });
        }

        return tree;
    }

    async findOne(id: string) {
        return this.prisma.club.findUnique({
            where: { id },
            include: {
                users: true
            }
        });
    }

    async update(id: string, data: { name?: string; logoUrl?: string; settings?: any }) {
        return this.prisma.club.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.logoUrl && { logoUrl: data.logoUrl }),
                ...(data.settings && { settings: data.settings }),
            }
        });
    }

    async delete(id: string) {
        return this.prisma.club.delete({
            where: { id }
        });
    }

    async renameHierarchyNode(level: 'union' | 'mission' | 'region', oldName: string, newName: string) {
        if (!['union', 'mission', 'region'].includes(level)) {
            throw new Error('Nível inválido');
        }

        const updateData: any = {};
        updateData[level] = newName;

        const whereData: any = {};
        whereData[level] = oldName;

        return this.prisma.club.updateMany({
            where: whereData,
            data: updateData
        });
    }

    async deleteHierarchyNode(level: 'union' | 'mission' | 'region', name: string) {
        if (!['union', 'mission', 'region'].includes(level)) {
            throw new Error('Nível inválido');
        }

        const updateData: any = {};
        updateData[level] = null;

        const whereData: any = {};
        whereData[level] = name;

        return this.prisma.club.updateMany({
            where: whereData,
            data: updateData
        });
    }

    async getClubStatus(clubId: string) {
        const club = await this.prisma.club.findUnique({
            where: { id: clubId },
            select: {
                id: true,
                name: true,
                planTier: true,
                memberLimit: true,
                subscriptionStatus: true,
                nextBillingDate: true,
                gracePeriodDays: true,
            }
        });

        if (!club) throw new Error('Clube não encontrado');

        // Count Paid (All except Parents and Master)
        const paidCount = await this.prisma.user.count({
            where: {
                clubId,
                role: { notIn: ['PARENT', 'MASTER'] },
                isActive: true
            }
        });

        // Count Free (Parents + Master if any)
        const freeCount = await this.prisma.user.count({
            where: {
                clubId,
                role: { in: ['PARENT', 'MASTER'] },
                isActive: true
            }
        });

        return {
            ...club,
            activeMembers: paidCount,
            freeMembers: freeCount,
            totalMembers: paidCount + freeCount
        };
    }

    async updateSubscription(clubId: string, data: any) {
        const result = await this.prisma.club.update({
            where: { id: clubId },
            data: {
                planTier: data.planTier,
                memberLimit: Number(data.memberLimit),
                subscriptionStatus: data.subscriptionStatus,
                nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate) : null,
                gracePeriodDays: Number(data.gracePeriodDays)
            }
        });

        // Auto-create Treasury Entry if payment amount is provided
        if (data.lastPaymentAmount && Number(data.lastPaymentAmount) > 0) {
            await this.prisma.masterTransaction.create({
                data: {
                    type: 'INCOME',
                    amount: Number(data.lastPaymentAmount),
                    description: `Assinatura - Plano ${data.planTier || result.planTier}`,
                    category: 'Assinatura',
                    sourceClubId: clubId,
                    date: new Date()
                }
            });
        }

        return result;
    }

    async sendPaymentInfo(clubId: string, message?: string) {
        const club = await this.prisma.club.findUnique({ where: { id: clubId } });
        if (!club) throw new Error('Clube não encontrado');

        const admins = await this.prisma.user.findMany({
            where: {
                clubId,
                role: { in: ['OWNER', 'ADMIN'] },
                isActive: true
            },
            select: { id: true }
        });

        const finalMessage = message || `Olá! Sua assinatura do Ranking DBV está vencendo. Para renovar, faça um PIX para a chave: 68323280282 (Alex Oliveira Seabra) e envie o comprovante.`;

        for (const admin of admins) {
            await this.notificationsService.send(
                admin.id,
                'Renovação de Assinatura Ranking DBV',
                finalMessage,
                'WARNING'
            );
        }

        return { count: admins.length };
    }

    async checkWriteAccess(clubId: string) {
        if (!clubId) return;
        const club = await this.prisma.club.findUnique({
            where: { id: clubId },
            select: {
                name: true,
                subscriptionStatus: true,
                nextBillingDate: true,
                gracePeriodDays: true
            }
        });

        if (!club) return; // Should allow or block? If club doesn't exist, we can't write to it anyway usually.

        let isOverdue = club.subscriptionStatus === 'OVERDUE' || club.subscriptionStatus === 'CANCELED';

        if (!isOverdue && club.nextBillingDate) {
            const today = new Date();
            const billingDate = new Date(club.nextBillingDate);
            const gracePeriod = (club.gracePeriodDays && !isNaN(Number(club.gracePeriodDays))) ? Number(club.gracePeriodDays) : 0;

            const cutoffDate = new Date(billingDate);
            cutoffDate.setDate(cutoffDate.getDate() + gracePeriod);

            if (today > cutoffDate) {
                isOverdue = true;
            }
        }

        if (isOverdue) {
            throw new UnauthorizedException(`Ação Bloqueada: O clube ${club.name} está com assinatura vencida.`);
        }
    }
}
