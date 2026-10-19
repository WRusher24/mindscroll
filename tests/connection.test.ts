import { describe, expect, it } from "vitest";
import { connectionConfig } from "@/lib/db/connection";

describe("connectionConfig", () => {
  it("strips Neon's channel_binding parameter that postgres.js would send to the server", () => {
    const [url, options] = connectionConfig("postgresql://u:p@ep-cool-123-pooler.us-east-2.aws.neon.tech/db?sslmode=require&channel_binding=require");
    expect(url).not.toContain("channel_binding");
    expect(url).toContain("sslmode=require");
    expect(options.ssl).toBe("require");
    expect(options.prepare).toBe(false);
  });

  it("disables TLS for loopback databases", () => {
    const [url, options] = connectionConfig("postgresql://postgres@localhost:5432/mindscroll?sslmode=disable");
    expect(options.ssl).toBe(false);
    expect(url).not.toContain("sslmode");
  });

  it("requires a URL", () => {
    expect(() => connectionConfig(undefined)).toThrow(/DATABASE_URL/);
  });
});
