const fs = require('fs');

// We need to implement a collapsible/resizing sidebar and a deeply SaaS styled layout 
// mirroring the Material-UI (Mui) classes observed in the user's DOM dump (e.g. active states, TouchRipples).
// We'll update the AppLayout component.

let layout = fs.readFileSync('src/components/layout/app-layout.tsx', 'utf8');

// Adding an active class state matching the user's observed structure
const oldLink = `className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-all",
                  isActive 
                    ? "bg-accent/10 text-accent font-medium shadow-sm translate-x-1" 
                    : "text-text-secondary hover:text-foreground hover:bg-background-tertiary"
                )}`;

const newLink = `className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 relative group overflow-hidden",
                  isActive 
                    ? "bg-primary/10 text-primary font-semibold shadow-sm" 
                    : "text-text-secondary hover:text-foreground hover:bg-background-tertiary"
                )}`;

layout = layout.replace(oldLink, newLink);

// Add a simulated "TouchRipple" and selection indicator like Mui
layout = layout.replace(
  '{item.label}',
  `{isActive && <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}\n                {item.label}\n                <span className="absolute inset-0 bg-foreground/5 opacity-0 group-active:opacity-100 transition-opacity" />`
);

fs.writeFileSync('src/components/layout/app-layout.tsx', layout);
