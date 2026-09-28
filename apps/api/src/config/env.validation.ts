import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive(),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  FRONTEND_ORIGIN: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
