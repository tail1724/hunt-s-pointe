import { useState } from "react";

const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>;

type Persona = {
  short: string;
  kicker: string;
  title: string;
  story: string;
  pains: string[];
  steps: string[];
  checks: string[];
  fit: string;
};

const PERSONAS: Persona[] = [
  {
    short: "The Weekly Preacher",
    kicker: "Persona 01 · Every Sunday, without fail",
    title: "The one who preaches every week, no matter what.",
    story:
      "Tuesday starts the same way: an open passage, a blank outline, and a clock that never stops running. By Thursday you need a researched, defensible outline — not a rough idea, and not five browser tabs of commentary you'll never finish reading.",
    pains: ["Five tabs, three commentaries, one Tuesday", "A chatbot that invents citations with total confidence", "Never quite enough hours before Sunday"],
    steps: [
      "Drop in Sunday's passage — Ezra reads it in its full context, not just the verse.",
      "Ezra surfaces cross-references and synthesizes your commentaries, every claim cited.",
      "You move to the editor and write the sermon in your own voice, on schedule.",
    ],
    checks: ["You preach on a fixed weekly cadence", "You want citations you can defend from the pulpit", "You want the research done — not the sermon written for you"],
    fit: "Fits Silver — 4 sermons a month with questions & guides.",
  },
  {
    short: "The Series Planner",
    kicker: "Persona 02 · Thinking six weeks ahead",
    title: "The one mapping a series, not just a Sunday.",
    story:
      "A good series has a throughline — the same translation, the same sources, the same argument carried from week one to the finale. Losing that continuity by week four is the quiet failure mode nobody plans for.",
    pains: ["Forgetting which translation you used in week two", "A throughline that drifts as the series goes on", "Rebuilding context every single week"],
    steps: [
      "Start a Collection for the series and upload the commentaries and notes you're drawing from.",
      "Ezra keeps your translation, sources, and throughline consistent from week one onward.",
      "Ask Ezra to check continuity against last week's study before you draft the next one.",
    ],
    checks: ["You plan sermons in multi-week arcs or book studies", "You want consistency across a whole series, not just one week", "You're tired of rebuilding context from scratch"],
    fit: "Fits Silver or Gold, depending on how many series you run at once.",
  },
  {
    short: "Small Groups & Lay Leaders",
    kicker: "Persona 03 · Handing the text to a volunteer",
    title: "The one equipping leaders who aren't seminary-trained.",
    story:
      "A small group leader isn't going to open a Greek lexicon on a Wednesday night. They need a discussion guide that's grounded, on-tradition, and ready to run — one you'd be comfortable putting your name behind.",
    pains: ["Worrying a volunteer will misteach the text", "No time to build a guide worth handing off", "Wanting depth without a seminary prerequisite"],
    steps: [
      "Turn this week's passage into a structured discussion guide in one pass.",
      "Every claim in the guide is cited, so your lay leaders are teaching from something solid.",
      "Hand it off — printed, exported, or shared straight from the editor.",
    ],
    checks: ["You run small groups or Bible studies led by volunteers", "You need study guides, not just sermon outlines", "You want material you can trust in someone else's hands"],
    fit: "Fits Frankincense or Myrrh — built for regular guide-writing.",
  },
  {
    short: "The Bivocational Pastor",
    kicker: "Persona 04 · Forty hours elsewhere, a sermon still due",
    title: "The one preaching in the margins of an already full week.",
    story:
      "You didn't get a seminary degree or a $3,000 Logos library, and you don't have a free weekday to build one. What you have is evenings, a commute, and a congregation counting on you Sunday morning.",
    pains: ["No spare hours in the week to spend on research", "Can't justify seminary tuition or a commentary library", "Sermon prep squeezed into whatever time is left"],
    steps: [
      "Bring the passage during whatever pocket of time you actually have.",
      "Ezra compresses seminary-grade depth into minutes, cited and ready.",
      "Draft on your phone or laptop — the runway's cleared whenever you are.",
    ],
    checks: ["Preaching isn't your day job", "You need depth without the learning curve or the price tag", "Your prep time is measured in minutes, not afternoons"],
    fit: "Fits Manna to start, moving to Frankincense as prep becomes a weekly habit.",
  },
  {
    short: "Pulpit Supply & Guest Preaching",
    kicker: "Persona 05 · A new pulpit, an unfamiliar room",
    title: "The one walking into a congregation they don't know yet.",
    story:
      "No history with this text, this tradition, or this room — and often a funeral or a wedding on short notice. You need to research faithfully and quickly, with citations solid enough to back every point you make to strangers.",
    pains: ["No existing context for an unfamiliar congregation", "Research has to be fast and still be right", "Funerals and weddings rarely come with a planning runway"],
    steps: [
      "Research the assigned text quickly, grounded in orthodox commentary.",
      "Every citation is numbered, so you can defend your reading in an unfamiliar room.",
      "Reuse the same flow for the wedding or funeral message that landed on your desk this week.",
    ],
    checks: ["You preach across multiple congregations or as pulpit supply", "You handle funerals and weddings on a regular basis", "You need to research fast without cutting corners"],
    fit: "Fits Gold — built for the minister preaching and officiating regularly.",
  },
];

export function PersonasExplorer({
  eyebrow = "Solutions",
  title = <>Is this <span className="mark">right for you</span>?</>,
  subtitle = "Five ways ministers actually use Ezra, in their own words. Find the one that sounds like your week.",
  id = "personas",
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  subtitle?: string;
  id?: string;
}) {
  const [active, setActive] = useState(0);
  const p = PERSONAS[active];

  return (
    <section className="page active persona-explorer" id={id}>
      <div className="wrap pad">
        <header className="head">
          <p className="eyebrow eyebrow--c reveal">{eyebrow}</p>
          <h2 className="display reveal">{title}</h2>
          <p className="lead center mxw-60 reveal" style={{ marginTop: 16 }}>{subtitle}</p>
        </header>

        <div className="persona-rail reveal" style={{ marginTop: 44 }} role="tablist" aria-label="Ministry personas">
          {PERSONAS.map((persona, i) => (
            <button
              key={persona.short}
              type="button"
              role="tab"
              aria-selected={active === i}
              className={`persona-tab${active === i ? " is-active" : ""}`}
              onClick={() => setActive(i)}
            >
              <span className="persona-tab__n">{String(i + 1).padStart(2, "0")}</span>
              <span>{persona.short}</span>
            </button>
          ))}
        </div>

        <div className="persona-panel" key={active} style={{ marginTop: 32 }}>
          <div className="persona-lede">
            <p className="persona-kicker">{p.kicker}</p>
            <h3 className="persona-title">{p.title}</h3>
            <p className="persona-story">{p.story}</p>
            <div className="persona-pains" aria-label="Common pain points">
              {p.pains.map((pain) => <span className="persona-pain" key={pain}>{pain}</span>)}
            </div>
          </div>

          <div className="panel persona-fit">
            <h4 className="eyebrow" style={{ color: "var(--on-slate-2)" }}>How Ezra fits</h4>
            <div className="persona-steps">
              {p.steps.map((step, i) => (
                <div className="persona-step" key={step}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
            <hr />
            <h4 className="eyebrow" style={{ color: "var(--on-slate-2)" }}>This is you if</h4>
            <div className="persona-check">
              {p.checks.map((check) => (
                <div key={check}>{CHECK}<span>{check}</span></div>
              ))}
            </div>
            <p className="tag tag--dark persona-fit-tag">{p.fit}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
