const fs = require('fs');

// 1. Fix trade-form.tsx
let tradeForm = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');
// Add ESLint disable comment at the top of the file to ignore next/image warnings globally for this file 
// since we deliberately bypass Vercel's free-tier image optimization limits.
if (!tradeForm.includes('/* eslint-disable @next/next/no-img-element */')) {
    tradeForm = '/* eslint-disable @next/next/no-img-element */\n' + tradeForm;
}
fs.writeFileSync('src/components/trades/trade-form.tsx', tradeForm);

// 2. Fix trade detail page
let tradeDetail = fs.readFileSync('src/app/trades/[id]/page.tsx', 'utf8');
if (!tradeDetail.includes('/* eslint-disable @next/next/no-img-element */')) {
    tradeDetail = '/* eslint-disable @next/next/no-img-element */\n' + tradeDetail;
}
fs.writeFileSync('src/app/trades/[id]/page.tsx', tradeDetail);

