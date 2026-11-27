import { Component,inject,OnInit } from '@angular/core';
import { Router,RouterLink,RouterOutlet } from '@angular/router';
import { AuthService } from './core/api';
@Component({selector:'app-root',standalone:true,imports:[RouterLink,RouterOutlet],template:`
 <header class="header"><div class="shell nav"><a routerLink="/" class="brand"><span class="brand-icon">✳</span><span>ARREGLA<span class="brand-accent">YA</span></span></a>
 <nav class="links"><a routerLink="/">Inicio</a><a routerLink="/cliente">Clientes</a><a routerLink="/trabajador">Técnicos</a><a routerLink="/visitas">Visitas</a><a routerLink="/administrador">Administración</a></nav>
 <div class="nav-right">@if(auth.usuario();as u){<span class="hello">Hola, {{u.nombre.split(' ')[0]}}</span><button class="btn btn-outline btn-sm" (click)="salir()">Salir</button>}@else{<a routerLink="/ingresar" class="btn btn-quiet btn-sm">Ingresar</a><a routerLink="/registro" class="btn btn-primary btn-sm">Crear cuenta →</a>}</div></div></header>
 <router-outlet></router-outlet>
 <footer class="footer"><div class="shell footer-in"><span class="brand small"><span class="brand-icon">✳</span>ARREGLA<span class="brand-accent">YA</span></span><span>Proyecto académico · Cochabamba, Bolivia</span><span>Angular + NestJS + PostgreSQL</span></div></footer>
`}) export class AppComponent implements OnInit {auth=inject(AuthService);private router=inject(Router);ngOnInit(){void this.auth.comprobar();} salir(){this.auth.salir();void this.router.navigateByUrl('/');}}
