export type Rol='CLIENTE'|'EMPRESA'|'TRABAJADOR'|'ADMIN';
export interface Usuario {id:number;nombre:string;email:string;rol:Rol;}
export interface Categoria {id:number;nombre:string;}
export interface Trabajador {id:number;nombre:string;categoria:string;zona:string;disponibilidad:string;experiencia:string;}
export interface Solicitud {id:number;titulo:string;descripcion:string;direccion?:string;zona:string;disponibilidad:string;fotoUrl?:string|null;estado:string;creadaEn:string;categoria:Categoria|string;}
export interface Propuesta {id:number;trabajador?:{id:number;nombre:string};solicitud?:string;precio:string;costoVisita?:string;materialesIncluidos?:boolean;detalleMateriales?:string;estado:string;}
export interface PerfilTrabajador {id:number;aprobado:boolean;experiencia:string;zona:string;disponibilidad:string;categoria?:Categoria|null;}
