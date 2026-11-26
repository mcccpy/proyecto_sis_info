import { PartialType } from '@nestjs/mapped-types';
import { CreateTrabajoDto } from './create-trabajo.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdateTrabajoDto extends PartialType(CreateTrabajoDto) {}
