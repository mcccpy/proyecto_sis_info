import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/** Datos para abrir un reclamo sobre un servicio. */
export class CrearReclamoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_servicio!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_usuario!: number;

  @IsString()
  @IsNotEmpty()
  motivo!: string;
}

export { CrearReclamoDto as CreateReclamoDto };
