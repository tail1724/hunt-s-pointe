import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const OUTPUTS: Record<string, { label: string; content: string }> = {
  platform_a: {
    label: "Platform A",
    content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
  },
  platform_b: {
    label: "Platform B",
    content: `Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
  },
  platform_c: {
    label: "Platform C",
    content: `Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.`,
  },
  platform_d: {
    label: "Platform D",
    content: `Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Maecenas faucibus mollis interdum. Sed posuere consectetur est at lobortis.`,
  },
};

export function MultiPlatformSection() {
  return (
    <section id="platforms" className="py-24 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            One Input. <span className="text-primary">Every Platform.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Automatically adapts
            your content to the specific format of every major platform.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="platform_a">
            <TabsList className="w-full justify-start">
              {Object.entries(OUTPUTS).map(([key, { label }]) => (
                <TabsTrigger key={key} value={key} className="flex-1">{label}</TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(OUTPUTS).map(([key, { content }]) => (
              <TabsContent key={key} value={key}>
                <div className="rounded-xl border border-border bg-card p-6 mt-2">
                  <pre className="font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">{content}</pre>
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Same input: <span className="font-mono text-primary">"Lorem ipsum"</span> — four completely different outputs.
          </p>
        </div>
      </div>
    </section>
  );
}
