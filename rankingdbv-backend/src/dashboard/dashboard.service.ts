
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfMonth, endOfMonth, addMonths, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats(clubId: string) {
        const now = new Date();
        const firstDayOfMonth = startOfMonth(now);
        const lastDayOfMonth = endOfMonth(now);

        // 1. Active Members (Excluding Parents/Free/Master)
        const activeMembers = await this.prisma.user.count({
            where: {
                clubId,
                role: { notIn: ['PARENT', 'MASTER'] },
                isActive: true
            },
        });

        // 2. Birthdays this month
        const allMembers = await this.prisma.user.findMany({
            where: { clubId },
            select: { id: true, name: true, birthDate: true, role: true },
        });

        const currentMonth = now.getMonth();
        const birthdays = allMembers.filter(m => {
            if (!m.birthDate) return false;
            return new Date(m.birthDate).getMonth() === currentMonth;
        }).map(m => ({
            ...m,
            day: new Date(m.birthDate!).getDate()
        })).sort((a, b) => a.day - b.day);

        // 3. Next Event
        const nextEvent = await this.prisma.event.findFirst({
            where: {
                clubId,
                startDate: { gte: now }
            },
            orderBy: { startDate: 'asc' }
        });

        // 4. Financials (Current Month)
        const transactions = await this.prisma.transaction.findMany({
            where: {
                clubId,
                date: {
                    gte: firstDayOfMonth,
                    lte: lastDayOfMonth
                },
                status: 'COMPLETED'
            }
        });

        const income = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expense = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // 5. Attendance (Last 4 meetings)
        const recentMeetings = await this.prisma.meeting.findMany({
            where: { clubId },
            orderBy: { date: 'desc' },
            take: 4,
            include: {
                _count: {
                    select: { attendances: { where: { status: 'PRESENT' } } }
                }
            }
        });

        // Reverse to show chronological order in chart
        const attendanceStats = recentMeetings.reverse().map(m => ({
            date: m.date,
            count: m._count.attendances
        }));

        return {
            activeMembers,
            birthdays,
            nextEvent,
            financial: {
                income,
                expense,
                balance: income - expense
            },
            attendanceStats
        };
    }
}
