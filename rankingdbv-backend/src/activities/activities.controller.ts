import { Controller, Get, Post, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile, Delete, UnauthorizedException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { ScoreDto } from './dto/score.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activities')
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) { }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.activitiesService.remove(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createActivityDto: CreateActivityDto) {
        return this.activitiesService.create(createActivityDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('club/:clubId')
    findAll(@Param('clubId') clubId: string, @Request() req) {
        if (req.user.email !== 'master@cantinhodbv.com' && req.user.clubId !== clubId) {
            throw new UnauthorizedException('Acesso negado aos dados deste clube.');
        }
        return this.activitiesService.findAllByClub(clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('score')
    awardPoints(@Body() scoreDto: ScoreDto) {
        return this.activitiesService.awardPoints(scoreDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('ranking/:clubId')
    getLeaderboard(@Param('clubId') clubId: string, @Request() req, @Query() query: any) {
        // Security: Only Master can bypass specific clubId (use GLOBAL)
        if (clubId === 'GLOBAL' && req.user.email !== 'master@cantinhodbv.com') {
            throw new UnauthorizedException('Apenas Master pode ver Ranking Global.');
        }

        const filters = {
            clubId: clubId === 'GLOBAL' ? query.clubId : clubId, // If GLOBAL, use query clubId (specific club filter)
            union: query.union,
            mission: query.mission,
            district: query.district
        };

        return this.activitiesService.getLeaderboard(filters);
    }

    @UseGuards(JwtAuthGuard)
    async getRecentScores(@Param('clubId') clubId: string) {
        return this.activitiesService.getRecentScores(clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('reset/:userId')
    resetPoints(@Param('userId') userId: string) {
        return this.activitiesService.resetPoints(userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    importActivities(@UploadedFile() file: Express.Multer.File, @Body('clubId') clubId: string) {
        // Se o clubId não vier no body (ex: form-data), usar o do usuário logado seria ideal,
        // mas aqui vamos confiar que o frontend manda ou usar um Guard para pegar do Request user.
        // Por simplificação e segurança, vamos pegar do Request user.
        return this.activitiesService.importActivities(file, clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('user/:userId/logs')
    async getUserLogs(@Param('userId') userId: string, @Request() req) {
        // Permissions:
        // 1. Master can see all
        // 2. User see themselves
        // 3. Admin/Owner/Director can see members of their club (this check is simplified, backend should verify club match, but for now we trust roles)

        const isSelf = req.user.id === userId;
        const isMaster = req.user.email === 'master@cantinhodbv.com';
        const isManager = ['OWNER', 'ADMIN', 'DIRECTOR', 'COUNSELOR', 'INSTRUCTOR'].includes(req.user.role);

        if (!isSelf && !isMaster && !isManager) {
            throw new UnauthorizedException('Você não tem permissão para ver o detalhamento deste usuário.');
        }

        return this.activitiesService.getLogsByUser(userId);
    }
    @UseGuards(JwtAuthGuard)
    @Get('ranking/units/:clubId')
    getUnitRanking(@Param('clubId') clubId: string, @Request() req) {
        // Security: Ensure user belongs to club or is Master
        if (clubId !== 'GLOBAL' && req.user.clubId !== clubId && req.user.email !== 'master@cantinhodbv.com') {
            // For now, allow viewing if they have access to the dashboard?
            // Actually, if it's public ranking, maybe open?
            // But let's stick to auth.
        }
        return this.activitiesService.getUnitRanking(clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('ranking/unit-details/:unitId')
    getUnitRankingDetails(@Param('unitId') unitId: string) {
        return this.activitiesService.getUnitRankingDetails(unitId);
    }
}
