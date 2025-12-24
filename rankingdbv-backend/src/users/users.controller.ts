import { Controller, Get, Param, UseGuards, Patch, Body, Post, Req, Delete, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // Mantemos apenas o que existe no Service: Buscar por ID
  // E corrigimos o tipo de id para String (UUID)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.usersService.findOne(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ranking/top')
  findRanking(@Req() req: any) {
    return this.usersService.findRanking(req?.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    return this.usersService.findAll(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')

  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    console.log('Update User Request:', id, updateUserDto);
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('family/children/:parentId')
  findChildren(@Param('parentId') parentId: string) {
    return this.usersService.findChildren(parentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('family/link')
  linkChild(@Body() body: { parentId: string, childEmail: string }) {
    return this.usersService.linkChild(body.parentId, body.childEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user);
  }
}
