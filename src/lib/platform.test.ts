import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeEndpoint } from "./endpoint";
import {
  bulkTabsNoteFor,
  defaultEndpointFor,
  endpointHintFor,
  endpointPlaceholderFor,
  openTabFromPopup,
  platformFromOs,
} from "./platform";

afterEach(() => vi.unstubAllGlobals());

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

describe("opening tabs from the popup", () => {
  it("closes the full-screen popup on android so the new tab is visible", async () => {
    const create = vi.fn(async () => ({}));
    vi.stubGlobal("browser", { tabs: { create } });
    const close = vi.fn();
    await openTabFromPopup("https://grimoire.example.com/settings/", "android", close);
    expect(create).toHaveBeenCalledWith({ url: "https://grimoire.example.com/settings/" });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("leaves popup dismissal to the browser on desktop", async () => {
    const create = vi.fn(async () => ({}));
    vi.stubGlobal("browser", { tabs: { create } });
    const close = vi.fn();
    await openTabFromPopup("http://127.0.0.1:3210/settings/", "desktop", close);
    expect(create).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
  });

  it("keeps the popup open when the tab could not be created", async () => {
    vi.stubGlobal("browser", { tabs: { create: vi.fn(async () => { throw new Error("blocked"); }) } });
    const close = vi.fn();
    await expect(openTabFromPopup("https://x.example/", "android", close)).rejects.toThrow("blocked");
    expect(close).not.toHaveBeenCalled();
  });
});
