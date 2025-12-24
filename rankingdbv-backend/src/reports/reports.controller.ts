import { Controller, Get, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('demographics')
    getDemographics(@Request() req) {
        this.checkPermission(req.user);
        return this.reportsService.getDemographics(req.user.clubId);
    }

    @Get('financial')
    getFinancial(@Request() req) {
        this.checkPermission(req.user);
        return this.reportsService.getFinancialStats(req.user.clubId);
    }

    @Get('attendance')
    getAttendance(@Request() req) {
        this.checkPermission(req.user);
        return this.reportsService.getAttendanceStats(req.user.clubId);
    }

    @Get('academic')
    getAcademic(@Request() req) {
        this.checkPermission(req.user);
        return this.reportsService.getAcademicStats(req.user.clubId);
    }

    @Get('points')
    getPoints(@Request() req) {
        this.checkPermission(req.user);
        return this.reportsService.getPointsStats(req.user.clubId);
    }

    private checkPermission(user: any) {
        const allowedRoles = ['OWNER', 'ADMIN', 'DIRECTOR', 'SECRETARY', 'TREASURER', 'MASTER'];
        // Master bypass or check role
        if (user.email === 'master@rankingdbv.com') return; // Master has access

        if (!allowedRoles.includes(user.role)) {
            throw new UnauthorizedException('Acesso restrito à diretoria.');
        }
    }
}
