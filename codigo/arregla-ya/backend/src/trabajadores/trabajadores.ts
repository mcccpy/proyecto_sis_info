
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards
} from '@nestjs/common';

import {
  IsInt,
  IsString,
  Length,
  Min
} from 'class-validator';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Calificacion,
  Categoria,
  EstadoPropuesta,
  EstadoSolicitud,
  PerfilTrabajador,
  Propuesta,
  Rol,
  Solicitud
} from '../entities';

import {
  JwtAuthGuard,
  Roles,
  RolesGuard
} from '../auth/auth';

export class PerfilDto {
  @IsString()
  @Length(3, 500)
  experiencia!: string;

  @IsString()
  @Length(2, 100)
  zona!: string;

  @IsString()
  @Length(3, 150)
  disponibilidad!: string;

  @IsInt()
  @Min(1)
  categoriaId!: number;
}

@Injectable()
export class TrabajadoresService {
  constructor(
    @InjectRepository(PerfilTrabajador)
    private profiles: Repository<PerfilTrabajador>,

    @InjectRepository(Categoria)
    private categories: Repository<Categoria>,

    @InjectRepository(Calificacion)
    private ratings: Repository<Calificacion>,

    @InjectRepository(Propuesta)
    private proposals: Repository<Propuesta>,

    @InjectRepository(Solicitud)
    private requests: Repository<Solicitud>
  ) {}

  // ==========================================
  // 1. LISTAR TRABAJADORES
  // ==========================================

  async lista(categoria?: number, zona?: string) {
    const query = this.profiles
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.usuario', 'u')
      .leftJoinAndSelect('p.categoria', 'c')
      .where('p.aprobado = true');

    if (categoria) {
      query.andWhere('c.id = :id', { id: categoria });
    }

    if (zona) {
      query.andWhere(
        'LOWER(p.zona) LIKE LOWER(:zona)',
        { zona: `%${zona}%` }
      );
    }

    const rows = await query.getMany();

    return rows.map(p => ({
      id: p.usuario.id,
      nombre: p.usuario.nombre,
      categoria: p.categoria?.nombre || 'Sin categoría',
      zona: p.zona,
      disponibilidad: p.disponibilidad,
      experiencia: p.experiencia
    }));
  }

  // ==========================================
  // 2. CONSULTAR MI PERFIL
  // ==========================================

  async miPerfil(usuarioId: number) {
    return this.profiles.findOne({
      where: { usuario: { id: usuarioId } },
      relations: { categoria: true }
    });
  }

  // ==========================================
  // 3. ACTUALIZAR PERFIL
  // ==========================================

  async actualizar(usuarioId: number, dto: PerfilDto) {
    const profile = await this.miPerfil(usuarioId);

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const category = await this.categories.findOneBy({
      id: dto.categoriaId
    });

    if (!category) {
      throw new NotFoundException('Categoría inexistente');
    }

    profile.experiencia = dto.experiencia;
    profile.zona = dto.zona;
    profile.disponibilidad = dto.disponibilidad;
    profile.categoria = category;

    await this.profiles.save(profile);

    return this.miPerfil(usuarioId);
  }

  // ==========================================
  // 4. TRABAJADORES PENDIENTES
  // ==========================================

  async pendientes() {
    const rows = await this.profiles.find({
      where: { aprobado: false },
      relations: { usuario: true, categoria: true }
    });

    return rows.map(p => ({
      id: p.usuario.id,
      nombre: p.usuario.nombre,
      email: p.usuario.email,
      experiencia: p.experiencia,
      zona: p.zona,
      categoria: p.categoria?.nombre || 'Sin categoría'
    }));
  }

  // ==========================================
  // 5. APROBAR TRABAJADOR
  // ==========================================

  async aprobar(userId: number) {
    const p = await this.profiles.findOne({
      where: { usuario: { id: userId } },
      relations: { categoria: true }
    });

    if (!p) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    if (!p.experiencia || !p.zona || !p.categoria) {
      throw new ForbiddenException(
        'El trabajador debe completar su perfil antes de ser aprobado'
      );
    }

    p.aprobado = true;

    await this.profiles.save(p);

    return { ok: true, id: userId };
  }

  // ==========================================
  // 6. CONTAR TRABAJOS COMPLETADOS
  // ==========================================

  private async contarTrabajosCompletados(
    trabajadorId: number
  ): Promise<number> {
    return this.proposals
      .createQueryBuilder('p')
      .innerJoin('p.solicitud', 's')
      .innerJoin('p.trabajador', 't')
      .where('t.id = :trabajadorId', { trabajadorId })
      .andWhere('p.estado = :estadoPropuesta', {
        estadoPropuesta: EstadoPropuesta.ACEPTADA
      })
      .andWhere('s.estado = :estadoSolicitud', {
        estadoSolicitud: EstadoSolicitud.FINALIZADA
      })
      .getCount();
  }

  // ==========================================
  // 7. CALCULAR REPUTACION
  // ==========================================

