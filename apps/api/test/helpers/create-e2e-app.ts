import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export interface E2eContext {
  app: INestApplication;
  prisma: PrismaService;
}

export async function createE2eApp(): Promise<E2eContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  configureApp(app);

  await app.init();

  const prisma = app.get(PrismaService);
  const configService = app.get(ConfigService);

  const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');

  const parsedDatabaseUrl = new URL(databaseUrl);

  if (
    parsedDatabaseUrl.pathname !== '/roamly_test' ||
    parsedDatabaseUrl.port !== '5433'
  ) {
    await app.close();

    throw new Error(
      `Refusing to run e2e tests against unsafe database: ${parsedDatabaseUrl.host}${parsedDatabaseUrl.pathname}`,
    );
  }

  return {
    app,
    prisma,
  };
}
