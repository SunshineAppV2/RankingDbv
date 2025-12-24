import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MinutesService {
    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService
    ) { }

    async create(data: { title: string; type: string; content: string; date: string; clubId: string; authorId: string; attendeeIds?: string[] }) {
        const { attendeeIds, ...rest } = data;

        const minute = await this.prisma.minute.create({
            data: {
                title: rest.title,
                type: rest.type,
                content: rest.content,
                date: new Date(rest.date),
                club: { connect: { id: rest.clubId } },
                author: { connect: { id: rest.authorId } },
                attendees: attendeeIds && attendeeIds.length > 0 ? {
                    create: attendeeIds.map(userId => ({
                        user: { connect: { id: userId } },
                        status: 'PENDING'
                    }))
                } : undefined
            },
            include: {
                attendees: { include: { user: { select: { id: true, name: true, photoUrl: true } } } }
            }
        });

        // Send Notifications
        if (attendeeIds && attendeeIds.length > 0) {
            attendeeIds.forEach(userId => {
                this.notifications.send(
                    userId,
                    'Nova Assinatura Solicitada',
                    `Você foi marcado para assinar a ata: "${rest.title}". Acesse para validar.`,
                    'WARNING'
                );
            });
        }

        return minute;
    }

    async findAll(clubId: string, filters?: { type?: string; startDate?: string; endDate?: string }) {
        const where: any = { clubId };

        if (filters?.type) where.type = filters.type;
        if (filters?.startDate && filters?.endDate) {
            where.date = {
                gte: new Date(filters.startDate),
                lte: new Date(filters.endDate)
            };
        }

        return this.prisma.minute.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                author: {
                    select: { id: true, name: true, photoUrl: true }
                },
                attendees: {
                    include: { user: { select: { id: true, name: true, photoUrl: true } } }
                }
            }
        });
    }

    async findOne(id: string) {
        return this.prisma.minute.findUnique({
            where: { id },
            include: {
                author: {
                    select: { id: true, name: true, photoUrl: true }
                },
                attendees: {
                    include: { user: { select: { id: true, name: true, photoUrl: true } } }
                }
            }
        });
    }

    async update(id: string, data: { title?: string; type?: string; content?: string; date?: string; attendeeIds?: string[] }) {
        const { attendeeIds, ...updateData } = data;
        const processedData: any = { ...updateData };
        if (updateData.date) processedData.date = new Date(updateData.date);

        // Check if already signed by anyone
        const minute = await this.prisma.minute.findUnique({
            where: { id },
            include: { attendees: true }
        });

        if (minute?.attendees?.some(a => a.status === 'SIGNED')) {
            throw new Error('Não é possível editar uma ata que já possui assinaturas.');
        }

        // Logic to update attendees is complex (add new, remove old). 
        // For simplicity, we delete all and recreate if attendeeIds is provided
        // Real-world: Better merge logic.

        let attendeesUpdate: any = undefined;
        if (attendeeIds) {
            attendeesUpdate = {
                deleteMany: {}, // Clear current list
                create: attendeeIds.map(userId => ({
                    user: { connect: { id: userId } },
                    status: 'PENDING'
                }))
            };
        }

        const updatedMinute = await this.prisma.minute.update({
            where: { id },
            data: {
                ...processedData,
                attendees: attendeesUpdate
            },
            include: {
                attendees: { include: { user: { select: { id: true, name: true, photoUrl: true } } } }
            }
        });

        // Send Notifications (only to new/current ones)
        if (attendeeIds && attendeeIds.length > 0) {
            attendeeIds.forEach(userId => {
                this.notifications.send(
                    userId,
                    'Solicitação de Assinatura (Atualizada)',
                    `A ata "${processedData.title || minute?.title}" requer sua assinatura.`,
                    'WARNING'
                );
            });
        }

        return updatedMinute;
    }

    async sign(minuteId: string, userId: string) {
        // Find attendee record
        const record = await this.prisma.minuteAttendee.findUnique({
            where: {
                minuteId_userId: { minuteId, userId }
            }
        });

        if (!record) throw new Error('Usuário não consta como participante desta ata.');
        if (record.status === 'SIGNED') throw new Error('Ata já assinada por este usuário.');

        return this.prisma.minuteAttendee.update({
            where: { id: record.id },
            data: {
                status: 'SIGNED',
                signedAt: new Date()
            }
        });
    }

    async remove(id: string) {
        const minute = await this.prisma.minute.findUnique({ where: { id }, include: { attendees: true } });
        if (minute?.attendees?.some(a => a.status === 'SIGNED')) {
            throw new Error('Não é possível excluir uma ata que já possui assinaturas.');
        }

        return this.prisma.minute.delete({
            where: { id }
        });
    }

    async findPendingForUser(userId: string) {
        return this.prisma.minuteAttendee.findMany({
            where: {
                userId,
                status: 'PENDING'
            },
            include: {
                minute: {
                    select: {
                        id: true,
                        title: true,
                        date: true,
                        type: true,
                        author: { select: { name: true } }
                    }
                }
            },
            orderBy: { minute: { date: 'desc' } }
        });
    }
}
