import { Type } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

// Permite crear la primera visita desde la interfaz para demostrar el flujo.
export class ProgramarVisitaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_servicio!: number;

  @IsDateString()
  fecha_inicio!: string;

  @IsDateString()
  fecha_fin!: string;
}
