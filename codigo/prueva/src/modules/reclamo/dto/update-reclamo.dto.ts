import { PartialType } from '@nestjs/mapped-types';
import { CreateReclamoDto } from './create-reclamo.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdateReclamoDto extends PartialType(CreateReclamoDto) {}
