
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
      <p class="subtle">Completa tu perfil, encuentra solicitudes y envía presupuestos.</p>
    </div>
    <span class="page-icon">⚒</span>
  </div>

  @if(!auth.usuario() || auth.usuario()?.rol !== 'TRABAJADOR'){
    <div class="alert info">
      Necesitas una cuenta de trabajador.
      <a routerLink="/registro">Regístrate aquí</a>.
    </div>
  } @else {
    @if(error()){
      <div class="alert error">{{error()}}</div>
    }
    @if(exito()){
      <div class="alert success">{{exito()}}</div>
    }

    <div class="tabs">
      <button [class.active]="vista()==='perfil'" (click)="vista.set('perfil')">Mi perfil</button>
      <button [class.active]="vista()==='solicitudes'" (click)="cargarSolicitudes()">Solicitudes disponibles</button>
      <button [class.active]="vista()==='ofertas'" (click)="cargarOfertas()">Mis presupuestos</button>
    </div>

    @if(vista()==='perfil'){
      <section class="panel form-card">
        <h2>Perfil profesional</h2>
        <p class="subtle">Tu perfil debe ser revisado por el administrador antes de aparecer disponible.</p>

        <div class="alert" [class.success]="perfil()?.aprobado" [class.info]="!perfil()?.aprobado">
          Estado: {{perfil()?.aprobado ? 'Aprobado ✓' : 'Pendiente de aprobación'}}
        </div>

        <form (ngSubmit)="guardarPerfil()">
          <div class="form-grid">
            <label>Especialidad
              <select name="categoriaId" [(ngModel)]="pf.categoriaId" required>
                <option [ngValue]="0">Selecciona categoría</option>
                @for(c of categorias(); track c.id){
                  <option [ngValue]="c.id">{{c.nombre}}</option>
                }
              </select>
            </label>

            <label>Zona de cobertura
              <input name="zona" [(ngModel)]="pf.zona" required placeholder="Ej. Centro, Tiquipaya">
            </label>

            <label class="full">Experiencia laboral
              <textarea name="experiencia" [(ngModel)]="pf.experiencia" required rows="3" placeholder="Describe tus servicios y experiencia"></textarea>
            </label>

            <label class="full">Horarios disponibles
              <input name="disponibilidad" [(ngModel)]="pf.disponibilidad" required placeholder="Lunes a viernes, 08:00 a 18:00">
            </label>
          </div>

          <button class="btn btn-primary" [disabled]="guardando()">Guardar perfil</button>
        </form>
      </section>
    }

    @if(vista()==='solicitudes'){
      <div class="result-title">
        <div>
          <h3>Solicitudes de tu especialidad</h3>
          <span class="subtle">
            Especialidad: {{perfil()?.categoria?.nombre || 'No definida'}}
          </span>
        </div>
        <span>Direcciones exactas protegidas</span>
      </div>

      <input
        type="text"
        name="busqueda"
        placeholder="Buscar por título o descripción..."
        [(ngModel)]="busqueda"
        class="search-input">

      <div class="list-stack">
        @for(s of solicitudesFiltradas(); track s.id){
          <article class="job-card">
            <div class="job-main">
              <div>
                <span class="kicker">{{nombreCategoria(s.categoria)}} · #{{s.id}}</span>
                <h3>{{s.titulo}}</h3>
                <p>{{s.descripcion}}</p>
                <div class="job-tags">
                  <span>📍 {{s.zona}}</span>
                  <span>◷ {{s.disponibilidad}}</span>
                </div>
              </div>
              <span class="status-pill">{{s.estado}}</span>
            </div>

            <div class="job-actions">
              <button class="btn btn-outline btn-sm" (click)="seleccionada.set(s.id)">
                Enviar presupuesto
              </button>
            </div>

            @if(seleccionada()===s.id){
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
                      <option [ngValue]="true">Sí</option>
                      <option [ngValue]="false">No</option>
                    </select>
                  </label>

                  <label>Detalle de materiales
                    <input name="detalleMateriales" [(ngModel)]="pres.detalleMateriales" required placeholder="Incluidos / a cargo del cliente...">
                  </label>

                  <button class="btn btn-primary" type="submit">Enviar propuesta →</button>
                </form>
              </div>
            }
          </article>
        } @empty {
          <div class="empty">
            {{busqueda.trim()
              ? 'No se encontraron solicitudes con esa búsqueda.'
              : 'No hay solicitudes abiertas para tu especialidad o tu perfil todavía no está aprobado.'}}
          </div>
        }
      </div>
    }

    @if(vista()==='ofertas'){
      <div class="result-title">
        <h3>Mis propuestas enviadas</h3>
      </div>

      <div class="list-stack">
        @for(o of ofertas(); track o.id){
          <div class="job-card">
            <div class="job-main">
              <div>
                <h3>{{o.solicitud}}</h3>
                <p>Presupuesto: Bs {{o.precio}}</p>
              </div>
              <span class="status-pill">{{o.estado}}</span>
            </div>
          </div>
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

  busqueda = '';

  pf = {
    experiencia: '',
    zona: '',
    disponibilidad: '',
    categoriaId: 0
  };

  pres = {
    precio: 100,
    costoVisita: 0,
    materialesIncluidos: false,
    detalleMateriales: 'No incluidos'
  };

  async ngOnInit() {
    if (this.auth.usuario()?.rol !== 'TRABAJADOR') return;

    try {
      this.categorias.set(await this.api.categorias());

      const p = await this.api.miPerfilTecnico();
      this.perfil.set(p);

      this.pf = {
        experiencia: p.experiencia || '',
        zona: p.zona || '',
        disponibilidad: p.disponibilidad || '',
        categoriaId: p.categoria?.id || 0
      };
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async guardarPerfil() {
    this.error.set('');
    this.exito.set('');
    this.guardando.set(true);

    try {
      const p = await this.api.guardarPerfil(this.pf) as PerfilTrabajador;
      this.perfil.set(p);
      this.exito.set('Perfil guardado. Un administrador debe revisarlo.');
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  async cargarSolicitudes() {
    this.vista.set('solicitudes');
    this.error.set('');
    this.busqueda = '';

    try {
      const categoria = this.perfil()?.categoria?.nombre?.trim().toLocaleLowerCase();

      if (!categoria) {
        this.solicitudes.set([]);
        this.error.set('Completa y guarda tu especialidad en Mi perfil antes de consultar solicitudes.');
        return;
      }

      const lista = await this.api.disponibles();

      this.solicitudes.set(
        lista.filter(s =>
          this.nombreCategoria(s.categoria).trim().toLocaleLowerCase() === categoria
        )
      );
    } catch (e) {
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

    try {
      this.ofertas.set(await this.api.misOfertas());
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  async enviar(id: number) {
    this.error.set('');
    this.exito.set('');

    const p = this.perfil();

    if (
      !p?.categoria?.id ||
      !p.zona?.trim() ||
      !p.experiencia?.trim()
    ) {
      this.error.set(
        'Completa tu especialidad, zona y experiencia antes de enviar presupuestos.'
      );
      this.vista.set('perfil');
      this.seleccionada.set(null);
      return;
    }

    try {
      await this.api.ofrecer(id, this.pres);
      this.exito.set('Propuesta enviada al cliente');
      this.seleccionada.set(null);
      await this.cargarOfertas();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  nombreCategoria(c: Categoria | string) {
    return typeof c === 'string' ? c : c.nombre;
  }
}
