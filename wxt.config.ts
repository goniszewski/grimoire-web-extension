import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: ({ browser, manifestVersion }) => ({
    name: "Grimoire Companion",
    description: "Save pages to your local Grimoire library.",
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png",
    },
    permissions: ["activeTab", "storage", "scripting", "tabs"],
    host_permissions: ["http://127.0.0.1/*", "http://localhost/*"],
    ...(manifestVersion === 2
      ? { optional_permissions: ["http://*/*", "https://*/*"] }
      : { optional_host_permissions: ["http://*/*", "https://*/*"] }),
    ...(browser === "firefox" ? { browser_specific_settings: {
      gecko: {
        id: "contact@grimoire.pro",
        strict_min_version: "140.0",
        data_collection_permissions: {
          required: ["authenticationInfo", "browsingActivity", "websiteContent"],
        },
      },
    } } : {}),
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  }),
});
