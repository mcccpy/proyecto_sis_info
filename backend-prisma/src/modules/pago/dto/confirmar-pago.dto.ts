import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Identifica al reparador que confirma la recepción del pago declarado. */
export class ConfirmarPagoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_reparador!: number;
}
