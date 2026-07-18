import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpRight } from "lucide-react";

/**
 * Shared markdown renderer for PressRoom responses.
 *
 * Every structural element the model emits is rendered with intent instead of
 * falling through to browser defaults: headings become scannable section
 * breaks, blockquotes read as Scripture pull-quotes, tables scroll inside
 * their own container, and external links open in a new tab. This is what
 * turns a wall of streamed text into a document the reader can skim.
 */

const COMPONENTS: Components = {
  h1: ({ children }) => (
    <h2 className="mt-6 mb-2 font-display text-lg font-semibold tracking-tight text-[var(--pressroom-fg)] first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-2 font-display text-lg font-semibold tracking-tight text-[var(--pressroom-fg)] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 mb-1.5 text-[15px] font-semibold text-[var(--pressroom-fg)] first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--pressroom-fg-muted)] first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-3 text-[15px] leading-7 text-[var(--pressroom-fg)]/90 first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--pressroom-fg)]">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-[var(--pressroom-accent)]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-[var(--pressroom-fg-muted)] [font-variant-numeric:tabular-nums]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[15px] leading-7 text-[var(--pressroom-fg)]/90 [&>p]:my-1">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-[var(--pressroom-accent)] bg-[var(--pressroom-active-bg)]/40 py-1.5 pl-4 pr-3 font-display italic text-[var(--pressroom-fg)]/90 [&_p]:my-1">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-[var(--pressroom-border)]" />,
  a: ({ href, children }) => {
    const external = /^https?:\/\//.test(href || "");
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="font-medium text-[var(--pressroom-accent)] underline decoration-[var(--pressroom-accent)]/40 underline-offset-2 transition-colors hover:decoration-[var(--pressroom-accent)]"
      >
        {children}
        {external && <ArrowUpRight className="ml-0.5 inline h-3 w-3 align-[-1px]" aria-hidden />}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-[var(--pressroom-border)]">
      <table className="w-full border-collapse text-sm [font-variant-numeric:tabular-nums] [&_tr:last-child_td]:border-b-0">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-[var(--pressroom-border)] bg-[var(--pressroom-panel)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--pressroom-fg-muted)]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-[var(--pressroom-border)]/60 px-3 py-2 align-top text-[14px] leading-6 text-[var(--pressroom-fg)]/90">
      {children}
    </td>
  ),
  code: ({ className, children }) => {
    // Block code arrives with a language class inside <pre>; inline code has none.
    const isBlock = /language-/.test(className || "");
    if (isBlock) return <code className={className}>{children}</code>;
    return (
      <code className="rounded bg-[var(--pressroom-panel)] px-1.5 py-0.5 text-[13px] text-[var(--pressroom-fg)]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg border border-[var(--pressroom-border)] bg-[var(--pressroom-panel-soft)] p-4 text-[13px] leading-6 text-[var(--pressroom-fg)]/90">
      {children}
    </pre>
  ),
};

const REMARK_PLUGINS = [remarkGfm];

/** Memoized so historical messages skip re-parsing on every streamed token. */
export const PressRoomMarkdown = memo(function PressRoomMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
      {children}
    </ReactMarkdown>
  );
});
