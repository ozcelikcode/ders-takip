import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

export const backendDirectory = path.resolve(__dirname, '..', '..');

const secretSchema = z.string().min(32).refine(
  (value) => !/^(your-|change-|example)/i.test(value),
  'Replace example values with a randomly generated secret',
);

export const durationInSeconds = (value: string): number => Number(value.slice(0, -1)) * ({ s: 1, m: 60, h: 3600, d: 86400 }[value.slice(-1)] || 0);

// `KEY=` lines copied from .env.example mean "not set", not an invalid empty value.
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5002),
  JWT_SECRET: secretSchema,
  JWT_EXPIRE: z.string().regex(/^[1-9]\d{0,5}[smhd]$/).refine(value => durationInSeconds(value) <= 900, 'Access lifetime must not exceed 15 minutes').default('15m'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  DB_PATH: z.string().min(1).default('database.sqlite'),
  BACKUP_DIR: z.string().min(1).default('backups'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(12).max(16).default(12),
  FRONTEND_URL: z.url({ protocol: /^https?$/ }).default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  // Optional SMTP delivery for password reset mail; without SMTP_HOST and MAIL_FROM an
  // administrator issues reset links from the user list instead.
  SMTP_HOST: optional(z.string().min(1)),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  SMTP_USER: optional(z.string().min(1)),
  SMTP_PASS: optional(z.string().min(1)),
  MAIL_FROM: optional(z.string().min(3).max(200)),
  // Optional Web Push (VAPID). `npm run push:keys` adds a pair to backend/.env; without them push is off.
  VAPID_PUBLIC_KEY: optional(z.string().min(1)),
  VAPID_PRIVATE_KEY: optional(z.string().min(1)),
  VAPID_SUBJECT: optional(z.string().regex(/^(mailto:|https:\/\/)/)),
})
.refine(value => !value.VAPID_PUBLIC_KEY === !value.VAPID_PRIVATE_KEY && (!value.VAPID_PUBLIC_KEY || !!value.VAPID_SUBJECT), { path: ['VAPID_PUBLIC_KEY'], message: 'Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT together' }).refine(value => value.NODE_ENV !== 'production' || new URL(value.FRONTEND_URL).protocol === 'https:', { path: ['FRONTEND_URL'], message: 'Production browser origin must use HTTPS' });

export const parseEnvironment = (source: NodeJS.ProcessEnv) => environmentSchema.parse(source);
export type Environment = ReturnType<typeof parseEnvironment>;
let environment: Environment | undefined;

export const getEnvironment = (): Environment => {
  if (!environment) {
    if (process.env.NODE_ENV !== 'test') {
      dotenv.config({ path: path.join(backendDirectory, '.env') });
    }
    const result = environmentSchema.safeParse(process.env);
    if (!result.success) {
      // Never include environment values in diagnostics.
      const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Invalid environment configuration:\n${details.join('\n')}`);
    }
    environment = result.data;
  }
  return environment;
};
