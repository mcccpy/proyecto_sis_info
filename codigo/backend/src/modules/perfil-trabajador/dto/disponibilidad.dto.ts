import { IsInt, Matches, Max, Min } from 'class-validator';

/** Representa un intervalo de trabajo para un día de la semana. */
export class DisponibilidadDto {
  @IsInt()
  @Min(1)
  @Max(7)
  dia_semana!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  hora_inicio!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  hora_fin!: string;
}
