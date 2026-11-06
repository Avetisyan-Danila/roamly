import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { createOpenApiDocument } from './openapi/openapi.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  configureApp(app);

  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, () => createOpenApiDocument(app));
  }

  await app.listen(3001);
}

await bootstrap();
