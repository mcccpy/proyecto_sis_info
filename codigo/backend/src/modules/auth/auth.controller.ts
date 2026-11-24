import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { UsuarioAutenticado } from './jwt-token.service';
import { LoginDto } from './login.dto';
import { Public } from './auth.decorators';
import { CambiarModoRolDto } from '../usuario/dto/cambiar-modo-rol.dto';

type RequestAutenticada = {
  usuarioAutenticado: UsuarioAutenticado;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  iniciarSesion(@Body() credenciales: LoginDto) {
    return this.authService.iniciarSesion(credenciales);
  }

  @Get('perfil')
  obtenerPerfil(@Req() request: RequestAutenticada) {
    return this.authService.obtenerPerfil(request.usuarioAutenticado.sub);
  }

  @Post('rol')
  cambiarRol(@Req() request: RequestAutenticada, @Body() datos: CambiarModoRolDto) {
    return this.authService.cambiarRolActivo(
      request.usuarioAutenticado.sub,
      datos.rol_objetivo,
    );
  }
}
