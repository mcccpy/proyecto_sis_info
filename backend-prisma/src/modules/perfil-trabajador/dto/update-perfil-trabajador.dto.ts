import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Campos editables del perfil profesional. */
export class UpdatePerfilTrabajadorDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  idUsuario?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoriaId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  zona?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  experiencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  disponibilidad?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  experiencia_anios?: number;
}
