import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto } from './dto/create-club.dto';
import { HIERARCHY_DATA, UNIONS_LIST } from './data/hierarchy.data';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ClubsService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    async onModuleInit() {
        // Backfill Referral Codes for existing clubs
        const clubsWithoutCode = await this.prisma.club.findMany({
            where: { referralCode: null }
        });

        if (clubsWithoutCode.length > 0) {
            console.log(`[Referral] Backfilling codes for ${clubsWithoutCode.length} clubs...`);
            for (const club of clubsWithoutCode) {
                await this.prisma.club.update({
                    where: { id: club.id },
                    data: { referralCode: this.generateReferralCode() }
                });
            }
            console.log('[Referral] Backfill complete.');
        }
    }

    private generateReferralCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async resolveReferralCode(code: string): Promise<string | null> {
        const club = await this.prisma.club.findUnique({
            where: { referralCode: code },
            select: { id: true }
        });
        return club ? club.id : null;
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).substring(2, 7);
    }

    async create(createClubDto: CreateClubDto & { referrerClubId?: string }) {
        const slug = this.generateSlug(createClubDto.name);

        return this.prisma.club.create({
            data: {
                name: createClubDto.name,
                slug,
                region: createClubDto.region,
                mission: createClubDto.mission,
                union: createClubDto.union,
                referralCode: this.generateReferralCode(),
                referrerClubId: createClubDto.referrerClubId
            },
        });
    }

    async awardReferralCredit(referrerClubId: string) {
        const referrerClub = await this.prisma.club.findUnique({
            where: { id: referrerClubId },
            include: { referralCredits: { where: { status: 'AVAILABLE' } } }
        });

        if (!referrerClub) return;

        const activeCredits = referrerClub.referralCredits.length;

        if (activeCredits >= 3) {
            console.log(`[Referral] Club ${referrerClub.name} reached max credits (3). No new credit awarded.`);
            return;
        }

        // Logic: 1st = 30d, 2nd = 60d, 3rd = 90d from NOW.
        const days = (activeCredits + 1) * 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        await this.prisma.referralCredit.create({
            data: {
                clubId: referrerClub.id,
                expiresAt: expiresAt,
                status: 'AVAILABLE'
            }
        });

        console.log(`[Referral] Awarded credit to ${referrerClub.name}. Expires in ${days} days.`);

        // Notify Owner
        const owner = await this.prisma.user.findFirst({ where: { clubId: referrerClub.id, role: 'OWNER' } });
        if (owner) {
            await this.notificationsService.send(
                owner.id,
                'Nova Indicação Confirmada!',
                `Sua indicação realizou o primeiro pagamento e você ganhou um desconto de 20%! (Válido por ${days} dias)`,
                'SUCCESS'
            );
        }
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

    async update(id: string, data: { name?: string; logoUrl?: string; settings?: any; union?: string; mission?: string; region?: string }) {
        return this.prisma.club.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.logoUrl && { logoUrl: data.logoUrl }),
                ...(data.settings && { settings: data.settings }),
                ...(data.union && { union: data.union }),
                ...(data.mission && { mission: data.mission }),
                ...(data.region && { region: data.region }),
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
                referralCode: true,
                referralCredits: {
                    where: { status: 'AVAILABLE' }
                }
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

        // 2. CHECK REFERRAL REWARD
        // If status became ACTIVE (meaning they paid) AND they have a referrer AND reward not claimed
        if (data.subscriptionStatus === 'ACTIVE') {
            const club = await this.prisma.club.findUnique({
                where: { id: clubId },
                select: { referrerClubId: true, referralRewardClaimed: true }
            });

            if (club && club.referrerClubId && !club.referralRewardClaimed) {
                console.log(`[Referral] Triggering reward for referrer ${club.referrerClubId} from club ${clubId}`);

                // Award Credit
                await this.awardReferralCredit(club.referrerClubId);

                // Mark as Claimed
                await this.prisma.club.update({
                    where: { id: clubId },
                    data: { referralRewardClaimed: true }
                });
            }
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
