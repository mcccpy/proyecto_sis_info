import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/** Datos requeridos para registrar una nota técnica de reparador. */
export class CrearNotaTecnicaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_usuario!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_servicio!: number;

  @IsString()
  @IsNotEmpty()
  detalle!: string;
}
