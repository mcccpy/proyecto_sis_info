import { IsIn } from 'class-validator';

// Solo se puede aprobar o rechazar. El usuario se obtiene del token.
export class ResponderReprogramacionDto {
  @IsIn(['aprobar', 'rechazar'])
  decision!: 'aprobar' | 'rechazar';
}
