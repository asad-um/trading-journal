@echo off
setlocal enabledelayedexpansion

echo ===================================
echo 🚀 WJournal Deployment Pipeline
echo ===================================
echo.

:: Check if we're in a git repo
if not exist .git (
  echo ❌ Error: Not a git repository.
  exit /b 1
)

:: Check current branch
for /f "tokens=*" %%a in ('git branch --show-current') do set CURRENT_BRANCH=%%a
if not "%CURRENT_BRANCH%"=="main" (
  echo ⚠️  Warning: You are on branch '%CURRENT_BRANCH%'.
  echo    Switch to 'main' for production deploy.
  echo.
)


:: Check for uncommitted changes
git diff --quiet
git diff --cached --quiet
if %errorlevel% neq 0 (
  echo 📦 Uncommitted changes detected.
) else (
  echo ✅ Working tree clean.
)

echo.
echo [1/3] Staging changes...
git add .
if errorlevel 1 (
  echo ❌ Git add failed.
  exit /b 1
)

echo [2/3] Committing...
git commit -m "Auto-Deploy Update from AI"
if errorlevel 1 (
  echo ℹ️  Nothing to commit or commit failed. Continuing...
)

echo [3/3] Pushing to origin/main...
git push origin main
if errorlevel 1 (
  echo ❌ Push failed. Check your network or remote settings.
  exit /b 1
)

echo.
echo ===================================
echo ✅ Deployed! Vercel is building...
echo ===================================
echo.
pause
