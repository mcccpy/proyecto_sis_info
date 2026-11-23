import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Identifica los participantes de una asignación manual de rol. */
export class AsignarRevocarRolDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_admin!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_usuario!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_rol!: number;
}
