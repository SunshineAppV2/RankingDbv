
import { Controller, Post, Body, Get, Patch, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('pix')
    async createPix(@Body() body: { amount: number; description: string; userId: string; userName: string; userEmail: string }) {
        return this.paymentsService.createPixCharge(
            body.amount,
            body.description,
            body.userId,
            body.userName,
            body.userEmail
        );
    }

    // --- Master Configs ---

    @UseGuards(JwtAuthGuard)
    @Post('setup-plans')
    async setupPlans(@Request() req) {
        if (req.user.email !== 'master@cantinhodbv.com' && req.user.role !== 'MASTER') {
            throw new UnauthorizedException('Acesso negado');
        }
        return this.paymentsService.setupAllPlans();
    }

    @Get('plans')
    async getPlans() {
        return this.paymentsService.getPlanIds();
    }

    @Get('public-settings')
    async getPublicSettings() {
        return this.paymentsService.getPublicSettings();
    }

    @Get('settings/:key')
    async getSetting(@Param('key') key: string) {
        return this.paymentsService.getSystemSettings(key);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('settings/:key')
    async updateSetting(@Param('key') key: string, @Body() body: any, @Request() req) {
        if (req.user.email !== 'master@cantinhodbv.com' && req.user.role !== 'MASTER') {
            throw new UnauthorizedException('Acesso negado');
        }
        return this.paymentsService.updateSystemSettings(key, body.value);
    }
}
