import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Identifica al administrador que solicita una consulta del panel. */
export class ConsultaAdminDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_admin!: number;
}

/** Filtros de solicitudes de inscripción de reparadores. */
export class FiltroModeracionReparadoresDto extends ConsultaAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  busqueda?: string;

  @IsOptional()
  @IsIn(['pendiente', 'aprobado', 'rechazado'])
  estado_aprobacion?: 'pendiente' | 'aprobado' | 'rechazado';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo_documento?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}

/** Filtros de documentos pertenecientes a usuarios con rol cliente. */
export class FiltroDocumentosClientesDto extends ConsultaAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  busqueda?: string;

  @IsOptional()
  @IsIn(['pendiente', 'aprobado', 'rechazado'])
  estado?: 'pendiente' | 'aprobado' | 'rechazado';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo_documento?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}

/** Filtros de documentos adjuntos a trabajos y sus clientes. */
export class FiltroDocumentosTrabajosDto extends ConsultaAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  busqueda?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  id_trabajo?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  id_cliente?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo_documento?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}
