import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService, AuthService, mensajeError } from '../core/api';
import { Categoria, Rol } from '../core/models';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auth.component.html'
})

export class AuthComponent {

  auth = inject(AuthService);
  api = inject(ApiService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  esRegistro = this.route.snapshot.data['modo'] === 'registro';

  nombre = '';
  telefono = '';
  email = '';
  password = '';
  rol: Rol = 'CLIENTE';

  categorias = signal<Categoria[]>([]);
  experienciaAnios = 0;
  categoriaId = 0;
  zonaEtiqueta = '';
  latitud: number | null = null;
  longitud: number | null = null;
  radioGood = 1000;
  radioMedio = 3000;
  radioBad = 6000;
  diaSemana = 1;
  horaInicio = '08:00';
  horaFin = '18:00';
  documentoUrl = '';

  constructor() {
    void this.api.categorias().then(lista => this.categorias.set(lista)).catch(() => {});
  }

  error = signal('');
  cargando = signal(false);

  async enviar() {

    if (this.cargando()) {
      return;
    }

    this.error.set('');

    this.nombre = this.nombre.trim();
    this.email = this.email.trim();
    this.telefono = this.telefono.trim();

    if (this.esRegistro && this.nombre.length < 2) {
      this.error.set('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    if (this.email === '') {
      this.error.set('Debes ingresar tu correo.');
      return;
    }

    if (this.esRegistro && this.telefono.length < 5) {
      this.error.set('Ingresa un teléfono de contacto válido.');
      return;
    }

    if (this.password.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    let perfil_reparador: unknown = undefined;
    let documentos: unknown = undefined;

    if (this.esRegistro && this.rol === 'TRABAJADOR') {
      const categorias = [Number(this.categoriaId)].filter(n => Number.isInteger(n) && n > 0);

      const exp = Number(this.experienciaAnios);

      if (!Number.isInteger(exp) || exp < 0 || exp > 100) {
        this.error.set('Los años de experiencia deben ser un número entre 0 y 100.');
        return;
      }

      if (categorias.length === 0) {
        this.error.set('Selecciona una categoría.');
        return;
      }

      if (this.latitud === null || this.longitud === null ||
          !Number.isFinite(this.latitud) || !Number.isFinite(this.longitud) ||
          this.latitud < -90 || this.latitud > 90 ||
          this.longitud < -180 || this.longitud > 180) {
        this.error.set('Introduce coordenadas reales de tu zona de cobertura.');
        return;
      }
      if (!(this.radioGood > 0 && this.radioMedio > this.radioGood && this.radioBad > this.radioMedio)) {
        this.error.set('Los radios deben ser crecientes.');
        return;
      }
      if (!/^https?:\/\//i.test(this.documentoUrl.trim())) {
        this.error.set('Ingresa un enlace real al documento del trabajador.');
        return;
      }

      perfil_reparador = {
        experiencia_anios: exp,
        categorias,
        zonas: [
          {
            etiqueta: this.zonaEtiqueta.trim(),
            latitud: this.latitud,
            longitud: this.longitud,
            radio_good: this.radioGood,
            radio_medio: this.radioMedio,
            radio_bad: this.radioBad,
          },
        ],
        disponibilidades: [
          {
            dia_semana: this.diaSemana,
            hora_inicio: this.horaInicio,
            hora_fin: this.horaFin,
          },
        ],
      };

      documentos = [
        {
          tipo_documento: 'CI',
          ubucacion_archivo: this.documentoUrl.trim(),
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
            telefono: this.telefono,
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
