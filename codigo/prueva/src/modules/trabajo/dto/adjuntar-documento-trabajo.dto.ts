import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

/** Datos usados para compartir evidencia dentro de un trabajo. */
export class AdjuntarDocumentoTrabajoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_usuario!: number;

  @IsString()
  @IsNotEmpty()
  tipo_documento!: string;

  @IsString()
  @IsNotEmpty()
  archivo_url!: string;
}
