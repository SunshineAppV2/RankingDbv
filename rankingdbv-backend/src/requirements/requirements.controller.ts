
import { Controller, Get, Post, Body, Query, UseGuards, Param, Request, Delete, Patch } from '@nestjs/common';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DBVClass } from '@prisma/client';

@Controller('requirements')
export class RequirementsController {
    constructor(private readonly requirementsService: RequirementsService) { }

    @UseGuards(JwtAuthGuard)
    @Get('scrape')
    async scrape(@Query('url') url: string) {
        if (!url) throw new Error('URL required');
        return this.requirementsService.scrapeUrl(url);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createDto: CreateRequirementDto, @Request() req) {
        console.log('[RequirementsController] Received create request:', JSON.stringify(createDto));
        console.log('[RequirementsController] User:', req.user.email, req.user.role);
        // ... (existing logic)
        const userClubId = req.user.clubId;
        if (userClubId) {
            createDto.clubId = userClubId;
        }

        return this.requirementsService.create(createDto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('import')
    import(@Body() items: CreateRequirementDto[], @Request() req) {
        // Ensure only Master can import GLOBAL requirements?
        // Or Club Admin can import BULK requirements?
        // Let's assume Master for now as requested.
        // if (req.user.email !== 'master@cantinhodbv.com') throw new ForbiddenException();

        // For flexibility, allows import. Logic inside service will handle creation.
        // We might want to force clubID if not master?
        const userClubId = req.user.clubId;
        const isMaster = req.user.email === 'master@cantinhodbv.com';

        const dataToImport = items.map(item => {
            if (!isMaster && userClubId) {
                return { ...item, clubId: userClubId };
            }
            return item;
        });

        return this.requirementsService.createMany(dataToImport);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(
        @Query('class') dbvClass: DBVClass,
        @Query('specialtyId') specialtyId: string,
        @Query('userId') targetUserId: string,
        @Request() req
    ) {
        // If user is accessing their own list or looking at someone's list?
        // Usually we want to see requirements available to "Me" or "My Club".
        // Pass the requester's clubId to filter available requirements.
        let userId = req?.user?.userId || req?.user?.id;
        const userRole = req?.user?.role;

        // Allow Admins/Counselors to view other's progress if targetUserId is provided
        if (targetUserId && ['OWNER', 'ADMIN', 'COUNSELOR', 'INSTRUCTOR'].includes((userRole || '').toUpperCase())) {
            userId = targetUserId;
        }

        const userClubId = req.user.clubId;
        return this.requirementsService.findAll({ dbvClass, specialtyId, userId, userClubId });
    }

    @UseGuards(JwtAuthGuard)
    @Post('answer')
    async answer(@Body() body: { requirementId: string, text?: string, fileUrl?: string }, @Request() req) {
        try {
            const userId = req.user.userId || req.user.id;
            console.log('Submitting answer for user:', userId, 'Requirement:', body.requirementId);
            return await this.requirementsService.submitAnswer(userId, body.requirementId, body.text, body.fileUrl);
        } catch (error) {
            console.error('Error submitting answer:', error);
            throw error;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Get('child/:childId/alerts')
    getAlertsForChild(@Param('childId') childId: string) {
        return this.requirementsService.getAlertsForChild(childId);
    }


    @UseGuards(JwtAuthGuard)
    @Get('progress')
    getProgress(@Request() req) {
        return this.requirementsService.getUserProgress(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.requirementsService.remove(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateRequirementDto) {
        return this.requirementsService.update(id, updateDto);
    }
    @UseGuards(JwtAuthGuard)
    @Get(':id/quiz')
    getQuiz(@Param('id') id: string) {
        return this.requirementsService.getQuiz(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/quiz/submit')
    submitQuiz(@Param('id') id: string, @Body() body: { answers: { questionId: string, selectedIndex: number }[] }, @Request() req) {
        const userId = req.user.userId || req.user.id;
        return this.requirementsService.submitQuiz(userId, id, body.answers);
    }
    @UseGuards(JwtAuthGuard)
    @Post(':id/assign')
    assign(@Param('id') id: string, @Body() body: { userIds: string[] }, @Request() req) {
        const counselorId = req.user.userId || req.user.id;
        return this.requirementsService.createAssignments(id, body.userIds, counselorId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('approvals/pending')
    getPendingApprovals(@Request() req) {
        const counselorId = req.user.userId || req.user.id;
        return this.requirementsService.getPendingApprovals(counselorId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('deliveries/pending')
    getPendingDeliveries(@Request() req) {
        const counselorId = req.user.userId || req.user.id;
        return this.requirementsService.getPendingDeliveries(counselorId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/approve')
    approveRequirement(@Param('id') id: string, @Request() req) {
        const approverId = req.user.userId || req.user.id;
        return this.requirementsService.approveAssignment(id, approverId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/reject')
    rejectRequirement(@Param('id') id: string) {
        return this.requirementsService.rejectAssignment(id);
    }
}
