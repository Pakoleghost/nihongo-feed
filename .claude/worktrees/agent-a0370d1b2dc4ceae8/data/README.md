# Genki Data Sources

- Raw source spreadsheets live in [`data/raw/`](/Users/pako/nihongo-feed-safe/data/raw).
- Normalized app-facing outputs live in [`data/normalized/`](/Users/pako/nihongo-feed-safe/data/normalized).

## Current sources

- `data/raw/vocabbbb.xlsx`
- `data/raw/tabla-de-kanji-genki.xlsx`

## Current normalized outputs

- `data/normalized/genki-vocab.json`
- `data/normalized/genki-kanji.json`

## ID generation

IDs are deterministic and generated from:

- module prefix
- lesson number
- source content fields

The current format is:

- `vocab-lXX-<sha1-12>`
- `kanji-lXX-<sha1-12>`

The hash input is based on lesson + Japanese form + reading + Spanish meaning, so IDs remain stable without depending on local row order in the app.

## Intended consumers

- `genki-vocab.json` is the repo-owned source for `Vocabulario`
- `genki-kanji.json` is the repo-owned source for `Kanji`

The legacy adapters in `lib/genki-vocab-by-lesson.ts` and `lib/genki-kanji-by-lesson.ts` can map from these normalized files while the UI migrates incrementally.
