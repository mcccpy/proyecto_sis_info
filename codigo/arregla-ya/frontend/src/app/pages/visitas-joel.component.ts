import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, mensajeError } from '../core/api';
import {
  HistorialVisita, ServicioTecnico, VisitaTecnica, VisitasJoelApiService,
} from '../core/visitas-joel-api.service';

@Component({
  selector: 'app-visitas-joel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './visitas-joel.component.html',
  styles: [`
    .visitas-panel { margin-top: 18px; padding: 20px; }
    .visita-card { border: 1px solid #d4d6e7; border-radius: 12px; padding: 18px;
      margin-top: 14px; background: white; color: #151936; }
    .visita-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 14px; }
    .visita-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px,1fr)); gap: 12px; }
    .visita-form label { display: flex; flex-direction: column; gap: 6px; }
    .visita-form input, .visita-form select, .visita-form textarea {
      min-width: 0; padding: 10px; border: 1px solid #c7cada; border-radius: 8px;
      background: white; color: #151936; font: inherit; }
    .visita-botones { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .visita-mensaje { padding: 12px; margin: 12px 0; border-radius: 8px; background: #f0f1ff; }
    .visita-error { background: #fff0f0; color: #9b1825; }
    .visita-exito { background: #eefbea; color: #245e23; }
    .historial-item { padding: 12px 0; border-bottom: 1px solid #ddd; }
    .muted { opacity: .75; }
  `],
})
export class VisitasJoelComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(VisitasJoelApiService);

  // signal() hace que Angular actualice el HTML al cambiar los datos.
  servicios = signal<ServicioTecnico[]>([]);
  visitas = signal<VisitaTecnica[]>([]);
  historial = signal<HistorialVisita[]>([]);
  seleccionada = signal<number | null>(null);
  cargando = signal(false);
  ocupado = signal(false);
  error = signal('');
  exito = signal('');

  // Campos del formulario para crear una primera visita.
  idServicio = 0;
  inicioInicial = '';
  finInicial = '';

  // Campos del formulario de reprogramacion.
  nuevoInicio = '';
  nuevoFin = '';
  motivo = '';

  async ngOnInit() {
    if (this.puedeEntrar()) await this.cargarDatos();
  }

  puedeEntrar() {
    const rol = this.auth.usuario()?.rol;
    return rol === 'CLIENTE' || rol === 'TRABAJADOR';
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.error.set('');
    try {
      // Ambos listados vienen de PostgreSQL, no de arrays de prueba.
      this.servicios.set(await this.api.servicios());
      this.visitas.set(await this.api.visitas());
      if (this.seleccionada() !== null) {
        this.historial.set(await this.api.historial(this.seleccionada()!));
      }
    } catch (error) {
      this.error.set(mensajeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  // datetime-local usa hora local; toISOString() envia la hora con zona UTC.
  private aIso(valor: string): string {
    const fecha = new Date(valor);
    if (!valor || !Number.isFinite(fecha.getTime())) {
      throw new Error('Debes seleccionar fecha y hora validas');
    }
    return fecha.toISOString();
  }

  private mensaje(error: unknown): string {
    if (error instanceof HttpErrorResponse) return mensajeError(error);
    if (error instanceof Error) return error.message;
    return mensajeError(error);
  }

  async programar() {
    this.error.set(''); this.exito.set('');
    this.ocupado.set(true);
    try {
      if (this.idServicio <= 0) throw new Error('Elige un servicio primero');
      await this.api.programar(this.idServicio,
        this.aIso(this.inicioInicial), this.aIso(this.finInicial));
      this.exito.set('Visita inicial programada correctamente.');
      this.inicioInicial = ''; this.finInicial = '';
      await this.cargarDatos();
    } catch (error) {
      this.error.set(this.mensaje(error));
    } finally {
      this.ocupado.set(false);
    }
  }

  // Abrimos el historial de una visita. Contiene tambien las solicitudes pendientes.
  async abrirHistorial(idVisita: number) {
    this.error.set(''); this.exito.set('');
    if (this.seleccionada() === idVisita) {
      this.seleccionada.set(null);
      this.historial.set([]);
      return;
    }
    this.seleccionada.set(idVisita);
    this.nuevoInicio = ''; this.nuevoFin = ''; this.motivo = '';
    try {
      this.historial.set(await this.api.historial(idVisita));
    } catch (error) {
      this.error.set(mensajeError(error));
    }
  }

  async solicitar(idVisita: number) {
    this.error.set(''); this.exito.set('');
    this.ocupado.set(true);
    try {
      await this.api.solicitar(idVisita,
        this.aIso(this.nuevoInicio), this.aIso(this.nuevoFin), this.motivo.trim());
      this.exito.set('Solicitud enviada. La otra persona debe responder.');
      this.nuevoInicio = ''; this.nuevoFin = ''; this.motivo = '';
      this.historial.set(await this.api.historial(idVisita));
    } catch (error) {
      this.error.set(this.mensaje(error));
    } finally {
      this.ocupado.set(false);
    }
  }

  async responder(idSolicitud: number, decision: 'aprobar' | 'rechazar') {
    this.error.set(''); this.exito.set('');
    this.ocupado.set(true);
    try {
      await this.api.responder(idSolicitud, decision);
      this.exito.set(decision === 'aprobar' ? 'Horario actualizado.' : 'Solicitud rechazada.');
      await this.cargarDatos();
    } catch (error) {
      this.error.set(this.mensaje(error));
    } finally {
      this.ocupado.set(false);
    }
  }
}
