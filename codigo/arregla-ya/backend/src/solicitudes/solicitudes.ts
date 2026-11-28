
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';

import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min
} from 'class-validator';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Categoria,
  EstadoPropuesta,
  EstadoSolicitud,
  PerfilTrabajador,
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

export class CrearSolicitudDto {
  @IsString()
  @Length(5, 150)
  titulo!: string;

  @IsString()
  @Length(15, 2000)
  descripcion!: string;

  @IsString()
  @Length(5, 180)
  direccion!: string;

  @IsString()
  @Length(2, 100)
  zona!: string;

  @IsString()
  @Length(3, 150)
  disponibilidad!: string;

  @IsInt()
  @Min(1)
  categoriaId!: number;

  @IsOptional()
  @IsString()
  @Length(0, 400)
  fotoUrl?: string;
}

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud)
    private repo: Repository<Solicitud>,

    @InjectRepository(Usuario)
    private users: Repository<Usuario>,

    @InjectRepository(Categoria)
    private categories: Repository<Categoria>,

    @InjectRepository(PerfilTrabajador)
    private profiles: Repository<PerfilTrabajador>,

    @InjectRepository(Propuesta)
    private propuestas: Repository<Propuesta>
  ) {}

  async crear(id: number, rol: Rol, dto: CrearSolicitudDto) {
    // Regla provisional: máximo de solicitudes abiertas.
    const max = rol === Rol.EMPRESA ? 10 : 3;

    const abiertas = await this.repo
      .createQueryBuilder('s')
      .where('s.clienteId = :id', { id })
      .andWhere('s.estado NOT IN (:...cerradas)', {
        cerradas: [
          EstadoSolicitud.CANCELADA,
          EstadoSolicitud.FINALIZADA
        ]
      })
      .getCount();

    if (abiertas >= max) {
      throw new BadRequestException(
        `Límite de ${max} solicitudes abiertas.`
      );
    }

    const cat = await this.categories.findOneBy({
      id: dto.categoriaId
    });

    if (!cat) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const cliente = await this.users.findOneByOrFail({ id });

    const s = this.repo.create({
      cliente,
      categoria: cat,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      direccion: dto.direccion,
      zona: dto.zona,
      disponibilidad: dto.disponibilidad,
      fotoUrl: dto.fotoUrl || null,
      estado: EstadoSolicitud.ACTIVA
    });

    await this.repo.save(s);

    return {
      id: s.id,
      estado: s.estado
    };
  }

  // El cliente consulta sus propias solicitudes.
  async mias(id: number) {
    return this.repo.find({
      where: { cliente: { id } },
      relations: { categoria: true },
      order: { creadaEn: 'DESC' }
    });
  }

  // Los trabajadores aprobados consultan solicitudes disponibles.
  async disponibles(id: number) {
    const p = await this.profiles.findOne({
      where: { usuario: { id } }
    });

    if (!p?.aprobado) {
      throw new ForbiddenException(
        'Debes estar aprobado para consultar solicitudes'
      );
    }

    const jobs = await this.repo.find({
      where: { estado: EstadoSolicitud.ACTIVA },
      relations: { categoria: true },
      order: { creadaEn: 'DESC' },
      take: 100
    });

    return jobs.map(s => ({
      id: s.id,
      titulo: s.titulo,
      descripcion: s.descripcion,
      zona: s.zona,
      disponibilidad: s.disponibilidad,
      categoria: s.categoria.nombre,
      creadaEn: s.creadaEn,
      estado: s.estado,
      fotoUrl: s.fotoUrl
    }));
  }

  // Buscar una solicitud por su ID.
  async findRaw(id: number) {
    const job = await this.repo.findOne({
      where: { id },
      relations: { cliente: true, categoria: true }
    });

    if (!job) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    return job;
  }

  // Finalizar una solicitud y registrar un trabajo completado.
  async finalizar(id: number, clienteId: number) {
    const solicitud = await this.repo.findOne({
      where: { id },
      relations: { cliente: true }
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    // Comprobar que pertenece al cliente autenticado.
    if (solicitud.cliente.id !== clienteId) {
      throw new ForbiddenException(
        'No puedes finalizar una solicitud que no te pertenece'
      );
    }

    // Comprobar que la solicitud está asignada.
    if (solicitud.estado !== EstadoSolicitud.ASIGNADA) {
      throw new BadRequestException(
        'Solo puedes finalizar solicitudes asignadas'
      );
    }

    // Comprobar que existe una propuesta aceptada.
    const propuesta = await this.propuestas.findOne({
      where: {
        solicitud: { id },
        estado: EstadoPropuesta.ACEPTADA
      }
    });

    if (!propuesta) {
      throw new BadRequestException(
        'No existe una propuesta aceptada para esta solicitud'
      );
    }

    solicitud.estado = EstadoSolicitud.FINALIZADA;

    await this.repo.save(solicitud);

    return {
      ok: true,
      mensaje: 'Solicitud finalizada correctamente',
      id: solicitud.id,
      estado: solicitud.estado
    };
  }
}

@Controller('solicitudes')
export class SolicitudesController {
  constructor(private service: SolicitudesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTE, Rol.EMPRESA)
  @Post()
  crear(
    @Req() req: any,
    @Body() dto: CrearSolicitudDto
  ) {
    return this.service.crear(
      req.user.sub,
      req.user.rol,
      dto
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTE, Rol.EMPRESA)
  @Get('mias')
  mias(@Req() req: any) {
    return this.service.mias(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  @Get('disponibles')
  disponibles(@Req() req: any) {
    return this.service.disponibles(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTE, Rol.EMPRESA)
  @Patch(':id/finalizar')
  finalizar(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.finalizar(
      id,
      req.user.sub
    );
  }
}
