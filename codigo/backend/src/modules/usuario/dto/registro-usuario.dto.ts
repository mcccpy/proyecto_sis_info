import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreatePerfilReparadorDto } from '../../perfil-trabajador/dto/create-perfil-reparador.dto';
import { RolUsuario } from '../rol-usuario.type';
import { DocumentoDto } from './documento.dto';

/** Datos base de una cuenta y los datos condicionales de su rol inicial. */
export class RegistroUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  telefono!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(['cliente', 'reparador'])
  rol_inicial!: RolUsuario;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentoDto)
  documentos?: DocumentoDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePerfilReparadorDto)
  perfil_reparador?: CreatePerfilReparadorDto;
}
