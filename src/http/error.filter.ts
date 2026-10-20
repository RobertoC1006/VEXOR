import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter, Logger } from '@nestjs/common';
import { NoResultError } from 'kysely';
import { AccessDeniedError, UnsafeConnectionError } from '../database/database.js';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import type { Response } from 'express';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger=new Logger('HTTP');
  catch(error:unknown,host:ArgumentsHost) {
    const response=host.switchToHttp().getResponse<Response>();
    const request=host.switchToHttp().getRequest<AuthenticatedRequest>();
    let status=500;let code='ERROR_INTERNO';let message:string|string[]='No se pudo completar la operación';
    if(error instanceof HttpException) {
      status=error.getStatus();const payload=error.getResponse();
      message=typeof payload==='string'?payload:(payload as {message?:string|string[]}).message??message;
      code=`HTTP_${status}`;
    } else if(error instanceof AccessDeniedError) {status=403;code='ACCESO_DENEGADO';message=error.message;
    } else if(error instanceof NoResultError) {status=404;code='NO_ENCONTRADO';message='Recurso no encontrado en este negocio';
    } else {
      const pg=error as {code?:string;type?:string};
      if(pg?.code==='42501') {status=403;code='ACCESO_DENEGADO';message='No tienes permiso para esta operación';}
      else if(['23505','23514'].includes(pg?.code??'')) {status=409;code='CONFLICTO';message='La operación entra en conflicto con un registro o una regla vigente';}
      else if(['23503','23502','22P02','22007','22008'].includes(pg?.code??'')) {status=400;code='DATOS_INVALIDOS';message='Datos o referencias no válidos para este negocio';}
      else if(['40001','40P01'].includes(pg?.code??'')) {status=409;code='REINTENTAR';message='Hubo un cambio simultáneo; vuelve a intentar la operación';}
      else if(pg?.code?.startsWith('08') || ['57014','57P01','57P02','57P03','53300','ECONNREFUSED','ECONNRESET','ETIMEDOUT','EHOSTUNREACH','ENOTFOUND'].includes(pg?.code??'')) {status=503;code='NO_DISPONIBLE';message='Servicio temporalmente no disponible';}
      else if(pg?.type==='entity.too.large') {status=413;code='CUERPO_DEMASIADO_GRANDE';message='La solicitud supera el límite permitido';}
      else if(pg?.type==='entity.parse.failed') {status=400;code='JSON_INVALIDO';message='JSON inválido';}
    }
    if(status>=500) this.logger.error({requestId:request.requestId,code,
      category:error instanceof UnsafeConnectionError?'CONEXION_PRIVILEGIADA':'ERROR_SERVICIO'});
    response.status(status).json({statusCode:status,error:{code,message},requestId:request.requestId});
  }
}
