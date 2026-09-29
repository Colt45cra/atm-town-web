(() => {
'use strict';

const SPEC = { fw:256, fh:320, cols:3, rows:4, sheetW:768, sheetH:1280, anchorX:128, anchorY:303, rowOrder:['down','left','up','right'] };
const WALK_SEQUENCE=[0,1,2,1];
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
  if(style==='atm') return 'Match the actual ATM Town reference frame visual language: compact 2D game-sprite proportions, crisp pixel-illustrated edges, deliberate pixel clusters, restrained cluster-based shading, limited anti-aliasing, readable silhouette, and simplified small-scale details. Do NOT render photorealistic skin, fabric texture, cinematic lighting, painterly brushwork, smooth vector art, or glossy 3D rendering.';
  if(style==='mascot') return 'Preserve the character as a clean readable mascot or creature with a strong game silhouette.';
  if(style==='robot') return 'Preserve all machine, robot, screen, button, logo, and accessory details consistently.';
  if(style==='human') return 'Preserve face, hair, clothing, accessories, body proportions, and identifying details consistently.';
  return 'Preserve the uploaded character design, art style, colors, proportions, clothing, face, accessories, and distinguishing details as faithfully as possible.';
}

const POSE_REFERENCE_CELLS={
  'front-walk-a':[0,0],
  'front-idle':[0,1],
  'front-walk-b':[0,2],
  'left-walk-a':[1,0],
  'left-idle':[1,1],
  'left-walk-b':[1,2],
  'back-walk-a':[2,0],
  'back-idle':[2,1],
  'back-walk-b':[2,2]
};
const referenceSheetCache=new Map();

function referenceSheetSrc(){
  const style=$('style').value;
  if(style==='robot') return '/assets/characters/playable/atm.webp';
  if(style==='mascot') return '/assets/characters/playable/fuzzy.webp';
  return '/assets/characters/playable/brad.webp';
}

function loadReferenceSheet(src){
  if(referenceSheetCache.has(src)) return referenceSheetCache.get(src);
  const promise=new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('ATM Town pose reference could not be loaded.'));
    img.src=src;
  });
  referenceSheetCache.set(src,promise);
  return promise;
}

async function poseReferenceDataURL(pose){
  const rc=POSE_REFERENCE_CELLS[pose.key];
  if(!rc) return null;
  const img=await loadReferenceSheet(referenceSheetSrc());
  const fw=img.naturalWidth/3;
  const fh=img.naturalHeight/4;
  const [row,col]=rc;
  const c=document.createElement('canvas');
  c.width=Math.round(fw);
  c.height=Math.round(fh);
  const cctx=c.getContext('2d');
  cctx.imageSmoothingEnabled=false;
  cctx.clearRect(0,0,c.width,c.height);
  cctx.drawImage(img,col*fw,row*fh,fw,fh,0,0,c.width,c.height);
  const webp=c.toDataURL('image/webp',0.94);
  return webp.startsWith('data:image/webp')?webp:c.toDataURL('image/png');
}

const BASE_POSES = [
  {
    key:'front-walk-a',
    label:'Front walk A',
    prompt:[
      'FRONT view only. The character looks directly toward the camera.',
      'Walking pose A: the CHARACTER LEFT leg steps clearly forward toward the viewer while the character RIGHT leg trails behind.',
      'Character RIGHT arm swings forward and character LEFT arm swings back.',
      'Mild natural walking stride, not running or lunging.'
    ].join(' ')
  },
  {
    key:'front-idle',
    label:'Front idle',
    prompt:[
      'FRONT view only. The character looks directly toward the camera.',
      'Neutral symmetrical standing idle pose. Both feet rest naturally under the body with no walking stride.',
      'Arms relaxed in the character\'s normal idle position.'
    ].join(' ')
  },
  {
    key:'left-walk-a',
    label:'Left walk A',
    prompt:[
      'TRUE LEFT-FACING side profile only. Nose, chest, hips, knees and toes all point LEFT.',
      'Walking pose A: the LEG NEAREST THE VIEWER steps clearly forward toward the LEFT.',
      'The FAR LEG trails behind toward the RIGHT.',
      'The NEAR ARM swings back and the FAR ARM swings forward.',
      'Do not turn toward the camera. Do not face right.'
    ].join(' ')
  },
  {
    key:'left-idle',
    label:'Left idle',
    prompt:[
      'TRUE LEFT-FACING side profile only. Nose, chest, hips, knees and toes all point LEFT.',
      'Neutral standing idle pose with both feet close to the normal standing position.',
      'Do not turn toward the camera. Do not face right.'
    ].join(' ')
  },
  {
    key:'back-walk-a',
    label:'Back walk A',
    prompt:[
      'BACK view only. The character faces directly AWAY from the camera. Face and chest must not be visible.',
      'Walking pose A: the CHARACTER LEFT leg steps forward away from the viewer while the character RIGHT leg trails behind.',
      'Character RIGHT arm swings forward and character LEFT arm swings back.',
      'Mild natural walking stride, not running.'
    ].join(' ')
  },
  {
    key:'back-idle',
    label:'Back idle',
    prompt:[
      'BACK view only. The character faces directly AWAY from the camera. Face and chest must not be visible.',
      'Neutral symmetrical standing idle pose with both feet under the body.'
    ].join(' ')
  }
];

