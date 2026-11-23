import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoriaDto } from './create-categoria.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdateCategoriaDto extends PartialType(CreateCategoriaDto) {}
