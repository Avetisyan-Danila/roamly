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

  it('returns errors in a unified format', async () => {
    // Guard error: Nest's original body has no error field
    const response = await request(app.getHttpServer())
      .get('/users/me')
      .expect(401);

    expect(response.body).toEqual({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Unauthorized',
    });
  });

  it('/amenities (GET)', () => {
    return request(app.getHttpServer())
      .get('/amenities')
      .expect(200)
      .expect([]);
  });
});
