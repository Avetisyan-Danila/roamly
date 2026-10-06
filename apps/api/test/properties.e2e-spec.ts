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
  let kitchenId: string;

  beforeAll(async () => {
    const context = await createE2eApp();

    app = context.app;
    prisma = context.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    const amenities = await createTestAmenities(prisma);

    wifiId = amenities.wifi.id;
    kitchenId = amenities.kitchen.id;
  });

  afterAll(async () => {
    await app.close();
  });

  function buildPropertyPayload(amenityIds: string[] = [wifiId, kitchenId]) {
    return {
      title: 'Cozy apartment in Madrid',
      description: 'Bright apartment close to Retiro Park',
      country: 'Spain',
      city: 'Madrid',
      address: 'Calle de Alcalá 100',
      latitude: 40.4203,
      longitude: -3.6817,
      pricePerNight: '120.50',
      currency: 'EUR',
      maxGuests: 4,
      bedrooms: 2,
      beds: 2,
      bathrooms: 1.5,
      amenityIds,
    };
  }

  async function createProperty(agent: TestAgent) {
    return agent
      .post('/properties')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .send(buildPropertyPayload())
      .expect(201);
  }

  describe('POST /properties', () => {
    it('creates a property for the authenticated owner', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const response = await createProperty(ownerAgent);

      const owner = await prisma.user.findUniqueOrThrow({
        where: {
          email: 'owner@example.com',
        },
      });

      expect(response.body).toMatchObject({
        ownerId: owner.id,
        title: 'Cozy apartment in Madrid',
        city: 'Madrid',
        pricePerNight: '120.50',
        currency: 'EUR',
        maxGuests: 4,
      });

      expect(response.body.id).toEqual(expect.any(String));

      expect(response.body.amenities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: wifiId,
            code: 'WIFI',
            name: 'Wi-Fi',
          }),
          expect.objectContaining({
            id: kitchenId,
            code: 'KITCHEN',
            name: 'Kitchen',
          }),
        ]),
      );
    });

    it('returns 401 when the user is not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/properties')
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send(buildPropertyPayload())
        .expect(401);
    });

    it('returns 403 when CSRF protection header is missing', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      await ownerAgent
        .post('/properties')
        .send(buildPropertyPayload())
        .expect(403);
    });

    it('returns 400 when an amenity does not exist', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const missingAmenityId = '00000000-0000-4000-8000-000000000001';

      const response = await ownerAgent
        .post('/properties')
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send(buildPropertyPayload([wifiId, missingAmenityId]))
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'One or more amenities do not exist',
        missingAmenityIds: [missingAmenityId],
      });
    });

    it('does not allow the client to provide ownerId', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      await ownerAgent
        .post('/properties')
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          ...buildPropertyPayload(),
          ownerId: '00000000-0000-4000-8000-000000000001',
        })
        .expect(400);
    });
  });

  describe('GET /properties/:id', () => {
    it('returns a property publicly without authentication', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const createResponse = await createProperty(ownerAgent);

      const propertyId = createResponse.body.id as string;

      const response = await request(app.getHttpServer())
        .get(`/properties/${propertyId}`)
        .expect(200);

      expect(response.body).toEqual(createResponse.body);
    });

    it('returns 404 when the property does not exist', async () => {
      const missingPropertyId = '00000000-0000-4000-8000-000000000001';

      await request(app.getHttpServer())
        .get(`/properties/${missingPropertyId}`)
        .expect(404);
    });
  });

  describe('PATCH /properties/:id', () => {
    it('allows the owner to update the property', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const createResponse = await createProperty(ownerAgent);

      const propertyId = createResponse.body.id as string;

      const response = await ownerAgent
        .patch(`/properties/${propertyId}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          title: 'Updated apartment in Madrid',
          pricePerNight: '150.00',
          amenityIds: [wifiId],
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: propertyId,
        title: 'Updated apartment in Madrid',
        pricePerNight: '150.00',
      });

      expect(response.body.amenities).toEqual([
        expect.objectContaining({
          id: wifiId,
          code: 'WIFI',
        }),
      ]);
    });

    it('returns 403 when another user tries to update the property', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const anotherUserAgent = await createAuthenticatedAgent(app, {
        email: 'another@example.com',
      });

      const createResponse = await createProperty(ownerAgent);

      const propertyId = createResponse.body.id as string;

      await anotherUserAgent
        .patch(`/properties/${propertyId}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          title: 'Stolen apartment',
        })
        .expect(403);
    });
  });

  describe('DELETE /properties/:id', () => {
    it('returns 403 when another user tries to delete the property', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const anotherUserAgent = await createAuthenticatedAgent(app, {
        email: 'another@example.com',
      });

      const createResponse = await createProperty(ownerAgent);

      const propertyId = createResponse.body.id as string;

      await anotherUserAgent
        .delete(`/properties/${propertyId}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/properties/${propertyId}`)
        .expect(200);
    });

    it('allows the owner to delete the property', async () => {
      const ownerAgent = await createAuthenticatedAgent(app, {
        email: 'owner@example.com',
      });

      const createResponse = await createProperty(ownerAgent);

      const propertyId = createResponse.body.id as string;

      await ownerAgent
        .delete(`/properties/${propertyId}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/properties/${propertyId}`)
        .expect(404);
    });
  });
});
