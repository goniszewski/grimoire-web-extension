# Install Companion without signing

These options are for local testing. Download the matching ZIP from the
[GitHub release](https://github.com/goniszewski/grimoire-web-extension/releases/tag/v1.0.0)
for Chrome or Firefox; Safari requires a source build.

## Chrome / Chromium

1. Extract `grimoire-companion-1.0.0-chrome.zip` into a folder you will keep.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.

## Firefox 140+

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select
   `grimoire-companion-1.0.0-firefox.zip`.
3. Load it again after restarting Firefox. Normal installation requires a
   Mozilla-signed package; temporary loading does not test installation consent.

## Safari on macOS

1. Install Node.js 22, pnpm 10, and (for the Xcode route) Xcode. Clone the
   [extension repository](https://github.com/goniszewski/grimoire-web-extension),
   check out `v1.0.0`, and run these commands from its directory:

   ```sh
   pnpm install --frozen-lockfile
   pnpm run build:safari
   ```
2. In Safari **Settings → Advanced**, enable **Show features for web developers**.
3. If **Settings → Developer → Add Temporary Extension…** is available, select
   `.output/safari-mv2` and approve the unsigned-extension prompt. Safari removes
   temporary extensions after 24 hours or when you quit.
4. On versions without that option, run `pnpm run package:safari`, open the
   generated Xcode project, and build/run its macOS containing app for unsigned
   testing. Enable **Allow unsigned extensions** in Safari's Developer settings,
   then enable Companion under **Settings → Extensions**. The unsigned setting
   resets when Safari quits. No paid developer membership is needed for this
   local macOS testing route; signed distribution is separate.

## Connect to Grimoire

With [Grimoire 1.2.0](https://github.com/goniszewski/grimoire/releases/tag/v1.2.0) running, create a token under **Settings → Browser
Integration**, then connect Companion to `http://127.0.0.1:3210` with that token.

Official instructions: [Chrome](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked),
[Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/),
and [Safari](https://developer.apple.com/documentation/safariservices/running-your-safari-web-extension).
Safari runtime compatibility remains unverified for this release.

