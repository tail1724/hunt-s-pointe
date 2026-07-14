import { Link } from "react-router-dom";
import { guidesByCategory } from "@/data/guides";
import { cn } from "@/lib/utils";

interface Props {
  activeSlug?: string;
}

/** The persistent guide index — categories → guides — that gives Learning its
 *  "docs site" spine. Rendered in the guide detail layout. */
export function GuideSidebar({ activeSlug }: Props) {
  return (
    <nav className="guide-nav" aria-label="Guides">
      <Link to="/learning" className="guide-nav__home">All guides</Link>
      {guidesByCategory().map(({ category, guides }) => (
        <div key={category} className="guide-nav__group">
          <p className="guide-nav__cat">{category}</p>
          <ul>
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  to={`/learning/${g.slug}`}
                  className={cn("guide-nav__link", g.slug === activeSlug && "is-active")}
                  aria-current={g.slug === activeSlug ? "page" : undefined}
                >
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
