import { Type } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

/** Datos para agendar una visita de un servicio con un intervalo definido. */
export class CreateVisitaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_usuario!: number;

  @IsDateString()
  fecha_inicio!: string;

  @IsDateString()
  fecha_fin!: string;
}
