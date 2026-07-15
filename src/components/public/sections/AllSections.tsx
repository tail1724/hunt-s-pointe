import { AuthCTA } from "@/components/public/AuthCTA";
import { Link } from "react-router-dom";
import { vertical } from "@/config/vertical";
import { PersonasExplorer } from "./PersonasExplorer";
import { PricingTiers } from "./PricingTiers";

const ArrowBtn = ({ children }: { children: React.ReactNode }) => <>{children} <span className="ar">→</span></>;

export function HeroStudy() {
  return (
    <section className="page active" id="home"><div className="wrap">
      <header className="hero">
        <div>
          <p className="eyebrow reveal" style={{ ['--d' as any]: '.05s' }}>PressRoom · give the hours back</p>
          <h1>
            <span className="reveal" style={{ ['--d' as any]: '.12s' }}>Hours of research,</span>
            <span className="l2 reveal" style={{ ['--d' as any]: '.22s' }}>in <span className="mark">minutes</span>.</span>
          </h1>
          <p className="sub lead reveal" style={{ ['--d' as any]: '.34s' }}>
            PressRoom gives you back the hours you'd lose hunting through sources — mapping the background, synthesizing the reporting, and gathering your citations, with <b>every claim traced to its source</b>. You still write the story. PressRoom just clears the runway.
          </p>
          <div className="cta-row reveal" style={{ ['--d' as any]: '.44s' }}>
            <AuthCTA className="btn btn--ink"><ArrowBtn>Start free</ArrowBtn></AuthCTA>
            <Link to="/#how" className="btn btn--ghost" onClick={(e) => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }); }}>See PressRoom work</Link>
          </div>
          <p className="assure reveal" style={{ ['--d' as any]: '.52s' }}>
            <span>No credit card</span><span className="d">·</span>
            <span>Free forever tier</span><span className="d">·</span>
            <span>Cancel anytime</span>
          </p>
          <p className="hero-stat reveal" style={{ ['--d' as any]: '.56s' }}>
            Roughly a third of U.S. newspapers have closed since 2005, while independent outlets do more reporting with fewer staff.<span className="hero-stat__src">Northwestern Medill · Gallup, 2026</span> Every hour PressRoom saves on research is an hour given back to your reporting.
          </p>
          <div className="proof reveal" style={{ ['--d' as any]: '.6s' }}>
            <span className="proof__lead">Every answer, accountable</span>
            <span className="proof__i"><span className="k">hours back</span><span>every week, not spent hunting sources</span></span>
            <span className="proof__i"><span className="n">5</span><span>CMS-ready export formats, out of the box</span></span>
            <span className="proof__i"><span className="k">cited</span><span>no anonymous claims, ever</span></span>
            <span className="proof__i"><span className="k">yours</span><span>you write the story</span></span>
          </div>
        </div>
        <aside className="panel study reveal" style={{ ['--d' as any]: '.4s' }} aria-label="Example of PressRoom's cited research for a transit story">
          <div className="bar" aria-hidden="true">
            <span className="dot"></span><span className="dot"></span><span className="dot"></span>
            <span className="stag">RESEARCH · THIS WEEK</span>
          </div>
          <div className="body">
            <p className="ref">Transit Overhaul — What Changes and When</p>
            <ul className="outline">
              <li>I. The vote — six hours of debate, passed 6–3</li>
              <li>II. The plan — three rapid lines, a fare cap</li>
              <li>III. The catch — a federal grant that isn't signed yet</li>
            </ul>
            <p className="note">
              Each claim raises a question the reader will actually ask<sup className="cite">1</sup>. The thread is the money, not the ceremony<sup className="cite">2</sup> — the same gap you flagged in your March coverage<sup className="cite">3</sup>.
            </p>
            <div className="src">
              <p className="src-l">Sources · traced to origin</p>
              <ol className="src-list">
                <li><span className="sn">1</span><span>Cross-reference · council resolution 24-118</span></li>
                <li><span className="sn">2</span><span>Archive · your March coverage of the transit budget</span></li>
                <li><span className="sn">3</span><span>Your note · <em>"Funding gap" — transit series, last year</em></span></li>
              </ol>
            </div>
          </div>
          <div className="foot">
            <span>You write the story — PressRoom clears the runway.</span>
            <span className="go">Your draft starts here →</span>
          </div>
        </aside>
      </header>
    </div>
    <hr className="divline" />
    <div className="wrap pad">
      <div className="head">
        <p className="eyebrow eyebrow--c reveal">The middle nobody serves</p>
        <h2 className="display reveal">Good tools. <span className="mark">Wrong people.</span></h2>
        <p className="lead center mxw-60 reveal" style={{ marginTop: 16 }}>
          A legacy enterprise CMS is built for a newsroom with a budget. ChatGPT will confidently invent a citation. Hunt's Pointe is for the editor caught in between — real editorial depth, none of the learning curve.
        </p>
      </div>
      <div className="grid cols-3" style={{ marginTop: 38 }}>
        <div className="card reveal">
          <div className="icon icon--paper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v18M3 7l9-4 9 4M5 7v10l7 4 7-4V7"/></svg></div>
          <h3 className="h3">Depth without the enterprise budget</h3>
          <p>Newsroom-grade research, citation checking, and source synthesis — without a journalism degree or a $3,000 CMS license.</p>
        </div>
        <div className="card reveal" style={{ ['--d' as any]: '.08s' }}>
          <div className="icon icon--paper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
          <h3 className="h3">Cited, or it doesn't ship</h3>
          <p>Every claim carries a reference. Every source is numbered. Anything PressRoom can't verify is marked as background, not fact.</p>
        </div>
        <div className="card reveal" style={{ ['--d' as any]: '.16s' }}>
          <div className="icon icon--paper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5V6a2 2 0 012-2h11a1 1 0 011 1v13M6 17h13"/></svg></div>
          <h3 className="h3">Your archive, remembered</h3>
          <p>Add your house style, sources, and past coverage once. PressRoom grounds every answer in the archive you've built.</p>
        </div>
      </div>
    </div>
    </section>
  );
}

