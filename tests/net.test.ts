import { describe, expect, it } from "vitest";
import { assertPublicUrl, isPrivateAddress } from "@/lib/net";

describe("SSRF protection", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"])("flags %s as private", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"])("allows public address %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  it("rejects unsafe URLs before any request is made", async () => {
    await expect(assertPublicUrl("http://localhost:3000/x")).rejects.toThrow();
    await expect(assertPublicUrl("http://127.0.0.1/")).rejects.toThrow();
    await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow();
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(assertPublicUrl("https://user:pw@example.com/")).rejects.toThrow();
    await expect(assertPublicUrl("http://[::1]/")).rejects.toThrow();
  });
});
