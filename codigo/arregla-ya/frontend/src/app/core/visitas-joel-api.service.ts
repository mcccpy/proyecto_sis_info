import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Estas interfaces representan datos REALES de PostgreSQL.
export interface ServicioTecnico {
  id_servicio: number;
  estado: string;
  titulo: string;
  id_cliente: number;
  id_reparador: number;
}

export interface VisitaTecnica {
  id_visita: number;
  id_servicio: number;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
  estado_servicio: string;
  id_cliente: number;
  id_reparador: number;
  nombre_cliente: string;
  nombre_reparador: string;
}

export interface HistorialVisita {
  id_reprogramacion: number;
  id_visita: number;
  id_solicitante: number;
  nombre_solicitante: string;
  id_revisor: number | null;
  nombre_revisor: string | null;
  fecha_anterior_inicio: string;
  fecha_anterior_fin: string;
  fecha_nueva_inicio: string;
  fecha_nueva_fin: string;
  motivo: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fecha_solicitud: string;
  fecha_respuesta: string | null;
}

@Injectable({ providedIn: 'root' })
export class VisitasJoelApiService {
  private http = inject(HttpClient);
  private url = '/api/reprogramaciones-visita';

  // firstValueFrom convierte la respuesta HTTP en una promesa para usar await.
  servicios(): Promise<ServicioTecnico[]> {
    return firstValueFrom(this.http.get<ServicioTecnico[]>(`${this.url}/servicios`));
  }

  visitas(): Promise<VisitaTecnica[]> {
    return firstValueFrom(this.http.get<VisitaTecnica[]>(`${this.url}/visitas`));
  }

  historial(idVisita: number): Promise<HistorialVisita[]> {
    return firstValueFrom(this.http.get<HistorialVisita[]>(
      `${this.url}/visitas/${idVisita}/historial`));
  }

  programar(idServicio: number, inicio: string, fin: string) {
    return firstValueFrom(this.http.post(`${this.url}/visitas`, {
      id_servicio: idServicio, fecha_inicio: inicio, fecha_fin: fin,
    }));
  }

  solicitar(idVisita: number, inicio: string, fin: string, motivo: string) {
    return firstValueFrom(this.http.post(`${this.url}/visitas/${idVisita}/solicitudes`, {
      fecha_inicio: inicio, fecha_fin: fin, motivo,
    }));
  }

  responder(idSolicitud: number, decision: 'aprobar' | 'rechazar') {
    return firstValueFrom(this.http.patch(`${this.url}/solicitudes/${idSolicitud}/responder`, {
      decision,
    }));
  }
}
