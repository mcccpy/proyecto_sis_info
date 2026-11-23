import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Identifica la categoría y el trabajo de una asignación administrativa. */
export class CategoriaTrabajoAdminDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_admin!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_trabajo!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_categoria!: number;
}
