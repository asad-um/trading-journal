"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isReported, setIsReported] = useState(false);

  useEffect(() => {
    const reportError = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await fetch('/api/log-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id,
            error_name: error.name,
            error_message: error.message,
            error_stack: error.stack,
            route: window.location.pathname
          })
        });
        setIsReported(true);
      } catch (e) {
        console.error("Failed to log error to backend", e);
      }
    };
    reportError();
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-background-secondary border border-border rounded-xl shadow-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-loss/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-loss" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
        
        <p className="text-text-muted text-sm leading-relaxed">
          We encountered an unexpected error. 
          {isReported 
            ? " Our engineering team has been securely notified with the crash details." 
            : " We are securely logging this issue to our backend..."}
        </p>

        <Button onClick={() => reset()} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-semibold mt-4">
          <RefreshCcw className="mr-2 h-5 w-5" /> Reload Page
        </Button>
      </div>
    </div>
  );
}
