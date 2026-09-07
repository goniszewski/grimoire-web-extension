import { normalizeEndpoint } from "./endpoint";
import type { BatchCaptureResult, CaptureDraft, CaptureResult, Category, ConnectionConfig, ConnectionState, Taxonomy } from "./types";

export class ClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

async function request(url: string, init: RequestInit = {}, timeoutMs = 5_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ClientError("timeout", "Grimoire did not respond in time");
    }
    throw new ClientError("offline", "Could not reach Grimoire");
  } finally {
    clearTimeout(timeout);
  }
}

async function json(response: Response): Promise<Record<string, any>> {
  try {
    return await response.json() as Record<string, any>;
  } catch {
    throw new ClientError("invalid-response", "Grimoire returned an unreadable response", response.status);
  }
}

async function responseError(response: Response): Promise<ClientError> {
  let detail = `Grimoire returned HTTP ${response.status}`;
  try {
    const body = await response.json() as { detail?: unknown; error?: unknown };
    if (typeof body.detail === "string") detail = body.detail;
    else if (typeof body.error === "string") detail = body.error;
  } catch {
    // Keep the status-based message. Response bodies are never logged.
  }
  const code = response.status === 401 ? "unauthorized"
    : response.status === 409 ? "duplicate-conflict"
      : response.status === 422 ? "validation"
        : "request-failed";
  return new ClientError(code, detail, response.status);
}

export async function discover(endpoint: string): Promise<ConnectionState> {
  const base = normalizeEndpoint(endpoint);
  const response = await request(`${base}/health`);
  if (!response.ok) return { kind: "unknown", detail: `Health check returned HTTP ${response.status}` };
  const body = await json(response);
  if (body.status === "ok" && typeof body.version === "string") {
    return { kind: "current", version: body.version };
  }
  if (typeof body.appVersion === "string" && typeof body.database === "string") {
    return { kind: "legacy", version: body.appVersion };
  }
  return { kind: "unknown", detail: "The server does not advertise a supported Grimoire protocol" };
}

export async function connectCurrent(endpoint: string, token: string): Promise<ConnectionConfig> {
  const base = normalizeEndpoint(endpoint);
  const response = await request(`${base}/integrations/browser/v1/capabilities`, {
    headers: { Authorization: `Bearer ${token.trim()}` },
  });
  if (!response.ok) throw await responseError(response);
  const body = await json(response);
  if (body.data?.protocol !== "grimoire-browser-capture" || body.data?.protocol_version !== 1) {
    throw new ClientError("incompatible", "This Grimoire version does not support Companion protocol v1");
  }
  return {
    endpoint: base,
    protocol: "current",
    token: token.trim(),
    captureFields: {
      isPinned: body.data?.capture_fields?.is_pinned === true,
      readLater: body.data?.capture_fields?.read_later === true,
    },
  };
}

export async function loginLegacy(endpoint: string, login: string, password: string): Promise<ConnectionConfig> {
  const base = normalizeEndpoint(endpoint);
  const response = await request(`${base}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  const body = await json(response);
  if (!response.ok || body.success !== true || typeof body.token !== "string") {
    throw new ClientError("unauthorized", "The legacy Grimoire login was rejected", response.status);
  }
  return { endpoint: base, protocol: "legacy", token: body.token };
}

export async function fetchTaxonomy(connection: ConnectionConfig): Promise<Taxonomy> {
  const headers = { Authorization: `Bearer ${connection.token}` };
  if (connection.protocol === "current") {
    const response = await request(`${connection.endpoint}/integrations/browser/v1/taxonomy`, { headers });
    if (!response.ok) throw await responseError(response);
    const body = await json(response);
    const flatten = (nodes: any[], depth = 0): Category[] => nodes.flatMap((node) => [
      { id: String(node.id), name: String(node.name), depth },
      ...flatten(Array.isArray(node.children) ? node.children : [], depth + 1),
    ]);
    return {
      categories: flatten(Array.isArray(body.data?.categories) ? body.data.categories : []),
      tags: (Array.isArray(body.data?.tags) ? body.data.tags : []).map((tag: any) => String(tag.name)),
    };
  }

  const [categoriesResponse, tagsResponse] = await Promise.all([
    request(`${connection.endpoint}/categories`, { headers }),
    request(`${connection.endpoint}/tags`, { headers }),
  ]);
  if (!categoriesResponse.ok) throw await responseError(categoriesResponse);
  if (!tagsResponse.ok) throw await responseError(tagsResponse);
  const [categoriesBody, tagsBody] = await Promise.all([json(categoriesResponse), json(tagsResponse)]);

  return {
    categories: (Array.isArray(categoriesBody.categories) ? categoriesBody.categories : []).map((category: any) => ({
      id: String(category.id),
      name: String(category.name),
      depth: 0,
      initial: category.initial === true,
    })),
    tags: (Array.isArray(tagsBody.tags) ? tagsBody.tags : []).map((tag: any) => String(tag.name)),
  };
}

export async function capture(connection: ConnectionConfig, draft: CaptureDraft): Promise<CaptureResult> {
  const headers = {
    Authorization: `Bearer ${connection.token}`,
    "Content-Type": "application/json",
  };
  const currentBody = {
    url: draft.url,
    title: draft.title,
    ...(draft.categoryId ? { category_id: draft.categoryId } : {}),
    tags: draft.tags,
    ...(draft.notes ? { notes: draft.notes } : {}),
    ...(connection.captureFields?.isPinned ? { is_pinned: draft.isPinned } : {}),
    ...(connection.captureFields?.readLater ? { read_later: draft.readLater } : {}),
    source: {
      client: "grimoire-companion",
      source_url: draft.url,
      ...(draft.selectedText ? { selected_text: draft.selectedText } : {}),
    },
  };
  const legacyBody = {
    url: draft.url,
    title: draft.title,
    category: draft.categoryId ?? "",
    tags: draft.tags,
    note: draft.notes ?? "",
    description: "",
    content_html: "",
    importance: 0,
    flagged: draft.isPinned,
    screenshot: "",
  };
  const route = connection.protocol === "current" ? "capture" : "bookmarks";
  const response = await request(`${connection.endpoint}/${route}`, {
    method: "POST",
    headers,
    body: JSON.stringify(connection.protocol === "current" ? currentBody : legacyBody),
  }, 15_000);
  if (!response.ok) throw await responseError(response);
  const body = await json(response);
  if (connection.protocol === "current") {
    if (typeof body.data?.bookmark?.id !== "string") {
      throw new ClientError("invalid-response", "Grimoire did not return the saved bookmark");
    }
    return { bookmarkId: body.data.bookmark.id, created: body.data.created === true };
  }
  if (body.bookmark?.id === undefined) {
    throw new ClientError("invalid-response", "Legacy Grimoire did not return the saved bookmark");
  }
  return { bookmarkId: String(body.bookmark.id), created: true };
}

export async function captureMany(
  connection: ConnectionConfig,
  drafts: CaptureDraft[],
): Promise<BatchCaptureResult> {
  const result: BatchCaptureResult = { created: 0, duplicates: 0, failed: 0, failures: [] };
  for (const draft of drafts) {
    try {
      const captured = await capture(connection, draft);
      if (captured.created) result.created += 1;
      else result.duplicates += 1;
    } catch (error) {
      result.failed += 1;
      result.failures.push({
        title: draft.title,
        detail: error instanceof Error ? error.message : "Unexpected error",
      });
    }
  }
  return result;
}
