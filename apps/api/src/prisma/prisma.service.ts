import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { queryTags } from '@prisma/sqlcommenter-query-tags';
import { PrismaClient } from '../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.validation.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(configService: ConfigService<Env, true>) {
    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow('DATABASE_URL', {
        infer: true,
      }),
    });

    super({ adapter, comments: [queryTags()] });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
