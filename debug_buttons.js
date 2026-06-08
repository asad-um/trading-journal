const fs = require('fs');
let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');
const lines = content.split('\n');
let inDirection = false;
for(let i=0; i<lines.length; i++) {
    if (lines[i].includes('name="direction"')) inDirection = true;
    if (inDirection) {
        console.log(i + ": " + lines[i]);
        if (lines[i].includes('</FormItem>')) break;
    }
}
