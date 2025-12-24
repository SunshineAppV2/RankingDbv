import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
    imports: [PrismaModule, ActivitiesModule],
    controllers: [MeetingsController],
    providers: [MeetingsService],
})
export class MeetingsModule { }
