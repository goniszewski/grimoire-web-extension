import { afterEach, describe, expect, it, vi } from "vitest";
import { capture, connectCurrent, discover, fetchTaxonomy, loginLegacy } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("protocol discovery", () => {
  it("distinguishes current and legacy health shapes without credentials", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok", version: "1.1.0" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ database: "CONNECTED", appVersion: "0.5.0" })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(discover("http://127.0.0.1:3210")).resolves.toEqual({ kind: "current", version: "1.1.0" });
    await expect(discover("https://legacy.example.test/api")).resolves.toEqual({ kind: "legacy", version: "0.5.0" });
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("headers");
  });

  it("requires the versioned capability response before saving a current token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { protocol: "grimoire-browser-capture", protocol_version: 1 },
    }))));
    await expect(connectCurrent("http://127.0.0.1:3210", "limp_it_test")).resolves.toEqual({
      endpoint: "http://127.0.0.1:3210",
      protocol: "current",
      token: "limp_it_test",
    });
  });

  it("loads current taxonomy only through the authenticated browser integration route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        categories: [{ id: "root", name: "Research", children: [{ id: "child", name: "Papers", children: [] }] }],
        tags: [{ id: "tag-1", name: "reference" }],
      },
    })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTaxonomy({
      endpoint: "http://127.0.0.1:3210",
      protocol: "current",
      token: "integration-token",
    })).resolves.toEqual({
      categories: [
        { id: "root", name: "Research", depth: 0 },
        { id: "child", name: "Papers", depth: 1 },
      ],
      tags: ["reference"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:3210/integrations/browser/v1/taxonomy",
    );
  });

  it("logs in and maps the Grimoire 0.5 taxonomy during the compatibility window", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, token: "legacy-session" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ categories: [{ id: 7, name: "Research", initial: true }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ tags: [{ id: 3, name: "reference" }] })));
    vi.stubGlobal("fetch", fetchMock);

    const connection = await loginLegacy("https://legacy.example.test/api", "wizard", "secret");
    await expect(fetchTaxonomy(connection)).resolves.toEqual({
      categories: [{ id: "7", name: "Research", depth: 0, initial: true }],
      tags: ["reference"],
    });
    expect(connection).toEqual({
      endpoint: "https://legacy.example.test/api",
      protocol: "legacy",
      token: "legacy-session",
    });
  });
});

describe("capture", () => {
  it("maps current captures and reports active duplicates honestly", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { bookmark: { id: "bookmark-1" }, created: false },
    })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(capture(
      { endpoint: "http://127.0.0.1:3210", protocol: "current", token: "secret" },
      { url: "https://example.com/?v=1#part", title: "Example", tags: ["reference"], notes: "Keep" },
    )).resolves.toEqual({ bookmarkId: "bookmark-1", created: false });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      url: "https://example.com/?v=1#part",
      notes: "Keep",
      source: { client: "grimoire-companion" },
    });
  });

  it("keeps the legacy payload available during the migration window", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ bookmark: { id: 42 } })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(capture(
      { endpoint: "https://legacy.example.test/api", protocol: "legacy", token: "session" },
      { url: "https://example.com", title: "Example", categoryId: "pb_category_7", tags: ["saved"], notes: "Legacy" },
    )).resolves.toEqual({ bookmarkId: "42", created: true });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      category: "pb_category_7",
      note: "Legacy",
      importance: 0,
    });
  });
});
