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
    short: "The Weekly Columnist",
    kicker: "Persona 01 · Every week, without fail",
    title: "The one who files on deadline, no matter what.",
    story:
      "Tuesday starts the same way: an open topic, a blank outline, and a clock that never stops running. By Thursday you need a researched, defensible piece — not a rough idea, and not five browser tabs of coverage you'll never finish reading.",
    pains: ["Five tabs, three sources, one Tuesday", "A chatbot that invents a citation with total confidence", "Never quite enough hours before deadline"],
    steps: [
      "Drop in this week's topic — PressRoom reads it in full context, not just the headline.",
      "PressRoom surfaces sources and synthesizes your archive, every claim cited.",
      "You move to the editor and write the piece in your own voice, on schedule.",
    ],
    checks: ["You file on a fixed weekly cadence", "You want citations you can defend in a correction request", "You want the research done — not the piece written for you"],
    fit: "Fits Desk — 4 stories a month with research & verification.",
  },
  {
    short: "The Investigation Lead",
    kicker: "Persona 02 · Thinking six weeks ahead",
    title: "The one mapping a series, not just a story.",
    story:
      "A good investigation has a throughline — the same sources, the same documents, the same argument carried from part one to the finale. Losing that continuity by part four is the quiet failure mode nobody plans for.",
    pains: ["Forgetting which document you cited in part two", "A throughline that drifts as the series goes on", "Rebuilding context every single week"],
    steps: [
      "Start a Project for the series and upload the documents and notes you're drawing from.",
      "PressRoom keeps your sources and throughline consistent from part one onward.",
      "Ask PressRoom to check continuity against last week's reporting before you draft the next part.",
    ],
    checks: ["You plan stories in multi-week arcs or investigations", "You want consistency across a whole series, not just one piece", "You're tired of rebuilding context from scratch"],
    fit: "Fits Desk or Bureau, depending on how many series you run at once.",
  },
  {
    short: "Freelance & Stringer Network",
    kicker: "Persona 03 · Handing the style guide to a contributor",
    title: "The one equipping contributors who aren't on staff.",
    story:
      "A freelancer isn't going to memorize your house style on a Wednesday night. They need a draft that's grounded, on-voice, and ready to run — one you'd be comfortable putting your masthead's name behind.",
    pains: ["Worrying a freelancer's draft won't match house style", "No time to build a style brief worth handing off", "Wanting consistency without a seminar on your style guide"],
    steps: [
      "Turn this week's assignment into a structured brief in one pass.",
      "Every claim in the brief is cited, so your contributors are writing from something solid.",
      "Hand it off — printed, exported, or shared straight from the editor.",
    ],
    checks: ["You run a network of freelancers or stringers", "You need briefs and style enforcement, not just outlines", "You want material you can trust in someone else's hands"],
    fit: "Fits Bulletin or Dispatch — built for regular brief-writing.",
  },
  {
    short: "The Bootstrapped Founder-Editor",
    kicker: "Persona 04 · A day job elsewhere, a deadline still due",
    title: "The one publishing in the margins of an already full week.",
    story:
      "You didn't get a journalism degree or an enterprise CMS budget, and you don't have a free weekday to build one. What you have is evenings, a commute, and a readership counting on you every week.",
    pains: ["No spare hours in the week to spend on research", "Can't justify an enterprise CMS or a fact-checking team", "Production squeezed into whatever time is left"],
    steps: [
      "Bring the story during whatever pocket of time you actually have.",
      "PressRoom compresses newsroom-grade depth into minutes, cited and ready.",
      "Draft on your phone or laptop — the runway's cleared whenever you are.",
    ],
    checks: ["Publishing isn't your day job", "You need depth without the learning curve or the price tag", "Your prep time is measured in minutes, not afternoons"],
    fit: "Fits Brief to start, moving to Bulletin as production becomes a weekly habit.",
  },
  {
    short: "Guest & Wire Contributors",
    kicker: "Persona 05 · A new beat, an unfamiliar region",
    title: "The one parachuting into a story they don't know yet.",
    story:
      "No history with this beat, this region, or this source list — and often a breaking story on short notice. You need to research faithfully and quickly, with citations solid enough to back every point you make to unfamiliar readers.",
    pains: ["No existing context for an unfamiliar beat", "Research has to be fast and still be right", "Breaking stories rarely come with a planning runway"],
    steps: [
      "Research the assigned topic quickly, grounded in verifiable sourcing.",
      "Every citation is numbered, so you can defend your reporting on an unfamiliar beat.",
      "Reuse the same flow for the next wire assignment that lands on your desk this week.",
    ],
    checks: ["You cover multiple beats or regions, or work wire assignments", "You handle breaking stories on a regular basis", "You need to research fast without cutting corners"],
    fit: "Fits Bureau — built for the contributor filing and localizing regularly.",
  },
];

export function PersonasExplorer({
  eyebrow = "Solutions",
  title = <>Is this <span className="mark">right for you</span>?</>,
  subtitle = "Five ways editors and writers actually use PressRoom, in their own words. Find the one that sounds like your week.",
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

        <div className="persona-rail reveal" style={{ marginTop: 44 }} role="tablist" aria-label="Editorial personas">
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
            <h4 className="eyebrow" style={{ color: "var(--on-slate-2)" }}>How PressRoom fits</h4>
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
