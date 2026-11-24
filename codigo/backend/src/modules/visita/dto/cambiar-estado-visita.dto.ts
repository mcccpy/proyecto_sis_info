import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

/** Identifica al participante y el nuevo estado final de una visita. */
export class CambiarEstadoVisitaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_usuario!: number;

  @IsIn(['cancelada'])
  estado!: 'cancelada';
}
