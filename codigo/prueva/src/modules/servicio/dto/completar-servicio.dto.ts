import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Identifica al reparador que solicita cerrar el servicio. */
export class CompletarServicioDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_reparador!: number;
}
