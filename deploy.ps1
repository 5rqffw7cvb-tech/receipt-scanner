Write-Host "🔨 Building..." -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "📦 Build done! Choose deployment target:" -ForegroundColor Green
Write-Host "  1) GitHub Pages (git push)"
Write-Host "  2) Netlify (CLI)"
Write-Host "  3) Vercel (CLI)"
Write-Host "  4) Cloudflare Pages (CLI)"
Write-Host ""

$choice = Read-Host "Choose (1-4)"

switch ($choice) {
  "1" {
    Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
    git add .
    git commit -m "Deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ErrorAction SilentlyContinue
    git push origin main
    Write-Host "✅ Deployed to GitHub Pages!" -ForegroundColor Green
  }
  "2" {
    Write-Host "📤 Deploying to Netlify..." -ForegroundColor Cyan
    netlify deploy --prod --dir=dist
    Write-Host "✅ Deployed to Netlify!" -ForegroundColor Green
  }
  "3" {
    Write-Host "📤 Deploying to Vercel..." -ForegroundColor Cyan
    vercel --prod
    Write-Host "✅ Deployed to Vercel!" -ForegroundColor Green
  }
  "4" {
    Write-Host "📤 Deploying to Cloudflare Pages..." -ForegroundColor Cyan
    wrangler pages deploy dist
    Write-Host "✅ Deployed to Cloudflare Pages!" -ForegroundColor Green
  }
  default {
    Write-Host "❌ Invalid choice" -ForegroundColor Red
    exit 1
  }
}
