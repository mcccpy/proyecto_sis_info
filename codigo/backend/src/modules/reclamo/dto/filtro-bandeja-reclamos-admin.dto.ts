import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

/** Filtros para la bandeja administrativa de reclamos. */
export class FiltroBandejaReclamosAdminDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_admin!: number;

  @IsOptional()
  @IsIn(['abierto', 'en_revision', 'resuelto', 'rechazado'])
  estado?: 'abierto' | 'en_revision' | 'resuelto' | 'rechazado';
}
