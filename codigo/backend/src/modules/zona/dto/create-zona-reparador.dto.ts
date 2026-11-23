import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Describe un punto de cobertura y los tres radios de prioridad del reparador. */
export class CreateZonaReparadorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  etiqueta!: string;

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
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  radio_good!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  radio_medio!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  radio_bad!: number;
}
