import { Module } from '@nestjs/common';
import { MinutesService } from './minutes.service';
import { MinutesController } from './minutes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [MinutesController],
    providers: [MinutesService],
})
export class SecretaryModule { }
