import { Button } from "@/components/ui/button";
import { QuickExport } from "@/components/QuickExport";
import { ArrowRight, BookmarkPlus, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

export type Msg = { role: "user" | "assistant"; content: string };

interface ChatMessagesProps {
  messages: Msg[];
  isLoading: boolean;
  onSendToBuild: (text: string) => void;
  onSaveAsTemplate: (text: string) => void;
  onRegenerate: () => void;
}

export function ChatMessages({
  messages,
  isLoading,
  onSendToBuild,
  onSaveAsTemplate,
  onRegenerate,
}: ChatMessagesProps) {
  return (
    <>
      {messages.length === 0 && (
        <div className="text-center text-muted-foreground py-16">
          <p className="text-lg font-display font-semibold mb-2">Context Engine Ready</p>
          <p className="text-sm">
            Describe your creative vision. I'll ask clarifying questions before crafting the perfect prompt.
          </p>
        </div>
      )}
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;
        const isAssistant = msg.role === "assistant";

        return (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {isAssistant ? (
                <div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.content.length > 50 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <QuickExport promptText={msg.content} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => onSendToBuild(msg.content)}
                      >
                        <ArrowRight className="h-3.5 w-3.5" /> Send to Build
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => onSaveAsTemplate(msg.content)}
                      >
                        <BookmarkPlus className="h-3.5 w-3.5" /> Save Template
                      </Button>
                      {isLast && !isLoading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={onRegenerate}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
