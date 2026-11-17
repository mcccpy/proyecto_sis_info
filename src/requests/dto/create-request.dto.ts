import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRequestDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsString()
  @IsNotEmpty()
  notes?: string;
}