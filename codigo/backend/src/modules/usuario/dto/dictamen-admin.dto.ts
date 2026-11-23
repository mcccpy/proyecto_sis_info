import { IsIn, IsInt, Min } from 'class-validator';

/** Datos para aprobar o rechazar un documento de usuario. */
export class DictamenDocumentoDto {
  @IsInt()
  @Min(1)
  id_admin!: number;

  @IsIn(['aprobado', 'rechazado'])
  estado!: 'aprobado' | 'rechazado';
}

/** Datos para aprobar o rechazar el perfil de un reparador. */
export class DictamenReparadorDto {
  @IsInt()
  @Min(1)
  id_admin!: number;

  @IsIn(['aprobado', 'rechazado'])
  estado_aprobacion!: 'aprobado' | 'rechazado';
}
