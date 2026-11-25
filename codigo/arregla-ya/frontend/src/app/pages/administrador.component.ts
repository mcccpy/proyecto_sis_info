import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, AuthService, mensajeError } from '../core/api';

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
    <p class="help">Esta aprobación verifica la información registrada; no equivale a una certificación profesional. Las categorías son de consulta: el backend actual no ofrece edición administrativa de categorías ni zonas.</p>
  }
</main>
`
})
export class AdministradorComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  pendientes = signal<TrabajadorPendiente[]>([]);
  error = signal('');
  exito = signal('');
  cargando = signal(false);
  aprobandoId = signal<number | null>(null);
  busqueda = '';

  async ngOnInit() {
    if (this.auth.usuario()?.rol === 'ADMIN') await this.cargar();
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
}
