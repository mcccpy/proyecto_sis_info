import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  private services: Service[] = [];

  create(createServiceDto: CreateServiceDto): Service {
    const newService: Service = {
      id: crypto.randomUUID(),
      ...createServiceDto,
      isActive: createServiceDto.isActive?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.services.push(newService);
    return newService;
  }

  findAll(): Service[] {
    return this.services;
  }

  findOne(id: string): Service {
    const service = this.services.find((s) => s.id === id);
    if (!service) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
    return service;
  }
}