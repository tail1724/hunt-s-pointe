import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SentientChat } from "@/components/sentient/SentientChat";
import { ClassicForm } from "@/components/prompt-central/ClassicForm";
import { ResearchPanel } from "@/components/prompt-central/ResearchPanel";
import { SessionList } from "@/components/prompt-central/SessionList";
import { SystemSyncPanel } from "@/components/sentient/SystemSyncPanel";
import { SentientConfig } from "@/components/sentient/SentientConfig";
import { BenchmarkToggle } from "@/components/sentient/BenchmarkToggle";
import { NexusPulse } from "@/components/sentient/NexusPulse";
import { MessageSquare, LayoutList, Search, History, Plus, Activity, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";

export default function PromptCentral() {
  const { user } = useAuth();
  const [showResearch, setShowResearch] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const [injectedText, setInjectedText] = useState<string | undefined>();

  const handleNewSession = useCallback(() => {
    setActiveSessionId(null);
    setSessionRefreshKey((k) => k + 1);
  }, []);

  const handleSessionCreated = useCallback((id: string) => {
    setActiveSessionId(id);
    setSessionRefreshKey((k) => k + 1);
  }, []);

  const handleInject = useCallback((text: string) => {
    setInjectedText(text);
  }, []);

  return (
    <div className="bg-transparent h-full flex flex-col overflow-hidden">
      <div className="w-full mx-auto px-4 md:px-6 py-4 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <NexusPulse state="idle" size={32} inline />
          <h1 className="font-display text-xl md:text-2xl font-extrabold tracking-tight">
            Ezra
          </h1>
          <div className="flex-1" />


          <Button
            variant={showResearch ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowResearch(!showResearch)}
          >
            <Search className="h-3.5 w-3.5" />
            Research
          </Button>

          {user && (
            <>
          {user && <BenchmarkToggle />}

          <Button
                variant={showSync ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowSync(!showSync)}
              >
                <Activity className="h-3.5 w-3.5" />
                Sync
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setShowConfig(!showConfig)}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleNewSession}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <History className="h-3.5 w-3.5" />
                    Sessions
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto" align="start">
                  <SessionList
                    activeSessionId={activeSessionId}
                    onSelect={(id) => setActiveSessionId(id)}
                    onNew={handleNewSession}
                    refreshKey={sessionRefreshKey}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>

        {/* Config panel */}
        {showConfig && user && (
          <div className="mb-4">
            <SentientConfig onClose={() => setShowConfig(false)} />
          </div>
        )}

        {/* Sync panel */}
        {showSync && user && (
          <div className="mb-4">
            <SystemSyncPanel onClose={() => setShowSync(false)} />
          </div>
        )}

        {/* Main layout */}
        <div className="flex gap-4 flex-1 min-h-0">
          <div
            className={`rounded-2xl overflow-hidden flex flex-col ${
              showResearch ? "w-3/5" : "w-full"
            }`}
          >
            <Tabs defaultValue="partner" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4 pt-2">
                <TabsTrigger value="partner" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Co-Pilot
                </TabsTrigger>
                <TabsTrigger value="classic" className="gap-2">
                  <LayoutList className="h-4 w-4" />
                  Classic
                </TabsTrigger>
              </TabsList>
              <TabsContent value="partner" className="mt-0">
                <SentientChat
                  key={activeSessionId || "new"}
                  sessionId={activeSessionId}
                  onSessionCreated={handleSessionCreated}
                  injectedText={injectedText}
                  onInjectedTextConsumed={() => setInjectedText(undefined)}
                />
              </TabsContent>
              <TabsContent value="classic" className="mt-0">
                <ClassicForm />
              </TabsContent>
            </Tabs>
          </div>

          {showResearch && (
            <div className="w-2/5 rounded-2xl border border-border overflow-hidden">
              <ResearchPanel onInject={handleInject} onClose={() => setShowResearch(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
