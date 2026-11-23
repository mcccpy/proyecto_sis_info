import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Datos para crear un rol desde el panel administrativo. */
export class CrearRolAdminDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_admin!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  nombre!: string;
}
