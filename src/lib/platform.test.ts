import { describe, expect, it } from "vitest";
import { normalizeEndpoint } from "./endpoint";
import {
  bulkTabsNoteFor,
  defaultEndpointFor,
  endpointHintFor,
  endpointPlaceholderFor,
  platformFromOs,
} from "./platform";

describe("platform handling", () => {
  it("treats only android as the mobile platform", () => {
    expect(platformFromOs("android")).toBe("android");
    expect(platformFromOs("mac")).toBe("desktop");
    expect(platformFromOs("win")).toBe("desktop");
    expect(platformFromOs("linux")).toBe("desktop");
    expect(platformFromOs(undefined)).toBe("desktop");
  });

  it("keeps the desktop loopback default and hint-free setup", () => {
    expect(defaultEndpointFor("desktop")).toBe("http://127.0.0.1:3210");
    expect(endpointHintFor("desktop")).toBeNull();
    expect(bulkTabsNoteFor("desktop")).toBeNull();
  });

  it("does not prefill loopback on android and explains why", () => {
    expect(defaultEndpointFor("android")).toBe("");
    expect(endpointHintFor("android")).toMatch(/HTTPS/);
    expect(endpointHintFor("android")).toMatch(/this phone/);
    expect(bulkTabsNoteFor("android")).toMatch(/some of your open tabs/);
  });

  it("suggests an android placeholder the endpoint rules accept", () => {
    expect(normalizeEndpoint(endpointPlaceholderFor("android"))).toBe("https://grimoire.example.com");
    expect(normalizeEndpoint(endpointPlaceholderFor("desktop"))).toBe("http://127.0.0.1:3210");
  });
});
