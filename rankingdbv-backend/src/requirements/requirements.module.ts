import { Module } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
    imports: [PrismaModule, ClubsModule],
    controllers: [RequirementsController],
    providers: [RequirementsService],
    exports: [RequirementsService]
})
export class RequirementsModule { }
