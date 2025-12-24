import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile, Request, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { AttendanceDto } from './dto/attendance.dto';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
    constructor(private readonly meetingsService: MeetingsService) { }

    @Post()
    create(@Body() createMeetingDto: CreateMeetingDto) {
        return this.meetingsService.create(createMeetingDto);
    }

    @Get('club/:clubId')
    findAllByClub(@Param('clubId') clubId: string, @Request() req) {
        if (req.user.email !== 'master@rankingdbv.com' && req.user.clubId !== clubId) {
            throw new UnauthorizedException('Acesso negado aos dados deste clube.');
        }
        return this.meetingsService.findAllByClub(clubId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.meetingsService.findOne(id);
    }

    @Post(':id/attendance')
    registerAttendance(@Param('id') id: string, @Body() attendanceDto: AttendanceDto) {
        return this.meetingsService.registerAttendance(id, attendanceDto);
    }

    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    importMeetings(@UploadedFile() file: Express.Multer.File, @Body('clubId') clubId: string) {
        return this.meetingsService.importMeetings(file, clubId);
    }

    @Post(':id/import-attendance')
    @UseInterceptors(FileInterceptor('file'))
    importAttendance(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
        return this.meetingsService.importAttendance(id, file);
    }
}
