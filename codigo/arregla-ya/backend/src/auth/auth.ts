import { BadRequestException, Body, CanActivate, ConflictException, Controller, ExecutionContext, ForbiddenException, Get, Injectable, Post, UnauthorizedException, UseGuards, SetMetadata, Req } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { Rol, Usuario, PerfilTrabajador } from '../entities';
export class RegistroDto {
 @IsString() @Length(2,120) nombre!: string;
 @IsEmail() email!: string;
 @IsString() @Length(8,72) password!: string;
 @IsEnum(Rol) rol!: Rol;
}
export class LoginDto { @IsEmail() email!: string; @IsString() password!: string; }
export interface JwtUsuario { sub:number; rol:Rol; email:string; }
export const Roles = (...roles:Rol[]) => SetMetadata('roles',roles);
@Injectable()
export class JwtAuthGuard implements CanActivate {
 constructor(private jwt:JwtService) {}
 async canActivate(ctx:ExecutionContext):Promise<boolean> {
  const request=ctx.switchToHttp().getRequest();
  const header=request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new UnauthorizedException('Debes iniciar sesión');
  try {request.user=await this.jwt.verifyAsync<JwtUsuario>(header.slice(7));return true;}
  catch {throw new UnauthorizedException('Sesión inválida o vencida');}
 }
}
@Injectable()
export class RolesGuard implements CanActivate {
 constructor(private reflector:Reflector) {}
 canActivate(ctx:ExecutionContext) {
  const roles=this.reflector.getAllAndOverride<Rol[]>('roles',[ctx.getHandler(),ctx.getClass()]);
  if (!roles?.length) return true;
  const user=ctx.switchToHttp().getRequest().user as JwtUsuario | undefined;
  if (!user || !roles.includes(user.rol)) throw new ForbiddenException('No tienes permiso para esta acción');
  return true;
 }
}
@Injectable()
export class AuthService {
 constructor(@InjectRepository(Usuario) private users:Repository<Usuario>,@InjectRepository(PerfilTrabajador) private profiles:Repository<PerfilTrabajador>, private jwt:JwtService) {}
 public userView(u:Usuario) {return {id:u.id,nombre:u.nombre,email:u.email,rol:u.rol};}
 async registro(dto:RegistroDto){
  if (dto.rol===Rol.ADMIN) throw new ForbiddenException('No se permite crear administradores por registro público');
  const email=dto.email.trim().toLowerCase();
  if(await this.users.exist({where:{email}})) throw new ConflictException('Este correo ya está registrado');
  const user=await this.users.save(this.users.create({nombre:dto.nombre.trim(),email,rol:dto.rol,passwordHash:await bcrypt.hash(dto.password,12)}));
  if(user.rol===Rol.TRABAJADOR) await this.profiles.save(this.profiles.create({usuario:user,aprobado:false}));
  return this.loginResponse(user);
 }
 async login(dto:LoginDto){
  const user=await this.users.createQueryBuilder('u').addSelect('u.passwordHash').where('LOWER(u.email) = :email',{email:dto.email.trim().toLowerCase()}).getOne();
  if(!user||!await bcrypt.compare(dto.password,user.passwordHash)) throw new UnauthorizedException('Correo o contraseña incorrectos');
  return this.loginResponse(user);
 }
 private async loginResponse(user:Usuario) {return {token:await this.jwt.signAsync({sub:user.id,rol:user.rol,email:user.email}),usuario:this.userView(user)};}
 async perfil(id:number){const user=await this.users.findOneBy({id});if(!user) throw new UnauthorizedException();return this.userView(user);}
}
@Controller('auth') export class AuthController {
 constructor(private auth:AuthService) {}
 @Post('registro') registro(@Body() dto:RegistroDto) {return this.auth.registro(dto);}
 @Post('login') login(@Body() dto:LoginDto){return this.auth.login(dto);}
 @UseGuards(JwtAuthGuard) @Get('perfil') perfil(@Req() req:any) {return this.auth.perfil(req.user.sub);}
}