const OPPOSITE_POSES = [
  {
    key:'front-walk-b',
    sourceKey:'front-walk-a',
    label:'Front walk B',
    prompt:[
      'Keep the exact FRONT-facing direction from the attached Walk A pose.',
      'Change the gait to the OPPOSITE stride phase.',
      'The CHARACTER RIGHT leg must now step clearly forward toward the viewer and the CHARACTER LEFT leg must trail behind.',
      'Character LEFT arm swings forward and character RIGHT arm swings back.',
      'Do not mirror or reverse the whole character. Keep the head, torso, clothing and accessories facing exactly the same direction.'
    ].join(' ')
  },
  {
    key:'left-walk-b',
    sourceKey:'left-walk-a',
    label:'Left walk B',
    prompt:[
      'Keep the exact TRUE LEFT-FACING profile direction from the attached Walk A pose.',
      'Change the gait to the OPPOSITE stride phase.',
      'The LEG NEAREST THE VIEWER, which is forward in Walk A, must move clearly BEHIND the body toward the RIGHT.',
      'The FAR LEG must now step clearly FORWARD ahead of the body toward the LEFT.',
      'The NEAR ARM swings forward and the FAR ARM swings back.',
      'Do not mirror or reverse the whole character. The nose, chest, hips, knees and toes must still point LEFT.'
    ].join(' ')
  },
  {
    key:'back-walk-b',
    sourceKey:'back-walk-a',
    label:'Back walk B',
    prompt:[
      'Keep the exact BACK-facing direction from the attached Walk A pose.',
      'Change the gait to the OPPOSITE stride phase.',
      'The CHARACTER RIGHT leg must now step forward away from the viewer and the CHARACTER LEFT leg must trail behind.',
      'Character LEFT arm swings forward and character RIGHT arm swings back.',
      'Do not mirror or reverse the whole character. Keep the character facing directly away from the camera.'
    ].join(' ')
  }
];

const CONTROLLED_POSES = [...BASE_POSES, ...OPPOSITE_POSES];

function buildPosePrompt(pose) {
  const isOpposite=Boolean(pose.sourceKey);
  const atmStyle=$('style').value==='atm';
  return [
    isOpposite
      ? 'IMAGE 1 is the already-generated Walk A pose for this exact character and direction. EDIT that pose.'
      : 'IMAGE 1 is the user-uploaded character. Preserve this character\'s identity, design, colors, clothing, accessories, and defining features.',
    'IMAGE 2 is a REAL ATM TOWN in-game frame for the exact target direction and gait phase. Use Image 2 as the authoritative pose template: copy its facing direction, leg placement, arm swing, body orientation, stance, framing, sprite scale, and foot baseline. Do NOT copy the identity, clothing, colors, face, species, or accessories from Image 2.',
    atmStyle
      ? 'Also use IMAGE 2 as the authoritative ATM Town rendering-style reference. The output should look like it belongs beside that real ATM Town frame in the same game.'
      : 'Use IMAGE 2 for pose, gait, direction, scale, and framing only; keep the selected character-art guidance for rendering style.',
    'Create ONE single full-body game sprite pose, not a sprite sheet and not multiple characters.',
    isOpposite
      ? 'Keep the same character identity and camera direction from Image 1, but change the limbs to match the opposite gait phase shown in Image 2.'
      : 'Preserve the exact same character identity and design from Image 1 while adopting the pose shown in Image 2.',
    pose.prompt,
    'The leg positions in IMAGE 2 are mandatory. The output must not repeat the same forward leg as the opposite walking phase.',
    'Keep the entire character visible from head to feet with generous transparent padding.',
    'Center the character with feet on one consistent horizontal baseline.',
    'Fully transparent background. No scenery, floor, cast shadow, text, labels, borders, grid, props, duplicate people, or extra limbs.',
    'Do not invent or remove clothing or accessories from the user character.',
    styleGuidance(),
    'Prioritize pose anatomy, gait phase, facing direction, ATM Town scale, and silhouette accuracy over dramatic posing.',
    'Return only this one isolated character pose.'
  ].join('\n');
}

