import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

/** Datos de una calificación que emite un cliente o administrador. */
export class CrearCalificacionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_servicio!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_evaluador!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_evaluado!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion!: number;

  @IsString()
  @IsNotEmpty()
  comentario!: string;
}

export { CrearCalificacionDto as CreateCalificacionDto };
