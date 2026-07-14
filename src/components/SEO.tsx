import { Helmet } from "react-helmet-async";
import { APP_NAME } from "@/lib/constants";

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
  /** Optional JSON-LD schema object */
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
}

/**
 * Per-route head tags. Override the static index.html defaults for
 * the current route — sets <title>, description, canonical, og:*.
 */
export function SEO({ title, description, path, jsonLd, noindex }: SEOProps) {
  const fullTitle = title.includes(APP_NAME) ? title : `${title} — ${APP_NAME}`;
  const canonical = path || (typeof window !== "undefined" ? window.location.pathname : "/");
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={fullTitle} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
