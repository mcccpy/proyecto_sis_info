import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Identifica al reparador que solicita retirar una postulación pendiente. */
export class RetirarPropuestaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_reparador!: number;
}
