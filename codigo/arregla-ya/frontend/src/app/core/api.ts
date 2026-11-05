import { inject,Injectable,signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Categoria,PerfilTrabajador,Propuesta,Rol,Solicitud,Trabajador,Usuario } from './models';
export const API_URL='http://localhost:3000/api';
export const authInterceptor:HttpInterceptorFn=(req,next)=>{
 const token=typeof localStorage!=='undefined'?localStorage.getItem('ay_token'):null;
 return next(token?req.clone({setHeaders:{Authorization:`Bearer ${token}`}}):req);
};
export function mensajeError(error:unknown):string {
 if(error instanceof HttpErrorResponse){if(error.status===0)return 'No se puede contactar con NestJS. Verifica que el backend esté encendido en localhost:3000.';
 const msg=error.error?.message;return Array.isArray(msg)?msg.join(' • '):typeof msg==='string'?msg:`Error ${error.status}`;}
 return 'Ocurrió un error inesperado.';
}
@Injectable({providedIn:'root'}) export class AuthService {
 private http=inject(HttpClient);
 usuario=signal<Usuario|null>(this.leerUsuario());
 private leerUsuario():Usuario|null {try {const v=localStorage.getItem('ay_usuario');return v?JSON.parse(v) as Usuario:null;}catch{return null;}}
 async registro(datos:{nombre:string;email:string;password:string;rol:Rol}){const r=await firstValueFrom(this.http.post<{token:string;usuario:Usuario}>(`${API_URL}/auth/registro`,datos));this.guardar(r);return r;}
 async login(datos:{email:string;password:string}){const r=await firstValueFrom(this.http.post<{token:string;usuario:Usuario}>(`${API_URL}/auth/login`,datos));this.guardar(r);return r;}
 private guardar(r:{token:string;usuario:Usuario}){localStorage.setItem('ay_token',r.token);localStorage.setItem('ay_usuario',JSON.stringify(r.usuario));this.usuario.set(r.usuario);}
 async comprobar(){if(!localStorage.getItem('ay_token'))return;try{const u=await firstValueFrom(this.http.get<Usuario>(`${API_URL}/auth/perfil`));this.usuario.set(u);localStorage.setItem('ay_usuario',JSON.stringify(u));}catch{this.salir();}}
 salir(){localStorage.removeItem('ay_token');localStorage.removeItem('ay_usuario');this.usuario.set(null);}
}
@Injectable({providedIn:'root'}) export class ApiService {
 private http=inject(HttpClient);
 categorias(){return firstValueFrom(this.http.get<Categoria[]>(`${API_URL}/catalogo/categorias`));}
 trabajadores(filtros:{categoria?:number;zona?:string}={}){let params:Record<string,string>={};if(filtros.categoria)params['categoria']=String(filtros.categoria);if(filtros.zona)params['zona']=filtros.zona;return firstValueFrom(this.http.get<Trabajador[]>(`${API_URL}/trabajadores`,{params}));}
 crearSolicitud(dto:unknown){return firstValueFrom(this.http.post<{id:number;estado:string}>(`${API_URL}/solicitudes`,dto));}
 misSolicitudes(){return firstValueFrom(this.http.get<Solicitud[]>(`${API_URL}/solicitudes/mias`));}
 disponibles(){return firstValueFrom(this.http.get<Solicitud[]>(`${API_URL}/solicitudes/disponibles`));}
 propuestas(id:number){return firstValueFrom(this.http.get<Propuesta[]>(`${API_URL}/propuestas/solicitud/${id}`));}
 ofrecer(id:number,dto:unknown){return firstValueFrom(this.http.post(`${API_URL}/propuestas/solicitud/${id}`,dto));}
 aceptar(id:number){return firstValueFrom(this.http.patch(`${API_URL}/propuestas/${id}/aceptar`,{}));}
 misOfertas(){return firstValueFrom(this.http.get<Propuesta[]>(`${API_URL}/propuestas/mias`));}
 miPerfilTecnico(){return firstValueFrom(this.http.get<PerfilTrabajador>(`${API_URL}/trabajadores/mi-perfil`));}
 guardarPerfil(dto:unknown){return firstValueFrom(this.http.patch(`${API_URL}/trabajadores/mi-perfil`,dto));}
 pendientes(){return firstValueFrom(this.http.get<{id:number;nombre:string;email:string;zona:string;experiencia:string;categoria:string}[]>(`${API_URL}/trabajadores/pendientes`));}
 aprobar(id:number){return firstValueFrom(this.http.patch(`${API_URL}/trabajadores/${id}/aprobar`,{}));}
}
