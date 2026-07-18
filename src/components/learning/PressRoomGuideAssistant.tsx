import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CornerDownLeft, LifeBuoy, Loader2, Mail, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CONTACT_EMAIL } from "@/lib/constants";

interface GuideAction {
  label: string;
  to: string;
}
interface AssistantTurn {
  role: "user" | "assistant";
  text: string;
  actions?: GuideAction[];
  /** True when the assistant couldn't answer from the docs and offered a human. */
  escalated?: boolean;
}

const STARTERS = [
  "How do I make a story outline?",
  "How do I upload my own archive?",
  "How do I verify a claim in my draft?",
  "How do I export to a CMS?",
];

/**
 * PressRoom Guide — a lightweight, docs-grounded helper that answers "how do
 * I use this app" questions (not research questions). It calls the
 * `help-assist` edge function, which retrieves from the published guides
 * only. When it can't answer, it offers a human hand-off instead of guessing.
 */
export function PressRoomGuideAssistant() {
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: q }]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("help-assist", {
        body: { question: q },
      });
      if (error) throw error;
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          text: data?.answer ?? "I couldn't find that in the guides.",
          actions: Array.isArray(data?.actions) ? data.actions.slice(0, 3) : undefined,
          escalated: !!data?.escalated,
        },
      ]);
    } catch {
      // Network/function unavailable: never dead-end — offer the guides + a human.
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          text: "I can't reach the guide right now. You can browse the guides below, or email us and a person will help.",
          escalated: true,
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    }
  };

  return (
    <div className="assistant">
      <div className="assistant__head">
        <span className="assistant__badge"><Sparkles className="h-3.5 w-3.5" aria-hidden /> PressRoom Guide</span>
        <p className="assistant__title">Ask how to do anything in Hunt's Pointe.</p>
        <p className="assistant__sub">
          Plain-language help with using the app — outlines, uploads, exports, verification. Not sure where to start? Try one:
        </p>
      </div>

      {turns.length === 0 ? (
        <div className="assistant__starters">
          {STARTERS.map((s) => (
            <button key={s} type="button" className="assistant__starter" onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div className="assistant__thread" ref={scrollRef}>
          {turns.map((turn, i) => (
            <div key={i} className={`assistant__turn assistant__turn--${turn.role}`}>
              <p>{turn.text}</p>
              {turn.actions && turn.actions.length > 0 && (
                <div className="assistant__actions">
                  {turn.actions.map((a) => (
                    <Link key={a.to + a.label} to={a.to} className="assistant__action">
                      {a.label} <ArrowUpRight className="h-3 w-3" aria-hidden />
                    </Link>
                  ))}
                </div>
              )}
              {turn.escalated && (
                <a
                  className="assistant__action assistant__action--human"
                  href={`mailto:${CONTACT_EMAIL}?subject=Help%20using%20Hunt%27s%20Pointe`}
                >
                  <Mail className="h-3 w-3" aria-hidden /> Email a human
                </a>
              )}
            </div>
          ))}
          {loading && (
            <div className="assistant__turn assistant__turn--assistant">
              <p className="assistant__thinking"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Looking through the guides…</p>
            </div>
          )}
        </div>
      )}

      <form
        className="assistant__form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about using Hunt's Pointe…"
          aria-label="Ask the PressRoom Guide"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Ask">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />}
        </button>
      </form>

      <p className="assistant__foot">
        <LifeBuoy className="h-3 w-3" aria-hidden />
        The PressRoom Guide helps with using the app. For research itself, head to{" "}
        <Link to="/app/pressroom">PressRoom</Link>.
      </p>
    </div>
  );
}
