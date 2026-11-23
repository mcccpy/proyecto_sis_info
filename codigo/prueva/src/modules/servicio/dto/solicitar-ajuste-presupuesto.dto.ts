import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Datos para proponer un cambio al precio vigente de un servicio. */
export class SolicitarAjustePresupuestoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_solicitante!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999_999.99)
  monto_anterior!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_999_999_999.99)
  monto_nuevo!: number;

  @IsString()
  @IsNotEmpty()
  motivo!: string;
}
