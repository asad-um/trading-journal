"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger type="button" className="cursor-help inline-flex items-center align-middle ml-1.5 text-text-muted hover:text-foreground transition-colors">
        <Info className="h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm bg-popover border-border text-popover-foreground shadow-md">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}