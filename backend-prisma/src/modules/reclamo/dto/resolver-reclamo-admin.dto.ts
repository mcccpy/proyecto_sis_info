import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/** Datos para que un administrador registre una acción y actualice el reclamo. */
export class ResolverReclamoAdminDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_soporte!: number;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsIn(['en_revision', 'resuelto', 'rechazado'])
  estado!: 'en_revision' | 'resuelto' | 'rechazado';
}
