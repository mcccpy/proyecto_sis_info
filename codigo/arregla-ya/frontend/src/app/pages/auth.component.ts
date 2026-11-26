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

  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  esRegistro = this.route.snapshot.data['modo'] === 'registro';

  nombre = '';
  email = '';
  password = '';
  rol: Rol = 'CLIENTE';

  // Solo campos esenciales visibles para el técnico
  experienciaAnios = 2;
  categoriasTexto = '1';
  zonaEtiqueta = 'Zona Central';

  // Valores técnicos por defecto para cumplir con el DTO sin saturar el formulario
  private readonly latitudDefecto = -17.3895;
  private readonly longitudDefecto = -66.1568;
  private readonly radioGoodDefecto = 1000;
  private readonly radioMedioDefecto = 3000;
  private readonly radioBadDefecto = 6000;
  private readonly diaSemanaDefecto = 1;
  private readonly horaInicioDefecto = '08:00';
  private readonly horaFinDefecto = '18:00';
  private readonly tipoDocumentoDefecto = 'CI';
  private readonly ubicacionArchivoDefecto = 'documento-identidad.pdf';

  error = signal('');
  cargando = signal(false);

  async enviar() {

    if (this.cargando()) {
      return;
    }

    this.error.set('');

    this.nombre = this.nombre.trim();
    this.email = this.email.trim();

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

    let perfil_reparador: unknown = undefined;
    let documentos: unknown = undefined;

    if (this.esRegistro && this.rol === 'TRABAJADOR') {
      const categorias = this.categoriasTexto
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1);

      const exp = Number(this.experienciaAnios);

      if (!Number.isInteger(exp) || exp < 0 || exp > 100) {
        this.error.set('Los años de experiencia deben ser un número entre 0 y 100.');
        return;
      }

      if (categorias.length === 0) {
        this.error.set('Ingresa al menos un ID de categoría válido (ej. 1).');
        return;
      }

      perfil_reparador = {
        experiencia_anios: exp,
        categorias,
        zonas: [
          {
            etiqueta: this.zonaEtiqueta.trim() || 'Zona principal',
            latitud: this.latitudDefecto,
            longitud: this.longitudDefecto,
            radio_good: this.radioGoodDefecto,
            radio_medio: this.radioMedioDefecto,
            radio_bad: this.radioBadDefecto,
          },
        ],
        disponibilidades: [
          {
            dia_semana: this.diaSemanaDefecto,
            hora_inicio: this.horaInicioDefecto,
            hora_fin: this.horaFinDefecto,
          },
        ],
      };

      documentos = [
        {
          tipo_documento: this.tipoDocumentoDefecto,
          ubucacion_archivo: this.ubicacionArchivoDefecto,
          url_y_n: false,
        },
      ];
    }

    this.cargando.set(true);

    try {

      const respuesta = this.esRegistro
        ? await this.auth.registro({
            nombre: this.nombre,
            email: this.email,
            password: this.password,
            rol: this.rol,
            perfil_reparador,
            documentos,
          })
        : await this.auth.login({
            email: this.email,
            password: this.password
          });

      let destino = '/cliente';

      if (respuesta.usuario.rol === 'TRABAJADOR') {
        destino = '/trabajador';
      }

      if (respuesta.usuario.rol === 'ADMIN') {
        destino = '/administrador';
      }

      await this.router.navigateByUrl(destino);

    } catch (e) {

      this.error.set(mensajeError(e));

    } finally {

      this.cargando.set(false);

    }
  }
}
