import { PartialType } from '@nestjs/mapped-types';
import { CreateServicioDto } from './create-servicio.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdateServicioDto extends PartialType(CreateServicioDto) {}
