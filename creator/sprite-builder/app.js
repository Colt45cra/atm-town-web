(() => {
'use strict';

const SPEC = { fw:256, fh:320, cols:3, rows:4, sheetW:768, sheetH:1280, anchorX:128, anchorY:303, rowOrder:['down','left','up','right'] };
const $ = (id) => document.getElementById(id);
const sheet = $('sheet');
const ctx = sheet.getContext('2d', { willReadFrequently:true });
const anim = $('anim');
const actx = anim.getContext('2d');
ctx.imageSmoothingEnabled = false;
actx.imageSmoothingEnabled = false;

let sourceImage = null;
let sourceFile = null;
let generated = false;
let generationKind = 'none';
let animAction = 'idle';
let animDir = 'down';
let animFrame = 0;
let raf = 0;
let aiConfigured = false;

function cleanName() {
  return ($('charName').value || 'character').trim().toLowerCase().replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,'') || 'character';
}

function setStatus(message, kind='') {
  const el = $('status');
  el.textContent = message;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

async function refreshAiAvailability() {
  try {
    const response = await fetch('/api/generate-sprite', { headers: { 'Accept':'application/json' } });
    const data = await response.json().catch(() => ({}));
    aiConfigured = Boolean(response.ok && data.configured);
  } catch {
    aiConfigured = false;
  }
  $('generateAi').disabled = !sourceImage || !aiConfigured;
  if (sourceImage) {
    setStatus(
      aiConfigured
        ? 'Character loaded. Generate the directional sprite sheet with GPT.'
        : 'Character loaded. GPT generation is waiting for the server API key; local layout test and contact-sheet import still work.',
      aiConfigured ? '' : 'bad'
    );
  }
}

function drawGrid() {
  sheet.width = SPEC.sheetW;
  sheet.height = SPEC.sheetH;
  ctx.clearRect(0,0,sheet.width,sheet.height);
  ctx.save();
  ctx.strokeStyle = 'rgba(111,231,255,.16)';
  ctx.lineWidth = 1;
  for (let x=1;x<SPEC.cols;x++) {
    ctx.beginPath(); ctx.moveTo(x*SPEC.fw,0); ctx.lineTo(x*SPEC.fw,SPEC.sheetH); ctx.stroke();
  }
  for (let y=1;y<SPEC.rows;y++) {
    ctx.beginPath(); ctx.moveTo(0,y*SPEC.fh); ctx.lineTo(SPEC.sheetW,y*SPEC.fh); ctx.stroke();
  }
  ctx.restore();
}

function setDownloads(on) {
  ['downloadPng','downloadWebp','downloadThumb','downloadMeta'].forEach(id => $(id).disabled = !on);
}

function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return setStatus('Please choose a PNG, WebP or JPG image.','bad');
  sourceFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      $('sourcePreview').src = reader.result;
      $('sourcePreview').classList.remove('hidden');
      $('dropText').classList.add('hidden');
      $('generateAi').disabled = !aiConfigured;
      $('simulate').disabled = false;
      generated = false;
      generationKind = 'none';
      setDownloads(false);
      drawGrid();
      clearAnimation();
      setStatus(aiConfigured ? 'Character loaded. Generate the directional sprite sheet with GPT.' : 'Character loaded. GPT generation is waiting for the server API key; local layout test and contact-sheet import still work.', aiConfigured ? '' : 'bad');
    };
    img.onerror = () => setStatus('That image could not be decoded.','bad');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

$('file').addEventListener('change', e => loadFile(e.target.files?.[0]));
const drop = $('drop');
['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.style.borderColor = '#6fe7ff'; }));
['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.style.borderColor = ''; }));
drop.addEventListener('drop', e => loadFile(e.dataTransfer.files?.[0]));
$('subjectScale').addEventListener('input', () => $('scaleValue').textContent = $('subjectScale').value + '%');

function isolatedSource() {
  if (!sourceImage) return null;
  const max = 1024;
  const ratio = Math.min(1, max / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight));
  const w = Math.max(1, Math.round(sourceImage.naturalWidth * ratio));
  const h = Math.max(1, Math.round(sourceImage.naturalHeight * ratio));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const cctx = c.getContext('2d', { willReadFrequently:true });
  cctx.drawImage(sourceImage,0,0,w,h);

  if ($('removeBg').checked) {
    const im = cctx.getImageData(0,0,w,h);
    const d = im.data;
    const corners = [[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
    let r=0,g=0,b=0,n=0;
    for (const [x,y] of corners) {
      const i=(y*w+x)*4;
      if (d[i+3] > 20) { r+=d[i]; g+=d[i+1]; b+=d[i+2]; n++; }
    }
    if (n) {
      r/=n; g/=n; b/=n;
      const t=42;
      for (let i=0;i<d.length;i+=4) {
        const dist=Math.hypot(d[i]-r,d[i+1]-g,d[i+2]-b);
        if (dist<t) d[i+3]=0;
        else if (dist<t*1.65) d[i+3]=Math.round(d[i+3]*((dist-t)/(t*.65)));
      }
      cctx.putImageData(im,0,0);
    }
  }
  return c;
}

function alphaBounds(canvas) {
  const cctx=canvas.getContext('2d',{willReadFrequently:true});
  const data=cctx.getImageData(0,0,canvas.width,canvas.height).data;
  let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
  for(let y=0;y<canvas.height;y+=2){
    for(let x=0;x<canvas.width;x+=2){
      if(data[(y*canvas.width+x)*4+3] > 12){
        minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
      }
    }
  }
  if(maxX<0) return {x:0,y:0,w:canvas.width,h:canvas.height};
  return {x:minX,y:minY,w:Math.max(1,maxX-minX+2),h:Math.max(1,maxY-minY+2)};
}

function removeFlatEdgeColor(canvas) {
  const cctx=canvas.getContext('2d',{willReadFrequently:true});
  const w=canvas.width,h=canvas.height,im=cctx.getImageData(0,0,w,h),d=im.data;
  const pts=[[2,2],[w-3,2],[2,h-3],[w-3,h-3]];
  const colors=pts.map(([x,y]) => {
    const i=(Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x)))*4;
    return [d[i],d[i+1],d[i+2],d[i+3]];
  });
  if(colors.some(v => v[3] < 245)) return canvas;
  const avg=[0,0,0];
  colors.forEach(v => { avg[0]+=v[0]; avg[1]+=v[1]; avg[2]+=v[2]; });
  avg[0]/=4; avg[1]/=4; avg[2]/=4;
  const spread=Math.max(...colors.map(v=>Math.hypot(v[0]-avg[0],v[1]-avg[1],v[2]-avg[2])));
  if(spread>30) return canvas;
  const t=24;
  for(let i=0;i<d.length;i+=4){
    const dist=Math.hypot(d[i]-avg[0],d[i+1]-avg[1],d[i+2]-avg[2]);
    if(dist<t) d[i+3]=0;
    else if(dist<t*1.8) d[i+3]=Math.round(d[i+3]*((dist-t)/(t*.8)));
  }
  cctx.putImageData(im,0,0);
  return canvas;
}

function normalizeContactSheet(img) {
  sheet.width=SPEC.sheetW; sheet.height=SPEC.sheetH;
  ctx.clearRect(0,0,SPEC.sheetW,SPEC.sheetH);
  ctx.imageSmoothingEnabled=false;
  const cellW=img.naturalWidth/3;
  const cellH=img.naturalHeight/4;
  const scalePct=Number($('subjectScale').value)/100;

  for(let r=0;r<4;r++){
    for(let c=0;c<3;c++){
      const tw=Math.max(64,Math.round(cellW));
      const th=Math.max(64,Math.round(cellH));
      const temp=document.createElement('canvas');
      temp.width=tw; temp.height=th;
      const tctx=temp.getContext('2d',{willReadFrequently:true});
      tctx.drawImage(img,c*cellW,r*cellH,cellW,cellH,0,0,tw,th);
      removeFlatEdgeColor(temp);
      const b=alphaBounds(temp);
      const usableW=SPEC.fw*.86*scalePct;
      const usableH=(SPEC.anchorY-8)*scalePct;
      const s=Math.min(usableW/b.w,usableH/b.h);
      const dw=b.w*s,dh=b.h*s;
      const dx=c*SPEC.fw+SPEC.anchorX-dw/2;
      const dy=r*SPEC.fh+SPEC.anchorY-dh;
      ctx.drawImage(temp,b.x,b.y,b.w,b.h,dx,dy,dw,dh);
    }
  }

  generated=true;
  generationKind='gpt-contact-sheet';
  setDownloads(true);
  startAnimation();
  $('previewText').textContent='Previewing normalized ATM Town frames.';
}

function styleGuidance() {
  const style=$('style').value;
  if(style==='atm') return 'Convert the character into crisp ATM Town pixel-art / pixel-illustrated game style while preserving identity.';
  if(style==='mascot') return 'Preserve the character as a clean readable mascot or creature with a strong game silhouette.';
  if(style==='robot') return 'Preserve all machine, robot, screen, button, logo, and accessory details consistently.';
  if(style==='human') return 'Preserve face, hair, clothing, accessories, body proportions, and identifying details consistently.';
  return 'Preserve the uploaded character design, art style, colors, proportions, clothing, face, accessories, and distinguishing details as faithfully as possible.';
}

function buildPrompt() {
  return [
    'Use the attached character image as the sole identity and design reference.',
    'Create exactly one clean transparent 3-column by 4-row game sprite contact sheet with 12 full-body cells.',
    'STRICT ORDER: row 1 DOWN/front, row 2 LEFT profile, row 3 UP/back, row 4 RIGHT profile.',
    'STRICT COLUMNS: column 1 subtle walk A, column 2 neutral idle, column 3 subtle walk B.',
    'No labels, no text, no grid lines, no borders, no scenery, no floor, no cast shadow.',
    'Transparent background in every cell.',
    'Keep one character centered in each cell with generous transparent padding. Never crop head, hair, ears, wings, tail, weapons, hands or feet.',
    'Keep character scale and feet baseline extremely consistent across all 12 cells.',
    'The left and right rows must be true directional side views. The up row must clearly show the back.',
    'Walking poses must be mild readable walk-cycle phases, not running or action poses.',
    styleGuidance(),
    'Favor a clean readable game sprite silhouette and consistent details over dramatic rendering.',
    'Return only the 3x4 sprite contact sheet.'
  ].join('\n');
}

async function canvasToDataURL(canvas) {
  // WebP keeps the browser-to-function request much smaller than PNG while
  // retaining transparency when the background-removal option is used.
  const webp = canvas.toDataURL('image/webp', 0.9);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/png');
}

async function generateWithAi() {
  if(!sourceImage) return;
  $('generateAi').disabled=true;
  setStatus('Generating 12 directional poses with GPT… this can take a little while.');
  try{
    const source=isolatedSource();
    const imageDataUrl=await canvasToDataURL(source);
    const response=await fetch('/api/generate-sprite',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        imageDataUrl,
        prompt:buildPrompt(),
        characterName:cleanName(),
        quality:'medium'
      })
    });
    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      throw new Error(data.error || ('Generation failed (HTTP '+response.status+')'));
    }

    const contentType=(response.headers.get('content-type') || '').toLowerCase();
    if(!contentType.startsWith('image/')) throw new Error('The generation service returned an unexpected response.');

    const blob=await response.blob();
    if(!blob.size) throw new Error('The generation service returned an empty image.');

    const objectUrl=URL.createObjectURL(blob);
    const img=new Image();
    img.onload=()=>{
      try{
        normalizeContactSheet(img);
        setStatus('GPT generation complete. The 12 cells were normalized into the exact 768×1280 ATM Town sheet.','good');
      } finally {
        URL.revokeObjectURL(objectUrl);
        $('generateAi').disabled=!aiConfigured;
      }
    };
    img.onerror=()=>{
      URL.revokeObjectURL(objectUrl);
      setStatus('GPT returned an image that could not be decoded.','bad');
      $('generateAi').disabled=false;
    };
    img.src=objectUrl;
  }catch(err){
    setStatus(err.message || 'GPT generation failed.','bad');
    $('generateAi').disabled=!aiConfigured;
  }
}

