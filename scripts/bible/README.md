# Bible data pipeline

Three scripts produce everything under `src/data/bibles/`:

```bash
bun run bible:fetch       # git clone scrollmapper/bible_databases → /tmp/bible-upstream
bun run bible:transform   # → src/data/bibles/<TR>/<book>.json + manifest.json
bun run bible:index       # → src/data/bibles/search/<lang>/<shard>.json + manifest.json
```

Re-run `bible:index` whenever sharding logic changes; it never re-downloads.

## Sharding

Search indices are sliced canonically (Pentateuch, History, Wisdom, Major
Prophets, Minor Prophets, Gospels+Acts, Epistles, Revelation) per language.
Any shard >8 MB is split alphabetically by book name into `-a` / `-b` until it
fits, so even the largest English Bibles (KJV, ASV, WEB) ship with working
full-text search inside the 10 MB-per-file commit limit. See
`src/data/bibles/PROVENANCE.md` for the full layout.
