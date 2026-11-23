import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

/** Datos para crear una especialidad desde el panel administrativo. */
export class CrearCategoriaAdminDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_admin!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;
}
