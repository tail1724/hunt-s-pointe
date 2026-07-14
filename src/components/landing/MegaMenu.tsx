import { Link } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sparkles, Layers, Plug, Shield, FileText, Briefcase, BookOpen, Users, Mail, Building2 } from "lucide-react";

const PRODUCT_ITEMS = [
  { icon: Sparkles, title: "Features", desc: "What you get out of the box.", to: "/#features" },
  { icon: Layers, title: "How It Works", desc: "The three-step product loop.", to: "/#how-it-works" },
  { icon: Plug, title: "Integrations", desc: "Connect your existing stack.", to: "/integrations" },
  { icon: Shield, title: "Security", desc: "How your data stays safe.", to: "/security" },
  { icon: FileText, title: "Changelog", desc: "Latest shipped updates.", to: "/changelog" },
];

const RESOURCE_ITEMS = [
  { icon: BookOpen, title: "Blog", desc: "Stories, insights, deep dives.", to: "/blog" },
  { icon: Users, title: "Customers", desc: "Case studies and outcomes.", to: "/customers" },
  { icon: Briefcase, title: "Use Cases", desc: "Workflows by vertical.", to: "/use-cases" },
  { icon: Mail, title: "Contact", desc: "Get in touch.", to: "/contact" },
  { icon: Building2, title: "About", desc: "Who we are and why.", to: "/about" },
];

function MegaList({ items }: { items: typeof PRODUCT_ITEMS }) {
  return (
    <ul className="grid w-[520px] gap-1 p-3 md:grid-cols-2">
      {items.map((item) => (
        <li key={item.title}>
          <Link
            to={item.to}
            className="flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring no-underline"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <item.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">{item.title}</div>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.desc}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ProductMegaMenu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="h-9 bg-transparent text-sm text-muted-foreground hover:text-foreground data-[state=open]:text-foreground">
            Product
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <MegaList items={PRODUCT_ITEMS} />
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="h-9 bg-transparent text-sm text-muted-foreground hover:text-foreground data-[state=open]:text-foreground">
            Resources
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <MegaList items={RESOURCE_ITEMS} />
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
