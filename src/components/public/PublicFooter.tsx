import { Link } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";

const COLS = [
  { h: "Product", items: [
    { label: "Features", to: "/#features" },
    { label: "How it works", to: "/#how" },
    { label: "Integrations", to: "/integrations" },
    { label: "Security", to: "/security" },
    { label: "Changelog", to: "/changelog" },
    { label: "Pricing", to: "/pricing" },
  ]},
  { h: "Solutions", items: [
    { label: "Use cases", to: "/use-cases" },
    { label: "Founding churches", to: "/customers" },
  ]},
  { h: "Resources", items: [
    { label: "Learning", to: "/learning" },
    { label: "Blog", to: "/blog" },
    { label: "Help / support", to: "/contact" },
  ]},
  { h: "Company", items: [
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ]},
  { h: "Legal", items: [
    { label: "Privacy policy", to: "/privacy" },
    { label: "Terms of service", to: "/terms" },
    { label: "AI safety policy", to: "/ai-safety" },
  ]},
];

export function PublicFooter() {
  return (
    <footer><div className="wrap">
      <div className="foot">
        <div className="foot__brand">
          <Link className="brand" to="/">
            <BrandMark size={30} />
          </Link>
          <p>A theological research partner for pastors who preach their own words.</p>
          <div className="socials">
            <a aria-label="X" href="#"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h3l-7 8 8 12h-6l-5-7-5 7H3l8-9L3 2h6l4 6z"/></svg></a>
            <a aria-label="GitHub" href="#"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-3 19.5c.5 0 .7-.2.7-.5v-2c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-1-.6 0-.6 0-.6 1 0 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9 0-.7.3-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.6 0-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 015 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.1 2.3.1 2.6.6.6 1 1.5 1 2.6 0 3.9-2.4 4.8-4.6 5 .3.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0012 2z"/></svg></a>
            <a aria-label="LinkedIn" href="#"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h4v16H4zM6 2a2 2 0 110 4 2 2 0 010-4zM10 8h4v2c.6-1 1.8-2 3.5-2 3 0 4.5 2 4.5 5v7h-4v-6c0-1.5-.5-2.5-2-2.5S14 14 14 15.5V20h-4z"/></svg></a>
          </div>
        </div>
        {COLS.map(col => (
          <div className="foot__col" key={col.h}>
            <h5>{col.h}</h5>
            <ul>{col.items.map(i => <li key={i.label}><Link to={i.to}>{i.label}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="foot__bar">
        <span>© {new Date().getFullYear()} Ezra Research. All rights reserved.</span>
        <span>English (US)</span>
      </div>
    </div></footer>
  );
}
