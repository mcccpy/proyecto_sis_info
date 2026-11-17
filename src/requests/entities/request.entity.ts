export enum RequestStatus {
  PENDING = 'Pendiente',
  IN_PROGRESS = 'En_Progreso',
  COMPLETED = 'Completado',
  CANCELLED = 'Cancelado',
}

export class Request {
  id: string;
  userId: string;
  serviceId: string;
  status: RequestStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}