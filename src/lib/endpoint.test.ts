import { describe, expect, it } from "vitest";
import { normalizeEndpoint, permissionPattern } from "./endpoint";

describe("endpoint handling", () => {
  it("normalizes paths without broadening the requested origin", () => {
    expect(normalizeEndpoint("http://127.0.0.1:3210/")).toBe("http://127.0.0.1:3210");
    expect(normalizeEndpoint("https://library.example.test/api/")).toBe("https://library.example.test/api");
    expect(permissionPattern("https://library.example.test/api")).toBe("https://library.example.test/*");
  });

  it("rejects unsupported schemes and embedded credentials", () => {
    expect(() => normalizeEndpoint("file:///tmp/grimoire")).toThrow(/http or https/);
    expect(() => normalizeEndpoint("https://user:secret@example.test/api")).toThrow(/credentials/);
  });
});
