import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { MinutesService } from './minutes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('secretary/minutes')
@UseGuards(JwtAuthGuard)
export class MinutesController {
    constructor(private readonly minutesService: MinutesService) { }

    @Post()
    create(@Body() body: any, @Request() req) {
        return this.minutesService.create({
            ...body,
            clubId: req.user.clubId,
            authorId: req.user.userId
        });
    }

    @Get()
    findAll(@Request() req, @Query() query: any) {
        return this.minutesService.findAll(req.user.clubId, query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.minutesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.minutesService.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.minutesService.remove(id);
    }

    @Post(':id/sign')
    sign(@Param('id') id: string, @Request() req) {
        return this.minutesService.sign(id, req.user.userId);
    }

    @Get('pending/my')
    findPending(@Request() req) {
        return this.minutesService.findPendingForUser(req.user.userId);
    }
}
