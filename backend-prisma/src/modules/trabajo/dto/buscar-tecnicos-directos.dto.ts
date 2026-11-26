import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Coordenadas y filtros opcionales para encontrar técnicos con cobertura. */
export class BuscarTecnicosDirectosDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  id_categoria?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;
}
