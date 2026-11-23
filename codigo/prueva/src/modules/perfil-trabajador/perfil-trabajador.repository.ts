import { Injectable } from '@nestjs/common';
import type { PrismaQueryContext } from '../../prisma/prisma.service';
import { PrismaService } from '../../prisma/prisma.service';

/** Estructura interna para crear el perfil y todas sus relaciones. */
export interface NuevoPerfilTrabajadorData {
  experienciaAnios: number;
  categorias: readonly number[];
  zonas: readonly {
    etiqueta: string;
    latitud: number;
    longitud: number;
    radioGood: number;
    radioMedio: number;
    radioBad: number;
  }[];
  disponibilidades: readonly {
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
  }[];
}

/** Filtros opcionales para localizar técnicos habilitados. */
export interface FiltrosBusquedaReparadores {
  id_categoria?: number;
  nombre?: string;
}

/** Administra el perfil profesional y sus relaciones de categorías, zonas y horarios. */
@Injectable()
export class PerfilTrabajadorRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista perfiles con sus datos de usuario y relaciones profesionales. */
  findAll() {
    return this.prisma.db.orm.public.PerfilTrabajador.include('usuario')
      .include('categoriaReparadors', (categorias_del_reparador) =>
        categorias_del_reparador.include('categoria'),
      )
      .include('zonaReparadors')
      .include('disponibilidads')
      .all();
  }

  /** Busca un perfil con sus calificaciones recibidas y relaciones profesionales. */
  findByUsuarioIdWithDetails(id_usuario: number) {
    return this.prisma.db.orm.public.PerfilTrabajador.include(
      'categoriaReparadors',
      (categorias_del_reparador) =>
        categorias_del_reparador.include('categoria'),
    )
      .include('zonaReparadors')
      .include('disponibilidads')
      .include('usuario', (usuario) =>
        usuario.include('calificacions', (calificaciones) =>
          calificaciones.include('servicio'),
        ),
      )
      .where({ idUsuario: id_usuario })
      .first();
  }

  /** Actualiza la experiencia profesional del perfil indicado. */
  async updateExperienciaAnios(id_usuario: number, experiencia_anios: number) {
    const perfil_actualizado =
      await this.prisma.db.orm.public.PerfilTrabajador.where({
        idUsuario: id_usuario,
      }).update({ experienciaAnios: experiencia_anios });

    if (!perfil_actualizado) {
      return null;
    }

    return this.findByUsuarioIdWithDetails(id_usuario);
  }

  /** Encuentra perfiles aprobados que coinciden con la categoría y el nombre recibidos. */
  async findReparadoresAprobadosParaBusqueda(
    filtros: FiltrosBusquedaReparadores,
  ) {
    const ids_usuarios_por_nombre = filtros.nombre?.trim()
      ? await this.buscarIdsUsuariosPorNombre(filtros.nombre)
      : null;

    if (
      ids_usuarios_por_nombre !== null &&
      ids_usuarios_por_nombre.length === 0
    ) {
      return [];
    }

    const perfiles_aprobados = this.prisma.db.orm.public.PerfilTrabajador.where(
      {
        estadoAprobacion: 'aprobado',
      },
    );
    const id_categoria = filtros.id_categoria;
    const perfiles_por_categoria =
      id_categoria === undefined
        ? perfiles_aprobados
        : perfiles_aprobados.where((perfil) =>
            perfil.categoriaReparadors.some((categoria) =>
              categoria.idCategoria.in([id_categoria]),
            ),
          );
    const perfiles_filtrados_por_nombre = ids_usuarios_por_nombre
      ? perfiles_por_categoria.where((perfil) =>
          perfil.idUsuario.in(ids_usuarios_por_nombre),
        )
      : perfiles_por_categoria;

    return perfiles_filtrados_por_nombre
      .include('usuario', (usuario) =>
        usuario.select('idUsuario', 'nombre', 'telefono'),
      )
      .include('categoriaReparadors', (categorias_del_reparador) =>
        categorias_del_reparador.include('categoria'),
      )
      .include('zonaReparadors')
      .all();
  }

  /** Obtiene el perfil y todas sus categorías, zonas y disponibilidades. */
  findByUsuarioId(
    id_usuario: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.PerfilTrabajador.include(
      'categoriaReparadors',
      (categorias_del_reparador) =>
        categorias_del_reparador.include('categoria'),
    )
      .include('zonaReparadors')
      .include('disponibilidads')
      .where({ idUsuario: id_usuario })
      .first();
  }

  /** Crea el perfil y sus relaciones de forma transaccional. */
  createPerfilCompleto(
    id_usuario: number,
    datos_perfil: NuevoPerfilTrabajadorData,
    query_context?: PrismaQueryContext,
  ) {
    if (query_context) {
      return this.crear_perfil_y_relaciones(
        id_usuario,
        datos_perfil,
        query_context,
      );
    }

    return this.prisma.db.transaction((transaccion) =>
      this.crear_perfil_y_relaciones(id_usuario, datos_perfil, transaccion),
    );
  }

  /** Inserta cada relación y vuelve a leer el perfil completo en el mismo contexto. */
  private async crear_perfil_y_relaciones(
    id_usuario: number,
    datos_perfil: NuevoPerfilTrabajadorData,
    query_context: PrismaQueryContext,
  ) {
    await query_context.orm.public.PerfilTrabajador.create({
      idUsuario: id_usuario,
      experienciaAnios: datos_perfil.experienciaAnios,
      estadoAprobacion: 'pendiente',
    });

    if (datos_perfil.categorias.length > 0) {
      await query_context.orm.public.CategoriaReparador.createAll(
        datos_perfil.categorias.map((id_categoria) => ({
          idCategoria: id_categoria,
          idReparador: id_usuario,
        })),
      );
    }

    if (datos_perfil.zonas.length > 0) {
      await query_context.orm.public.ZonaReparador.createAll(
        datos_perfil.zonas.map((zona_de_cobertura) => ({
          etiqueta: zona_de_cobertura.etiqueta,
          latitud: zona_de_cobertura.latitud.toString(),
          longitud: zona_de_cobertura.longitud.toString(),
          radioGood: zona_de_cobertura.radioGood,
          radioMedio: zona_de_cobertura.radioMedio,
          radioBad: zona_de_cobertura.radioBad,
          idReparador: id_usuario,
        })),
      );
    }

    if (datos_perfil.disponibilidades.length > 0) {
      await query_context.orm.public.Disponibilidad.createAll(
        datos_perfil.disponibilidades.map((disponibilidad) => ({
          idReparador: id_usuario,
          diaSemana: disponibilidad.diaSemana,
          horaInicio: disponibilidad.horaInicio,
          horaFin: disponibilidad.horaFin,
        })),
      );
    }

    const perfil_trabajador = await this.findByUsuarioId(
      id_usuario,
      query_context,
    );

    if (!perfil_trabajador) {
      throw new Error(
        `No se pudo recuperar el perfil recien creado para el usuario ${id_usuario}.`,
      );
    }

    return perfil_trabajador;
  }

  /** Busca identificadores de usuarios por coincidencia parcial de nombre. */
  private async buscarIdsUsuariosPorNombre(nombre: string): Promise<number[]> {
    const patron_nombre = `%${nombre.trim()}%`;
    const usuarios_coincidentes = await this.prisma.db.orm.public.Usuario.where(
      (usuario) => usuario.nombre.ilike(patron_nombre),
    )
      .select('idUsuario')
      .all();

    return usuarios_coincidentes.map((usuario) => usuario.idUsuario);
  }
}