async function canvasToDataURL(canvas) {
  // WebP keeps the browser-to-function request much smaller than PNG while
  // retaining transparency when the background-removal option is used.
  const webp = canvas.toDataURL('image/webp', 0.9);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/png');
}

function imageFromBlob(blob) {
  return new Promise((resolve,reject) => {
    const url=URL.createObjectURL(blob);
    const img=new Image();
    img.onload=()=>{ URL.revokeObjectURL(url); resolve(img); };
    img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('GPT returned an image that could not be decoded.')); };
    img.src=url;
  });
}

function normalizePoseToCell(img) {
  const source=document.createElement('canvas');
  source.width=Math.max(1,img.naturalWidth);
  source.height=Math.max(1,img.naturalHeight);
  const sctx=source.getContext('2d',{willReadFrequently:true});
  sctx.drawImage(img,0,0);
  removeFlatEdgeColor(source);

  const b=alphaBounds(source);
  const scalePct=Number($('subjectScale').value)/100;
  const usableW=SPEC.fw*.86*scalePct;
  const usableH=(SPEC.anchorY-8)*scalePct;
  const scale=Math.min(usableW/b.w,usableH/b.h);
  const dw=b.w*scale;
  const dh=b.h*scale;

  const cell=document.createElement('canvas');
  cell.width=SPEC.fw;
  cell.height=SPEC.fh;
  const cctx=cell.getContext('2d');
  cctx.imageSmoothingEnabled=false;
  cctx.clearRect(0,0,SPEC.fw,SPEC.fh);
  cctx.drawImage(
    source,b.x,b.y,b.w,b.h,
    SPEC.anchorX-dw/2,SPEC.anchorY-dh,dw,dh
  );
  return cell;
}

function drawPoseCell(cell,row,col,mirror=false) {
  ctx.save();
  if(mirror){
    ctx.translate((col+1)*SPEC.fw,row*SPEC.fh);
    ctx.scale(-1,1);
    ctx.drawImage(cell,0,0,SPEC.fw,SPEC.fh);
  }else{
    ctx.drawImage(cell,col*SPEC.fw,row*SPEC.fh,SPEC.fw,SPEC.fh);
  }
  ctx.restore();
}

async function requestPose(imageDataUrl,pose) {
  const referenceDataUrl=await poseReferenceDataURL(pose);
  const response=await fetch('/api/generate-sprite',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      imageDataUrl,
      referenceDataUrl,
      prompt:buildPosePrompt(pose),
      poseKey:pose.key,
      characterName:cleanName(),
      quality:'medium'
    })
  });

  if(!response.ok){
    const data=await response.json().catch(()=>({}));
    throw new Error(data.error || (pose.label+' failed (HTTP '+response.status+')'));
  }

  const contentType=(response.headers.get('content-type') || '').toLowerCase();
  if(!contentType.startsWith('image/')) throw new Error(pose.label+' returned an unexpected response.');

  const blob=await response.blob();
  if(!blob.size) throw new Error(pose.label+' returned an empty image.');
  return imageFromBlob(blob);
}

function imageToPoseDataURL(img) {
  const max=768;
  const ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
  const c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(img.naturalWidth*ratio));
  c.height=Math.max(1,Math.round(img.naturalHeight*ratio));
  const cctx=c.getContext('2d');
  cctx.drawImage(img,0,0,c.width,c.height);
  const webp=c.toDataURL('image/webp',0.86);
  if(webp.startsWith('data:image/webp')) return webp;
  return c.toDataURL('image/png');
}

