import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

/** Dictamen administrativo sobre un pago declarado o confirmado. */
export class DictamenPagoAdminDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_admin!: number;

  @IsIn(['aprobado', 'rechazado'])
  estado!: 'aprobado' | 'rechazado';
}
