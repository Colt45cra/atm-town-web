(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dirs = ['down','left','up','right'];
  const modeSpecs = {
    atm:{label:'ATM Town v235.13 exact',fw:256,fh:320,cols:3,rows:4,anchorX:128,anchorY:303,rowOrder:dirs,displayScale:.33,preferred:'webp'},
    classic128:{label:'128×128 mode',fw:128,fh:128,cols:3,rows:4,anchorX:64,anchorY:120,rowOrder:dirs,displayScale:1,preferred:'png'},
    general:{label:'General custom',fw:192,fh:256,cols:3,rows:4,anchorX:96,anchorY:245,rowOrder:dirs,displayScale:1,preferred:'png'}
  };
  let mode='atm', sourceImage=null, sourceDataURL='', sourceFile=null, generated=false, generationKind='none', aiImported=false, aiImage=null, raf=null, animTick=0, animAction='idle', animDir='down';
  const sheet=$('sheet'), sctx=sheet.getContext('2d',{willReadFrequently:true});
  const anim=$('anim'), actx=anim.getContext('2d');
  sctx.imageSmoothingEnabled=false; actx.imageSmoothingEnabled=false;

  function spec(){
    const base={...modeSpecs[mode]};
    if(mode==='general'){
      base.fw=Math.max(32,Math.min(1024,parseInt($('customW').value)||192));
      base.fh=Math.max(32,Math.min(1024,parseInt($('customH').value)||256));
      base.anchorX=Math.floor(base.fw/2); base.anchorY=Math.max(1,base.fh-17);
    }
    base.sheetW=base.fw*base.cols; base.sheetH=base.fh*base.rows;
    return base;
  }
  function cleanName(){return ($('charName').value||'character').trim().toLowerCase().replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,'')||'character'}
  function generationSize(){
    const s=spec();
    const h=1280;
    let w=Math.round(((s.cols*s.fw)/(s.rows*s.fh))*h/16)*16;
    w=Math.max(528,Math.min(2160,w));
    if(w*h<655360) w=Math.ceil((655360/h)/16)*16;
    return `${w}x${h}`;
  }
  function buildAiPrompt(){
    const s=spec(), style=$('charType').value;
    const exact=mode==='atm' ? `This is specifically for ATM Town. Final runtime frames are ${s.fw}x${s.fh}; final sheet is ${s.sheetW}x${s.sheetH}.` : `Target frame size is ${s.fw}x${s.fh}.`;
    return `Use the attached character image as the identity and design reference. Create a clean playable game sprite contact sheet for ${cleanName()}.\n\n${exact}\n\nSTRICT CONTACT SHEET LAYOUT:\n- exactly 3 columns and 4 rows, 12 cells total\n- row 1: DOWN\n- row 2: LEFT\n- row 3: UP / back view\n- row 4: RIGHT\n- column 1: walk A / left-foot phase\n- column 2: neutral IDLE\n- column 3: walk B / right-foot phase\n- no labels, no text, no borders, no grid lines, no scenery\n- transparent background\n- one full-body character in every cell\n- keep feet near the same baseline in every frame\n- leave comfortable transparent padding around the character; do not crop hair, ears, weapons, wings, tails, hands or feet\n- keep scale, proportions, clothing, colors, face and accessories consistent across all 12 cells\n- left and right views must be true directional views, not merely mirrored front poses when asymmetrical details matter\n- up row must clearly show the back of the character\n- walking poses should be subtle readable game-walk phases, not running or action poses\n\nART DIRECTION:\n- ${style}\n- fit ATM Town: crisp readable pixel-art / pixel-illustrated game character, strong silhouette, controlled dark outline, simple compact shading, no photorealism\n- preserve the uploaded character's identity and distinguishing details\n- no cast shadow under the character; alpha only outside the sprite\n\nReturn only the 3x4 sprite contact sheet image.`;
  }
  function updateAiPrompt(){if($('aiPrompt')) $('aiPrompt').value=buildAiPrompt()}
  function updateSpec(){
    const s=spec();
    $('spec').innerHTML=`<div class="pill"><b>${s.fw}×${s.fh}</b><span>frame</span></div><div class="pill"><b>${s.cols}×${s.rows}</b><span>grid</span></div><div class="pill"><b>${s.sheetW}×${s.sheetH}</b><span>sheet</span></div><div class="pill"><b>${s.anchorX}, ${s.anchorY}</b><span>foot anchor</span></div><div class="pill"><b>12</b><span>total frames</span></div><div class="pill"><b>${s.preferred.toUpperCase()}</b><span>preferred export</span></div>`;
    if(!generated){sheet.width=s.sheetW;sheet.height=s.sheetH;drawEmptyGrid();}
    updateAiPrompt(); validate();
  }
  function drawEmptyGrid(){
    const s=spec(); sctx.clearRect(0,0,sheet.width,sheet.height); sctx.save(); sctx.strokeStyle='rgba(88,241,230,.18)'; sctx.lineWidth=1;
    for(let x=1;x<s.cols;x++){sctx.beginPath();sctx.moveTo(x*s.fw,0);sctx.lineTo(x*s.fw,sheet.height);sctx.stroke()}
    for(let y=1;y<s.rows;y++){sctx.beginPath();sctx.moveTo(0,y*s.fh);sctx.lineTo(sheet.width,y*s.fh);sctx.stroke()}
    sctx.restore();
  }
  function setMode(next){
    mode=next; generated=false;
    document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    $('customSettings').classList.toggle('hidden',mode!=='general');
    updateSpec(); setDownloads(false); $('previewStatus').textContent='Generate a sprite to activate preview.'; clearAnim();
  }
  document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  ['customW','customH'].forEach(id=>$(id).addEventListener('input',()=>{generated=false;setDownloads(false);updateSpec()}));

  const drop=$('drop');
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')}));
  drop.addEventListener('drop',e=>{const f=e.dataTransfer.files?.[0];if(f)loadFile(f)});
  $('file').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)loadFile(f)});
  function loadFile(file){
    if(!file.type.startsWith('image/')) return alert('Please choose an image file.');
    sourceFile=file;
    const r=new FileReader(); r.onload=()=>{sourceDataURL=r.result;const img=new Image();img.onload=()=>{sourceImage=img;$('sourcePreview').src=sourceDataURL;$('sourcePreview').classList.remove('hidden');$('dropText').classList.add('hidden');$('generate').disabled=false;$('prepareChat').disabled=false;$('copyPrompt').disabled=false;syncAiMode();generated=false;generationKind='none';aiImported=false;setDownloads(false);updateAiPrompt();validate()};img.src=sourceDataURL};r.readAsDataURL(file);
  }
  $('removeBg').addEventListener('change',()=>$('bgControls').classList.toggle('hidden',!$('removeBg').checked));
  $('tolerance').addEventListener('input',()=>{$('tolVal').textContent=$('tolerance').value});

  function isolatedSource(){
    if(!sourceImage) return null;
    const max=1000, ratio=Math.min(1,max/Math.max(sourceImage.naturalWidth,sourceImage.naturalHeight));
    const w=Math.max(1,Math.round(sourceImage.naturalWidth*ratio)), h=Math.max(1,Math.round(sourceImage.naturalHeight*ratio));
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(sourceImage,0,0,w,h);
    if($('removeBg').checked){
      const im=x.getImageData(0,0,w,h),d=im.data,t=+$('tolerance').value;
      const pts=[[0,0],[w-1,0],[0,h-1],[w-1,h-1]];let rr=0,gg=0,bb=0,n=0;
      for(const [px,py] of pts){const i=(py*w+px)*4;if(d[i+3]>20){rr+=d[i];gg+=d[i+1];bb+=d[i+2];n++}}
      if(n){rr/=n;gg/=n;bb/=n;for(let i=0;i<d.length;i+=4){if(d[i+3]<5)continue;const dist=Math.hypot(d[i]-rr,d[i+1]-gg,d[i+2]-bb);if(dist<t){d[i+3]=0}else if(dist<t*1.7){d[i+3]=Math.round(d[i+3]*((dist-t)/(t*.7)))}}x.putImageData(im,0,0)}
    }
    return c;
  }
  function alphaBounds(c){
    const x=c.getContext('2d',{willReadFrequently:true}),im=x.getImageData(0,0,c.width,c.height).data;let minX=c.width,minY=c.height,maxX=-1,maxY=-1;
    for(let y=0;y<c.height;y+=2)for(let xx=0;xx<c.width;xx+=2){const a=im[(y*c.width+xx)*4+3];if(a>12){minX=Math.min(minX,xx);minY=Math.min(minY,y);maxX=Math.max(maxX,xx);maxY=Math.max(maxY,y)}}
    return maxX<0?{x:0,y:0,w:c.width,h:c.height}:{x:minX,y:minY,w:maxX-minX+2,h:maxY-minY+2};
  }
  function drawFrame(target,row,col,src,bounds,s){
    const ctx=target.getContext('2d');ctx.imageSmoothingEnabled=false;const ox=col*s.fw,oy=row*s.fh;
    const scalePct=+$('subjectScale').value/100;const usableW=s.fw*.82*scalePct, usableH=Math.max(10,(s.anchorY-8)*scalePct);
    let scale=Math.min(usableW/bounds.w,usableH/bounds.h); let dw=bounds.w*scale,dh=bounds.h*scale;
    let cx=ox+s.anchorX, foot=oy+s.anchorY;
    // Test-only directional simulation. AI generation replaces this in production.
    const dir=s.rowOrder[row]; let sx=1,skew=0,rot=0,alpha=1;
    if(dir==='left'){sx=.84;skew=-.055;cx-=s.fw*.025}
    if(dir==='right'){sx=.84;skew=.055;cx+=s.fw*.025}
    if(dir==='up'){sx=.94;alpha=.96}
    const step=col===0?-1:col===2?1:0; const bounce=col===1?0:Math.max(1,s.fh*.012); rot=step*(dir==='up'?-0.018:0.018);
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(cx,foot-bounce);ctx.rotate(rot);ctx.transform(sx,0,skew,1,0,0);
    if(dir==='right')ctx.scale(-1,1);
    // Up view is intentionally approximated; add subtle silhouette treatment rather than pretending it is true AI.
    if(dir==='up'){ctx.filter='brightness(.88) saturate(.92)'}
    ctx.drawImage(src,bounds.x,bounds.y,bounds.w,bounds.h,-dw/2,-dh,dw,dh);ctx.restore();
  }
  function generate(){
    if(!sourceImage)return; const s=spec();sheet.width=s.sheetW;sheet.height=s.sheetH;sctx.imageSmoothingEnabled=false;sctx.clearRect(0,0,sheet.width,sheet.height);
    const src=isolatedSource(), bounds=alphaBounds(src);
    for(let r=0;r<s.rows;r++)for(let c=0;c<s.cols;c++)drawFrame(sheet,r,c,src,bounds,s);
    generated=true;generationKind='local-simulation';aiImported=false;setDownloads(true);validate();startAnimation();$('previewStatus').textContent=`Previewing ${animAction==='idle'?'idle':animDir+' walk'} • frames ${animAction==='idle'?'1':'0 → 1 → 2'}`;
  }
  $('generate').addEventListener('click',generate);
  $('reset').addEventListener('click',()=>{sourceImage=null;sourceDataURL='';sourceFile=null;aiImage=null;aiImported=false;$('file').value='';$('aiResultFile').value='';$('sourcePreview').src='';$('sourcePreview').classList.add('hidden');$('dropText').classList.remove('hidden');$('generate').disabled=true;$('prepareChat').disabled=true;$('copyPrompt').disabled=true;$('generateApi').disabled=true;generated=false;generationKind='none';setDownloads(false);updateSpec();clearAnim();setAiStatus('Upload a character first.');validate()});

  function setAiStatus(text,kind=''){$('aiStatus').textContent=text;$('aiStatus').className='aiStatus'+(kind?' '+kind:'')}
  function syncAiMode(){
    const m=$('aiMode').value;
    $('apiSettings').classList.toggle('hidden',m!=='api');
    $('aiBadge').textContent='GPT Image';
    $('generateApi').disabled=!(sourceImage&&m==='api');
    $('prepareChat').disabled=!sourceImage || m!=='chat';
    setAiStatus(sourceImage?'Ready. Tap Generate Sprite Sheet with GPT.':'Upload a character first.');
  }
  $('aiMode').addEventListener('change',syncAiMode);
  $('charType').addEventListener('change',updateAiPrompt);
  $('charName').addEventListener('input',updateAiPrompt);
  $('subjectScale').addEventListener('input',updateAiPrompt);
  $('copyPrompt').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(buildAiPrompt());setAiStatus('AI prompt copied. Attach your character image in this chat and paste the prompt.','good')}
    catch{const t=$('aiPrompt');t.focus();t.select();document.execCommand('copy');setAiStatus('AI prompt copied.','good')}
  });
  async function canvasToFile(canvas,name){const blob=await canvasBlob(canvas,'image/png');return new File([blob],name,{type:'image/png'})}
  $('prepareChat').addEventListener('click',async()=>{
    if(!sourceImage)return;
    const src=isolatedSource(); const prompt=buildAiPrompt();
    let file;
    try{file=await canvasToFile(src,`${cleanName()}-chat-source.png`)}catch(e){setAiStatus('Could not prepare source image: '+e.message,'bad');return}
    try{await navigator.clipboard.writeText(prompt)}catch{}
    if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
      try{await navigator.share({title:'ATM Town Sprite Builder AI Request',text:prompt,files:[file]});setAiStatus('Shared the source and request. Generate the 3×4 contact sheet in this chat, save the result, then import it below.','good');return}catch(e){if(e.name==='AbortError')return}
    }
    dl(file,`${cleanName()}-chat-source.png`);
    setAiStatus('Prompt copied and source PNG saved. Upload that PNG into this ChatGPT conversation, paste the prompt, then import my generated result below.','good');
  });
  function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file)})}
  function imageFromDataURL(url){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Image could not be decoded'));i.src=url})}
  function conservativeFlatBgRemoval(c){
    const x=c.getContext('2d',{willReadFrequently:true}),w=c.width,h=c.height,im=x.getImageData(0,0,w,h),d=im.data;
    const coords=[[2,2],[w-3,2],[2,h-3],[w-3,h-3]]; const colors=[];
    for(const [px,py] of coords){const i=(Math.max(0,Math.min(h-1,py))*w+Math.max(0,Math.min(w-1,px)))*4;colors.push([d[i],d[i+1],d[i+2],d[i+3]])}
    if(colors.some(v=>v[3]<245)) return c;
    let rr=0,gg=0,bb=0;colors.forEach(v=>{rr+=v[0];gg+=v[1];bb+=v[2]});rr/=4;gg/=4;bb/=4;
    const spread=Math.max(...colors.map(v=>Math.hypot(v[0]-rr,v[1]-gg,v[2]-bb)));
    if(spread>28)return c;
    const t=25;
    for(let i=0;i<d.length;i+=4){const dist=Math.hypot(d[i]-rr,d[i+1]-gg,d[i+2]-bb);if(dist<t)d[i+3]=0;else if(dist<t*1.8)d[i+3]=Math.round(d[i+3]*((dist-t)/(t*.8)))}
    x.putImageData(im,0,0);return c;
  }
  function normalizeAiContactSheet(img){
    const s=spec(); sheet.width=s.sheetW;sheet.height=s.sheetH;sctx.clearRect(0,0,s.sheetW,s.sheetH);sctx.imageSmoothingEnabled=false;
    const cellW=img.naturalWidth/3,cellH=img.naturalHeight/4;
    for(let r=0;r<4;r++)for(let c=0;c<3;c++){
      const cw=Math.max(32,Math.round(cellW)),ch=Math.max(32,Math.round(cellH));
      const temp=document.createElement('canvas');temp.width=cw;temp.height=ch;const tx=temp.getContext('2d',{willReadFrequently:true});tx.drawImage(img,c*cellW,r*cellH,cellW,cellH,0,0,cw,ch);conservativeFlatBgRemoval(temp);
      const b=alphaBounds(temp);const scalePct=+$('subjectScale').value/100;const usableW=s.fw*.84*scalePct,usableH=Math.max(10,(s.anchorY-7)*scalePct);const sc=Math.min(usableW/b.w,usableH/b.h);const dw=b.w*sc,dh=b.h*sc;
      sctx.drawImage(temp,b.x,b.y,b.w,b.h,c*s.fw+s.anchorX-dw/2,r*s.fh+s.anchorY-dh,dw,dh);
    }
    generated=true;generationKind='ai-contact-sheet';aiImported=true;setDownloads(true);startAnimation();validate();$('previewStatus').textContent='AI sprite imported • normalized to exact frame anchors';setAiStatus(`AI contact sheet imported and normalized into ${s.sheetW}×${s.sheetH}. Check each direction in the animation preview.`, 'good');
  }
  $('aiResultFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/'))return setAiStatus('Choose an image file.','bad');try{const url=await fileToDataURL(f);aiImage=await imageFromDataURL(url);normalizeAiContactSheet(aiImage)}catch(err){setAiStatus('AI import failed: '+err.message,'bad')}});
  $('generateApi').addEventListener('click',async()=>{
    if(!sourceImage)return; const endpoint=$('apiEndpoint').value.trim()||'/api/generate-sprite';
    $('generateApi').disabled=true;setAiStatus('Sending source character to the hosted AI backend…');
    try{
      const src=isolatedSource();const imageDataUrl=src.toDataURL('image/png');
      const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageDataUrl,prompt:buildAiPrompt(),generationSize:generationSize(),quality:'low',mode,spec:spec()})});
      const data=await r.json().catch(()=>({})); if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`); if(!data.imageDataUrl)throw new Error('Backend returned no image');
      aiImage=await imageFromDataURL(data.imageDataUrl);normalizeAiContactSheet(aiImage);setAiStatus('AI generation complete. The returned contact sheet was normalized into the ATM Town runtime layout.','good');
    }catch(err){setAiStatus('GPT generation failed: '+err.message,'bad')}
    finally{$('generateApi').disabled=!(sourceImage&&$('aiMode').value==='api')}
  });
  function clearAnim(){if(raf)cancelAnimationFrame(raf);raf=null;actx.clearRect(0,0,anim.width,anim.height)}
  function startAnimation(){clearAnim();if(!generated)return;animTick=0;let last=0;const loop=t=>{if(!generated)return;const s=spec();if(t-last>(animAction==='idle'?600:145)){last=t;animTick++;drawAnim(s)}raf=requestAnimationFrame(loop)};drawAnim(spec());raf=requestAnimationFrame(loop)}
  function drawAnim(s){
    anim.width=s.fw;anim.height=s.fh;actx.imageSmoothingEnabled=false;actx.clearRect(0,0,anim.width,anim.height);
    const row=Math.max(0,s.rowOrder.indexOf(animDir));const frame=animAction==='idle'?1:(animTick%3);
    actx.drawImage(sheet,frame*s.fw,row*s.fh,s.fw,s.fh,0,0,s.fw,s.fh);
  }
  $('animButtons').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;animAction=b.dataset.action;animDir=b.dataset.dir;document.querySelectorAll('#animButtons .btn').forEach(x=>x.classList.toggle('active',x===b));if(generated){startAnimation();$('previewStatus').textContent=`Previewing ${animAction==='idle'?'idle':animDir+' walk'} • frames ${animAction==='idle'?'1':'0 → 1 → 2'}`}});

  function setDownloads(on){['downloadPng','downloadWebp','downloadThumb','downloadMeta'].forEach(id=>$(id).disabled=!on)}
  function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
  function canvasBlob(canvas,type,quality){return new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error('Export failed')),type,quality))}
  $('downloadPng').addEventListener('click',async()=>dl(await canvasBlob(sheet,'image/png'),`${cleanName()}-sprite-sheet.png`));
  $('downloadWebp').addEventListener('click',async()=>dl(await canvasBlob(sheet,'image/webp',1),`${cleanName()}-sprite-sheet.webp`));
  $('downloadThumb').addEventListener('click',async()=>{const s=spec(),c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');x.imageSmoothingEnabled=false;const srcSize=Math.min(s.fw,s.fh);const sx=s.fw+Math.max(0,(s.fw-srcSize)/2),sy=Math.max(0,(s.fh-srcSize)/2);x.drawImage(sheet,sx,sy,srcSize,srcSize,0,0,256,256);dl(await canvasBlob(c,'image/png'),`character-${cleanName()}.png`)});
  $('downloadMeta').addEventListener('click',()=>{const s=spec(),meta={name:cleanName(),builder:'ATM Town Creator Sprite Builder',mode,label:s.label,cols:s.cols,rows:s.rows,frameWidth:s.fw,frameHeight:s.fh,sheetWidth:s.sheetW,sheetHeight:s.sheetH,rowOrder:s.rowOrder,columnOrder:['walk-a','idle','walk-b'],idleFrame:1,walkFrames:[0,1,2],anchorX:s.anchorX,anchorY:s.anchorY,displayScale:s.displayScale,transparentBackground:true,generationKind,aiImported,productionNote:mode==='atm'?'ATM Town runtime currently references lossless WebP under assets/characters/playable/. Browser WebP export is a test encoder; production should use a lossless server encoder such as Sharp.':'Custom export.'};dl(new Blob([JSON.stringify(meta,null,2)],{type:'application/json'}),`${cleanName()}-sprite.json`)});

  function validate(){
    const s=spec(),items=[];
    items.push({k:sourceImage?'ok':'warn',t:sourceImage?'Source image loaded':'Upload a source image'});
    if(mode==='atm'){
      items.push({k:(s.fw===256&&s.fh===320&&s.sheetW===768&&s.sheetH===1280)?'ok':'bad',t:`ATM exact dimensions: ${s.fw}×${s.fh} frames / ${s.sheetW}×${s.sheetH} sheet`});
      items.push({k:JSON.stringify(s.rowOrder)===JSON.stringify(dirs)?'ok':'bad',t:'Row order: down → left → up → right'});
      items.push({k:s.anchorX===128&&s.anchorY===303?'ok':'bad',t:`Anchor: ${s.anchorX}, ${s.anchorY}`});
      items.push({k:'ok',t:'Column order: walk A → idle → walk B'});
    }else items.push({k:'ok',t:`Custom sheet: ${s.sheetW}×${s.sheetH}, 12 frames`});
    items.push({k:generated?'ok':'warn',t:generated?`Sprite sheet assembled (${generationKind})`:'Sprite has not been generated yet'});
    if(generationKind==='ai-contact-sheet') items.push({k:'ok',t:'AI contact sheet imported and normalized into the exact runtime grid'}); else if(generationKind==='local-simulation') items.push({k:'warn',t:'Local simulation is not true directional AI art; use Chat Test Mode or Hosted API Mode for real generated poses.'}); else items.push({k:'warn',t:'AI generation is ready but no AI result has been imported yet.'});
    $('validation').innerHTML=items.map(i=>`<div class="check ${i.k}"><span class="dot"></span><span>${i.t}</span></div>`).join('');
    $('debug').textContent=JSON.stringify({mode,...s,sourceLoaded:!!sourceImage,generated,generationKind,aiImported,aiMode:$('aiMode').value,generationSize:generationSize(),character:cleanName(),style:$('charType').value,backgroundRemoval:$('removeBg').checked,tolerance:+$('tolerance').value},null,2);
  }
  updateSpec();updateAiPrompt();syncAiMode();validate();
})();
