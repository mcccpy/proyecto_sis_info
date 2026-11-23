import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Describe un documento de identidad que se almacenará para una cuenta. */
export class DocumentoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipo_documento!: string;

  @IsString()
  @IsNotEmpty()
  ubucacion_archivo!: string;

  @IsOptional()
  @IsBoolean()
  url_y_n?: boolean;
}
