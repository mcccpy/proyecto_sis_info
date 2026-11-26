import { PartialType } from '@nestjs/mapped-types';
import { CreatePagoDto } from './create-pago.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdatePagoDto extends PartialType(CreatePagoDto) {}
