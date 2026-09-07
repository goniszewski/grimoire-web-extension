import { afterEach, describe, expect, it, vi } from "vitest";
import { migrateLegacySyncStorage } from "./storage";

afterEach(() => vi.unstubAllGlobals());

function installStorage(initialLocal: Record<string, unknown>, initialSync: Record<string, unknown>) {
  const local = { ...initialLocal };
  const sync = { ...initialSync };
  const area = (values: Record<string, unknown>) => ({
    get: vi.fn(async (keys: string | string[]) => {
      const requested = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(requested.filter((key) => key in values).map((key) => [key, values[key]]));
    }),
    set: vi.fn(async (updates: Record<string, unknown>) => Object.assign(values, updates)),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete values[key];
    }),
  });
  const localArea = area(local);
  const syncArea = area(sync);
  vi.stubGlobal("browser", { storage: { local: localArea, sync: syncArea } });
  return { local, sync, localArea, syncArea };
}

describe("legacy storage migration", () => {
  it("copies the 0.1.3 connection locally and removes its synchronized token", async () => {
    const state = installStorage({}, {
      configuration: JSON.stringify({ grimoireApiUrl: "https://legacy.example.test/api/" }),
      token: JSON.stringify("legacy-session"),
    });

    await expect(migrateLegacySyncStorage()).resolves.toEqual({
      endpoint: "https://legacy.example.test/api",
      protocol: "legacy",
      token: "legacy-session",
    });
    expect(state.local["connection-v1"]).toMatchObject({ protocol: "legacy" });
    expect(state.local["legacy-sync-migration-v1"]).toBe(true);
    expect(state.sync).not.toHaveProperty("token");
    expect(state.sync).not.toHaveProperty("configuration");
  });

  it("does not retain a synchronized token when old configuration is invalid", async () => {
    const state = installStorage({}, {
      configuration: JSON.stringify({ grimoireApiUrl: "javascript:alert(1)" }),
      token: JSON.stringify("legacy-session"),
    });

    await expect(migrateLegacySyncStorage()).resolves.toBeNull();
    expect(state.local).not.toHaveProperty("connection-v1");
    expect(state.local["legacy-sync-migration-v1"]).toBe(true);
    expect(state.sync).not.toHaveProperty("token");
  });

  it("removes a lingering synchronized token when a local connection already exists", async () => {
    const connection = { endpoint: "http://127.0.0.1:3210", protocol: "current", token: "current-token" };
    const state = installStorage({ "connection-v1": connection }, { token: "legacy-session" });

    await expect(migrateLegacySyncStorage()).resolves.toEqual(connection);
    expect(state.syncArea.remove).toHaveBeenCalledWith(["configuration", "token"]);
    expect(state.sync).not.toHaveProperty("token");
  });
});
