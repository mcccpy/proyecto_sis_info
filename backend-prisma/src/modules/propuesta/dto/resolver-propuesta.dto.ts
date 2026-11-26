import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Identifica al cliente dueño del trabajo que decide sobre una propuesta. */
export class ResolverPropuestaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_cliente!: number;
}
