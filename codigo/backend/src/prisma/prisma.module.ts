import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Comparte PrismaService con los módulos de la aplicación. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
