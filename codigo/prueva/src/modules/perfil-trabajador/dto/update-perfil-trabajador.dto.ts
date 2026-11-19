import { PartialType } from '@nestjs/mapped-types';
import { CreatePerfilTrabajadorDto } from './create-perfil-trabajador.dto';

/** Permite enviar cambios parciales usando los campos del DTO de creacion. */
export class UpdatePerfilTrabajadorDto extends PartialType(
  CreatePerfilTrabajadorDto,
) {}
