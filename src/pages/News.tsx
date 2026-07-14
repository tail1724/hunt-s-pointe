import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const articles = [
  {
    title: "Introducing Module System 2.0",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "April 2, 2026",
    tag: "Product",
  },
  {
    title: "Company Raises Seed Round",
    description: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    date: "March 18, 2026",
    tag: "Company",
  },
  {
    title: "New Multi-Platform Export Support",
    description: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    date: "March 5, 2026",
    tag: "Feature",
  },
  {
    title: "Why Structured Workflows Matter",
    description: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    date: "February 20, 2026",
    tag: "Blog",
  },
];

export default function News() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground mb-3">News</h1>
        <p className="text-muted-foreground mb-12 max-w-xl">
          The latest updates, announcements, and insights from our team.
        </p>

        <div className="grid gap-6">
          {articles.map((a) => (
            <Card key={a.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-1">
                  <Badge variant="secondary" className="text-xs">{a.tag}</Badge>
                  <span className="text-xs text-muted-foreground">{a.date}</span>
                </div>
                <CardTitle className="text-lg">{a.title}</CardTitle>
                <CardDescription>{a.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
