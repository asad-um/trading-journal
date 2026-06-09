"use client";

import { AppLayout } from "@/components/layout/app-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Settings, BarChart2, ShieldCheck, Target, Layers } from "lucide-react";

export default function HelpPage() {
  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8 pb-20 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Help & Guides</h1>
          <p className="text-text-muted text-sm md:text-base">Master your journal, understand your data, and scale your trading edge.</p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-background-secondary/50 border-border/60 shadow-sm">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full"><BookOpen className="h-6 w-6 text-primary" /></div>
              <h3 className="font-bold">Log with Precision</h3>
              <p className="text-xs text-text-muted">Track multiple Take Profits, strict validations, and attach live chart screenshots.</p>
            </CardContent>
          </Card>
          <Card className="bg-background-secondary/50 border-border/60 shadow-sm">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-win/10 rounded-full"><BarChart2 className="h-6 w-6 text-win" /></div>
              <h3 className="font-bold">Deep Analytics</h3>
              <p className="text-xs text-text-muted">Algorithmically discover your most profitable setups, days, and checklist criteria.</p>
            </CardContent>
          </Card>
          <Card className="bg-background-secondary/50 border-border/60 shadow-sm">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-full"><Layers className="h-6 w-6 text-purple-500" /></div>
              <h3 className="font-bold">Multiple Accounts</h3>
              <p className="text-xs text-text-muted">Seamlessly switch between personal, funded, and demo accounts in one click.</p>
            </CardContent>
          </Card>
        </div>

        {/* Step-by-Step Guides */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Target className="h-5 w-5 text-accent"/> Step-by-Step Guides</h2>
          
          <Accordion type="single" collapsible className="w-full space-y-3">
            
            <AccordionItem value="guide-1" className="border border-border/60 bg-background-secondary/30 rounded-xl px-5 shadow-sm">
              <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors font-semibold py-4">
                How do I accurately log a trade with multiple Take Profits?
              </AccordionTrigger>
              <AccordionContent className="text-text-muted leading-relaxed space-y-4 pb-4">
                <p>Logging partial exits (like taking 50% of your position off the table at TP1) is crucial for accurate data. Here is the best way to do it:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>On the <strong>New Trade</strong> page, scroll down to <strong>Levels & Risk</strong>.</li>
                  <li>Click the number of Take Profit levels you planned for (e.g., click <strong>2</strong>).</li>
                  <li>Enter the exact price for TP 1. Under "Close %", type how much of your position you plan to close there (e.g., <strong>50</strong>).</li>
                  <li>Do the same for TP 2. Make sure your "Close %" boxes add up to exactly 100%.</li>
                  <li>Leave the trade status as <strong>Open</strong> and hit Save.</li>
                </ol>
                <p className="text-xs border-l-2 border-primary pl-3 py-1 bg-primary/5 rounded-r-md"><strong>Pro Tip:</strong> When TP1 actually hits in real life, come back to the journal, click <strong>Update</strong>, change the status to <strong>Partial</strong>, and check the box next to TP1. The journal will automatically calculate your realized cash!</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="guide-2" className="border border-border/60 bg-background-secondary/30 rounded-xl px-5 shadow-sm">
              <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors font-semibold py-4">
                How do I create and use my own custom Trading Strategy?
              </AccordionTrigger>
              <AccordionContent className="text-text-muted leading-relaxed space-y-4 pb-4">
                <p>You aren't locked into the default Wyckoff or ICT templates. You can build your own playbook from scratch:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Navigate to the <strong>Settings</strong> page and click the <strong>Playbooks</strong> tab.</li>
                  <li>In the input box, type your strategy using this exact format: <strong>Strategy Name | Playbook Name</strong> (For example: <em>Price Action | Support Bounce</em>).</li>
                  <li>Hit the Plus icon to save it.</li>
                  <li>Next, click the <strong>Checklists</strong> tab and add all the specific rules you use to validate that trade (e.g., <em>Volume Spike, Double Bottom</em>).</li>
                </ol>
                <p>The next time you log a trade, your custom strategy will appear perfectly in the dropdown menus!</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="guide-3" className="border border-border/60 bg-background-secondary/30 rounded-xl px-5 shadow-sm">
              <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors font-semibold py-4">
                How do I track my FTMO/Prop Firm account separately?
              </AccordionTrigger>
              <AccordionContent className="text-text-muted leading-relaxed space-y-4 pb-4">
                <p>You should never mix your demo data with your live money data. You can create isolated accounts within your single login.</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Go to the <strong>Account</strong> page.</li>
                  <li>Click the <strong>New Account</strong> button in the Trading Accounts section.</li>
                  <li>Name it something recognizable (e.g., "FTMO 100k Challenge") and enter your starting balance.</li>
                  <li>Click <strong>Switch to Account</strong> on the new card.</li>
                </ol>
                <p>Instantly, your entire dashboard, trade log, and statistics will reset to show <strong>only</strong> the data for that specific account. You can switch back to your personal account at any time.</p>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>

        {/* Security / FAQ */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-win"/> Security & Data FAQ</h2>
          
          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="faq-1" className="border-b border-border/50 px-2">
              <AccordionTrigger className="hover:no-underline font-medium text-sm">Are my chart screenshots secure?</AccordionTrigger>
              <AccordionContent className="text-text-muted text-sm pb-4">
                Yes. Your images are securely encrypted and hosted on an enterprise-grade content delivery network. When you delete a trade or perform a Factory Reset, our servers instantly and permanently destroy the physical image files to protect your privacy.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2" className="border-b border-border/50 px-2">
              <AccordionTrigger className="hover:no-underline font-medium text-sm">What happens if I click Factory Reset?</AccordionTrigger>
              <AccordionContent className="text-text-muted text-sm pb-4">
                A Factory Reset is a nuclear option. It will permanently delete every single trade, every portfolio, and every ledger deposit you have ever made. It leaves your login and custom strategy names intact, but returns your entire journal back to a blank $0.00 slate. Use it with extreme caution.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

      </div>
    </AppLayout>
  );
}
