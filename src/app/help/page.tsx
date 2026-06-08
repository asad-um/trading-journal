"use client";

import { AppLayout } from "@/components/layout/app-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Settings,   } from "lucide-react";

export default function HelpPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-20 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Help & Guides</h1>
          <p className="text-text-muted">Master your trading journal and get the most out of your analytics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="hover:border-accent/50 transition-colors cursor-pointer group">
            <CardHeader className="pb-2 flex flex-row items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg group-hover:scale-110 transition-transform">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <CardTitle className="text-lg">Logging Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-muted">Learn how to accurately enter positions, split targets, and backdate entries.</p>
            </CardContent>
          </Card>
          <Card className="hover:border-accent/50 transition-colors cursor-pointer group">
            <CardHeader className="pb-2 flex flex-row items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg group-hover:scale-110 transition-transform">
                <Settings className="h-5 w-5 text-accent" />
              </div>
              <CardTitle className="text-lg">Customizing Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-muted">Set up custom entry triggers, asset classes, and checklist criteria.</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full space-y-2">
          
          <AccordionItem value="item-1" className="border border-border bg-background-secondary rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline hover:text-accent transition-colors font-medium">
              How do I log partial Take Profits (TPs)?
            </AccordionTrigger>
            <AccordionContent className="text-text-muted leading-relaxed">
              When creating a trade, adjust the &quot;Number of TP Levels&quot; (up to 5). Assign the specific price 
              target and the percentage of the position you plan to close at that level (e.g., 50% at TP1, 
              50% at TP2). When updating the trade later, you can select exactly which TPs were hit, and the 
              journal will auto-calculate your P&L and achieved RR.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border border-border bg-background-secondary rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline hover:text-accent transition-colors font-medium">
              What does &quot;Profit Factor&quot; mean?
            </AccordionTrigger>
            <AccordionContent className="text-text-muted leading-relaxed">
              Profit factor is your Gross Profit divided by your Gross Loss (absolute value). It answers the 
              question: &quot;For every $1 I lose, how many dollars do I make?&quot; A Profit Factor above 1.0 means 
              you are profitable. Elite traders generally aim for a Profit Factor of 1.5 or higher over a large sample size.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border border-border bg-background-secondary rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline hover:text-accent transition-colors font-medium">
              How is the Recovery Factor calculated?
            </AccordionTrigger>
            <AccordionContent className="text-text-muted leading-relaxed">
              Recovery Factor measures your ability to bounce back from drawdowns. It is calculated by taking 
              your overall Net Profit and dividing it by your Maximum Drawdown (in dollars). A higher number 
              indicates a smoother equity curve with less severe dips.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border border-border bg-background-secondary rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline hover:text-accent transition-colors font-medium">
              How do I add my own trading strategy?
            </AccordionTrigger>
            <AccordionContent className="text-text-muted leading-relaxed">
              Go to the <strong>Settings</strong> page and select the <strong>Lists & Categories</strong> tab. 
              Here you can fully delete the default triggers and add your own specific Entry Triggers, 
              Confirmation Checklists, and common Mistake categories. The form will immediately reflect your 
              custom strategy rules.
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </AppLayout>
  );
}