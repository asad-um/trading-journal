"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Terminal, Copy, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { toast } = useToast();

  useEffect(() => {
    // We can also wire this to a database logger later if needed
    console.error("SMART DEBUG LOGGER CAUGHT ERROR:", error);
  }, [error]);

  const copyToClipboard = () => {
    const debugLog = `
--- SMART DEBUG LOG ---
Time: ${new Date().toISOString()}
Message: ${error.message}
Digest: ${error.digest || 'N/A'}
Stack Trace: 
${error.stack || 'No stack trace available.'}
-----------------------
`;
    navigator.clipboard.writeText(debugLog);
    toast({ title: "Copied to Clipboard", description: "Paste this log to your developer agent." });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-background-secondary border border-loss/50 rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-loss/10 border-b border-loss/20 p-4 flex items-center gap-3">
          <Terminal className="h-6 w-6 text-loss" />
          <h2 className="text-xl font-bold text-loss">System Crash Intercepted</h2>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-text-muted text-sm">
            The application encountered an unexpected client-side exception. A detailed debugging log has been generated.
          </p>

          <div className="bg-background p-4 rounded-lg border border-border font-mono text-xs overflow-x-auto text-text-secondary relative">
            <p className="font-bold text-loss mb-2">{error.name}: {error.message}</p>
            <pre className="whitespace-pre-wrap opacity-80">{error.stack}</pre>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button onClick={copyToClipboard} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Copy className="mr-2 h-4 w-4" /> Copy Debug Log
            </Button>
            <Button onClick={() => reset()} variant="outline" className="flex-1">
              <RefreshCcw className="mr-2 h-4 w-4" /> Attempt Recovery
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
