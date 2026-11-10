
export type Rol = 'CLIENTE' | 'EMPRESA' | 'TRABAJADOR' | 'ADMIN';

// Datos de un usuario
export interface Usuario {
    id: number;
    nombre: string;
    email: string;
    rol: Rol;
}

// Categorías de servicios
export interface Categoria {
    id: number;
    nombre: string;
}

// Datos de un trabajador
export interface Trabajador {
    id: number;
    nombre: string;
    categoria: string;
    zona: string;
    disponibilidad: string;
    experiencia: string;
}

// Datos de una solicitud
export interface Solicitud {
    id: number;
    titulo: string;
    descripcion: string;
    direccion?: string;
    zona: string;
    disponibilidad: string;
    fotoUrl?: string | null;
    estado: string;
    creadaEn: string;
    categoria: Categoria | string;
}

// Datos de una propuesta
export interface Propuesta {
    id: number;
    trabajador?: {
        id: number;
        nombre: string;
    };
    solicitud?: string;
    precio: string;
    costoVisita?: string;
    materialesIncluidos?: boolean;
    detalleMateriales?: string;
    estado: string;
}

// Perfil profesional de un trabajador
export interface PerfilTrabajador {
    id: number;
    aprobado: boolean;
    experiencia: string;
    zona: string;
    disponibilidad: string;
    categoria?: Categoria | null;
}
