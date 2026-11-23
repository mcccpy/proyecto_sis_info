import { PartialType } from '@nestjs/mapped-types';
import { CreateZonaReparadorDto } from './create-zona-reparador.dto';

/** Permite actualizar solo los campos de cobertura que hayan cambiado. */
export class UpdateZonaReparadorDto extends PartialType(
  CreateZonaReparadorDto,
) {}
