import { loadOpenCV, detectReceiptQuad, warpFromQuadOnOriginal, matsCleanup } from './opencv-helpers.js';
import { initOverlay, setOverlayImage, setQuad, getQuad, onOverlayChange } from './overlay.js';
import { compressToTarget } from './compress.js';

const state = {
  targetWidth: 1280, // processing downscale width
  canny1: 50,
  canny2: 150,
  minContourAreaRatio: 0.15, // relative to downscaled image area
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
const fileInput = $('fileInput');
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

async function ensureCV(){
  if(state.cvReady) return;
  setStatus('Loading OpenCV…');
  await loadOpenCV();
  state.cvReady = true;
  setStatus('OpenCV ready');
}

async function pickImageFromCamera(){
  console.log('📷 Camera button clicked');
  fileInput.accept = 'image/*';
  fileInput.capture = 'environment';
  fileInput.click();
}

async function pickImageFromGallery(){
  console.log('🖼️ Gallery button clicked');
  fileInput.accept = 'image/*';
  fileInput.capture = '';
  fileInput.click();
}

async function onFileChange(e){
  console.log('File selected:', e.target.files);
  const file = e.target.files?.[0];
  if(!file){ console.log('No file'); return; }
  show(resultSection, false);
  show(adjustControls, false);
  show(outputControls, false);

  await ensureCV();

  setStatus('Processing…');
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
    setStatus('Preview detected. Adjust if needed.');
  } else {
    // Fallback to bounding box corners
    const bb = [
      {x:10,y:10}, {x:pWidth-10,y:10}, {x:pWidth-10,y:pHeight-10}, {x:10,y:pHeight-10}
    ];
    setQuad(bb);
    state.quadPreview = bb;
    setStatus('Không tìm thấy biên hóa đơn, vui lòng chỉnh tay.');
  }

  show(adjustControls, true);
}

async function applyCropAction(){
  const quadDown = getQuad();
  state.quadPreview = quadDown;
  setStatus('Cropping…');
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
  sizeInfo.textContent = `Size: ${Math.round(blobInfo.size/1024)}KB, quality: ${blobInfo.quality.toFixed(2)}, width: ${canvas.width}`;
  setStatus('Result preview');
}

async function updateQuality(){
  state.jpegQuality = parseFloat(qualitySlider.value);
  if(!state.croppedCanvas) return;
  const blobInfo = await compressToTarget(state.croppedCanvas, state.jpegQuality, state.sizeLimitKB, state.maxOutputWidth);
  const url = URL.createObjectURL(blobInfo.blob);
  resultImg.src = url;
  sizeInfo.textContent = `Size: ${Math.round(blobInfo.size/1024)}KB, quality: ${blobInfo.quality.toFixed(2)}, width: ${state.croppedCanvas.width}`;
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
fileInput.addEventListener('change', onFileChange);
applyCrop.addEventListener('click', applyCropAction);
qualitySlider.addEventListener('input', updateQuality);
downloadBtn.addEventListener('click', downloadJPG);
backBtn.addEventListener('click', backToAdjust);
resetCorners.addEventListener('click', resetCornersAction);

setStatus('Idle');
