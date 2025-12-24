import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getDemographics(clubId: string) {
        const users = await this.prisma.user.findMany({
            where: { clubId, isActive: true },
            select: { birthDate: true, sex: true, dbvClass: true, unit: { select: { name: true } }, role: true }
        });

        // Gender Distribution
        const gender = { Male: 0, Female: 0 };
        users.forEach(u => {
            if (u.sex === 'M') gender.Male++;
            else if (u.sex === 'F') gender.Female++;
        });

        // Age Distribution
        const ageGroups = { '10-12': 0, '13-15': 0, '16+': 0 };
        const currentYear = new Date().getFullYear();
        users.forEach(u => {
            if (u.birthDate) {
                const age = currentYear - new Date(u.birthDate).getFullYear();
                if (age >= 10 && age <= 12) ageGroups['10-12']++;
                else if (age >= 13 && age <= 15) ageGroups['13-15']++;
                else ageGroups['16+']++;
            }
        });

        // Role Distribution
        const roles = {};
        users.forEach(u => {
            roles[u.role] = (roles[u.role] || 0) + 1;
        });

        return { gender, ageGroups, roles, total: users.length };
    }

    async getFinancialStats(clubId: string) {
        // Current Balance (Income - Expense) and Totals
        const transactions = await this.prisma.transaction.findMany({
            where: { clubId, status: 'COMPLETED' }
        });

        let income = 0;
        let expense = 0;

        transactions.forEach(t => {
            if (t.type === 'INCOME') income += t.amount;
            else expense += t.amount;
        });

        // Pending (Receivables)
        const pending = await this.prisma.transaction.aggregate({
            where: { clubId, status: 'PENDING', type: 'INCOME' },
            _sum: { amount: true }
        });

        return {
            balance: income - expense,
            income,
            expense,
            pendingReceivables: pending._sum.amount || 0
        };
    }

    async getAttendanceStats(clubId: string) {
        // Get last 5 meetings
        const meetings = await this.prisma.meeting.findMany({
            where: { clubId },
            orderBy: { date: 'desc' },
            take: 5,
            include: {
                attendances: {
                    where: { status: 'PRESENT' }
                }
            }
        });

        // For better stats, we should know total active members at that time, 
        // but for MVP we use current active members count as denominator or just raw numbers.
        // Let's use raw numbers of present members for now.

        return meetings.map(m => ({
            date: m.date.toISOString().split('T')[0],
            present: m.attendances.length,
            title: m.title
        })).reverse();
    }

    async getAcademicStats(clubId: string) {
        // Classes Distribution
        const users = await this.prisma.user.findMany({
            where: { clubId, isActive: true },
            select: { dbvClass: true }
        });

        const classes = {};
        users.forEach(u => {
            const cl = u.dbvClass || 'Não Investido';
            classes[cl] = (classes[cl] || 0) + 1;
        });

        // Specialties Count
        const specialtiesCount = await this.prisma.userSpecialty.count({
            where: { user: { clubId }, status: 'COMPLETED' }
        });

        // Top Specialties? (Optional: Group by specialtyId)
        // For now just total count is enough as requested "especialidades"

        return { classes, totalSpecialties: specialtiesCount };
    }

    async getPointsStats(clubId: string) {
        // Fetch all logs to calculate points
        const logs = await this.prisma.activityLog.findMany({
            where: { user: { clubId } },
            include: {
                activity: { select: { points: true } },
                user: { select: { birthDate: true } }
            }
        });

        let totalPoints = 0;
        let pointsFaixaA = 0; // 10-12
        let pointsFaixaB = 0; // 13-15

        const currentYear = new Date().getFullYear();

        logs.forEach(log => {
            const pts = log.activity.points;
            totalPoints += pts;

            if (log.user.birthDate) {
                const age = currentYear - new Date(log.user.birthDate).getFullYear();
                if (age >= 10 && age <= 12) {
                    pointsFaixaA += pts;
                } else if (age >= 13 && age <= 15) {
                    pointsFaixaB += pts;
                }
            }
        });

        return {
            totalPoints,
            pointsFaixaA,
            pointsFaixaB
        };
    }
}
