import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from './contract.d.js';
import contractJson from './contract.json';

/** Convierte el contrato emitido a partir del modelo de Prisma en su forma tipada. */
export const contract = contractFromJson<Contract>(contractJson);

/** Cliente compartido que conecta la aplicación con PostgreSQL. */
export const db = postgres({
  contract,
  url: process.env['DATABASE_URL']!,
});
