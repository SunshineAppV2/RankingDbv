import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class MasterTreasuryService {
    constructor(private prisma: PrismaService) { }

    async create(data: {
        type: TransactionType;
        amount: number;
        description: string;
        category: string;
        sourceClubId?: string;
        date?: Date;
    }) {
        return this.prisma.masterTransaction.create({
            data: {
                type: data.type,
                amount: data.amount,
                description: data.description,
                category: data.category,
                sourceClubId: data.sourceClubId || null,
                date: data.date || new Date(),
            },
        });
    }

    async findAll(params: {
        startDate?: Date;
        endDate?: Date;
        clubId?: string;
        type?: TransactionType;
    }) {
        const where: any = {};

        if (params.startDate && params.endDate) {
            where.date = {
                gte: params.startDate,
                lte: params.endDate,
            };
        }

        if (params.clubId) {
            where.sourceClubId = params.clubId;
        }

        if (params.type) {
            where.type = params.type;
        }

        return this.prisma.masterTransaction.findMany({
            where,
            include: {
                sourceClub: {
                    select: { name: true, region: true, mission: true, union: true }
                }
            },
            orderBy: {
                date: 'desc',
            },
        });
    }

    async delete(id: string) {
        return this.prisma.masterTransaction.delete({
            where: { id },
        });
    }

    async getSummary(params: { startDate?: Date; endDate?: Date }) {
        const where: any = {};
        if (params.startDate && params.endDate) {
            where.date = {
                gte: params.startDate,
                lte: params.endDate
            };
        }

        const income = await this.prisma.masterTransaction.aggregate({
            where: { ...where, type: 'INCOME' },
            _sum: { amount: true }
        });

        const expense = await this.prisma.masterTransaction.aggregate({
            where: { ...where, type: 'EXPENSE' },
            _sum: { amount: true }
        });

        return {
            income: income._sum.amount || 0,
            expense: expense._sum.amount || 0,
            balance: (income._sum.amount || 0) - (expense._sum.amount || 0)
        };
    }
}
