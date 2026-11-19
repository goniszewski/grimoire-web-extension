# Grimoire Companion

Grimoire Companion saves the active browser page to a Grimoire library. The
version 1.0 targets Grimoire's local daemon and its managed integration
tokens while retaining a temporary compatibility path for Grimoire 0.5.x.

## Version 1.0

- Chrome, Firefox, and Safari web-extension builds from one WXT/React/TypeScript codebase
- protocol discovery through the unauthenticated health response
- authenticated current-Grimoire capability negotiation
- confirmed capture results, including an honest active-duplicate result
- favicon-backed page preview with editable title and URL
- hierarchical category selection, removable tag chips and suggestions, notes,
  and selected-text capture
- capture-time Pin and Read Later controls for current Grimoire
- searchable selection of open browser tabs for bulk capture with shared
  category, tags, note, Pin, and Read Later settings
- migration of the old extension configuration from browser sync storage to
  local extension storage
- temporary legacy login and bookmark payload support for existing store users
- explicit Firefox disclosure for the authentication, current-page URL, and
  selected page content sent to the user-selected Grimoire instance

The extension requests permanent access only to loopback Grimoire addresses.
Access to any user-configured remote instance is requested at connection time.
Remote instances must use HTTPS so integration tokens and legacy credentials
are never sent over a plaintext network connection.
The `tabs` permission lets the popup list the titles, addresses, and favicons of
currently open tabs for user-initiated bulk capture. It does not read browser
history or collect page HTML in the background.

Current Grimoire users create a named token under **Settings → Browser
Integration**, then paste that one-time token into the extension. Grimoire must
include Companion protocol v1; the extension verifies this during connection.
Feature flags in that response keep the base v1 capture payload compatible with
earlier daemons. Grimoire 0.5.x maps Pin to its legacy Flagged field; Read Later
is unavailable because the legacy data model cannot represent it.

## Development

```bash
pnpm install
pnpm run type-check
pnpm test
pnpm run build
pnpm run build:firefox
pnpm run build:safari
```

Build output is written under `.output/`. Use `pnpm dev` for an unpacked Chrome
development profile or `pnpm dev -- -b firefox` for Firefox.

`pnpm run package:safari` generates an unsigned macOS Safari Web Extension
Xcode project under `.output/safari/` with macOS 13.0 as its deployment target.
Building for local use or App Store distribution requires selecting an Apple
Developer team in Xcode. Safari web extensions are delivered inside a
containing app, so the Chrome and Firefox ZIP files cannot be installed in
Safari directly.

The Firefox build requires Firefox 140 or newer so its built-in data-transfer
consent describes the local Grimoire connection during installation.

## Store availability

Companion 1.0.0 is published on the
[Chrome Web Store](https://chromewebstore.google.com/detail/grimoire-companion/mbciogjbnegofhhhlcbmlobjcgjdbgfh)
and [Firefox Add-ons](https://addons.mozilla.org/en-GB/firefox/addon/grimoire-companion/)
(Firefox listing last updated 2026-09-17). There is no Safari App Store listing yet.

## Release strategy

Production releases update the existing Chrome Web Store and Firefox Add-ons
listings so current users retain the established extension identity. Store
updates replace installed older versions, so releases keep the legacy protocol
path and a clear reconnect experience for existing users.

No store submission is performed by the build commands.

### Rebuilding the Firefox review package

Extract `grimoire-companion-1.0.0-sources.zip` into an empty directory. With
Node.js 22 and pnpm 10 installed, run from that directory:

```bash
pnpm install --frozen-lockfile
pnpm run build:firefox
```

The output is `.output/firefox-mv2/`. The source archive includes `.npmrc`,
which must remain beside `pnpm-lock.yaml` for a reproducible installation.
No environment variables, private packages, or credentials are required.
A signed Safari app has not been validated for distribution.

To try the Android build on a device connected over USB (with USB debugging
on and Firefox for Android installed):

```bash
pnpm run build:firefox
npx web-ext run -t firefox-android --source-dir .output/firefox-mv2 \
  --android-device <device-id-from-adb-devices>
```

## Firefox for Android

The Firefox build declares Firefox for Android 142 or newer (needed for the
data-collection disclosure). On a phone the popup opens full screen, with
larger touch targets.

- **Use an HTTPS address.** On a phone, `127.0.0.1` and `localhost` mean the
  phone itself, so the address field starts empty. Enter your Grimoire
  server's address. Because it isn't loopback, it must use HTTPS: for
  example a reverse proxy with a certificate, or a private network such as
  Tailscale with HTTPS.
- **Make Grimoire reachable from the network.** Grimoire only listens on
  loopback by default. Container deployments listen on the network
  automatically; a native install needs `HOST` set to a network address and
  `ALLOW_NON_LOOPBACK_BIND=1`.
- **Open tabs may be incomplete.** Firefox for Android can return only some
  of the open tabs to extensions, so bulk capture may list fewer tabs than are
  open.

## License

MIT. See [LICENSE](LICENSE).
