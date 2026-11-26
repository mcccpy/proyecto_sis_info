import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, AuthService, mensajeError } from '../core/api';
import { Categoria, PerfilTrabajador, Propuesta, Solicitud } from '../core/models';

@Component({
  selector: 'app-trabajador',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
<main class="page shell">
  <div class="page-top">
    <div>
      <span class="kicker">ÁREA DE TÉCNICOS</span>
      <h1>Tu espacio de trabajo</h1>
      <p class="subtle">Administra tu perfil, encuentra solicitudes y revisa tus presupuestos.</p>
    </div>
    <span class="page-icon">⚒</span>
  </div>

  @if (!auth.usuario() || auth.usuario()?.rol !== 'TRABAJADOR') {
    <div class="alert info">Necesitas una cuenta de trabajador. <a routerLink="/registro">Regístrate aquí</a>.</div>
  } @else {
    @if (error()) { <div class="alert error">{{ error() }}</div> }
    @if (exito()) { <div class="alert success">{{ exito() }}</div> }

    <div class="tabs">
      <button [class.active]="vista() === 'perfil'" (click)="abrirPerfil()">Mi perfil</button>
      <button [class.active]="vista() === 'solicitudes'" (click)="cargarSolicitudes()">Solicitudes disponibles</button>
      <button [class.active]="vista() === 'ofertas'" (click)="cargarOfertas()">Mis presupuestos</button>
    </div>

    @if (vista() === 'perfil') {
      <section class="panel form-card">
        <h2>Perfil profesional</h2>
        <p class="subtle">Completa tus datos para que el administrador pueda revisar tu perfil.</p>
        <div class="alert" [class.success]="perfil()?.aprobado" [class.info]="!perfil()?.aprobado">
          Estado: {{ perfil()?.aprobado ? 'Aprobado ✓' : 'Pendiente de aprobación' }}
        </div>
        <form (ngSubmit)="guardarPerfil()">
          <div class="form-grid">
            <label>Especialidad
              <select name="categoriaId" [(ngModel)]="pf.categoriaId" required>
                <option [ngValue]="0">Selecciona categoría</option>
                @for (c of categorias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
              </select>
            </label>
            <label>Zona de cobertura
              <input name="zona" [(ngModel)]="pf.zona" required minlength="2" maxlength="100" placeholder="Ej. Centro, Tiquipaya">
            </label>
            <label class="full">Experiencia laboral
              <textarea name="experiencia" [(ngModel)]="pf.experiencia" required minlength="3" maxlength="500" rows="3" placeholder="Describe tus servicios y experiencia"></textarea>
            </label>
            <label class="full">Horarios disponibles
              <input name="disponibilidad" [(ngModel)]="pf.disponibilidad" required minlength="3" maxlength="150" placeholder="Lunes a viernes, 08:00 a 18:00">
            </label>
          </div>
          <button class="btn btn-primary" type="submit" [disabled]="guardando()">
            {{ guardando() ? 'Guardando...' : 'Guardar perfil' }}
          </button>
        </form>
      </section>
    }

    @if (vista() === 'solicitudes') {
      <div class="result-title">
        <h3>Solicitudes de tu especialidad</h3>
        <span>{{ solicitudes().length }} resultados</span>
      </div>
      <p class="subtle">Especialidad: {{ perfil()?.categoria?.nombre || 'No definida' }} · Las direcciones exactas están protegidas.</p>
      <div class="panel" style="margin-bottom:16px">
        <label>Buscar solicitud
          <input type="search" name="busqueda" [(ngModel)]="busqueda" placeholder="Buscar por título o descripción...">
        </label>
      </div>
      <div class="list-stack">
        @for (s of solicitudesFiltradas(); track s.id) {
          <article class="job-card">
            <div class="job-main">
              <div>
                <span class="kicker">{{ nombreCategoria(s.categoria) }} · #{{ s.id }}</span>
                <h3>{{ s.titulo }}</h3>
                <p>{{ s.descripcion }}</p>
                <div class="job-tags"><span>📍 {{ s.zona }}</span><span>◷ {{ s.disponibilidad }}</span></div>
              </div>
              <span class="status-pill">{{ s.estado }}</span>
            </div>
            <div class="job-actions">
              <button class="btn btn-outline btn-sm" type="button" (click)="abrirPropuesta(s.id)">Enviar presupuesto</button>
            </div>
            @if (seleccionada() === s.id) {
              <div class="offers">
                <form (ngSubmit)="enviar(s.id)" class="form-grid">
                  <label>Precio total (Bs)
                    <input type="number" name="precio" min="0.01" step="0.01" required [(ngModel)]="pres.precio">
                  </label>
                  <label>Costo de visita (Bs)
                    <input type="number" name="costoVisita" min="0" step="0.01" required [(ngModel)]="pres.costoVisita">
                  </label>
                  <label>Materiales incluidos
                    <select name="materialesIncluidos" [(ngModel)]="pres.materialesIncluidos">
                      <option [ngValue]="true">Sí</option><option [ngValue]="false">No</option>
                    </select>
                  </label>
                  <label>Detalle de materiales
                    <input name="detalleMateriales" [(ngModel)]="pres.detalleMateriales" required minlength="2" maxlength="1000" placeholder="Incluidos / a cargo del cliente...">
                  </label>
                  <div class="full" style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn btn-primary" type="submit" [disabled]="enviando()">{{ enviando() ? 'Enviando...' : 'Enviar propuesta →' }}</button>
                    <button class="btn btn-outline" type="button" (click)="seleccionada.set(null)">Cancelar</button>
                  </div>
                </form>
              </div>
            }
          </article>
        } @empty {
          <div class="empty">
            {{ busqueda.trim() ? 'No hay coincidencias con tu búsqueda.' : 'No hay solicitudes abiertas de tu especialidad o tu perfil todavía no está aprobado.' }}
          </div>
        }
      </div>
    }

    @if (vista() === 'ofertas') {
      <div class="result-title"><h3>Mis propuestas enviadas</h3><span>{{ ofertas().length }} propuestas</span></div>
      <div class="list-stack">
        @for (o of ofertas(); track o.id) {
          <article class="job-card">
            <div class="job-main">
              <div>
                <span class="kicker">PROPUESTA #{{ o.id }}</span>
                <h3>{{ o.solicitud || 'Solicitud' }}</h3>
                <p>Presupuesto: Bs {{ o.precio }}</p>
                @if (o.costoVisita !== undefined) { <p>Visita: Bs {{ o.costoVisita }}</p> }
                @if (o.detalleMateriales) { <p>Materiales: {{ o.detalleMateriales }}</p> }
              </div>
              <span class="status-pill">{{ o.estado }}</span>
            </div>
          </article>
        } @empty {
          <div class="empty">Aún no has enviado presupuestos.</div>
        }
      </div>
    }
  }
</main>
`
})
export class TrabajadorComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  categorias = signal<Categoria[]>([]);
  perfil = signal<PerfilTrabajador | null>(null);
  solicitudes = signal<Solicitud[]>([]);
  ofertas = signal<Propuesta[]>([]);
  vista = signal<'perfil' | 'solicitudes' | 'ofertas'>('perfil');
  seleccionada = signal<number | null>(null);
  error = signal('');
  exito = signal('');
  guardando = signal(false);
  enviando = signal(false);

  busqueda = '';
  pf = { experiencia: '', zona: '', disponibilidad: '', categoriaId: 0 };
  pres = { precio: 100, costoVisita: 0, materialesIncluidos: false, detalleMateriales: 'No incluidos' };

  async ngOnInit() {
    if (this.auth.usuario()?.rol !== 'TRABAJADOR') return;
    try {
      this.categorias.set(await this.api.categorias());
      const idUsuario = this.auth.usuario()?.id;
      if (!idUsuario) return;
      const p = await this.api.miPerfilTecnico(idUsuario);
      this.perfil.set(p);
      this.pf = {
        experiencia: p.experiencia || '',
        zona: p.zona || '',
        disponibilidad: p.disponibilidad || '',
        categoriaId: Number(p.categoria?.id || 0)
      };
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  abrirPerfil() {
    this.vista.set('perfil');
    this.error.set('');
  }

  abrirPropuesta(id: number) {
    this.error.set('');
    this.seleccionada.set(this.seleccionada() === id ? null : id);
  }

  async guardarPerfil() {
    this.error.set('');
    this.exito.set('');
    if (!(Number(this.pf.categoriaId) > 0) || (this.pf.zona || '').trim().length < 2 ||
        this.pf.experiencia.trim().length < 3 || this.pf.disponibilidad.trim().length < 3) {
      this.error.set('Completa especialidad, zona, experiencia y disponibilidad antes de guardar.');
      return;
    }
    this.guardando.set(true);
    try {
      const p = await this.api.guardarPerfil({
        ...this.pf,
        categoriaId: Number(this.pf.categoriaId),
        zona: this.pf.zona.trim(),
        experiencia: this.pf.experiencia.trim(),
        disponibilidad: this.pf.disponibilidad.trim()
      }) as PerfilTrabajador;
      this.perfil.set(p);
      this.exito.set('Perfil guardado correctamente. Un administrador debe revisarlo.');
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  async cargarSolicitudes() {
    this.vista.set('solicitudes');
    this.error.set('');
    this.exito.set('');
    this.seleccionada.set(null);
    try {
      const perfil = this.perfil();
      const categoria = perfil?.categoria?.nombre?.trim().toLocaleLowerCase();
      if (!perfil?.aprobado) {
        this.solicitudes.set([]);
        this.error.set('Tu perfil debe estar aprobado para consultar solicitudes.');
        return;
      }
      if (!categoria) {
        this.solicitudes.set([]);
        this.error.set('Completa y guarda tu especialidad en Mi perfil antes de consultar solicitudes.');
        return;
      }
      const lista = await this.api.disponibles();
      this.solicitudes.set(lista.filter(s =>
        this.nombreCategoria(s.categoria).trim().toLocaleLowerCase() === categoria
      ));
    } catch (e) {
      this.solicitudes.set([]);
      this.error.set(mensajeError(e));
    }
  }

  solicitudesFiltradas() {
    const texto = this.busqueda.trim().toLocaleLowerCase();
    return this.solicitudes().filter(s =>
      !texto ||
      s.titulo.toLocaleLowerCase().includes(texto) ||
      s.descripcion.toLocaleLowerCase().includes(texto)
    );
  }

  async cargarOfertas() {
    this.vista.set('ofertas');
    this.error.set('');
    this.exito.set('');
    try {
      this.ofertas.set(await this.api.misOfertas());
    } catch (e) {
      this.ofertas.set([]);
      this.error.set(mensajeError(e));
    }
  }

  async enviar(id: number) {
    this.error.set('');
    this.exito.set('');
    const p = this.perfil();
    if (!p?.categoria?.id || !p.zona?.trim() || !p.experiencia?.trim()) {
      this.error.set('Completa tu especialidad, zona y experiencia antes de enviar presupuestos.');
      this.vista.set('perfil');
      this.seleccionada.set(null);
      return;
    }
    if (!Number.isFinite(this.pres.precio) || this.pres.precio <= 0 ||
        !Number.isFinite(this.pres.costoVisita) || this.pres.costoVisita < 0 ||
        this.pres.detalleMateriales.trim().length < 2) {
      this.error.set('Revisa el precio, costo de visita y detalle de materiales.');
      return;
    }
    this.enviando.set(true);
    try {
      await this.api.ofrecer(id, {
        ...this.pres,
        detalleMateriales: this.pres.detalleMateriales.trim()
      });
      this.exito.set('Propuesta enviada al cliente.');
      this.seleccionada.set(null);
      await this.cargarOfertas();
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.enviando.set(false);
    }
  }

  nombreCategoria(c: Categoria | string) {
    return typeof c === 'string' ? c : c.nombre;
  }
}




