import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile, Patch, Delete, Request, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Post()
    create(@Body() createEventDto: CreateEventDto) {
        return this.eventsService.create(createEventDto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
        return this.eventsService.update(id, updateEventDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.eventsService.delete(id);
    }

    @Get('club/:clubId')
    @Get('club/:clubId')
    findAll(@Param('clubId') clubId: string, @Request() req) {
        if (req.user.email !== 'master@cantinhodbv.com' && req.user.clubId !== clubId) {
            throw new UnauthorizedException('Acesso negado aos dados deste clube.');
        }
        return this.eventsService.findAll(clubId);
    }

    @Post(':id/register')
    register(@Param('id') id: string, @Body() body: { userIds: string[] }) {
        return this.eventsService.register(id, body.userIds);
    }

    @Post('import-events')
    @UseInterceptors(FileInterceptor('file'))
    importEvents(@UploadedFile() file: Express.Multer.File, @Body('clubId') clubId: string) {
        return this.eventsService.importEvents(file, clubId);
    }

    @Post(':id/import-registrations')
    @UseInterceptors(FileInterceptor('file'))
    importRegistrations(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
        return this.eventsService.importRegistrations(id, file);
    }

    @Post(':id/attendance')
    updateAttendance(@Param('id') id: string, @Body() body: { userIds: string[], attended: boolean }) {
        return this.eventsService.updateAttendance(id, body.userIds, body.attended);
    }
}
