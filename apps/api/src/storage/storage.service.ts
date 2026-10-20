import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Env } from '../config/env.validation.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { InvalidPhotoException } from '../common/errors/exceptions.js';

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class StorageService {
  constructor(
    @Inject(S3Client)
    private readonly s3Client: S3Client,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async checkBucketAccess(): Promise<void> {
    const bucket = this.config.getOrThrow('S3_BUCKET', {
      infer: true,
    });

    await this.s3Client.send(
      new HeadBucketCommand({
        Bucket: bucket,
      }),
    );
  }

  async createUploadUrl(
    storageKey: string,
    contentType: string,
  ): Promise<string> {
    const bucket = this.config.getOrThrow('S3_BUCKET', {
      infer: true,
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: 300,
      signableHeaders: new Set(['content-type']),
    });
  }

  async readPhotoForValidation(storageKey: string): Promise<{
    buffer: Buffer;
    sizeBytes: number;
    contentType: string | undefined;
  }> {
    const bucket = this.config.getOrThrow('S3_BUCKET', {
      infer: true,
    });

    const metadata = await this.s3Client
      .send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: storageKey,
        }),
      )
      .catch((error: unknown) => {
        if (error instanceof NotFound) {
          throw new UnprocessableEntityException('Photo has not been uploaded');
        }

        throw error;
      });

    const sizeBytes = metadata.ContentLength;

    if (
      sizeBytes === undefined ||
      sizeBytes < 1 ||
      sizeBytes > MAX_PHOTO_SIZE_BYTES
    ) {
      throw new InvalidPhotoException('Invalid photo size');
    }

    const object = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Range: `bytes=0-${MAX_PHOTO_SIZE_BYTES}`,
      }),
    );

    if (!object.Body) {
      throw new InvalidPhotoException('Photo content is missing');
    }

    const buffer = Buffer.from(await object.Body.transformToByteArray());

    if (buffer.length !== sizeBytes) {
      throw new InvalidPhotoException('Photo size changed during validation');
    }

    return {
      buffer,
      sizeBytes: buffer.length,
      contentType: metadata.ContentType,
    };
  }

  async saveProcessedPhoto(storageKey: string, buffer: Buffer): Promise<void> {
    const bucket = this.config.getOrThrow('S3_BUCKET', {
      infer: true,
    });

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: 'image/webp',
      }),
    );
  }

  async deleteObject(storageKey: string): Promise<void> {
    const bucket = this.config.getOrThrow('S3_BUCKET', {
      infer: true,
    });

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      }),
    );
  }

  async createDownloadUrl(storageKey: string): Promise<string> {
    const bucket = this.config.getOrThrow('S3_BUCKET', {
      infer: true,
    });

    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      }),
      { expiresIn: 15 * 60 },
    );
  }
}
