import { Module, Controller, Get } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Usuario, PerfilTrabajador, Solicitud, Propuesta, Categoria } from './entities';
import { AuthController, AuthService, JwtAuthGuard, RolesGuard } from './auth/auth';
import { CatalogoController, CatalogoService } from './catalogo/catalogo';
import { TrabajadoresController, TrabajadoresService } from './trabajadores/trabajadores';
import { SolicitudesController, SolicitudesService } from './solicitudes/solicitudes';
import { PropuestasController, PropuestasService } from './propuestas/propuestas';
@Controller('health') class HealthController { @Get() check() { return {ok:true,proyecto:'ARREGLA YA',version:'0.1.0'}; } }
@Module({
 imports: [
  TypeOrmModule.forRoot({ type:'postgres', host:process.env.DB_HOST || 'localhost',port:Number(process.env.DB_PORT||5432), username:process.env.DB_USER||'arreglaya',password:process.env.DB_PASSWORD||'arreglaya_local',database:process.env.DB_NAME||'arreglaya',entities:[Usuario,PerfilTrabajador,Solicitud,Propuesta,Categoria],synchronize:true, // SOLO DESARROLLO LOCAL; reemplazar por migraciones antes de producción
   retryAttempts:3,retryDelay:1000 }),
  TypeOrmModule.forFeature([Usuario,PerfilTrabajador,Solicitud,Propuesta,Categoria]),
  JwtModule.register({secret:process.env.JWT_SECRET,signOptions:{expiresIn:'8h'}})
 ],
 controllers:[HealthController,AuthController,CatalogoController,TrabajadoresController,SolicitudesController,PropuestasController],
 providers:[AuthService,JwtAuthGuard,RolesGuard,CatalogoService,TrabajadoresService,SolicitudesService,PropuestasService]
}) export class AppModule {}
