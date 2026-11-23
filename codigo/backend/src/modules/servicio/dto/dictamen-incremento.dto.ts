import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

/** Dictamen administrativo para un incremento pendiente. */
export class DictamenIncrementoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_admin!: number;

  @IsIn(['aprobado', 'rechazado'])
  estado_aprobacion!: 'aprobado' | 'rechazado';
}
