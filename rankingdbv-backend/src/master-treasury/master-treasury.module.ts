import { Module } from '@nestjs/common';
import { MasterTreasuryService } from './master-treasury.service';
import { MasterTreasuryController } from './master-treasury.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MasterTreasuryController],
    providers: [MasterTreasuryService],
})
export class MasterTreasuryModule { }
