import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/chess_mentor_ai?schema=public'),
  JWT_SECRET: z.string().default('dev-secret-change-me'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional()
});

export const env = EnvSchema.parse(process.env);
