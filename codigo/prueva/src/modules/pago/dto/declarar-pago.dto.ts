import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Datos que declara el cliente para dejar constancia de un pago. */
export class DeclararPagoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_cliente!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_servicio!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9_999_999_999.99)
  monto!: number;

  @IsIn(['efectivo', 'qr', 'transferencia'])
  metodo!: 'efectivo' | 'qr' | 'transferencia';

  @IsString()
  @IsNotEmpty()
  comprobante_url!: string;
}