async function generatePoseList(list,sourceResolver,results,onComplete) {
  let cursor=0;
  const worker=async()=>{
    while(true){
      const index=cursor++;
      if(index>=list.length) return;
      const pose=list[index];
      const sourceDataUrl=await sourceResolver(pose,results);
      onComplete('working',pose);
      results[pose.key]=await requestPose(sourceDataUrl,pose);
      onComplete('complete',pose);
    }
  };
  await Promise.all([worker(),worker()]);
}

async function generateControlledPoses(originalImageDataUrl) {
  const results={};
  const total=CONTROLLED_POSES.length;
  let completed=0;
  const report=(phase,pose)=>{
    if(phase==='complete') completed+=1;
    const extra=phase==='working' ? ' Working on '+pose.label+'.' : '';
    setStatus('Generating controlled v3 poses… '+completed+'/'+total+' complete.'+extra);
  };

  await generatePoseList(
    BASE_POSES,
    async()=>originalImageDataUrl,
    results,
    report
  );

  // Walk B is an edit of its matching Walk A. This makes GPT explicitly swap
  // the stride on the same pose instead of inventing a second unrelated walk.
  await generatePoseList(
    OPPOSITE_POSES,
    async(pose,current)=>imageToPoseDataURL(current[pose.sourceKey]),
    results,
    report
  );

  return results;
}

function assembleControlledSheet(images) {
  const cells={};
  for(const pose of CONTROLLED_POSES){
    cells[pose.key]=normalizePoseToCell(images[pose.key]);
  }

  sheet.width=SPEC.sheetW;
  sheet.height=SPEC.sheetH;
  ctx.clearRect(0,0,SPEC.sheetW,SPEC.sheetH);
  ctx.imageSmoothingEnabled=false;

  // Row 1: front A, idle, and directly edited opposite-stride B.
  drawPoseCell(cells['front-walk-a'],0,0,false);
  drawPoseCell(cells['front-idle'],0,1,false);
  drawPoseCell(cells['front-walk-b'],0,2,false);

  // Row 2: left A, idle, and directly edited opposite-stride B.
  drawPoseCell(cells['left-walk-a'],1,0,false);
  drawPoseCell(cells['left-idle'],1,1,false);
  drawPoseCell(cells['left-walk-b'],1,2,false);

  // Row 3: back A, idle, and directly edited opposite-stride B.
  drawPoseCell(cells['back-walk-a'],2,0,false);
  drawPoseCell(cells['back-idle'],2,1,false);
  drawPoseCell(cells['back-walk-b'],2,2,false);

  // Row 4 is mirrored from the validated left-facing row so direction cannot drift.
  drawPoseCell(cells['left-walk-a'],3,0,true);
  drawPoseCell(cells['left-idle'],3,1,true);
  drawPoseCell(cells['left-walk-b'],3,2,true);

  generated=true;
  generationKind='gpt-controlled-v4';
  setDownloads(true);
  startAnimation();
  $('previewText').textContent='Controlled v4: real ATM Town pose/style references • walk preview 1→2→3→2.';
}

async function generateWithAi() {
  if(!sourceImage) return;
  $('generateAi').disabled=true;
  setDownloads(false);
  generated=false;
  clearAnimation();
  setStatus('Preparing controlled sprite generation…');

  try{
    const source=isolatedSource();
    const imageDataUrl=await canvasToDataURL(source);
    const images=await generateControlledPoses(imageDataUrl);
    setStatus('Assembling exact ATM Town gait and direction frames…');
    assembleControlledSheet(images);
    setStatus('Controlled v4 sheet complete. Every pose used the matching real ATM Town frame as its gait/style reference.','good');
  }catch(err){
    setStatus(err.message || 'GPT generation failed.','bad');
  }finally{
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
  const col=animAction==='idle'?1:WALK_SEQUENCE[animFrame%WALK_SEQUENCE.length];
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
    idleFrame:1,walkFrames:[0,1,2],walkSequence:[0,1,2,1],
    transparent:true,generationKind
  };
  download(new Blob([JSON.stringify(meta,null,2)],{type:'application/json'}),cleanName()+'.sprite.json');
});

drawGrid();
setDownloads(false);
refreshAiAvailability();
})();