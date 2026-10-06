import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from './../src/prisma/prisma.service.js';
import { createE2eApp } from './helpers/create-e2e-app.js';
import { resetDatabase } from './helpers/reset-database.js';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const context = await createE2eApp();

    app = context.app;
    prisma = context.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/amenities (GET)', () => {
    return request(app.getHttpServer())
      .get('/amenities')
      .expect(200)
      .expect([]);
  });
});
