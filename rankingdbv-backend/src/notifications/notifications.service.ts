import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
    constructor(
        private prisma: PrismaService,
        private gateway: NotificationsGateway
    ) { }

    async send(userId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO') {
        const notification = await this.prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type
            }
        });

        // Emit via WebSocket
        this.gateway.sendToUser(userId, 'notification', notification);

        return notification;
    }

    async findAllForUser(userId: string) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
    }

    async getUnreadCount(userId: string) {
        return this.prisma.notification.count({
            where: {
                userId,
                read: false
            }
        });
    }

    async markAsRead(id: string) {
        return this.prisma.notification.update({
            where: { id },
            data: { read: true }
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
    }
    async sendGlobal(title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO') {
        const users = await this.prisma.user.findMany({
            where: { isActive: true },
            select: { id: true }
        });

        if (users.length === 0) return { count: 0 };

        // Batch create in database
        await this.prisma.notification.createMany({
            data: users.map(user => ({
                userId: user.id,
                title,
                message,
                type,
                read: false,
                createdAt: new Date()
            }))
        });

        // Emit socket events
        users.forEach(user => {
            this.gateway.sendToUser(user.id, 'notification', {
                title,
                message,
                type,
                read: false,
                createdAt: new Date().toISOString()
            });
        });

        return { count: users.length };
    }
}
