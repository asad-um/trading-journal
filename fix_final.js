const fs = require('fs');

let dash = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
dash = dash.replace('const { isPrivate, blurMoney } = require("@/components/privacy-provider").usePrivacy();', 'const { blurMoney, isPrivate } = require("@/components/privacy-provider").usePrivacy();'); // Need to use import instead
fs.writeFileSync('src/app/dashboard/page.tsx', dash);

let dash2 = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
dash2 = dash2.replace('const [isLoading, setIsLoading] = useState(true);\n  const { blurMoney, isPrivate } = require("@/components/privacy-provider").usePrivacy();', 'const [isLoading, setIsLoading] = useState(true);');
dash2 = 'import { usePrivacy } from "@/components/privacy-provider";\n' + dash2;
dash2 = dash2.replace('const [isLoading, setIsLoading] = useState(true);', 'const [isLoading, setIsLoading] = useState(true);\n  const { blurMoney, isPrivate } = usePrivacy();');
fs.writeFileSync('src/app/dashboard/page.tsx', dash2);

let form = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');
form = form.replace('import { format } from "date-fns";\nimport { Accordion', 'import { format } from "date-fns";\nimport { Badge } from "@/components/ui/badge";\nimport { Accordion');
form = form.replace('  }, [form]);', '  }, [form, onSubmit]);');
form = form.replace('render={({ field }) => (', 'render={() => (');
form = form.replace('(t: any)', '(t: { price: number })');
fs.writeFileSync('src/components/trades/trade-form.tsx', form);

let settings = fs.readFileSync('src/app/settings/page.tsx', 'utf8');
settings = settings.replace('Format: "Strategy | Playbook"', 'Format: &quot;Strategy | Playbook&quot;');
settings = settings.replace('(item: any)', '(item: { id?: string; label?: string; name?: string; symbol?: string; asset_class?: string; custom?: boolean; [key: string]: unknown })');
fs.writeFileSync('src/app/settings/page.tsx', settings);

