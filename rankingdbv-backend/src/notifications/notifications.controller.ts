import { Controller, Get, Patch, Post, Body, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Request() req) {
        return this.notificationsService.findAllForUser(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('unread-count')
    getUnreadCount(@Request() req) {
        return this.notificationsService.getUnreadCount(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/read')
    markAsRead(@Param('id') id: string) {
        return this.notificationsService.markAsRead(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('read-all')
    markAllAsRead(@Request() req) {
        return this.notificationsService.markAllAsRead(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('global')
    async sendGlobal(@Request() req, @Body() body: { title: string; message: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' }) {
        if (req.user.role !== 'MASTER' && req.user.email !== 'master@cantinhodbv.com' && req.user.role !== 'OWNER') {
            throw new UnauthorizedException('Permissão negada.');
        }
        return this.notificationsService.sendGlobal(body.title, body.message, body.type);
    }
}
