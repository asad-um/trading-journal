@echo off
echo ===================================
echo 🚀 Automating Push to Vercel/GitHub
echo ===================================

echo [1/3] Removing temporary junk files...
del /S /Q *.js 2>nul
git restore next.config.js
git restore tailwind.config.ts

echo [2/3] Adding changes to Git...
git add .

echo [3/3] Committing and Pushing...
git commit -m "Auto-Deploy Update from AI"
git push origin main --force

echo ===================================
echo ✅ Done! Vercel is building the site now.
echo ===================================
pause