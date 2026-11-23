import { PartialType } from '@nestjs/mapped-types';
import { CreateVisitaDto } from './create-visita.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdateVisitaDto extends PartialType(CreateVisitaDto) {}
