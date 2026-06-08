"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { TradeForm } from "@/components/trades/trade-form";
import { supabase } from "@/lib/supabase";
import { Trade } from "@/types";
import { Loader2 } from "lucide-react";

export default function EditTradePage({ params }: { params: { id: string } }) {
  const [initialData, setInitialData] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTrade() {
      const { data } = await supabase.from("trades").select("*").eq("id", params.id).single();
      if (data) setInitialData(data);
      setIsLoading(false);
    }
    fetchTrade();
  }, [params.id]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">Edit Trade</h1>
        {isLoading ? (
          <div className="flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
        ) : initialData ? (
          <TradeForm initialData={initialData} />
        ) : (
          <div>Trade not found.</div>
        )}
      </div>
    </AppLayout>
  );
}
