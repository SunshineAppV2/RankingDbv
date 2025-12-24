import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
    imports: [PrismaModule, ActivitiesModule],
    controllers: [EventsController],
    providers: [EventsService],
})
export class EventsModule { }
