#!/bin/bash
set -e

echo "🔨 Building..."
npm run build

echo ""
echo "📦 Build done! Chọn nơi deploy:"
echo "  1) GitHub Pages (git push)"
echo "  2) Netlify (CLI)"
echo "  3) Vercel (CLI)"
echo "  4) Cloudflare Pages (CLI)"
echo ""
read -p "Chọn (1-4): " choice

case $choice in
  1)
    echo "📤 Pushing to GitHub..."
    git add .
    git commit -m "Deploy $(date)" || echo "No changes"
    git push origin main
    echo "✅ Deployed to GitHub Pages!"
    ;;
  2)
    echo "📤 Deploying to Netlify..."
    netlify deploy --prod --dir=dist
    echo "✅ Deployed to Netlify!"
    ;;
  3)
    echo "📤 Deploying to Vercel..."
    vercel --prod
    echo "✅ Deployed to Vercel!"
    ;;
  4)
    echo "📤 Deploying to Cloudflare Pages..."
    wrangler pages deploy dist
    echo "✅ Deployed to Cloudflare Pages!"
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac
