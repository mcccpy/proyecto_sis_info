import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Campos editables del perfil profesional. */
export class UpdatePerfilTrabajadorDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  experiencia_anios?: number;
}
