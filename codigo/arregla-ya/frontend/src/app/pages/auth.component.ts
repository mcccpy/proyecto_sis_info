import { Component,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute,Router,RouterLink } from '@angular/router';
import { AuthService,mensajeError } from '../core/api';
import { Rol } from '../core/models';
@Component({selector:'app-auth',standalone:true,imports:[FormsModule,RouterLink],template:`
<div class="auth-layout"><section class="auth-aside"><span class="kicker">BIENVENIDO A ARREGLA YA</span><h2>Tu próximo proyecto empieza aquí.</h2><p>Una plataforma para conectar necesidades reales con trabajadores de confianza.</p><div class="aside-circle">✳</div></section>
<section class="auth-form"><div class="form-panel"><span class="kicker">{{esRegistro?'CREA TU CUENTA':'ACCEDE A TU CUENTA'}}</span><h1>{{esRegistro?'Empieza ahora':'Qué bueno verte'}}</h1><p class="subtle">{{esRegistro?'Completa tus datos para formar parte de ARREGLA YA.':'Ingresa tus credenciales para continuar.'}}</p>
@if(error()){<div class="alert error">{{error()}}</div>}
<form (ngSubmit)="enviar()">
@if(esRegistro){<label>Nombre completo<input name="nombre" type="text" [(ngModel)]="nombre" required minlength="2" autocomplete="name" placeholder="Ej. María López"></label>}
<label>Correo electrónico<input name="email" type="email" [(ngModel)]="email" required autocomplete="email" placeholder="correo@ejemplo.com"></label>
<label>Contraseña<input name="password" type="password" [(ngModel)]="password" required minlength="8" [attr.autocomplete]="esRegistro?'new-password':'current-password'" placeholder="Mínimo 8 caracteres"></label>
@if(esRegistro){<label>Tipo de cuenta<select name="rol" [(ngModel)]="rol"><option value="CLIENTE">Cliente particular</option><option value="EMPRESA">Empresa cliente</option><option value="TRABAJADOR">Trabajador / técnico</option></select></label><p class="help">Los técnicos necesitan aprobación administrativa antes de ofrecer servicios.</p>}
<button class="btn btn-primary wide" type="submit" [disabled]="cargando()">{{cargando()?'Procesando...':esRegistro?'Crear cuenta':'Iniciar sesión'}} →</button>
</form><p class="auth-switch">{{esRegistro?'¿Ya tienes cuenta?':'¿Todavía no tienes cuenta?'}} <a [routerLink]="esRegistro?'/ingresar':'/registro'">{{esRegistro?'Inicia sesión':'Regístrate'}}</a></p></div></section></div>
`}) export class AuthComponent {
 auth=inject(AuthService);router=inject(Router);route=inject(ActivatedRoute);
 esRegistro=this.route.snapshot.data['modo']==='registro';nombre='';email='';password='';rol:Rol='CLIENTE';error=signal('');cargando=signal(false);
 async enviar(){this.error.set('');this.cargando.set(true);try{const d=this.esRegistro?await this.auth.registro({nombre:this.nombre,email:this.email,password:this.password,rol:this.rol}):await this.auth.login({email:this.email,password:this.password});const route=d.usuario.rol==='TRABAJADOR'?'/trabajador':d.usuario.rol==='ADMIN'?'/administrador':'/cliente';await this.router.navigateByUrl(route);}catch(e){this.error.set(mensajeError(e));}finally{this.cargando.set(false);}}
}
