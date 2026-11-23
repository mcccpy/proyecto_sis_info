import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}
