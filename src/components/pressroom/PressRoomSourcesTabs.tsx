import { useState } from "react";
import { Sparkles, Link2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Source {
  title?: string;
  url: string;
  snippet?: string;
}
interface ImgRef {
  url: string;
  alt?: string;
  source?: string;
}

interface Props {
  answer: React.ReactNode;
  sources?: Source[];
  images?: ImgRef[];
}

type Tab = "answer" | "links" | "images";

export function PressRoomSourcesTabs({ answer, sources, images }: Props) {
  const [tab, setTab] = useState<Tab>("answer");
  const hasLinks = !!sources?.length;
  const hasImages = !!images?.length;

  if (!hasLinks && !hasImages) return <>{answer}</>;

  return (
    <div>
      <div className="flex items-center gap-4 border-b border-[var(--pressroom-border)] mb-4">
        <TabButton active={tab === "answer"} onClick={() => setTab("answer")} icon={<Sparkles className="h-3.5 w-3.5" />}>
          Answer
        </TabButton>
        {hasLinks && (
          <TabButton active={tab === "links"} onClick={() => setTab("links")} icon={<Link2 className="h-3.5 w-3.5" />}>
            Links <span className="opacity-50">· {sources!.length}</span>
          </TabButton>
        )}
        {hasImages && (
          <TabButton active={tab === "images"} onClick={() => setTab("images")} icon={<ImageIcon className="h-3.5 w-3.5" />}>
            Images <span className="opacity-50">· {images!.length}</span>
          </TabButton>
        )}
      </div>

      {tab === "answer" && answer}

      {tab === "links" && hasLinks && (
        <ul className="space-y-2.5">
          {sources!.map((s, i) => (
            <li key={i}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block p-3 rounded-lg border border-[var(--pressroom-border)] hover:border-accent/40 hover:bg-[var(--pressroom-panel-soft)] pressroom-tactile"
              >
                <div className="text-sm text-foreground/90 truncate">{s.title || s.url}</div>
                {s.snippet && (
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.snippet}</div>
                )}
                <div className="mt-1 text-[10px] text-accent/80 truncate">{s.url}</div>
              </a>
            </li>
          ))}
        </ul>
      )}

      {tab === "images" && hasImages && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {images!.map((img, i) => (
            <a
              key={i}
              href={img.source || img.url}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square rounded-lg overflow-hidden border border-[var(--pressroom-border)] pressroom-tactile"
            >
              <img src={img.url} alt={img.alt || ""} loading="lazy" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 pb-2 pt-1 text-xs border-b-2 -mb-px transition-colors",
        active
          ? "border-accent text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
