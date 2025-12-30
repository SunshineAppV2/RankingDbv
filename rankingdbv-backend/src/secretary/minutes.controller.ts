import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ForbiddenException } from '@nestjs/common';
import { MinutesService } from './minutes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MinuteType } from '@prisma/client';

@Controller('secretary/minutes')
@UseGuards(JwtAuthGuard)
export class MinutesController {
    constructor(private readonly minutesService: MinutesService) { }

    @Post()
    create(@Request() req, @Body() body: any) {
        const user = req.user;
        if (!['OWNER', 'DIRECTOR', 'SECRETARY', 'ADMIN'].includes(user.role)) {
            throw new ForbiddenException('Apenas secretários e diretoria podem criar atas.');
        }

        // Prepare data
        // body should have: title, date, type, content, attendees(optional)
        const { title, date, type, content, attendees } = body;

        const dateObj = new Date(date);

        return this.minutesService.create({
            title,
            year: dateObj.getFullYear(),
            date: dateObj,
            type: type as MinuteType,
            content,
            attendees: attendees || [], // JSON

            club: { connect: { id: user.clubId } },
            author: { connect: { id: user.userId } }
        });
    }

    @Get()
    findAll(@Request() req, @Query('type') type?: MinuteType) {
        const user = req.user;
        // Access control: Members can leverage this? Or restricted?
        // Usually only board members need to see minutes, or maybe all members.
        // For now, allow all logged in members of the club.
        return this.minutesService.findAll(user.clubId, type);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.minutesService.findOne(id);
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() body: any) {
        const user = req.user;
        if (!['OWNER', 'DIRECTOR', 'SECRETARY', 'ADMIN'].includes(user.role)) {
            throw new ForbiddenException('Permissão negada.');
        }

        return this.minutesService.update(id, body);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        const user = req.user;
        if (!['OWNER', 'DIRECTOR', 'SECRETARY', 'ADMIN'].includes(user.role)) {
            throw new ForbiddenException('Permissão negada.');
        }
        return this.minutesService.remove(id);
    }
}
