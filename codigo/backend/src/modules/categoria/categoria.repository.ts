import { Injectable } from '@nestjs/common';
import type { PrismaQueryContext } from '../../prisma/prisma.service';
import { PrismaService } from '../../prisma/prisma.service';

/** Ejecuta las consultas de persistencia para categorías y sus relaciones. */
@Injectable()
export class CategoriaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista las categorías en orden alfabético. */
  findAll(query_context: PrismaQueryContext = this.prisma.db) {
    return query_context.orm.public.Categoria.orderBy((categoria) =>
      categoria.nombre.asc(),
    ).all();
  }

  /** Busca una categoría por su identificador principal. */
  findById(
    id_categoria: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.Categoria.where({
      idCategoria: id_categoria,
    }).first();
  }

  /** Busca una categoría por su nombre exacto. */
  findByNombre(
    nombre_categoria: string,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.Categoria.where({
      nombre: nombre_categoria,
    }).first();
  }

  /** Crea una categoría con el nombre ya validado por el servicio. */
  createCategoria(
    nombre_categoria: string,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.Categoria.create({
      nombre: nombre_categoria,
    });
  }

  /** Elimina la categoría indicada. */
  deleteCategoria(
    id_categoria: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.Categoria.where({
      idCategoria: id_categoria,
    }).delete();
  }

  /** Comprueba que el usuario indicado tenga un perfil de reparador. */
  findPerfilReparador(
    id_reparador: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.PerfilTrabajador.where({
      idUsuario: id_reparador,
    }).first();
  }

  /** Comprueba que exista el trabajo indicado. */
  findTrabajo(
    id_trabajo: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.Trabajo.where({
      idTrabajo: id_trabajo,
    }).first();
  }

  /** Busca la asignación de una categoría a un reparador. */
  findCategoriaReparador(
    id_categoria: number,
    id_reparador: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.CategoriaReparador.where({
      idCategoria: id_categoria,
      idReparador: id_reparador,
    }).first();
  }

  /** Busca la asignación de una categoría a un trabajo. */
  findCategoriaTrabajo(
    id_categoria: number,
    id_trabajo: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.CategoriaTrabajo.where({
      idCategoria: id_categoria,
      idTrabajo: id_trabajo,
    }).first();
  }

  /** Asocia una categoría existente al perfil del reparador indicado. */
  asignarCategoriaReparador(
    id_categoria: number,
    id_reparador: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.CategoriaReparador.create({
      idCategoria: id_categoria,
      idReparador: id_reparador,
    });
  }

  /** Asocia una categoría existente al trabajo indicado. */
  asignarCategoriaTrabajo(
    id_categoria: number,
    id_trabajo: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.CategoriaTrabajo.create({
      idCategoria: id_categoria,
      idTrabajo: id_trabajo,
    });
  }

  /** Elimina la asignación entre una categoría y un reparador. */
  quitarCategoriaReparador(
    id_categoria: number,
    id_reparador: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.CategoriaReparador.where({
      idCategoria: id_categoria,
      idReparador: id_reparador,
    }).delete();
  }

  /** Elimina la asignación entre una categoría y un trabajo. */
  quitarCategoriaTrabajo(
    id_categoria: number,
    id_trabajo: number,
    query_context: PrismaQueryContext = this.prisma.db,
  ) {
    return query_context.orm.public.CategoriaTrabajo.where({
      idCategoria: id_categoria,
      idTrabajo: id_trabajo,
    }).delete();
  }
}
