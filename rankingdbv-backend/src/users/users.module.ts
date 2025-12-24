import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [PrismaModule, ClubsModule], // Importando o Prisma e Clubs aqui
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
