import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DATABASE_URL_UNPOOLED: z.string().url().optional(),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  runtimeEnv: {
    DATABASE_URL:
      process.env.DATABASE_URL ??
      process.env.STORAGE_DATABASE_URL ??
      process.env.STORAGE_POSTGRES_URL,
    DATABASE_URL_UNPOOLED:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.STORAGE_DATABASE_URL_UNPOOLED ??
      process.env.STORAGE_POSTGRES_URL_NON_POOLING,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
