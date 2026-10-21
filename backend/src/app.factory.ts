import 'reflect-metadata';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app.module.js';
import { ErrorFilter } from './compartido/http/error.filter.js';
import type { AppConfig } from './compartido/config.js';

export async function createApp(config: AppConfig, quiet = false) {
  const app = await NestFactory.create(AppModule.register(config), {
    bodyParser: false,
    logger: quiet ? false : ['error', 'warn', 'log'],
  });
  app.setGlobalPrefix('api/v1');
  app.use((req: Request & { requestId: string }, res: Response, next: NextFunction) => {
    const supplied = req.headers['x-request-id'];
    req.requestId =
      typeof supplied === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(supplied)
        ? supplied
        : randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  app.use(helmet());
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || config.origins.includes(origin)) callback(null, true);
      else callback(new ForbiddenException('Origen no permitido'));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  });
  app.use(express.json({ limit: '32kb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new ErrorFilter());
  if (!config.production) {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('VEXOR — núcleo').setVersion('1').addBearerAuth().build(),
    );
    SwaggerModule.setup('docs', app, doc);
  }
  app.enableShutdownHooks();
  return app;
}
