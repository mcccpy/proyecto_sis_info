import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { RolActivo } from './jwt-token.service';

/** Credenciales para iniciar una sesión de API. */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password!: string;

  @IsOptional()
  @IsIn(['cliente', 'reparador', 'administrador'])
  rol_activo?: RolActivo;
}
