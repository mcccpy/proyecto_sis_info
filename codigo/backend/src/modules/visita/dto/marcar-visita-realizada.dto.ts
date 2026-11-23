import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Identifica al reparador que ejecutó una visita programada. */
export class MarcarVisitaRealizadaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_reparador!: number;
}
