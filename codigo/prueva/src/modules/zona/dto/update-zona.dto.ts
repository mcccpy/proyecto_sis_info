import { PartialType } from '@nestjs/mapped-types';
import { CreateZonaDto } from './create-zona.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdateZonaDto extends PartialType(CreateZonaDto) {}
