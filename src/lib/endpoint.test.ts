import { describe, expect, it } from "vitest";
import { browserIntegrationSettingsUrl, normalizeEndpoint, permissionPattern } from "./endpoint";

describe("endpoint handling", () => {
  it("normalizes paths without broadening the requested origin", () => {
    expect(normalizeEndpoint("http://127.0.0.1:3210/")).toBe("http://127.0.0.1:3210");
    expect(normalizeEndpoint("http://[::1]:3210/")).toBe("http://[::1]:3210");
    expect(normalizeEndpoint("http://grimoire.localhost:3210/")).toBe("http://grimoire.localhost:3210");
    expect(normalizeEndpoint("https://library.example.test/api/")).toBe("https://library.example.test/api");
    expect(permissionPattern("https://library.example.test/api")).toBe("https://library.example.test/*");
  });

  it("rejects unsupported schemes and embedded credentials", () => {
    expect(() => normalizeEndpoint("file:///tmp/grimoire")).toThrow(/http or https/);
    expect(() => normalizeEndpoint("https://user:secret@example.test/api")).toThrow(/credentials/);
    expect(() => normalizeEndpoint("http://library.example.test/api")).toThrow(/must use HTTPS/);
    expect(() => normalizeEndpoint("http://192.168.1.10:3210")).toThrow(/must use HTTPS/);
    expect(() => normalizeEndpoint("http://localhost.example.test:3210")).toThrow(/must use HTTPS/);
    expect(() => normalizeEndpoint("http://127.example.test:3210")).toThrow(/must use HTTPS/);
  });

  it("uses the frontend settings path instead of the colliding JSON API path", () => {
    expect(browserIntegrationSettingsUrl("http://127.0.0.1:3210/"))
      .toBe("http://127.0.0.1:3210/settings/");
  });
});
