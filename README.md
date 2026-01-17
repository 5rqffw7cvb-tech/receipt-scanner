# Scan Hóa Đơn (Client-only)

Mobile-first webapp (Vite + Vanilla JS) để chụp/chọn ảnh hóa đơn, tự động phát hiện biên (tứ giác), crop + perspective transform, cho phép chỉnh tay 4 góc và xuất JPG <= 500KB.

## Chạy

```bash
npm install
npm run dev
```

Mở URL từ điện thoại (cùng mạng) hoặc chạy trực tiếp trên máy. Trên iOS Safari/Android Chrome chọn "Chụp / Chọn ảnh".

## Deploy

### GitHub Pages (khuyến nghị, miễn phí)
1) Push code lên repo GitHub, đặt branch `main`.
2) Workflow đã sẵn trong `.github/workflows/deploy.yml`.
3) Bật Pages: vào Settings → Pages → chọn Source: GitHub Actions.
4) Mỗi lần push vào `main`, Actions sẽ build và deploy.

Ghi chú: workflow set `BASE_PATH="/<repo>/"`, tương thích với Vite nhờ `vite.config.js` đọc `process.env.BASE_PATH`. Không cần sửa tay.

### Deploy nhanh từ VS Code terminal

#### GitHub Pages (git push)
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```
Sau đó bật Pages ở Settings → Pages → Source: GitHub Actions. Done!

#### Netlify CLI
```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod --dir=dist
```

#### Vercel CLI
```bash
npm install -g vercel
vercel login
npm run build
vercel --prod
```

#### Cloudflare Pages
```bash
npm install -g wrangler
wrangler login
wrangler pages deploy dist
```

### Netlify / Vercel / Cloudflare Pages (Web UI)
- Build command: `npm run build`
- Publish directory: `dist`
- Không cần thiết lập base path.

## Cách hoạt động
- Lazy-load OpenCV.js sau khi người dùng chọn ảnh.
- Downscale ảnh về `targetWidth` để detect nhanh.
- Pipeline: grayscale → blur → Canny → dilate → contours → approxPolyDP (tứ giác) → order points → warpPerspective trên ảnh gốc.
- Nếu không tìm được tứ giác: fallback bounding-box và yêu cầu chỉnh tay.
- Manual adjust: overlay 4 điểm kéo thả trên preview, Apply để crop.
- Hậu xử lý: nén JPEG với chất lượng mặc định, lặp giảm chất lượng/resize đến khi <= size limit.

## Tham số chỉnh ở `src/main.js`
- `targetWidth`: chiều rộng downscale để detect (mặc định 1280)
- `canny1`, `canny2`: ngưỡng Canny (mặc định 50/150)
- `minContourAreaRatio`: diện tích contour tối thiểu so với ảnh preview (mặc định 0.15)
- `jpegQuality`: chất lượng JPEG mặc định (mặc định 0.75)
- `sizeLimitKB`: giới hạn dung lượng đầu ra (mặc định 500KB)
- `maxOutputWidth`: giới hạn chiều rộng sau warp (mặc định 1600)

## File chính
- `index.html`: UI và các vùng canvas/result
- `styles.css`: giao diện mobile-first
- `src/main.js`: luồng app, sự kiện, trạng thái
- `src/opencv-helpers.js`: load OpenCV, detect quad, warpPerspective, cleanup Mat
- `src/overlay.js`: overlay 4 điểm kéo thả
- `src/compress.js`: nén JPEG, giới hạn dung lượng

## Ghi chú hiệu năng & bộ nhớ
- Luôn gọi `matsCleanup()` sau detect để giải phóng `cv.Mat` tạm thời.
- Trong warp, các `Mat` đều được `delete()` sau khi dùng.
- Giới hạn `maxOutputWidth=1600` để giữ tốc độ và dung lượng.
- Trên ảnh 12MP, detect chạy trên preview ~1280px để <2s trên mobile phổ biến.

## Backend (optional mode)
Để tăng độ chính xác trên ảnh khó, có thể thêm server Node xử lý bằng OpenCV-native. Gợi ý:
- Dùng `opencv4nodejs` hoặc triển khai WASM OpenCV phía server.
- API: `POST /scan` nhận ảnh, trả về quad + ảnh đã warp.
- Client: nếu detect client fail, gửi ảnh lên server rồi hiển thị kết quả.

Hiện repo này đã đủ chạy client-only theo yêu cầu.

### MCP GitHub server?
MCP (Model Context Protocol) là chuẩn kết nối công cụ, không phải nền tảng host web tĩnh. App này là static SPA, nên deploy tốt nhất trên GitHub Pages/Netlify/Vercel/Cloudflare Pages. Nếu cần tích hợp MCP cho tác vụ xử lý server-side, ta có thể dựng một MCP server riêng (Node) và client gọi API khi detect fail.

## Deploy Script (tự động hóa)
Tạo file `deploy.sh` để tự động build & deploy:

```bash
#!/bin/bash
npm run build
echo "Build done. Lựa chọn deploy:"
echo "1) GitHub (git push)"
echo "2) Netlify"
echo "3) Vercel"
read -p "Chọn (1-3): " choice
case $choice in
  1) git add . && git commit -m "Deploy" && git push origin main ;;
  2) netlify deploy --prod --dir=dist ;;
  3) vercel --prod ;;
  *) echo "Invalid" ;;
esac
```

Chạy: `bash deploy.sh` từ VS Code terminal.