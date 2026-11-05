import { BadRequestException, Body, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EstadoPropuesta, EstadoSolicitud, PerfilTrabajador, Propuesta, Rol, Usuario } from '../entities';
import { SolicitudesService } from '../solicitudes/solicitudes';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/auth';
export class PropuestaDto {
 @IsNumber({maxDecimalPlaces:2}) @Min(0.01) precio!:number;
 @IsNumber({maxDecimalPlaces:2}) @Min(0) costoVisita!:number;
 @IsBoolean() materialesIncluidos!:boolean;
 @IsString() @Length(2,1000) detalleMateriales!:string;
}
@Injectable() export class PropuestasService {
 constructor(@InjectRepository(Propuesta) private repo:Repository<Propuesta>,@InjectRepository(Usuario) private users:Repository<Usuario>,@InjectRepository(PerfilTrabajador) private profiles:Repository<PerfilTrabajador>,private jobs:SolicitudesService,private db:DataSource){}
 async enviar(id:number,workerId:number,dto:PropuestaDto){
  const p=await this.profiles.findOne({where:{usuario:{id:workerId}}});if(!p?.aprobado)throw new ForbiddenException('El trabajador aún no fue aprobado');
  const job=await this.jobs.findRaw(id);if(job.estado!==EstadoSolicitud.ACTIVA)throw new BadRequestException('La solicitud no está disponible');
  const existing=await this.repo.findOne({where:{solicitud:{id},trabajador:{id:workerId}}});if(existing)throw new BadRequestException('Ya presentaste una propuesta para esta solicitud');
  const worker=await this.users.findOneByOrFail({id:workerId});
  const offer=this.repo.create({solicitud:job,trabajador:worker,precio:dto.precio.toFixed(2),costoVisita:dto.costoVisita.toFixed(2),materialesIncluidos:dto.materialesIncluidos,detalleMateriales:dto.detalleMateriales});
  await this.repo.save(offer);return {id:offer.id,estado:offer.estado};
 }
 async porSolicitud(id:number,clientId:number){const job=await this.jobs.findRaw(id);if(job.cliente.id!==clientId)throw new ForbiddenException();const items=await this.repo.find({where:{solicitud:{id}},relations:{trabajador:true},order:{creadaEn:'DESC'}});return items.map(p=>({id:p.id,trabajador:{id:p.trabajador.id,nombre:p.trabajador.nombre},precio:p.precio,costoVisita:p.costoVisita,materialesIncluidos:p.materialesIncluidos,detalleMateriales:p.detalleMateriales,estado:p.estado}));}
 async aceptar(id:number,clientId:number){
  return this.db.transaction(async manager=>{
   const p=await manager.findOne(Propuesta,{where:{id},relations:{solicitud:{cliente:true}}});if(!p)throw new NotFoundException('Propuesta no encontrada');
   if(p.solicitud.cliente.id!==clientId)throw new ForbiddenException();
   if(p.solicitud.estado!==EstadoSolicitud.ACTIVA||p.estado!==EstadoPropuesta.PENDIENTE) throw new BadRequestException('La propuesta ya no puede aceptarse');
   await manager.createQueryBuilder().update(Propuesta).set({estado:EstadoPropuesta.RECHAZADA}).where('"solicitudId" = :id',{id:p.solicitud.id}).execute();
   p.estado=EstadoPropuesta.ACEPTADA;await manager.save(p);
   p.solicitud.estado=EstadoSolicitud.ASIGNADA;await manager.save(p.solicitud);
   return {id:p.id,estado:p.estado,solicitudEstado:p.solicitud.estado};
  });
 }
 async mias(workerId:number){const items=await this.repo.find({where:{trabajador:{id:workerId}},relations:{solicitud:true},order:{creadaEn:'DESC'}});return items.map(p=>({id:p.id,solicitud:p.solicitud.titulo,precio:p.precio,estado:p.estado}));}
}
@Controller('propuestas') export class PropuestasController {
 constructor(private service:PropuestasService){}
 @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Rol.TRABAJADOR) @Post('solicitud/:id') enviar(@Req() req:any,@Param('id',ParseIntPipe) id:number,@Body() dto:PropuestaDto){return this.service.enviar(id,req.user.sub,dto);}
 @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Rol.CLIENTE,Rol.EMPRESA) @Get('solicitud/:id') lista(@Req() req:any,@Param('id',ParseIntPipe) id:number){return this.service.porSolicitud(id,req.user.sub);}
 @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Rol.CLIENTE,Rol.EMPRESA) @Patch(':id/aceptar') aceptar(@Req() req:any,@Param('id',ParseIntPipe) id:number){return this.service.aceptar(id,req.user.sub);}
 @UseGuards(JwtAuthGuard,RolesGuard) @Roles(Rol.TRABAJADOR) @Get('mias') mias(@Req() req:any){return this.service.mias(req.user.sub);}
}
