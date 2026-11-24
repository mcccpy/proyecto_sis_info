import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CalificacionModule } from './modules/calificacion/calificacion.module';
import { CategoriaModule } from './modules/categoria/categoria.module';
import { PagoModule } from './modules/pago/pago.module';
import { PerfilTrabajadorModule } from './modules/perfil-trabajador/perfil-trabajador.module';
import { PropuestaModule } from './modules/propuesta/propuesta.module';
import { ReclamoModule } from './modules/reclamo/reclamo.module';
import { ServicioModule } from './modules/servicio/servicio.module';
import { TrabajoModule } from './modules/trabajo/trabajo.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { VisitaModule } from './modules/visita/visita.module';
import { ZonaModule } from './modules/zona/zona.module';
import { AuthModule } from './modules/auth/auth.module';
import { SecurityModule } from './modules/auth/security.module';

/** Ensambla los módulos de infraestructura y las funcionalidades del sistema. */
@Module({
  imports: [
    PrismaModule,
    // Módulos de las funcionalidades principales de la aplicación.
    CalificacionModule,
    CategoriaModule,
    PagoModule,
    PerfilTrabajadorModule,
    PropuestaModule,
    ReclamoModule,
    ServicioModule,
    TrabajoModule,
    UsuarioModule,
    VisitaModule,
    ZonaModule,
    AuthModule,
    SecurityModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
