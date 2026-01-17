let cvReadyPromise = null;

export async function loadOpenCV(){
  if(cvReadyPromise) return cvReadyPromise;
  cvReadyPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.x/opencv.js';
    script.async = true;
    script.onload = () => {
      // Wait for wasm ready
      if(window.cv && cv['onRuntimeInitialized']){
        cv['onRuntimeInitialized'] = () => resolve();
      } else {
        resolve();
      }
    };
    script.onerror = (e) => reject(new Error('Failed to load OpenCV.js'));
    document.head.appendChild(script);
  });
  return cvReadyPromise;
}

// Internal mats to cleanup between runs
const mats = [];
function track(mat){ mats.push(mat); return mat; }
export function matsCleanup(){ try{ mats.forEach(m=>m.delete()); } catch{} mats.length=0; }

export async function detectReceiptQuad(previewCanvas, params){
  const { canny1=50, canny2=150, minAreaRatio=0.15 } = params || {};
  const src = cv.imread(previewCanvas);
  const gray = track(new cv.Mat());
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  
  // Adaptive threshold for better edge detection on varying lighting
  const adaptive = track(new cv.Mat());
  cv.adaptiveThreshold(gray, adaptive, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
  
  // Invert for better contour detection
  const inverted = track(new cv.Mat());
  cv.bitwise_not(adaptive, inverted);
  
  // Morphological operations to clean up
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
  const closed = track(new cv.Mat());
  cv.morphologyEx(inverted, closed, cv.MORPH_CLOSE, kernel);
  const opened = track(new cv.Mat());
  cv.morphologyEx(closed, opened, cv.MORPH_OPEN, kernel);
  kernel.delete();

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(opened, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  hierarchy.delete();

  const imgArea = src.rows * src.cols;
  let bestQuad = null;
  let bestArea = 0;
  for(let i=0;i<contours.size();i++){
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);
    if(area < imgArea * minAreaRatio) { cnt.delete(); continue; }
    const perimeter = cv.arcLength(cnt, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.02 * perimeter, true);
    if(approx.rows === 4){
      const pts = [];
      for(let j=0; j<4; j++){
        pts.push({x: approx.intPtr(j,0)[0], y: approx.intPtr(j,0)[1]});
      }
      // Take quad with largest area
      if(area > bestArea){
        bestQuad = orderQuad(pts);
        bestArea = area;
      }
    }
    approx.delete();
    cnt.delete();
  }
  contours.delete();
  src.delete();
  return bestQuad ? { quad: bestQuad } : null;
}

export function orderQuad(pts){
  // Order: TL, TR, BR, BL
  const sums = pts.map(p=>({p, s:p.x+p.y})).sort((a,b)=>a.s-b.s);
  const diffs = pts.map(p=>({p, d:p.x-p.y})).sort((a,b)=>a.d-b.d);
  const tl = sums[0].p;
  const br = sums[3].p;
  const tr = diffs[3].p;
  const bl = diffs[0].p;
  return [tl,tr,br,bl];
}

export async function warpFromQuadOnOriginal(originalCanvas, quadPreview, options){
  const { scalePreviewToOriginal=1, maxOutputWidth=1600 } = options || {};
  const scale = scalePreviewToOriginal;
  // Scale points to original
  const srcPts = quadPreview.map(p=>({x: p.x*scale, y: p.y*scale}));
  const oSrc = cv.imread(originalCanvas);
  const ordered = orderQuad(srcPts);

  // Compute target size based on distances
  const wTop = dist(ordered[0], ordered[1]);
  const wBottom = dist(ordered[3], ordered[2]);
  const hLeft = dist(ordered[0], ordered[3]);
  const hRight = dist(ordered[1], ordered[2]);
  let dstW = Math.max(wTop, wBottom);
  let dstH = Math.max(hLeft, hRight);
  // Cap output width and maintain aspect
  if(dstW > maxOutputWidth){
    const ratio = maxOutputWidth / dstW;
    dstW = maxOutputWidth;
    dstH = Math.round(dstH * ratio);
  }

  const dsize = new cv.Size(Math.max(4, Math.round(dstW)), Math.max(4, Math.round(dstH)));
  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, ordered.flatMap(p=>[p.x, p.y]));
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0,0, dsize.width,0, dsize.width,dsize.height, 0,dsize.height]);
  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  const dst = new cv.Mat();
  cv.warpPerspective(oSrc, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  // To canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = dsize.width;
  outCanvas.height = dsize.height;
  cv.imshow(outCanvas, dst);

  // Cleanup
  oSrc.delete();
  srcTri.delete();
  dstTri.delete();
  M.delete();
  dst.delete();

  return { canvas: outCanvas };
}

function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }
