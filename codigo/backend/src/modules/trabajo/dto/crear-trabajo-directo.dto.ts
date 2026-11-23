import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DocumentoTrabajoItemDto } from './documento-trabajo-item.dto';

/** Datos para crear una solicitud dirigida a un técnico aprobado. */
export class CrearTrabajoDirectoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_cliente!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_reparador!: number;

  @IsString()
  @IsNotEmpty()
  direccion!: string;

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

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsDateString()
  fecha_preferida!: string;

  @IsOptional()
  @Type(() => Number)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  categorias?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentoTrabajoItemDto)
  documentos?: DocumentoTrabajoItemDto[];
}
