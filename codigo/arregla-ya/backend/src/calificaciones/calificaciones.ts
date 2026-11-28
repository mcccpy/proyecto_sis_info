
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Post,
  Param,
  ParseIntPipe,
  Req,
  UseGuards
} from '@nestjs/common';

import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Calificacion,
  EstadoPropuesta,
  EstadoSolicitud,
  Propuesta,
  Rol,
  Solicitud,
  Usuario
} from '../entities';

import {
  JwtAuthGuard,
  Roles,
  RolesGuard
} from '../auth/auth';

// DTO: valida los datos que envía el cliente.
export class CrearCalificacionDto {
  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}

// Servicio: contiene las reglas de negocio.
@Injectable()
export class CalificacionesService {
  constructor(
    @InjectRepository(Calificacion)
    private readonly repo: Repository<Calificacion>,

    @InjectRepository(Solicitud)
    private readonly solicitudes: Repository<Solicitud>,

    @InjectRepository(Propuesta)
    private readonly propuestas: Repository<Propuesta>,

    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>
  ) {}

  async crear(
    clienteId: number,
    solicitudId: number,
    dto: CrearCalificacionDto
  ) {
    // Buscar la solicitud y su propietario.
    const solicitud = await this.solicitudes.findOne({
      where: { id: solicitudId },
      relations: { cliente: true }
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Comprobar que pertenece al cliente autenticado.
    if (solicitud.cliente.id !== clienteId) {
      throw new ForbiddenException(
        'No puedes calificar una solicitud que no te pertenece'
      );
    }

    // Solo se pueden calificar trabajos finalizados.
    if (solicitud.estado !== EstadoSolicitud.FINALIZADA) {
      throw new BadRequestException(
        'Solo puedes calificar trabajos finalizados'
      );
    }

    // Buscar al trabajador cuya propuesta fue aceptada.
    const propuesta = await this.propuestas.findOne({
      where: {
        solicitud: { id: solicitudId },
        estado: EstadoPropuesta.ACEPTADA
      },
      relations: { trabajador: true }
    });

    if (!propuesta) {
      throw new NotFoundException(
        'No se encontró un trabajador asignado a esta solicitud'
      );
    }

    // Evitar calificaciones duplicadas.
    const existente = await this.repo.findOne({
      where: { solicitud: { id: solicitudId } }
    });

    if (existente) {
      throw new BadRequestException(
        'Esta solicitud ya fue calificada'
      );
    }

    const cliente = await this.usuarios.findOneByOrFail({
      id: clienteId
    });

    // Guardar la calificación en PostgreSQL.
    const calificacion = this.repo.create({
      trabajador: propuesta.trabajador,
      cliente,
      solicitud,
      puntuacion: dto.puntuacion,
      comentario: dto.comentario?.trim() || null
    });

    await this.repo.save(calificacion);

    return {
      ok: true,
      mensaje: 'Calificación registrada correctamente',
      puntuacion: calificacion.puntuacion
    };
  }
}

// Controlador: recibe las peticiones HTTP.
@Controller('calificaciones')
export class CalificacionesController {
  constructor(
    private readonly service: CalificacionesService
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTE, Rol.EMPRESA)
  @Post('solicitud/:id')
  crear(
    @Req() req: any,
    @Body() dto: CrearCalificacionDto,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.crear(
      req.user.sub,
      id,
      dto
    );
  }
}
