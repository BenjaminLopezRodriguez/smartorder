import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  connUrl: string | undefined;
};

const shouldReuse =
  !!globalForDb.conn && globalForDb.connUrl === env.DATABASE_URL;
const conn = shouldReuse ? globalForDb.conn! : postgres(env.DATABASE_URL);

if (env.NODE_ENV !== "production") globalForDb.conn = conn;
if (env.NODE_ENV !== "production") globalForDb.connUrl = env.DATABASE_URL;

export const db = drizzle(conn, { schema });

export type DbTransaction = Parameters<
  Parameters<(typeof db)["transaction"]>[0]
>[0];
