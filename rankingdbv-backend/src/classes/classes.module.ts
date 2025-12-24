import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
    controllers: [ClassesController],
    providers: [ClassesService, PrismaService, JwtService],
})
export class ClassesModule { }
