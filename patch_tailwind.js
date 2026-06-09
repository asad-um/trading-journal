const fs = require('fs');

let tw = fs.readFileSync('tailwind.config.ts', 'utf8');

tw = tw.replace(
  'plugins: [require("tailwindcss-animate")]',
  'plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")]'
);

fs.writeFileSync('tailwind.config.ts', tw);
console.log("Typography injected.");
