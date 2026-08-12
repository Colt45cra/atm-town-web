/* ===== v201: ATM Darts 301 + line-lock flick throwing ===== */
(()=>{
  const panel=document.getElementById('atmDartsPanel');
  const canvas=document.getElementById('atmDartsCanvas');
  const stage=panel.querySelector('.atmDartsStage');
  const ctx=canvas.getContext('2d');
  const ui={
    close:document.getElementById('atmDartsClose'),mode:document.getElementById('atmDartsMode'),left:document.getElementById('atmDartsLeft'),
    lobby:document.getElementById('atmDartsLobby'),status:document.getElementById('atmDartsLobbyStatus'),practice:document.getElementById('atmDartsPractice'),local:document.getElementById('atmDartsLocal'),online:document.getElementById('atmDartsOnline'),
    p1:document.getElementById('atmDartsP1'),p2:document.getElementById('atmDartsP2'),turn:document.getElementById('atmDartsTurn'),result:document.getElementById('atmDartsResult'),newMatch:document.getElementById('atmDartsNewMatch')
  };
  const SEGMENTS=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
  const state={open:false,mode:'lobby',match:null,seat:0,host:false,channel:null,openLobby:null,advertiseTimer:null,joiningId:'',pointerId:null,pointerMode:'',tapStart:null,flickStart:null,flickNow:null,precision:1,flight:null,awaiting:false,last:0,viewW:800,viewH:700,aimFrame:0,guideStage:'dual',lockX:0,lockY:0,sweepX:0,sweepY:0,dirX:1,dirY:1,aimPointerId:null,throwPointerId:null,aimHeld:false,aimScreenStart:null,aimScreenNow:null,aimStartBase:{x:0,y:0},aimX:0,aimY:0,aimVisualX:0,aimVisualY:0,aimMoveSpeed:0,aimSwayTime:0};
  const stableGuestId=(()=>{try{const key='atm_darts_guest_id';let id=sessionStorage.getItem(key);if(!id){id='dart-'+Math.random().toString(36).slice(2,10);sessionStorage.setItem(key,id);}return id;}catch(_e){return 'dart-'+Math.random().toString(36).slice(2,10);}})();

  function myId(){return (typeof playerId!=='undefined'&&playerId)||stableGuestId;}
  function myName(){return ((typeof playerName!=='undefined'&&playerName)||document.getElementById('displayName')?.value||'Guest').trim().slice(0,24)||'Guest';}
  function onlineAvailable(){return typeof onlineMode!=='undefined'&&onlineMode&&typeof supabaseClient!=='undefined'&&supabaseClient&&typeof roomName!=='undefined'&&roomName;}
  function cloneMatch(match){return match?JSON.parse(JSON.stringify(match)):null;}
  function newPlayer(id,name){return{id,name,score:301};}
  function createMatch(players,mode,matchId='local-'+Date.now()){
    return{id:matchId,mode,status:players.length===1||mode!=='online'?'playing':'waiting',players,current:0,dartsInTurn:0,turnStartScore:301,dartsOnBoard:[],winner:null,lastCall:'',updatedAt:Date.now()};
  }
  function boardScore(nx,ny){
    const r=Math.hypot(nx,ny);if(r>1)return{score:0,label:'MISS',base:0,mult:0};
    if(r<.045)return{score:50,label:'INNER BULL',base:25,mult:2};
    if(r<.105)return{score:25,label:'OUTER BULL',base:25,mult:1};
    let angle=Math.atan2(nx,-ny);if(angle<0)angle+=Math.PI*2;
    const seg=Math.floor((angle+Math.PI/20)/(Math.PI/10))%20,base=SEGMENTS[seg];
    if(r>=.88)return{score:base*2,label:'DOUBLE '+base,base,mult:2};
    if(r>=.80)return{score:base,label:String(base),base,mult:1};
    if(r>=.50&&r<.58)return{score:base*3,label:'TRIPLE '+base,base,mult:3};
    return{score:base,label:String(base),base,mult:1};
  }
  function isMyTurn(){
    if(!state.match||state.match.status!=='playing'||state.match.winner)return false;
    if(state.mode==='practice'||state.mode==='local')return true;
    return state.match.current===state.seat;
  }
  function canThrow(){return state.open&&isMyTurn()&&!state.awaiting&&!state.flight;}
  function setLobbyStatus(message){ui.status.textContent=message;}
  function showLobby(message='Hold one finger to aim, drag to move the crosshairs, then flick upward with a second finger to throw. Hard flicks fly flatter; soft flicks drop lower.'){
    state.mode='lobby';state.match=null;state.host=false;state.seat=0;state.awaiting=false;state.flight=null;resetThrowController(true);ui.lobby.classList.remove('hidden');setLobbyStatus(message);updateOnlineButton();renderUI();render();
  }
  function hideLobby(){ui.lobby.classList.add('hidden');}
  function updateOnlineButton(){
    if(!onlineAvailable()){ui.online.disabled=true;ui.online.textContent='CONNECT ONLINE FIRST';return;}
    ui.online.disabled=false;
    const open=state.openLobby&&Date.now()-state.openLobby.seenAt<6000;
    ui.online.textContent=open?'JOIN '+String(state.openLobby.hostName||'OPEN MATCH').toUpperCase():'HOST ONLINE MATCH';
  }
  function startPractice(){state.mode='practice';state.host=true;state.seat=0;state.match=createMatch([newPlayer(myId(),myName())],'practice');resetThrowController(true);hideLobby();renderUI();render();}
  function startLocal(){const name2=(window.prompt('Second player name:','Player 2')||'Player 2').trim().slice(0,24)||'Player 2';state.mode='local';state.host=true;state.seat=0;state.match=createMatch([newPlayer(myId(),myName()),newPlayer('local-p2',name2)],'local');resetThrowController(true);hideLobby();renderUI();render();}

  async function ensureChannel(){
    if(!onlineAvailable())return false;if(state.channel)return true;
    const channel=supabaseClient.channel('atm-darts:'+roomName,{config:{broadcast:{self:true}}});state.channel=channel;
    channel.on('broadcast',{event:'match-open'},({payload})=>{if(!payload||payload.hostId===myId())return;state.openLobby={...payload,seenAt:Date.now()};updateOnlineButton();});
    channel.on('broadcast',{event:'discover'},()=>{if(state.host&&state.match?.status==='waiting')broadcastOpen();});
    channel.on('broadcast',{event:'join-request'},({payload})=>{
      if(!state.host||!state.match||state.match.status!=='waiting'||payload?.matchId!==state.match.id||state.match.players[1])return;
      state.match.players[1]=newPlayer(payload.playerId,payload.playerName);state.match.status='playing';state.match.updatedAt=Date.now();sendState();hideLobby();renderUI();render();
    });
    channel.on('broadcast',{event:'match-state'},({payload})=>{
      if(!payload?.match)return;const incoming=payload.match;
      const relevant=state.match?.id===incoming.id||state.joiningId===incoming.id||incoming.players?.some(p=>p.id===myId());if(!relevant)return;
      state.match=cloneMatch(incoming);state.mode='online';state.host=payload.hostId===myId();state.seat=Math.max(0,state.match.players.findIndex(p=>p.id===myId()));state.awaiting=false;state.joiningId='';resetThrowController();hideLobby();renderUI();render();
    });
    channel.on('broadcast',{event:'throw-request'},({payload})=>{if(!state.host||!state.match||payload?.matchId!==state.match.id)return;const seat=state.match.players.findIndex(p=>p.id===payload.playerId);if(seat!==state.match.current)return;applyThrow(payload.x,payload.y);sendState();});
    channel.on('broadcast',{event:'match-close'},({payload})=>{if(state.match?.id===payload?.matchId)showLobby('The online match ended.');});
    await new Promise(resolve=>{let done=false;channel.subscribe(status=>{if(!done&&(status==='SUBSCRIBED'||status==='CHANNEL_ERROR'||status==='TIMED_OUT')){done=true;resolve();}});setTimeout(()=>{if(!done){done=true;resolve();}},2200);});
    channel.send({type:'broadcast',event:'discover',payload:{playerId:myId()}});return true;
  }
  function broadcastOpen(){if(!state.channel||!state.match)return;state.channel.send({type:'broadcast',event:'match-open',payload:{matchId:state.match.id,hostId:myId(),hostName:myName()}});}
  function sendState(){if(!state.channel||!state.match)return;state.match.updatedAt=Date.now();state.channel.send({type:'broadcast',event:'match-state',payload:{match:cloneMatch(state.match),hostId:myId()}});}
  async function onlineMatch(){
    if(!await ensureChannel()){setLobbyStatus('Connect to ATM Town multiplayer first.');return;}
    const open=state.openLobby&&Date.now()-state.openLobby.seenAt<6000?state.openLobby:null;
    state.mode='online';
    if(open){state.host=false;state.seat=1;state.joiningId=open.matchId;setLobbyStatus('Joining '+open.hostName+'…');state.channel.send({type:'broadcast',event:'join-request',payload:{matchId:open.matchId,playerId:myId(),playerName:myName()}});return;}
    state.host=true;state.seat=0;state.match=createMatch([newPlayer(myId(),myName()),null],'online','darts-'+Date.now()+'-'+Math.random().toString(36).slice(2,6));state.match.players=[state.match.players[0]];state.match.status='waiting';setLobbyStatus('Match hosted. Waiting for a second Lounge player…');broadcastOpen();clearInterval(state.advertiseTimer);state.advertiseTimer=setInterval(()=>{if(state.host&&state.match?.status==='waiting')broadcastOpen();},1500);
  }

  function endTurn(){
    const count=state.match.players.length;if(count<=1){state.match.current=0;}else state.match.current=(state.match.current+1)%count;
    state.match.dartsInTurn=0;state.match.turnStartScore=state.match.players[state.match.current].score;state.match.dartsOnBoard=[];
  }
  function applyThrow(x,y){
    const match=state.match;if(!match||match.status!=='playing'||match.winner)return;
    const player=match.players[match.current];if(!player)return;
    if(match.dartsInTurn===0)match.turnStartScore=player.score;
    const hit=boardScore(x,y);const next=player.score-hit.score;match.dartsOnBoard.push({x,y,score:hit.score,seat:match.current});match.lastCall=hit.label+' · '+hit.score;
    if(next===0){player.score=0;match.winner=match.current;match.status='finished';match.lastCall=player.name+' WINS · '+hit.label;}
    else if(next<0){player.score=match.turnStartScore;match.lastCall='BUST · '+hit.label;endTurn();}
    else{player.score=next;match.dartsInTurn++;if(match.dartsInTurn>=3)endTurn();}
    match.updatedAt=Date.now();state.awaiting=false;resetThrowController();renderUI();render();
  }
  function submitThrow(x,y){
    if(state.mode==='online'){
      state.awaiting=true;
      if(state.host){applyThrow(x,y);sendState();}
      else state.channel?.send({type:'broadcast',event:'throw-request',payload:{matchId:state.match.id,playerId:myId(),x,y}});
    }else applyThrow(x,y);
  }

  function resize(){
    const rect=stage.getBoundingClientRect(),dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));state.viewW=Math.max(320,rect.width);state.viewH=Math.max(320,rect.height);
    const w=Math.max(1,Math.round(state.viewW*dpr)),h=Math.max(1,Math.round(state.viewH*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}render();
  }
  function boardGeometry(){const w=state.viewW,h=state.viewH,r=Math.min(w*.42,h*.43),cx=w/2,cy=h*.49;return{cx,cy,r};}
  function clampAim(x,y,maxRadius=1.18){const mag=Math.hypot(x,y);if(mag>maxRadius&&mag>0){const s=maxRadius/mag;return{x:x*s,y:y*s};}return{x,y};}
  function boardPointFromEvent(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*(state.viewW/rect.width),y:(event.clientY-rect.top)*(state.viewH/rect.height),t:performance.now()};}
  function boardNormFromScreenPoint(pt){const g=boardGeometry();return{x:(pt.x-g.cx)/g.r,y:(pt.y-g.cy)/g.r};}
  function pointHitsBoard(pt,pad=.14){const n=boardNormFromScreenPoint(pt);return Math.hypot(n.x,n.y)<=1+pad;}
  function resetThrowController(resetSweep=false){
    state.pointerId=null;state.pointerMode='';state.tapStart=null;state.flickStart=null;state.flickNow=null;state.guideStage='dual';state.lockX=0;state.lockY=0;
    state.aimPointerId=null;state.throwPointerId=null;state.aimHeld=false;state.aimScreenStart=null;state.aimScreenNow=null;state.aimStartBase={x:0,y:0};
    state.aimX=0;state.aimY=0;state.aimVisualX=0;state.aimVisualY=0;state.aimMoveSpeed=0;state.aimSwayTime=0;
  }
  function getThrowInstruction(){
    if(!state.aimHeld)return 'STEP 1 · HOLD 1ST FINGER TO AIM';
    if(state.throwPointerId===null&&!state.flight)return 'STEP 2 · KEEP HOLDING AIM · FLICK WITH 2ND FINGER';
    return 'STEP 3 · FLICK UP WITH 2ND FINGER';
  }
  function computeFlickPreview(from,to,dtMs){
    const dx=to.x-from.x,dy=to.y-from.y,upward=Math.max(0,-dy),distance=Math.hypot(dx,dy),dt=Math.max(18,dtMs||16),speed=distance/(dt/1000);
    const strength=Math.max(0,Math.min(1,(upward/240)*.58+(Math.min(speed,2200)/2200)*.42));
    const straightness=Math.max(0,Math.min(1,upward/(upward+Math.abs(dx)+1)));
    const side=Math.max(-1,Math.min(1,dx/150));
    const aimX=state.aimHeld?state.aimVisualX:state.aimX;
    const aimY=state.aimHeld?state.aimVisualY:state.aimY;
    let finalX=aimX+side*(.12+(1-straightness)*.16);
    let drop=(1-strength)*.30+(1-straightness)*.12+Math.abs(side)*.04;
    if(strength>.92)drop-=.035;
    drop+=Math.min(.05,(state.aimMoveSpeed||0)/2600*.04);
    const clamped=clampAim(finalX,aimY+drop,1.02);
    return{dx,dy,upward,distance,dt,speed,strength,straightness,side,quality:(strength*.58+straightness*.42),x:clamped.x,y:clamped.y};
  }
  function updateAimFromPoint(pt){
    const g=boardGeometry();
    if(!state.aimScreenStart){state.aimScreenStart=pt;state.aimScreenNow=pt;state.aimStartBase={x:state.aimX,y:state.aimY};}
    const prev=state.aimScreenNow||pt;const dt=Math.max(8,pt.t-(prev.t||pt.t));
    const dx=pt.x-state.aimScreenStart.x,dy=pt.y-state.aimScreenStart.y;
    const next=clampAim((state.aimStartBase?.x||0)+dx/g.r,(state.aimStartBase?.y||0)+dy/g.r,.95);
    state.aimX=next.x;state.aimY=next.y;state.lockX=next.x;state.lockY=next.y;
    const movePx=Math.hypot(pt.x-(prev.x||pt.x),pt.y-(prev.y||pt.y));
    state.aimMoveSpeed=movePx/(dt/1000);state.aimScreenNow=pt;
  }
  function stopAimAnimation(){if(state.aimFrame){cancelAnimationFrame(state.aimFrame);state.aimFrame=0;}}
  function startAimAnimation(){
    stopAimAnimation();state.last=0;
    const tick=now=>{
      if(!state.open){state.aimFrame=0;return;}
      const dt=Math.min(.05,Math.max(.001,state.last?((now-state.last)/1000):.016));state.last=now;
      if(canThrow()&&!state.flight){
        if(state.aimHeld){
          state.aimSwayTime+=dt;
          const moveFactor=Math.min(1,(state.aimMoveSpeed||0)/900);
          const amp=.015+moveFactor*.04;
          const swayX=Math.sin(state.aimSwayTime*7.3+state.aimY*5.1)*amp+Math.cos(state.aimSwayTime*13.1)*amp*.35;
          const swayY=Math.cos(state.aimSwayTime*8.4+state.aimX*4.7)*amp+Math.sin(state.aimSwayTime*11.2)*amp*.28;
          const visual=clampAim(state.aimX+swayX,state.aimY+swayY,.96);
          state.aimVisualX=visual.x;state.aimVisualY=visual.y;state.lockX=visual.x;state.lockY=visual.y;
          state.aimMoveSpeed*=0.92;
        }else{
          state.aimVisualX=state.aimX;state.aimVisualY=state.aimY;state.lockX=state.aimX;state.lockY=state.aimY;
        }
      }
      if(state.flight){state.flight.t+=dt;if(state.flight.t>=state.flight.duration){const{x,y}=state.flight;state.flight=null;submitThrow(x,y);}}
      render();state.aimFrame=requestAnimationFrame(tick);
    };
    state.aimFrame=requestAnimationFrame(tick);
  }
  function beginAimPointer(event){
    const pt=boardPointFromEvent(event);state.aimPointerId=event.pointerId;state.pointerId=event.pointerId;state.pointerMode='aim';state.aimHeld=true;
    state.aimScreenStart=pt;state.aimScreenNow=pt;state.aimStartBase={x:0,y:0};state.aimX=0;state.aimY=0;state.aimVisualX=0;state.aimVisualY=0;state.aimMoveSpeed=0;state.aimSwayTime=0;
    try{canvas.setPointerCapture(event.pointerId);}catch(_e){}
  }
  function beginFlick(event){state.throwPointerId=event.pointerId;state.pointerMode='flick';state.flickStart=boardPointFromEvent(event);state.flickNow=state.flickStart;try{canvas.setPointerCapture(event.pointerId);}catch(_e){}}
  function endAimPointer(cancelThrow=true){
    state.aimPointerId=null;state.pointerId=null;state.aimHeld=false;state.aimScreenStart=null;state.aimScreenNow=null;state.aimStartBase={x:0,y:0};state.aimMoveSpeed=0;state.aimSwayTime=0;
    state.aimX=0;state.aimY=0;state.aimVisualX=0;state.aimVisualY=0;state.lockX=0;state.lockY=0;
    if(cancelThrow&&state.throwPointerId!==null){state.throwPointerId=null;state.flickStart=null;state.flickNow=null;state.pointerMode='';}
  }
  function finishFlick(event){
    const end=boardPointFromEvent(event),start=state.flickStart||end,preview=computeFlickPreview(start,end,end.t-start.t);
    if(preview.upward<34||preview.distance<42){ui.result.textContent='FLICK UP WITH THE 2ND FINGER';state.pointerMode='';state.throwPointerId=null;state.flickStart=null;state.flickNow=null;render();return;}
    state.precision=preview.quality;
    state.flight={x:preview.x,y:preview.y,t:0,duration:.48-preview.strength*.16,hit:boardScore(preview.x,preview.y),quality:preview.quality,strength:preview.strength,straightness:preview.straightness};
    state.pointerMode='';state.throwPointerId=null;state.flickStart=null;state.flickNow=null;
  }
  function drawCrosshair(x,y,r){
    ctx.save();ctx.translate(x,y);
    ctx.strokeStyle='rgba(255,209,102,.96)';ctx.lineWidth=2.4;
    ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(88,241,230,.95)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(-6,0);ctx.moveTo(6,0);ctx.lineTo(16,0);ctx.moveTo(0,-16);ctx.lineTo(0,-6);ctx.moveTo(0,6);ctx.lineTo(0,16);ctx.stroke();
    ctx.fillStyle='rgba(255,209,102,.9)';ctx.beginPath();ctx.arc(0,0,2.5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function drawBoard(){
    const{cx,cy,r}=boardGeometry();ctx.save();ctx.translate(cx,cy);
    ctx.fillStyle='rgba(0,0,0,.38)';ctx.beginPath();ctx.ellipse(0,r*.15,r*1.16,r*1.05,0,0,Math.PI*2);ctx.fill();
    const segAngle=Math.PI*2/20;
    const rings=[{inner:.58,outer:.80,type:'singleOuter'},{inner:.50,outer:.58,type:'triple'},{inner:.105,outer:.50,type:'singleInner'},{inner:.80,outer:.88,type:'double'}];
    for(let i=0;i<20;i++){
      const start=-Math.PI/2-segAngle/2+i*segAngle,end=start+segAngle,light=i%2===0;
      for(const ring of rings){
        let fill;if(ring.type==='triple'||ring.type==='double')fill=light?'#d64b4f':'#27a16b';else fill=light?'#e7dfc7':'#17191b';
        ctx.beginPath();ctx.arc(0,0,r*ring.outer,start,end);ctx.arc(0,0,r*ring.inner,end,start,true);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
      }
      const mid=start+segAngle/2;ctx.save();ctx.rotate(mid+Math.PI/2);ctx.fillStyle='#f4f7f8';ctx.font=`900 ${Math.max(10,r*.065)}px system-ui`;ctx.textAlign='center';ctx.fillText(String(SEGMENTS[i]),0,-r*.94);ctx.restore();
    }
    ctx.beginPath();ctx.arc(0,0,r*.105,0,Math.PI*2);ctx.fillStyle='#27a16b';ctx.fill();ctx.beginPath();ctx.arc(0,0,r*.045,0,Math.PI*2);ctx.fillStyle='#d64b4f';ctx.fill();
    ctx.strokeStyle='#748a91';ctx.lineWidth=Math.max(1,r*.006);for(const rr of[.105,.50,.58,.80,.88]){ctx.beginPath();ctx.arc(0,0,r*rr,0,Math.PI*2);ctx.stroke();}for(let i=0;i<20;i++){const a=-Math.PI/2-segAngle/2+i*segAngle;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.105,Math.sin(a)*r*.105);ctx.lineTo(Math.cos(a)*r*.88,Math.sin(a)*r*.88);ctx.stroke();}
    const darts=state.match?.dartsOnBoard||[];for(const dart of darts)drawPin(dart.x*r,dart.y*r,dart.seat);
    if(state.flight){const p=Math.min(1,state.flight.t/state.flight.duration),ease=1-Math.pow(1-p,3),sx=0,sy=r*1.1,tx=state.flight.x*r,ty=state.flight.y*r;drawDart(sx+(tx-sx)*ease,sy+(ty-sy)*ease,state.match?.current||0,p);}
    if(canThrow()&&!state.flight){
      if(state.aimHeld){
        drawCrosshair(state.aimVisualX*r,state.aimVisualY*r,r);
        if(state.flickStart&&state.flickNow){
          const preview=computeFlickPreview(state.flickStart,state.flickNow,state.flickNow.t-state.flickStart.t);
          ctx.fillStyle='rgba(255,209,102,.18)';ctx.beginPath();ctx.arc(preview.x*r,preview.y*r,15,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='rgba(255,209,102,.75)';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(state.aimVisualX*r,state.aimVisualY*r);ctx.lineTo(preview.x*r,preview.y*r);ctx.stroke();ctx.setLineDash([]);
          ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(preview.x*r,preview.y*r,5,0,Math.PI*2);ctx.fill();
        }
      }
      ctx.fillStyle='rgba(3,15,22,.74)';ctx.fillRect(-r*.74,-r*1.12,r*1.48,20);ctx.fillStyle='#f2fbff';ctx.font='800 11px system-ui';ctx.textAlign='center';ctx.fillText(getThrowInstruction(),0,-r*1.02);
    }
    ctx.restore();drawThrowGuide();
  }
  function drawPin(x,y,seat){ctx.save();ctx.translate(x,y);ctx.rotate(-.55);ctx.strokeStyle=seat===0?'#58f1e6':'#ff77bd';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-20,0);ctx.lineTo(0,0);ctx.stroke();ctx.fillStyle=seat===0?'#58f1e6':'#ff77bd';ctx.beginPath();ctx.moveTo(-25,-5);ctx.lineTo(-16,0);ctx.lineTo(-25,5);ctx.closePath();ctx.fill();ctx.fillStyle='#e9f7fa';ctx.beginPath();ctx.arc(1,0,3,0,Math.PI*2);ctx.fill();ctx.restore();}
  function drawDart(x,y,seat,p){ctx.save();ctx.translate(x,y);ctx.rotate(-.65);ctx.globalAlpha=.55+.45*p;ctx.strokeStyle=seat===0?'#58f1e6':'#ff77bd';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-25,0);ctx.lineTo(3,0);ctx.stroke();ctx.fillStyle='#f4fbff';ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(0,-3);ctx.lineTo(0,3);ctx.closePath();ctx.fill();ctx.restore();}
  function drawThrowGuide(){
    if(!canThrow()||state.flight)return;const w=Math.min(380,state.viewW*.72),x=(state.viewW-w)/2,y=state.viewH-48;
    ctx.fillStyle='rgba(3,15,22,.84)';ctx.fillRect(x,y,w,28);ctx.strokeStyle='rgba(255,255,255,.18)';ctx.strokeRect(x,y,w,28);ctx.fillStyle='#f4fbff';ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillText(getThrowInstruction(),state.viewW/2,y+11);
    if(state.aimHeld&&state.flickStart&&state.flickNow){
      const preview=computeFlickPreview(state.flickStart,state.flickNow,state.flickNow.t-state.flickStart.t);ctx.fillStyle='rgba(88,241,230,.18)';ctx.fillRect(x+10,y+16,w-20,8);
      ctx.fillStyle='#58f1e6';ctx.fillRect(x+10,y+16,(w-20)*preview.strength,8);ctx.fillStyle='#ffd166';ctx.fillText('POWER '+Math.round(preview.strength*100)+'% · STRAIGHT '+Math.round(preview.straightness*100)+'%',state.viewW/2,y+38);
    }else{ctx.fillStyle='#9fc3cc';ctx.fillText(!state.aimHeld?'HOLD ONE FINGER ANYWHERE TO AIM':'KEEP HOLDING AIM · FLICK A SECOND FINGER UPWARD',state.viewW/2,y+38);}
  }
  function render(){
    if(!state.open)return;const dpr=canvas.width/state.viewW;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,state.viewW,state.viewH);const bg=ctx.createRadialGradient(state.viewW/2,state.viewH*.5,10,state.viewW/2,state.viewH*.5,Math.max(state.viewW,state.viewH));bg.addColorStop(0,'#17313a');bg.addColorStop(1,'#020810');ctx.fillStyle=bg;ctx.fillRect(0,0,state.viewW,state.viewH);drawBoard();ctx.setTransform(1,0,0,1,0,0);
  }
  function renderPlayerCard(node,index){const player=state.match?.players?.[index];node.classList.toggle('active',!!player&&state.match?.current===index&&state.match?.status==='playing');node.querySelector('span').textContent=index===0?'PLAYER 1':'PLAYER 2';node.querySelector('strong').textContent=player?String(player.score):'---';node.querySelector('small').textContent=player?.name||(state.mode==='online'&&index===1?'Waiting for opponent':'Not in match');}
  function renderUI(){
    const match=state.match;
    if(state.open){
      const session=state.mode==='online'&&match?.id?match.id:state.mode==='practice'?`practice-${myId()}`:state.mode==='local'?`local-${myId()}`:'lobby';
      const label=state.mode==='online'&&match?.id?'DARTS MATCH VOICE':state.mode==='practice'?'DARTS PRACTICE VOICE':state.mode==='local'?'LOCAL DARTS VOICE':'DARTS LOBBY VOICE';
      window.atmVoiceEnterGameZone?.('darts',label,'lounge',session);
    }
    ui.mode.textContent=state.mode==='practice'?'PRACTICE':state.mode==='local'?'LOCAL 2P':state.mode==='online'?'ONLINE':'LOBBY';ui.left.textContent=match?.status==='playing'?String(Math.max(0,3-(match.dartsInTurn||0))):'3';renderPlayerCard(ui.p1,0);renderPlayerCard(ui.p2,1);
    if(!match){ui.turn.textContent='CHOOSE A MODE';ui.result.textContent='HOLD TO AIM · FLICK 2ND FINGER';return;}
    if(match.winner!==null&&match.winner!==undefined){ui.turn.textContent=(match.players[match.winner]?.name||'PLAYER')+' WINS';ui.result.textContent=match.lastCall||'MATCH COMPLETE';}
    else if(match.status==='waiting'){ui.turn.textContent='WAITING FOR PLAYER 2';ui.result.textContent='KEEP THIS MATCH OPEN';}
    else{const active=match.players[match.current];ui.turn.textContent=(active?.name||'PLAYER')+' TO THROW';ui.result.textContent=match.lastCall||(isMyTurn()?getThrowInstruction():'WAIT FOR YOUR TURN');}
  }

  function open(){
    if(state.open)return;state.open=true;dialogOpen=true;joy.x=joy.y=0;knob.style.transform='translate(0,0)';if(jumpState?.active)jumpState.active=false;if(jetpackState?.active)endJetpack();window.atmVoiceEnterGameZone?.('darts','DARTS LOBBY VOICE','lounge','lobby');document.body.classList.add('atm-darts-open');panel.classList.add('open');panel.setAttribute('aria-hidden','false');resetThrowController(true);showLobby();resize();startAimAnimation();ensureChannel().then(updateOnlineButton);
  }
  function close(){
    if(!state.open)return;if(state.mode==='online'&&state.channel&&state.match)state.channel.send({type:'broadcast',event:'match-close',payload:{matchId:state.match.id,playerId:myId()}});clearInterval(state.advertiseTimer);state.advertiseTimer=null;if(state.channel&&typeof supabaseClient!=='undefined'&&supabaseClient){try{supabaseClient.removeChannel(state.channel);}catch(_e){}}state.channel=null;window.atmVoiceExitGameZone?.('darts');state.open=false;state.pointerId=null;state.pointerMode='';stopAimAnimation();state.flight=null;state.match=null;dialogOpen=false;document.body.classList.remove('atm-darts-open');panel.classList.remove('open');panel.setAttribute('aria-hidden','true');
  }
  window.openATMDarts=open;

  canvas.addEventListener('pointerdown',event=>{
    if(!canThrow())return;if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();
    if(state.aimPointerId===null){beginAimPointer(event);renderUI();render();return;}
    if(state.aimPointerId!==event.pointerId&&state.throwPointerId===null&&state.aimHeld){beginFlick(event);renderUI();render();}
  },{passive:false});
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerId===state.aimPointerId){event.preventDefault();updateAimFromPoint(boardPointFromEvent(event));render();}
    else if(event.pointerId===state.throwPointerId){event.preventDefault();state.flickNow=boardPointFromEvent(event);render();}
  },{passive:false});
  canvas.addEventListener('pointerup',event=>{
    if(event.pointerId===state.throwPointerId){event.preventDefault();try{canvas.releasePointerCapture(event.pointerId);}catch(_e){}finishFlick(event);renderUI();render();return;}
    if(event.pointerId===state.aimPointerId){event.preventDefault();try{canvas.releasePointerCapture(event.pointerId);}catch(_e){}endAimPointer(true);renderUI();render();}
  },{passive:false});
  canvas.addEventListener('pointercancel',event=>{
    if(event.pointerId===state.throwPointerId){state.throwPointerId=null;state.flickStart=null;state.flickNow=null;renderUI();render();return;}
    if(event.pointerId===state.aimPointerId){endAimPointer(true);renderUI();render();}
  });
  ui.practice.addEventListener('click',startPractice);ui.local.addEventListener('click',startLocal);ui.online.addEventListener('click',onlineMatch);ui.newMatch.addEventListener('click',()=>showLobby('Choose how you want to play the next 301 match.'));ui.close.addEventListener('click',close);panel.addEventListener('pointerdown',event=>{if(event.target===panel)close();});window.addEventListener('resize',()=>{if(state.open)resize();},{passive:true});window.addEventListener('keydown',event=>{if(!state.open)return;if(event.key==='Escape'){event.preventDefault();close();}});
})();
