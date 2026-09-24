import { z } from 'zod';

const jwtDurationSchema = z
  .string()
  .regex(/^\d+[smhd]$/, 'Expected duration like 15m, 1h, 7d');

const envSchema = z.object({
  DATABASE_URL: z.url(),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: jwtDurationSchema.default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  FRONTEND_ORIGIN: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
