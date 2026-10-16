import sharp from 'sharp';

import type {
  PropertyPhoto,
  PropertyPhotoUpload,
} from '../../src/generated/prisma/client.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import type { TestAgent } from '../helpers/auth.js';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../helpers/http.js';

export async function createDraft(agent: TestAgent): Promise<string> {
  const response = await agent
    .post('/properties/drafts')
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .expect(201);

  return response.body.id as string;
}

export function createTestImage(format: 'jpeg' | 'webp'): Promise<Buffer> {
  return sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: '#abcdef',
    },
  })
    .toFormat(format)
    .toBuffer();
}

interface PhotoUploadRequest {
  uploadUrl: string;
  upload: PropertyPhotoUpload;
}

export async function requestPhotoUpload(
  agent: TestAgent,
  prisma: PrismaService,
  propertyId: string,
  sizeBytes: number,
): Promise<PhotoUploadRequest> {
  const response = await agent
    .post(`/properties/drafts/${propertyId}/photos/upload-url`)
    .set(CSRF_HEADER, CSRF_HEADER_VALUE)
    .send({
      contentType: 'image/jpeg',
      sizeBytes,
    })
    .expect(201);

  const { uploadId, uploadUrl } = response.body as {
    uploadId: string;
    uploadUrl: string;
  };

  const upload = await prisma.propertyPhotoUpload.findUniqueOrThrow({
    where: { id: uploadId },
  });

  return { uploadUrl, upload };
}

export function uploadToStorage(
  uploadUrl: string,
  body: Buffer,
): Promise<Response> {
  return fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: new Uint8Array(body),
  });
}

export function seedPropertyPhotos(
  prisma: PrismaService,
  propertyId: string,
  count: number,
): Promise<PropertyPhoto[]> {
  return Promise.all(
    Array.from({ length: count }, (_, position) =>
      prisma.propertyPhoto.create({
        data: {
          propertyId,
          storageKey: `test/properties/${propertyId}/photo-${position}.webp`,
          contentType: 'image/webp',
          sizeBytes: 1024,
          position,
        },
      }),
    ),
  );
}
