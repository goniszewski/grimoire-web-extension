# Grimoire Companion

Grimoire Companion saves the active browser page to a Grimoire library. The
current rewrite targets Grimoire's local daemon and its managed integration
tokens while retaining a temporary compatibility path for Grimoire 0.5.x.

## Current development scope

- Chrome and Firefox builds from one WXT/React/TypeScript codebase
- protocol discovery through the unauthenticated health response
- authenticated current-Grimoire capability negotiation
- confirmed capture results, including an honest active-duplicate result
- category, tag, note, and selected-text capture
- migration of the old extension configuration from browser sync storage to
  local extension storage
- temporary legacy login and bookmark payload support for existing store users
- explicit Firefox disclosure for the authentication, current-page URL, and
  selected page content sent to the user-selected Grimoire instance

The extension requests permanent access only to loopback Grimoire addresses.
Access to any user-configured remote instance is requested at connection time.
It does not read browser history or collect page HTML in the background.

Current Grimoire users create a named token under **Settings → Browser
Integration**, then paste that one-time token into the extension. Grimoire must
include Companion protocol v1; the extension verifies this during connection.

## Development

```bash
pnpm install
pnpm run type-check
pnpm test
pnpm run build
pnpm run build:firefox
```

Build output is written under `.output/`. Use `pnpm dev` for an unpacked Chrome
development profile or `pnpm dev -- -b firefox` for Firefox.

The Firefox build requires Firefox 140 or newer so its built-in data-transfer
consent describes the local Grimoire connection during installation.

## Store availability

The existing [Chrome Web Store](https://chromewebstore.google.com/detail/grimoire-companion/mbciogjbnegofhhhlcbmlobjcgjdbgfh)
and [Firefox Add-ons](https://addons.mozilla.org/en-GB/firefox/addon/grimoire-companion/)
listings continue to provide the legacy release until this rewrite is reviewed
and published.

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
