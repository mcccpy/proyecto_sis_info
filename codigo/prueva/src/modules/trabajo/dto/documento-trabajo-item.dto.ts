import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Describe un archivo opcional adjunto a una solicitud de trabajo. */
export class DocumentoTrabajoItemDto {
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
