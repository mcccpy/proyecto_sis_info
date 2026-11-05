import 'reflect-metadata';import 'dotenv/config';
import { NestFactory } from '@nestjs/core';import { DataSource } from 'typeorm';import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';import { Rol,Usuario } from './entities';
async function main(){
 const email=process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();const password=process.env.SEED_ADMIN_PASSWORD;
 if(!email||!password||password.length<10||password.startsWith('CAMBIAR'))throw Error('Configura SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (mínimo 10 caracteres) en .env');
 const app=await NestFactory.createApplicationContext(AppModule);
 try {const repo=app.get(DataSource).getRepository(Usuario);const existing=await repo.findOneBy({email});
 if(existing){console.log('Ya existe una cuenta con ese correo; no se modificó.');return;}
 await repo.save(repo.create({nombre:'Administrador demo',email,rol:Rol.ADMIN,passwordHash:await bcrypt.hash(password,12)}));console.log('Administrador creado. No compartas la contraseña.');
 }finally{await app.close();}
}
main().catch(e=>{console.error(e);process.exit(1)});
