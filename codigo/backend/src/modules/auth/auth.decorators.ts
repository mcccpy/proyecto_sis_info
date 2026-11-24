import { SetMetadata } from '@nestjs/common';
import type { RolActivo } from './jwt-token.service';

export const PUBLIC_ROUTE_KEY = 'public-route';
export const ROLES_KEY = 'roles';

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
export const Roles = (...roles: RolActivo[]) => SetMetadata(ROLES_KEY, roles);
