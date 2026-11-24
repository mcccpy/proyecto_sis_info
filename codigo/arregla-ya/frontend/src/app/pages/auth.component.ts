
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService, mensajeError } from '../core/api';
import { Rol } from '../core/models';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auth.component.html'
})

export class AuthComponent {

  // ==========================================
  // 1. SERVICIOS QUE UTILIZAMOS
  // ==========================================

  // Servicio para registrar e iniciar sesion
  auth = inject(AuthService);

  // Servicio para cambiar de pagina
  router = inject(Router);

  // Servicio para saber en que pagina estamos
  route = inject(ActivatedRoute);


  // ==========================================
  // 2. SABER SI ES REGISTRO O INICIO DE SESION
  // ==========================================

  // Si estamos en /registro, sera verdadero
  // Si estamos en /ingresar, sera falso
  esRegistro = this.route.snapshot.data['modo'] === 'registro';


  // ==========================================
  // 3. DATOS DEL FORMULARIO
  // ==========================================

  nombre = '';
  email = '';
  password = '';

  // Por defecto, la cuenta sera de cliente
  rol: Rol = 'CLIENTE';


  // ==========================================
  // 4. MENSAJES Y ESTADO DEL BOTON
  // ==========================================

  // Guarda los mensajes de error
  error = signal('');

  // Indica si se esta procesando el formulario
  cargando = signal(false);


  // ==========================================
  // 5. REGISTRARSE O INICIAR SESION
  // ==========================================

  async enviar() {

    // Evita enviar dos veces el formulario
    if (this.cargando()) {
      return;
    }

    // Limpiamos los mensajes anteriores
    this.error.set('');

    // Quitamos espacios innecesarios
    this.nombre = this.nombre.trim();
    this.email = this.email.trim();

    // Verificamos los datos basicos
    if (this.esRegistro && this.nombre.length < 2) {
      this.error.set('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    if (this.email === '') {
      this.error.set('Debes ingresar tu correo.');
      return;
    }

    if (this.password.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    // Desactivamos el boton mientras se procesa
    this.cargando.set(true);

    try {

      // Si es registro, creamos la cuenta.
      // Si no es registro, iniciamos sesion.
      const respuesta = this.esRegistro
        ? await this.auth.registro({
            nombre: this.nombre,
            email: this.email,
            password: this.password,
            rol: this.rol
          })
        : await this.auth.login({
            email: this.email,
            password: this.password
          });


      // ======================================
      // 6. REDIRIGIR SEGUN EL TIPO DE USUARIO
      // ======================================

      // Por defecto, enviamos al area de clientes
      let destino = '/cliente';

      // Si es trabajador, va a su seccion
      if (respuesta.usuario.rol === 'TRABAJADOR') {
        destino = '/trabajador';
      }

      // Si es administrador, va a su seccion
      if (respuesta.usuario.rol === 'ADMIN') {
        destino = '/administrador';
      }

      // Cambiamos a la pagina correspondiente
      await this.router.navigateByUrl(destino);

    } catch (e) {

      // Si ocurre un error, lo mostramos
      this.error.set(mensajeError(e));

    } finally {

      // Volvemos a activar el boton
      this.cargando.set(false);

    }
  }
}
