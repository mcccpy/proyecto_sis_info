import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaQueryContext } from '../../prisma/prisma.service';
import type { CreatePerfilReparadorDto } from '../perfil-trabajador/dto/create-perfil-reparador.dto';
import { PerfilTrabajadorRepository } from '../perfil-trabajador/perfil-trabajador.repository';
import type { NuevoPerfilTrabajadorData } from '../perfil-trabajador/perfil-trabajador.repository';
import type { AgregarRolDto } from './dto/agregar-rol.dto';
import type { AsignarRevocarRolDto } from './dto/asignar-revocar-rol.dto';
import type { CambiarModoRolDto } from './dto/cambiar-modo-rol.dto';
import type { CrearRolAdminDto } from './dto/crear-rol-admin.dto';
import type { DocumentoDto } from './dto/documento.dto';
import type { RegistroUsuarioDto } from './dto/registro-usuario.dto';
import type { RolUsuario } from './rol-usuario.type';
import { UsuarioRepository } from './usuario.repository';
import type { DocumentoUsuarioData } from './usuario.repository';
import { radiosCumplenJerarquia } from '../zona/zona-radios.util';
import type {
  DictamenDocumentoDto,
  DictamenReparadorDto,
} from './dto/dictamen-admin.dto';
import type {
  FiltroDocumentosClientesDto,
  FiltroModeracionReparadoresDto,
} from './dto/filtros-admin.dto';

type UsuarioConRelaciones = NonNullable<
  Awaited<ReturnType<UsuarioRepository['findById']>>
>;
type PerfilTrabajadorCompleto = NonNullable<
  Awaited<ReturnType<PerfilTrabajadorRepository['findByUsuarioId']>>
>;
type PerfilReparadorAdmin = NonNullable<
  Awaited<ReturnType<UsuarioRepository['findDetalleReparadorAdmin']>>
>;