$('generateAi').addEventListener('click',generateWithAi);

function simulateLocal() {
  if(!sourceImage) return;
  const src=isolatedSource();
  const b=alphaBounds(src);
  sheet.width=SPEC.sheetW; sheet.height=SPEC.sheetH;
  ctx.clearRect(0,0,SPEC.sheetW,SPEC.sheetH);
  const scalePct=Number($('subjectScale').value)/100;
  const usableW=SPEC.fw*.84*scalePct;
  const usableH=(SPEC.anchorY-8)*scalePct;
  const baseScale=Math.min(usableW/b.w,usableH/b.h);
  const dw=b.w*baseScale,dh=b.h*baseScale;

  for(let r=0;r<4;r++){
    for(let c=0;c<3;c++){
      let sx=1,skew=0,brightness='none';
      if(r===1){sx=.86;skew=-.05}
      if(r===3){sx=-.86;skew=.05}
      if(r===2){sx=.94;brightness='brightness(.88) saturate(.9)'}
      const step=c===0?-1:c===2?1:0;
      ctx.save();
      ctx.translate(c*SPEC.fw+SPEC.anchorX,r*SPEC.fh+SPEC.anchorY-(c===1?0:3));
      ctx.transform(sx,0,skew,1,0,0);
      ctx.rotate(step*.014);
      ctx.filter=brightness;
      ctx.drawImage(src,b.x,b.y,b.w,b.h,-dw/2,-dh,dw,dh);
      ctx.restore();
    }
  }
  generated=true;
  generationKind='local-layout-test';
  setDownloads(true);
  startAnimation();
  setStatus('Local layout test created. Use Generate with GPT for real directional views.','good');
}

