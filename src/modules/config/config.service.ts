import { Injectable } from '@nestjs/common';
import { parse } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import z from 'zod';

export const appConfigSchema = z.object({
  BOT_TOKEN: z.string(),
  BNB_RPC: z.string(),
  SEPOLIA_RPC: z.string(),
  POLYGON_RPC: z.string(),
  PORT: z.coerce.number(),
  DB_NAME: z.string(),
  DB_HOST: z.string(),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_PORT: z.coerce.number(),
  GRAPH_API_KEY: z.string(),
});

export type AppConfig = z.TypeOf<typeof appConfigSchema>;

@Injectable()
export class ConfigService {
  public appConfig: AppConfig;

  constructor() {
    this.appConfig = parseEnv();
  }
}

export const parseEnv = () => {
  const isDev = process.env.NODE_ENV === 'development';
  const devEnvPath = join(process.cwd(), '.env');
  const env = isDev ? parse(readFileSync(devEnvPath)) : process.env;
  return appConfigSchema.parse(env);
};
