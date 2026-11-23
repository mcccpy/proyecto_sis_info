import { PartialType } from '@nestjs/mapped-types';
import { CreatePropuestaDto } from './create-propuesta.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdatePropuestaDto extends PartialType(CreatePropuestaDto) {}
