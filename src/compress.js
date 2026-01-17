export async function compressToTarget(canvas, baseQuality=0.75, sizeLimitKB=500, maxWidth=1600){
  let quality = baseQuality;
  let curCanvas = canvas;

  const toBlob = (cnv, q) => new Promise(res=> cnv.toBlob(b=>res(b), 'image/jpeg', q));
  const measure = async (cnv, q) => {
    const blob = await toBlob(cnv, q);
    const size = blob.size;
    return { blob, size };
  };
  
  let { blob, size } = await measure(curCanvas, quality);
  let attempts = 0;
  while(size > sizeLimitKB*1024 && attempts < 12){
    attempts++;
    if(quality > 0.5){
      quality = Math.max(0.4, quality - 0.07);
    } else {
      // Resize down by 10%
      const w = Math.max(320, Math.round(curCanvas.width * 0.9));
      const h = Math.round(curCanvas.height * 0.9);
      if(w < maxWidth){
        // Already under max width, continue shrinking
      }
      const tmp = document.createElement('canvas');
      tmp.width = Math.min(maxWidth, w);
      tmp.height = Math.round(h * (tmp.width / curCanvas.width));
      const tctx = tmp.getContext('2d');
      tctx.drawImage(curCanvas, 0, 0, tmp.width, tmp.height);
      curCanvas = tmp;
    }
    const m = await measure(curCanvas, quality);
    blob = m.blob; size = m.size;
  }
  return { blob, size, quality };
}
