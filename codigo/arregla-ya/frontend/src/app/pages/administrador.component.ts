import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, AuthService, mensajeError } from '../core/api';
import { IncrementoPendienteAdmin } from '../core/models';

interface TrabajadorPendiente {
  id: number;
  nombre: string;
  email: string;
  zona: string;
  experiencia: string;
  categoria: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
<main class="page shell">
  <div class="page-top">
    <div>
      <span class="kicker">ADMINISTRACIÓN</span>
      <h1>Gestión de trabajadores</h1>
      <p class="subtle">Revisa los perfiles profesionales y aprueba a quienes completaron sus datos.</p>
    </div>
    <span class="page-icon">✓</span>
  </div>

  @if (auth.usuario()?.rol !== 'ADMIN') {
    <div class="alert info">Este panel requiere permisos de administrador. <a routerLink="/ingresar">Iniciar sesión</a>.</div>
  } @else {
    @if (error()) { <div class="alert error">{{ error() }}</div> }
    @if (exito()) { <div class="alert success">{{ exito() }}</div> }

    <section class="panel" style="margin-bottom:18px">
      <div class="result-title">
        <div><h2>Trabajadores pendientes</h2><p class="subtle">La aprobación habilita al técnico para consultar solicitudes y enviar propuestas.</p></div>
        <button class="btn btn-outline btn-sm" type="button" (click)="cargar()" [disabled]="cargando()">
          {{ cargando() ? 'Actualizando...' : 'Actualizar lista ↻' }}
        </button>
      </div>
      <div class="form-grid">
        <label class="full">Buscar trabajador
          <input type="search" name="busqueda" [(ngModel)]="busqueda" placeholder="Nombre, correo, especialidad o zona...">
        </label>
      </div>
      <div class="result-title">
        <h3>Resultados</h3>
        <span>{{ filtrados().length }} de {{ pendientes().length }}</span>
      </div>
    </section>

    <div class="list-stack">
      @for (t of filtrados(); track t.id) {
        <article class="job-card">
          <div class="job-main">
            <div>
              <span class="kicker">TRABAJADOR #{{ t.id }}</span>
              <h3>{{ t.nombre }}</h3>
              <p>{{ t.email }}</p>
              <div class="job-tags"><span>Especialidad: {{ t.categoria }}</span><span>📍 {{ t.zona }}</span></div>
              <p>{{ t.experiencia }}</p>
            </div>
            <button class="btn btn-primary btn-sm" type="button" (click)="aprobar(t.id)" [disabled]="aprobandoId() !== null">
              {{ aprobandoId() === t.id ? 'Aprobando...' : 'Aprobar ✓' }}
            </button>
          </div>
        </article>
      } @empty {
        <div class="empty">
          {{ pendientes().length === 0 ? 'No hay trabajadores pendientes de revisión.' : 'No se encontraron trabajadores con esa búsqueda.' }}
        </div>
      }
    </div>
    <!-- Cola administrativa para resolver aumentos que siguen pendientes. -->
    <section class="panel" style="margin:24px 0">
      <div class="result-title"><div><h2>Aumentos pendientes</h2><p class="subtle">La propuesta cambia de precio solo al aprobar el aumento.</p></div><button class="btn btn-outline btn-sm" type="button" (click)="cargarAjustes()">Actualizar</button></div>
      <div class="list-stack">
        @for (cambio of ajustesPendientes(); track cambio.idIncremento) {
          <article class="job-card">
            <span class="kicker">AJUSTE #{{ cambio.idIncremento }} · SERVICIO #{{ cambio.servicio?.idServicio }}</span>
            <h3>{{ cambio.servicio?.propuesta?.trabajo?.titulo || 'Trabajo' }}</h3>
            <p>Solicitante: {{ cambio.usuario?.nombre || 'Usuario' }} · {{ cambio.usuario?.email }}</p>
            <p>Bs {{ cambio.montoAnterior }} → Bs {{ cambio.montoNuevo }} · {{ cambio.motivo }}</p>
            <div class="job-actions"><button class="btn btn-primary btn-sm" type="button" (click)="dictaminar(cambio.idIncremento, 'aprobado')" [disabled]="dictaminandoId() !== null">Aprobar</button><button class="btn btn-outline btn-sm" type="button" (click)="dictaminar(cambio.idIncremento, 'rechazado')" [disabled]="dictaminandoId() !== null">Rechazar</button></div>
          </article>
        } @empty { <div class="empty">No hay aumentos esperando revisión.</div> }
      </div>
    </section>    <p class="help">Esta aprobación verifica la información registrada; no equivale a una certificación profesional. Las categorías son de consulta: el backend actual no ofrece edición administrativa de categorías ni zonas.</p>
  }
</main>
`
})
export class AdministradorComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  auth = inject(AuthService);
  pendientes = signal<TrabajadorPendiente[]>([]);
  error = signal('');
  exito = signal('');
  cargando = signal(false);
  aprobandoId = signal<number | null>(null);
  ajustesPendientes = signal<IncrementoPendienteAdmin[]>([]);
  dictaminandoId = signal<number | null>(null);
  busqueda = '';
  private intervaloAjustes: ReturnType<typeof setInterval> | null = null;

  async ngOnInit() {
    if (this.auth.usuario()?.rol === 'ADMIN') {
      await this.cargar();
      await this.cargarAjustes();
      // Mantiene visible la cola de aprobación sin recargar toda la página.
      this.intervaloAjustes = setInterval(() => {
        void this.cargarAjustes();
      }, 10_000);
    }
  }

  ngOnDestroy() {
    if (this.intervaloAjustes) clearInterval(this.intervaloAjustes);
  }

  filtrados() {
    const q = this.busqueda.trim().toLocaleLowerCase();
    return this.pendientes().filter(t =>
      !q ||
      t.nombre.toLocaleLowerCase().includes(q) ||
      t.email.toLocaleLowerCase().includes(q) ||
      t.categoria.toLocaleLowerCase().includes(q) ||
      t.zona.toLocaleLowerCase().includes(q)
    );
  }

  async cargar() {
    this.error.set('');
    this.cargando.set(true);
    try {
      this.pendientes.set(await this.api.pendientes());
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  async aprobar(id: number) {
    this.error.set('');
    this.exito.set('');
    this.aprobandoId.set(id);
    try {
      await this.api.aprobar(id);
      this.exito.set(`Trabajador #${id} aprobado correctamente.`);
      await this.cargar();
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.aprobandoId.set(null);
    }
  }

  /** Actualiza la cola de solicitudes que necesitan decisión administrativa. */
  async cargarAjustes() {
    const id_admin = this.auth.usuario()?.id;
    if (!id_admin) return;
    try {
      this.ajustesPendientes.set(await this.api.presupuestosPendientesAdmin(id_admin));
    } catch (error) {
      this.error.set(mensajeError(error));
    }
  }

  /** Envía el dictamen y vuelve a consultar la cola para reflejar el resultado. */
  async dictaminar(id_incremento: number, estado: 'aprobado' | 'rechazado') {
    const id_admin = this.auth.usuario()?.id;
    if (!id_admin) return;
    this.dictaminandoId.set(id_incremento);
    this.error.set('');
    this.exito.set('');
    try {
      await this.api.dictaminarPresupuesto(id_incremento, id_admin, estado);
      this.exito.set(estado === 'aprobado' ? 'Aumento aprobado y propuesta actualizada.' : 'Aumento rechazado.');
      await this.cargarAjustes();
    } catch (error) {
      this.error.set(mensajeError(error));
    } finally {
      this.dictaminandoId.set(null);
    }
  }
}
