import { PartialType } from '@nestjs/mapped-types';
import { CrearCalificacionDto } from './create-calificacion.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdateCalificacionDto extends PartialType(CrearCalificacionDto) {}
