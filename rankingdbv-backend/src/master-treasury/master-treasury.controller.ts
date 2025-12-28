import { Controller, Get, Post, Delete, Body, Query, UseGuards, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import { MasterTreasuryService } from './master-treasury.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransactionType } from '@prisma/client';

@Controller('master/treasury')
@UseGuards(JwtAuthGuard)
export class MasterTreasuryController {
    constructor(private readonly service: MasterTreasuryService) { }

    @Post()
    async create(@Body() body: any, @Req() req: any) {
        if (req.user.role !== 'MASTER' && req.user.email !== 'master@cantinhodbv.com') {
            throw new HttpException('Acesso restrito ao Master', HttpStatus.FORBIDDEN);
        }

        return this.service.create({
            type: body.type as TransactionType,
            amount: Number(body.amount),
            description: body.description,
            category: body.category,
            sourceClubId: body.sourceClubId,
            date: body.date ? new Date(body.date) : new Date(),
        });
    }

    @Get()
    async findAll(@Query() query: any, @Req() req: any) {
        if (req.user.role !== 'MASTER' && req.user.email !== 'master@cantinhodbv.com') {
            throw new HttpException('Acesso restrito ao Master', HttpStatus.FORBIDDEN);
        }

        const start = query.startDate ? new Date(query.startDate) : undefined;
        const end = query.endDate ? new Date(query.endDate) : undefined;

        return this.service.findAll({
            startDate: start,
            endDate: end,
            clubId: query.clubId,
            type: query.type
        });
    }

    @Get('summary')
    async getSummary(@Query() query: any, @Req() req: any) {
        if (req.user.role !== 'MASTER' && req.user.email !== 'master@cantinhodbv.com') {
            throw new HttpException('Acesso restrito ao Master', HttpStatus.FORBIDDEN);
        }
        const start = query.startDate ? new Date(query.startDate) : undefined;
        const end = query.endDate ? new Date(query.endDate) : undefined;
        return this.service.getSummary({ startDate: start, endDate: end });
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Req() req: any) {
        if (req.user.role !== 'MASTER' && req.user.email !== 'master@cantinhodbv.com') {
            throw new HttpException('Acesso restrito ao Master', HttpStatus.FORBIDDEN);
        }
        return this.service.delete(id);
    }
}
