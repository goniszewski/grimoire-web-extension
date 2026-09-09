function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized === "[::1]"
    || normalized === "127.0.0.1";
}

export function normalizeEndpoint(raw: string): string {
  const parsed = new URL(raw.trim());
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Grimoire must use an http or https URL");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Grimoire URL must not contain credentials");
  }
  if (parsed.protocol === "http:" && !isLoopbackHostname(parsed.hostname)) {
    throw new Error("Remote Grimoire addresses must use HTTPS");
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

export function browserIntegrationSettingsUrl(endpoint: string): string {
  return `${normalizeEndpoint(endpoint)}/settings/`;
}
