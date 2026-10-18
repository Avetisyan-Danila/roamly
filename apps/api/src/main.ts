import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { createOpenApiDocument } from './openapi/openapi.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, () => createOpenApiDocument(app));
  }

  await app.listen(3001);
}

await bootstrap();
