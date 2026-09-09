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

The existing [Chrome Web Store](https://chromewebstore.google.com/detail/grimoire-companion/mbciogjbnegofhhhlcbmlobjcgjdbgfh)
and [Firefox Add-ons](https://addons.mozilla.org/en-GB/firefox/addon/grimoire-companion/)
listings continue to provide the legacy release until this rewrite is reviewed
and published. There is no Safari App Store listing yet.

## Release strategy

The intended production path is to update the existing Chrome Web Store and
Firefox Add-ons listings so current users retain the established extension
identity. Store updates normally replace installed older versions, so the first
compatible release must include the legacy protocol path and a clear reconnect
experience. A separate listing may be used for pre-release testing, subject to
store duplicate-content rules; it is not the planned production identity.

No store submission is performed by the build commands.

## License

MIT. See [LICENSE](LICENSE).
