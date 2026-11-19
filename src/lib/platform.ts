export type Platform = "android" | "desktop";

/** Mobile Firefox reports `android`; every other target is treated as desktop. */
export function platformFromOs(os: string | undefined): Platform {
  return os === "android" ? "android" : "desktop";
}

export async function detectPlatform(): Promise<Platform> {
  try {
    return platformFromOs((await browser.runtime.getPlatformInfo()).os);
  } catch {
    return "desktop";
  }
}

/**
 * On a phone, loopback is the phone itself, so prefilling the desktop daemon
 * address would point at nothing. Android starts empty and relies on the
 * placeholder and hint instead.
 */
export function defaultEndpointFor(platform: Platform): string {
  return platform === "android" ? "" : "http://127.0.0.1:3210";
}

export function endpointPlaceholderFor(platform: Platform): string {
  return platform === "android" ? "https://grimoire.example.com" : "http://127.0.0.1:3210";
}

export function endpointHintFor(platform: Platform): string | null {
  return platform === "android"
    ? "Enter the HTTPS address of your Grimoire server. 127.0.0.1 and localhost point at this phone, not your computer."
    : null;
}

export function bulkTabsNoteFor(platform: Platform): string | null {
  return platform === "android"
    ? "Firefox for Android may list only some of your open tabs."
    : null;
}
