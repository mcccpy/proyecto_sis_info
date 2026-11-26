import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoriaRepository } from './categoria.repository';
import type { CrearCategoriaAdminDto } from './dto/crear-categoria-admin.dto';
import type { CategoriaReparadorAdminDto } from './dto/categoria-reparador-admin.dto';
import type { CategoriaTrabajoAdminDto } from './dto/categoria-trabajo-admin.dto';
import { UsuarioRepository } from '../usuario/usuario.repository';

/** Coordina validaciones administrativas y operaciones de categorías. */
@Injectable()
export class CategoriaService {
  constructor(
    private readonly categoriaRepository: CategoriaRepository,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  /** Devuelve todas las categorías para su consulta en el sistema. */
  listarCategorias() {
    return this.categoriaRepository.findAll();
  }

  /** Mantiene el nombre de consulta usado por el controlador general. */
  listarTodos() {
    return this.listarCategorias();
  }

  /** Crea una categoría después de validar al administrador y el nombre único. */
  async crearCategoriaAdmin(datos_categoria: CrearCategoriaAdminDto) {
    await this.validarRolAdmin(datos_categoria.id_admin);

    const nombre_categoria = datos_categoria.nombre.trim();
    if (!nombre_categoria) {
      throw new BadRequestException('El nombre de la categoría es obligatorio');
    }

    const categoria_existente =
      await this.categoriaRepository.findByNombre(nombre_categoria);
    if (categoria_existente) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }

    return this.categoriaRepository.createCategoria(nombre_categoria);
  }

  /** Elimina una categoría existente; sus asociaciones se eliminan por cascada. */
  async eliminarCategoriaAdmin(id_admin: number, id_categoria: number) {
    await this.validarRolAdmin(id_admin);
    await this.validarCategoriaExistente(id_categoria);

    const categoria_eliminada =
      await this.categoriaRepository.deleteCategoria(id_categoria);
    if (!categoria_eliminada) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return categoria_eliminada;
  }

  /** Asocia una categoría existente con un perfil de reparador existente. */
  async asignarCategoriaAReparador(
    datos_asignacion: CategoriaReparadorAdminDto,
  ) {
    await this.validarRolAdmin(datos_asignacion.id_admin);
    await this.validarCategoriaExistente(datos_asignacion.id_categoria);

    const perfil_reparador = await this.categoriaRepository.findPerfilReparador(
      datos_asignacion.id_reparador,
    );
    if (!perfil_reparador) {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    const asignacion_existente =
      await this.categoriaRepository.findCategoriaReparador(
        datos_asignacion.id_categoria,
        datos_asignacion.id_reparador,
      );
    if (asignacion_existente) {
      throw new ConflictException(
        'La categoría ya está asignada a este reparador',
      );
    }

    return this.categoriaRepository.asignarCategoriaReparador(
      datos_asignacion.id_categoria,
      datos_asignacion.id_reparador,
    );
  }

  /** Retira una categoría que ya estaba asignada al reparador indicado. */
  async quitarCategoriaAReparador(
    datos_asignacion: CategoriaReparadorAdminDto,
  ) {
    await this.validarRolAdmin(datos_asignacion.id_admin);
    await this.validarCategoriaExistente(datos_asignacion.id_categoria);

    const perfil_reparador = await this.categoriaRepository.findPerfilReparador(
      datos_asignacion.id_reparador,
    );
    if (!perfil_reparador) {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    const asignacion_existente =
      await this.categoriaRepository.findCategoriaReparador(
        datos_asignacion.id_categoria,
        datos_asignacion.id_reparador,
      );
    if (!asignacion_existente) {
      throw new NotFoundException(
        'La categoría no está asignada a este reparador',
      );
    }

    return this.categoriaRepository.quitarCategoriaReparador(
      datos_asignacion.id_categoria,
      datos_asignacion.id_reparador,
    );
  }

  /** Asocia una categoría existente con un trabajo existente. */
  async asignarCategoriaATrabajo(datos_asignacion: CategoriaTrabajoAdminDto) {
    await this.validarRolAdmin(datos_asignacion.id_admin);
    await this.validarCategoriaExistente(datos_asignacion.id_categoria);

    const trabajo_existente = await this.categoriaRepository.findTrabajo(
      datos_asignacion.id_trabajo,
    );
    if (!trabajo_existente) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    const asignacion_existente =
      await this.categoriaRepository.findCategoriaTrabajo(
        datos_asignacion.id_categoria,
        datos_asignacion.id_trabajo,
      );
    if (asignacion_existente) {
      throw new ConflictException(
        'La categoría ya está asignada a este trabajo',
      );
    }

    return this.categoriaRepository.asignarCategoriaTrabajo(
      datos_asignacion.id_categoria,
      datos_asignacion.id_trabajo,
    );
  }

  /** Retira una categoría que ya estaba asignada al trabajo indicado. */
  async quitarCategoriaATrabajo(datos_asignacion: CategoriaTrabajoAdminDto) {
    await this.validarRolAdmin(datos_asignacion.id_admin);
    await this.validarCategoriaExistente(datos_asignacion.id_categoria);

    const trabajo_existente = await this.categoriaRepository.findTrabajo(
      datos_asignacion.id_trabajo,
    );
    if (!trabajo_existente) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    const asignacion_existente =
      await this.categoriaRepository.findCategoriaTrabajo(
        datos_asignacion.id_categoria,
        datos_asignacion.id_trabajo,
      );
    if (!asignacion_existente) {
      throw new NotFoundException(
        'La categoría no está asignada a este trabajo',
      );
    }

    return this.categoriaRepository.quitarCategoriaTrabajo(
      datos_asignacion.id_categoria,
      datos_asignacion.id_trabajo,
    );
  }

  /** Busca una categoría y notifica cuando no existe. */
  async obtenerPorId(id_categoria: number) {
    const categoria = await this.categoriaRepository.findById(id_categoria);

    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return categoria;
  }

  /** Rechaza las operaciones administrativas de cuentas sin el rol necesario. */
  private async validarRolAdmin(id_admin: number): Promise<void> {
    if (!(await this.usuarioRepository.esAdministrador(id_admin))) {
      throw new ForbiddenException(
        'Acceso denegado: se requiere rol administrador',
      );
    }
  }

  /** Confirma que la categoría exista antes de consultar o cambiar asociaciones. */
  private async validarCategoriaExistente(id_categoria: number): Promise<void> {
    const categoria_existente =
      await this.categoriaRepository.findById(id_categoria);
    if (!categoria_existente) {
      throw new NotFoundException('Categoría no encontrada');
    }
  }
}
