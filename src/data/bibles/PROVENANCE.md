# Bible Data Provenance

All vendored translations come from the public-domain corpus at
<https://github.com/scrollmapper/bible_databases> (MIT-licensed metadata).
This directory is **generated** — do not edit by hand. Regenerate with:

```bash
bun run bible:fetch
bun run bible:transform
bun run bible:index
```

## Layout

```text
src/data/bibles/
  manifest.json                  # translation list + metadata
  LICENSE
  PROVENANCE.md                  # this file
  <TRANSLATION>/<book>.json      # 1-indexed per-book verse data
  search/
    manifest.json                # { lang -> { shards: [{ key, books }] } }
    <lang>/<shard>.json          # MiniSearch index for that shard
```

## Search shards

To stay under the 10 MB-per-file commit limit, full-text indices are sliced
into canonical shards. Each shard is built independently per-language and
covers a group of books, allowing scoped queries (e.g. "search only Gospels"
or "search only this book") to load just one shard:

| Shard key | Books |
|-----------|-------|
| `ot-pentateuch` | Genesis–Deuteronomy |
| `ot-history` | Joshua–Esther |
| `ot-wisdom` | Job–Song of Solomon |
| `ot-prophets-major` | Isaiah–Daniel |
| `ot-prophets-minor` | Hosea–Malachi |
| `nt-gospels-acts` | Matthew–Acts |
| `nt-epistles` | Romans–Jude |
| `nt-revelation` | Revelation |

If a shard would exceed 8 MB after compression, `build-search-index.ts`
splits it alphabetically by book name and emits `<shard>-a.json` / `<shard>-b.json`.

## License

The vendored MIT license terms are in `LICENSE` alongside this file. Individual
translations are all public-domain (KJV, ASV, WEB, BBE, YLT, Vulgate, etc.);
no copyrighted modern translations (NIV/ESV/NASB) are vendored.
