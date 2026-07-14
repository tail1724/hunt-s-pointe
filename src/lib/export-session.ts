import type { Msg } from "@/components/sentient/ChatMessages";

export function sessionToMarkdown(title: string, messages: Msg[]): string {
  const date = new Date().toISOString().split("T")[0];
  const head = `# ${title}\n\n_Exported from Ezra · ${date}_\n\n---\n\n`;
  const body = messages
    .map((m) => {
      const who = m.role === "user" ? "**You**" : "**Ezra**";
      return `${who}\n\n${m.content}\n`;
    })
    .join("\n---\n\n");
  return head + body;
}

export function downloadMarkdown(filename: string, md: string) {
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
