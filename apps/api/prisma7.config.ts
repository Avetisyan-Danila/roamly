import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

config({ path: envFile });

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },

  datasource: {
    url: env('DATABASE_URL'),
  },
});
