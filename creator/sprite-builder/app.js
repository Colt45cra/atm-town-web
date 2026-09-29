(() => {
'use strict';

const SPEC = {
  fw:256, fh:320, cols:3, rows:4,
  sheetW:768, sheetH:1280,
  anchorX:128, anchorY:303,
  rowOrder:['down','left','up','right']
};
const WALK_SEQUENCE=[0,1,2,1];
const $=id=>document.getElementById(id);

const sheet=$('sheet');
const ctx=sheet.getContext('2d',{willReadFrequently:true});
const anim=$('anim');
const actx=anim.getContext('2d');
ctx.imageSmoothingEnabled=false;
actx.imageSmoothingEnabled=false;

let sourceImage=null;
let generated=false;
let aiConfigured=false;
let animAction='idle';
let animDir='down';
let animFrame=0;
let raf=0;

function cleanName(){
  return ($('charName').value||'character').trim().toLowerCase()
    .replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,'')||'character';
}

function setStatus(message,kind=''){
  const el=$('status');
  el.textContent=message;
  el.className='status'+(kind?' '+kind:'');
}

function setDownloads(on){
  ['downloadPng','downloadWebp','downloadThumb','downloadMeta'].forEach(id=>$(id).disabled=!on);
}

function drawGrid(){
  sheet.width=SPEC.sheetW;
  sheet.height=SPEC.sheetH;
  ctx.clearRect(0,0,SPEC.sheetW,SPEC.sheetH);
  ctx.save();
  ctx.strokeStyle='rgba(111,231,255,.16)';
  ctx.lineWidth=1;
  for(let x=1;x<SPEC.cols;x++){
    ctx.beginPath();ctx.moveTo(x*SPEC.fw,0);ctx.lineTo(x*SPEC.fw,SPEC.sheetH);ctx.stroke();
  }
  for(let y=1;y<SPEC.rows;y++){
    ctx.beginPath();ctx.moveTo(0,y*SPEC.fh);ctx.lineTo(SPEC.sheetW,y*SPEC.fh);ctx.stroke();
  }
  ctx.restore();
}

async function refreshAiAvailability(){
  try{
    const response=await fetch('/api/generate-sprite',{headers:{Accept:'application/json'}});
    const data=await response.json().catch(()=>({}));
    aiConfigured=Boolean(response.ok&&data.configured);
  }catch{
    aiConfigured=false;
  }
  $('generateAi').disabled=!sourceImage||!aiConfigured;
  if(sourceImage&&!aiConfigured) setStatus('Character loaded, but GPT generation is not configured on the server.','bad');
}

function loadFile(file){
  if(!file||!file.type.startsWith('image/')) return setStatus('Please choose a PNG, WebP or JPG image.','bad');
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      sourceImage=img;
      $('sourcePreview').src=reader.result;
      $('sourcePreview').classList.remove('hidden');
      $('dropText').classList.add('hidden');
      generated=false;
      setDownloads(false);
      drawGrid();
      clearAnimation();
      $('generateAi').disabled=!aiConfigured;
      setStatus(aiConfigured?'Character loaded. Tap Generate Sprite Sheet.':'Character loaded. Checking GPT connection…');
      if(!aiConfigured) refreshAiAvailability();
    };
    img.onerror=()=>setStatus('That image could not be decoded.','bad');
    img.src=reader.result;
  };
  reader.readAsDataURL(file);
}

$('file').addEventListener('change',e=>loadFile(e.target.files?.[0]));
const drop=$('drop');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor='#6fe7ff';}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor='';}));
drop.addEventListener('drop',e=>loadFile(e.dataTransfer.files?.[0]));

