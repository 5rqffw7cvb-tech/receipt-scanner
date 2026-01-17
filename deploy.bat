@echo off
REM Windows batch script for deployment

echo.
echo Building...
call npm run build

echo.
echo Build done! Choose deployment target:
echo   1) GitHub Pages (git push)
echo   2) Netlify (CLI)
echo   3) Vercel (CLI)
echo   4) Cloudflare Pages (CLI)
echo.

set /p choice="Choose (1-4): "

if "%choice%"=="1" (
  echo Pushing to GitHub...
  git add .
  git commit -m "Deploy %date%" || echo No changes
  git push origin main
  echo Deployed to GitHub Pages!
) else if "%choice%"=="2" (
  echo Deploying to Netlify...
  netlify deploy --prod --dir=dist
  echo Deployed to Netlify!
) else if "%choice%"=="3" (
  echo Deploying to Vercel...
  vercel --prod
  echo Deployed to Vercel!
) else if "%choice%"=="4" (
  echo Deploying to Cloudflare Pages...
  wrangler pages deploy dist
  echo Deployed to Cloudflare Pages!
) else (
  echo Invalid choice
  exit /b 1
)
