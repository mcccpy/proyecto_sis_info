import { Injectable } from '@nestjs/common';
import { db } from './db.js';

/** Expone el cliente de base de datos mediante la inyección de dependencias de Nest. */
@Injectable()
export class PrismaService {
  readonly db = db;
}
