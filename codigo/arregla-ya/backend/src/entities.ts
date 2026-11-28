import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, JoinColumn, Unique } from 'typeorm';
export enum Rol { CLIENTE = 'CLIENTE', EMPRESA = 'EMPRESA', TRABAJADOR = 'TRABAJADOR', ADMIN = 'ADMIN' }
export enum EstadoSolicitud { REVISION = 'EN_REVISION', ACTIVA = 'ACTIVA', ASIGNADA = 'ASIGNADA', FINALIZADA = 'FINALIZADA', CANCELADA = 'CANCELADA', SUSPENDIDA = 'SUSPENDIDA' }
export enum EstadoPropuesta { PENDIENTE = 'PENDIENTE', ACEPTADA = 'ACEPTADA', RECHAZADA = 'RECHAZADA' }
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn() id!: number;
  @Column({length:120}) nombre!: string;
  @Index({unique:true}) @Column({length:180}) email!: string;
  @Column({name:'password_hash',select:false,length:255}) passwordHash!: string;
  @Column({type:'enum',enum:Rol,default:Rol.CLIENTE}) rol!: Rol;
  @CreateDateColumn({type:'timestamptz'}) creadoEn!: Date;
  @OneToOne(() => PerfilTrabajador, p => p.usuario)
  perfil?: any;
  @OneToMany(() => Solicitud, s => s.cliente) solicitudes?: Solicitud[];
}
@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn() id!: number;
  @Column({unique:true,length:80}) nombre!: string;
}
@Entity('perfiles_trabajador')
export class PerfilTrabajador {
  @PrimaryGeneratedColumn() id!: number;
  @OneToOne(() => Usuario, u => u.perfil, { onDelete:'CASCADE' }) @JoinColumn() usuario!: Usuario;
  @Column({type:'text',default:''}) experiencia!: string;
  @Column({length:100,default:''}) zona!: string;
  @Column({length:150,default:''}) disponibilidad!: string;
  @Column({type:'boolean',default:false}) aprobado!: boolean;
  @ManyToOne(() => Categoria, { nullable:true,onDelete:'SET NULL' }) categoria?: Categoria | null;
}
@Entity('solicitudes')
export class Solicitud {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Usuario, u => u.solicitudes, {nullable:false}) cliente!: Usuario;
  @Column({length:150}) titulo!: string;
  @Column({type:'text'}) descripcion!: string;
  @Column({length:180}) direccion!: string; // Privada: nunca se envía en listados para técnicos
  @Column({length:100}) zona!: string;
  @Column({length:150}) disponibilidad!: string;
  @Column({ type: 'varchar', length: 400, nullable: true })
fotoUrl!: string | null;
  @ManyToOne(() => Categoria, {nullable:false}) categoria!: Categoria;
  @Column({type:'enum',enum:EstadoSolicitud,default:EstadoSolicitud.ACTIVA}) estado!: EstadoSolicitud;
  @CreateDateColumn({type:'timestamptz'}) creadaEn!: Date;
  @OneToMany(() => Propuesta, p => p.solicitud) propuestas?: Propuesta[];
}
@Entity('propuestas')
@Unique('UQ_propuesta_trabajador_solicitud',['solicitud','trabajador'])
export class Propuesta {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Solicitud, s => s.propuestas, {nullable:false}) solicitud!: Solicitud;
  @ManyToOne(() => Usuario, {nullable:false}) trabajador!: Usuario;
  @Column({type:'decimal',precision:12,scale:2}) precio!: string;
  @Column({type:'decimal',precision:12,scale:2,default:0}) costoVisita!: string;
  @Column({type:'boolean'}) materialesIncluidos!: boolean;
  @Column({type:'text',default:''}) detalleMateriales!: string;
  @Column({type:'enum',enum:EstadoPropuesta,default:EstadoPropuesta.PENDIENTE}) estado!: EstadoPropuesta;
  @CreateDateColumn({type:'timestamptz'}) creadaEn!: Date;
}

@Entity('calificaciones')
@Unique('UQ_calificacion_cliente_solicitud', ['cliente', 'solicitud'])
export class Calificacion {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario, { nullable: false })
  trabajador!: Usuario;

  @ManyToOne(() => Usuario, { nullable: false })
  cliente!: Usuario;

  @ManyToOne(() => Solicitud, { nullable: false })
  solicitud!: Solicitud;

  @Column({ type: 'int' })
  puntuacion!: number;

  @Column({ type: 'text', nullable: true })
  comentario!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadaEn!: Date;
}

