import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { connectionConfig } from "./connection";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __pg?: ReturnType<typeof postgres> };

function createClient() {
  const [url, options] = connectionConfig(process.env.DATABASE_URL, {
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  return postgres(url, options);
}

export function getClient() {
  if (!globalForDb.__pg) globalForDb.__pg = createClient();
  return globalForDb.__pg;
}

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** Lazily-created Drizzle instance so that importing this module never needs env vars (e.g. during `next build`). */
export function getDb() {
  if (!cached) cached = drizzle(getClient(), { schema });
  return cached;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_t, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