function preparedSource(){
  const max=1024;
  const ratio=Math.min(1,max/Math.max(sourceImage.naturalWidth,sourceImage.naturalHeight));
  const w=Math.max(1,Math.round(sourceImage.naturalWidth*ratio));
  const h=Math.max(1,Math.round(sourceImage.naturalHeight*ratio));
  const c=document.createElement('canvas');
  c.width=w;c.height=h;
  const cctx=c.getContext('2d',{willReadFrequently:true});
  cctx.drawImage(sourceImage,0,0,w,h);

  if($('removeBg').checked){
    const im=cctx.getImageData(0,0,w,h),d=im.data;
    const pts=[[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
    let r=0,g=0,b=0,n=0;
    for(const [x,y] of pts){
      const i=(y*w+x)*4;
      if(d[i+3]>20){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}
    }
    if(n){
      r/=n;g/=n;b/=n;
      const t=42;
      for(let i=0;i<d.length;i+=4){
        const dist=Math.hypot(d[i]-r,d[i+1]-g,d[i+2]-b);
        if(dist<t)d[i+3]=0;
        else if(dist<t*1.65)d[i+3]=Math.round(d[i+3]*((dist-t)/(t*.65)));
      }
      cctx.putImageData(im,0,0);
    }
  }
  return c;
}

function canvasDataUrl(c){
  const webp=c.toDataURL('image/webp',.9);
  return webp.startsWith('data:image/webp')?webp:c.toDataURL('image/png');
}

function alphaBounds(canvas){
  const cctx=canvas.getContext('2d',{willReadFrequently:true});
  const data=cctx.getImageData(0,0,canvas.width,canvas.height).data;
  let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
  for(let y=0;y<canvas.height;y+=2){
    for(let x=0;x<canvas.width;x+=2){
      if(data[(y*canvas.width+x)*4+3]>12){
        minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      }
    }
  }
  if(maxX<0)return{x:0,y:0,w:canvas.width,h:canvas.height};
  return{x:minX,y:minY,w:Math.max(1,maxX-minX+2),h:Math.max(1,maxY-minY+2)};
}

function removeFlatEdgeColor(canvas){
  const cctx=canvas.getContext('2d',{willReadFrequently:true});
  const w=canvas.width,h=canvas.height,im=cctx.getImageData(0,0,w,h),d=im.data;
  const pts=[[2,2],[w-3,2],[2,h-3],[w-3,h-3]];
  const colors=pts.map(([x,y])=>{
    const i=(Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x)))*4;
    return[d[i],d[i+1],d[i+2],d[i+3]];
  });
  if(colors.some(v=>v[3]<245))return canvas;
  const avg=[0,0,0];
  colors.forEach(v=>{avg[0]+=v[0];avg[1]+=v[1];avg[2]+=v[2];});
  avg[0]/=4;avg[1]/=4;avg[2]/=4;
  const spread=Math.max(...colors.map(v=>Math.hypot(v[0]-avg[0],v[1]-avg[1],v[2]-avg[2])));
  if(spread>26)return canvas;
  const bright=(avg[0]+avg[1]+avg[2])/3;
  if(bright<205)return canvas;
  const t=30;
  for(let i=0;i<d.length;i+=4){
    const dist=Math.hypot(d[i]-avg[0],d[i+1]-avg[1],d[i+2]-avg[2]);
    if(dist<t)d[i+3]=0;
    else if(dist<t*1.7)d[i+3]=Math.round(d[i+3]*((dist-t)/(t*.7)));
  }
  cctx.putImageData(im,0,0);
  return canvas;
}

function normalizeGeneratedSheet(img){
  sheet.width=SPEC.sheetW;
  sheet.height=SPEC.sheetH;
  ctx.clearRect(0,0,SPEC.sheetW,SPEC.sheetH);
  ctx.imageSmoothingEnabled=false;

  const sourceCellW=img.naturalWidth/3;
  const sourceCellH=img.naturalHeight/4;

  for(let row=0;row<4;row++){
    for(let col=0;col<3;col++){
      const temp=document.createElement('canvas');
      temp.width=Math.max(64,Math.round(sourceCellW));
      temp.height=Math.max(64,Math.round(sourceCellH));
      const tctx=temp.getContext('2d',{willReadFrequently:true});
      tctx.drawImage(img,col*sourceCellW,row*sourceCellH,sourceCellW,sourceCellH,0,0,temp.width,temp.height);
      removeFlatEdgeColor(temp);

      const b=alphaBounds(temp);
      const usableW=SPEC.fw*.88;
      const usableH=SPEC.anchorY-8;
      const scale=Math.min(usableW/b.w,usableH/b.h);
      const dw=b.w*scale,dh=b.h*scale;
      const dx=col*SPEC.fw+SPEC.anchorX-dw/2;
      const dy=row*SPEC.fh+SPEC.anchorY-dh;
      ctx.drawImage(temp,b.x,b.y,b.w,b.h,dx,dy,dw,dh);
    }
  }

  generated=true;
  setDownloads(true);
  startAnimation();
  $('previewText').textContent='Preview uses the ATM Town walk sequence 1 → 2 → 3 → 2.';
}

function imageFromBlob(blob){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(blob);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('The generated sprite sheet could not be decoded.'));};
    img.src=url;
  });
}

