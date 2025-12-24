import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
    controllers: [StoreController],
    providers: [StoreService, PrismaService, JwtService],
    exports: [StoreService],
})
export class StoreModule { }