export function ProblemStats() {
  return (
    <section className="stats-band">
      <div className="wrap pad">
        <div className="head">
          <p className="eyebrow eyebrow--c reveal">The state of independent publishing today</p>
          <h2 className="h2 reveal" style={{ marginTop: 14 }}>Newsrooms are shrinking. <span className="mark">Independent editors are stretched thin.</span></h2>
        </div>
        <div className="stats-band__grid" style={{ marginTop: 38 }}>
          {vertical.problemStats.map((stat, i) => (
            <div className="stats-band__item reveal" key={stat.label} style={{ ['--d' as any]: `${i * 0.08}s` }}>
              <div className="stats-band__num">{stat.value}</div>
              {stat.suffix && <p className="stats-band__suffix">{stat.suffix}</p>}
              <p className="stats-band__label">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="stats-band__sources">
          Sources ·{" "}
          {vertical.problemStatsSources.map((s, i) => (
            <span key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
              {i < vertical.problemStatsSources.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

export function FeaturesBento() {
  return (
    <section className="page active" id="features"><div className="wrap pad">
      <header className="head">
        <p className="eyebrow eyebrow--c reveal">Features</p>
        <h2 className="display reveal">Everything you need. <span className="mark">Nothing you don't.</span></h2>
        <p className="lead center mxw-52 reveal" style={{ marginTop: 16 }}>A focused set of tools, engineered to work together — not against you.</p>
      </header>
      <div className="bento" style={{ marginTop: 42 }}>
        <div className="card panel tall reveal" style={{ padding: 30 }}>
          <div className="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3z"/></svg></div>
          <h3 className="h3" style={{ color: 'var(--on-slate)', margin: '18px 0 10px', fontSize: '1.5rem' }}>PressRoom, your research partner</h3>
          <p style={{ color: 'var(--on-slate-2)', fontSize: '1rem', lineHeight: 1.6 }}>A conversational research partner that surfaces sources, gathers citations, and synthesizes coverage — so you can write your own story. Built to verify, not to guess.</p>
          <p style={{ marginTop: 18 }}><span className="tag tag--dark tag--live">Live</span></p>
        </div>
        <div className="card reveal" style={{ ['--d' as any]: '.06s' }}>
          <div className="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h9l5 5v13H6z M15 3v5h5M9 13h7M9 17h5"/></svg></div>
          <h3 className="h3">A word-processor for stories</h3>
          <p>A real editor with focus mode, autosave, and print-ready formatting. Built for production — not for notes.</p>
        </div>
        <div className="card reveal" style={{ ['--d' as any]: '.12s' }}>
          <div className="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l9 5-9 5-9-5 9-5z M3 13l9 5 9-5M3 17l9 5 9-5"/></svg></div>
          <h3 className="h3">Projects</h3>
          <p>Upload sources, style guides, and your own past coverage. PressRoom grounds every answer in the context you've built.</p>
        </div>
        <div className="card reveal" style={{ ['--d' as any]: '.06s' }}>
          <div className="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg></div>
          <h3 className="h3">CMS-ready export formats</h3>
          <p>JSON, Markdown with front-matter, DOCX, and PDF — structured and clean. Native CMS connectors are on the roadmap. <span className="tag tag--road" style={{ marginTop: 8 }}>Roadmap: WordPress · Ghost · Webflow</span></p>
        </div>
        <div className="card reveal" style={{ ['--d' as any]: '.12s' }}>
          <div className="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z M9 12l2 2 4-4"/></svg></div>
          <h3 className="h3">Citations on every answer</h3>
          <p>Every factual claim ships with a reference. Every source is numbered. No anonymous claims.</p>
        </div>
        <div className="card reveal">
          <div className="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z"/></svg></div>
          <h3 className="h3">Built for independent publishers</h3>
          <p>Designed for editors without a journalism degree and without an enterprise CMS budget. Depth without the learning curve.</p>
        </div>
        <div className="card reveal" style={{ ['--d' as any]: '.06s' }}>
          <div className="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5.5A2.5 2.5 0 016.5 3H12v18H6.5A2.5 2.5 0 014 18.5v-13zM20 5.5A2.5 2.5 0 0017.5 3H12v18h5.5a2.5 2.5 0 002.5-2.5v-13z"/><path d="M8 8h1.6M8 12h1.6M14.4 8H16M14.4 12H16"/></svg></div>
          <h3 className="h3">Research depth, down to the source document</h3>
          <p>PressRoom is woven through the research itself, not bolted onto a chat window — surfacing the primary document alongside your draft, so source-checking stays one glance away, not a separate tab.</p>
        </div>
        <div className="card reveal" style={{ ['--d' as any]: '.12s' }}>
          <div className="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/></svg></div>
          <h3 className="h3">Find it in your archive</h3>
          <p>Describe a theme in your own words — "the funding gap," "the pattern we flagged last spring" — and get back the coverage that addresses it most closely, with a citation, not a guess.</p>
          <div className="bento-demo" aria-hidden="true">
            <span className="bento-demo__q">"contradicts our earlier reporting"</span>
            <span className="bento-demo__a">→ March 2026 transit coverage</span>
          </div>
        </div>
      </div>
    </div></section>
  );
}

export function HowItWorks() {
  return (
    <section className="page active" id="how"><div className="wrap pad">
      <header className="head">
        <p className="eyebrow eyebrow--c reveal">How it works</p>
        <h2 className="display reveal">From topic to <span className="mark">publish</span>, in three moves.</h2>
        <p className="lead center mxw-52 reveal" style={{ marginTop: 16 }}>No personas to configure, no prompt-craft to learn. Just the reporting, the way you already do it — faster.</p>
      </header>
      <div className="steps" style={{ marginTop: 42 }}>
        <div className="card step reveal">
          <span className="num">01</span>
          <div className="icon icon--paper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5V6a2 2 0 012-2h12v16M6 17h12"/></svg></div>
          <h3 className="h3">Bring the story</h3>
          <p>Drop in this week's topic or pick it from your beat. PressRoom reads it in context — the background, the surrounding coverage, the primary documents.</p>
        </div>
        <div className="card step reveal" style={{ ['--d' as any]: '.1s' }}>
          <span className="num">02</span>
          <div className="icon icon--paper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></div>
          <h3 className="h3">Research, cited</h3>
          <p>PressRoom surfaces sources, synthesizes the archive you've added, and pulls your own past notes. Every claim is tied to its source. Nothing anonymous.</p>
        </div>
        <div className="card step reveal" style={{ ['--d' as any]: '.2s' }}>
          <span className="num">03</span>
          <div className="icon icon--paper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h9l5 5v13H6z M15 3v5h5M9 14h6"/></svg></div>
          <h3 className="h3">You write the story</h3>
          <p>Move to the editor with your research beside you. Outline, draft, and format in your own voice. PressRoom clears the runway; you still publish.</p>
        </div>
      </div>
      <div className="panel reveal" style={{ marginTop: 42, padding: 'clamp(26px,4vw,44px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, alignItems: 'center' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--on-slate-2)' }}>See it in motion</p>
          <h3 className="h2" style={{ color: 'var(--on-slate)', margin: '14px 0 14px', fontSize: '2rem' }}>The runway, cleared.</h3>
          <p style={{ color: 'var(--on-slate-2)', lineHeight: 1.6, margin: '0 0 22px' }}>
            This is the whole loop: a topic in, a researched and cited brief out, the draft still yours to write. The third source below is one of your <em style={{ color: 'var(--brass-hi)' }}>own</em> saved notes — context a general chatbot can never see.
          </p>
          <AuthCTA className="btn btn--ink"><>Try it free <span className="ar">→</span></></AuthCTA>
        </div>
        <div className="study panel" style={{ boxShadow: 'none', background: 'rgba(0,0,0,.18)', borderColor: 'var(--slate-line)' }}>
          <div className="body" style={{ padding: '20px 20px 6px' }}>
            <p className="ref" style={{ fontSize: '1.1rem' }}>Housing Report — Where the Numbers Diverge</p>
            <p className="note" style={{ fontSize: '.95rem', marginBottom: 18 }}>The report moves from a headline number to a contested denominator<sup className="cite">1</sup>, and your archive already flagged the same gap last year<sup className="cite">2</sup>.</p>
            <div className="src" style={{ paddingTop: 13 }}>
              <p className="src-l">Sources</p>
              <ol className="src-list">
                <li><span className="sn">1</span><span>Cross-reference · county housing report, p. 3</span></li>
                <li><span className="sn">2</span><span>Your note · <em>"Rent gap" — housing series</em></span></li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div></section>
  );
}

export function UseCasesSection() {
  return (
    <PersonasExplorer
      eyebrow="Solutions"
      title={<>Built around the <span className="mark">weekly cycle</span>.</>}
      subtitle="However you report and publish, PressRoom meets the work you already do — and gives the hours back. Five editors, five weeks — find the one that sounds like yours."
      id="usecases"
    />
  );
}

export function IntegrationsSection() {
  const grp = (h: string, kind: "live" | "road", items: string[]) => (
    <div className="intg-group reveal">
      <h4>{h} <span className={`tag tag--${kind}`}>{kind === "live" ? "Live" : "Roadmap"}</span></h4>
      <div className="intg-grid">
        {items.map(nm => (
          <div className="intg" key={nm}>
            <span className="nm"><span className="dotmark" style={kind === "road" ? { background: "var(--warn)" } : undefined}></span>{nm}</span>
            <span className={`tag tag--${kind}`}>{kind === "live" ? "Live" : "Roadmap"}</span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <section className="page active" id="integrations"><div className="wrap pad">
      <header className="head">
        <p className="eyebrow eyebrow--c reveal">Integrations</p>
        <h2 className="display reveal">Plug in. <span className="mark">Don't rip out.</span></h2>
        <p className="lead center mxw-52 reveal" style={{ marginTop: 16 }}>Bring the tools you already use. We'll add the rest as we earn your trust — and we'll always tell you what's live versus planned.</p>
      </header>
      <div style={{ maxWidth: 900, margin: '42px auto 0' }}>
        {grp("Docs & export", "live", ["Google Drive", "Google Docs export", "DOCX & PDF", "Markdown / copy"])}
        {grp("Sign-in", "live", ["Google sign-in", "Email & password"])}
        {grp("Newsroom & CMS", "road", ["WordPress", "Ghost", "Webflow CMS"])}
        {grp("Wire & archive", "road", ["AP wire feed", "RSS ingestion"])}
        <p className="muted reveal" style={{ fontSize: '.86rem', textAlign: 'center', marginTop: 8 }}>
          Need something specific for your newsroom's stack?{" "}
          <Link to="/contact" style={{ color: 'var(--brass)', textDecoration: 'underline', textUnderlineOffset: 2 }}>Tell us</Link>{" "}
          — roadmap priority follows founding-publisher requests.
        </p>
      </div>
    </div></section>
  );
}


const CHECKMARK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>;

const FC_JOURNEY = [
  { h: "Apply", b: "Tell us about your publication — where you are, what your week looks like, what you're hoping to build." },
  { h: "Onboard", b: "We set up your Projects together — your archive, your style guide, the stories you've already written." },
  { h: "Two production cycles", b: "Use PressRoom for real production, start to finish, on the schedule you already keep. We watch, we listen, we fix what's broken." },
  { h: "Shape the roadmap", b: "Your feedback becomes the next feature. Founding publishers don't get a product built for them — they get a hand in building it." },
];

export function FoundingChurches() {
  return (
    <section className="page active" id="customers"><div className="wrap pad">
      <header className="head">
        <p className="eyebrow eyebrow--c reveal">Founding publisher program</p>
        <h2 className="display reveal">Built <span className="mark">with</span> publishers — not marketed <span className="mark">to</span> them.</h2>
        <p className="lead center mxw-60 reveal" style={{ marginTop: 16 }}>A pilot for independent editors and small newsroom leaders who are building something out of not much — the same way we are. This is the room we built for you, not a waitlist.</p>
      </header>

      <div className="fc-journey reveal" style={{ ['--d' as any]: '.08s' }}>
        {FC_JOURNEY.map((step, i) => (
          <div className="fc-step" key={step.h}>
            <span className="fc-step__n">{i + 1}</span>
            <h4>{step.h}</h4>
            <p>{step.b}</p>
          </div>
        ))}
      </div>

      <div className="panel fc-vision reveal" style={{ marginTop: 52 }}>
        <p className="eyebrow" style={{ color: 'var(--on-slate-2)', justifyContent: 'center' }}>For the newsroom that doesn't exist yet</p>
        <blockquote style={{ marginTop: 18 }}>
          "Every established publishing tool was built for a newsroom that already had the budget, the staff, and the ad sales team. We're building this one for the freelancer running an investigation out of a spare bedroom, and the founder-editor who inherited a mailing list and a shrinking budget — because that's who's going to file the next generation of stories."
        </blockquote>
        <cite>— The team building Hunt's Pointe</cite>
      </div>

      <div className="found" style={{ marginTop: 52 }}>
        <div className="grid" style={{ gap: 18 }}>
          <div className="card reveal" style={{ ['--d' as any]: '.06s' }}>
            <h3 className="h3" style={{ marginBottom: 14 }}>What founding publishers get</h3>
            <div className="kv">
              <div className="kv__row">{CHECKMARK}<p><b>A direct line</b> to the people building it — not a support queue.</p></div>
              <div className="kv__row">{CHECKMARK}<p><b>Real influence</b> over the roadmap, the citations, and what ships next.</p></div>
              <div className="kv__row">{CHECKMARK}<p><b>Locked founding pricing</b>, for as long as you stay with us.</p></div>
              <div className="kv__row">{CHECKMARK}<p><b>First access</b> to every new export format, guide type, and feature.</p></div>
            </div>
          </div>
          <div className="card reveal" style={{ ['--d' as any]: '.12s' }}>
            <h3 className="h3" style={{ marginBottom: 14 }}>What we ask</h3>
            <div className="kv">
              <div className="kv__row">{CHECKMARK}<p>Use it for <b>real production</b> — two cycles, start to finish.</p></div>
              <div className="kv__row">{CHECKMARK}<p>Tell us the truth, especially when it <b>isn't working</b>.</p></div>
              <div className="kv__row">{CHECKMARK}<p>A short conversation now and then about what you need next.</p></div>
            </div>
          </div>
        </div>
        <div className="card reveal fc-honest" style={{ padding: 32, ['--d' as any]: '.18s' }}>
          <p className="eyebrow">The honest version</p>
          <h3 className="h3" style={{ margin: '14px 0 12px' }}>Why this page has no logos yet.</h3>
          <p className="muted" style={{ lineHeight: 1.65, margin: '0 0 20px' }}>
            Most early-stage tools fill this page with stock logos and round numbers nobody can verify. We won't — when real publications are ready to be named, their stories will live here in their own words, with their own numbers. Until then, we'd rather show you the tool than a testimonial we wrote ourselves.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn--ink" to="/contact">Apply to be a founding publisher <span className="ar">→</span></Link>
            <Link className="btn btn--ghost" to="/contact">Talk to us first</Link>
          </div>
        </div>
      </div>
    </div></section>
  );
}

export function PricingSection() {
  return (
    <section className="page active" id="pricing"><div className="wrap pad">
      <header className="head">
        <p className="eyebrow eyebrow--c reveal">Pricing</p>
        <h2 className="display reveal">Simple, <span className="mark">honest</span> pricing.</h2>
        <p className="lead center reveal" style={{ marginTop: 16 }}>Six tiers. Start free on Brief, and grow into the one that matches your week.</p>
      </header>

      <PricingTiers />

      <div className="card reveal church-cta" style={{ marginTop: 32, padding: 26 }}>
        <div>
          <h3 className="h3" style={{ marginBottom: 6 }}>Multi-contributor team or newsroom network?</h3>
          <p className="muted" style={{ margin: 0 }}>Shared Projects, team onboarding, and seats across your masthead — with SSO/SAML <span className="tag tag--road">Roadmap</span> on the way.</p>
        </div>
        <Link className="btn btn--ghost" to="/contact">Talk to us <span className="ar">→</span></Link>
      </div>

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <a
          className="btn btn--ghost"
          href="#comparison"
          onClick={(e) => { e.preventDefault(); document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
        >
          Compare all plans <span className="ar">↓</span>
        </a>
      </div>

      <div className="pad-t" id="comparison">
        <div className="head">
          <p className="eyebrow eyebrow--c reveal">The comparison</p>
          <h2 className="h2 reveal" style={{ marginTop: 14 }}>How we <span className="mark">stack up</span>.</h2>
          <p className="lead center reveal" style={{ marginTop: 12 }}>An honest look at the alternatives.</p>
        </div>
        <div className="cmp-wrap reveal" style={{ maxWidth: 820, margin: '30px auto 0' }}>
          <table className="cmp">
            <thead><tr><th>Capability</th><th className="us us-col">Hunt's Pointe</th><th>ChatGPT</th><th>Enterprise CMS</th></tr></thead>
            <tbody>
              {[
                ["Manuscript stays human-only (margin suggestions, never overwrites)","yes","no","na"],
                ["Cites every factual claim","yes","no","par"],
                ["Synthesizes sources (not just shows them)","yes","par","no"],
                ["Usable without an enterprise budget","yes","yes","no"],
                ["Grounds answers in YOUR archive","yes","no","no"],
                ["Word-processor for story drafting","yes","no","par"],
                ["Honest about model retention","yes","no","na"],
                ["Under $50 / month","yes","yes","no"],
              ].map(([cap, us, chat, cms]) => (
                <tr key={cap}>
                  <td>{cap}</td>
                  {[us, chat, cms].map((v, idx) => (
                    <td key={idx} className={`${idx === 0 ? 'us-col ' : ''}${v === 'yes' ? 'yes' : v === 'no' ? 'no' : v === 'par' ? 'par' : ''}`}>
                      {v === 'yes' ? '✓' : v === 'no' ? '✕' : v === 'par' ? 'partial' : 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pad-t">
        <div className="head">
          <p className="eyebrow eyebrow--c reveal">Questions</p>
          <h2 className="h2 reveal" style={{ marginTop: 14 }}>Frequently asked <span className="mark">questions</span>.</h2>
        </div>
        <FAQList />
      </div>
    </div></section>
  );
}

const FAQS: Array<[string, string]> = [
  ["Does PressRoom write my story for me?", "No — and that's deliberate. PressRoom does the research: it surfaces sources, gathers citations, and synthesizes coverage, all traced. The story, the argument, and the words that go to your readers stay yours. In the editor, PressRoom can only propose changes in the margin — never overwrite your manuscript."],
  ["How is this different from ChatGPT or an enterprise CMS?", "ChatGPT is fast but will confidently invent a citation and edits your draft in place. An enterprise CMS is rigorous but costs thousands and assumes a dedicated ops team. Hunt's Pointe sits in the middle — depth and citations, without the cost or the learning curve — and grounds answers in the archive you upload, without ever touching your prose directly."],
  ["Which export formats are available?", "Structured formats are live now: JSON, Markdown with front-matter, DOCX, and PDF, all CMS-ready. Native connectors — WordPress, Ghost, Webflow — are on the roadmap and will arrive properly built, not scraped together."],
  ["Where does my data go?", "Honestly: AI requests are routed through the Lovable AI Gateway to Google Gemini and OpenAI models. We do not yet have zero-retention agreements with those providers, so we tell you plainly — don't paste embargoed source material or unpublished investigative details. Your data is encrypted in transit and at rest, and you can delete your account anytime. See the Security page for the full posture."],
  ["Will this make my writing sound like AI wrote it?", "That's the risk we designed against. PressRoom never edits your draft in place — every suggestion is a margin annotation you integrate by hand. A cadence dial flags edits that would flatten your natural sentence rhythm, and Voice Locks protect your idiosyncratic style markers from ever being \"corrected\" away."],
  ["How much does it cost?", "There's a free forever tier — Brief — with no credit card. From there it's Bulletin ($9.99), Dispatch ($14.99), Desk ($19.99, the core plan), Bureau ($29.99), and Masthead ($49.99), each with more tokens and story capacity than the last. Need more room in a given month? Top up with a pay-as-you-go token pack. Multi-contributor teams and newsroom networks get a custom plan — reach out and we'll size it to you."],
  ["Why does AI-assisted reporting matter right now?", "Roughly a third of U.S. newspapers have closed since 2005, and more than 200 counties now have no local news source at all (Northwestern Medill, State of Local News). At the same time, public trust in mass media sits near a historic low (Gallup). Fewer resources and less institutional trust to draw on means every hour spent on manual fact-checking or reformatting is an hour not spent reporting. PressRoom exists to give that hour back."],
];

import { useState as useFAQState } from "react";

export function FAQList() {
  const [open, setOpen] = useFAQState<number | null>(null);
  return (
    <div className="faq" style={{ marginTop: 30 }}>
      {FAQS.map(([q, a], i) => (
        <div key={q} className={`faq__item reveal${open === i ? ' open' : ''}`}>
          <button className="faq__q" type="button" onClick={() => setOpen(open === i ? null : i)}>
            {q}
            <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div className="faq__a" style={{ maxHeight: open === i ? 600 : 0 }}>
            <p>{a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const SEC = [
  { t: "Encryption in transit & at rest", b: "All traffic uses TLS. Database storage is encrypted at rest by our managed Postgres provider. We do not roll our own crypto.", path: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></> },
  { t: "Row-level security on every table", b: "Postgres RLS policies scope every row to its owner. You cannot read another user's data — and neither can our staff without an explicit support request.", path: <><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 6l3 3M14 8l3 3"/></> },
  { t: "AI provider transparency", b: "AI requests route through the Lovable AI Gateway to Google Gemini and OpenAI models. We do not currently have zero-retention agreements with upstream providers — so don't paste embargoed source material or unpublished investigative details.", path: <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"/> },
  { t: "Compliance posture (honest)", b: "We are early-stage. SOC 2 Type II and ISO 27001 are on the roadmap, not yet earned. We will publish the audit reports the day they exist — and not a day before.", path: <><path d="M6 3h9l5 5v13H6z M15 3v5h5M9 13l2 2 4-4"/></> },
  { t: "Operational observability", b: "Edge function logs, request traces, and error reporting are retained for 30 days for debugging. PII is not logged in request bodies.", path: <path d="M3 12h4l2 6 4-12 2 6h6"/> },
  { t: "Account controls", b: "Email/password and Google sign-in are supported. SAML SSO is planned for Newsroom plans. Delete your account at any time and your data is purged within 30 days.", path: <><path d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 11a4 4 0 100-8 4 4 0 000 8zM19 8l2 2 2-2"/></> },
];

export function SecuritySection() {
  return (
    <section className="page active" id="security"><div className="wrap pad">
      <header className="head">
        <p className="eyebrow eyebrow--c reveal">Security &amp; transparency</p>
        <h2 className="display reveal">An <span className="mark">honest</span> security posture.</h2>
        <p className="lead center mxw-52 reveal" style={{ marginTop: 16 }}>We're early-stage and we say what is and isn't in place. No "enterprise-grade" marketing fog.</p>
      </header>
      <div className="sec-grid" style={{ marginTop: 42 }}>
        {SEC.map((s, i) => (
          <div key={s.t} className="panel sec-card reveal" style={{ ['--d' as any]: `${(i % 3) * 0.06}s` }}>
            <div className="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{s.path}</svg></div>
            <h3 className="h3">{s.t}</h3>
            <p>{s.b}</p>
          </div>
        ))}
      </div>
      <div className="panel reveal" style={{ marginTop: 32, padding: 'clamp(24px,4vw,40px)', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 30, alignItems: 'center' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--on-slate-2)' }}>Security &amp; trust</p>
          <h3 className="h2" style={{ color: 'var(--on-slate)', fontSize: '1.8rem', margin: '14px 0 12px' }}>What's live, what's coming.</h3>
          <p style={{ color: 'var(--on-slate-2)', lineHeight: 1.6, margin: 0 }}>Encryption and access controls are in place today. Formal certifications are on a transparent roadmap — labelled honestly, never implied.</p>
        </div>
        <div className="badges">
          {[
            ["AES-256 at rest","live"],
            ["99.9% uptime","live"],
            ["GDPR aligned","live"],
            ["SOC 2 Type II","road"],
            ["ISO 27001","road"],
          ].map(([label, kind]) => (
            <div key={label} className="badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brass-hi)" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/></svg>
              <div><b>{label}</b><br/><span className={`tag tag--dark tag--${kind}`}>{kind === "live" ? "Live" : "Roadmap"}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div></section>
  );
}

export function ChangelogSection() {
  const items = [
    ["v1.0", "June 1, 2026", "Mobile implementation — full research and drafting on a phone, for production that happens between meetings."],
    ["v0.1.2", "May 2, 2026", "Significant improvements to PressRoom's research quality and citation accuracy."],
    ["v0.1.1", "April 1, 2026", "Enhanced Projects, editor refinements, and general improvements."],
    ["v0.1", "March 1, 2026", "Initial MVP — PressRoom research partner, the story editor, and the Newsroom."],
  ];
  return (
    <section className="page active" id="changelog"><div className="wrap pad">
      <header className="head">
        <p className="eyebrow eyebrow--c reveal">Changelog</p>
        <h2 className="display reveal"><span className="mark">What's</span> new.</h2>
        <p className="lead center reveal" style={{ marginTop: 16 }}>Everything we've shipped, version by version.</p>
      </header>
      <div className="tl reveal" style={{ marginTop: 42 }}>
        {items.map(([v, d, body]) => (
          <div key={v} className="tl__item">
            <span className="tl__dot"></span>
            <div className="tl__v"><b>{v}</b><span>{d}</span> <span className="tag">Feature</span></div>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </div></section>
  );
}

export function BlogSection() {
  const posts = [
    ["Craft","Writing for a readership that's fact-checking you in real time","What changes — and what doesn't — when half the room can verify your sourcing before you hit publish."],
    ["Sourcing","Primary documents vs. secondary coverage — when to reach for which","Two legitimate sources, two different jobs. When to cite the filing and when to cite the reporter who found it."],
    ["Ethics","Is it honest to use AI in the newsroom?","The honest case for — and the lines we refuse to cross — from the people building the tool."],
  ];
  return (
    <section className="page active" id="blog"><div className="wrap pad">
      <header className="head" style={{ textAlign: 'left', maxWidth: 760, marginLeft: 0 }}>
        <p className="eyebrow reveal">Blog</p>
        <h2 className="display reveal" style={{ margin: '18px 0 16px' }}>Notes from the <span className="mark">workbench</span>.</h2>
        <p className="lead reveal mxw-52">Product thinking, editorial craft, and the occasional strong opinion. First essays are on the way.</p>
      </header>
      <div className="posts" style={{ marginTop: 42 }}>
        {posts.map(([cat, title, body], i) => (
          <article key={title} className="card post reveal" style={{ ['--d' as any]: `${i * 0.06}s` }}>
            <div className="meta"><span className="tag tag--road">Coming soon</span> {cat}</div>
            <h3 className="h3">{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </div></section>
  );
}

const CONTACT_FIELDS = [
  ["Email", "hello@huntspointe.com", "We read every message ourselves.", <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>],
  ["Support", "support@huntspointe.com", "Typically within one business day.", <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>],
] as const;

function useContactForm() {
  const [values, setValues] = useContactState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useContactState<Record<string, string>>({});

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: "" }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = "Tell us who you are.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) nextErrors.email = "That doesn't look like a valid email.";
    if (!values.message.trim()) nextErrors.message = "Say a bit about what you need.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const subject = values.subject.trim() || "Message from huntspointe.com";
    const body = `${values.message}\n\n— ${values.name} (${values.email})`;
    window.location.href = `mailto:hello@huntspointe.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return { values, errors, set, submit };
}

import { useState as useContactState } from "react";

export function ContactSection() {
  const { values, errors, set, submit } = useContactForm();
  return (
    <section className="page active" id="contact"><div className="wrap pad">
      <header className="head" style={{ textAlign: 'left', maxWidth: 760, marginLeft: 0 }}>
        <p className="eyebrow reveal">Contact</p>
        <h2 className="display reveal" style={{ margin: '18px 0 16px' }}>Say <span className="mark">hello</span>.</h2>
        <p className="lead reveal mxw-52">A question, a partnership idea, or you just want to talk shop — we read every message.</p>
      </header>
      <div className="cct" style={{ marginTop: 38 }}>
        <div className="cct__info">
          {CONTACT_FIELDS.map(([label, val, note, icon], i) => (
            <div key={label as string} className="info-card reveal" style={{ ['--d' as any]: `${i * 0.06}s` }}>
              <div className="icon icon--paper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{icon}</svg></div>
              <div className="info-card__body"><b>{label}</b><span>{val}</span><small>{note}</small></div>
            </div>
          ))}
          <div className="panel info-founding reveal" style={{ ['--d' as any]: '.12s' }}>
            <p className="eyebrow" style={{ color: 'var(--on-slate-2)' }}>Founding publishers</p>
            <h3 className="h3" style={{ color: 'var(--on-slate)', margin: '12px 0 10px' }}>Running or launching a small publication?</h3>
            <p style={{ color: 'var(--on-slate-2)', fontSize: '.9rem', lineHeight: 1.6, margin: '0 0 20px' }}>We reply within a day, always a real person — and there's a whole program built for publications like yours.</p>
            <Link className="btn btn--ink btn--sm" to="/customers">See the founding publisher program <span className="ar">→</span></Link>
          </div>
        </div>
        <form className="card reveal" style={{ ['--d' as any]: '.06s', padding: 30 }} onSubmit={submit} noValidate>
          <h3 className="h3" style={{ marginBottom: 20 }}>Send a message</h3>
          <div className="field-2">
            <div className="field">
              <label htmlFor="contact-name">Name</label>
              <input id="contact-name" className="input" placeholder="Your name" value={values.name} onChange={set("name")} />
              {errors.name && <span style={{ color: 'var(--brass)', fontSize: '.78rem' }}>{errors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor="contact-email">Email</label>
              <input id="contact-email" className="input" placeholder="you@example.com" value={values.email} onChange={set("email")} />
              {errors.email && <span style={{ color: 'var(--brass)', fontSize: '.78rem' }}>{errors.email}</span>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="contact-subject">Subject</label>
            <input id="contact-subject" className="input" placeholder="What's this about?" value={values.subject} onChange={set("subject")} />
          </div>
          <div className="field">
            <label htmlFor="contact-message">Message</label>
            <textarea id="contact-message" className="textarea" placeholder="Tell us more…" value={values.message} onChange={set("message")}></textarea>
            {errors.message && <span style={{ color: 'var(--brass)', fontSize: '.78rem' }}>{errors.message}</span>}
          </div>
          <button className="btn btn--ink" type="submit">Send message <span className="ar">→</span></button>
          <p style={{ marginTop: 12, fontSize: '.78rem', color: 'var(--ink-2)' }}>Opens your email client with this pre-filled — we read every message ourselves.</p>
        </form>
      </div>
    </div></section>
  );
}

const LEARN_GUIDES = [
  {
    label: "Getting started",
    blurb: "The lay of the land — how the rooms of the newsroom fit together.",
    topics: ["A tour of your newsroom", "Your first week"],
    path: <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3z"/>,
  },
  {
    label: "PressRoom",
    blurb: "Your research partner for reporting, verification, and editorial writing.",
    topics: ["Asking better research questions", "Grounding answers in your own archive"],
    path: <path d="M12 3l9 5-9 5-9-5 9-5z M3 13l9 5 9-5M3 17l9 5 9-5"/>,
  },
  {
    label: "Write",
    blurb: "The blank page, with a research partner one keystroke away.",
    topics: ["The PressRoom margin assistant", "Focus mode"],
    path: <path d="M6 3h9l5 5v13H6z M15 3v5h5M9 13h7M9 17h5"/>,
  },
  {
    label: "Projects",
    blurb: "Your bookshelf — the sources PressRoom studies before it answers.",
    topics: ["What belongs in a project", "Adding items"],
    path: <path d="M4 19.5V6a2 2 0 012-2h12v16M6 17h12"/>,
  },
  {
    label: "Newsroom",
    blurb: "Where finished work lives — and leaves.",
    topics: ["Finding what you made", "Exporting for staging"],
    path: <path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v13H4zM4 12h16M9 16h6"/>,
  },
  {
    label: "Analytics",
    blurb: "Stewardship of the tool itself — usage, cost, and history.",
    topics: ["Reading the usage dashboard", "Working from history"],
    path: <path d="M4 20V10M11 20V4M18 20v-7"/>,
  },
];

export function LearningSection() {
  return (
    <section className="page active" id="learning"><div className="wrap pad">
      <header className="head">
        <p className="eyebrow eyebrow--c reveal">Learning</p>
        <h2 className="display reveal">Everything you need <span className="mark">to feel at home</span>.</h2>
        <p className="lead center mxw-60 reveal" style={{ marginTop: 16 }}>Guides for every room of the newsroom, answers to the questions we hear most, and — coming soon — a place to just ask.</p>
      </header>

      <div className="pad-t">
        <p className="eyebrow eyebrow--c reveal">Guides</p>
        <div className="grid cols-3 reveal" style={{ marginTop: 30 }}>
          {LEARN_GUIDES.map((g, i) => (
            <div key={g.label} className="card learn-card reveal" style={{ ['--d' as any]: `${i * 0.05}s` }}>
              <div className="icon icon--paper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{g.path}</svg></div>
              <h3 className="h3">{g.label}</h3>
              <p>{g.blurb}</p>
              <ul className="learn-card__topics">
                {g.topics.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="pad-t">
        <div className="head">
          <p className="eyebrow eyebrow--c reveal">Questions</p>
          <h2 className="h2 reveal" style={{ marginTop: 14 }}>Frequently asked <span className="mark">questions</span>.</h2>
        </div>
        <FAQList />
      </div>

      <div className="pad-t">
        <div className="panel learn-ask reveal">
          <span className="tag tag--dark tag--road">Coming soon</span>
          <h3 className="h2" style={{ color: 'var(--on-slate)', margin: '16px 0 10px', fontSize: '1.6rem' }}>Ask, and we'll answer.</h3>
          <p style={{ color: 'var(--on-slate-2)', maxWidth: '56ch' }}>A place to ask your own question about Hunt's Pointe in plain language and get a real answer back — no digging through guides. We're building it now.</p>
          <div className="learn-ask__input">
            <input disabled placeholder="Ask anything about Hunt's Pointe…" aria-label="Ask a question (coming soon)" />
            <button disabled type="button">Ask</button>
          </div>
        </div>
      </div>
    </div></section>
  );
}

export function AboutSection() {
  return (
    <section className="page active" id="about"><div className="wrap">
      <div className="pad" style={{ textAlign: 'center' }}>
        <p className="eyebrow eyebrow--c reveal">About</p>
        <h2 className="display reveal" style={{ marginTop: 18 }}>A research partner.<br/><span className="mark">Not a byline replacement.</span></h2>
      </div>
      <hr className="divline" />
      <div className="pad about-sec">
        <p className="eyebrow reveal" style={{ marginBottom: 18 }}>The problem · good tools, wrong people</p>
        <p className="reveal">A legacy enterprise CMS is a serious publishing environment. It is also thousands of dollars for a usable license and assumes you have an ops team and a free weekend to learn the interface. Free reference tools are excellent, but they show you sources instead of synthesizing them. ChatGPT is fast and synthesizes everything — but it does not know your house style from a hole in the ground, and it will not cite a claim it cannot find.</p>
        <p className="reveal">Most editors launching publications today are caught in the middle: more editorial depth than ChatGPT can responsibly produce, less time and money than an enterprise CMS requires.</p>
        <p className="reveal">
          And the stakes are rising. Roughly a third of U.S. newspapers have closed since 2005<sup className="cite">1</sup>. At the same time, public trust in mass media sits near a historic low, and independent outlets are asked to do more reporting with fewer resources and less institutional trust to draw on<sup className="cite">2</sup>. Fewer resources and more strain on the people still reporting — that's exactly the gap a research partner should close, not widen.
        </p>
        <div className="src" style={{ marginTop: 18 }}>
          <p className="src-l">Sources · traced to origin</p>
          <ol className="src-list">
            <li><span className="sn">1</span><span>Northwestern Medill, State of Local News Project</span></li>
            <li><span className="sn">2</span><span>Gallup, Media Trust Poll</span></li>
          </ol>
        </div>
        <p className="reveal"><strong>Hunt's Pointe exists for that middle.</strong></p>
      </div>
      <hr className="divline" />
      <div className="pad about-sec">
        <p className="eyebrow reveal" style={{ marginBottom: 18 }}>The philosophy · research, then publish</p>
        <p className="reveal">PressRoom is a research companion. It outlines reporting, gathers citations, and synthesizes coverage. It will not write your story for you — and in the editor, it can only propose changes in the margin, never overwrite your manuscript. Publishing is editorial integrity. That stays with you.</p>
      </div>
      <div className="wrap" style={{ paddingBottom: 0 }}>
        <div className="grid cols-3">
          <div className="card reveal"><h3 className="h3" style={{ marginBottom: 10 }}>Citations on every claim</h3><p>Every factual claim ships with a reference. Every source is numbered. Anything we cannot verify is marked as background, not fact.</p></div>
          <div className="card reveal" style={{ ['--d' as any]: '.06s' }}><h3 className="h3" style={{ marginBottom: 10 }}>Suggestion-only, always</h3><p>No rewrite buttons that overwrite your prose. PressRoom proposes in the margin; you decide what makes it into the piece.</p></div>
          <div className="card reveal" style={{ ['--d' as any]: '.12s' }}><h3 className="h3" style={{ marginBottom: 10 }}>Honest about the tool</h3><p>We tell you what is and isn't in place — the security posture, the data flow, the model providers. No "enterprise-grade" marketing fog.</p></div>
        </div>
      </div>
      <div className="pad about-sec">
        <p className="eyebrow reveal" style={{ marginBottom: 18 }}>The commitment · built for independent publishers</p>
        <p className="reveal">Our first user is the independent editor under 40 launching a publication — serious about the work, light on budget, allergic to fluff. If we serve that editor well, we earn the right to serve larger newsrooms, established staff teams, and freelance networks. Not before.</p>
        <p className="reveal">We are working with a hand-picked group of founding publishers right now to get the tool, the citations, and the workflow correct before we open the doors wider.</p>
      </div>
      <div className="pad" style={{ paddingTop: 0 }}>
        <blockquote className="pullquote reveal">
          <q>The story is only as good as the sourcing behind it — and the sourcing is only as good as the hands that checked it.</q>
          <cite>— The team building Hunt's Pointe</cite>
        </blockquote>
      </div>
    </div></section>
  );
}
