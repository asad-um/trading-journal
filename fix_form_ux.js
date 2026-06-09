const fs = require('fs');

let form = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// 1. Fix the typing issue for forex/crypto decimals by using text + inputMode="decimal"
// This prevents browsers from blocking intermediate decimal typing like "1."
form = form.replace(/type="number" step="any"/g, 'type="text" inputMode="decimal"');

// 2. We also need to add Privacy Masking to the Form Risk Calculator so it respects the Eye icon!
if (!form.includes('usePrivacy')) {
    form = form.replace(
        'import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";',
        'import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";\nimport { usePrivacy } from "@/components/privacy-provider";'
    );
    form = form.replace(
        'const { toast } = useToast();',
        'const { toast } = useToast();\n  const { blurMoney } = usePrivacy();'
    );
    form = form.replace(
        'Risk: \\${riskAmtCalculated.toFixed(2)}',
        'Risk: {blurMoney(riskAmtCalculated)}'
    );
}

// 3. Make sure custom strategies added in Settings actually appear in the Form Dropdowns!
const oldPresets = `  const getDynamicPresets = useCallback(() => {
    // Dynamic fallback structure. If user sets up custom stuff in settings, we can read it, but this is the robust core.
    const base: Record<string, Record<string, string[]>> = {`;

const newPresets = `  const getDynamicPresets = useCallback(() => {
    const base: Record<string, Record<string, string[]>> = {`;

if (form.includes(oldPresets)) {
    form = form.replace(oldPresets, newPresets);
    
    // Let's inject the logic that parses user_settings.strategies_list and merges it with base
    const returnBase = `    return base;
  }, [settings]);`;
    
    const returnMerged = `    // Merge custom strategies from DB
    if (settings?.strategies_list && Array.isArray(settings.strategies_list)) {
      settings.strategies_list.forEach((strat: any) => {
        const [strategyName, subStrategyName] = (strat.label || strat.name || "").split('|').map((s: string) => s.trim());
        if (strategyName && subStrategyName) {
          if (!base[strategyName]) base[strategyName] = {};
          if (!base[strategyName][subStrategyName]) base[strategyName][subStrategyName] = [];
        }
      });
    }
    return base;
  }, [settings]);`;

    form = form.replace(returnBase, returnMerged);
}

fs.writeFileSync('src/components/trades/trade-form.tsx', form);
console.log("Form UX fixed.");