  private async calcularReputacion(trabajadorId: number) {
    const resultado = await this.ratings
      .createQueryBuilder('c')
      .select('AVG(c.puntuacion)', 'promedio')
      .addSelect('COUNT(c.id)', 'total')
      .innerJoin('c.trabajador', 't')
      .where('t.id = :trabajadorId', { trabajadorId })
      .getRawOne();

    return {
      promedio: Number(resultado?.promedio || 0),
      total: Number(resultado?.total || 0)
    };
  }

  // ==========================================
  // 8. SISTEMA DE RECOMENDACION
  // ==========================================

  async recomendados(solicitudId: number, clienteId: number) {
    const solicitud = await this.requests.findOne({
      where: { id: solicitudId },
      relations: { cliente: true, categoria: true }
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (solicitud.cliente.id !== clienteId) {
      throw new ForbiddenException(
        'No puedes consultar recomendaciones de una solicitud ajena'
      );
    }

    // Solo trabajadores aprobados.
    const trabajadores = await this.profiles.find({
      where: { aprobado: true },
      relations: { usuario: true, categoria: true }
    });

    const resultados = await Promise.all(
      trabajadores.map(async trabajador => {
        const reputacion = await this.calcularReputacion(
          trabajador.usuario.id
        );

        const completados = await this.contarTrabajosCompletados(
          trabajador.usuario.id
        );

        // Reputación: máximo 40 puntos.
        const puntosReputacion =
          (reputacion.promedio / 5) * 40;

        // Trabajos completados: máximo 25 puntos.
        // Se alcanza el máximo con 10 trabajos.
        const puntosCompletados =
          Math.min(completados / 10, 1) * 25;

        // Categoría: máximo 20 puntos.
        const coincideCategoria =
          trabajador.categoria?.id === solicitud.categoria.id;

        const puntosCategoria =
          coincideCategoria ? 20 : 0;

        // Zona: máximo 15 puntos.
        const normalizar = (valor: string) =>
          valor.trim().toLocaleLowerCase();

        const coincideZona =
          normalizar(trabajador.zona) ===
          normalizar(solicitud.zona);

        const puntosZona =
          coincideZona ? 15 : 0;

        // Sumar puntuaciones.
        const puntuacionTotal = Number(
          (
            puntosReputacion +
            puntosCompletados +
            puntosCategoria +
            puntosZona
          ).toFixed(2)
        );

        return {
          id: trabajador.usuario.id,
          nombre: trabajador.usuario.nombre,
          categoria:
            trabajador.categoria?.nombre || 'Sin categoría',
          zona: trabajador.zona,
          disponibilidad: trabajador.disponibilidad,

          puntuacion: puntuacionTotal,

          criterios: {
            reputacion: {
              promedio: Number(reputacion.promedio.toFixed(2)),
              cantidadCalificaciones: reputacion.total,
              puntos: Number(puntosReputacion.toFixed(2))
            },

            trabajosCompletados: {
              cantidad: completados,
              puntos: Number(puntosCompletados.toFixed(2))
            },

            categoria: {
              compatible: coincideCategoria,
              puntos: puntosCategoria
            },

            zona: {
              compatible: coincideZona,
              puntos: puntosZona
            }
          }
        };
      })
    );

    // Ordenar desde la puntuación más alta.
    resultados.sort(
      (a, b) => b.puntuacion - a.puntuacion
    );

    return {
      solicitud: {
        id: solicitud.id,
        titulo: solicitud.titulo,
        categoria: solicitud.categoria.nombre,
        zona: solicitud.zona
      },

      criteriosUtilizados: {
        reputacion: '40 puntos',
        trabajosCompletados: '25 puntos',
        categoria: '20 puntos',
        zona: '15 puntos'
      },

      totalTrabajadores: resultados.length,
      recomendaciones: resultados
    };
  }
}

// ==========================================
// 9. CONTROLADOR DE TRABAJADORES
// ==========================================

@Controller('trabajadores')
export class TrabajadoresController {
  constructor(private service: TrabajadoresService) {}

  @Get()
  lista(@Req() req: any) {
    const url = new URL(req.url, 'http://local');

    const categoria = Number(
      url.searchParams.get('categoria') || 0
    );

    return this.service.lista(
      categoria || undefined,
      url.searchParams.get('zona') || undefined
    );
  }

  // Sistema de recomendación.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTE, Rol.EMPRESA)
  @Get('recomendados/:solicitudId')
  recomendados(
    @Req() req: any,
    @Param('solicitudId', ParseIntPipe) solicitudId: number
  ) {
    return this.service.recomendados(
      solicitudId,
      req.user.sub
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  @Get('mi-perfil')
  miPerfil(@Req() req: any) {
    return this.service.miPerfil(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.TRABAJADOR)
  @Patch('mi-perfil')
  actualizar(
    @Req() req: any,
    @Body() dto: PerfilDto
  ) {
    return this.service.actualizar(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @Get('pendientes')
  pendientes() {
    return this.service.pendientes();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @Patch(':id/aprobar')
  aprobar(@Param('id', ParseIntPipe) id: number) {
    return this.service.aprobar(id);
  }
}
