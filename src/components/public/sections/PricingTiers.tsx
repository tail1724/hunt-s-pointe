import { useState } from "react";
import { AuthCTA } from "@/components/public/AuthCTA";

const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>;

type Tier = {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  featured?: boolean;
  badge?: string;
  ctaLabel: string;
};

const TIERS: Tier[] = [
  {
    name: "Brief",
    price: "$0",
    period: "forever",
    desc: "The free tier — everything you need to see if PressRoom fits, and where you decide to upgrade.",
    features: ["5 tokens / month", "PressRoom research partner", "Up to 3 Projects", "All CMS export formats", "Community support"],
    ctaLabel: "Start free",
  },
  {
    name: "Bulletin",
    price: "$9.99",
    period: "/ month",
    desc: "15 tokens, weighted toward briefs — more briefs, less questions.",
    features: ["15 tokens / month", "More briefs, less questions", "Unlimited Projects", "All CMS export formats", "Email support"],
    ctaLabel: "Start Bulletin",
  },
  {
    name: "Dispatch",
    price: "$14.99",
    period: "/ month",
    desc: "15 tokens, weighted toward questions — more research and answers.",
    features: ["15 tokens / month", "More questions and answers", "Unlimited Projects", "All export formats as they ship", "Priority email support"],
    ctaLabel: "Start Dispatch",
  },
  {
    name: "Desk",
    price: "$19.99",
    period: "/ month",
    desc: "The core package — 4 stories a month with research and verification.",
    features: ["4 story outlines / month", "Research & verification included", "Unlimited Projects", "All export formats as they ship", "Priority support"],
    featured: true,
    badge: "Most popular · the core plan",
    ctaLabel: "Start Desk",
  },
  {
    name: "Bureau",
    price: "$29.99",
    period: "/ month",
    desc: "6 stories, lots of questions and briefs — for the editor who publishes, and covers breaking news, regularly.",
    features: ["6 story outlines / month", "Lots of questions and briefs", "Unlimited Projects", "Priority support", "Export to any format"],
    ctaLabel: "Start Bureau",
  },
  {
    name: "Masthead",
    price: "$49.99",
    period: "/ month",
    desc: "10 stories, tons of questions, and writing for a wide variety of formats — our most robust package.",
    features: ["10 story outlines / month", "Tons of questions & answers", "Wide variety of format writing", "Dedicated support", "Export to any format"],
    ctaLabel: "Start Masthead",
  },
];

const TOKEN_ANCHORS = [
  { tokens: 5, items: ["1 story outline", "5 research questions", "1 style brief"] },
  { tokens: 10, items: ["2 story outlines", "15 research questions", "3 style briefs"] },
  { tokens: 20, items: ["4 story outlines"] },
];

const TOKEN_PACKS = [
  { tokens: 10, items: ["2 story outlines", "15 research questions", "3 style briefs"] },
  { tokens: 50, items: ["≈10 story outlines", "≈75 research questions", "≈15 style briefs"] },
  { tokens: 100, items: ["≈20 story outlines", "≈150 research questions", "≈30 style briefs"] },
  { tokens: 200, items: ["≈40 story outlines", "≈300 research questions", "≈60 style briefs"] },
];

export function PricingTiers() {
  const [packIndex, setPackIndex] = useState(0);
  const activePack = TOKEN_PACKS[packIndex];

  return (
    <>
      <div className="tiers tiers--six" style={{ marginTop: 46 }}>
        {TIERS.map((tier, i) => (
          <div key={tier.name} className={`tier reveal${tier.featured ? " tier--feat" : ""}`} style={{ ['--d' as any]: `${i * 0.05}s` }}>
            {tier.badge && <span className="tier__badge">{tier.badge}</span>}
            <p className="pn">{tier.name}</p>
            <div className="price">{tier.price}<small>{tier.period}</small></div>
            <p className="desc">{tier.desc}</p>
            <ul className="plist">
              {tier.features.map((f) => <li key={f}>{CHECK}{f}</li>)}
            </ul>
            <AuthCTA className={`btn ${tier.featured ? "btn--ink" : "btn--ghost"}`}>{tier.ctaLabel}</AuthCTA>
          </div>
        ))}
      </div>

      <div className="pad-t" id="unit-economics">
        <div className="head">
          <p className="eyebrow eyebrow--c reveal">Unit economics</p>
          <h2 className="h2 reveal" style={{ marginTop: 14 }}>Tokens, translated into <span className="mark">real work</span>.</h2>
          <p className="lead center reveal" style={{ marginTop: 12 }}>No mystery credits — here's exactly what a token buys.</p>
        </div>
        <div className="token-anchor-grid reveal" style={{ marginTop: 34 }}>
          {TOKEN_ANCHORS.map((a) => (
            <div className="token-anchor" key={a.tokens}>
              <div className="token-anchor__n">{a.tokens}<small>tokens</small></div>
              <ul>
                {a.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="pad-t">
        <div className="head">
          <p className="eyebrow eyebrow--c reveal">Pay-as-you-go</p>
          <h2 className="h2 reveal" style={{ marginTop: 14 }}>Token packs, <span className="mark">when you need more</span>.</h2>
          <p className="lead center reveal" style={{ marginTop: 12 }}>Top up any plan. Estimates scale from the 10-token bundle above — pricing is shown at checkout in the app.</p>
        </div>

        <div className="panel token-estimator reveal" style={{ marginTop: 34 }}>
          <p className="eyebrow" style={{ color: 'var(--on-slate-2)' }}>Estimate your usage</p>
          <div className="token-estimator__readout">
            <span className="n">{activePack.tokens}</span><span className="lbl">tokens →</span>
            <span className="out">{activePack.items.join(" · ")}</span>
          </div>
          <input
            type="range"
            min={0}
            max={TOKEN_PACKS.length - 1}
            step={1}
            value={packIndex}
            onChange={(e) => setPackIndex(Number(e.target.value))}
            aria-label="Token pack size"
            className="token-estimator__slider"
          />
          <div className="token-estimator__ticks">
            {TOKEN_PACKS.map((p, i) => <span key={p.tokens} className={i === packIndex ? "is-active" : ""}>{p.tokens}</span>)}
          </div>
        </div>

        <div className="token-packs" style={{ marginTop: 24 }}>
          {TOKEN_PACKS.map((pack, i) => (
            <div key={pack.tokens} className={`token-pack reveal${i === packIndex ? " is-active" : ""}`} style={{ ['--d' as any]: `${i * 0.05}s` }} onClick={() => setPackIndex(i)}>
              <div className="token-pack__n">{pack.tokens}</div>
              <p className="token-pack__lbl">tokens</p>
              <ul>
                {pack.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
