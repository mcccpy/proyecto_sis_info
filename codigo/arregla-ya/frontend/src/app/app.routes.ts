import { Routes } from '@angular/router';
import { InicioComponent } from './pages/inicio.component';
import { AuthComponent } from './pages/auth.component';
import { ClienteComponent } from './pages/cliente.component';
import { TrabajadorComponent } from './pages/trabajador.component';
import { VisitasJoelComponent } from './pages/visitas-joel.component';
import { AdministradorComponent } from './pages/administrador.component';
export const routes:Routes=[
 {path:'',component:InicioComponent},
 {path:'registro',component:AuthComponent,data:{modo:'registro'}},
 {path:'ingresar',component:AuthComponent,data:{modo:'ingresar'}},
 {path:'cliente',component:ClienteComponent},
 {path:'trabajador',component:TrabajadorComponent},
 {path:'visitas',component:VisitasJoelComponent},
 {path:'administrador',component:AdministradorComponent},
 {path:'**',redirectTo:''}
];
