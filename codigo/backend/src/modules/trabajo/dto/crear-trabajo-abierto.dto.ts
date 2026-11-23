import { Type } from 'class-transformer';
import {
  ArrayMinSize,
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

/** Datos para publicar una solicitud abierta en el marketplace. */
export class CrearTrabajoAbiertoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_cliente!: number;

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

  @Type(() => Number)
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  categorias!: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentoTrabajoItemDto)
  documentos?: DocumentoTrabajoItemDto[];
}
