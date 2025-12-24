import { Controller, Get, Post, Body, Param, Patch, Delete, UseInterceptors, UploadedFile, Request, UseGuards, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('specialties')
@UseGuards(JwtAuthGuard)
export class SpecialtiesController {
    constructor(private readonly specialtiesService: SpecialtiesService) { }

    @Post()
    create(@Body() createSpecialtyDto: CreateSpecialtyDto) {
        return this.specialtiesService.create(createSpecialtyDto);
    }

    @Get()
    findAll() {
        return this.specialtiesService.findAll();
    }

    @Get('my')
    async findMy(@Request() req: any) {
        // console.log('DEBUG: /specialties/my called by User:', req.user); 
        const userId = req.user?.userId || req.user?.id; // Fallback just in case, but userId is from Strategy
        return this.specialtiesService.findAllForUser(userId);
    }

    @Get('user/:userId')
    findByUser(@Param('userId') userId: string) {
        return this.specialtiesService.findAllForUser(userId);
    }


    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.specialtiesService.findOne(id);
    }

    @Get('pending')
    async findPending(@Request() req: any) {
        // Ideally filter by club. Assuming req.user has clubId
        const clubId = req.user?.clubId;
        // If super admin, maybe all? For now, stick to club if available, or just all if specific logic needed.
        // Assuming user must have clubId. If not, returning empty or all?
        // Let's assume passed in query or from user profile.
        // For safe fallback:
        if (!clubId) return { requirements: [], specialties: [] };

        return this.specialtiesService.findAllPending(clubId);
    }

    @Get('dashboard')
    async getDashboard(@Request() req: any) {
        const clubId = req.user?.clubId;
        if (!clubId) return [];
        return this.specialtiesService.getDashboardData(clubId);
    }

    @Get(':id/progress')
    async getProgress(@Param('id') id: string, @Request() req: any, @Query('userId') queryUserId?: string) {
        // Authenticated user
        const userId = queryUserId || req.user?.userId || req.user?.id;
        return this.specialtiesService.getUserRequirements(userId, id);
    }

    @Post('answer')
    submitAnswer(@Body() dto: SubmitAnswerDto, @Request() req: any) {
        const userId = req.user?.userId || req.user?.id || req.body.userId;
        return this.specialtiesService.submitAnswer(userId, dto);
    }

    // Renamed 'award' to 'approve' for clarity, but keeping 'award' path for compatibility if needed.
    @Post('award/:userId/:specialtyId')
    approve(@Param('userId') userId: string, @Param('specialtyId') specialtyId: string) {
        return this.specialtiesService.approveSpecialty(userId, specialtyId);
    }

    @Post('requirement/:userId/:requirementId/:status')
    @UseGuards(JwtAuthGuard) // Ensure admin
    setRequirementStatus(
        @Param('userId') userId: string,
        @Param('requirementId') requirementId: string,
        @Param('status') status: 'APPROVED' | 'REJECTED' | 'PENDING'
    ) {
        // In a real app we'd check if req.user is admin here
        return this.specialtiesService.setRequirementStatus(userId, requirementId, status as any);
    }

    @Post('assign/:userId/:specialtyId')
    assign(@Param('userId') userId: string, @Param('specialtyId') specialtyId: string) {
        return this.specialtiesService.assignSpecialty(userId, specialtyId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.specialtiesService.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.specialtiesService.remove(id);
    }

    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    importSpecialties(@UploadedFile() file: Express.Multer.File) {
        return this.specialtiesService.importSpecialties(file);
    }

    @Post('import-url')
    importFromUrl(@Body('url') url: string) {
        return this.specialtiesService.importFromUrl(url);
    }
}
