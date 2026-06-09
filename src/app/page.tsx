"use client";

import { useAuth } from "@/components/auth-provider";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { isLoading } = useAuth();
  
  return (
    <div className="flex-1 flex items-center justify-center">
      {isLoading ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      ) : null}
    </div>
  );
}
