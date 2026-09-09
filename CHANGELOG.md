# Changelog

All notable changes to Grimoire Companion will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-09-07

### Added
- A new popup aligned with the current Grimoire interface, including favicon
  preview, editable title and URL, category selection, tag chips, notes, Pin,
  Read Later, and selected-text capture.
- Searchable bulk capture for selected open tabs with shared metadata and
  capture options.
- Chrome, Firefox, and Safari builds from one WXT, React, and TypeScript
  codebase.
- Secure connection to Grimoire 1.2.0 through named integration tokens and
  versioned capability negotiation.

### Changed
- Rebuilt the extension from the legacy Svelte implementation.
- Moved credentials from synchronized browser storage to local extension
  storage, with automatic migration for existing installations.

### Compatibility
- Existing Grimoire 0.5.x connections remain supported temporarily. Pin maps
  to the legacy Flagged field; Read Later is unavailable in the legacy data
  model.
- Firefox requires version 140 or newer.

## [0.1.3] - 2024-10-08

### Fixed
- Restored access to the Grimoire API from Firefox.
