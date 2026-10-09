import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

import type { Env } from '../config/env.validation.js';

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
}
