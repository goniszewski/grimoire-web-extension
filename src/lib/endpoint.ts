export function normalizeEndpoint(raw: string): string {
  const parsed = new URL(raw.trim());
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Grimoire must use an http or https URL");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Grimoire URL must not contain credentials");
  }
  parsed.search = "";
  parsed.hash = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/$/, "");
}

export function permissionPattern(endpoint: string): string {
  const parsed = new URL(normalizeEndpoint(endpoint));
  return `${parsed.protocol}//${parsed.hostname}/*`;
}
