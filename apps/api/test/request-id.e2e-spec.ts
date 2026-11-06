import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createE2eApp } from './helpers/create-e2e-app.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Request id (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
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
