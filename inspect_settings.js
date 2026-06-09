const fs = require('fs');
let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

const tabsListMatch = content.match(/<TabsList[^>]*>([\s\S]*?)<\/TabsList>/);
if (tabsListMatch) {
    console.log("--- TABS LIST ---");
    console.log(tabsListMatch[0]);
}

console.log("--- End of file check ---");
const lines = content.split('\n');
console.log(lines.slice(lines.length - 15).join('\n'));

