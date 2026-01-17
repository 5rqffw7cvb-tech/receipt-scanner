let overlayCanvas, overlayCtx;
let previewCanvas;
let quad = null;
let draggingIndex = -1;
let touchStartDist = 0;

export function initOverlay(canvas){
  overlayCanvas = canvas;
  overlayCtx = overlayCanvas.getContext('2d');
  overlayCanvas.addEventListener('pointerdown', onPointerDown);
  overlayCanvas.addEventListener('pointermove', onPointerMove);
  overlayCanvas.addEventListener('pointerup', onPointerUp);
  overlayCanvas.addEventListener('pointercancel', onPointerUp);
}

export function setOverlayImage(pCanvas){
  previewCanvas = pCanvas;
  overlayCanvas.width = previewCanvas.width;
  overlayCanvas.height = previewCanvas.height;
  draw();
}

export function setQuad(q){ quad = q.map(p=>({x:p.x,y:p.y})); draw(); }
export function getQuad(){ return quad ? quad.map(p=>({x:p.x,y:p.y})) : null; }

function draw(){
  if(!overlayCtx || !previewCanvas) return;
  overlayCtx.clearRect(0,0,overlayCanvas.width,overlayCanvas.height);
  if(!quad) return;
  
  // Draw lines
  overlayCtx.strokeStyle = '#3b82f6';
  overlayCtx.lineWidth = 3;
  overlayCtx.beginPath();
  overlayCtx.moveTo(quad[0].x, quad[0].y);
  overlayCtx.lineTo(quad[1].x, quad[1].y);
  overlayCtx.lineTo(quad[2].x, quad[2].y);
  overlayCtx.lineTo(quad[3].x, quad[3].y);
  overlayCtx.closePath();
  overlayCtx.stroke();
  
  // Highlight current hover point
  for(let i=0;i<4;i++){
    const isHovering = draggingIndex === i;
    drawPoint(quad[i].x, quad[i].y, isHovering);
  }
}

function drawPoint(x,y, hovering){
  const size = hovering ? 16 : 12;
  overlayCtx.fillStyle = hovering ? '#2563eb' : '#3b82f6';
  overlayCtx.strokeStyle = '#fff';
  overlayCtx.lineWidth = 2;
  overlayCtx.beginPath();
  overlayCtx.arc(x,y,size,0,Math.PI*2);
  overlayCtx.fill();
  overlayCtx.stroke();
}

function hitTest(x,y){
  if(!quad) return -1;
  const threshold = 24; // Larger hit area for touch
  for(let i=0;i<4;i++){
    const dx = quad[i].x - x;
    const dy = quad[i].y - y;
    if(Math.hypot(dx,dy) <= threshold) return i;
  }
  return -1;
}

function onPointerDown(e){
  const rect = overlayCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (overlayCanvas.width / rect.width);
  const y = (e.clientY - rect.top) * (overlayCanvas.height / rect.height);
  draggingIndex = hitTest(x,y);
  if(draggingIndex !== -1){
    overlayCanvas.setPointerCapture(e.pointerId);
    overlayCanvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
}

function onPointerMove(e){
  const rect = overlayCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (overlayCanvas.width / rect.width);
  const y = (e.clientY - rect.top) * (overlayCanvas.height / rect.height);
  
  // Hover effect
  if(draggingIndex === -1){
    const idx = hitTest(x,y);
    overlayCanvas.style.cursor = idx !== -1 ? 'grab' : 'default';
  }
  
  if(draggingIndex === -1) return;
  
  quad[draggingIndex].x = Math.max(0, Math.min(overlayCanvas.width, x));
  quad[draggingIndex].y = Math.max(0, Math.min(overlayCanvas.height, y));
  draw();
}

function onPointerUp(e){
  if(draggingIndex !== -1){
    overlayCanvas.releasePointerCapture(e.pointerId);
    overlayCanvas.style.cursor = 'default';
  }
  draggingIndex = -1;
}

export function onOverlayChange(fn){ /* reserved */ }
