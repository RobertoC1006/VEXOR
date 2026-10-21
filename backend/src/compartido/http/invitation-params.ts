import { ParseUUIDPipe, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ApiHeader } from '@nestjs/swagger';

export { BusinessId, ResourceId as Id } from './resource-params.js';
const IdempotencyParam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<Request>().headers['idempotency-key'],
);
export const Idempotency = () => IdempotencyParam(undefined, new ParseUUIDPipe());
export const IdempotencyDoc = () =>
  ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
    description: 'UUID estable para reintentar la misma solicitud',
  });
