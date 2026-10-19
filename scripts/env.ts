import { config } from "dotenv";

// Same files, same precedence as Next.js: .env.local overrides .env. Real environment variables always win.
config({ path: [".env.local", ".env"], quiet: true });
