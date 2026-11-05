import { Controller, Get, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../entities';
@Injectable() export class CatalogoService implements OnApplicationBootstrap {
 constructor(@InjectRepository(Categoria) private repo:Repository<Categoria>){}
 async onApplicationBootstrap(){for(const nombre of ['Plomería','Electricidad','Albañilería','Electrodomésticos','Pintura']) {await this.repo.createQueryBuilder().insert().into(Categoria).values({nombre}).orIgnore().execute();}}
 todas(){return this.repo.find({order:{nombre:'ASC'}});}
}
@Controller('catalogo') export class CatalogoController {constructor(private service:CatalogoService){} @Get('categorias') todas(){return this.service.todas();}}
