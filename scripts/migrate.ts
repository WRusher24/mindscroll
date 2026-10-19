import "./env";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { connectionConfig } from "../lib/db/connection";

async function main() {
  const [url, options] = connectionConfig(process.env.DATABASE_URL, { max: 1 });
  const client = postgres(url, options);
  await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await client.end();
  console.log("✔ Migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
