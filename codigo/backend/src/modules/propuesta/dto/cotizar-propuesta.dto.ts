import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Datos para ajustar la cotización de una propuesta pendiente. */
export class CotizarPropuestaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_reparador!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_999_999_999.99)
  precio_total!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999_999.99)
  costo_visita?: number;

  @IsBoolean()
  materiales_incluidos!: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  detalle_materiales?: string;
}
