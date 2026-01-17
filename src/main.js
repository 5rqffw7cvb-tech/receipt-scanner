import { loadOpenCV, detectReceiptQuad, warpFromQuadOnOriginal, matsCleanup } from './opencv-helpers.js';
import { initOverlay, setOverlayImage, setQuad, getQuad, onOverlayChange } from './overlay.js';
import { compressToTarget } from './compress.js';

const state = {
  targetWidth: 1280, // processing downscale width
  canny1: 30,  // Lowered from 50 for better edge detection
  canny2: 100, // Lowered from 150 for better edge detection
  minContourAreaRatio: 0.08, // Lowered from 0.15 to detect smaller receipts
  jpegQuality: 0.75,
  sizeLimitKB: 500,
  maxOutputWidth: 1600,
  cvReady: false,
  imageBitmap: null,
  originalCanvas: null,
  scale: 1, // original -> preview scale
  quadPreview: null,
  croppedCanvas: null
};

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const cameraInput = $('cameraInput');
const galleryInput = $('galleryInput');
const cameraBtn = $('cameraBtn');
const galleryBtn = $('galleryBtn');
const previewCanvas = $('previewCanvas');
const overlayCanvas = $('overlayCanvas');
const resultSection = $('resultSection');
const resultImg = $('resultImg');
const adjustControls = $('adjustControls');
const outputControls = $('outputControls');
const qualitySlider = $('qualitySlider');
const downloadBtn = $('downloadBtn');
const sizeInfo = $('sizeInfo');
const resetCorners = $('resetCorners');
const applyCrop = $('applyCrop');
const backBtn = $('backBtn');

function setStatus(s){ statusEl.textContent = s; }
function show(section, visible){ section.classList.toggle('hidden', !visible); }

// Load version from package.json
async function initVersion(){
  try {
    const res = await fetch('/package.json');
    const pkg = await res.json();
    document.getElementById('version').textContent = 'v' + pkg.version;
  } catch(e) {
    console.log('Could not load version');
  }
}

initVersion();

async function ensureCV(){
  if(state.cvReady) return;
  setStatus('Loading OpenCV…');
  await loadOpenCV();
  state.cvReady = true;
  setStatus('OpenCV ready');
}

async function pickImageFromCamera(){
  cameraInput.click();
}

async function pickImageFromGallery(){
  galleryInput.click();
}

async function onFileChange(e){
  const file = e.target.files?.[0];
  if(!file){ return; }
  show(resultSection, false);
  show(adjustControls, false);
  show(outputControls, false);
  show(previewSection, true);

  await ensureCV();

  setStatus('Xử lý…');
  const img = await createImageBitmap(file);
  state.imageBitmap = img;

  // Draw original to canvas (we keep original for final crop)
  const oCanvas = document.createElement('canvas');
  oCanvas.width = img.width;
  oCanvas.height = img.height;
  const octx = oCanvas.getContext('2d');
  octx.drawImage(img, 0, 0);
  state.originalCanvas = oCanvas;

  // Prepare preview downscale
  const scale = state.targetWidth / img.width;
  const pWidth = Math.min(state.targetWidth, img.width);
  const pHeight = Math.round(img.height * (pWidth / img.width));
  previewCanvas.width = pWidth;
  previewCanvas.height = pHeight;
  const pctx = previewCanvas.getContext('2d');
  pctx.drawImage(img, 0, 0, pWidth, pHeight);

  state.scale = pWidth / img.width;

  // Detect
  let quadDown = null;
  try {
    const det = await detectReceiptQuad(previewCanvas, {
      canny1: state.canny1,
      canny2: state.canny2,
      minAreaRatio: state.minContourAreaRatio
    });
    quadDown = det?.quad || null;
  } catch(err){
    console.error(err);
  } finally {
    matsCleanup();
  }

  // Setup overlay and preview
  initOverlay(overlayCanvas);
  setOverlayImage(previewCanvas);

  if(quadDown){
    setQuad(quadDown);
    state.quadPreview = quadDown;
    setStatus('Đã phát hiện. Chỉnh nếu cần.');
  } else {
    // Fallback to bounding box corners
    const bb = [
      {x:10,y:10}, {x:pWidth-10,y:10}, {x:pWidth-10,y:pHeight-10}, {x:10,y:pHeight-10}
    ];
    setQuad(bb);
    state.quadPreview = bb;
    setStatus('Không tìm được biên, vui lòng chỉnh tay.');
  }

  show(adjustControls, true);
}

async function applyCropAction(){
  const quadDown = getQuad();
  state.quadPreview = quadDown;
  setStatus('Đang cắt…');
  const { canvas } = await warpFromQuadOnOriginal(state.originalCanvas, quadDown, {
    scalePreviewToOriginal: 1 / state.scale,
    maxOutputWidth: state.maxOutputWidth
  });
  state.croppedCanvas = canvas;

  // Show result
  const blobInfo = await compressToTarget(canvas, state.jpegQuality, state.sizeLimitKB, state.maxOutputWidth);
  const url = URL.createObjectURL(blobInfo.blob);
  resultImg.src = url;
  show(resultSection, true);
  show(outputControls, true);
  sizeInfo.textContent = `Kích thước: ${Math.round(blobInfo.size/1024)}KB | Chất lượng: ${blobInfo.quality.toFixed(2)} | Rộng: ${canvas.width}px`;
  setStatus('Hoàn thành');
}

async function updateQuality(){
  state.jpegQuality = parseFloat(qualitySlider.value);
  if(!state.croppedCanvas) return;
  const blobInfo = await compressToTarget(state.croppedCanvas, state.jpegQuality, state.sizeLimitKB, state.maxOutputWidth);
  const url = URL.createObjectURL(blobInfo.blob);
  resultImg.src = url;
  sizeInfo.textContent = `Kích thước: ${Math.round(blobInfo.size/1024)}KB | Chất lượng: ${blobInfo.quality.toFixed(2)} | Rộng: ${state.croppedCanvas.width}px`;
}

async function downloadJPG(){
  if(!state.croppedCanvas) return;
  const blobInfo = await compressToTarget(state.croppedCanvas, state.jpegQuality, state.sizeLimitKB, state.maxOutputWidth);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blobInfo.blob);
  a.download = 'receipt.jpg';
  a.click();
}

function backToAdjust(){
  show(resultSection, false);
  show(outputControls, false);
  show(adjustControls, true);
}

function resetCornersAction(){
  if(state.quadPreview){
    setQuad(state.quadPreview);
  }
}

// Events
cameraBtn.addEventListener('click', pickImageFromCamera);
galleryBtn.addEventListener('click', pickImageFromGallery);
cameraInput.addEventListener('change', onFileChange);
galleryInput.addEventListener('change', onFileChange);
applyCrop.addEventListener('click', applyCropAction);
qualitySlider.addEventListener('input', updateQuality);
downloadBtn.addEventListener('click', downloadJPG);
backBtn.addEventListener('click', backToAdjust);
resetCorners.addEventListener('click', resetCornersAction);

setStatus('Sẵn sàng');
