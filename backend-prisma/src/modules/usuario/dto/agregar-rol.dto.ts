import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { CreatePerfilReparadorDto } from '../../perfil-trabajador/dto/create-perfil-reparador.dto';
import { RolUsuario } from '../rol-usuario.type';
import { DocumentoDto } from './documento.dto';

/** Datos para habilitar un segundo rol y, si aplica, completar el perfil reparador. */
export class AgregarRolDto {
  @IsIn(['cliente', 'reparador'])
  nuevo_rol!: RolUsuario;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePerfilReparadorDto)
  perfil_reparador?: CreatePerfilReparadorDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentoDto)
  documentos?: DocumentoDto[];
}
