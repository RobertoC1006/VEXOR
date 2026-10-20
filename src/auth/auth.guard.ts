import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import type { Actor } from '../database/database.service.js';
import type { Request } from 'express';

export const Public = () => SetMetadata('public',true);
export type AuthenticatedRequest = Request & {actor:Actor;requestId:string};
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector:Reflector,private readonly auth:AuthService) {}
  async canActivate(context:ExecutionContext) {
    if(this.reflector.getAllAndOverride('public',[context.getHandler(),context.getClass()])) return true;
    const request=context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header=request.headers.authorization;
    const match=header && header.length<=8192 ? /^Bearer ([^\s]+)$/i.exec(header) : null;
    if(!match) throw new UnauthorizedException('Envía Authorization: Bearer <token>');
    request.actor=await this.auth.verify(match[1]);
    return true;
  }
}
