import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // O pulo do gato: Isso torna o Prisma visível para TODO o app
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
