import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import type { Env } from '../config/env.validation.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
}
