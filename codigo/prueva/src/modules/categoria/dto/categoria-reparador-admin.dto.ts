import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Identifica la categoría y el reparador de una asignación administrativa. */
export class CategoriaReparadorAdminDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_admin!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_reparador!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_categoria!: number;
}
