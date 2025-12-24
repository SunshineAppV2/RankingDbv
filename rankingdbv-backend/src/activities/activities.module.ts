import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
    imports: [ClubsModule],
    controllers: [ActivitiesController],
    providers: [ActivitiesService, PrismaService],
    exports: [ActivitiesService]
})
export class ActivitiesModule { }
