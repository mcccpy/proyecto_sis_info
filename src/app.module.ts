import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsModule } from './requests/requests.module';
import { ServicesModule } from './services/services.module';

@Module({
  imports: [
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '1234',
  database: 'arreglalo_ya',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
}),
    RequestsModule,
    ServicesModule,
  ],
})
export class AppModule {}