import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Archive, ArrowUpRight, FileText, Hexagon, MessagesSquare, PenLine } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { colorTokens, type Collection } from "@/lib/collections/types";

interface Props {
  collection: Collection;
  itemCount: number;
  artifactCount: number;
  /** Which surfaces this collection is currently active in */
  activeInEzra?: boolean;
  activeInWrite?: boolean;
}

export function CollectionCard({ collection, itemCount, artifactCount, activeInEzra, activeInWrite }: Props) {
  const c = colorTokens(collection.color);
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="group relative"
    >
      <Link
        to={`/app/knowledge/${collection.id}`}
        className="block relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
      >
        {/* Aurora glow */}
        <div
          aria-hidden
          className="absolute -top-16 -right-16 h-44 w-44 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
          style={{ background: `radial-gradient(circle, ${c.from}, ${c.to})` }}
        />
        {/* Accent strip */}
        <div
          aria-hidden
          className="absolute left-0 top-0 h-full w-1"
          style={{ background: `linear-gradient(180deg, ${c.from}, ${c.to})` }}
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-foreground line-clamp-2">
              {collection.name}
            </h3>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform duration-300 group-hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
            >
              <Archive className="h-4 w-4" strokeWidth={2.4} />
            </div>
          </div>
          {collection.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {collection.description}
            </p>
          )}
          {(activeInEzra || activeInWrite) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeInEzra && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/20">
                  <MessagesSquare className="h-2.5 w-2.5" /> Active in Ezra
                </span>
              )}
              {activeInWrite && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent ring-1 ring-accent/25">
                  <PenLine className="h-2.5 w-2.5" /> Active in Write
                </span>
              )}
            </div>
          )}
          <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Hexagon className="h-3.5 w-3.5" /> {artifactCount} artifact{artifactCount === 1 ? "" : "s"}
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] opacity-0 transition-all duration-200 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 text-foreground">
              Open <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
