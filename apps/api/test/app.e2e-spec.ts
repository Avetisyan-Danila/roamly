import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    configureApp(app);

    await app.init();

    prisma = app.get(PrismaService);

    const configService = app.get(ConfigService);
    const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');

    const parsedDatabaseUrl = new URL(databaseUrl);

    if (
      parsedDatabaseUrl.pathname !== '/roamly_test' ||
      parsedDatabaseUrl.port !== '5433'
    ) {
      throw new Error(
        `Refusing to run e2e tests against unsafe database: ${parsedDatabaseUrl.host}${parsedDatabaseUrl.pathname}`,
      );
    }
  });

  beforeEach(async () => {
    await prisma.property.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.user.deleteMany();
    await prisma.amenity.deleteMany();
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