$('simulate').addEventListener('click',simulateLocal);

$('aiImport').addEventListener('change',e=>{
  const file=e.target.files?.[0];
  if(!file || !file.type.startsWith('image/')) return;
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{ normalizeContactSheet(img); generationKind='imported-ai-sheet'; setStatus('Imported sheet normalized to ATM Town dimensions.','good'); };
    img.onerror=()=>setStatus('Imported image could not be decoded.','bad');
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
});

function clearAnimation(){
  if(raf) cancelAnimationFrame(raf);
  raf=0;
  actx.clearRect(0,0,anim.width,anim.height);
}

function drawAnim(){
  if(!generated) return;
  anim.width=SPEC.fw; anim.height=SPEC.fh;
  actx.imageSmoothingEnabled=false;
  actx.clearRect(0,0,SPEC.fw,SPEC.fh);
  const row=Math.max(0,SPEC.rowOrder.indexOf(animDir));
  const col=animAction==='idle'?1:(animFrame%3);
  actx.drawImage(sheet,col*SPEC.fw,row*SPEC.fh,SPEC.fw,SPEC.fh,0,0,SPEC.fw,SPEC.fh);
}

function startAnimation(){
  clearAnimation();
  let last=0;
  const loop=(t)=>{
    if(!generated) return;
    if(t-last > (animAction==='idle'?650:155)){
      last=t; animFrame++; drawAnim();
    }
    raf=requestAnimationFrame(loop);
  };
  drawAnim();
  raf=requestAnimationFrame(loop);
}

