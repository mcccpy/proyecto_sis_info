import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/** Identifica al participante y el motivo de una cancelación. */
export class CancelarServicioDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_usuario!: number;

  @IsString()
  @IsNotEmpty()
  motivo!: string;
}
