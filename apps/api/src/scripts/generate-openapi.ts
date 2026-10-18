import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module.js';
import { createOpenApiDocument } from '../openapi/openapi.js';

// Preview mode skips provider constructors and lifecycle hooks: no DB, S3 or cron
const app = await NestFactory.create(AppModule, {
  preview: true,
  logger: false,
});

const document = createOpenApiDocument(app);

await writeFile('openapi.json', `${JSON.stringify(document, null, 2)}\n`);

await app.close();
