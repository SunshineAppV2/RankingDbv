import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, Request, Req } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('clubs')
export class ClubsController {
    constructor(private readonly clubsService: ClubsService) { }

    @Post()
    create(@Body() createClubDto: CreateClubDto) {
        return this.clubsService.create(createClubDto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('assign-owner')
    createAndAssignOwner(@Body() body: { createClubDto: CreateClubDto, ownerId: string }, @Request() req) {
        if (req.user.role !== 'MASTER' && req.user.email !== 'master@cantinhodbv.com') {
            throw new Error('Acesso negado');
        }
        return this.clubsService.createAndAssignOwner(body.createClubDto, body.ownerId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('export/all')
    exportData(@Req() req) {
        // Only allow if user is OWNER or specific role if needed.
        // For now, any authenticated user can export THEIR club data.
        return this.clubsService.getExportData(req.user.clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('status')
    getClubStatus(@Req() req) {
        return this.clubsService.getClubStatus(req.user.clubId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('dashboard')
    getDashboard(@Request() req) {
        const isMaster = req.user.email === 'master@cantinhodbv.com' || req.user.role === 'MASTER';
        const isCoordinator = ['COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'COORDINATOR_AREA'].includes(req.user.role);

        if (!isMaster && !isCoordinator) throw new Error('Acesso negado');

        return this.clubsService.getAllClubsDetailed(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll() {
        return this.clubsService.findAll();
    }

    @Get('hierarchy-options')
    getHierarchyOptions() {
        return this.clubsService.getHierarchyOptions();
    }

    @Get('public')
    findAllPublic() {
        return this.clubsService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get('hierarchy-tree')
    getHierarchyTree() {
        return this.clubsService.getHierarchyTree();
    }

    @UseGuards(JwtAuthGuard)
    @Patch('hierarchy/rename')
    async renameHierarchyNode(@Body() body: { level: 'union' | 'mission' | 'region', oldName: string, newName: string }, @Request() req) {
        if (req.user.email !== 'master@cantinhodbv.com') throw new Error('Acesso negado');
        return this.clubsService.renameHierarchyNode(body.level, body.oldName, body.newName);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('hierarchy')
    async deleteHierarchyNode(@Query('level') level: 'union' | 'mission' | 'region', @Query('name') name: string, @Request() req) {
        if (req.user.email !== 'master@cantinhodbv.com') throw new Error('Acesso negado');
        return this.clubsService.deleteHierarchyNode(level, name);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/subscription')
    async updateSubscription(@Param('id') id: string, @Body() body: any, @Request() req) {
        console.log('Update Subscription Request:', { id, body, user: req.user.email });
        if (req.user.email !== 'master@cantinhodbv.com' && req.user.role !== 'MASTER') throw new Error('Acesso negado. Apenas o Master pode gerenciar assinaturas.');
        try {
            return await this.clubsService.updateSubscription(id, body);
        } catch (e) {
            console.error('Error updating subscription:', e);
            throw e;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/send-payment-info')
    async sendPaymentInfo(@Param('id') id: string, @Body() body: { message?: string }, @Request() req) {
        if (req.user.email !== 'master@cantinhodbv.com' && req.user.role !== 'MASTER') {
            throw new Error('Acesso negado.');
        }
        return this.clubsService.sendPaymentInfo(id, body.message);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.clubsService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Put(':id')
    update(@Param('id') id: string, @Body() data: { name?: string; logoUrl?: string; settings?: any; union?: string; mission?: string; region?: string; district?: string; association?: string }) {
        return this.clubsService.update(id, data);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.clubsService.delete(id);
    }
}
