export type Protocol = "current" | "legacy";

export interface ConnectionConfig {
  endpoint: string;
  protocol: Protocol;
  token: string;
}

export interface Category {
  id: string;
  name: string;
  depth: number;
  initial?: boolean;
}

export interface Taxonomy {
  categories: Category[];
  tags: string[];
}

export interface CaptureDraft {
  url: string;
  title: string;
  categoryId?: string;
  tags: string[];
  notes?: string;
  selectedText?: string;
}

export interface CaptureResult {
  bookmarkId: string;
  created: boolean;
}

export type ConnectionState =
  | { kind: "current"; version: string }
  | { kind: "legacy"; version: string }
  | { kind: "unknown"; detail: string };

export type BackgroundRequest =
  | { type: "discover"; endpoint: string }
  | { type: "connect-current"; endpoint: string; token: string }
  | { type: "login-legacy"; endpoint: string; login: string; password: string }
  | { type: "taxonomy" }
  | { type: "capture"; draft: CaptureDraft }
  | { type: "disconnect" };

export type BackgroundResponse =
  | { ok: true; data?: unknown }
  | { ok: false; status?: number; code: string; detail: string };
