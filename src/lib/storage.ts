import type { ConnectionConfig } from "./types";
import { normalizeEndpoint } from "./endpoint";

const CONNECTION_KEY = "connection-v1";
const MIGRATION_KEY = "legacy-sync-migration-v1";
const SETUP_ENDPOINT_DRAFT_KEY = "setup-endpoint-draft-v1";

export async function getConnection(): Promise<ConnectionConfig | null> {
  const values = await browser.storage.local.get(CONNECTION_KEY);
  return (values[CONNECTION_KEY] as ConnectionConfig | undefined) ?? null;
}

export async function setConnection(connection: ConnectionConfig): Promise<void> {
  await browser.storage.local.set({ [CONNECTION_KEY]: connection });
}

export async function clearConnection(): Promise<void> {
  await browser.storage.local.remove(CONNECTION_KEY);
}

function decodePlasmoValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export async function migrateLegacySyncStorage(): Promise<ConnectionConfig | null> {
  const local = await browser.storage.local.get([CONNECTION_KEY, MIGRATION_KEY]);
  if (local[CONNECTION_KEY]) {
    await browser.storage.sync.remove(["configuration", "token"]);
    return local[CONNECTION_KEY] as ConnectionConfig;
  }
  if (local[MIGRATION_KEY]) return null;

  const legacy = await browser.storage.sync.get(["configuration", "token"]);
  const configuration = decodePlasmoValue(legacy.configuration) as
    | { grimoireApiUrl?: unknown }
    | undefined;
  const rawEndpoint = typeof configuration?.grimoireApiUrl === "string"
    ? configuration.grimoireApiUrl.trim()
    : "";
  const decodedToken = decodePlasmoValue(legacy.token);
  const token = typeof decodedToken === "string" ? decodedToken.trim() : "";

  let endpoint = "";
  try {
    if (rawEndpoint) endpoint = normalizeEndpoint(rawEndpoint);
  } catch {
    // Invalid old configuration cannot be reused safely. The user can reconnect.
  }

  const migrated = endpoint && token
    ? { endpoint, token, protocol: "legacy" as const }
    : null;

  await browser.storage.local.set({
    [MIGRATION_KEY]: true,
    ...(migrated ? { [CONNECTION_KEY]: migrated } : {}),
  });
  if (legacy.configuration !== undefined || legacy.token !== undefined) {
    await browser.storage.sync.remove(["configuration", "token"]);
  }
  return migrated;
}

/**
 * The address typed during setup, kept while the user leaves the popup to
 * create a token (Firefox for Android closes the popup to show that tab).
 * Only an address is stored; tokens and passwords never are.
 */
export async function getSetupEndpointDraft(): Promise<string> {
  const values = await browser.storage.local.get(SETUP_ENDPOINT_DRAFT_KEY);
  const draft = values[SETUP_ENDPOINT_DRAFT_KEY];
  return typeof draft === "string" ? draft : "";
}

export async function setSetupEndpointDraft(endpoint: string): Promise<void> {
  await browser.storage.local.set({ [SETUP_ENDPOINT_DRAFT_KEY]: endpoint });
}

export async function clearSetupEndpointDraft(): Promise<void> {
  await browser.storage.local.remove(SETUP_ENDPOINT_DRAFT_KEY);
}
