import { capture, captureMany, ClientError, connectCurrent, discover, fetchTaxonomy, loginLegacy } from "../src/lib/client";
import { clearConnection, getConnection, migrateLegacySyncStorage, setConnection } from "../src/lib/storage";
import type { BackgroundRequest, BackgroundResponse } from "../src/lib/types";

const MAX_BATCH_SIZE = 500;

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void migrateLegacySyncStorage();
  });

  browser.runtime.onMessage.addListener(async (message: BackgroundRequest): Promise<BackgroundResponse> => {
    try {
      if (message.type === "discover") return { ok: true, data: await discover(message.endpoint) };
      if (message.type === "connect-current") {
        const connection = await connectCurrent(message.endpoint, message.token);
        await setConnection(connection);
        return { ok: true, data: connection };
      }
      if (message.type === "login-legacy") {
        const connection = await loginLegacy(message.endpoint, message.login, message.password);
        await setConnection(connection);
        return { ok: true, data: connection };
      }
      if (message.type === "disconnect") {
        await clearConnection();
        return { ok: true };
      }

      const connection = await migrateLegacySyncStorage() ?? await getConnection();
      if (!connection) return { ok: false, code: "not-connected", detail: "Connect Grimoire first" };
      if (message.type === "taxonomy") return { ok: true, data: await fetchTaxonomy(connection) };
      if (message.type === "capture") return { ok: true, data: await capture(connection, message.draft) };
      if (message.type === "capture-many") {
        if (message.drafts.length === 0 || message.drafts.length > MAX_BATCH_SIZE) {
          return { ok: false, code: "validation", detail: `Select between 1 and ${MAX_BATCH_SIZE} tabs` };
        }
        return { ok: true, data: await captureMany(connection, message.drafts) };
      }
      return { ok: false, code: "unsupported", detail: "Unsupported request" };
    } catch (error) {
      if (error instanceof ClientError) {
        return { ok: false, code: error.code, detail: error.message, status: error.status };
      }
      return { ok: false, code: "unexpected", detail: error instanceof Error ? error.message : "Unexpected error" };
    }
  });
});
