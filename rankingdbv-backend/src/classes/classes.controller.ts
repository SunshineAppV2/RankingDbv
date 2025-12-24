import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassesController {
    constructor(private readonly classesService: ClassesService) { }

    @Get(':className/students')
    getStudentsByClass(@Req() req, @Param('className') className: string) {
        if (!req.user) {
            throw new Error('User not found in request');
        }
        return this.classesService.getStudentsByClass(req.user, className);
    }
}
