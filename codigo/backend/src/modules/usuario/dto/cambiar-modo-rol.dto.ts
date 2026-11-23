import { IsIn } from 'class-validator';
import { RolUsuario } from '../rol-usuario.type';

/** Indica cuál de los roles habilitados debe quedar activo en la sesión. */
export class CambiarModoRolDto {
  @IsIn(['cliente', 'reparador'])
  rol_objetivo!: RolUsuario;
}
