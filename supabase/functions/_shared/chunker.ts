// Structure-aware text chunker for the RAG pipeline.
// Splits on markdown headings first; falls back to ~512-token windows with
// ~15% overlap within structural blocks. Tables (lines starting with `|`) are
// kept intact so financial / tabular content isn't sliced across chunks.

export interface Chunk {
  content: string;
  content_type: "prose" | "table" | "heading";
  chunk_index: number;
  token_count: number;
}

// Cheap, deterministic token estimate (~4 chars/token). Good enough for budgeting.
function estTokens(s: string): number {
  return Math.max(1, Math.ceil(s.length / 4));
}

const TARGET_TOKENS = 512;
const OVERLAP_TOKENS = 75;

function splitByHeadings(text: string): Array<{ heading: string | null; body: string }> {
  const lines = text.split(/\r?\n/);
  const blocks: Array<{ heading: string | null; body: string }> = [];
  let current: { heading: string | null; body: string } = { heading: null, body: "" };

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      if (current.body.trim() || current.heading) blocks.push(current);
      current = { heading: line.trim(), body: "" };
    } else {
      current.body += line + "\n";
    }
  }
  if (current.body.trim() || current.heading) blocks.push(current);
  return blocks;
}

function splitProse(text: string, headingContext: string | null): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = headingContext ? headingContext + "\n\n" : "";
  let bufTokens = estTokens(buf);

  for (const p of paragraphs) {
    const pTokens = estTokens(p);
    if (pTokens > TARGET_TOKENS) {
      // Hard split a long paragraph by sentence-ish boundaries.
      const sentences = p.split(/(?<=[.!?])\s+/);
      let sBuf = "";
      for (const s of sentences) {
        if (estTokens(sBuf + " " + s) > TARGET_TOKENS && sBuf) {
          chunks.push((buf + sBuf).trim());
          // Carry overlap.
          const tail = sBuf.slice(-OVERLAP_TOKENS * 4);
          sBuf = tail + " " + s;
        } else {
          sBuf = sBuf ? sBuf + " " + s : s;
        }
      }
      if (sBuf.trim()) {
        if (bufTokens + estTokens(sBuf) > TARGET_TOKENS && buf.trim()) {
          chunks.push(buf.trim());
          buf = headingContext ? headingContext + "\n\n" : "";
          bufTokens = estTokens(buf);
        }
        buf += sBuf + "\n\n";
        bufTokens += estTokens(sBuf);
      }
      continue;
    }
    if (bufTokens + pTokens > TARGET_TOKENS && buf.trim()) {
      chunks.push(buf.trim());
      const tail = buf.slice(-OVERLAP_TOKENS * 4);
      buf = (headingContext ? headingContext + "\n\n" : "") + tail + "\n\n";
      bufTokens = estTokens(buf);
    }
    buf += p + "\n\n";
    bufTokens += pTokens;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

function extractTables(body: string): { tables: string[]; nonTable: string } {
  const lines = body.split(/\r?\n/);
  const tables: string[] = [];
  const nonTableLines: string[] = [];
  let tableBuf: string[] = [];
  const flush = () => {
    if (tableBuf.length > 0) {
      tables.push(tableBuf.join("\n"));
      tableBuf = [];
    }
  };
  for (const line of lines) {
    if (/^\s*\|.*\|\s*$/.test(line) || /^\s*\|?[\s\-:]+\|/.test(line)) {
      tableBuf.push(line);
    } else {
      flush();
      nonTableLines.push(line);
    }
  }
  flush();
  return { tables, nonTable: nonTableLines.join("\n") };
}

export function chunkText(text: string): Chunk[] {
  if (!text || !text.trim()) return [];
  const out: Chunk[] = [];
  let idx = 0;

  const blocks = splitByHeadings(text);
  for (const block of blocks) {
    const { tables, nonTable } = extractTables(block.body);
    // Tables first — preserved intact.
    for (const t of tables) {
      const content = (block.heading ? block.heading + "\n\n" : "") + t.trim();
      out.push({
        content,
        content_type: "table",
        chunk_index: idx++,
        token_count: estTokens(content),
      });
    }
    // Then prose under this heading.
    const proseChunks = splitProse(nonTable, block.heading);
    for (const c of proseChunks) {
      out.push({
        content: c,
        content_type: "prose",
        chunk_index: idx++,
        token_count: estTokens(c),
      });
    }
  }
  // Cap to a sane maximum to protect cost on pathological inputs.
  return out.slice(0, 400);
}
