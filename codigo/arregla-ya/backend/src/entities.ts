
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    JoinColumn,
    Unique,
    Relation
} from 'typeorm';


// ==========================================
// 1. TIPOS DE USUARIO
// ==========================================

export enum Rol {
    CLIENTE = 'CLIENTE',
    EMPRESA = 'EMPRESA',
    TRABAJADOR = 'TRABAJADOR',
    ADMIN = 'ADMIN'
}


// ==========================================
// 2. ESTADOS DE SOLICITUDES
// ==========================================

export enum EstadoSolicitud {
    REVISION = 'EN_REVISION',
    ACTIVA = 'ACTIVA',
    ASIGNADA = 'ASIGNADA',
    FINALIZADA = 'FINALIZADA',
    CANCELADA = 'CANCELADA',
    SUSPENDIDA = 'SUSPENDIDA'
}


// ==========================================
// 3. ESTADOS DE PROPUESTAS
// ==========================================

export enum EstadoPropuesta {
    PENDIENTE = 'PENDIENTE',
    ACEPTADA = 'ACEPTADA',
    RECHAZADA = 'RECHAZADA'
}


// ==========================================
// 4. CLASE USUARIO
// ==========================================

@Entity('usuarios')
export class Usuario {

    // Identificador del usuario
    @PrimaryGeneratedColumn()
    id!: number;

    // Nombre completo
    @Column({ length: 120 })
    nombre!: string;

    // Correo electronico unico
    @Index({ unique: true })
    @Column({ length: 180 })
    email!: string;

    // Contraseña encriptada
    @Column({
        name: 'password_hash',
        select: false,
        length: 255
    })
    passwordHash!: string;

    // Tipo de usuario
    @Column({
        type: 'enum',
        enum: Rol,
        default: Rol.CLIENTE
    })
    rol!: Rol;

    // Fecha de registro
    @CreateDateColumn({ type: 'timestamptz' })
    creadoEn!: Date;

    // Relacion con el perfil del trabajador
    @OneToOne(
        () => PerfilTrabajador,
        perfil => perfil.usuario
    )
    perfil?: Relation<PerfilTrabajador>;

    // Relacion con las solicitudes publicadas
    @OneToMany(
        () => Solicitud,
        solicitud => solicitud.cliente
    )
    solicitudes?: Relation<Solicitud[]>;

}


// ==========================================
// 5. CLASE CATEGORIA
// ==========================================

@Entity('categorias')
export class Categoria {

    // Identificador de la categoria
    @PrimaryGeneratedColumn()
    id!: number;

    // Nombre de la especialidad
    @Column({
        unique: true,
        length: 80
    })
    nombre!: string;

}


// ==========================================
// 6. CLASE PERFIL TRABAJADOR
// ==========================================

@Entity('perfiles_trabajador')
export class PerfilTrabajador {

    // Identificador del perfil
    @PrimaryGeneratedColumn()
    id!: number;

    // Usuario al que pertenece el perfil
    @OneToOne(
        () => Usuario,
        usuario => usuario.perfil,
        { onDelete: 'CASCADE' }
    )
    @JoinColumn()
    usuario!: Relation<Usuario>;

    // Experiencia laboral
    @Column({
        type: 'text',
        default: ''
    })
    experiencia!: string;

    // Zona donde trabaja
    @Column({
        length: 100,
        default: ''
    })
    zona!: string;

    // Horario disponible
    @Column({
        length: 150,
        default: ''
    })
    disponibilidad!: string;

    // Indica si el administrador lo aprobo
    @Column({
        type: 'boolean',
        default: false
    })
    aprobado!: boolean;

    // Categoria del trabajador
    @ManyToOne(
        () => Categoria,
        {
            nullable: true,
            onDelete: 'SET NULL'
        }
    )
    categoria?: Relation<Categoria> | null;

}


// ==========================================
// 7. CLASE SOLICITUD
// ==========================================

@Entity('solicitudes')
export class Solicitud {

    // Identificador de la solicitud
    @PrimaryGeneratedColumn()
    id!: number;

    // Cliente que publico la solicitud
    @ManyToOne(
        () => Usuario,
        usuario => usuario.solicitudes,
        { nullable: false }
    )
    cliente!: Relation<Usuario>;

    // Titulo del trabajo
    @Column({ length: 150 })
    titulo!: string;

    // Descripcion del problema
    @Column({ type: 'text' })
    descripcion!: string;

    // Direccion exacta del cliente
    // No debe mostrarse en busquedas publicas
    @Column({ length: 180 })
    direccion!: string;

    // Zona general
    @Column({ length: 100 })
    zona!: string;

    // Horario disponible
    @Column({ length: 150 })
    disponibilidad!: string;

    // Fotografia opcional
    @Column({
        type: 'varchar',
        length: 400,
        nullable: true
    })
    fotoUrl!: string | null;

    // Categoria del servicio
    @ManyToOne(
        () => Categoria,
        { nullable: false }
    )
    categoria!: Relation<Categoria>;

    // Estado actual
    @Column({
        type: 'enum',
        enum: EstadoSolicitud,
        default: EstadoSolicitud.ACTIVA
    })
    estado!: EstadoSolicitud;

    // Fecha de creacion
    @CreateDateColumn({ type: 'timestamptz' })
    creadaEn!: Date;

    // Propuestas recibidas
    @OneToMany(
        () => Propuesta,
        propuesta => propuesta.solicitud
    )
    propuestas?: Relation<Propuesta[]>;

}


// ==========================================
// 8. CLASE PROPUESTA
// ==========================================

@Entity('propuestas')

// Un trabajador solo puede enviar una
// propuesta por cada solicitud
@Unique(
    'UQ_propuesta_trabajador_solicitud',
    ['solicitud', 'trabajador']
)
export class Propuesta {

    // Identificador de la propuesta
    @PrimaryGeneratedColumn()
    id!: number;

    // Solicitud relacionada
    @ManyToOne(
        () => Solicitud,
        solicitud => solicitud.propuestas,
        { nullable: false }
    )
    solicitud!: Relation<Solicitud>;

    // Trabajador que envia la propuesta
    @ManyToOne(
        () => Usuario,
        { nullable: false }
    )
    trabajador!: Relation<Usuario>;

    // Precio propuesto
    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2
    })
    precio!: string;

    // Costo de visita
    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0
    })
    costoVisita!: string;

    // Indica si incluye materiales
    @Column({ type: 'boolean' })
    materialesIncluidos!: boolean;

    // Detalles de los materiales
    @Column({
        type: 'text',
        default: ''
    })
    detalleMateriales!: string;

    // Estado de la propuesta
    @Column({
        type: 'enum',
        enum: EstadoPropuesta,
        default: EstadoPropuesta.PENDIENTE
    })
    estado!: EstadoPropuesta;

    // Fecha de creacion
    @CreateDateColumn({ type: 'timestamptz' })
    creadaEn!: Date;

}
