import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { DisponibilidadDto } from './disponibilidad.dto';
import { CreateZonaReparadorDto } from '../../zona/dto/create-zona-reparador.dto';

/** Reúne categorías, cobertura geográfica y horarios de un reparador. */
export class CreatePerfilReparadorDto {
  @IsInt()
  @Min(0)
  @Max(100)
  experiencia_anios!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  categorias!: number[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CreateZonaReparadorDto)
  zonas!: CreateZonaReparadorDto[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DisponibilidadDto)
  disponibilidades!: DisponibilidadDto[];
}
