import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRequestDto } from './dto/create-request.dto';
import { Request, RequestStatus } from './entities/request.entity';

@Injectable()
export class RequestsService {
  private requests: Request[] = [];

  create(createRequestDto: CreateRequestDto): Request {
    const newRequest: Request = {
      id: crypto.randomUUID(),
      ...createRequestDto,
      status: RequestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.requests.push(newRequest);
    return newRequest;
  }

  findAll(): Request[] {
    return this.requests;
  }

  findOne(id: string): Request {
    const request = this.requests.find((r) => r.id === id);
    if (!request) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }
    return request;
  }
}