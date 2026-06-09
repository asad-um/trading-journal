const fs = require('fs');

let form = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// Import the component
form = form.replace(
  'import { Accordion', 
  'import { RichTextEditor } from "@/components/ui/rich-text-editor";\nimport { Accordion'
);

// Replace Pre-Trade textarea
const oldPreTrade = `<textarea 
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]" 
                    placeholder="Why are you taking this trade? What is your edge?" 
                    {...field} 
                  />`;

form = form.replace(oldPreTrade, '<RichTextEditor value={field.value || ""} onChange={field.onChange} />');

// Replace Post-Trade textarea
const oldPostTrade = `<textarea 
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]" 
                    placeholder="What did you learn? Did you follow your plan?" 
                    {...field} 
                  />`;

form = form.replace(oldPostTrade, '<RichTextEditor value={field.value || ""} onChange={field.onChange} />');

fs.writeFileSync('src/components/trades/trade-form.tsx', form);
console.log("Rich text editors injected.");
