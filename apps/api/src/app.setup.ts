import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import type { Env } from './config/env.validation.js';

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService<Env, true>);

  app.enableCors({
    origin: configService.getOrThrow('FRONTEND_ORIGIN', { infer: true }),
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
