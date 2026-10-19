import type { Options } from "postgres";

/**
 * Prepares a Postgres connection string + driver options for both local Postgres and Neon.
 *
 *  - `channel_binding` (added by Neon's copy-paste connection strings) is not understood by postgres.js,
 *    which would forward it to the server as a runtime parameter and fail the handshake, so it is removed.
 *  - Neon's pooled endpoint is PgBouncer in transaction mode, which does not support prepared statements.
 *  - TLS is required for everything except loopback connections.
 */
export function connectionConfig(rawUrl: string | undefined, overrides: Options<Record<string, never>> = {}): [string, Options<Record<string, never>>] {
  if (!rawUrl) throw new Error("DATABASE_URL is not set");
  const url = new URL(rawUrl);
  url.searchParams.delete("channel_binding");
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  if (local) url.searchParams.delete("sslmode");
  return [url.toString(), { prepare: false, ssl: local ? false : "require", ...overrides }];
}
