import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from './../src/prisma/prisma.service.js';
import { createE2eApp } from './helpers/create-e2e-app.js';
import { resetDatabase } from './helpers/reset-database.js';
import { createAuthenticatedAgent, TestAgent } from './helpers/auth.js';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from './helpers/http.js';
import { createTestAmenities } from './fixtures/amenities.fixture.js';

describe('Properties (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let wifiId: string;

  beforeAll(async () => {
    const context = await createE2eApp();

    app = context.app;
    prisma = context.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    const amenities = await createTestAmenities(prisma);

    wifiId = amenities.wifi.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createDraft(agent: TestAgent) {
    return agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);
  }

  describe('POST /properties/drafts', () => {
    it('creates an empty draft for the authenticated owner', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const response = await createDraft(ownerAgent);

      const owner = await prisma.user.findUniqueOrThrow({
        where: {
          email: 'owner@example.com',
        },
      });

      expect(response.body).toMatchObject({
        ownerId: owner.id,
        status: 'DRAFT',
        title: null,
        description: null,
        pricePerNight: null,
        amenities: [],
      });

      expect(response.body.id).toEqual(expect.any(String));
    });

    it('returns 401 when the user is not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/properties/drafts')
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .expect(401);
    });

    it('returns 403 when CSRF protection header is missing', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      await ownerAgent.post('/properties/drafts').expect(403);
    });
  });

  describe('GET /properties/drafts/:id', () => {
    it('allows the owner to retrieve their draft', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const created = await createDraft(ownerAgent);
      const propertyId = created.body.id as string;

      const response = await ownerAgent
        .get(`/properties/drafts/${propertyId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: propertyId,
        status: 'DRAFT',
        title: null,
        amenities: [],
      });
    });

    it('returns 404 when another user requests the draft', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const anotherAgent = await createAuthenticatedAgent(app, {
        email: 'another@example.com',
      });

      const created = await createDraft(ownerAgent);
      const propertyId = created.body.id as string;

      await anotherAgent.get(`/properties/drafts/${propertyId}`).expect(404);
    });
  });

  describe('GET /properties/:id', () => {
    it('does not expose draft properties publicly', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const created = await createDraft(ownerAgent);
      const propertyId = created.body.id as string;

      await request(app.getHttpServer())
        .get(`/properties/${propertyId}`)
        .expect(404);
    });

    it('returns 404 when the property does not exist', async () => {
      const missingPropertyId = '00000000-0000-4000-8000-000000000001';

      await request(app.getHttpServer())
        .get(`/properties/${missingPropertyId}`)
        .expect(404);
    });
  });

  describe('PATCH /properties/drafts/:id', () => {
    it('allows the owner to update their draft', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const created = await createDraft(ownerAgent);
      const propertyId = created.body.id as string;

      const response = await ownerAgent
        .patch(`/properties/drafts/${propertyId}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          title: 'Updated apartment in Madrid',
          maxGuests: 4,
          amenityIds: [wifiId],
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: propertyId,
        status: 'DRAFT',
        title: 'Updated apartment in Madrid',
        maxGuests: 4,
      });

      expect(response.body.amenities).toEqual([
        expect.objectContaining({
          id: wifiId,
          code: 'WIFI',
        }),
      ]);
    });

    it('returns 403 when another user tries to update the draft', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const anotherAgent = await createAuthenticatedAgent(app, {
        email: 'another@example.com',
      });

      const created = await createDraft(ownerAgent);
      const propertyId = created.body.id as string;

      await anotherAgent
        .patch(`/properties/drafts/${propertyId}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          title: 'Stolen apartment',
        })
        .expect(403);
    });

    it('returns 400 when the provided data is invalid', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const created = await createDraft(ownerAgent);
      const propertyId = created.body.id as string;

      await ownerAgent
        .patch(`/properties/drafts/${propertyId}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          maxGuests: -1,
        })
        .expect(400);
    });
  });

  describe('DELETE /properties/:id', () => {
    it('returns 403 when another user tries to delete the draft', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const anotherAgent = await createAuthenticatedAgent(app, {
        email: 'another@example.com',
      });

      const created = await createDraft(ownerAgent);
      const propertyId = created.body.id as string;

      await anotherAgent
        .delete(`/properties/${propertyId}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .expect(403);

      // Убеждаемся, что чужой пользователь не удалил объявление.
      await ownerAgent.get(`/properties/drafts/${propertyId}`).expect(200);
    });

    it('allows the owner to delete the draft', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const created = await createDraft(ownerAgent);
      const propertyId = created.body.id as string;

      await ownerAgent
        .delete(`/properties/${propertyId}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .expect(204);

      // После удаления черновик больше не существует.
      await ownerAgent.get(`/properties/drafts/${propertyId}`).expect(404);
    });
  });
});
