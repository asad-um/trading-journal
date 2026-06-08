const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
content = content.replace('import { usePrivacy } from "@/components/privacy-provider";\n"use client";', '"use client";\nimport { usePrivacy } from "@/components/privacy-provider";');
if (content.startsWith('import')) {
    content = '"use client";\n' + content.replace('"use client";', '');
}
fs.writeFileSync('src/app/dashboard/page.tsx', content);