async function generateWithAi(){
  if(!sourceImage||!aiConfigured)return;
  $('generateAi').disabled=true;
  generated=false;
  setDownloads(false);
  clearAnimation();
  setStatus('Generating your ATM Town sprite sheet…');

  try{
    const imageDataUrl=canvasDataUrl(preparedSource());
    const response=await fetch('/api/generate-sprite',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({imageDataUrl})
    });

    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      throw new Error(data.error||('Generation failed (HTTP '+response.status+')'));
    }

    const contentType=(response.headers.get('content-type')||'').toLowerCase();
    if(!contentType.startsWith('image/'))throw new Error('The generation service returned an unexpected response.');

    const blob=await response.blob();
    if(!blob.size)throw new Error('The generation service returned an empty image.');

    const img=await imageFromBlob(blob);
    normalizeGeneratedSheet(img);
    setStatus('Sprite sheet generated.','good');
  }catch(err){
    setStatus(err.message||'GPT generation failed.','bad');
  }finally{
    $('generateAi').disabled=!sourceImage||!aiConfigured;
  }
}
$('generateAi').addEventListener('click',generateWithAi);

function clearAnimation(){
  if(raf)cancelAnimationFrame(raf);
  raf=0;
  actx.clearRect(0,0,anim.width,anim.height);
}

function drawAnim(){
  if(!generated)return;
  anim.width=SPEC.fw;anim.height=SPEC.fh;
  actx.imageSmoothingEnabled=false;
  actx.clearRect(0,0,SPEC.fw,SPEC.fh);
  const row=Math.max(0,SPEC.rowOrder.indexOf(animDir));
  const col=animAction==='idle'?1:WALK_SEQUENCE[animFrame%WALK_SEQUENCE.length];
  actx.drawImage(sheet,col*SPEC.fw,row*SPEC.fh,SPEC.fw,SPEC.fh,0,0,SPEC.fw,SPEC.fh);
}

function startAnimation(){
  clearAnimation();
  let last=0;
  const loop=t=>{
    if(!generated)return;
    if(t-last>(animAction==='idle'?650:155)){
      last=t;animFrame++;drawAnim();
    }
    raf=requestAnimationFrame(loop);
  };
  drawAnim();
  raf=requestAnimationFrame(loop);
}

$('dirBtns').addEventListener('click',e=>{
  const b=e.target.closest('button[data-action]');
  if(!b)return;
  animAction=b.dataset.action;
  animDir=b.dataset.dir;
  animFrame=0;
  document.querySelectorAll('#dirBtns .btn').forEach(x=>x.classList.toggle('active',x===b));
  if(generated){
    startAnimation();
    $('previewText').textContent=animAction==='idle'?'Idle frame':'Walking '+animDir+' • 1 → 2 → 3 → 2';
  }
});

function canvasBlob(canvas,type,quality){
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Export failed')),type,quality));
}
function download(blob,name){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=name;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}

$('downloadPng').addEventListener('click',async()=>download(await canvasBlob(sheet,'image/png'),cleanName()+'-sprite-sheet.png'));
$('downloadWebp').addEventListener('click',async()=>download(await canvasBlob(sheet,'image/webp',1),cleanName()+'-sprite-sheet.webp'));
$('downloadThumb').addEventListener('click',async()=>{
  const c=document.createElement('canvas');
  c.width=128;c.height=128;
  const x=c.getContext('2d');
  x.imageSmoothingEnabled=false;
  const src=Math.min(SPEC.fw,SPEC.fh);
  x.drawImage(sheet,SPEC.fw+(SPEC.fw-src)/2,(SPEC.fh-src)/2,src,src,0,0,128,128);
  download(await canvasBlob(c,'image/png'),cleanName()+'-thumbnail.png');
});
$('downloadMeta').addEventListener('click',()=>{
  const meta={
    name:cleanName(),
    format:'ATM Town exact',
    frameWidth:SPEC.fw,frameHeight:SPEC.fh,
    columns:3,rows:4,
    sheetWidth:SPEC.sheetW,sheetHeight:SPEC.sheetH,
    rowOrder:SPEC.rowOrder,
    columnOrder:['walk-a','idle','walk-b'],
    anchorX:SPEC.anchorX,anchorY:SPEC.anchorY,
    idleFrame:1,
    walkFrames:[0,1,2],
    walkSequence:[0,1,2,1],
    transparent:true,
    generationKind:'gpt-single-hidden-reference'
  };
  download(new Blob([JSON.stringify(meta,null,2)],{type:'application/json'}),cleanName()+'.sprite.json');
});

drawGrid();
setDownloads(false);
refreshAiAvailability();
})();