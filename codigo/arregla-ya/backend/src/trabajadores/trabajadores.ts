import { Body, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria, PerfilTrabajador, Rol, Usuario } from '../entities';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/auth';
export class PerfilDto {
 @IsString() @Length(3,500) experiencia!:string;
 @IsString() @Length(2,100) zona!:string;
 @IsString() @Length(3,150) disponibilidad!:string;
 @IsInt() @Min(1) categoriaId!:number;
}
@Injectable() export class TrabajadoresService {
 constructor(@InjectRepository(PerfilTrabajador) private profiles:Repository<PerfilTrabajador>,@InjectRepository(Categoria) private categories:Repository<Categoria>) {}
 async lista(categoria?:number,zona?:string){
  const query=this.profiles.createQueryBuilder('p').leftJoinAndSelect('p.usuario','u').leftJoinAndSelect('p.categoria','c').where('p.aprobado = true');
  if(categoria) query.andWhere('c.id=:id',{id:categoria});
  if(zona) query.andWhere('LOWER(p.zona) LIKE LOWER(:zona)',{zona:`%${zona}%`});
  const rows=await query.getMany();
  return rows.map(p=>({id:p.usuario.id,nombre:p.usuario.nombre,categoria:p.categoria?.nombre||'Sin categoría',zona:p.zona,disponibilidad:p.disponibilidad,experiencia:p.experiencia}));
 }
 async miPerfil(usuarioId:number){return this.profiles.findOne({where:{usuario:{id:usuarioId}},relations:{categoria:true}});}
 async actualizar(usuarioId:number,dto:PerfilDto){
  const profile=await this.miPerfil(usuarioId); if(!profile) throw new NotFoundException('Perfil no encontrado');
  const category=await this.categories.findOneBy({id:dto.categoriaId});if(!category) throw new NotFoundException('Categoría inexistente');
  profile.experiencia=dto.experiencia;profile.zona=dto.zona;profile.disponibilidad=dto.disponibilidad;profile.categoria=category;
  await this.profiles.save(profile);return this.miPerfil(usuarioId);
 }
 async pendientes(){const rows=await this.profiles.find({where:{aprobado:false},relations:{usuario:true,categoria:true}});return rows.map(p=>({id:p.usuario.id,nombre:p.usuario.nombre,email:p.usuario.email,experiencia:p.experiencia,zona:p.zona,categoria:p.categoria?.nombre||'Sin categoría'}));}
 async aprobar(userId:number){const p=await this.profiles.findOne({where:{usuario:{id:userId}}});if(!p) throw new NotFoundException('Trabajador no encontrado');if(!p.experiencia||!p.zona||!p.categoria) throw new ForbiddenException('El trabajador debe completar su perfil antes de ser aprobado');p.aprobado=true;await this.profiles.save(p);return {ok:true,id:userId};}
}
@Controller('trabajadores') export class TrabajadoresController {
 constructor(private service:TrabajadoresService){}
 @Get() lista(@Req() req:any){const url=new URL(req.url, 'http://local');const categoria=Number(url.searchParams.get('categoria')||0);return this.service.lista(categoria||undefined,url.searchParams.get('zona')||undefined);}
 @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Rol.TRABAJADOR) @Get('mi-perfil') miPerfil(@Req() req:any){return this.service.miPerfil(req.user.sub);}
 @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Rol.TRABAJADOR) @Patch('mi-perfil') actualizar(@Req() req:any,@Body() dto:PerfilDto){return this.service.actualizar(req.user.sub,dto);}
 @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Rol.ADMIN) @Get('pendientes') pendientes(){return this.service.pendientes();}
 @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Rol.ADMIN) @Patch(':id/aprobar') aprobar(@Param('id',ParseIntPipe) id:number){return this.service.aprobar(id);}
}
