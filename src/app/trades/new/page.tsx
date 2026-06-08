"use client";
import { AppLayout } from "@/components/layout/app-layout";
import { TradeForm } from "@/components/trades/trade-form";

export default function NewTradePage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">New Trade</h1>
        <TradeForm />
      </div>
    </AppLayout>
  );
}
