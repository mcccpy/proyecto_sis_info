import { Component,inject,OnInit,signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService,AuthService,mensajeError } from '../core/api';
@Component({selector:'app-admin',standalone:true,imports:[RouterLink],template:`
<main class="page shell"><div class="page-top"><div><span class="kicker">ADMINISTRACIÓN</span><h1>Revisión de trabajadores</h1><p class="subtle">Solo los usuarios autorizados pueden aprobar perfiles profesionales.</p></div><span class="page-icon">✓</span></div>
@if(auth.usuario()?.rol!=='ADMIN'){<div class="alert info">Este panel requiere permisos de administrador. <a routerLink="/ingresar">Iniciar sesión</a>.</div>}@else{
@if(error()){<div class="alert error">{{error()}}</div>}@if(exito()){<div class="alert success">{{exito()}}</div>}
<div class="result-title"><h3>Pendientes de revisión</h3><span>{{pendientes().length}} registros</span></div><div class="list-stack">@for(t of pendientes();track t.id){<article class="job-card"><div class="job-main"><div><span class="kicker">TRABAJADOR #{{t.id}}</span><h3>{{t.nombre}}</h3><p>{{t.email}} · {{t.categoria}} · {{t.zona}}</p><p>{{t.experiencia}}</p></div><button class="btn btn-primary btn-sm" (click)="aprobar(t.id)">Aprobar ✓</button></div></article>}@empty{<div class="empty">No hay trabajadores pendientes.</div>}</div><p class="help">Esta aprobación verifica la información registrada; no equivale a una certificación profesional.</p>}
</main>
`}) export class AdministradorComponent implements OnInit {
 api=inject(ApiService);auth=inject(AuthService);pendientes=signal<{id:number;nombre:string;email:string;zona:string;experiencia:string;categoria:string}[]>([]);error=signal('');exito=signal('');
 async ngOnInit(){if(this.auth.usuario()?.rol==='ADMIN')await this.cargar();}
 async cargar(){this.error.set('');try{this.pendientes.set(await this.api.pendientes());}catch(e){this.error.set(mensajeError(e));}}
 async aprobar(id:number){this.error.set('');try{await this.api.aprobar(id);this.exito.set(`Trabajador #${id} aprobado`);await this.cargar();}catch(e){this.error.set(mensajeError(e));}}
}
