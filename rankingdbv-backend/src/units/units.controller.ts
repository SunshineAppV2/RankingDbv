import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { UnitsService } from './units.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Controller('units')
@UseGuards(JwtAuthGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) { }

  @Post()
  create(@Body() createUnitDto: CreateUnitDto) {
    return this.unitsService.create(createUnitDto);
  }

  @Get('club/:clubId')
  findAllByClub(@Param('clubId') clubId: string, @Request() req) {
    if (req.user.email !== 'master@cantinhodbv.com' && req.user.clubId !== clubId) {
      throw new UnauthorizedException('Acesso negado.');
    }
    return this.unitsService.findAllByClub(clubId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUnitDto: UpdateUnitDto) {
    return this.unitsService.update(id, updateUnitDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }

  @Post('assign')
  assignMember(@Body() body: { userId: string, unitId: string }) {
    return this.unitsService.assignMember(body.userId, body.unitId);
  }
}
