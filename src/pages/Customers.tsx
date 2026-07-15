import { Link, useParams, Navigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { vertical } from "@/config/vertical";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { FoundingChurches } from "@/components/public/sections/AllSections";
import { PersonasExplorer } from "@/components/public/sections/PersonasExplorer";

export default function Customers() {
  return (
    <>
      <SEO title={`Is PressRoom right for you? — ${APP_NAME}`} description="Five editorial personas, the Founding Publisher program, and why we're building with publishers, not marketing to them." path="/customers" />
      <PersonasExplorer
        eyebrow="Customers"
        title={<>Is this <span className="mark">right for you</span>?</>}
        subtitle="Before you take our word for it, see whether your week looks like one of these. Five editors, five ways PressRoom actually gets used."
        id="customer-personas"
      />
      <FoundingChurches />
    </>
  );
}

export function CustomerDetail() {
  const { slug } = useParams();
  const customer = vertical.customers.find((c) => c.slug === slug);
  if (!customer) return <Navigate to="/customers" replace />;
  return (
    <>
      <SEO title={`${customer.name} — Customer Story`} description={customer.summary} path={`/customers/${customer.slug}`} />
      <section className="page active"><div className="wrap pad">
        <Link to="/customers" className="eyebrow" style={{ marginBottom: 24, display: 'inline-flex' }}>
          <ArrowLeft className="h-4 w-4" /> All churches
        </Link>
        <p className="eyebrow" style={{ marginTop: 16 }}>{customer.industry}</p>
        <h1 className="display" style={{ marginTop: 14 }}>{customer.name}</h1>
        <p className="lead" style={{ marginTop: 18, maxWidth: 720 }}>{customer.summary}</p>
        <div className="grid cols-3" style={{ marginTop: 32 }}>
          {customer.metrics.map((m) => (
            <div key={m.label} className="card" style={{ textAlign: 'center' }}>
              <div className="display" style={{ fontSize: '2.4rem' }}>{m.value}</div>
              <div className="muted" style={{ fontSize: '.85rem' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div></section>
    </>
  );
}
