const fs = require('fs');

let form = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// The user noted that on mobile, inputting TP levels is cramped: "I can barely see what I'm typing".
// Currently, the TP levels row is a flex container: `className="flex gap-4 items-end"`
// On mobile screens, this squishes 3 inputs horizontally (Price, %, and RR text).
// Let's make it wrap/stack on mobile, and flex-row on desktop.

const oldTPRow = `className="flex gap-4 items-end bg-background-secondary p-3 rounded-lg border border-border"`;
const newTPRow = `className="flex flex-col sm:flex-row gap-4 sm:items-end bg-background-secondary p-4 rounded-lg border border-border"`;

form = form.replace(oldTPRow, newTPRow);

// I need to fix it for ALL map iterations in the file if multiple exist.
form = form.replace(/className="flex gap-4 items-end bg-background-secondary p-3 rounded-lg border border-border"/g, newTPRow);

// The input fields inside the TP row are cramped.
const oldTPPrice = `className="flex-1"`;
const newTPPrice = `className="w-full sm:flex-1"`;
form = form.replace(/className="flex-1"/g, newTPPrice);

const oldTPPercent = `className="w-20"`;
const newTPPercent = `className="w-full sm:w-24"`;
form = form.replace(/className="w-20"/g, newTPPercent);

const oldTPRR = `className="w-24 pb-1.5 flex justify-end"`;
const newTPRR = `className="w-full sm:w-24 pb-1.5 flex justify-start sm:justify-end mt-2 sm:mt-0"`;
form = form.replace(/className="w-24 pb-1.5 flex justify-end"/g, newTPRR);

// Let's also check the Long/Short buttons on mobile.
// Currently: `<div className="flex gap-3 bg-background p-1.5 rounded-lg border border-border/60">`
// This is actually fine on mobile as a 50/50 split.

fs.writeFileSync('src/components/trades/trade-form.tsx', form);
