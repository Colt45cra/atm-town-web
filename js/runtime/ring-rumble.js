/* ===== v191: ATM Ring Rumble CPU fill, stale-session pruning, and collision fix ===== */
(()=>{
  const panel=document.getElementById('ringRumblePanel');
  const canvas=document.getElementById('ringRumbleCanvas');
  const stage=canvas?.closest('.ringRumbleStage');
  const ctx=canvas?.getContext('2d');
  if(!panel||!canvas||!stage||!ctx)return;

  const ui={
    alive:document.getElementById('ringRumbleAlive'),ring:document.getElementById('ringRumbleRing'),drop:document.getElementById('ringRumbleDrop'),
    status:document.getElementById('ringRumbleStatus'),message:document.getElementById('ringRumbleMessage'),detail:document.getElementById('ringRumbleMessageDetail'),
    start:document.getElementById('ringRumbleStart'),close:document.getElementById('ringRumbleClose'),joystick:document.getElementById('ringRumbleJoystick'),knob:document.getElementById('ringRumbleJoystickKnob')
  };

  const VIEW_W=960,VIEW_H=540,MAX_RADIUS=214,PLAYER_RADIUS=11,COLLISION_DISTANCE=24,TARGET_ARENA_PLAYERS=5,REMOTE_STALE_MS=1400;
  const RING_RADII=[214,162,112,66];
  const DROP_TIMES=[8,16,24];
  const input={x:0,y:0};
  const remote=new Map();
  const bots=new Map();
  const collisionCooldown=new Map();
  const effects=[];
  let ringChannel=null;
  let subscribePromise=null;
  let lastRoundPayload=null;
  let presenceIds=[];
  let broadcastAt=0;
  let roundCounter=0;

  const state={open:false,running:false,finished:false,last:0,elapsed:0,startAt:0,roundId:'',hostId:'',safeRadius:MAX_RADIUS,ringIndex:0,winner:'',online:false,host:false,lastAliveCheck:0};
  const me={id:'',name:'',x:0,y:0,vx:0,vy:0,alive:true,face:'down',frame:1,animTime:0,fallAt:0,character:'classic',loadout:{}};
  let ringSessionPlayerId='';

  function cloneLoadout(){const source=(window.atmActiveLoadout||((typeof lockerLoadout!=='undefined'&&lockerLoadout)||{}));return{body:source.body||null,chest:source.chest||null,face:source.face||null,head:source.head||null,back:source.back||null,katana:source.katana||null,hands:source.hands||null,feet:source.feet||null,aura:source.aura||null};}
  function currentIdentity(){
    const connectedId=(typeof playerId!=='undefined'&&playerId)?String(playerId):'';
    if(connectedId)ringSessionPlayerId=connectedId;
    else if(!ringSessionPlayerId){
      const randomPart=(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
      ringSessionPlayerId='local-'+randomPart;
    }
    me.id=ringSessionPlayerId;
    me.name=(typeof playerName!=='undefined'&&playerName)||'Guest';
    me.character=(typeof selectedCharacter!=='undefined'&&selectedCharacter)||'classic';
    me.loadout=cloneLoadout();
  }
  function onlineAvailable(){return typeof onlineMode!=='undefined'&&onlineMode&&typeof supabaseClient!=='undefined'&&supabaseClient&&typeof roomName!=='undefined';}
  function send(event,payload){if(!ringChannel||!state.online)return;try{ringChannel.send({type:'broadcast',event,payload});}catch(_e){}}
  function hashText(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function seededAngle(id,index,total){const h=hashText(id);return((index/Math.max(1,total))*Math.PI*2)+((h%1000)/1000)*.45;}
  function spawnFor(id,index,total){const a=seededAngle(id,index,total),radius=Math.min(92,Math.max(48,total*9));return{x:Math.cos(a)*radius,y:Math.sin(a)*radius};}
  function aliveEntities(){
    const list=[];if(me.alive)list.push(me);
    for(const p of remote.values())if(p.roundId===state.roundId&&p.alive)list.push(p);
    for(const b of bots.values())if(b.alive)list.push(b);
    return list;
  }
  function allEntities(){return[me,...remote.values(),...bots.values()].filter(p=>p.roundId===state.roundId||p===me);}
  function setMessage(title,detail,buttonText){ui.message.querySelector('h3').textContent=title;ui.detail.textContent=detail;ui.start.textContent=buttonText;ui.message.classList.remove('hidden');}
  function hideMessage(){ui.message.classList.add('hidden');}
  function updateModeLabel(){
    ui.status.textContent=state.online?'ONLINE · CPU FILLS EMPTY SLOTS':'SOLO PRACTICE · ACTIVE CPU OPPONENTS';
    ui.start.textContent=state.online?'START ONLINE ROUND':'START PRACTICE';
  }

  async function connectRingChannel(){
    state.online=onlineAvailable();updateModeLabel();
    if(!state.online)return false;
    if(ringChannel)return true;
    if(subscribePromise)return subscribePromise;
    subscribePromise=new Promise(async resolve=>{
      try{
        currentIdentity();
        ringChannel=supabaseClient.channel('atm-ring-rumble:'+roomName,{config:{presence:{key:me.id},broadcast:{self:true}}});
        ringChannel.on('presence',{event:'sync'},()=>{
          const ps=ringChannel.presenceState();presenceIds=Object.keys(ps).sort();
          if(state.running&&state.host&&lastRoundPayload)setTimeout(()=>send('ring_round',lastRoundPayload),100);
          if(!state.running){ui.detail.textContent=`${Math.max(1,presenceIds.length)} player${presenceIds.length===1?'':'s'} at this cabinet. Start when ready.`;}
        });
        ringChannel.on('broadcast',{event:'ring_round'},({payload})=>{if(payload?.roundId)applyRound(payload);});
        ringChannel.on('broadcast',{event:'ring_state'},({payload})=>receiveState(payload));
        ringChannel.on('broadcast',{event:'ring_impulse'},({payload})=>receiveImpulse(payload));
        ringChannel.on('broadcast',{event:'ring_finish'},({payload})=>{if(payload?.roundId===state.roundId)finishRound(payload.winnerId,payload.winnerName,true);});
        ringChannel.on('broadcast',{event:'ring_leave'},({payload})=>{if(payload?.id)remote.delete(payload.id);});
        ringChannel.subscribe(async status=>{
          if(status==='SUBSCRIBED'){
            try{await ringChannel.track({id:me.id,name:me.name,character:me.character,loadout:me.loadout,joined_at:new Date().toISOString()});}catch(_e){}
            presenceIds=Object.keys(ringChannel.presenceState()).sort();resolve(true);
          }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){state.online=false;updateModeLabel();resolve(false);}
        });
      }catch(_e){state.online=false;ringChannel=null;updateModeLabel();resolve(false);}
    });
    return subscribePromise;
  }

  async function disconnectRingChannel(){
    if(ringChannel){try{send('ring_leave',{id:me.id});await ringChannel.untrack();await ringChannel.unsubscribe();}catch(_e){}}
    ringChannel=null;subscribePromise=null;presenceIds=[];
  }

  function participantList(){
    const byId=new Map();
    if(state.online&&ringChannel){
      const ps=ringChannel.presenceState();
      for(const id of Object.keys(ps).sort()){
        if(!id||String(id).startsWith('bot:'))continue;
        const meta=Array.isArray(ps[id])?ps[id][0]:ps[id];
        byId.set(String(id),{id:String(id),name:meta?.name||'Player',character:meta?.character||'classic',loadout:meta?.loadout||{}});
      }
    }
    byId.set(me.id,{id:me.id,name:me.name,character:me.character,loadout:me.loadout});
    const list=[...byId.values()];
    list.sort((a,b)=>a.id.localeCompare(b.id));
    return list.slice(0,TARGET_ARENA_PLAYERS);
  }

  function requestRound(){
    currentIdentity();roundCounter++;
    const humans=participantList();
    const botCount=Math.max(0,TARGET_ARENA_PLAYERS-humans.length);
    const bodyChoices=['body:green','body:red','body:cyber-purple','body:gold','body:navy-blue'];
    const botDefs=Array.from({length:botCount},(_,i)=>({id:`bot:${me.id}:${roundCounter}:${i}`,name:`ATM Bot ${i+1}`,character:'classic',loadout:{body:bodyChoices[i%bodyChoices.length]}}));
    const participants=humans.concat(botDefs);
    const payload={roundId:`ring-${Date.now()}-${me.id}`,startAt:Date.now()+2600,hostId:me.id,participants,seed:hashText(me.id+Date.now()),round:roundCounter};
    lastRoundPayload=payload;
    if(state.online)send('ring_round',payload);else applyRound(payload);
  }

  function applyRound(payload){
    if(state.roundId===payload.roundId&&state.running)return;
    currentIdentity();lastRoundPayload=payload;state.roundId=payload.roundId;state.startAt=payload.startAt;state.hostId=payload.hostId;state.host=!state.online||payload.hostId===me.id;state.elapsed=0;state.running=true;state.finished=false;state.winner='';state.safeRadius=MAX_RADIUS;state.ringIndex=0;state.lastAliveCheck=0;state.last=performance.now();
    remote.clear();bots.clear();collisionCooldown.clear();effects.length=0;
    const participants=Array.isArray(payload.participants)?payload.participants:[];
    const mineIndex=Math.max(0,participants.findIndex(p=>p.id===me.id));const spawn=spawnFor(me.id,mineIndex,participants.length);
    Object.assign(me,{x:spawn.x,y:spawn.y,vx:0,vy:0,alive:true,face:'down',frame:1,animTime:0,fallAt:0,roundId:state.roundId});
    participants.forEach((p,index)=>{
      if(p.id===me.id)return;const s=spawnFor(p.id,index,participants.length);
      const entity={...p,x:s.x,y:s.y,vx:0,vy:0,alive:true,face:'down',frame:1,animTime:0,roundId:state.roundId,lastSeen:0,isBot:String(p.id).startsWith('bot:'),aiThinkAt:0,aiTargetId:'',aiStrafe:(hashText(p.id)%2?1:-1),aiPhase:(hashText(p.id)%628)/100,aiMode:'orbit',aiModeUntil:0,aiOrbitRadius:58+(hashText(p.id)%42),aiChargeCooldown:0};
      const ownsBots=!state.online||payload.hostId===me.id;
      if(entity.isBot&&ownsBots)bots.set(entity.id,entity);else remote.set(entity.id,entity);
    });
    hideMessage();if(state.online)window.atmLeaderboardStart?.('ring-rumble',{online:true,round_id:state.roundId});broadcastState(true);requestAnimationFrame(loop);
  }

  function receiveState(p){
    if(!p||p.id===me.id||p.roundId!==state.roundId)return;
    const target=String(p.id).startsWith('bot:')&&state.host?bots:remote;
    const old=target.get(p.id)||{};target.set(p.id,{...old,...p,lastSeen:Date.now(),drawX:old.drawX??p.x,drawY:old.drawY??p.y});
  }
  function receiveImpulse(p){
    if(!p||p.roundId!==state.roundId||p.targetId!==me.id||!me.alive)return;
    if(p.sentAt&&Date.now()-Number(p.sentAt)>260)return;
    if(Number.isFinite(p.targetX)&&Number.isFinite(p.targetY)&&Math.hypot(me.x-p.targetX,me.y-p.targetY)>COLLISION_DISTANCE+8)return;
    const ix=Number(p.ix)||0,iy=Number(p.iy)||0;if(Math.hypot(ix,iy)<32)return;
    me.vx+=ix;me.vy+=iy;effects.push({x:me.x,y:me.y,t:0});
  }
  function broadcastState(force=false){
    if(!state.online||!state.running)return;const now=performance.now();if(!force&&now<broadcastAt)return;broadcastAt=now+70;
    send('ring_state',{id:me.id,name:me.name,x:me.x,y:me.y,vx:me.vx,vy:me.vy,alive:me.alive,face:me.face,frame:me.frame,character:me.character,loadout:me.loadout,roundId:state.roundId});
    if(state.host)for(const b of bots.values())send('ring_state',{...b,roundId:state.roundId});
  }

  function ringPhysics(){
    const elapsed=Math.max(0,(Date.now()-state.startAt)/1000);state.elapsed=elapsed;
    let index=0;if(elapsed>=DROP_TIMES[2])index=3;else if(elapsed>=DROP_TIMES[1])index=2;else if(elapsed>=DROP_TIMES[0])index=1;
    const target=RING_RADII[index],previous=RING_RADII[Math.max(0,index-1)];
    if(index>0){const transitionStart=DROP_TIMES[index-1],progress=Math.max(0,Math.min(1,(elapsed-transitionStart)/1.0));state.safeRadius=previous+(target-previous)*(progress*progress*(3-2*progress));}else state.safeRadius=MAX_RADIUS;
    state.ringIndex=index;
    const next=DROP_TIMES[index];ui.drop.textContent=next==null?'FINAL':Math.max(0,next-elapsed).toFixed(1)+'s';ui.ring.textContent=String(4-index);
  }

  function updateFacingAndWalk(entity,axisX,axisY,dt){
    const speed=Math.hypot(entity.vx,entity.vy);
    if(speed>24){
      const vx=entity.vx,vy=entity.vy,ax=Math.abs(vx),ay=Math.abs(vy);
      if(ax>ay*1.35)entity.face=vx>0?'right':'left';
      else if(ay>ax*1.35)entity.face=vy>0?'down':'up';
      else if(entity.face==='left'||entity.face==='right')entity.face=vx>=0?'right':'left';
      else entity.face=vy>=0?'down':'up';
    }
    if(speed>38){
      entity.animTime=(entity.animTime||0)+dt*3.6;
      const walkFrames=[0,1,2,1];entity.frame=walkFrames[Math.floor(entity.animTime)%walkFrames.length];
    }else{entity.animTime=0;entity.frame=1;}
  }

  function moveEntity(entity,axisX,axisY,dt,isBot=false){
    if(!entity.alive)return;
    let mag=Math.hypot(axisX,axisY);if(mag>1){axisX/=mag;axisY/=mag;mag=1;}
    const accel=isBot?720:760,maxSpeed=isBot?184:198;
    entity.vx+=axisX*accel*dt;entity.vy+=axisY*accel*dt;
    const speed=Math.hypot(entity.vx,entity.vy);if(speed>maxSpeed){entity.vx=entity.vx/speed*maxSpeed;entity.vy=entity.vy/speed*maxSpeed;}
    const drag=Math.exp(-(mag>.04?2.45:5.4)*dt);entity.vx*=drag;entity.vy*=drag;
    entity.x+=entity.vx*dt;entity.y+=entity.vy*dt;
    updateFacingAndWalk(entity,axisX,axisY,dt);
  }

  function chooseBotTarget(bot,candidates){
    let nearest=null,nearestD=Infinity;
    for(const p of candidates){
      if(!p.alive||p.id===bot.id)continue;
      const px=Number.isFinite(p.drawX)?p.drawX:p.x,py=Number.isFinite(p.drawY)?p.drawY:p.y;
      const d=Math.hypot(px-bot.x,py-bot.y);
      if(d<nearestD){nearestD=d;nearest=p;}
    }
    bot.aiTargetId=nearest?.id||'';
    bot.aiThinkAt=state.elapsed+.45+((hashText(bot.id+Math.floor(state.elapsed))%45)/100);
    return nearest;
  }

  function updateBots(dt){
    if(!bots.size)return;
    const candidates=[me,...remote.values(),...bots.values()].filter(p=>p.alive);
    for(const bot of bots.values()){
      if(!bot.alive)continue;
      let target=candidates.find(p=>p.id===bot.aiTargetId&&p.alive);
      if(!target||state.elapsed>bot.aiThinkAt)target=chooseBotTarget(bot,candidates);

      if(state.elapsed>(bot.aiModeUntil||0)){
        const roll=(hashText(bot.id+':'+Math.floor(state.elapsed*2))%100)/100;
        bot.aiMode=roll<.34?'charge':roll<.72?'orbit':'recover';
        bot.aiModeUntil=state.elapsed+1.2+((hashText(bot.id+Math.floor(state.elapsed))%100)/100)*1.8;
      }

      const radius=Math.hypot(bot.x,bot.y)||1;
      const safe=Math.max(34,state.safeRadius-18);
      const edgeRatio=radius/Math.max(1,safe);
      let steerX=0,steerY=0;

      if(edgeRatio>.78||bot.aiMode==='recover'){
        const strength=edgeRatio>.9?4.5:2.8;
        steerX+=(-bot.x/radius)*strength;steerY+=(-bot.y/radius)*strength;
      }else if(bot.aiMode==='orbit'){
        const orbitRadius=Math.min(safe*.68,bot.aiOrbitRadius||72);
        const radialError=radius-orbitRadius;
        steerX+=(-bot.x/radius)*radialError*.035;steerY+=(-bot.y/radius)*radialError*.035;
        const tangentX=(-bot.y/radius)*(bot.aiStrafe||1),tangentY=(bot.x/radius)*(bot.aiStrafe||1);
        steerX+=tangentX*1.25;steerY+=tangentY*1.25;
      }else if(target){
        const tx=Number.isFinite(target.drawX)?target.drawX:target.x,ty=Number.isFinite(target.drawY)?target.drawY:target.y;
        const dx=tx-bot.x,dy=ty-bot.y,d=Math.hypot(dx,dy)||1;
        if(d>44){steerX+=dx/d*1.7;steerY+=dy/d*1.7;}
        else{steerX+=-dy/d*(bot.aiStrafe||1)*1.35;steerY+=dx/d*(bot.aiStrafe||1)*1.35;}
      }

      for(const other of candidates){
        if(other.id===bot.id||!other.alive)continue;
        const ox=(Number.isFinite(other.drawX)?other.drawX:other.x)-bot.x,oy=(Number.isFinite(other.drawY)?other.drawY:other.y)-bot.y,d=Math.hypot(ox,oy)||1;
        if(d<52){const repel=(52-d)/52*1.75;steerX-=ox/d*repel;steerY-=oy/d*repel;}
      }

      const wobble=Math.sin(state.elapsed*1.7+(bot.aiPhase||0))*.16;steerX+=wobble;steerY-=wobble*.6;
      const len=Math.hypot(steerX,steerY)||1;moveEntity(bot,steerX/len,steerY/len,dt,true);
    }
  }

  function collisionKey(a,b){return[a,b].sort().join('|');}
  function collisionPoint(entity){
    const isRemoteEntity=remote.has(entity.id);
    return{x:isRemoteEntity&&Number.isFinite(entity.drawX)?entity.drawX:entity.x,y:isRemoteEntity&&Number.isFinite(entity.drawY)?entity.drawY:entity.y};
  }
  function resolvePair(a,b){
    if(!a.alive||!b.alive)return;
    if(remote.has(a.id)&&Date.now()-(a.lastSeen||0)>220)return;
    if(remote.has(b.id)&&Date.now()-(b.lastSeen||0)>220)return;
    const ap=collisionPoint(a),bp=collisionPoint(b),dx=bp.x-ap.x,dy=bp.y-ap.y,dist=Math.hypot(dx,dy);
    if(!dist||dist>=COLLISION_DISTANCE)return;
    const nx=dx/dist,ny=dy/dist,overlap=COLLISION_DISTANCE-dist;
    const aMovable=!remote.has(a.id),bMovable=!remote.has(b.id);
    if(aMovable){a.x-=nx*overlap*(bMovable?.5:1);a.y-=ny*overlap*(bMovable?.5:1);}
    if(bMovable){b.x+=nx*overlap*(aMovable?.5:1);b.y+=ny*overlap*(aMovable?.5:1);}

    const relX=a.vx-b.vx,relY=a.vy-b.vy;
    const closing=relX*nx+relY*ny;
    const aToward=a.vx*nx+a.vy*ny;
    const bToward=-(b.vx*nx+b.vy*ny);
    if(closing<22||Math.max(aToward,bToward)<12)return;
    const key=collisionKey(a.id,b.id),now=performance.now();if((collisionCooldown.get(key)||0)>now)return;
    collisionCooldown.set(key,now+280);
    const impact=Math.min(158,38+(closing-22)*.55);
    if(aMovable){a.vx-=nx*impact;a.vy-=ny*impact;}
    if(bMovable){b.vx+=nx*impact;b.vy+=ny*impact;}
    effects.push({x:(ap.x+bp.x)/2,y:(ap.y+bp.y)/2,t:0});
    if(state.online){
      if(!bMovable&&!String(b.id).startsWith('bot:'))send('ring_impulse',{roundId:state.roundId,targetId:b.id,sourceId:a.id,sourceX:ap.x,sourceY:ap.y,targetX:bp.x,targetY:bp.y,sentAt:Date.now(),ix:nx*impact,iy:ny*impact});
      if(!aMovable&&!String(a.id).startsWith('bot:'))send('ring_impulse',{roundId:state.roundId,targetId:a.id,sourceId:b.id,sourceX:bp.x,sourceY:bp.y,targetX:ap.x,targetY:ap.y,sentAt:Date.now(),ix:-nx*impact,iy:-ny*impact});
    }
  }

  function updateCollisions(){
    for(const bot of bots.values())if(bot.roundId===state.roundId&&bot.alive)resolvePair(me,bot);
    for(const p of remote.values()){
      if(p.roundId!==state.roundId||!p.alive||!p.lastSeen||Date.now()-p.lastSeen>REMOTE_STALE_MS)continue;
      resolvePair(me,p);
    }
    if(state.host||bots.size){
      const list=[...bots.values(),...remote.values()].filter(p=>p.alive&&p.roundId===state.roundId&&(!remote.has(p.id)||p.lastSeen&&Date.now()-p.lastSeen<=REMOTE_STALE_MS));
      for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
        if(String(list[i].id).startsWith('bot:')||String(list[j].id).startsWith('bot:'))resolvePair(list[i],list[j]);
      }
    }
  }

  function eliminate(entity){
    if(!entity.alive)return;entity.alive=false;entity.fallAt=performance.now();entity.vx*=.25;entity.vy*=.25;
    if(entity.id===me.id)broadcastState(true);
  }
  function updateEliminations(){
    const limit=Math.max(12,state.safeRadius-PLAYER_RADIUS*.65);
    if(me.alive&&Math.hypot(me.x,me.y)>limit)eliminate(me);
    if(state.host)for(const b of bots.values())if(b.alive&&Math.hypot(b.x,b.y)>limit)eliminate(b);
    for(const p of remote.values())if(p.alive&&Math.hypot(p.x,p.y)>limit+18&&Date.now()-p.lastSeen>350)p.alive=false;
  }

  function checkWinner(){
    if(!state.running||state.elapsed<2)return;const alive=aliveEntities();
    const total=[me,...remote.values(),...bots.values()].filter(p=>p.roundId===state.roundId||p===me).length;
    ui.alive.textContent=`${alive.length}/${Math.max(1,total)}`;
    if(alive.length<=1&&performance.now()-state.lastAliveCheck>450){state.lastAliveCheck=performance.now();const winner=alive[0]||null;if(state.host||!state.online){if(state.online)send('ring_finish',{roundId:state.roundId,winnerId:winner?.id||'',winnerName:winner?.name||'No one'});finishRound(winner?.id,winner?.name,false);}}
  }
  function finishRound(winnerId,winnerName,fromNetwork){
    if(state.finished)return;state.running=false;state.finished=true;state.winner=winnerName||'No one';
    const localWin=winnerId===me.id;setMessage(localWin?'YOU WIN!':`${state.winner} WINS`,localWin?'You survived the collapsing arena.':`Last player standing: ${state.winner}.`,'PLAY AGAIN');
    if(localWin&&state.online)window.atmLeaderboardSubmit?.('ring-rumble',{score_value:1,secondary_value:0,details:{online:true,round_id:state.roundId,duration_ms:Math.round(state.elapsed*1000)}});
    if(!fromNetwork)broadcastState(true);
  }

  function update(dt){
    const wait=(state.startAt-Date.now())/1000;
    if(wait>0){ui.drop.textContent=Math.ceil(wait).toString();ui.ring.textContent='4';ui.alive.textContent=`${aliveEntities().length}/${Math.max(1,allEntities().length)}`;return;}
    ringPhysics();
    if(bots.size)state.host=true;
    const nowMs=Date.now();
    if(state.elapsed>1.25){
      for(const [id,p] of remote.entries()){
        if(!p.lastSeen||nowMs-p.lastSeen>REMOTE_STALE_MS){remote.delete(id);collisionCooldown.delete(collisionKey(me.id,id));}
      }
    }
    moveEntity(me,input.x,input.y,dt,false);updateBots(dt);updateCollisions();updateEliminations();checkWinner();
    for(const p of remote.values()){p.drawX+=(p.x-(p.drawX??p.x))*Math.min(1,dt*12);p.drawY+=(p.y-(p.drawY??p.y))*Math.min(1,dt*12);}
    for(const e of effects)e.t+=dt;while(effects.length&&effects[0].t>.55)effects.shift();broadcastState(false);
  }

  function resizeCanvas(){const rect=stage.getBoundingClientRect(),dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
  window.addEventListener('resize',()=>{if(state.open)resizeCanvas();},{passive:true});

  function drawAnnulus(inner,outer,fill,alpha=1,offsetY=0){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,offsetY,outer,0,Math.PI*2);ctx.arc(0,offsetY,inner,0,Math.PI*2,true);ctx.fill('evenodd');ctx.restore();}
  function drawArena(){
    const elapsed=Math.max(0,state.elapsed);ctx.save();
    ctx.fillStyle='rgba(0,0,0,.48)';ctx.beginPath();ctx.ellipse(0,18,MAX_RADIUS+24,MAX_RADIUS*.34,0,0,Math.PI*2);ctx.fill();
    const colors=['#39264c','#313554','#24434f','#1b5a55'];
    for(let i=0;i<4;i++){
      const outer=RING_RADII[i],inner=i===3?0:RING_RADII[i+1];
      const active=state.ringIndex<=i;
      if(active){drawAnnulus(inner,outer,colors[i],1,0);ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,outer,0,Math.PI*2);ctx.stroke();}
      else{
        const dropAt=DROP_TIMES[i]??0,age=Math.max(0,elapsed-dropAt),alpha=Math.max(0,1-age/1.15),offset=Math.min(90,age*78);if(alpha>0)drawAnnulus(inner,outer,colors[i],alpha,offset);
      }
    }
    if(state.ringIndex<3){const next=DROP_TIMES[state.ringIndex],remain=next-state.elapsed;if(remain<2.2&&remain>0){const pulse=.35+.3*Math.abs(Math.sin(performance.now()*.012));const outer=RING_RADII[state.ringIndex],inner=RING_RADII[state.ringIndex+1];drawAnnulus(inner,outer,'#ff4fa3',pulse,0);}}
    ctx.strokeStyle='rgba(88,241,230,.28)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,state.safeRadius,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }

  function spriteInfo(entity){
    const characterId=entity.character||'classic';let config=CHARACTER_SHEETS?.[characterId],image=characterSheetImgs?.[characterId];const bodyId=entity.loadout?.body;
    if(characterId==='classic'&&bodyId&&ATM_EQUIPMENT_SHEETS?.[bodyId]&&equipmentSheetImgs?.[bodyId]?.complete&&equipmentSheetImgs[bodyId].naturalWidth){config=ATM_EQUIPMENT_SHEETS[bodyId];image=equipmentSheetImgs[bodyId];}
    return{characterId,config,image};
  }
  function drawLayer(entity,image,config,row,frame,scale,alpha=1){if(!image?.complete||!image.naturalWidth||!config)return;const cols=config.cols||3,rows=config.rows||4,fw=Math.floor(image.naturalWidth/cols),fh=Math.floor(image.naturalHeight/rows),ax=Number.isFinite(config.anchorX)?config.anchorX:fw/2,ay=Number.isFinite(config.anchorY)?config.anchorY:fh-1;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(image,frame*fw,row*fh,fw,fh,Math.round(entity.x-ax*scale),Math.round(entity.y-ay*scale),Math.round(fw*scale),Math.round(fh*scale));ctx.restore();}
  function drawEntity(entity,isLocal=false){
    const x=entity.drawX??entity.x,y=entity.drawY??entity.y,alpha=entity.alive?1:Math.max(0,1-(performance.now()-(entity.fallAt||performance.now()))/700);const proxy={...entity,x,y};
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=isLocal?'rgba(88,241,230,.18)':'rgba(0,0,0,.14)';ctx.beginPath();ctx.arc(x,y,PLAYER_RADIUS+(isLocal?2:0),0,Math.PI*2);ctx.fill();ctx.restore();
    const {characterId,config,image}=spriteInfo(entity);if(!config||!image?.complete||!image.naturalWidth){ctx.fillStyle=isLocal?'#58f1e6':'#ff83c8';ctx.beginPath();ctx.arc(x,y,15,0,Math.PI*2);ctx.fill();return;}
    const dir=entity.face||'down',row=Math.max(0,(config.rowOrder||['down','left','up','right']).indexOf(dir)),frame=entity.frame??1,scale=.16;
    drawLayer(proxy,image,config,row,frame,scale,alpha);
    const equip=slot=>{const id=entity.loadout?.[slot],ec=ATM_EQUIPMENT_SHEETS?.[id],ei=equipmentSheetImgs?.[id];if(id)drawLayer(proxy,ei,ec,Math.max(0,(ec?.rowOrder||['down','left','up','right']).indexOf(dir)),frame,scale,alpha);};
    if(characterId==='classic'){equip('back');equip('katana');for(const slot of ['chest','face','feet','head'])equip(slot);equip('hands');}
    ctx.save();ctx.globalAlpha=alpha;ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(3,5,12,.92)';ctx.fillText(entity.name||'Player',x+1,y-37);ctx.fillStyle=isLocal?'#58f1e6':'#fff';ctx.fillText(entity.name||'Player',x,y-38);ctx.restore();
  }
  function drawEffects(){for(const e of effects){const p=e.t/.55;ctx.strokeStyle=`rgba(255,131,200,${1-p})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,20+p*35,0,Math.PI*2);ctx.stroke();}}
  function render(){
    const dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    const cssW=canvas.width/dpr,cssH=canvas.height/dpr,zoom=Math.min(cssW/(MAX_RADIUS*2+90),cssH/(MAX_RADIUS*2+90));ctx.setTransform(dpr*zoom,0,0,dpr*zoom,canvas.width/2,canvas.height/2);
    const bg=ctx.createRadialGradient(0,0,20,0,0,MAX_RADIUS+150);bg.addColorStop(0,'#20132f');bg.addColorStop(1,'#03050b');ctx.fillStyle=bg;ctx.fillRect(-cssW/zoom/2,-cssH/zoom/2,cssW/zoom,cssH/zoom);
    drawArena();for(const p of remote.values())if(p.roundId===state.roundId)drawEntity(p,false);for(const b of bots.values())drawEntity(b,false);drawEntity(me,true);drawEffects();ctx.setTransform(1,0,0,1,0,0);
  }
  function loop(now){if(!state.open||!state.running)return;const dt=Math.min(.033,Math.max(.001,(now-state.last)/1000));state.last=now;update(dt);render();if(state.running)requestAnimationFrame(loop);}

  function setJoystick(clientX,clientY){if(!ui.joystick||!ui.knob)return;const r=ui.joystick.getBoundingClientRect(),radius=Math.max(1,r.width*.31),dx=clientX-(r.left+r.width/2),dy=clientY-(r.top+r.height/2),m=Math.hypot(dx,dy),scale=m>radius?radius/m:1;const px=dx*scale,py=dy*scale;input.x=Math.abs(px/radius)<.08?0:px/radius;input.y=Math.abs(py/radius)<.08?0:py/radius;ui.knob.style.transform=`translate(${Math.round(px)}px,${Math.round(py)}px)`;}
  function resetJoystick(){input.x=input.y=0;if(ui.knob)ui.knob.style.transform='translate(0,0)';}
  if(ui.joystick){let pointer=null;ui.joystick.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;ui.joystick.setPointerCapture?.(e.pointerId);setJoystick(e.clientX,e.clientY);},{passive:false});ui.joystick.addEventListener('pointermove',e=>{if(e.pointerId===pointer){e.preventDefault();setJoystick(e.clientX,e.clientY);}},{passive:false});const release=e=>{if(pointer===null||e.pointerId===pointer){pointer=null;resetJoystick();}};ui.joystick.addEventListener('pointerup',release,{passive:false});ui.joystick.addEventListener('pointercancel',release,{passive:false});ui.joystick.addEventListener('lostpointercapture',()=>{pointer=null;resetJoystick();});}
  const keys={};window.addEventListener('keydown',e=>{if(!state.open)return;const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d'].includes(k)){e.preventDefault();keys[k]=true;}});window.addEventListener('keyup',e=>{if(!state.open)return;const k=e.key.toLowerCase();if(k in keys){e.preventDefault();keys[k]=false;}});
  function keyboardAxes(){let x=0,y=0;if(keys.a||keys.arrowleft)x--;if(keys.d||keys.arrowright)x++;if(keys.w||keys.arrowup)y--;if(keys.s||keys.arrowdown)y++;if(x||y){const m=Math.hypot(x,y);input.x=x/m;input.y=y/m;}else if(!ui.joystick?.matches(':active')){input.x=0;input.y=0;}}
  setInterval(()=>{if(state.open)keyboardAxes();},16);

  async function open(){
    if(state.open)return;currentIdentity();window.atmVoiceEnterGameZone?.('ring-rumble','RING RUMBLE VOICE','arcade','shared');state.open=true;state.running=false;state.finished=false;dialogOpen=true;document.body.classList.add('ring-rumble-open');panel.classList.add('open');panel.setAttribute('aria-hidden','false');resizeCanvas();
    setMessage('Ring Rumble','Connecting to the arena…','START PRACTICE');await connectRingChannel();updateModeLabel();
    const detail=state.online?`${Math.max(1,presenceIds.length)} player${presenceIds.length===1?'':'s'} at the Soccer cabinet. Start an online round when ready.`:'Solo practice will add four CPU opponents so you can test the complete knockout loop.';
    setMessage('Ring Rumble',detail,state.online?'START ONLINE ROUND':'START PRACTICE');
    Object.assign(me,{x:0,y:0,vx:0,vy:0,alive:true,roundId:''});render();
  }
  async function close(){window.atmVoiceExitGameZone?.('ring-rumble');state.open=false;state.running=false;dialogOpen=false;resetJoystick();document.body.classList.remove('ring-rumble-open');panel.classList.remove('open');panel.setAttribute('aria-hidden','true');await disconnectRingChannel();}
  window.openATMRingRumble=open;
  ui.start.addEventListener('click',requestRound);ui.close.addEventListener('click',close);panel.addEventListener('pointerdown',e=>{if(e.target===panel)close();});
})();
