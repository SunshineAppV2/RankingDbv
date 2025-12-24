import { Module } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [ClubsController],
    providers: [ClubsService, PrismaService],
    exports: [ClubsService] // Exporting the service
})
export class ClubsModule { }
