import { Link, useParams, Navigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { vertical } from "@/config/vertical";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { BlogSection } from "@/components/public/sections/AllSections";

export default function Blog() {
  return (
    <>
      <SEO title={`Blog — ${APP_NAME}`} description="Notes from the workbench." path="/blog" />
      <BlogSection />
    </>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const post = vertical.blogPosts.find((p) => p.slug === slug);
  if (!post) return <Navigate to="/blog" replace />;
  return (
    <>
      <SEO title={post.title} description={post.excerpt} path={`/blog/${post.slug}`} />
      <article className="page active"><div className="wrap pad" style={{ maxWidth: 760 }}>
        <Link to="/blog" className="eyebrow" style={{ marginBottom: 24, display: 'inline-flex' }}>
          <ArrowLeft className="h-4 w-4" /> All posts
        </Link>
        <p className="eyebrow" style={{ marginTop: 16 }}>{post.tag} · {post.date}</p>
        <h1 className="display" style={{ marginTop: 14 }}>{post.title}</h1>
        <p className="lead" style={{ marginTop: 18 }}>{post.excerpt}</p>
        <div className="muted" style={{ marginTop: 30, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{post.body}</div>
      </div></article>
    </>
  );
}
