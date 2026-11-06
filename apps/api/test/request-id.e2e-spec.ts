import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AmenitiesService } from '../src/amenities/amenities.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './helpers/create-e2e-app.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Request id (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createE2eApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates a unique request id for each request', async () => {
    const first = await request(app.getHttpServer()).get('/amenities');
    const second = await request(app.getHttpServer()).get('/amenities');

    expect(first.headers['x-request-id']).toMatch(UUID_PATTERN);
    expect(second.headers['x-request-id']).toMatch(UUID_PATTERN);
    expect(first.headers['x-request-id']).not.toBe(
      second.headers['x-request-id'],
    );
  });

  it('keeps a valid incoming request id', async () => {
    const response = await request(app.getHttpServer())
      .get('/amenities')
      .set('X-Request-Id', 'next-server_42');

    expect(response.headers['x-request-id']).toBe('next-server_42');
  });

  it('returns the request id on error responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/me')
      .expect(401);

    expect(response.headers['x-request-id']).toMatch(UUID_PATTERN);
  });

  it('returns the request id in the body of an internal server error', async () => {
    const findAllSpy = vi
      .spyOn(AmenitiesService.prototype, 'findAll')
      .mockRejectedValue(new Error('Unexpected failure'));

    try {
      const response = await request(app.getHttpServer())
        .get('/amenities')
        .expect(500);

      expect(response.body).toEqual({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Internal server error',
        requestId: response.headers['x-request-id'],
      });
    } finally {
      findAllSpy.mockRestore();
    }
  });

  it('tags SQL queries with the request id', async () => {
    let executedSql: string | undefined;

    const findAllSpy = vi
      .spyOn(AmenitiesService.prototype, 'findAll')
      .mockImplementation(async () => {
        const [row] = await prisma.$queryRaw<
          { query: string }[]
        >`SELECT current_query() AS query`;

        executedSql = row.query;

        return [];
      });

    try {
      await request(app.getHttpServer())
        .get('/amenities')
        .set('X-Request-Id', 'tagged-request')
        .expect(200);
    } finally {
      findAllSpy.mockRestore();
    }

    expect(executedSql).toContain("requestId='tagged-request'");
  });

  it.each([
    ['too long', 'a'.repeat(65)],
    ['with forbidden characters', 'id with spaces'],
  ])('replaces an incoming request id that is %s', async (_, incoming) => {
    const response = await request(app.getHttpServer())
      .get('/amenities')
      .set('X-Request-Id', incoming);

    expect(response.headers['x-request-id']).toMatch(UUID_PATTERN);
  });
});
