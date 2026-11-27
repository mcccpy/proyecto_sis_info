import { IsDateString, IsString, Length } from 'class-validator';

// Datos escritos por el cliente o el trabajador al solicitar un cambio.
export class SolicitarReprogramacionDto {
  @IsDateString()
  fecha_inicio!: string;

  @IsDateString()
  fecha_fin!: string;

  @IsString()
  @Length(5, 500)
  motivo!: string;
}