$('dirBtns').addEventListener('click',e=>{
  const b=e.target.closest('button[data-action]');
  if(!b) return;
  animAction=b.dataset.action;
  animDir=b.dataset.dir;
  document.querySelectorAll('#dirBtns .btn').forEach(x=>x.classList.toggle('active',x===b));
  if(generated){
    startAnimation();
    $('previewText').textContent=animAction==='idle'?'Idle frame':'Walking '+animDir+' • Walk A → Idle → Walk B';
  }
});

function canvasBlob(canvas,type,quality){
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Export failed')),type,quality));
}
function download(blob,name){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
$('downloadPng').addEventListener('click',async()=>download(await canvasBlob(sheet,'image/png'),cleanName()+'-sprite-sheet.png'));
$('downloadWebp').addEventListener('click',async()=>download(await canvasBlob(sheet,'image/webp',1),cleanName()+'-sprite-sheet.webp'));
$('downloadThumb').addEventListener('click',async()=>{
  const c=document.createElement('canvas'); c.width=128;c.height=128;
  const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  const src=Math.min(SPEC.fw,SPEC.fh);
  x.drawImage(sheet,SPEC.fw+(SPEC.fw-src)/2,(SPEC.fh-src)/2,src,src,0,0,128,128);
  download(await canvasBlob(c,'image/png'),cleanName()+'-thumbnail.png');
});
$('downloadMeta').addEventListener('click',()=>{
  const meta={
    name:cleanName(),
    format:'ATM Town exact',
    frameWidth:SPEC.fw,frameHeight:SPEC.fh,
    columns:3,rows:4,sheetWidth:SPEC.sheetW,sheetHeight:SPEC.sheetH,
    rowOrder:SPEC.rowOrder,columnOrder:['walk-a','idle','walk-b'],
    anchorX:SPEC.anchorX,anchorY:SPEC.anchorY,
    idleFrame:1,walkFrames:[0,1,2],
    transparent:true,generationKind
  };
  download(new Blob([JSON.stringify(meta,null,2)],{type:'application/json'}),cleanName()+'.sprite.json');
});

drawGrid();
setDownloads(false);
refreshAiAvailability();
})();