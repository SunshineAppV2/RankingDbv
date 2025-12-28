import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { SettleTransactionDto } from './dto/settle-transaction.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TreasuryService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    async create(data: CreateTransactionDto) {
        let memberId = data.memberId;

        // Smart Deduction: If payer is Parent and has 1 child, assign to child
        if (!memberId && data.payerId) {
            const payer = await this.prisma.user.findUnique({
                where: { id: data.payerId },
                include: { children: true }
            });
            if (payer && payer.children.length === 1) {
                memberId = payer.children[0].id;
            }
        }

        return this.prisma.transaction.create({
            data: {
                ...data,
                memberId,
                status: (data.type === 'EXPENSE' || data.isPaid) ? 'COMPLETED' : 'PENDING',
                paymentMethod: data.isPaid ? 'DINHEIRO' : 'DINHEIRO', // Default
                date: data.isPaid ? new Date() : (data.date || new Date())
            }
        });
    }

    async createBulk(data: any) {
        try {
            const { memberIds, installments = 1, ...txData } = data;
            const iterations = txData.recurrence ? (Number(installments) || 1) : 1;

            // 1. Fetch users
            const users = await this.prisma.user.findMany({
                where: { id: { in: memberIds } },
                select: { id: true, name: true, parentId: true }
            });

            const operations: any[] = [];

            for (let i = 0; i < iterations; i++) {
                const currentDueDate = txData.dueDate ? new Date(txData.dueDate) : undefined;
                if (currentDueDate) {
                    currentDueDate.setMonth(currentDueDate.getMonth() + i);
                }

                for (const user of users) {
                    const payerId = user.parentId || user.id;
                    let description = `${txData.description} - ${user.name}`;
                    if (iterations > 1) {
                        description += ` (${i + 1}/${iterations})`;
                    }

                    operations.push(this.prisma.transaction.create({
                        data: {
                            ...txData,
                            description,
                            payerId,
                            memberId: user.id,
                            status: (txData.type === 'EXPENSE' || data.isPaid) ? 'COMPLETED' : 'PENDING',
                            dueDate: currentDueDate,
                            paymentMethod: data.isPaid ? 'DINHEIRO' : 'DINHEIRO',
                            date: data.isPaid ? new Date() : (txData.date || new Date())
                        },
                        include: {
                            payer: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }));
                }
            }

            return await this.prisma.$transaction(operations);
        } catch (error) {
            console.error('Error in createBulk:', error);
            throw new HttpException(
                `Erro ao criar transações: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async update(id: string, data: UpdateTransactionDto) {
        try {
            const { id: _id, clubId, ...updateData } = data as any;

            return await this.prisma.transaction.update({
                where: { id },
                data: updateData
            });
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw new HttpException(
                `Erro ao atualizar transação: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.transaction.delete({
                where: { id }
            });
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw new HttpException(
                `Erro ao excluir transação: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    async findAll(clubId: string) {
        const transactions = await this.prisma.transaction.findMany({
            where: { clubId },
            include: { payer: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' }
        });

        // Custom Sort: WAITING > PENDING > COMPLETED > CANCELED
        const statusPriority = {
            'WAITING_APPROVAL': 0,
            'PENDING': 1,
            'COMPLETED': 2,
            'CANCELED': 3
        };

        return transactions.sort((a, b) => {
            const priorityA = statusPriority[a.status] ?? 99;
            const priorityB = statusPriority[b.status] ?? 99;

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // If PENDING, Sort by Due Date ASC (Vencidos/Antigos primeiro)
            if (a.status === 'PENDING') {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : new Date(a.date).getTime();
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : new Date(b.date).getTime();
                return dateA - dateB; // ASC
            }

            // For COMPLETED/CANCELED/WAITING, keep Date DESC (Mais recentes primeiro)
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // DESC
        });
    }

    async settle(id: string, data: SettleTransactionDto) {
        const tx = await this.prisma.transaction.findUnique({ where: { id } });
        if (!tx) throw new Error('Transação não encontrada');

        const paymentDate = new Date(data.paymentDate);
        let pointsToAward = tx.points || 0;
        let isLate = false;

        // Apply Penalty if late
        if (tx.dueDate && paymentDate > tx.dueDate) {
            pointsToAward = Math.floor(pointsToAward * 0.5);
            isLate = true;
        }

        const updated = await this.prisma.transaction.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                date: paymentDate
            }
        });

        const beneficiaryId = tx.memberId || tx.payerId;
        if (pointsToAward > 0 && beneficiaryId) {
            await this.prisma.user.update({
                where: { id: beneficiaryId },
                data: {
                    points: { increment: pointsToAward },
                    pointsHistory: {
                        create: {
                            amount: pointsToAward,
                            reason: `Pagamento: ${tx.category}`,
                            source: 'PURCHASE'
                        }
                    }
                }
            });
        }

        if (tx.payerId) {
            const message = isLate
                ? `Pagamento de ${tx.category} confirmado com atraso. Você recebeu ${pointsToAward} pontos (50% do total).`
                : `Seu pagamento de ${tx.category} foi registrado manualmente. Você recebeu ${pointsToAward} pontos!`;

            await this.notificationsService.send(
                tx.payerId,
                'Pagamento Confirmado',
                message,
                'SUCCESS'
            );
        }

        return updated;
    }

    async approve(id: string) {
        const tx = await this.prisma.transaction.findUnique({
            where: { id },
            include: { payer: true }
        });

        if (!tx) throw new Error('Transação não encontrada');
        if (tx.status === 'COMPLETED') return tx;

        const approvalDate = new Date();
        let pointsToAward = tx.points || 0;
        let isLate = false;

        // Apply Penalty if late (compare approval/payment date vs due date)
        if (tx.dueDate && approvalDate > tx.dueDate) {
            pointsToAward = Math.floor(pointsToAward * 0.5);
            isLate = true;
        }

        // 1. Update Status
        const updated = await this.prisma.transaction.update({
            where: { id },
            data: { status: 'COMPLETED', date: approvalDate }
        });

        // 2. Award Points
        const beneficiaryId = tx.memberId || tx.payerId;
        if (pointsToAward > 0 && beneficiaryId) {
            await this.prisma.user.update({
                where: { id: beneficiaryId },
                data: {
                    points: { increment: pointsToAward },
                    pointsHistory: {
                        create: {
                            amount: pointsToAward,
                            reason: `Pagamento Aprovado: ${tx.category}`,
                            source: 'PURCHASE'
                        }
                    }
                }
            });
        }

        // 3. Notify User
        if (tx.payerId) {
            const message = isLate
                ? `Pagamento de ${tx.category} aprovado com atraso. Você recebeu ${pointsToAward} pontos (50% do total).`
                : `Seu comprovante de ${tx.category} foi aprovado! Você recebeu ${pointsToAward} pontos.`;

            await this.notificationsService.send(
                tx.payerId,
                'Pagamento Aprovado',
                message,
                'SUCCESS'
            );
        }

        return updated;
    }

    async pay(id: string, proofUrl?: string) {
        return this.prisma.transaction.update({
            where: { id },
            data: {
                status: 'WAITING_APPROVAL',
                proofUrl
            }
        });
    }

    async findForUser(userId: string) {
        return this.prisma.transaction.findMany({
            where: { payerId: userId },
            orderBy: { date: 'desc' }
        });
    }

    async reject(id: string) {
        return this.prisma.transaction.update({
            where: { id },
            data: { status: 'CANCELED' }
        });
    }

    async getBalance(clubId: string) {
        const transactions = await this.prisma.transaction.findMany({
            where: { clubId, status: 'COMPLETED' } // Only count COMPLETED
        });

        const income = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            balance: income - expense,
            income,
            expense
        };
    }
}
// Force reload