/** Coordina validaciones y operaciones de cuenta sin exponer el hash de contraseña. */
@Injectable()
export class UsuarioService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly perfilTrabajadorRepository: PerfilTrabajadorRepository,
  ) {}

  /** Lista perfiles reparadores y ordena primero los que esperan revisión. */
  async listarSolicitudesReparadores(
    id_admin: number,
    filtros: FiltroModeracionReparadoresDto,
  ) {
    await this.validarRolAdmin(id_admin);

    const solicitudes = await this.usuarioRepository.findSolicitudesReparadores(
      this.quitarIdAdmin(filtros),
    );

    return [...solicitudes].sort((perfil_a, perfil_b) => {
      const prioridad_estado =
        this.obtenerPrioridadEstado(perfil_a.estadoAprobacion) -
        this.obtenerPrioridadEstado(perfil_b.estadoAprobacion);

      if (prioridad_estado !== 0) {
        return prioridad_estado;
      }

      return (
        this.obtenerFechaMasReciente(perfil_b) -
        this.obtenerFechaMasReciente(perfil_a)
      );
    });
  }

  /** Obtiene el detalle de un reparador después de comprobar el acceso administrativo. */
  async obtenerDetalleReparadorAdmin(id_admin: number, id_reparador: number) {
    await this.validarRolAdmin(id_admin);

    const perfil_reparador =
      await this.usuarioRepository.findDetalleReparadorAdmin(id_reparador);

    if (!perfil_reparador) {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    return perfil_reparador;
  }

  /** Dictamina un documento de usuario y devuelve su estado actualizado. */
  async revisarDocumentoUsuario(
    id_documento: number,
    dictamen: DictamenDocumentoDto,
  ) {
    await this.validarRolAdmin(dictamen.id_admin);

    const documento_existente =
      await this.usuarioRepository.findDocumentoUsuarioById(id_documento);

    if (!documento_existente) {
      throw new NotFoundException('Documento no encontrado');
    }

    const documento_actualizado =
      await this.usuarioRepository.actualizarEstadoDocumentoUsuario(
        id_documento,
        dictamen.estado,
      );

    if (!documento_actualizado) {
      throw new NotFoundException('Documento no encontrado');
    }

    return documento_actualizado;
  }

  /** Dictamina el perfil de reparador y evita aprobarlo con documentos rechazados. */
  async dictaminarPerfilReparador(
    id_reparador: number,
    dictamen: DictamenReparadorDto,
  ) {
    await this.validarRolAdmin(dictamen.id_admin);

    const perfil_existente =
      await this.usuarioRepository.findDetalleReparadorAdmin(id_reparador);

    if (!perfil_existente) {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    if (!perfil_existente.usuario) {
      throw new NotFoundException('Usuario del reparador no encontrado');
    }

    const tiene_documentos_rechazados =
      perfil_existente.usuario.documentoUsuarios.some(
        (documento) => documento.estado === 'rechazado',
      );

    if (
      dictamen.estado_aprobacion === 'aprobado' &&
      tiene_documentos_rechazados
    ) {
      throw new BadRequestException(
        'No se puede aprobar el perfil mientras tenga documentos rechazados',
      );
    }

    const perfil_actualizado =
      await this.usuarioRepository.actualizarEstadoAprobacionReparador(
        id_reparador,
        dictamen.estado_aprobacion,
      );

    if (!perfil_actualizado) {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    return perfil_actualizado;
  }

  /** Lista documentos de clientes después de validar el rol administrativo. */
  async listarDocumentosClientes(
    id_admin: number,
    filtros: FiltroDocumentosClientesDto,
  ) {
    await this.validarRolAdmin(id_admin);

    return this.usuarioRepository.findDocumentosClientes(
      this.quitarIdAdmin(filtros),
    );
  }

  /** Lista los roles existentes junto al total de usuarios vinculados. */
  async listarRolesAdmin(id_admin: number) {
    await this.validarRolAdmin(id_admin);

    const roles = await this.usuarioRepository.findAllRoles();

    return roles.map(({ usuarioRols, ...rol }) => ({
      ...rol,
      cantidadUsuarios: usuarioRols.length,
    }));
  }

  /** Crea un rol personalizado después de normalizar y validar su nombre. */
  async crearRolAdmin(datos_rol: CrearRolAdminDto) {
    await this.validarRolAdmin(datos_rol.id_admin);

    const nombre_rol = datos_rol.nombre.trim().toLowerCase();
    if (!nombre_rol) {
      throw new BadRequestException('El nombre del rol es obligatorio');
    }

    const rol_existente =
      await this.usuarioRepository.findRolByNombre(nombre_rol);
    if (rol_existente) {
      throw new ConflictException('El rol ya existe');
    }

    return this.usuarioRepository.createRol(nombre_rol);
  }

  /** Elimina roles personalizados y protege los tres roles base del sistema. */
  async eliminarRolAdmin(id_admin: number, id_rol: number) {
    await this.validarRolAdmin(id_admin);

    const rol_existente = await this.usuarioRepository.findRolById(id_rol);
    if (!rol_existente) {
      throw new NotFoundException('Rol no encontrado');
    }

    const roles_base = ['administrador', 'cliente', 'reparador'];
    if (roles_base.includes(rol_existente.nombre.trim().toLowerCase())) {
      throw new BadRequestException(
        'No se pueden eliminar los roles base del sistema',
      );
    }

    const rol_eliminado = await this.usuarioRepository.deleteRol(id_rol);
    if (!rol_eliminado) {
      throw new NotFoundException('Rol no encontrado');
    }

    return rol_eliminado;
  }

  /** Asigna manualmente un rol a una cuenta sin duplicar la relación. */
  async asignarRolManualAdmin(datos_asignacion: AsignarRevocarRolDto) {
    await this.validarRolAdmin(datos_asignacion.id_admin);

    const usuario_existente = await this.usuarioRepository.findIdUsuario(
      datos_asignacion.id_usuario,
    );
    if (!usuario_existente) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const rol_existente = await this.usuarioRepository.findRolById(
      datos_asignacion.id_rol,
    );
    if (!rol_existente) {
      throw new NotFoundException('Rol no encontrado');
    }

    const asignacion_existente = await this.usuarioRepository.findUsuarioRol(
      datos_asignacion.id_usuario,
      datos_asignacion.id_rol,
    );
    if (asignacion_existente) {
      throw new ConflictException('El usuario ya tiene asignado ese rol');
    }

    await this.usuarioRepository.asignarRol(
      datos_asignacion.id_usuario,
      datos_asignacion.id_rol,
    );

    return {
      idUsuario: datos_asignacion.id_usuario,
      idRol: datos_asignacion.id_rol,
    };
  }

  /** Revoca una asignación de rol y evita que el administrador se bloquee a sí mismo. */
  async revocarRolManualAdmin(datos_asignacion: AsignarRevocarRolDto) {
    await this.validarRolAdmin(datos_asignacion.id_admin);

    const asignacion_existente = await this.usuarioRepository.findUsuarioRol(
      datos_asignacion.id_usuario,
      datos_asignacion.id_rol,
    );
    if (!asignacion_existente) {
      throw new NotFoundException('La asignación de rol no existe');
    }

    const rol_existente = await this.usuarioRepository.findRolById(
      datos_asignacion.id_rol,
    );
    if (!rol_existente) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (
      datos_asignacion.id_admin === datos_asignacion.id_usuario &&
      rol_existente.nombre.trim().toLowerCase() === 'administrador'
    ) {
      throw new BadRequestException(
        'No puedes revocar tu propio rol de administrador',
      );
    }

    return this.usuarioRepository.deleteUsuarioRol(
      datos_asignacion.id_usuario,
      datos_asignacion.id_rol,
    );
  }

  /** Registra la cuenta, el rol inicial y las relaciones que requiere ese rol. */
  async registrarUsuario(datos_registro: RegistroUsuarioDto) {
    const usuario_existente =
      await this.usuarioRepository.findByEmailOrTelefono(
        datos_registro.email,
        datos_registro.telefono,
      );

    if (usuario_existente) {
      throw new ConflictException('El correo o teléfono ya está registrado');
    }

    const datos_reparador =
      datos_registro.rol_inicial === 'reparador'
        ? this.validar_requisitos_reparador(
            datos_registro.perfil_reparador,
            datos_registro.documentos,
          )
        : null;
    const rol_inicial = await this.obtener_rol(datos_registro.rol_inicial);
    const hash_password = this.crear_hash_password(datos_registro.password);

    return this.usuarioRepository.ejecutarEnTransaccion(
      async (query_context) => {
        const usuario_creado = await this.usuarioRepository.createUsuarioBase(
          {
            nombre: datos_registro.nombre,
            email: datos_registro.email,
            telefono: datos_registro.telefono,
            passwordHash: hash_password,
          },
          query_context,
        );

        await this.usuarioRepository.asignarRol(
          usuario_creado.idUsuario,
          rol_inicial.idRol,
          query_context,
        );

        if (datos_reparador) {
          await this.perfilTrabajadorRepository.createPerfilCompleto(
            usuario_creado.idUsuario,
            this.mapear_datos_perfil(datos_reparador.perfil),
            query_context,
          );
        }

        const documentos_para_guardar = datos_reparador
          ? datos_reparador.documentos
          : (datos_registro.documentos ?? []);

        await this.usuarioRepository.crearDocumentos(
          usuario_creado.idUsuario,
          this.mapear_documentos(documentos_para_guardar),
          query_context,
        );

        return this.obtener_respuesta_completa(
          usuario_creado.idUsuario,
          query_context,
        );
      },
    );
  }

  /** Obtiene la información pública de una cuenta y su perfil profesional. */
  /** Autentica un usuario por correo y contraseña y devuelve su información completa. */
  async loginUsuario(email: string, password: string) {
    const correoLimpio = (email ?? '').trim().toLowerCase();
    if (!correoLimpio || !password) {
      throw new UnauthorizedException('Correo y contraseña requeridos');
    }

    const usuario = await this.usuarioRepository.findByEmailOrTelefono(
      correoLimpio,
      '',
    );

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const registroUsuario = usuario as unknown as Record<string, unknown>;
    const hashGuardado = String(
      registroUsuario.passwordHash ?? registroUsuario.password_hash ?? '',
    );

    const partes = hashGuardado.split('$');
    if (partes.length !== 3 || partes[0] !== 'scrypt') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const [, salHex, hashHex] = partes;
    const hashDerivado = scryptSync(password, salHex, 64);
    const hashEsperado = Buffer.from(hashHex, 'hex');

    if (
      hashDerivado.length !== hashEsperado.length ||
      !timingSafeEqual(hashDerivado, hashEsperado)
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const idUsuario = Number(
      registroUsuario.idUsuario ?? registroUsuario.id_usuario ?? 0,
    );
    return this.obtener_respuesta_completa(idUsuario);
  }

  async obtenerUsuario(id_usuario: number) {
    return this.obtener_respuesta_completa(id_usuario);
  }

  /** Agrega un rol nuevo sin quitar los roles que ya pertenecen a la cuenta. */
  async agregarRol(id_usuario: number, datos_nuevo_rol: AgregarRolDto) {
    const usuario = await this.usuarioRepository.findById(id_usuario);

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const roles_actuales = usuario.usuarioRols.map(
      (rol_asignado) => rol_asignado.rol.nombre,
    );

    if (
      roles_actuales.some(
        (rol_actual) => rol_actual === datos_nuevo_rol.nuevo_rol,
      )
    ) {
      throw new ConflictException('El usuario ya tiene asignado este rol');
    }

    const datos_reparador =
      datos_nuevo_rol.nuevo_rol === 'reparador'
        ? this.validar_requisitos_reparador(
            datos_nuevo_rol.perfil_reparador,
            datos_nuevo_rol.documentos,
          )
        : null;
    const rol_agregado = await this.obtener_rol(datos_nuevo_rol.nuevo_rol);

    return this.usuarioRepository.ejecutarEnTransaccion(
      async (query_context) => {
        await this.usuarioRepository.asignarRol(
          id_usuario,
          rol_agregado.idRol,
          query_context,
        );

        if (datos_reparador) {
          await this.perfilTrabajadorRepository.createPerfilCompleto(
            id_usuario,
            this.mapear_datos_perfil(datos_reparador.perfil),
            query_context,
          );

          await this.usuarioRepository.crearDocumentos(
            id_usuario,
            this.mapear_documentos(datos_reparador.documentos),
            query_context,
          );
        }

        return this.obtener_respuesta_completa(id_usuario, query_context);
      },
    );
  }

  /** Valida el rol activo solicitado y devuelve el estado del perfil si aplica. */
  async cambiarModoRol(
    id_usuario: number,
    datos_cambio_rol: CambiarModoRolDto,
  ) {
    const usuario = await this.usuarioRepository.findById(id_usuario);

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const roles_disponibles = usuario.usuarioRols.map(
      (rol_asignado) => rol_asignado.rol.nombre,
    );

    if (
      !roles_disponibles.some(
        (rol_disponible) => rol_disponible === datos_cambio_rol.rol_objetivo,
      )
    ) {
      throw new ForbiddenException(
        'No tienes habilitado este rol. Agrégalo primero desde tu perfil',
      );
    }

    const perfil_trabajador =
      datos_cambio_rol.rol_objetivo === 'reparador'
        ? await this.perfilTrabajadorRepository.findByUsuarioId(id_usuario)
        : null;

    if (datos_cambio_rol.rol_objetivo === 'reparador' && !perfil_trabajador) {
      throw new NotFoundException('Perfil de reparador no encontrado');
    }

    return {
      id_usuario,
      rol_activo: datos_cambio_rol.rol_objetivo,
      roles_disponibles,
      perfil_trabajador,
    };
  }

  /** Ensambla los datos públicos y traduce cuentas inexistentes a HTTP 404. */
  private async obtener_respuesta_completa(
    id_usuario: number,
    query_context?: PrismaQueryContext,
  ) {
    const usuario_encontrado = await this.usuarioRepository.findById(
      id_usuario,
      query_context,
    );

    if (!usuario_encontrado) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const perfil_trabajador =
      await this.perfilTrabajadorRepository.findByUsuarioId(
        id_usuario,
        query_context,
      );

    return this.crear_respuesta_usuario(usuario_encontrado, perfil_trabajador);
  }

  /** Construye la respuesta sin incluir el hash privado de la contraseña. */
  private crear_respuesta_usuario(
    usuario: UsuarioConRelaciones,
    perfil_trabajador: PerfilTrabajadorCompleto | null,
  ) {
    return {
      id_usuario: usuario.idUsuario,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      fecha_registro: usuario.fechaRegistro,
      roles_disponibles: usuario.usuarioRols.map(
        (rol_asignado) => rol_asignado.rol.nombre,
      ),
      documentos: usuario.documentoUsuarios,
      perfil_trabajador,
    };
  }

  /** Busca un rol configurado y falla explícitamente si no existe en la base. */
  private async obtener_rol(nombre_rol: RolUsuario) {
    const rol = await this.usuarioRepository.findRolByNombre(nombre_rol);

    if (!rol) {
      throw new NotFoundException(`El rol "${nombre_rol}" no está configurado`);
    }

    return rol;
  }

  /** Comprueba que el alta de un reparador incluya todo lo exigido por el plan. */
  private validar_requisitos_reparador(
    perfil_reparador: CreatePerfilReparadorDto | undefined,
    documentos_del_reparador: DocumentoDto[] | undefined,
  ): {
    perfil: CreatePerfilReparadorDto;
    documentos: DocumentoDto[];
  } {
    if (
      !perfil_reparador ||
      perfil_reparador.experiencia_anios === undefined ||
      perfil_reparador.experiencia_anios === null ||
      !perfil_reparador.categorias?.length ||
      !perfil_reparador.zonas?.length ||
      perfil_reparador.zonas.length > 3 ||
      !perfil_reparador.disponibilidades?.length ||
      !documentos_del_reparador?.length
    ) {
      throw new BadRequestException(
        'Un reparador debe completar su perfil profesional y subir sus documentos obligatorios',
      );
    }

    if (
      perfil_reparador.zonas.some(
        (zona_de_cobertura) => !radiosCumplenJerarquia(zona_de_cobertura),
      )
    ) {
      throw new BadRequestException(
        'Los radios deben cumplir: radio_good < radio_medio < radio_bad',
      );
    }

    return {
      perfil: perfil_reparador,
      documentos: documentos_del_reparador,
    };
  }

  /** Traduce el DTO al formato interno que persiste el repository. */
  private mapear_datos_perfil(
    perfil_reparador: CreatePerfilReparadorDto,
  ): NuevoPerfilTrabajadorData {
    return {
      experienciaAnios: perfil_reparador.experiencia_anios,
      categorias: perfil_reparador.categorias,
      zonas: perfil_reparador.zonas.map((zona_de_cobertura) => ({
        etiqueta: zona_de_cobertura.etiqueta,
        latitud: zona_de_cobertura.latitud,
        longitud: zona_de_cobertura.longitud,
        radioGood: zona_de_cobertura.radio_good,
        radioMedio: zona_de_cobertura.radio_medio,
        radioBad: zona_de_cobertura.radio_bad,
      })),
      disponibilidades: perfil_reparador.disponibilidades.map(
        (disponibilidad) => ({
          diaSemana: disponibilidad.dia_semana,
          horaInicio: disponibilidad.hora_inicio,
          horaFin: disponibilidad.hora_fin,
        }),
      ),
    };
  }

  /** Reduce los campos de los documentos al contrato persistido por Prisma. */
  private mapear_documentos(
    documentos_del_usuario: readonly DocumentoDto[],
  ): DocumentoUsuarioData[] {
    return documentos_del_usuario.map((documento) => ({
      tipoDocumento: documento.tipo_documento,
      ubucacionArchivo: documento.ubucacion_archivo,
    }));
  }

  /** Crea un hash con sal aleatoria mediante las funciones nativas de Node. */
  private crear_hash_password(contrasena: string): string {
    const sal_aleatoria = randomBytes(16).toString('hex');
    const hash_derivado = scryptSync(contrasena, sal_aleatoria, 64).toString(
      'hex',
    );

    return `scrypt$${sal_aleatoria}$${hash_derivado}`;
  }

  /** Rechaza la operación cuando la cuenta indicada no es administrador. */
  private async validarRolAdmin(id_admin: number): Promise<void> {
    if (
      !id_admin ||
      !(await this.usuarioRepository.esAdministrador(id_admin))
    ) {
      throw new ForbiddenException(
        'Acceso denegado: se requiere rol administrador',
      );
    }
  }

  /** Elimina el identificador de administrador antes de enviar filtros al repositorio. */
  private quitarIdAdmin<
    Filtros extends
      FiltroModeracionReparadoresDto | FiltroDocumentosClientesDto,
  >(filtros: Filtros): Omit<Filtros, 'id_admin'> {
    const { id_admin: _id_admin, ...filtros_sin_admin } = filtros;
    return filtros_sin_admin;
  }

  /** Asigna un orden estable a los estados de moderación. */
  private obtenerPrioridadEstado(estado_aprobacion: string): number {
    const prioridades_por_estado: Record<string, number> = {
      pendiente: 1,
      aprobado: 2,
      rechazado: 3,
    };

    return prioridades_por_estado[estado_aprobacion] ?? 4;
  }

  /** Obtiene la fecha de documento más reciente o la fecha de registro como respaldo. */
  private obtenerFechaMasReciente(perfil: PerfilReparadorAdmin): number {
    if (!perfil.usuario) {
      return 0;
    }

    const fecha_mas_reciente_documento =
      perfil.usuario.documentoUsuarios.reduce(
        (fecha_mas_reciente, documento) =>
          Math.max(fecha_mas_reciente, documento.fechaSubida.getTime()),
        perfil.usuario.fechaRegistro.getTime(),
      );

    return fecha_mas_reciente_documento;
  }
}


