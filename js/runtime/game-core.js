const ATM_CONFIG=window.ATM_TOWN_CONFIG;
const ATM_MAPS=window.ATMMaps;
const ATM_INTERACTIONS=window.ATMInteractions;
const loadSupabaseLibrary=window.loadSupabaseLibrary;
const safeStorageGet=window.safeStorageGet;
const safeStorageSet=window.safeStorageSet;
const safeJsonParse=window.safeJsonParse;
const SPRITES = {"down":["assets/characters/legacy/classic/down-0.webp","assets/characters/legacy/classic/down-1.webp","assets/characters/legacy/classic/down-2.webp"],"left":["assets/characters/legacy/classic/left-0.webp","assets/characters/legacy/classic/left-1.webp","assets/characters/legacy/classic/left-2.webp"],"up":["assets/characters/legacy/classic/up-0.webp","assets/characters/legacy/classic/up-1.webp","assets/characters/legacy/classic/up-2.webp"],"right":["assets/characters/legacy/classic/right-0.webp","assets/characters/legacy/classic/right-1.webp","assets/characters/legacy/classic/right-2.webp"]};
const CHARACTER_SHEETS={classic:{src:'assets/characters/playable/atm.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},fuzzy:{src:'assets/characters/playable/fuzzy.webp',preview:'assets/characters/thumbnails/character-fuzzy.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},miracle:{src:'assets/characters/playable/miracle.webp',preview:'assets/characters/thumbnails/character-miracle.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},luci:{src:'assets/characters/playable/luci.webp',preview:'assets/characters/thumbnails/character-luci.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},triskeleton:{src:'assets/characters/playable/triskeleton.webp',preview:'assets/characters/thumbnails/character-triskeleton.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},phnix:{src:'assets/characters/playable/phnix.webp',preview:'assets/characters/thumbnails/character-phnix.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},bear:{src:'assets/characters/playable/bear.webp',preview:'assets/characters/thumbnails/character-bear.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},xoge:{src:'assets/characters/playable/xoge.webp',preview:'assets/characters/thumbnails/character-xoge.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},flippy:{src:'assets/characters/playable/flippy.webp',preview:'assets/characters/thumbnails/character-flippy.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},salute:{src:'assets/characters/playable/salute.webp',preview:'assets/characters/thumbnails/character-salute.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},brad:{src:'assets/characters/playable/brad.webp',preview:'assets/characters/thumbnails/character-brad.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},david:{src:'assets/characters/playable/david.webp',preview:'assets/characters/thumbnails/character-david.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},kaj:{src:'assets/characters/playable/kaj.webp',preview:'assets/characters/thumbnails/character-kaj.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},daniel:{src:'assets/characters/playable/daniel.webp',preview:'assets/characters/thumbnails/character-daniel.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},army:{src:'assets/characters/playable/army.webp',preview:'assets/characters/thumbnails/character-army.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33},victoria:{src:'assets/characters/playable/victoria.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33}};
const ATM_EQUIPMENT_SHEETS=Object.freeze({
  'body:astronaut':{src:'assets/characters/body/astronaut.webp',preview:'assets/characters/thumbnails/body-astronaut.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'body'},
  'body:black':{src:'assets/characters/body/black.webp',preview:'assets/characters/thumbnails/body-black.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'body'},
  'body:cyber-blue':{src:'assets/characters/body/cyber-blue.webp',preview:'assets/characters/thumbnails/body-cyber-blue.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'body'},
  'body:cyber-orange':{src:'assets/characters/body/cyber-orange.webp',preview:'assets/characters/thumbnails/body-cyber-orange.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'body'},
  'body:cyber-pink':{src:'assets/characters/body/cyber-pink.webp',preview:'assets/characters/thumbnails/body-cyber-pink.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'body'},
  'body:cyber-purple':{src:'assets/characters/body/cyber-purple.webp',preview:'assets/characters/thumbnails/body-cyber-purple.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'body'},
  'body:gold':{src:'assets/characters/body/gold.webp',preview:'assets/characters/thumbnails/body-gold.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'body'},
  'body:green':{src:'assets/characters/body/green.webp',preview:'assets/characters/thumbnails/body-green.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'body'},
  'body:navy-blue':{src:'assets/characters/body/navy-blue.webp',preview:'assets/characters/thumbnails/body-navy-blue.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'body'},
  'body:red':{src:'assets/characters/body/red.webp',preview:'assets/characters/thumbnails/body-red.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'body'},
  'backpack:blue-green':{src:'assets/characters/backpack/blue-green.webp',preview:'assets/characters/thumbnails/backpack-blue-green.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'back'},
  'backpack:blue-yellow':{src:'assets/characters/backpack/blue-yellow.webp',preview:'assets/characters/thumbnails/backpack-blue-yellow.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'back'},
  'backpack:bright-orange':{src:'assets/characters/backpack/bright-orange.webp',preview:'assets/characters/thumbnails/backpack-bright-orange.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'back'},
  'backpack:gold-purple':{src:'assets/characters/backpack/gold-purple.webp',preview:'assets/characters/thumbnails/backpack-gold-purple.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'back'},
  'backpack:green':{src:'assets/characters/backpack/green.webp',preview:'assets/characters/thumbnails/backpack-green.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'back'},
  'backpack:pink-teal':{src:'assets/characters/backpack/pink-teal.webp',preview:'assets/characters/thumbnails/backpack-pink-teal.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'back'},
  'backpack:rucksack':{src:'assets/characters/backpack/rucksack.webp',preview:'assets/characters/thumbnails/backpack-rucksack.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'back'},
  'backpack:teal':{src:'assets/characters/backpack/teal.webp',preview:'assets/characters/thumbnails/backpack-teal.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'back'},
  'backpack:yellow-pink':{src:'assets/characters/backpack/yellow-pink.webp',preview:'assets/characters/thumbnails/backpack-yellow-pink.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'back'},
  'head:baby-blue-headphones':{src:'assets/characters/head/baby-blue-headphones.webp',preview:'assets/characters/thumbnails/head-baby-blue-headphones.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'head'},
  'head:banana-headphones':{src:'assets/characters/head/banana-headphones.webp',preview:'assets/characters/thumbnails/head-banana-headphones.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'head'},
  'head:blue-mohawk':{src:'assets/characters/head/blue-mohawk.webp',preview:'assets/characters/thumbnails/head-blue-mohawk.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'head'},
  'head:bullish-black':{src:'assets/characters/head/bullish-black.webp',preview:'assets/characters/thumbnails/head-bullish-black.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'head'},
  'head:buuvva-headphones':{src:'assets/characters/head/buuvva-headphones.webp',preview:'assets/characters/thumbnails/head-buuvva-headphones.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'head'},
  'head:green-headphones':{src:'assets/characters/head/green-headphones.webp',preview:'assets/characters/thumbnails/head-green-headphones.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'head'},
  'back:green-katana':{src:'assets/characters/back/green-katana.webp',preview:'assets/characters/thumbnails/back-green-katana.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'katana'},
  'head:orange-green-mohawk':{src:'assets/characters/head/orange-green-mohawk.webp',preview:'assets/characters/thumbnails/head-orange-green-mohawk.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'head'},
  'head:paper-hat':{src:'assets/characters/head/paper-hat.webp',preview:'assets/characters/thumbnails/head-paper-hat.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'head'},
  'head:pink-mohawk':{src:'assets/characters/head/pink-mohawk.webp',preview:'assets/characters/thumbnails/head-pink-mohawk.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'head'},
  'head:red-headphones':{src:'assets/characters/head/red-headphones.webp',preview:'assets/characters/thumbnails/head-red-headphones.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'head'},
  'back:white-katana':{src:'assets/characters/back/white-katana.webp',preview:'assets/characters/thumbnails/back-white-katana.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'katana'},
  'back:yellow-katana':{src:'assets/characters/back/yellow-katana.webp',preview:'assets/characters/thumbnails/back-yellow-katana.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'katana'},
  'chest:baby-blue':{src:'assets/characters/chest/baby-blue.webp',preview:'assets/characters/thumbnails/chest-baby-blue.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'chest'},
  'chest:blue':{src:'assets/characters/chest/blue.webp',preview:'assets/characters/thumbnails/chest-blue.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'chest'},
  'chest:gold':{src:'assets/characters/chest/gold.webp',preview:'assets/characters/thumbnails/chest-gold.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'chest'},
  'chest:green':{src:'assets/characters/chest/green.webp',preview:'assets/characters/thumbnails/chest-green.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'chest'},
  'chest:og':{src:'assets/characters/chest/og.webp',preview:'assets/characters/thumbnails/chest-og.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'chest'},
  'chest:pastel-blue':{src:'assets/characters/chest/pastel-blue.webp',preview:'assets/characters/thumbnails/chest-pastel-blue.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'chest'},
  'chest:pastel-red':{src:'assets/characters/chest/pastel-red.webp',preview:'assets/characters/thumbnails/chest-pastel-red.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'chest'},
  'chest:red':{src:'assets/characters/chest/red.webp',preview:'assets/characters/thumbnails/chest-red.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'chest'},
  'chest:yellow':{src:'assets/characters/chest/yellow.webp',preview:'assets/characters/thumbnails/chest-yellow.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'chest'},
  'face:black-dead-face':{src:'assets/characters/face/black-dead-face.webp',preview:'assets/characters/thumbnails/face-black-dead-face.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'face'},
  'face:gold':{src:'assets/characters/face/gold.webp',preview:'assets/characters/thumbnails/face-gold.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'face'},
  'face:og':{src:'assets/characters/face/og.webp',preview:'assets/characters/thumbnails/face-og.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'face'},
  'face:squint-face-black':{src:'assets/characters/face/squint-face-black.webp',preview:'assets/characters/thumbnails/face-squint-face-black.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'face'},
  'face:squint-face-white':{src:'assets/characters/face/squint-face-white.webp',preview:'assets/characters/thumbnails/face-squint-face-white.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'face'},
  'face:white-dead-face':{src:'assets/characters/face/white-dead-face.webp',preview:'assets/characters/thumbnails/face-white-dead-face.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'face'},
  'gloves:baby-blue':{src:'assets/characters/gloves/baby-blue.webp',preview:'assets/characters/thumbnails/gloves-baby-blue.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'hands'},
  'gloves:blue':{src:'assets/characters/gloves/blue.webp',preview:'assets/characters/thumbnails/gloves-blue.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'hands'},
  'gloves:boxing-gloves':{src:'assets/characters/gloves/boxing-gloves.webp',preview:'assets/characters/thumbnails/gloves-boxing-gloves.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'hands'},
  'gloves:green':{src:'assets/characters/gloves/green.webp',preview:'assets/characters/thumbnails/gloves-green.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'hands'},
  'gloves:orange':{src:'assets/characters/gloves/orange.webp',preview:'assets/characters/thumbnails/gloves-orange.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'hands'},
  'gloves:purple':{src:'assets/characters/gloves/purple.webp',preview:'assets/characters/thumbnails/gloves-purple.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'hands'},
  'gloves:tan':{src:'assets/characters/gloves/tan.webp',preview:'assets/characters/thumbnails/gloves-tan.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'hands'},
  'gloves:yellow':{src:'assets/characters/gloves/yellow.webp',preview:'assets/characters/thumbnails/gloves-yellow.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'hands'},
  'shoes:baby-blue':{src:'assets/characters/shoes/baby-blue.webp',preview:'assets/characters/thumbnails/shoes-baby-blue.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'feet'},
  'shoes:gold':{src:'assets/characters/shoes/gold.webp',preview:'assets/characters/thumbnails/shoes-gold.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'feet'},
  'shoes:green':{src:'assets/characters/shoes/green.webp',preview:'assets/characters/thumbnails/shoes-green.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'feet'},
  'shoes:red':{src:'assets/characters/shoes/red.webp',preview:'assets/characters/thumbnails/shoes-red.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'feet'},
  'shoes:tan':{src:'assets/characters/shoes/tan.webp',preview:'assets/characters/thumbnails/shoes-tan.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33,slot:'feet'}
});
window.atmActiveLoadout=window.atmActiveLoadout||{};
const ALLOWED_CHARACTERS=['classic','fuzzy','miracle','luci','triskeleton','phnix','bear','xoge','flippy','salute','brad','david','kaj','daniel','army'];
const CHARACTER_SPRITES={};
Object.assign(CHARACTER_SHEETS,{
  "cyber_purple":{src:"assets/characters/playable/legacy/cyber-purple.webp",cols:3,rows:4,rowOrder:['down','left','up','right']},
  "retro_sunset":{src:"assets/characters/playable/legacy/retro-sunset.webp",cols:3,rows:4,rowOrder:['down','left','up','right']},
  "dead_ninja":{src:"assets/characters/playable/legacy/dead-ninja.webp",cols:3,rows:4,rowOrder:['down','left','up','right']}
});
delete CHARACTER_SHEETS.sunset;
delete CHARACTER_SHEETS.creator;

const EXTRA_CHARACTER_PICKER_ENTRIES=[
  {id:'fuzzy',label:'FUZZY',preview:'assets/characters/thumbnails/character-fuzzy.webp'},
  {id:'miracle',label:'MIRACLE',preview:'assets/characters/thumbnails/character-miracle.webp'},
  {id:'luci',label:'LUCI',preview:'assets/characters/thumbnails/character-luci.webp'}
];


const backgroundMusic=document.getElementById('backgroundMusic');
const musicToggle=document.getElementById('musicToggle');
let musicUnlocked=false;
let musicMuted=safeStorageGet('atm_music_muted')==='1';
const jetpackBoostAudio=document.getElementById('jetpackBoostAudio');
let jetpackSoundActive=false;
let jetpackSoundStarting=false;
let jetpackAudioContext=null;
let jetpackMediaSource=null;
let jetpackGainNode=null;
let jetpackStopToken=0;
const JETPACK_GAIN=0.42;
const NORMAL_GAME_MUSIC_VOLUME=0.30;
const VOICE_GAME_MUSIC_VOLUME=0.045;
backgroundMusic.volume=NORMAL_GAME_MUSIC_VOLUME;
jetpackBoostAudio.volume=0.50;
function ensureSfxAudio(){
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(AudioContextClass&&!jetpackAudioContext){
    try{
      jetpackAudioContext=new AudioContextClass();
      jetpackMediaSource=jetpackAudioContext.createMediaElementSource(jetpackBoostAudio);
      jetpackGainNode=jetpackAudioContext.createGain();
      jetpackGainNode.gain.value=0.0001;
      jetpackMediaSource.connect(jetpackGainNode);
      jetpackGainNode.connect(jetpackAudioContext.destination);
    }catch(_e){
      jetpackAudioContext=null;
      jetpackMediaSource=null;
      jetpackGainNode=null;
    }
  }
  if(jetpackAudioContext&&jetpackAudioContext.state==='suspended')jetpackAudioContext.resume().catch(()=>{});
  return jetpackBoostAudio;
}
async function startJetpackBoostSound(){
  if(jetpackSoundActive||jetpackSoundStarting||backgroundMusic.muted||document.hidden)return;
  jetpackSoundStarting=true;
  const token=++jetpackStopToken;
  ensureSfxAudio();
  try{
    if(jetpackGainNode&&jetpackAudioContext){
      const now=jetpackAudioContext.currentTime;
      jetpackGainNode.gain.cancelScheduledValues(now);
      jetpackGainNode.gain.setValueAtTime(Math.max(0.0001,jetpackGainNode.gain.value),now);
      jetpackGainNode.gain.exponentialRampToValueAtTime(JETPACK_GAIN,now+0.035);
    }
    if(jetpackBoostAudio.paused){
      try{jetpackBoostAudio.currentTime=0;}catch(_e){}
      await jetpackBoostAudio.play();
    }
    if(token===jetpackStopToken)jetpackSoundActive=!jetpackBoostAudio.paused;
  }catch(_e){
    jetpackSoundActive=false;
  }finally{
    jetpackSoundStarting=false;
  }
}
function stopJetpackBoostSound(){
  jetpackSoundStarting=false;
  jetpackSoundActive=false;
  const token=++jetpackStopToken;
  if(jetpackGainNode&&jetpackAudioContext){
    const now=jetpackAudioContext.currentTime;
    jetpackGainNode.gain.cancelScheduledValues(now);
    jetpackGainNode.gain.setValueAtTime(Math.max(0.0001,jetpackGainNode.gain.value),now);
    jetpackGainNode.gain.exponentialRampToValueAtTime(0.0001,now+0.09);
    setTimeout(()=>{
      if(token!==jetpackStopToken)return;
      jetpackBoostAudio.pause();
      try{jetpackBoostAudio.currentTime=0;}catch(_e){}
    },115);
  }else{
    const startVolume=jetpackBoostAudio.volume;
    const started=performance.now();
    const fade=()=>{
      if(token!==jetpackStopToken)return;
      const p=Math.min(1,(performance.now()-started)/90);
      jetpackBoostAudio.volume=Math.max(0.001,startVolume*(1-p));
      if(p<1){requestAnimationFrame(fade);}else{
        jetpackBoostAudio.pause();
        try{jetpackBoostAudio.currentTime=0;}catch(_e){}
        jetpackBoostAudio.volume=0.50;
      }
    };
    fade();
  }
}
function syncJetpackBoostSound(){
  const shouldPlay=!backgroundMusic.muted&&!document.hidden&&currentMap==='town'&&jetpackState.active&&jetpackState.thrusting;
  if(shouldPlay){
    if(!jetpackSoundActive||jetpackBoostAudio.paused)startJetpackBoostSound();
  }else if(jetpackSoundActive||!jetpackBoostAudio.paused){
    stopJetpackBoostSound();
  }
}
function updateMusicButton(){
  musicToggle.textContent=backgroundMusic.muted?'🔇':'♪';
  musicToggle.classList.toggle('muted',backgroundMusic.muted);
  musicToggle.setAttribute('aria-label',backgroundMusic.muted?'Unmute background music':'Mute background music');
}
function updateVoiceMusicDucking(){
  const target=voiceJoined?VOICE_GAME_MUSIC_VOLUME:NORMAL_GAME_MUSIC_VOLUME;
  if(Math.abs(backgroundMusic.volume-target)<.001)return;
  const start=backgroundMusic.volume,started=performance.now(),duration=220;
  const fade=()=>{const p=Math.min(1,(performance.now()-started)/duration);backgroundMusic.volume=start+(target-start)*p;if(p<1)requestAnimationFrame(fade);};
  requestAnimationFrame(fade);
}
async function startBackgroundMusic(){
  if(backgroundMusic.muted)return;
  try{
    await backgroundMusic.play();
    musicUnlocked=true;
  }catch(_e){}
}
function unlockAudioSystems(){
  ensureSfxAudio();
  if(!musicUnlocked)startBackgroundMusic();
}
for(const eventName of ['pointerdown','touchstart','keydown']){
  window.addEventListener(eventName,unlockAudioSystems,{once:false,passive:true});
}
musicToggle.addEventListener('pointerdown',e=>e.stopPropagation());
musicToggle.addEventListener('click',e=>{
  e.preventDefault();e.stopPropagation();
  backgroundMusic.muted=!backgroundMusic.muted;
  musicMuted=backgroundMusic.muted;
  safeStorageSet('atm_music_muted',musicMuted?'1':'0');
  updateMusicButton();
  if(backgroundMusic.muted){
    stopJetpackBoostSound();
  }else{
    startBackgroundMusic();
  }
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    stopJetpackBoostSound();
  }else if(!backgroundMusic.muted){
    startBackgroundMusic();
  }
});
window.addEventListener('pageshow',()=>{
  if(!backgroundMusic.muted)startBackgroundMusic();
});
updateMusicButton();

const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
const mini=document.getElementById('miniCanvas'), mctx=mini.getContext('2d');
const loungeTvEmbed=document.getElementById('loungeTvEmbed');
const loungeTvFrame=document.getElementById('loungeTvFrame');
const LOUNGE_TV_SCREEN=Object.freeze({x:236,y:35,w:207,h:82});
let loungeTvVisible=false,loungeTvReady=false;
function loungeTvCommand(func,args=[]){
  try{loungeTvFrame?.contentWindow?.postMessage(JSON.stringify({event:'command',func,args}),'*');}catch(_e){}
}
function updateLoungeTvEmbed(cameraX,cameraY){
  if(!loungeTvEmbed)return;
  const shouldShow=currentMap==='lounge';
  if(!shouldShow){
    if(loungeTvVisible)loungeTvCommand('pauseVideo');
    loungeTvVisible=false;loungeTvEmbed.style.display='none';return;
  }
  const left=(LOUNGE_TV_SCREEN.x-cameraX)*zoom,top=(LOUNGE_TV_SCREEN.y-cameraY)*zoom;
  const width=LOUNGE_TV_SCREEN.w*zoom,height=LOUNGE_TV_SCREEN.h*zoom;
  const inView=left+width>0&&top+height>0&&left<W&&top<H;
  if(!inView){loungeTvEmbed.style.display='none';return;}
  loungeTvEmbed.style.display='block';
  loungeTvEmbed.style.left=Math.round(left)+'px';loungeTvEmbed.style.top=Math.round(top)+'px';
  loungeTvEmbed.style.width=Math.max(1,Math.round(width))+'px';loungeTvEmbed.style.height=Math.max(1,Math.round(height))+'px';
  if(!loungeTvVisible){loungeTvVisible=true;if(loungeTvReady){loungeTvCommand('mute');loungeTvCommand('playVideo');}}
}
loungeTvFrame?.addEventListener('load',()=>{loungeTvReady=true;if(currentMap==='lounge'){loungeTvCommand('mute');loungeTvCommand('playVideo');}});
ctx.imageSmoothingEnabled=false; mctx.imageSmoothingEnabled=false;
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,3);
let stableGameW=Math.max(1,Math.round(innerWidth||1));
let stableGameH=Math.max(1,Math.round(innerHeight||1));

function focusedTextEntry(){
  const el=document.activeElement;if(!el)return false;
  if(el.isContentEditable)return true;
  const tag=String(el.tagName||'').toLowerCase();
  return tag==='input'||tag==='textarea'||tag==='select';
}
function syncVisualViewport(){
  const vv=window.visualViewport;
  const vvTop=vv?vv.offsetTop:0;
  const vvHeight=vv?vv.height:innerHeight;
  const vvWidth=vv?vv.width:innerWidth;
  const bottomGap=Math.max(0,(innerHeight||vvHeight)-(vvTop+vvHeight));
  document.documentElement.style.setProperty('--vv-top',vvTop+'px');
  document.documentElement.style.setProperty('--vv-height',vvHeight+'px');
  document.documentElement.style.setProperty('--vv-width',vvWidth+'px');
  document.documentElement.style.setProperty('--vv-bottom-gap',bottomGap+'px');
  const controls=document.getElementById('controls');
  if(controls){controls.style.display='block';controls.style.visibility='visible';controls.style.opacity='1';}
  const chatBar=document.getElementById('chatBar');
  if(chatBar){chatBar.style.display='flex';chatBar.style.visibility='visible';chatBar.style.opacity='1';}
}
function resize(){
  const vv=window.visualViewport;
  const visualH=Math.max(1,Math.round(vv?vv.height:innerHeight));
  const visualBottomGap=Math.max(0,(innerHeight||visualH)-((vv?.offsetTop||0)+visualH));
  const keyboardLikely=focusedTextEntry()&&(stableGameH-visualH>70||visualBottomGap>70);

  // v235.7.1: the keyboard changes HUD geometry, not the game canvas. Keeping
  // the canvas at the last stable game viewport prevents Android/iOS from
  // panning into the page background while typing quick chat or Live Chat.
  if(!keyboardLikely){
    stableGameW=Math.max(1,Math.round(innerWidth||vv?.width||stableGameW));
    stableGameH=Math.max(1,Math.round(innerHeight||vv?.height||stableGameH));
  }
  W=stableGameW;H=stableGameH;
  DPR=Math.min(devicePixelRatio||1,3);
  canvas.width=Math.max(1,Math.round(W*DPR));
  canvas.height=Math.max(1,Math.round(H*DPR));
  canvas.style.position='fixed';
  canvas.style.left='0px';
  canvas.style.top='0px';
  canvas.style.width=W+'px';
  canvas.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.imageSmoothingEnabled=false;
  try{ctx.imageSmoothingQuality='low';}catch(_e){}
  syncVisualViewport();
}
addEventListener('resize',resize);
addEventListener('orientationchange',()=>{setTimeout(resize,50);setTimeout(resize,300);});
addEventListener('pageshow',()=>{resize();setTimeout(resize,80);setTimeout(resize,350);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){resize();setTimeout(resize,120);}});
if(window.visualViewport){visualViewport.addEventListener('resize',resize);visualViewport.addEventListener('scroll',syncVisualViewport);}
resize();
requestAnimationFrame(()=>{resize();requestAnimationFrame(resize);});
setTimeout(resize,100);setTimeout(resize,400);setTimeout(resize,1000);

const ATM_DISPLAY_BUILD=Object.freeze({version:ATM_CONFIG?.build?.version||'v235.12.8',name:ATM_CONFIG?.build?.name||'Prop Sync + Horde Navigation'});
console.info(`ATM Town build ${ATM_DISPLAY_BUILD.version} — ${ATM_DISPLAY_BUILD.name}`);
const initialMapLabel=document.getElementById('mapLabel');
if(initialMapLabel)initialMapLabel.textContent='ATM TOWN · '+ATM_DISPLAY_BUILD.version;
const buildVersionNode=document.getElementById('buildVersion');
if(buildVersionNode)buildVersionNode.textContent=ATM_DISPLAY_BUILD.version;
document.title='ATM Town '+ATM_DISPLAY_BUILD.version+' — '+ATM_DISPLAY_BUILD.name;
const tile=ATM_CONFIG.tileSize;
const world=ATM_MAPS.world('town');
const hqWorld=ATM_MAPS.world('hq');
const galleryWorld=ATM_MAPS.world('gallery');
const INTERACTION_DISTANCE=32;
const TOWN_INITIAL_SPAWN=ATM_MAPS.spawn('town');
const ZOOM_MIN=0.46, ZOOM_MAX=1.6;
const savedCameraZoom=parseFloat(safeStorageGet('atm_camera_zoom',''));
try{localStorage.removeItem('atm_equipment');}catch(_e){}
function hasPermanentEquippedJetpack(){return window.atmLockerPermanentJetpackEquipped?.()===true;}
function canUseJetpack(){return powerUps.jetpack>0||hasPermanentEquippedJetpack();}
let townZoom=Number.isFinite(savedCameraZoom)?Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,savedCameraZoom)):0.92;
let zoom=townZoom;
const player={x:TOWN_INITIAL_SPAWN.x,y:TOWN_INITIAL_SPAWN.y,r:14,speed:182,dir:'up',moving:false,frame:1,animTimer:0};
const VENDING_POWER_SECONDS=30;
const powerUps={speed:0,bounce:0,magnet:0,jetpack:0,invisibility:0,juggernaut:0,fire:0};
const MAGNET_RANGE=300;
const MAGNET_PULL_SPEED=430;
const JETPACK_MAX_LIFT=1040;
const JETPACK_RISE_ACCEL=680;
const JETPACK_MAX_RISE_SPEED=270;
const JETPACK_RELEASE_COAST=0.045;
const JETPACK_COAST_BRAKE=900;
const JETPACK_FALL_GRAVITY_START=240;
const JETPACK_FALL_GRAVITY_RAMP=1500;
const JETPACK_FALL_GRAVITY_MAX=860;
const JETPACK_MAX_FALL_SPEED=560;
const JETPACK_DIRECTIONAL_BOOST=1.62;
const JETPACK_DIRECTIONAL_ACCEL=1450;
const JETPACK_MOMENTUM_DRAG=3.4;
const JETPACK_MOMENTUM_STOP_SPEED=5;
// Applied only when the astronaut body and jetpack are equipped together.
// Upward release braking is tuned to cut the v173 astronaut-thruster carry
// distance by roughly half while preserving the same low-gravity descent.
const ASTRONAUT_JETPACK_UPWARD_RELEASE_BRAKE=178;
const ASTRONAUT_JETPACK_FALL_GRAVITY_START=65;
const ASTRONAUT_JETPACK_FALL_GRAVITY_RAMP=105;
const ASTRONAUT_JETPACK_FALL_GRAVITY_MAX=170;
const ASTRONAUT_JETPACK_MAX_FALL_SPEED=190;
const ASTRONAUT_JETPACK_MIN_ACTIVATION_RISE_SPEED=150;
const jetpackState={
  active:false,
  thrusting:false,
  astronautLowGravity:false,
  lift:0,
  velocity:0,
  releaseElapsed:0,
  controlPointerId:null,
  lastSafeX:TOWN_INITIAL_SPAWN.x,
  lastSafeY:TOWN_INITIAL_SPAWN.y,
  momentumX:0,
  momentumY:0
};
const vendingMachines=[
  // Updated from the town interaction mask for more precise action spots.
  {id:'powerVendingArcade',type:'vending',x1:834,y1:629,x2:942,y2:689,x:888,y:659,radius:95,name:'ATM POWER-UP VENDING'},
  {id:'powerVendingGallery',type:'vending',x1:1151,y1:1896,x2:1262,y2:1949,x:1206.5,y:1922.5,radius:95,name:'ATM POWER-UP VENDING'},
  {id:'powerVendingBoardwalk',type:'vending',x1:1767,y1:3284,x2:1874,y2:3334,x:1820.5,y:3309,radius:95,name:'ATM POWER-UP VENDING'}
];
const COIN_DRAW_SIZE=40;
const COIN_PICKUP_RADIUS=28;
const coinSpriteSources=["assets/items/coins/coin-01.webp","assets/items/coins/coin-02.webp","assets/items/coins/coin-03.webp","assets/items/coins/coin-04.webp","assets/items/coins/coin-05.webp"];
function createEmbeddedImage(src){ const img=new Image(); img.src=src; return img; }
const coinSpriteImages=coinSpriteSources.map(createEmbeddedImage);
function pickRandomCoinSprite(){ return coinSpriteImages[Math.floor(Math.random()*coinSpriteImages.length)]||null; }
let vendingOpen=false;
let vendingOpenedAt=0;
const VENDING_OPEN_GESTURE_GUARD_MS=850; // Prevent the same touch/click that opened vending from immediately closing it.
function getPlayerInteractionFeet(){
  // player.x/player.y tracks the sprite body; the visible ground contact is lower.
  return {x:player.x,y:player.y+34};
}
const rectContainsPoint=ATM_INTERACTIONS.rectContainsPoint;
const zoneCenter=ATM_INTERACTIONS.zoneCenter;
const zoneHitRadius=zone=>ATM_INTERACTIONS.zoneHitRadius(zone,INTERACTION_DISTANCE);
function nearestVendingMachine(){
  if(currentMap!=='town')return null;
  if(townInteractionReader.ready)return townInteractionThing('vending');
  const feet=getPlayerInteractionFeet();
  let best=null,bestDistance=Infinity;
  for(const machine of vendingMachines){
    const center=zoneCenter(machine);
    const distance=Math.hypot(feet.x-center.x,feet.y-center.y);
    if((rectContainsPoint(machine,feet.x,feet.y,14)||distance<=machine.radius)&&distance<bestDistance){best=machine;bestDistance=distance;}
  }
  return best;
}
let powerHudSecond=-1;
let cam={x:0,y:0}, last=performance.now(), started=true, dialogOpen=false, coins=0;
let currentMap='town';
let townReturnPoint=null;
let playerName='Guest';
let selectedCharacter='classic';
let playerId=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2));
let roomName='atm-town-alpha';
let supabaseClient=null, realtimeChannel=null, onlineMode=false;
const remotePlayers=new Map();
const presencePlayers=new Map();
let currentOnlineCount=1;
const atmPeopleEncounters=new Map();
let currentPlayerActivity=null;
let lockerPreviousActivity=null;

// v204: one shared LiveKit voice room for the entire game.
// Players stay connected while changing maps and opening minigames. Audio is
// controlled only by same-map distance, so nearby players are audible and
// distant or cross-map players are silent.
const HQ_VOICE_ROOM='atm-hq-meeting-table';
const GLOBAL_VOICE_ZONE=Object.freeze({map:'global',id:'atm-town:global',label:'ATM TOWN PROXIMITY VOICE',limit:99,proximity:true});
const DEFAULT_VOICE_LIMIT=99;
let livekitModule=null;
let voiceRoom=null;
let voiceJoined=false;
let voiceJoinedMap='global';
let voiceActiveZone=GLOBAL_VOICE_ZONE;
let voiceGameOverride=null;
let voiceMuted=false;
let voiceJoinPending=false;
let voiceOutsideSince=0;
let voiceAudioElements=new Map();
const voicePanel=document.getElementById('voiceMeetingPanel');
const voiceStatus=document.getElementById('voiceMeetingStatus');
const voiceCount=document.getElementById('voiceCount');
const voiceZoneName=document.getElementById('voiceZoneName');
const voiceJoinButton=document.getElementById('voiceJoinButton');
const voiceMuteButton=document.getElementById('voiceMuteButton');
const voiceLeaveButton=document.getElementById('voiceLeaveButton');

function voiceZone(){return GLOBAL_VOICE_ZONE;}
function resolveWorldVoiceZone(){return GLOBAL_VOICE_ZONE;}
function currentVoiceZone(){return GLOBAL_VOICE_ZONE;}
function currentVoiceZoneMap(){return 'global';}
function currentBroadcastVoiceZoneId(){return GLOBAL_VOICE_ZONE.id;}
function insideHQMeetingVoiceZone(){return true;}
function voiceRoomForMap(){return HQ_VOICE_ROOM;}
function voiceZoneLabel(){return GLOBAL_VOICE_ZONE.label;}
function setVoiceStatus(message){if(voiceStatus)voiceStatus.textContent=message;}
function setVoiceGameZone(gameId='',label='',map=''){
  voiceGameOverride=null;
  document.body.classList.remove('voice-game-zone');
  if(map==='arcade'){
    const cleanLabel=String(label||gameId||'ARCADE GAME').replace(/\s+VOICE$/i,'').trim();
    currentPlayerActivity={type:'arcade-game',gameId:String(gameId||'arcade-game'),label:cleanLabel||'ARCADE GAME',startedAt:Date.now()};
    broadcastState(true);updateArcadeGamePresence();
  }
  if(voiceJoined){setVoiceStatus('Voice connected · nearby players are audible.');updateVoiceProximityVolumes();updateVoiceCount();}
}
function clearVoiceGameZone(gameId=''){
  voiceGameOverride=null;
  document.body.classList.remove('voice-game-zone');
  if(currentPlayerActivity?.type==='arcade-game'&&(!gameId||currentPlayerActivity.gameId===gameId)){
    currentPlayerActivity=null;broadcastState(true);updateArcadeGamePresence();
  }
  if(voiceJoined){setVoiceStatus('Voice connected · nearby players are audible.');updateVoiceProximityVolumes();updateVoiceCount();}
}
window.atmVoiceEnterGameZone=setVoiceGameZone;
window.atmVoiceExitGameZone=clearVoiceGameZone;
window.atmCurrentVoiceZone=()=>GLOBAL_VOICE_ZONE.id;

function updateVoiceCount(){
  let count=voiceJoined?1:0;
  if(voiceRoom)count+=voiceRoom.remoteParticipants.size;
  if(voiceCount)voiceCount.textContent=`${count} WITH VOICE`;
}
function remotePlayerDistance(identity){
  const remote=remotePlayers.get(identity);
  if(!remote||remote.map!==currentMap)return Infinity;
  return Math.hypot(player.x-(remote.drawX??remote.x),player.y-(remote.drawY??remote.y));
}
function proximityVolume(distance){
  if(!Number.isFinite(distance)||distance>=520)return 0;
  if(distance<=95)return 1;
  const t=(distance-95)/(520-95);
  return Math.max(0.035,Math.pow(1-t,1.65));
}
function updateVoiceProximityVolumes(){
  for(const [identity,audio] of voiceAudioElements){
    const distance=remotePlayerDistance(identity);
    const audible=Number.isFinite(distance)&&distance<520;
    audio.muted=!audible;
    audio.volume=audible?proximityVolume(distance):0;
  }
}
async function getLiveKitModule(){
  if(!livekitModule)livekitModule=await import('https://cdn.jsdelivr.net/npm/livekit-client@2.21.0/+esm');
  return livekitModule;
}
function removeVoiceAudio(identity){
  const audio=voiceAudioElements.get(identity);
  if(audio){try{audio.pause();}catch(_e){} audio.remove();voiceAudioElements.delete(identity);}
}
async function joinHQVoice(){
  if(voiceJoined||voiceJoinPending)return;
  voiceJoinPending=true;voiceJoinButton.disabled=true;setVoiceStatus('Requesting microphone access…');
  try{
    const response=await fetch('/api/livekit-token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({room:HQ_VOICE_ROOM,identity:playerId,name:playerName||'Guest'})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||'Could not join voice room.');
    const LK=await getLiveKitModule();
    voiceRoom=new LK.Room({adaptiveStream:true,dynacast:true,autoSubscribe:true});
    voiceRoom.on(LK.RoomEvent.TrackSubscribed,(track,_publication,participant)=>{
      if(track.kind!==LK.Track.Kind.Audio)return;
      const audio=track.attach();audio.autoplay=true;audio.playsInline=true;audio.dataset.voiceIdentity=participant.identity;
      audio.style.display='none';document.body.appendChild(audio);voiceAudioElements.set(participant.identity,audio);updateVoiceProximityVolumes();updateVoiceCount();
    });
    voiceRoom.on(LK.RoomEvent.TrackUnsubscribed,(_track,_publication,participant)=>removeVoiceAudio(participant.identity));
    voiceRoom.on(LK.RoomEvent.ParticipantConnected,()=>{updateVoiceCount();updateVoiceProximityVolumes();});
    voiceRoom.on(LK.RoomEvent.ParticipantDisconnected,p=>{removeVoiceAudio(p.identity);updateVoiceCount();});
    voiceRoom.on(LK.RoomEvent.ActiveSpeakersChanged,speakers=>{
      const localSpeaking=speakers.some(p=>p.identity===playerId);voicePanel.classList.toggle('speaking',localSpeaking);
    });
    voiceRoom.on(LK.RoomEvent.Disconnected,()=>{cleanupVoiceState('Voice disconnected.');});
    await voiceRoom.connect(payload.server_url,payload.participant_token,{autoSubscribe:true});
    await voiceRoom.localParticipant.setMicrophoneEnabled(true);
    voiceJoined=true;voiceJoinedMap='global';voiceActiveZone=GLOBAL_VOICE_ZONE;voiceMuted=false;voiceOutsideSince=0;
    updateVoiceMusicDucking();
    voicePanel.classList.add('joined');document.body.classList.add('voice-meeting-open');
    voiceJoinButton.textContent='LEAVE VOICE';voiceJoinButton.disabled=false;voiceMuteButton.textContent='MUTE';setVoiceStatus('Voice connected · nearby players on this map are audible.');updateVoiceCount();updateVoiceProximityVolumes();broadcastState(true);
  }catch(error){
    console.error('ATM voice join failed',error);setVoiceStatus(error.message||'Voice connection failed.');
    if(voiceRoom){try{voiceRoom.disconnect();}catch(_e){}}
    voiceRoom=null;
  }finally{voiceJoinPending=false;voiceJoinButton.disabled=false;}
}
function cleanupVoiceState(message='Voice left.'){
  for(const identity of [...voiceAudioElements.keys()])removeVoiceAudio(identity);
  voiceJoined=false;voiceJoinedMap='global';voiceActiveZone=GLOBAL_VOICE_ZONE;voiceMuted=false;voiceJoinPending=false;voiceOutsideSince=0;voiceRoom=null;
  updateVoiceMusicDucking();
  voicePanel.classList.remove('joined','speaking');document.body.classList.remove('voice-meeting-open');
  voiceJoinButton.textContent='JOIN VOICE';voiceJoinButton.disabled=false;voiceMuteButton.textContent='MUTE';setVoiceStatus(message);updateVoiceCount();broadcastState(true);
}
async function leaveHQVoice(message='Voice left.'){
  const room=voiceRoom;voiceRoom=null;
  if(room){try{await room.localParticipant.setMicrophoneEnabled(false);}catch(_e){} try{room.disconnect();}catch(_e){}}
  cleanupVoiceState(message);
}
async function toggleHQVoiceMute(){
  if(!voiceRoom||!voiceJoined)return;
  voiceMuted=!voiceMuted;
  try{await voiceRoom.localParticipant.setMicrophoneEnabled(!voiceMuted);}catch(error){voiceMuted=!voiceMuted;setVoiceStatus('Microphone toggle failed.');return;}
  voiceMuteButton.textContent=voiceMuted?'UNMUTE':'MUTE';setVoiceStatus(voiceMuted?'Microphone muted.':'Voice connected · nearby players are audible.');
}
function updateHQVoiceMeeting(){
  if(voiceZoneName)voiceZoneName.textContent=GLOBAL_VOICE_ZONE.label;
  voicePanel.classList.add('visible');
  voiceActiveZone=GLOBAL_VOICE_ZONE;
  if(!voiceJoined){
    setVoiceStatus('Join voice anywhere · nearby players on your current map will be audible.');
    updateVoiceCount();return;
  }
  voiceOutsideSince=0;
  updateVoiceProximityVolumes();updateVoiceCount();
}
async function handleVoicePrimaryButton(){
  if(voiceJoined){await leaveHQVoice('Voice left.');return;}
  await joinHQVoice();
}
voiceJoinButton.addEventListener('click',handleVoicePrimaryButton);
voiceMuteButton.addEventListener('click',toggleHQVoiceMute);
voiceLeaveButton.addEventListener('click',()=>leaveHQVoice('Voice left.'));
setInterval(updateHQVoiceMeeting,220);
window.addEventListener('beforeunload',()=>{if(voiceRoom)try{voiceRoom.disconnect();}catch(_e){}});

let lastBroadcast=0;
const chatBubbles=[];


// Mobile/tablet camera zoom. Two fingers on the game world pinch in or out.
const zoomBadge=document.createElement('div');
zoomBadge.textContent='Zoom 92%';
Object.assign(zoomBadge.style,{
  position:'fixed',left:'50%',top:'86px',transform:'translateX(-50%)',
  zIndex:'8',pointerEvents:'none',display:'none',padding:'7px 11px',
  borderRadius:'12px',background:'rgba(5,18,26,.9)',color:'#eaffff',
  border:'1px solid rgba(88,241,230,.45)',font:'800 13px system-ui',
  boxShadow:'0 8px 24px rgba(0,0,0,.3)'
});
document.body.appendChild(zoomBadge);
let zoomBadgeTimer=0;
function showZoomBadge(){
  zoomBadge.textContent='Zoom '+Math.round(zoom*100)+'%';
  zoomBadge.style.display='block';
  clearTimeout(zoomBadgeTimer);
  zoomBadgeTimer=setTimeout(()=>zoomBadge.style.display='none',650);
}
function setGameZoom(value,showBadge=true){
  const next=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,value));
  if(!Number.isFinite(next))return;
  zoom=next;
  if(currentMap==='town'){townZoom=zoom;safeStorageSet('atm_camera_zoom',String(townZoom));}
  if(showBadge)showZoomBadge();
}

const canvasPointers=new Map();
const canvasTapCandidates=new Map();
const coarsePrimaryPointer=!!window.matchMedia?.('(hover:none) and (pointer:coarse)')?.matches;
// v235.2.1: Android touch devices keep intentional ATM Town camera pinch zoom.
// Only the iOS/iPadOS family keeps canvas pinch disabled because Safari can confuse
// gameplay multi-touch (joystick + jump/action) with a browser/native pinch gesture.
const navigatorPlatform=String(navigator.platform||'');
const navigatorUserAgent=String(navigator.userAgent||'');
const isIOSFamily=/iPad|iPhone|iPod/i.test(navigatorUserAgent)||(navigatorPlatform==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1);
const canvasPinchZoomEnabled=!isIOSFamily;
let pinchStartDistance=0;
let pinchStartZoom=zoom;
function pointerDistance(){
  const points=[...canvasPointers.values()];
  if(points.length<2)return 0;
  return Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
}
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;
  e.preventDefault();
  const alreadyTouching=canvasPointers.size>0;
  canvasPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const candidate={x:e.clientX,y:e.clientY,moved:false,multi:alreadyTouching,jetpackControl:false};
  canvasTapCandidates.set(e.pointerId,candidate);
  if(alreadyTouching){
    for(const item of canvasTapCandidates.values())item.multi=true;
  }else if(!dialogOpen&&(jumpState.active||jetpackState.active)){
    candidate.jetpackControl=beginJetpackThrust(e.pointerId);
    if(candidate.jetpackControl)e.preventDefault();
  }
  try{canvas.setPointerCapture(e.pointerId);}catch(_e){}
  if(canvasPinchZoomEnabled&&canvasPointers.size===2){
    pinchStartDistance=Math.max(1,pointerDistance());
    pinchStartZoom=zoom;
  }
},{passive:false});
canvas.addEventListener('pointermove',e=>{
  if(!canvasPointers.has(e.pointerId))return;
  canvasPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const candidate=canvasTapCandidates.get(e.pointerId);
  if(candidate&&Math.hypot(e.clientX-candidate.x,e.clientY-candidate.y)>12)candidate.moved=true;
  if(canvasPointers.size>=2){
    e.preventDefault();
    if(canvasPinchZoomEnabled&&pinchStartDistance>0){
      const distance=pointerDistance();
      setGameZoom(pinchStartZoom*(distance/pinchStartDistance));
    }
  }
},{passive:false});
function finishCanvasPointer(e){
  const candidate=canvasTapCandidates.get(e.pointerId);
  const controlledJetpack=!!(candidate&&candidate.jetpackControl);
  const shouldJump=e.type==='pointerup'&&e.pointerType==='touch'&&candidate&&!candidate.moved&&!candidate.multi&&!controlledJetpack;
  if(controlledJetpack)releaseJetpackThrust(e.pointerId);
  canvasPointers.delete(e.pointerId);
  canvasTapCandidates.delete(e.pointerId);
  if(canvasPointers.size<2){
    pinchStartDistance=0;
    pinchStartZoom=zoom;
  }
  if(shouldJump)startJump();
}
canvas.addEventListener('pointerup',finishCanvasPointer);
canvas.addEventListener('pointercancel',finishCanvasPointer);
canvas.addEventListener('lostpointercapture',finishCanvasPointer);

// Mouse wheel and laptop trackpad support for desktop testing.
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  setGameZoom(zoom*Math.exp(-e.deltaY*0.0015));
},{passive:false});

const characterSpriteImgs={};
for(const characterId in CHARACTER_SPRITES){
  characterSpriteImgs[characterId]={};
  for(const dir in CHARACTER_SPRITES[characterId]){
    characterSpriteImgs[characterId][dir]=[];
    for(const src of CHARACTER_SPRITES[characterId][dir]){
      const img=new Image();
      img.src=src;
      characterSpriteImgs[characterId][dir].push(img);
    }
  }
}
const characterSheetImgs={};
for(const characterId in CHARACTER_SHEETS){
  const img=new Image();
  img.src=CHARACTER_SHEETS[characterId].src;
  characterSheetImgs[characterId]=img;
}
const equipmentSheetImgs={};
for(const itemId in ATM_EQUIPMENT_SHEETS){
  const img=new Image();
  img.decoding='async';
  img.src=ATM_EQUIPMENT_SHEETS[itemId].src;
  equipmentSheetImgs[itemId]=img;
}
const jetpackOverlaySheet={src:'assets/characters/equipment/jetpack.webp',cols:3,rows:4,rowOrder:['down','left','up','right'],anchorX:128,anchorY:303,displayScale:.33};
const jetpackOverlayImg=new Image();
jetpackOverlayImg.src=jetpackOverlaySheet.src;
const spriteImgs=characterSpriteImgs.classic;

const floorMapImg=new Image(); floorMapImg.decoding='async';
floorMapImg.src=ATM_MAPS.asset('town','overview');

const floorMapNightImg=new Image(); floorMapNightImg.decoding='async';
floorMapNightImg.src=ATM_MAPS.asset('town','nightOverview');
const townWorldStream=ATMWorldStreaming.create(ATM_MAPS.asset('town','worldManifest'));
const TOWN_FALLBACK_SIZE=ATM_MAPS.pixelSize('town');
const TOWN_FALLBACK_BOUNDS=Object.freeze({minX:0,minY:0,maxX:TOWN_FALLBACK_SIZE.w,maxY:TOWN_FALLBACK_SIZE.h,width:TOWN_FALLBACK_SIZE.w,height:TOWN_FALLBACK_SIZE.h});
function townWorldBounds(){return townWorldStream.getBounds(TOWN_FALLBACK_BOUNDS);}
const DAY_NIGHT_CYCLE_MS={
  dayHold:20*60*1000,
  fadeToNight:3*60*1000,
  nightHold:20*60*1000,
  fadeToDay:3*60*1000
};
DAY_NIGHT_CYCLE_MS.total=DAY_NIGHT_CYCLE_MS.dayHold+DAY_NIGHT_CYCLE_MS.fadeToNight+DAY_NIGHT_CYCLE_MS.nightHold+DAY_NIGHT_CYCLE_MS.fadeToDay;
let currentTownNightAlpha=0;
let townServerClockOffsetMs=0;
let townClockSynced=false;
function getSharedTownTimeMs(){
  return Date.now()+townServerClockOffsetMs;
}
async function syncTownWorldClock(){
  const started=Date.now();
  try{
    const response=await fetch('/api/world-time',{cache:'no-store'});
    if(!response.ok) throw new Error('World clock request failed.');
    const data=await response.json();
    const finished=Date.now();
    const midpoint=started+(finished-started)/2;
    const serverTime=Number(data.server_time_ms);
    if(Number.isFinite(serverTime)){
      townServerClockOffsetMs=serverTime-midpoint;
      townClockSynced=true;
    }
  }catch(_error){
    townServerClockOffsetMs=0;
    townClockSynced=false;
  }
}
function getTownNightAlpha(timeMs=0){
  const cycle=((timeMs%DAY_NIGHT_CYCLE_MS.total)+DAY_NIGHT_CYCLE_MS.total)%DAY_NIGHT_CYCLE_MS.total;
  if(cycle<DAY_NIGHT_CYCLE_MS.dayHold) return 0;
  if(cycle<DAY_NIGHT_CYCLE_MS.dayHold+DAY_NIGHT_CYCLE_MS.fadeToNight){
    return (cycle-DAY_NIGHT_CYCLE_MS.dayHold)/DAY_NIGHT_CYCLE_MS.fadeToNight;
  }
  if(cycle<DAY_NIGHT_CYCLE_MS.dayHold+DAY_NIGHT_CYCLE_MS.fadeToNight+DAY_NIGHT_CYCLE_MS.nightHold) return 1;
  const fadeStart=DAY_NIGHT_CYCLE_MS.dayHold+DAY_NIGHT_CYCLE_MS.fadeToNight+DAY_NIGHT_CYCLE_MS.nightHold;
  return 1-((cycle-fadeStart)/DAY_NIGHT_CYCLE_MS.fadeToDay);
}

// v235.9.4 Horde Nightfall: The Horde temporarily overrides the normal shared
// day/night cycle while the local player is outdoors in the active shared event.
// The fade is visual-only and does not mutate the server clock or event state.
const HORDE_NIGHTFALL={fadeInPerSecond:1.7,fadeOutPerSecond:.72,visionInner:112,visionOuter:278,darkness:.92,nightMix:.74};
let hordeNightfallAlpha=0;
let hordeNightfallLastAt=0;
function hordeNightfallActive(){
  return currentMap==='town'&&Boolean(window.ATMZombieOutbreak?.getStats?.().active);
}
function updateHordeNightfall(t){
  const now=Number(t)||performance.now();
  const dt=hordeNightfallLastAt?Math.min(.05,Math.max(0,(now-hordeNightfallLastAt)/1000)):0;
  hordeNightfallLastAt=now;
  const target=hordeNightfallActive()?1:0;
  if(target>hordeNightfallAlpha)hordeNightfallAlpha=Math.min(target,hordeNightfallAlpha+dt*HORDE_NIGHTFALL.fadeInPerSecond);
  else if(target<hordeNightfallAlpha)hordeNightfallAlpha=Math.max(target,hordeNightfallAlpha-dt*HORDE_NIGHTFALL.fadeOutPerSecond);
  return hordeNightfallAlpha;
}
function getHordeStreetLightAlpha(timeMs=getSharedTownTimeMs()){
  if(hordeNightfallAlpha<=.001)return 1;
  // Shared-server time makes the grid flicker at the same moments for every
  // connected player instead of each device producing unrelated random flashes.
  const t=(Number(timeMs)||0)/1000;
  let alpha=.92+Math.sin(t*17.3)*.035+Math.sin(t*43.7)*.025;
  const cycle=((Number(timeMs)||0)%6100+6100)%6100;
  if((cycle>720&&cycle<805)||(cycle>842&&cycle<905))alpha=.38;
  else if(cycle>2950&&cycle<3020)alpha=.58;
  else if(cycle>4480&&cycle<4545)alpha=.48;
  return Math.max(.3,Math.min(1,1-(1-alpha)*hordeNightfallAlpha));
}
function drawHordeVisionDarkness(target=ctx,cameraX=cam.x,cameraY=cam.y){
  const intensity=Math.max(0,Math.min(1,hordeNightfallAlpha));
  if(intensity<=.001||currentMap!=='town')return;
  const viewW=W/zoom,viewH=H/zoom;
  const cx=player.x,cy=player.y-18;
  const inner=HORDE_NIGHTFALL.visionInner,outer=HORDE_NIGHTFALL.visionOuter;
  const maxDark=HORDE_NIGHTFALL.darkness*intensity;
  // Important: this stays source-over. The previous destination-out approach
  // erased already-rendered world/player pixels from the main canvas, which is
  // why the local character disappeared inside the supposed vision circle.
  // A transparent-center radial veil keeps the player and nearby map readable
  // while still pushing everything outside the vision bubble toward black.
  const gradient=target.createRadialGradient(cx,cy,inner,cx,cy,outer);
  gradient.addColorStop(0,'rgba(1,3,8,0)');
  gradient.addColorStop(.34,`rgba(1,3,8,${(maxDark*.08).toFixed(3)})`);
  gradient.addColorStop(.62,`rgba(1,3,8,${(maxDark*.50).toFixed(3)})`);
  gradient.addColorStop(.84,`rgba(1,3,8,${(maxDark*.82).toFixed(3)})`);
  gradient.addColorStop(1,`rgba(1,3,8,${maxDark.toFixed(3)})`);
  target.save();
  target.globalCompositeOperation='source-over';
  target.fillStyle=gradient;
  target.fillRect(cameraX-4,cameraY-4,viewW+8,viewH+8);
  target.restore();
}

function getSourceRectForImage(img,fallbackW=1152,fallbackH=1536){
  const sw=img.naturalWidth||fallbackW;
  const sh=img.naturalHeight||fallbackH;
  // User-provided visual map, collision mask, and stair mask must stay on the
  // same aligned full canvas with the same top-left origin. Do not crop.
  return {sx:0,sy:0,sw,sh};
}
function getFloorSourceRect(){
  return getSourceRectForImage(floorMapImg,1152,1536);
}
function drawFloorMap(C,x,y,w,h){
  if(!(floorMapImg.complete&&floorMapImg.naturalWidth)) return false;
  const r=getFloorSourceRect();
  C.drawImage(floorMapImg,r.sx,r.sy,r.sw,r.sh,x,y,w,h);
  return true;
}
const obstacleMask={layer:'collision',get ready(){return townWorldStream.isMaskReadyAt('collision',player.x,player.y);}};
const stairMask={layer:'stairs',get ready(){return townWorldStream.isMaskReadyAt('stairs',player.x,player.y);}};
const townInteractionReader=Object.freeze({
  get ready(){return townWorldStream.isMaskReadyAt('interaction',player.x,player.y);},
  nearest(px,py,radius=38,typeFilter='',step=3){return townWorldStream.nearestInteraction(px,py,radius,typeFilter,step);},
  typeAt(px,py){return townWorldStream.interactionTypeAt(px,py);}
});
const townForegroundPieceDefs=[
  {src:'assets/maps/town/foreground/day/buildings_04_00.webp',x:2036,y:56,w:878,h:378,depth:433,category:'buildings'},
  {src:'assets/maps/town/foreground/day/buildings_05_00.webp',x:319,y:0,w:508,h:494,depth:493,category:'buildings'},
  {src:'assets/maps/town/foreground/day/assets_08_00.webp',x:829,y:473,w:120,h:138,depth:610,category:'assets'},
  {src:'assets/maps/town/foreground/day/buildings_02_00.webp',x:1202,y:132,w:719,h:505,depth:636,category:'buildings'},
  {src:'assets/maps/town/foreground/day/assets_03_01.webp',x:508,y:724,w:32,h:30,depth:753,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_03_00.webp',x:151,y:724,w:257,h:88,depth:811,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_03_03.webp',x:2716,y:727,w:263,h:87,depth:813,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_03_02.webp',x:1963,y:726,w:652,h:198,depth:923,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_04_00.webp',x:1671,y:795,w:299,h:133,depth:927,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_03_05.webp',x:1633,y:899,w:47,h:29,depth:927,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_03_04.webp',x:592,y:789,w:901,h:142,depth:930,category:'assets'},
  {src:'assets/maps/town/foreground/day/buildings_06_00.webp',x:267,y:702,w:545,h:554,depth:1255,category:'buildings'},
  {src:'assets/maps/town/foreground/day/assets_00_01.webp',x:1678,y:1021,w:317,h:244,depth:1264,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_00_03.webp',x:1409,y:1255,w:18,h:27,depth:1281,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_00_02.webp',x:1915,y:1254,w:17,h:29,depth:1282,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_00_00.webp',x:1158,y:1021,w:330,h:267,depth:1287,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_00_04.webp',x:1739,y:1259,w:15,h:29,depth:1287,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_17_00.webp',x:1576,y:1128,w:136,h:216,depth:1343,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_18_00.webp',x:284,y:1297,w:124,h:66,depth:1362,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_13_00.webp',x:88,y:1445,w:137,h:219,depth:1663,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_06_00.webp',x:1693,y:1467,w:135,h:222,depth:1688,category:'assets'},
  {src:'assets/maps/town/foreground/day/buildings_03_00.webp',x:436,y:1335,w:1010,h:363,depth:1697,category:'buildings'},
  {src:'assets/maps/town/foreground/day/buildings_09_00.webp',x:328,y:1454,w:111,h:310,depth:1763,category:'buildings'},
  {src:'assets/maps/town/foreground/day/assets_07_00.png',x:1148,y:1739,w:118,h:142,depth:1880,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_11_00.webp',x:1425,y:1670,w:137,h:221,depth:1890,category:'assets'},
  {src:'assets/maps/town/foreground/day/buildings_00_00.webp',x:2111,y:1109,w:524,h:1080,depth:2188,category:'buildings'},
  {src:'assets/maps/town/foreground/day/assets_22_00.webp',x:1313,y:2398,w:124,h:67,depth:2464,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_19_00.webp',x:1656,y:2398,w:124,h:68,depth:2465,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_21_00.webp',x:1656,y:2398,w:124,h:68,depth:2465,category:'assets'},
  {src:'assets/maps/town/foreground/day/buildings_01_00.webp',x:189,y:1921,w:701,h:731,depth:2651,category:'buildings'},
  {src:'assets/maps/town/foreground/day/assets_16_00.webp',x:2842,y:2604,w:136,h:216,depth:2819,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_14_00.webp',x:69,y:2618,w:136,h:219,depth:2836,category:'assets'},
  {src:'assets/maps/town/foreground/day/buildings_07_00.webp',x:2059,y:2717,w:608,h:346,depth:3062,category:'buildings'},
  {src:'assets/maps/town/foreground/day/buildings_08_00.webp',x:232,y:2893,w:576,h:311,depth:3203,category:'buildings'},
  {src:'assets/maps/town/foreground/day/assets_10_00.webp',x:1893,y:3209,w:411,h:48,depth:3256,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_10_01.webp',x:2422,y:3212,w:59,h:45,depth:3256,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_10_02.webp',x:2608,y:3216,w:225,h:41,depth:3256,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_20_00.webp',x:139,y:3106,w:45,h:154,depth:3259,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_09_00.webp',x:1761,y:3128,w:118,h:137,depth:3264,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_21_01.webp',x:2476,y:3217,w:124,h:67,depth:3283,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_19_01.webp',x:2476,y:3218,w:124,h:66,depth:3283,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_15_00.webp',x:894,y:3106,w:46,h:191,depth:3296,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_05_00.webp',x:1477,y:3161,w:154,h:196,depth:3356,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_02_00.webp',x:2781,y:3304,w:219,h:154,depth:3457,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_02_01.webp',x:105,y:3321,w:366,h:147,depth:3467,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_12_00.webp',x:1338,y:3271,w:125,h:225,depth:3495,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_02_02.webp',x:606,y:3382,w:525,h:184,depth:3565,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_02_03.webp',x:1958,y:3433,w:701,h:143,depth:3575,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_01_00.webp',x:1597,y:3740,w:297,h:199,depth:3938,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_01_01.webp',x:1631,y:3945,w:228,h:158,depth:4102,category:'assets'},
  {src:'assets/maps/town/foreground/day/assets_01_02.webp',x:1682,y:4119,w:153,h:118,depth:4236,category:'assets'}
];
const townForegroundPieces=townForegroundPieceDefs.map(def=>({...def,img:null,loading:false,lastUsed:0}));
const townForegroundNightPieces=townForegroundPieceDefs.map(def=>{
  const nightSrc=def.src.replace('/foreground/day/','/foreground/night/');
  return {...def,daySrc:def.src,nightSrc,src:nightSrc,img:null,loading:false,lastUsed:0};
});
const townForegroundNightPieceMap=new Map(townForegroundNightPieces.map(piece=>[piece.daySrc,piece]));
const TOWN_FOREGROUND_STREAM_MARGIN=640;
const TOWN_FOREGROUND_CACHE_GRACE_MS=15000;
function townForegroundNearView(piece,margin=TOWN_FOREGROUND_STREAM_MARGIN){
  const viewW=W/zoom,viewH=H/zoom;
  return piece.x+piece.w>=cam.x-margin&&piece.x<=cam.x+viewW+margin&&piece.y+piece.h>=cam.y-margin&&piece.y<=cam.y+viewH+margin;
}
function ensureTownForegroundImage(piece){
  if(piece.img||piece.loading)return;
  piece.loading=true;
  const img=new Image();img.decoding='async';
  img.onload=()=>{piece.img=img;piece.loading=false;piece.lastUsed=performance.now();};
  img.onerror=()=>{piece.loading=false;console.error('Town foreground image failed to decode:',piece.src);};
  img.src=piece.src;
}
function releaseTownForegroundImage(piece){
  if(!piece.img)return;
  try{piece.img.src='';}catch(_error){}
  piece.img=null;
}
function updateTownForegroundStreaming(){
  if(currentMap!=='town')return;
  const now=performance.now();
  const needNight=(currentTownNightAlpha||0)>0.001;
  for(const piece of townForegroundPieces){
    if(townForegroundNearView(piece)){
      piece.lastUsed=now;ensureTownForegroundImage(piece);
      const nightPiece=townForegroundNightPieceMap.get(piece.src);
      if(needNight&&nightPiece){nightPiece.lastUsed=now;ensureTownForegroundImage(nightPiece);}
    }else if(piece.img&&now-piece.lastUsed>TOWN_FOREGROUND_CACHE_GRACE_MS)releaseTownForegroundImage(piece);
  }
  for(const piece of townForegroundNightPieces){
    if(!needNight&&piece.img&&now-piece.lastUsed>TOWN_FOREGROUND_CACHE_GRACE_MS)releaseTownForegroundImage(piece);
    else if(!townForegroundNearView(piece)&&piece.img&&now-piece.lastUsed>TOWN_FOREGROUND_CACHE_GRACE_MS)releaseTownForegroundImage(piece);
  }
}
function drawTownLightOverlay(target=ctx,alpha=1){
  if(!townWorldStream.hasManifest())return;
  const view={x:cam.x,y:cam.y,w:W/zoom,h:H/zoom};
  const prevSmooth=target.imageSmoothingEnabled;
  const prevQuality=target.imageSmoothingQuality;
  target.imageSmoothingEnabled=true;
  try{target.imageSmoothingQuality='high';}catch(_e){}
  townWorldStream.drawLayer(target,'lighting',view,Math.max(0,Math.min(1,Number(alpha)||0)));
  target.imageSmoothingEnabled=prevSmooth;
  try{target.imageSmoothingQuality=prevQuality||'low';}catch(_e){}
}


const buildings=[
  {id:'arcade',x:5.7,y:0.8,w:7.2,h:9.7,door:{x:9.3,y:11.15,radius:150},name:'ATM TOKEN ARCADE',text:'Play arcade games, win tokens, and hang out inside the ATM Token Arcade.'},
  {id:'hq',x:26.0,y:5.0,w:13.0,h:10.5,name:'ATM HQ',text:'ATM HQ anchors the northern corporate district.'},
  {id:'gameLounge',x:52.7,y:0.6,w:7.8,h:10.9,name:'COMMUNITY LOUNGE',text:'The Community Lounge is a social club for relaxing, chatting, and hanging out with other players.'},
  {id:'blank2',x:4.8,y:19.6,w:9.2,h:6.9,name:'FUTURE HUB',text:'Reserved western midtown building space.'},
  {id:'nftmega',x:6.6,y:29.4,w:18.4,h:8.3,door:{x:15.8,y:38.0,radius:125},name:'NFT ART GALLERY',text:'The major arts district landmark for viewing, minting, and owning NFTs.'},
  {id:'upgrades',x:52.0,y:17.5,w:8.5,h:8.9,name:'UPGRADES',text:'A technology and character-upgrade center.'},
  {id:'gallery',x:48.2,y:39.1,w:6.8,h:8.5,name:'FUTURE HUB',text:'Reserved for a future ATM Town feature.'},
  {id:'partner',x:59.8,y:38.5,w:5.2,h:12.8,name:'FUTURE TOWER',text:'Reserved for partner projects and future portals.'},
  {id:'arena',x:4.8,y:43.7,w:11.1,h:11.5,name:'EVENT ARENA',text:'The southwestern entertainment and live-event venue.'},
  {id:'bank',x:44.2,y:56.7,w:10.4,h:7.6,name:'BYTE BISTRO',text:'A future social venue beside the lower district.'}
];
const houses=[];

const TOWN_ENTRY_ZONES=[
  {id:'gameLounge',x1:2413,y1:511,x2:2531,y2:598,radius:115,name:'COMMUNITY LOUNGE',text:'Enter the Community Lounge social club to relax, play, and hang out.',door:{x:2472/tile,y:554.5/tile,radius:115}},
  {id:'arcade',x1:524,y1:594,x2:622,y2:649,radius:120,name:'ATM TOKEN ARCADE',text:'Play arcade games, win tokens, and hang out inside the ATM Token Arcade.',door:{x:573/tile,y:621.5/tile,radius:120}},
  {id:'hq',x1:1420,y1:642,x2:1696,y2:781,radius:150,name:'ATM HQ',text:'ATM HQ anchors the northern corporate district.',door:{x:1558/tile,y:711.5/tile,radius:150}},
  {id:'blank2',x1:475,y1:1296,x2:566,y2:1365,radius:110,name:'FUTURE HUB',text:'Reserved western midtown building space.',door:{x:520.5/tile,y:1330.5/tile,radius:110}},
  {id:'nftmega',x1:615,y1:1792,x2:739,y2:1864,radius:125,name:'NFT ART GALLERY',text:'The major arts district landmark for viewing, minting, and owning NFTs.',door:{x:677/tile,y:1828/tile,radius:125}},
  {id:'gallery',x1:2287,y1:2240,x2:2459,y2:2316,radius:125,name:'FUTURE HUB',text:'Reserved for a future ATM Town feature.',door:{x:2373/tile,y:2278/tile,radius:125}},
  {id:'arena',x1:477,y1:2619,x2:603,y2:2723,radius:125,name:'EVENT ARENA',text:'The southwestern entertainment and live-event venue.',door:{x:540/tile,y:2671/tile,radius:125}},
  {id:'bank',x1:2294,y1:3102,x2:2430,y2:3204,radius:125,name:'BYTE BISTRO',text:'A future social venue beside the lower district.',door:{x:2362/tile,y:3153/tile,radius:125}}
];
const TOWN_MISC_ZONES=[
  {id:'townInfoHub',x1:1685,y1:1693,x2:1833,y2:1789,radius:110,name:'ATM TOWN DIRECTORY',text:'Open the ATM Town directory to view the full town map and major landmarks.'},
  {id:'communitySpot',x1:439,y1:3264,x2:607,y2:3343,radius:115,name:'COMMUNITY SPOT',text:'A social interaction spot along the lower district and boardwalk.'},
  {id:'upgradesKiosk',x1:1472,y1:3379,x2:1635,y2:3467,radius:115,name:'UPGRADES KIOSK',text:'A future technology and character-upgrade interaction point.'}
];
function townInteractionThing(typeFilter=''){
  if(!townInteractionReader.ready)return null;
  const feet=getPlayerInteractionFeet();
  const hit=townInteractionReader.nearest(feet.x,feet.y,42,typeFilter,3);
  if(!hit)return null;
  if(hit.type===ATM_INTERACTIONS.types.entry){
    return ATM_INTERACTIONS.nearestZone(TOWN_ENTRY_ZONES,hit.x,hit.y)?.zone||null;
  }
  if(hit.type===ATM_INTERACTIONS.types.vending){
    return ATM_INTERACTIONS.nearestZone(vendingMachines,hit.x,hit.y)?.zone||null;
  }
  if(hit.type===ATM_INTERACTIONS.types.misc){
    return ATM_INTERACTIONS.nearestZone(TOWN_MISC_ZONES,hit.x,hit.y)?.zone||null;
  }
  return null;
}

const signs=[];
const fences=[];
const benches=[];
const flowerbeds=[];
const lamps=[];
const dockCrates=[];
const bushSpots=[];
const treeSpots=[];
const npcs=[];

const COIN_TOTAL=6;
const COIN_MIN_SEPARATION=220;
const COIN_EDGE_PADDING=92;
const COIN_AVOID_RADIUS=110;
const COIN_SPAWN_SAFE_DISTANCE=180;
const RANDOM_COIN_ZONES=[
  {x1:5*tile,y1:10*tile,x2:24*tile,y2:24*tile},
  {x1:35*tile,y1:10*tile,x2:58*tile,y2:24*tile},
  {x1:8*tile,y1:27*tile,x2:27*tile,y2:42*tile},
  {x1:39*tile,y1:28*tile,x2:58*tile,y2:45*tile},
  {x1:5*tile,y1:56*tile,x2:23*tile,y2:76*tile},
  {x1:36*tile,y1:56*tile,x2:60*tile,y2:78*tile}
];
const coinsArr=[];
let coinSpawnsReady=false;
function randRange(min,max){ return min+Math.random()*(max-min); }
function createCoin(x,y,i){
  return {
    x,y,
    taken:false,
    phase:i,
    img:pickRandomCoinSprite(),
    size:COIN_DRAW_SIZE*(0.92+Math.random()*0.18)
  };
}
function coinTooCloseToTownInteractables(x,y){
  for(const v of vendingMachines){
    if(Math.hypot(x-v.x,y-v.y)<COIN_AVOID_RADIUS+18) return true;
  }
  for(const b of buildings){
    const p=getBuildingInteractPoint(b);
    if(Math.hypot(x-p.x,y-p.y)<COIN_AVOID_RADIUS+20) return true;
    const rx=b.x*tile-24, ry=b.y*tile-24, rw=b.w*tile+48, rh=b.h*tile+48;
    if(x>rx&&x<rx+rw&&y>ry&&y<ry+rh) return true;
  }
  return false;
}
function canPlaceCoinAt(x,y){
  const maxW=world.w*tile, maxH=world.h*tile;
  if(x<COIN_EDGE_PADDING||y<COIN_EDGE_PADDING||x>maxW-COIN_EDGE_PADDING||y>maxH-COIN_EDGE_PADDING) return false;
  if(obstacleAtFootprint(x,y)) return false;
  if(Math.hypot(x-TOWN_INITIAL_SPAWN.x,y-TOWN_INITIAL_SPAWN.y)<COIN_SPAWN_SAFE_DISTANCE) return false;
  if(coinTooCloseToTownInteractables(x,y)) return false;
  for(const c of coinsArr){
    if(Math.hypot(x-c.x,y-c.y)<COIN_MIN_SEPARATION) return false;
  }
  return true;
}
function findCoinPositionInRect(rect,attempts=250){
  for(let i=0;i<attempts;i++){
    const x=randRange(rect.x1,rect.x2);
    const y=randRange(rect.y1,rect.y2);
    if(canPlaceCoinAt(x,y)) return {x,y};
  }
  return null;
}
function findCoinPositionAnywhere(attempts=900){
  const rect={x1:COIN_EDGE_PADDING,y1:COIN_EDGE_PADDING,x2:world.w*tile-COIN_EDGE_PADDING,y2:world.h*tile-COIN_EDGE_PADDING};
  return findCoinPositionInRect(rect,attempts);
}
function initializeRandomCoinSpawns(force=false){
  if(!force&&coinSpawnsReady) return true;
  if(!obstacleMask.ready) return false;
  coinsArr.length=0;
  for(let i=0;i<RANDOM_COIN_ZONES.length&&coinsArr.length<COIN_TOTAL;i++){
    const pos=findCoinPositionInRect(RANDOM_COIN_ZONES[i]);
    if(pos) coinsArr.push(createCoin(pos.x,pos.y,coinsArr.length));
  }
  while(coinsArr.length<COIN_TOTAL){
    const pos=findCoinPositionAnywhere();
    if(!pos) break;
    coinsArr.push(createCoin(pos.x,pos.y,coinsArr.length));
  }
  coinSpawnsReady=coinsArr.length===COIN_TOTAL;
  return coinSpawnsReady;
}
const landRects=[]; // Disabled: town movement no longer uses legacy land rectangles.
const grassRects=[];
const pathRects=[];


const colliders=[];
function rebuildColliders(){
  colliders.length=0;
  // Movement collision comes only from the authored white-on-black collision mask.
}
rebuildColliders();

function rand2(x,y){ const s=Math.sin(x*127.1+y*311.7)*43758.5453123; return s-Math.floor(s); }
function rectCollision(px,py,r,b){ return px+r>b.x && px-r<b.x+b.w && py+r>b.y && py-r<b.y+b.h; }

const bridgeWalkRects=[]; // Disabled: no legacy bridge collision overrides.
const stairRects=[];
function authoredMaskAt(mask,px,py){
  if(!mask||!mask.layer)return false;
  const value=mask.layer==='stairs'?townWorldStream.stairsAt(px,py):townWorldStream.collisionAt(px,py);
  return value===1;
}
function playerOnStairs(px=player.x,py=player.y){
  return currentMap==='town'&&authoredMaskAt(stairMask,px,py+22);
}
function stairWalkwayAt(px,py){
  return currentMap==='town'&&authoredMaskAt(stairMask,px,py+22);
}

function pointInTileRect(px,py,r){
  const tx=px/tile, ty=py/tile;
  return tx>=r.x && tx<r.x+r.w && ty>=r.y && ty<r.y+r.h;
}

function landAtPoint(px,py){
  // Bridges are explicit walkable surfaces even when they cross water between land masses.
  if(bridgeWalkRects.some(r=>pointInTileRect(px,py,r))) return true;
  const tx=px/tile, ty=py/tile;
  return landRects.some(r=>pointInTileRect(px,py,r));
}

function landAtFootprint(px,py){
  const samples=[[-12,-8],[0,-10],[12,-8],[-14,6],[0,8],[14,6],[-13,18],[0,24],[13,18],[-8,27],[8,27]];
  return samples.every(([ox,oy])=>landAtPoint(px+ox,py+oy));
}
function obstacleAtPoint(px,py){
  const value=townWorldStream.collisionAt(px,py);
  // Missing/pending collision data is treated as blocked so the player can never
  // outrun the streamed gameplay mask into an unvalidated area.
  return value===null?true:value===1;
}
function obstacleAtFootprint(px,py){
  // Only the character's feet collide with the authored no-walk mask.
  // A white pixel in the stair mask is an explicit walkable override, allowing
  // stairs to cross walls/curbs painted white in the blocked-area mask.
  const samples=[[-10,16],[0,14],[10,16],[-12,23],[0,27],[12,23]];
  return samples.some(([ox,oy])=>{
    const sx=px+ox,sy=py+oy;
    return obstacleAtPoint(sx,sy)&&!authoredMaskAt(stairMask,sx,sy);
  });
}
function townBuildingHeightAtFootprint(px,py){
  // Buildings retain solid collision while airborne unless the player's actual
  // lift exceeds the building's authored pixel height. Non-building mask objects
  // are treated as jumpable barriers for the astronaut body.
  const samples=[[-10,16],[0,14],[10,16],[-12,23],[0,27],[12,23]];
  let tallest=0;
  for(const b of buildings){
    const margin=18;
    const left=b.x*tile-margin,right=(b.x+b.w)*tile+margin,top=b.y*tile-margin,bottom=(b.y+b.h)*tile+margin;
    if(samples.some(([ox,oy])=>px+ox>=left&&px+ox<=right&&py+oy>=top&&py+oy<=bottom)){
      tallest=Math.max(tallest,b.h*tile);
    }
  }
  return tallest;
}
function astronautTownObstacleBlocks(px,py,lift=jumpLift()){
  if(!obstacleAtFootprint(px,py))return false;
  const buildingHeight=townBuildingHeightAtFootprint(px,py);
  if(buildingHeight>0)return lift<buildingHeight;
  return lift<ASTRONAUT_LOW_GRAVITY.barrierClearance;
}
function blocked(nx,ny){
  const activeSize=ATM_MAPS.pixelSize(currentMap);
  const mapW=activeSize.w;
  const mapH=activeSize.h;
  if(currentMap==='town'){
    const bounds=townWorldBounds();
    if(nx<bounds.minX+player.r||ny<bounds.minY+player.r||nx>bounds.maxX-player.r||ny>bounds.maxY-player.r)return true;
  }else if(nx<player.r||ny<player.r||nx>mapW-player.r||ny>mapH-player.r)return true;
  if(currentMap==='hq'){
    return hqObstacleAtFootprint(nx,ny);
  }
  if(currentMap==='gallery'){
    return galleryObstacleAtFootprint(nx,ny);
  }
  if(currentMap==='arcade'){
    return arcadeObstacleAtFootprint(nx,ny);
  }
  if(currentMap==='lounge'){
    return loungeObstacleAtFootprint(nx,ny);
  }
  // Town collision source: the user-supplied black/white collision mask only.
  // The astronaut may clear non-building barriers once sufficiently airborne,
  // but building placements remain solid unless their pixel height is lower than
  // the current jump lift.
  if(astronautJumpLowGravityActive())return astronautTownObstacleBlocks(nx,ny,jumpLift());
  return obstacleAtFootprint(nx,ny);
}

const bg=document.createElement('canvas'); bg.width=1; bg.height=1; const g=bg.getContext('2d'); g.imageSmoothingEnabled=false;
const pavementTexture=new Image();
pavementTexture.src='assets/environment/pavement-texture.webp';
pavementTexture.onload=()=>setTimeout(()=>{try{terrainChunks.clear();renderBackground();}catch(e){}},0);
const hqBuildingSprite=new Image();
hqBuildingSprite.src='assets/maps/town/runtime/hq-building.webp';
hqBuildingSprite.onload=()=>{};
const grassTileSprites=[
  (()=>{const i=new Image();i.src='assets/environment/grass/grass-01.webp';i.onload=()=>setTimeout(()=>{try{terrainChunks.clear();}catch(e){}},0);return i;})(),
  (()=>{const i=new Image();i.src='assets/environment/grass/grass-02.png';i.onload=()=>setTimeout(()=>{try{terrainChunks.clear();}catch(e){}},0);return i;})(),
  (()=>{const i=new Image();i.src='assets/environment/grass/grass-03.webp';i.onload=()=>setTimeout(()=>{try{terrainChunks.clear();}catch(e){}},0);return i;})(),
  (()=>{const i=new Image();i.src='assets/environment/grass/grass-04.webp';i.onload=()=>setTimeout(()=>{try{terrainChunks.clear();}catch(e){}},0);return i;})(),
  (()=>{const i=new Image();i.src='assets/environment/grass/grass-05.png';i.onload=()=>setTimeout(()=>{try{terrainChunks.clear();}catch(e){}},0);return i;})()
];
const treeSprite=new Image();
treeSprite.src='assets/environment/tree.png';
treeSprite.onload=()=>{};
const nftMegaSprite=new Image();
nftMegaSprite.src='assets/maps/town/runtime/nft-mega.png';
hqBuildingSprite.addEventListener('error',()=>console.error('ATM HQ sprite failed to load'));
nftMegaSprite.addEventListener('error',()=>console.error('NFT Art Gallery sprite failed to load'));


function drawPixelTile(x,y,size,base,alt1,alt2){
  g.fillStyle=base; g.fillRect(x,y,size,size);
  for(let py=0; py<size; py+=6) for(let px=0; px<size; px+=6){
    const r=rand2((x+px)/size,(y+py)/size);
    g.fillStyle = r>.66?alt1:(r>.33?alt2:base);
    g.fillRect(x+px+1,y+py+1,3,3);
  }
}
function drawGrassBlade(x,y,h,c1,c2){
  g.fillStyle=c1; g.fillRect(x,y,2,h);
  g.fillStyle=c2; g.fillRect(x+2,y-2,2,h+2);
  g.fillRect(x+4,y,2,h);
}
function drawFlowerCluster(x,y,palette){
  const p=palette||['#ffd166','#ff8dc7','#ffffff','#84f2ff'];
  g.fillStyle='#4d9238'; g.fillRect(x+3,y+5,2,4);
  const pts=[[3,0],[0,3],[6,3],[3,6]];
  for(let i=0;i<4;i++){ g.fillStyle=p[i%p.length]; g.fillRect(x+pts[i][0],y+pts[i][1],3,3); }
  g.fillStyle='#fff7cc'; g.fillRect(x+3,y+3,3,3);
}
function drawRock(x,y,s=1){
  g.fillStyle='#7c725f'; g.fillRect(x,y,5*s,4*s);
  g.fillStyle='#958a75'; g.fillRect(x+1*s,y+1*s,3*s,2*s);
  g.fillStyle='#5e5749'; g.fillRect(x+4*s,y+2*s,1*s,1*s);
}
function drawGrassTile(tx,ty){
  const x=tx*tile,y=ty*tile;
  const seed=rand2(tx,ty);
  const base=['#7fbe4c','#84c451','#79b948','#8ac95a'][Math.floor(seed*4)];
  const alt1='#9ad965', alt2='#6ea53f';
  drawPixelTile(x,y,tile,base,alt1,alt2);

  // dark leafy fringe around the tile, inspired by the sample sheet
  g.fillStyle='rgba(60,95,32,.50)';
  for(let i=0;i<tile;i+=4){
    if(rand2(tx*13+i,ty*7)>0.35) g.fillRect(x+i,y,3,2);
    if(rand2(tx*11+i,ty*9)>0.35) g.fillRect(x+i,y+tile-2,3,2);
    if(rand2(tx*17,ty*5+i)>0.35) g.fillRect(x,y+i,2,3);
    if(rand2(tx*19,ty*3+i)>0.35) g.fillRect(x+tile-2,y+i,2,3);
  }

  // base grass tufts
  for(let i=0;i<4;i++){
    const rx=Math.floor(rand2(tx*7+i,ty*5+i)*34)+6, ry=Math.floor(rand2(tx*11+i,ty*9+i)*30)+10;
    drawGrassBlade(x+rx,y+ry,5+(i%2),'#4f9739','#a7ec70');
  }

  const variant=Math.floor(rand2(tx*31+4,ty*29+7)*6);
  if(variant===1){
    drawFlowerCluster(x+6,y+6,['#ff9acb','#b9f56a','#fff2a8','#7be4ff']);
    drawFlowerCluster(x+34,y+31,['#ffd166','#ffffff','#ff8dc7','#84f2ff']);
    drawRock(x+36,y+6,1); drawRock(x+7,y+35,1);
  }else if(variant===2){
    for(let i=0;i<3;i++) drawFlowerCluster(x+8+i*11,y+34-(i%2)*2,['#fff3b0','#ffffff','#ff9acb','#a5f0ff']);
    drawFlowerCluster(x+33,y+8,['#ff9acb','#ffffff','#fff3b0','#84f2ff']);
  }else if(variant===3){
    g.fillStyle='#8b6d4a';
    const patches=[[10,9,10,7],[29,26,11,8],[32,10,8,7]];
    for(const p of patches){ g.fillRect(x+p[0],y+p[1],p[2],p[3]); }
    g.fillStyle='rgba(255,255,255,.10)'; g.fillRect(x+11,y+10,6,2); g.fillRect(x+30,y+27,6,2);
    drawRock(x+6,y+31,1); drawRock(x+37,y+7,1);
  }else if(variant===4){
    for(let i=0;i<5;i++) drawFlowerCluster(x+4+i*8,y+4+(i%2)*28,['#ff9acb','#b5f26d','#ffffff','#84f2ff']);
  }else if(variant===5){
    // cleaner lawn tile with just subtle flowers
    drawFlowerCluster(x+32,y+8,['#ffd166','#ff9acb','#ffffff','#84f2ff']);
    drawFlowerCluster(x+9,y+30,['#ffffff','#84f2ff','#ffd166','#ff9acb']);
  }else{
    if(rand2(tx+5,ty+8)>.55){
      drawFlowerCluster(x+Math.floor(rand2(tx+2,ty+9)*24)+8,y+Math.floor(rand2(tx+8,ty+3)*18)+12,['#ffd166','#ff8dc7','#ffffff','#84f2ff']);
    }
  }
}
function drawWater(){
  g.fillStyle='#1580bf'; g.fillRect(0,0,bg.width,bg.height);
  for(let y=0;y<bg.height;y+=12){
    for(let x=((y*3)%84)-30;x<bg.width+30;x+=84){
      g.fillStyle='rgba(255,255,255,.10)'; g.fillRect(x,y,20,2); g.fillRect(x+12,y+6,12,2);
      g.fillStyle='rgba(0,0,0,.06)'; g.fillRect(x+24,y+3,10,2);
    }
  }
}
function drawLand(){
  for(const r of landRects){
    for(let yy=r.y; yy<r.y+r.h; yy++) for(let xx=r.x; xx<r.x+r.w; xx++) drawGrassTile(xx,yy);
    const x=r.x*tile, y=r.y*tile, w=r.w*tile, h=r.h*tile;
    // cliff rim and coast
    g.fillStyle='#5d4f46'; g.fillRect(x,y,w,6); g.fillRect(x,y+h-6,w,6); g.fillRect(x,y,6,h); g.fillRect(x+w-6,y,6,h);
    g.fillStyle='#7a6a5e';
    for(let px=x; px<x+w; px+=14){ g.fillRect(px,y+1,8,3); g.fillRect(px,y+h-5,8,3); }
    for(let py=y; py<y+h; py+=14){ g.fillRect(x+1,py,3,8); g.fillRect(x+w-5,py,3,8); }
    g.strokeStyle='rgba(255,255,255,.18)'; g.lineWidth=2;
    g.strokeRect(x-1,y-1,w+2,h+2);
  }
  // beach sand
  g.fillStyle='#e8cb7d'; g.fillRect(29*tile,22.7*tile,4*tile,3.3*tile);
  for(let y=22.8*tile; y<25.8*tile; y+=10) for(let x=29.1*tile; x<32.6*tile; x+=14){ g.fillStyle='rgba(255,255,255,.08)'; g.fillRect(x,y,5,2); }
}
function roundedRectPath(C,x,y,w,h,r){
  r=Math.max(0,Math.min(r,w/2,h/2));
  C.moveTo(x+r,y);
  C.lineTo(x+w-r,y); C.arcTo(x+w,y,x+w,y+r,r);
  C.lineTo(x+w,y+h-r); C.arcTo(x+w,y+h,x+w-r,y+h,r);
  C.lineTo(x+r,y+h); C.arcTo(x,y+h,x,y+h-r,r);
  C.lineTo(x,y+r); C.arcTo(x,y,x+r,y,r);
  C.closePath();
}
function fillPavementPattern(C,x,y,w,h,worldOffsetX=0,worldOffsetY=0){
  if(pavementTexture.complete&&pavementTexture.naturalWidth){
    const tw=128,th=128;
    const startX=x-(((x+worldOffsetX)%tw)+tw)%tw;
    const startY=y-(((y+worldOffsetY)%th)+th)%th;
    for(let py=startY;py<y+h;py+=th) for(let px=startX;px<x+w;px+=tw){
      C.drawImage(pavementTexture,px,py,tw,th);
    }
  }else{
    C.fillStyle='#777773'; C.fillRect(x,y,w,h);
  }
}
function drawPathRect(p){
  const x=Math.floor(p.x*tile), y=Math.floor(p.y*tile), w=Math.floor(p.w*tile), h=Math.floor(p.h*tile);
  const radius=Math.min(16,Math.max(5,Math.min(w,h)*.22));
  g.save();
  g.beginPath(); roundedRectPath(g,x-4,y-4,w+8,h+8,radius+4); g.clip();
  g.fillStyle='#555553'; g.fillRect(x-4,y-4,w+8,h+8);
  g.restore();
  g.save();
  g.beginPath(); roundedRectPath(g,x,y,w,h,radius); g.clip();
  fillPavementPattern(g,x,y,w,h,0,0);
  g.fillStyle='rgba(255,255,255,.07)'; g.fillRect(x,y,w,3);
  g.restore();
}
function sign(x,y,text,w=150,target=g){
  const G=target;
  G.fillStyle='rgba(0,0,0,.18)'; G.fillRect(x-w/2+6,y-12,w,32);
  G.fillStyle='#6a4420'; G.fillRect(x-w/2,y-18,w,36); G.strokeStyle='#3f2b13'; G.lineWidth=5; G.strokeRect(x-w/2,y-18,w,36);
  G.fillStyle='#f7e7bf'; G.font='900 12px monospace'; G.textAlign='center'; G.fillText(text,x,y+5);
}
function bush(x,y,s=1,target=g){
  const G=target;
  G.fillStyle='rgba(0,0,0,.16)'; G.beginPath(); G.ellipse(x,y+7*s,16*s,6*s,0,0,Math.PI*2); G.fill();
  G.fillStyle='#2e6d33'; G.beginPath(); G.arc(x-8*s,y,9*s,0,Math.PI*2); G.arc(x+1*s,y-4*s,11*s,0,Math.PI*2); G.arc(x+11*s,y+1*s,8*s,0,Math.PI*2); G.fill();
  G.fillStyle='#66c35a'; G.beginPath(); G.arc(x-5*s,y-4*s,4*s,0,Math.PI*2); G.arc(x+8*s,y-6*s,3*s,0,Math.PI*2); G.fill();
}
function drawTreeEntity(target,tx,ty,s=1){
  const baseX=tx*tile+24, baseY=ty*tile+46;
  const drawH=207*s, drawW=183*s;
  const drawX=Math.floor(baseX-drawW/2), drawY=Math.floor(baseY-drawH+4);
  target.save();
  target.imageSmoothingEnabled=false;
  target.fillStyle='rgba(0,0,0,.14)';
  target.beginPath();
  target.ellipse(baseX,baseY+3,24*s,9*s,0,0,Math.PI*2);
  target.fill();
  if(treeSprite.complete && treeSprite.naturalWidth){
    target.drawImage(treeSprite, drawX, drawY, Math.floor(drawW), Math.floor(drawH));
  }else{
    target.fillStyle='#5a3d1c'; target.fillRect(baseX-4*s,baseY-24*s,8*s,26*s);
    target.fillStyle='#1f5e2f'; target.beginPath(); target.arc(baseX,baseY-42*s,24*s,0,Math.PI*2); target.fill();
    target.fillStyle='#2c8b43'; target.beginPath(); target.arc(baseX-12*s,baseY-52*s,16*s,0,Math.PI*2); target.arc(baseX+11*s,baseY-50*s,15*s,0,Math.PI*2); target.fill();
  }
  target.restore();
}
function lamp(tx,ty,target=g){
  const G=target,x=tx*tile,y=ty*tile;
  G.fillStyle='rgba(255,218,109,.16)'; G.beginPath(); G.arc(x,y-6,24,0,Math.PI*2); G.fill();
  G.fillStyle='rgba(0,0,0,.15)'; G.beginPath(); G.ellipse(x,y+23,7,3,0,0,Math.PI*2); G.fill();
  G.fillStyle='#34404a'; G.fillRect(x-3,y-8,6,30); G.fillStyle='#f1d36d'; G.beginPath(); G.arc(x,y-12,6,0,Math.PI*2); G.fill();
}
function bench(x,y,h=true,target=g){
  const G=target; x*=tile; y*=tile;
  G.fillStyle='rgba(0,0,0,.14)'; G.fillRect(x-14,y+7,28,5);
  G.fillStyle='#6a4720';
  if(h){ G.fillRect(x-16,y-5,32,10); G.fillRect(x-12,y+5,4,8); G.fillRect(x+8,y+5,4,8); }
  else { G.fillRect(x-5,y-16,10,32); G.fillRect(x+5,y-12,8,4); G.fillRect(x+5,y+8,8,4); }
}
function flowerbed(f,target=g){
  const G=target;
  G.fillStyle='rgba(0,0,0,.14)'; G.fillRect(f.x*tile+4,f.y*tile+4,f.w*tile,f.h*tile);
  G.fillStyle='#705132'; G.fillRect(f.x*tile,f.y*tile,f.w*tile,f.h*tile);
  for(let i=0;i<10;i++){
    G.fillStyle=i%2?f.c:'#ffffff'; G.beginPath(); G.arc(f.x*tile+8+i*(f.w*tile-16)/9,f.y*tile+f.h*tile/2+((i%3)-1)*2,3,0,Math.PI*2); G.fill();
    G.fillStyle='#4e9d45'; G.fillRect(f.x*tile+8+i*(f.w*tile-16)/9,f.y*tile+f.h*tile/2+2,1.5,4);
  }
}
function drawCrate(c,target=g){
  const G=target,x=c[0]*tile,y=c[1]*tile;
  G.fillStyle='rgba(0,0,0,.15)'; G.fillRect(x+3,y+3,16,16);
  G.fillStyle='#976a31'; G.fillRect(x,y,16,16); G.strokeStyle='#65461b'; G.lineWidth=2; G.strokeRect(x,y,16,16);
  G.beginPath(); G.moveTo(x+2,y+2); G.lineTo(x+14,y+14); G.moveTo(x+14,y+2); G.lineTo(x+2,y+14); G.stroke();
}
function drawFence(f,target=g){
  const G=target,x1=f.x1*tile,y1=f.y1*tile,x2=f.x2*tile,y2=f.y2*tile;
  G.strokeStyle='#7b5b35'; G.lineWidth=4; G.beginPath(); G.moveTo(x1,y1+5); G.lineTo(x2,y2+5); G.stroke();
  const len=Math.hypot(x2-x1,y2-y1),steps=Math.max(1,Math.floor(len/22));
  for(let i=0;i<=steps;i++){
    const t=i/steps,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;
    G.beginPath(); G.moveTo(x,y); G.lineTo(x,y+14); G.stroke();
  }
}

function drawBuilding(b,target=g){
  const G=target;
  const x=b.x*tile,y=b.y*tile,w=b.w*tile,h=b.h*tile;
  const cx=x+w/2;
  // Keep every building pixel above its logical baseline so structures meet roads cleanly.
  G.save(); G.beginPath(); G.rect(x-48,y-96,w+96,h+160); G.clip();
  const shadow=(rx=w*0.42, ry=16, oy=8)=>{ G.fillStyle='rgba(0,0,0,.22)'; G.beginPath(); G.ellipse(cx,y+h+oy,rx,ry,0,0,Math.PI*2); G.fill(); };
  const neonBox=(bx,by,bw,bh,accent,text1,text2='')=>{
    G.shadowColor=accent; G.shadowBlur=12; G.fillStyle='#15212b'; G.fillRect(bx,by,bw,bh); G.shadowBlur=0;
    G.strokeStyle=accent; G.lineWidth=3; G.strokeRect(bx,by,bw,bh);
    G.fillStyle=accent; G.textAlign='center';
    G.font='900 '+(text1.length>11?10:12)+'px monospace'; G.fillText(text1,bx+bw/2,by+15);
    if(text2){ G.fillStyle='#eef7ff'; G.font='900 10px monospace'; G.fillText(text2,bx+bw/2,by+28); }
  };
  const frontDoor=(dx,dy,dw=32,dh=32,accent='#58f1e6')=>{
    G.fillStyle='#081219'; G.fillRect(dx-4,dy-4,dw+8,dh+4);
    G.fillStyle=accent; G.fillRect(dx,dy,dw,dh);
    G.fillStyle='rgba(255,255,255,.20)'; G.fillRect(dx+5,dy+5,dw-10,7);
    G.fillStyle='rgba(255,255,255,.35)'; G.fillRect(dx+dw-9,dy+dh/2,3,3);
  };
  const pillars=(count=2, top=y+22, bottom=y+h-40, color='#495763')=>{
    const gap=w/(count+1);
    G.fillStyle=color;
    for(let i=1;i<=count;i++){
      const px=x+gap*i-6; G.fillRect(px,top,12,bottom-top);
      G.fillStyle='rgba(255,255,255,.12)'; G.fillRect(px+2,top,2,bottom-top);
      G.fillStyle=color;
    }
  };
  const windows=(cols,rows,wx,wy,ww,wh,stepX,stepY,c1='rgba(120,220,255,.18)',c2='rgba(255,255,255,.08)')=>{
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const px=wx+c*stepX, py=wy+r*stepY; G.fillStyle=c1; G.fillRect(px,py,ww,wh); G.fillStyle=c2; G.fillRect(px+1,py+1,ww-2,2);
    }
  };
  const roofCap=(color='#303842', lip='#5b6875')=>{
    G.fillStyle=color; G.fillRect(x-8,y-10,w+16,22); G.fillStyle=lip; G.fillRect(x-4,y-6,w+8,6);
  };

  if(b.id==='hq' && hqBuildingSprite.complete && hqBuildingSprite.naturalWidth){
    shadow(w*0.46,20,8);
    G.drawImage(hqBuildingSprite,x,y,w,h);
    G.restore(); return;
  }

  if(b.id==='nftmega' && nftMegaSprite.complete && nftMegaSprite.naturalWidth){
    shadow(w*0.47,18,7);
    const aspect=nftMegaSprite.naturalWidth/nftMegaSprite.naturalHeight;
    const drawH=h+54;
    const drawW=Math.min(w+28,drawH*aspect);
    const drawX=x+(w-drawW)/2;
    const drawY=y+h-drawH+12;
    G.drawImage(nftMegaSprite,drawX,drawY,drawW,drawH);
    G.restore(); return;
  }

  if(b.id==='welcome'){
    shadow(w*0.32,10,6);
    G.fillStyle='#5d3d20'; G.fillRect(x+18,y+18,10,h+20); G.fillRect(x+w-28,y+18,10,h+20);
    G.fillStyle='#7a542d'; G.fillRect(x+8,y+2,w-16,h+14);
    G.fillStyle='#201913'; G.fillRect(x+16,y+10,w-32,h-2);
    G.strokeStyle='#a37243'; G.lineWidth=3; G.strokeRect(x+10,y+4,w-20,h+10);
    G.fillStyle='#58f166'; G.textAlign='center'; G.font='900 10px monospace'; G.fillText('WELCOME TO',cx,y+22);
    G.font='900 18px monospace'; G.fillText('ATM TOWN',cx,y+42);
    G.fillStyle='#dceeff'; G.font='900 9px monospace'; G.fillText('BUILT ON THE XRPL',cx,y+58);
    G.restore(); return;
  }

  if(b.id==='market'){
    shadow();
    G.fillStyle='#5e3e23'; G.fillRect(x+10,y+14,w,h-6);
    G.fillStyle='#7a5430'; G.fillRect(x,y+8,w,h-12);
    roofCap('#144f8a','#3c7bcb');
    G.fillStyle='#2c6fbc'; G.fillRect(x+10,y+32,w-20,18);
    for(let i=0;i<5;i++){ G.fillStyle=i%2?'#ffffff':'#76b8ff'; G.fillRect(x+12+i*((w-24)/5),y+32,(w-24)/5,18); }
    windows(2,2,x+18,y+58,18,14,32,20,'rgba(165,220,255,.32)');
    frontDoor(x+w/2-18,y+h-34,36,30,'#7fc8ff');
    neonBox(x+12,y+8,w-24,24,'#69b7ff','XP','MARKET');
    G.restore(); return;
  }

  if(b.id==='bank'){
    shadow(w*0.4,16,8);
    G.fillStyle='#4f4338'; G.fillRect(x+10,y+16,w,h-2);
    G.fillStyle='#6a5a49'; G.fillRect(x,y+8,w,h-10);
    roofCap('#2f2d2d','#4d4949');
    pillars(3,y+36,y+h-30,'#8e7f6c');
    G.fillStyle='#c9b79f'; G.fillRect(x+10,y+26,w-20,16);
    frontDoor(x+w/2-16,y+h-34,32,30,'#f4d67e');
    G.fillStyle='#f2e3a9'; G.beginPath(); G.arc(x+w/2,y+h-56,10,0,Math.PI*2); G.fill();
    G.fillStyle='#66510b'; G.font='900 10px monospace'; G.fillText('$',x+w/2,y+h-52);
    neonBox(x+10,y+8,w-20,24,'#ffd166','BANK');
    G.restore(); return;
  }

  if(b.id==='atm'){
    shadow(w*0.34,12,5);
    G.fillStyle='#102118'; G.fillRect(x+8,y+12,w,h-2);
    G.fillStyle='#1d3527'; G.fillRect(x,y+8,w,h-10);
    roofCap('#0c1711','#22432f');
    G.fillStyle='#4bff67'; G.fillRect(x+8,y+22,8,h-44); G.fillRect(x+w-16,y+22,8,h-44);
    frontDoor(x+w/2-16,y+h-32,32,28,'#52ff7a');
    G.fillStyle='#7dff9f'; G.fillRect(x+w/2-12,y+h-58,24,12); G.fillStyle='#0b1217'; G.fillRect(x+w/2-8,y+h-56,16,4);
    neonBox(x+6,y+8,w-12,22,'#4bff67','ATM KIOSK');
    G.restore(); return;
  }

  if(b.id==='gallery'){
    shadow();
    G.fillStyle='#4f2660'; G.fillRect(x+10,y+16,w,h);
    G.fillStyle='#6e3585'; G.fillRect(x,y+10,w,h-8);
    roofCap('#31183d','#69348a');
    neonBox(x+8,y+8,w-16,26,'#f16aff','NFT','GALLERY');
    G.fillStyle='#140a1d'; G.fillRect(x+18,y+44,w-36,h-64);
    G.shadowColor='#f16aff'; G.shadowBlur=18; G.strokeStyle='#f16aff'; G.lineWidth=3; G.strokeRect(x+18,y+44,w-36,h-64); G.shadowBlur=0;
    G.fillStyle='#cb8cff'; G.beginPath(); G.moveTo(cx,y+54); G.lineTo(cx-12,y+74); G.lineTo(cx,y+94); G.lineTo(cx+12,y+74); G.closePath(); G.fill();
    G.fillStyle='#8d55b2'; G.fillRect(x+w-14,y+34,10,h-46);
    G.restore(); return;
  }

  if(b.id==='shop'){
    shadow();
    G.fillStyle='#6f4916'; G.fillRect(x+10,y+16,w,h-2);
    G.fillStyle='#946422'; G.fillRect(x,y+10,w,h-10);
    roofCap('#6f4411','#a6792f');
    neonBox(x+10,y+8,w-20,24,'#ffcf54','MERCHANT','SHOP');
    for(let i=0;i<6;i++){ G.fillStyle=i%2?'#f0bd3b':'#ffe18f'; G.fillRect(x+16+i*((w-32)/6),y+40,(w-32)/6,18); }
    windows(2,1,x+16,y+66,16,12,w-48,0,'rgba(255,240,180,.22)');
    frontDoor(x+w/2-14,y+h-30,28,26,'#f8d36d');
    G.fillStyle='#cc9a3f'; G.fillRect(x+w-14,y+46,8,26);
    G.restore(); return;
  }

  if(b.id==='arena'){
    shadow(w*0.45,18,8);
    G.fillStyle='#4e235c'; G.fillRect(x+10,y+16,w,h);
    G.fillStyle='#6a2e7d'; G.fillRect(x,y+10,w,h-8);
    roofCap('#35163f','#6d2d82');
    neonBox(x+16,y+10,w-32,28,'#d96bff','EVENT','ARENA');
    G.fillStyle='#28132f'; G.fillRect(x+w/2-18,y+h-36,36,36);
    G.fillStyle='#d96bff'; G.fillRect(x+14,y+40,12,h-42); G.fillRect(x+w-26,y+40,12,h-42);
    G.fillStyle='#f0e6ff'; G.fillRect(x+w/2-14,y+h-28,28,18); G.strokeStyle='#d96bff'; G.lineWidth=3; G.strokeRect(x+w/2-14,y+h-28,28,18);
    G.restore(); return;
  }

  if(b.id==='partner'){
    shadow(w*0.38,14,8);
    G.fillStyle='#6e6458'; G.fillRect(x+8,y+14,w,h-4);
    G.fillStyle='#8f8678'; G.fillRect(x,y+10,w,h-8);
    roofCap('#4b5565','#7b8595');
    neonBox(x+10,y+8,w-20,24,'#84cfff','PARTNER','PLAZA');
    G.fillStyle='#c7c1b6'; G.fillRect(x+14,y+44,w-28,h-46);
    G.fillStyle='#36a9ef'; G.beginPath(); G.arc(cx,y+h-18,14,0,Math.PI*2); G.fill(); G.strokeStyle='#9be7ff'; G.lineWidth=3; G.stroke();
    G.fillStyle='#5e574d'; G.fillRect(x+20,y+42,10,h-36); G.fillRect(x+w-30,y+42,10,h-36);
    G.restore(); return;
  }

  if(b.id==='bridge'){
    shadow(w*0.4,10,5);
    G.fillStyle='#485767'; G.fillRect(x,y+18,w,h-4);
    G.fillStyle='#31404f'; G.fillRect(x+12,y+24,w-24,h-10);
    G.fillStyle='#697a8c'; G.fillRect(x+10,y+6,w-20,22);
    G.strokeStyle='#6fb2ff'; G.lineWidth=3; G.strokeRect(x+14,y+10,w-28,14);
    G.fillStyle='#cfe7ff'; G.font='900 12px monospace'; G.textAlign='center'; G.fillText('XRPL',cx,y+20); G.fillText('BRIDGE',cx,y+34);
    G.fillStyle='#58f166'; G.fillRect(x+8,y+h-10,10,22); G.fillRect(x+w-18,y+h-10,10,22);
    G.restore(); return;
  }

  if(b.id==='powered'){
    shadow(w*0.34,10,5);
    G.fillStyle='#232f3b'; G.fillRect(x+16,y+18,w-10,h-8);
    G.fillStyle='#394857'; G.fillRect(x,y+10,w,h-12);
    G.fillStyle='#546679'; G.fillRect(x-4,y+6,w+8,8);
    G.fillStyle='#3f4d59'; G.fillRect(x+22,y+h-6,10,22); G.fillRect(x+w-32,y+h-6,10,22);
    neonBox(x+10,y+18,w-20,h-28,'#78baff','XRPL','POWERED');
    G.restore(); return;
  }

  // generic fallback 3D building
  shadow();
  G.fillStyle='#465462'; G.fillRect(x+10,y+16,w,h-2);
  G.fillStyle='#60707f'; G.fillRect(x,y+10,w,h-8);
  roofCap();
  windows(Math.max(2,Math.floor(w/42)),2,x+16,y+42,14,10,26,18);
  frontDoor(x+w/2-16,y+h-32,32,28,'#58f1e6');
  neonBox(x+12,y+8,w-24,24,'#58f1e6',b.name);
  G.restore();
}
function drawHouse(h,target=g){
  const G=target;
  const x=h.x*tile,y=h.y*tile;
  G.fillStyle='rgba(0,0,0,.18)'; G.beginPath(); G.ellipse(x,y+26,28,10,0,0,Math.PI*2); G.fill();
  G.fillStyle='#b89d73'; G.fillRect(x-26,y-6,52,42);
  G.fillStyle='#d7c095'; G.fillRect(x-32,y-12,52,42);
  G.fillStyle='#c6b08a'; G.fillRect(x+20,y-10,10,38);
  G.fillStyle=h.roof; G.beginPath(); G.moveTo(x-36,y-12); G.lineTo(x-4,y-40); G.lineTo(x+24,y-12); G.closePath(); G.fill();
  G.fillStyle='rgba(255,255,255,.12)'; G.fillRect(x-24,y-2,14,12); G.fillRect(x+2,y-2,14,12);
  G.fillStyle='#dff3ff'; G.fillRect(x-23,y-1,12,10); G.fillRect(x+3,y-1,12,10);
  G.fillStyle='#6a4720'; G.fillRect(x-4,y+8,12,28);
  G.fillStyle='#ffffff'; G.fillRect(x-30,y+30,46,6);
  G.fillStyle='#b5412b'; G.fillRect(x+24,y+18,7,13);
}
function drawNPC(n){ const x=n.x*tile,y=n.y*tile; g.fillStyle='rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x,y+12,10,5,0,0,Math.PI*2); g.fill(); g.fillStyle=n.c; g.fillRect(x-8,y-10,16,20); g.fillStyle='#f0c496'; g.fillRect(x-6,y-18,12,10); g.fillStyle='#222'; g.fillRect(x-2,y-15,2,2); g.fillRect(x+2,y-15,2,2); g.fillStyle='#111'; g.fillRect(x-8,y+10,6,10); g.fillRect(x+2,y+10,6,10); }


function renderBackground(){
  g.clearRect(0,0,bg.width,bg.height);
  drawWater();
  drawLand();
  for(const p of pathRects) drawPathRect(p);

  // grand central plaza
  const cx=36.0*tile, cy=29.5*tile;
  g.fillStyle='#bcaf9c'; g.beginPath(); g.arc(cx,cy,132,0,Math.PI*2); g.fill();
  g.fillStyle='#ac9f8c'; g.beginPath(); g.arc(cx,cy,112,0,Math.PI*2); g.fill();
  g.strokeStyle='#817564'; g.lineWidth=3; for(let r=118;r>=70;r-=16){ g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.stroke(); }
  for(let a=0;a<8;a++){ const ang=a*Math.PI/4; g.strokeStyle='rgba(255,255,255,.16)'; g.lineWidth=4; g.beginPath(); g.moveTo(cx+Math.cos(ang)*64,cy+Math.sin(ang)*64); g.lineTo(cx+Math.cos(ang)*118,cy+Math.sin(ang)*118); g.stroke(); }
  g.fillStyle='#42ace9'; g.beginPath(); g.arc(cx,cy,56,0,Math.PI*2); g.fill();
  g.strokeStyle='#84e6ff'; g.lineWidth=3; g.beginPath(); g.arc(cx,cy,56,0,Math.PI*2); g.stroke();
  g.fillStyle='#2f4454'; g.beginPath(); g.arc(cx,cy,36,0,Math.PI*2); g.fill();
  g.strokeStyle='#e6f7ff'; g.lineWidth=6; g.beginPath(); g.moveTo(cx-16,cy-10); g.lineTo(cx+16,cy+10); g.moveTo(cx+16,cy-10); g.lineTo(cx-16,cy+10); g.stroke();

  // partner fountain
  g.fillStyle='#b6aa98'; g.beginPath(); g.arc(37.3*tile,6.6*tile,44,0,Math.PI*2); g.fill();
  g.fillStyle='#38a9ef'; g.beginPath(); g.arc(37.3*tile,6.6*tile,26,0,Math.PI*2); g.fill();
  g.strokeStyle='#8ce5ff'; g.lineWidth=3; g.beginPath(); g.arc(37.3*tile,6.6*tile,26,0,Math.PI*2); g.stroke();

  // Decorative props are rendered as separate depth-sorted entities.

  // docks
  g.fillStyle='#7b5430'; g.fillRect(34.5*tile,44.0*tile,3.0*tile,4.0*tile);
  for(let i=0;i<10;i++){ g.strokeStyle='#5a3c21'; g.lineWidth=2; g.beginPath(); g.moveTo((2.0+i*0.62)*tile,24.6*tile); g.lineTo((2.0+i*0.62)*tile,28.4*tile); g.stroke(); }
  g.fillStyle='#2f7fc5'; g.fillRect(4.1*tile,25.6*tile,1.6*tile,1.0*tile); g.fillStyle='#e9f7ff'; g.fillRect(4.55*tile,25.18*tile,0.72*tile,0.42*tile);

  // beach / housing details
  g.fillStyle='#d9c58c'; g.beginPath(); g.moveTo(37.5*tile,27.4*tile); g.lineTo(41*tile,26.6*tile); g.lineTo(41*tile,30*tile); g.lineTo(36.8*tile,30*tile); g.closePath(); g.fill();
  g.fillStyle='#ffffff'; g.fillRect(39.0*tile,28.0*tile,16,4); g.fillRect(39.0*tile,28.4*tile,16,4);
  g.fillStyle='#5fa0dd'; g.fillRect(39.4*tile,27.2*tile,8,24);
  g.fillStyle='#8e6138'; g.fillRect(40.2*tile,28.5*tile,18,6); g.fillRect(39.7*tile,28.8*tile,18,6);

}

const CHUNK_TILES=16;
const CHUNK_PX=CHUNK_TILES*tile;
const terrainChunks=new Map();
let terrainChunkTick=0;
function rectsIntersect(a,b){return a.x<a.x+b.w && b.x<a.x+a.w && a.y<b.y+b.h && b.y<a.y+a.h;}
function tileOnLand(tx,ty){const px=tx+.5,py=ty+.5;return landRects.some(r=>px>=r.x&&px<r.x+r.w&&py>=r.y&&py<r.y+r.h);}
function tileOnGrass(tx,ty){const px=tx+.5,py=ty+.5;return grassRects.some(r=>px>=r.x&&px<r.x+r.w&&py>=r.y&&py<r.y+r.h);}
function tileOnForestBorder(tx,ty){
  const edge=4;
  if(tileOnLand(tx,ty)) return false;
  return tx<edge || ty<edge || tx>=world.w-edge;
}
function drawChunkForestBorder(G,tx,ty,ox,oy){
  const x=tx*tile-ox,y=ty*tile-oy;
  const r=rand2(tx*71+9,ty*67+3);
  G.fillStyle=r>.5?'#173d24':'#1d4829'; G.fillRect(x,y,tile,tile);
  G.fillStyle='rgba(8,27,14,.45)'; G.fillRect(x,y+tile-5,tile,5);
  const cx=x+10+rand2(tx*13,ty*17)*28, cy=y+18+rand2(tx*19,ty*11)*18;
  G.fillStyle='#3a2817'; G.fillRect(cx-3,cy,6,18);
  G.fillStyle='#0b2d18'; G.beginPath(); G.arc(cx,cy-10,22,0,Math.PI*2); G.fill();
  G.fillStyle='#15552a'; G.beginPath(); G.arc(cx-9,cy-16,14,0,Math.PI*2); G.arc(cx+9,cy-15,13,0,Math.PI*2); G.fill();
  G.fillStyle='#28743a'; G.beginPath(); G.arc(cx-3,cy-22,8,0,Math.PI*2); G.fill();
}
function drawChunkGrass(G,tx,ty,ox,oy){
  const x=tx*tile-ox,y=ty*tile-oy;
  const r=rand2(tx*37+11,ty*29+7);
  let variant=0;
  if(r>.93) variant=4;
  else if(r>.82) variant=3;
  else if(r>.66) variant=2;
  else if(r>.48) variant=1;
  const img=grassTileSprites[variant];
  if(img && img.complete && img.naturalWidth){
    G.save();
    G.imageSmoothingEnabled=false;
    G.drawImage(img,x,y,tile,tile);
    G.restore();
  }else{
    const base=['#718f18','#789b1d','#6d8d17'][Math.floor(rand2(tx,ty)*3)];
    G.fillStyle=base;G.fillRect(x,y,tile,tile);
    for(let py=0;py<tile;py+=5)for(let px=0;px<tile;px+=5){
      const rr=rand2(tx+px/48,ty+py/48);
      G.fillStyle=rr>.72?'#9ec332':(rr>.38?'#5f7b16':base);
      G.fillRect(x+px+1,y+py+1,3,3);
    }
  }
  G.fillStyle='rgba(91,120,21,.18)';
  G.fillRect(x,y+tile-1,tile,1);
  G.fillRect(x+tile-1,y,1,tile);
}
function drawChunkPavement(G,ox,oy){
  const cw=G.canvas.width,ch=G.canvas.height;
  const inner=document.createElement('canvas'),outer=document.createElement('canvas');
  inner.width=outer.width=cw; inner.height=outer.height=ch;
  const I=inner.getContext('2d'),O=outer.getContext('2d');
  I.imageSmoothingEnabled=false; O.imageSmoothingEnabled=false;
  I.fillStyle='#fff'; O.fillStyle='#fff';
  for(const p of pathRects){
    const x=Math.floor(p.x*tile)-ox,y=Math.floor(p.y*tile)-oy,w=Math.floor(p.w*tile),h=Math.floor(p.h*tile);
    if(x>cw+8||y>ch+8||x+w<-8||y+h<-8) continue;
    const r=Math.min(16,Math.max(5,Math.min(w,h)*.22));
    I.beginPath(); roundedRectPath(I,x,y,w,h,r); I.fill();
    O.beginPath(); roundedRectPath(O,x-4,y-4,w+8,h+8,r+4); O.fill();
  }
  const border=document.createElement('canvas'); border.width=cw;border.height=ch;
  const B=border.getContext('2d'); B.fillStyle='#555553';B.fillRect(0,0,cw,ch);B.globalCompositeOperation='destination-in';B.drawImage(outer,0,0);
  G.drawImage(border,0,0);

  const texture=document.createElement('canvas');texture.width=cw;texture.height=ch;
  const T=texture.getContext('2d');T.imageSmoothingEnabled=false;
  if(pavementTexture.complete&&pavementTexture.naturalWidth){
    const tw=128,th=128;
    const sx=-(((ox%tw)+tw)%tw),sy=-(((oy%th)+th)%th);
    for(let y=sy;y<ch;y+=th) for(let x=sx;x<cw;x+=tw) T.drawImage(pavementTexture,x,y,tw,th);
  }else{T.fillStyle='#777773';T.fillRect(0,0,cw,ch);}
  T.fillStyle='rgba(255,255,255,.055)';T.fillRect(0,0,cw,3);
  T.globalCompositeOperation='destination-in';T.drawImage(inner,0,0);
  G.drawImage(texture,0,0);
}
function renderTerrainChunk(cx,cy){
  const ox=cx*CHUNK_PX,oy=cy*CHUNK_PX;
  const cw=Math.min(CHUNK_PX,world.w*tile-ox),ch=Math.min(CHUNK_PX,world.h*tile-oy);
  const c=document.createElement('canvas');c.width=Math.max(1,cw);c.height=Math.max(1,ch);const G=c.getContext('2d');G.imageSmoothingEnabled=false;

  // Ocean fills the world beneath and around the portrait island.
  G.fillStyle='#1580bf';G.fillRect(0,0,c.width,c.height);
  for(let ly=0;ly<c.height;ly+=12){const gy=oy+ly;for(let gx=((gy*3)%84)-30;gx<ox+c.width+30;gx+=84){const lx=gx-ox;G.fillStyle='rgba(255,255,255,.10)';G.fillRect(lx,ly,20,2);G.fillRect(lx+12,ly+6,12,2);G.fillStyle='rgba(0,0,0,.06)';G.fillRect(lx+24,ly+3,10,2);}}

  const tx0=cx*CHUNK_TILES,ty0=cy*CHUNK_TILES,tx1=Math.min(world.w,tx0+CHUNK_TILES),ty1=Math.min(world.h,ty0+CHUNK_TILES);
  for(let ty=ty0;ty<ty1;ty++)for(let tx=tx0;tx<tx1;tx++)if(tileOnForestBorder(tx,ty))drawChunkForestBorder(G,tx,ty,ox,oy);

  G.save();G.translate(-ox,-oy);
  // Main concrete city island.
  for(const r of landRects){
    const x=r.x*tile,y=r.y*tile,w=r.w*tile,h=r.h*tile;
    fillPavementPattern(G,x,y,w,h,0,0);
    G.fillStyle='rgba(255,255,255,.04)';G.fillRect(x,y,w,3);
    G.fillStyle='#5d4f46';G.fillRect(x,y,w,6);G.fillRect(x,y+h-6,w,6);G.fillRect(x,y,6,h);G.fillRect(x+w-6,y,6,h);
    G.strokeStyle='rgba(255,255,255,.18)';G.lineWidth=2;G.strokeRect(x-1,y-1,w+2,h+2);
  }

  // Concrete harbor apron projects beyond the shoreline.
  const apronX=24*tile,apronY=56.5*tile,apronW=17*tile,apronH=5.5*tile;
  fillPavementPattern(G,apronX,apronY,apronW,apronH,0,0);
  G.fillStyle='#555553';G.fillRect(apronX,apronY+apronH-7,apronW,7);
  G.strokeStyle='rgba(255,255,255,.16)';G.lineWidth=3;G.strokeRect(apronX,apronY,apronW,apronH);

  // Wooden dock visibly continues deep into the ocean.
  const dockX=30.5*tile,dockY=59.5*tile,dockW=4*tile,dockH=28.5*tile;
  G.fillStyle='rgba(0,0,0,.22)';G.fillRect(dockX+8,dockY+10,dockW,dockH);
  G.fillStyle='#8a5c30';G.fillRect(dockX,dockY,dockW,dockH);
  G.fillStyle='#a7733d';G.fillRect(dockX+5,dockY+4,dockW-10,dockH-8);
  for(let yy=dockY+8;yy<dockY+dockH;yy+=18){G.strokeStyle='#5b3a20';G.lineWidth=3;G.beginPath();G.moveTo(dockX+4,yy);G.lineTo(dockX+dockW-4,yy);G.stroke();}
  G.fillStyle='#44301f';
  for(const px of [dockX+8,dockX+dockW-16])for(let yy=dockY+18;yy<dockY+dockH;yy+=72)G.fillRect(px,yy,8,26);
  G.fillStyle='#d8b36b';G.font='900 13px monospace';G.textAlign='center';G.fillText('ATM SHIP DOCK',dockX+dockW/2,dockY+28);
  G.restore();

  // Grass courtyard overlays the concrete base exactly in the lower-center area.
  for(let ty=ty0;ty<ty1;ty++)for(let tx=tx0;tx<tx1;tx++)if(tileOnGrass(tx,ty))drawChunkGrass(G,tx,ty,ox,oy);
  G.save();G.translate(-ox,-oy);
  for(const r of grassRects){
    const x=r.x*tile,y=r.y*tile,w=r.w*tile,h=r.h*tile,seg=2.6*tile;
    G.strokeStyle='#756758';G.lineWidth=8;
    G.beginPath();
    G.moveTo(x,y+seg);G.lineTo(x,y);G.lineTo(x+seg,y);
    G.moveTo(x+w-seg,y);G.lineTo(x+w,y);G.lineTo(x+w,y+seg);
    G.moveTo(x,y+h-seg);G.lineTo(x,y+h);G.lineTo(x+seg,y+h);
    G.moveTo(x+w-seg,y+h);G.lineTo(x+w,y+h);G.lineTo(x+w,y+h-seg);
    G.stroke();
  }
  G.restore();
  return c;
}
function getTerrainChunk(cx,cy){const key=cx+','+cy;let entry=terrainChunks.get(key);if(!entry){entry={canvas:renderTerrainChunk(cx,cy),last:0};terrainChunks.set(key,entry);}entry.last=++terrainChunkTick;return entry.canvas;}

function drawVisibleTownChunks(){
  const bounds=townWorldBounds();
  const view={x:cam.x,y:cam.y,w:W/zoom,h:H/zoom};
  const nightPreloadLeadMs=60000;
  const includeNight=(currentTownNightAlpha||0)>0.001||getTownNightAlpha(getSharedTownTimeMs()+nightPreloadLeadMs)>0.001;
  townWorldStream.updateView({cameraX:view.x,cameraY:view.y,viewportWidth:view.w,viewportHeight:view.h,playerX:player.x,playerY:player.y,collisionPoints:townBotsReady?townBots:[],includeNight});
  const prevSmooth=ctx.imageSmoothingEnabled;
  const prevQuality=ctx.imageSmoothingQuality;
  ctx.imageSmoothingEnabled=true;
  try{ctx.imageSmoothingQuality='high';}catch(_e){}
  if(townWorldStream.hasManifest()){
    // A lightweight overview stays underneath streamed chunks. It prevents a
    // visible blank boundary while a newly requested chunk is decoding without
    // keeping the original 3120x4320 terrain image in memory.
    if(floorMapImg.complete&&floorMapImg.naturalWidth){
      drawFloorMap(ctx,bounds.minX,bounds.minY,bounds.width,bounds.height);
      if(currentTownNightAlpha>0&&floorMapNightImg.complete&&floorMapNightImg.naturalWidth){
        const nr=getSourceRectForImage(floorMapNightImg,780,1080);
        ctx.save();ctx.globalAlpha=currentTownNightAlpha;
        ctx.drawImage(floorMapNightImg,nr.sx,nr.sy,nr.sw,nr.sh,bounds.minX,bounds.minY,bounds.width,bounds.height);
        ctx.restore();
      }
    }else{
      const fillX=Math.max(bounds.minX,view.x-2),fillY=Math.max(bounds.minY,view.y-2);
      const fillR=Math.min(bounds.maxX,view.x+view.w+2),fillB=Math.min(bounds.maxY,view.y+view.h+2);
      ctx.fillStyle='#cfc1ad';ctx.fillRect(fillX,fillY,Math.max(0,fillR-fillX),Math.max(0,fillB-fillY));
    }
    townWorldStream.drawLayer(ctx,'terrain',view,1);
    if(currentTownNightAlpha>0)townWorldStream.drawLayer(ctx,'night',view,currentTownNightAlpha);
  }else if(floorMapImg.complete&&floorMapImg.naturalWidth){
    // Lightweight overview fallback is used only while manifest/chunks initialize.
    drawFloorMap(ctx,bounds.minX,bounds.minY,bounds.width,bounds.height);
  }
  ctx.imageSmoothingEnabled=prevSmooth;
  try{ctx.imageSmoothingQuality=prevQuality||'low';}catch(_e){}
}



const hqBaseImg=new Image(); hqBaseImg.decoding='async';
hqBaseImg.src=ATM_MAPS.asset('hq','visual');
const hqCollisionImg=new Image(); hqCollisionImg.decoding='async';
hqCollisionImg.src=ATM_MAPS.asset('hq','collision');
const hqOverlayImg=new Image(); hqOverlayImg.decoding='async';
hqOverlayImg.src=ATM_MAPS.asset('hq','depth');
const hqInteractionImg=new Image(); hqInteractionImg.decoding='async';
hqInteractionImg.src=ATM_MAPS.asset('hq','interaction');


const hq=document.createElement('canvas'); hq.width=hqWorld.w*tile; hq.height=hqWorld.h*tile; const hg=hq.getContext('2d'); hg.imageSmoothingEnabled=false;
const hqObstacleMask={canvas:document.createElement('canvas'),data:null,ready:false,scale:1}; // HQ: white blocked, black walkable
const hqInteractionReader=ATM_INTERACTIONS.createMaskReader({
  id:'ATM HQ',
  image:hqInteractionImg,
  width:()=>hq.width,
  height:()=>hq.height,
  palette:ATM_INTERACTIONS.corePalette
});
const hqForegroundPieces=[];
const HQ_INTERACTION_ZONES=[
  {id:'hqDashboard',interactionType:'html',type:'html',x1:629,y1:81,x2:912,y2:214,radius:170,name:'ATM DASHBOARD WINDOW',text:'A large HTML display window for future dashboards and web experiences.'},
  {id:'hqCommandCore',interactionType:'atm',type:'atm',x1:726,y1:381,x2:816,y2:430,radius:110,name:'ATM COMMAND CORE',text:'Launch synchronized ATM Town world events from the central HQ machine.'},
  {id:'hqTreasury',interactionType:'misc',type:'misc',x1:1333,y1:656,x2:1468,y2:688,radius:95,name:'TREASURY TERMINAL',text:'A future treasury and analytics station.'},
  {id:'hqMinted',interactionType:'misc',type:'misc',x1:114,y1:1074,x2:226,y2:1122,radius:95,name:'MINTED TERMINAL',text:'This room connects to the Minted creator experience.'},
  {id:'hqXgen',interactionType:'misc',type:'misc',x1:1378,y1:1146,x2:1474,y2:1201,radius:95,name:'XGEN TERMINAL',text:'This workstation will open XGen collection tools.'},
  {id:'hqPayload',interactionType:'misc',type:'misc',x1:55,y1:1178,x2:139,y2:1234,radius:95,name:'PAYLOAD TERMINAL',text:'This workstation will open Payload and its visual money-flow tools.'}
];
function hqInteractionThing(){
  if(!hqInteractionReader.ready)return null;
  const feet=getPlayerInteractionFeet();
  let hit=hqInteractionReader.nearest(feet.x,feet.y,42,'',3);
  // The HTML dashboard is mounted above the player and intentionally has a longer reach.
  if(!hit)hit=hqInteractionReader.nearest(feet.x,feet.y,175,'html',6);
  if(!hit)return null;
  if(hit.type===ATM_INTERACTIONS.types.voice){
    return{id:'hqVoice',type:'voice',name:'ATM TOWN PROXIMITY VOICE',text:'Join voice anywhere. Nearby players on your current map will be audible.',maskDistance:hit.distance};
  }
  if(hit.type===ATM_INTERACTIONS.types.entry){
    return{id:'hqMaskExit',type:'entry',name:'EXIT TO TOWN',text:'Return to ATM Town.',maskDistance:hit.distance};
  }
  const match=ATM_INTERACTIONS.nearestZone(HQ_INTERACTION_ZONES,hit.x,hit.y,hit.typeName);
  return match?.zone||null;
}
function renderHQ(){
  hg.clearRect(0,0,hq.width,hq.height);
  if(hqBaseImg.complete&&hqBaseImg.naturalWidth){
    hg.imageSmoothingEnabled=false;
    hg.drawImage(hqBaseImg,0,0,hqBaseImg.naturalWidth,hqBaseImg.naturalHeight,0,0,hq.width,hq.height);
  }else{
    hg.fillStyle='#1b2430';
    hg.fillRect(0,0,hq.width,hq.height);
    hg.fillStyle='#8ad7ff';
    hg.font='900 24px monospace';
    hg.textAlign='center';
    hg.fillText('LOADING ATM HQ INTERIOR...',hq.width/2,hq.height/2);
  }
}
function rebuildHQCollisionMask(){
  const w=Math.max(1,Math.floor(hq.width*hqObstacleMask.scale));
  const h=Math.max(1,Math.floor(hq.height*hqObstacleMask.scale));
  const c=hqObstacleMask.canvas;c.width=w;c.height=h;
  const cctx=c.getContext('2d',{willReadFrequently:true});
  cctx.imageSmoothingEnabled=false;
  cctx.clearRect(0,0,w,h);
  if(!(hqCollisionImg.complete&&hqCollisionImg.naturalWidth)){
    hqObstacleMask.ready=false; hqObstacleMask.data=null; return;
  }
  cctx.drawImage(hqCollisionImg,0,0,hqCollisionImg.naturalWidth,hqCollisionImg.naturalHeight,0,0,w,h);
  const px=cctx.getImageData(0,0,w,h).data;
  const blocked=new Uint8Array(w*h);
  for(let i=0,p=0;i<px.length;i+=4,p++){
    const sum=px[i]+px[i+1]+px[i+2];
    blocked[p]=(px[i+3]>10 && sum>=420)?1:0;
  }
  hqObstacleMask.data=blocked;
  hqObstacleMask.ready=true;
}
function hqObstacleAtPoint(px,py){
  if(!hqObstacleMask.ready||!hqObstacleMask.data) return false;
  const w=hqObstacleMask.canvas.width,h=hqObstacleMask.canvas.height;
  const mx=Math.max(0,Math.min(w-1,Math.floor((px/hq.width)*w)));
  const my=Math.max(0,Math.min(h-1,Math.floor((py/hq.height)*h)));
  return hqObstacleMask.data[my*w+mx]===1;
}
function hqObstacleAtFootprint(px,py){
  const samples=[[-10,16],[0,14],[10,16],[-12,23],[0,27],[12,23]];
  return samples.some(([ox,oy])=>hqObstacleAtPoint(px+ox,py+oy));
}

function buildHQForegroundPieces(){
  hqForegroundPieces.length=0;
  if(!(hqBaseImg.complete&&hqBaseImg.naturalWidth&&hqOverlayImg.complete&&hqOverlayImg.naturalWidth)) return;
  const w=hq.width, h=hq.height;

  const baseCanvas=document.createElement('canvas');
  baseCanvas.width=w; baseCanvas.height=h;
  const bctx=baseCanvas.getContext('2d',{willReadFrequently:true});
  bctx.imageSmoothingEnabled=false;
  bctx.clearRect(0,0,w,h);
  bctx.drawImage(hqBaseImg,0,0,hqBaseImg.naturalWidth,hqBaseImg.naturalHeight,0,0,w,h);

  const maskCanvas=document.createElement('canvas');
  maskCanvas.width=w; maskCanvas.height=h;
  const mctx=maskCanvas.getContext('2d',{willReadFrequently:true});
  mctx.imageSmoothingEnabled=false;
  mctx.clearRect(0,0,w,h);
  mctx.drawImage(hqOverlayImg,0,0,hqOverlayImg.naturalWidth,hqOverlayImg.naturalHeight,0,0,w,h);

  const baseData=bctx.getImageData(0,0,w,h).data;
  const maskData=mctx.getImageData(0,0,w,h).data;
  const groups=new Map();

  for(let i=0,p=0;i<maskData.length;i+=4,p++){
    const r=maskData[i], g=maskData[i+1], b=maskData[i+2], a=maskData[i+3];
    if(a<=10 || (r<8&&g<8&&b<8)) continue;
    const key=(r<<16)|(g<<8)|b;
    let group=groups.get(key);
    const x=p%w, y=(p/w)|0;
    if(!group){
      group={pixels:[],minx:x,maxx:x,miny:y,maxy:y,color:key};
      groups.set(key,group);
    }
    group.pixels.push(p);
    if(x<group.minx) group.minx=x;
    if(x>group.maxx) group.maxx=x;
    if(y<group.miny) group.miny=y;
    if(y>group.maxy) group.maxy=y;
  }

  for(const group of groups.values()){
    if(group.pixels.length<20) continue;
    const pw=group.maxx-group.minx+1;
    const ph=group.maxy-group.miny+1;
    const pieceCanvas=document.createElement('canvas');
    pieceCanvas.width=pw; pieceCanvas.height=ph;
    const pctx=pieceCanvas.getContext('2d');
    const pieceData=pctx.createImageData(pw,ph);
    const out=pieceData.data;

    for(const p of group.pixels){
      const sx=p%w, sy=(p/w)|0;
      const si=p*4;
      const di=((sy-group.miny)*pw+(sx-group.minx))*4;
      out[di]=baseData[si];
      out[di+1]=baseData[si+1];
      out[di+2]=baseData[si+2];
      out[di+3]=255;
    }
    pctx.putImageData(pieceData,0,0);
    hqForegroundPieces.push({
      canvas:pieceCanvas,
      x:group.minx,
      y:group.miny,
      w:pw,
      h:ph,
      depth:group.maxy,
      color:group.color
    });
  }

  hqForegroundPieces.sort((a,b)=>a.depth-b.depth);
  console.log('ATM HQ foreground objects loaded:',hqForegroundPieces.length);
}
function drawHQOverlay(){
  /* depth-sorted HQ foreground pieces are rendered through drawDepthScene */
}
hqBaseImg.onload=()=>{renderHQ();buildHQForegroundPieces();};
hqBaseImg.onerror=()=>{console.error('Embedded ATM HQ base image failed to decode');};
hqCollisionImg.onload=rebuildHQCollisionMask;
hqCollisionImg.onerror=()=>{console.error('Embedded ATM HQ collision mask failed to decode');};
hqInteractionImg.onload=hqInteractionReader.rebuild;
hqInteractionImg.onerror=()=>{console.error('ATM HQ interaction mask failed to decode');};
hqOverlayImg.onload=buildHQForegroundPieces;
hqOverlayImg.onerror=()=>{console.error('Embedded ATM HQ depth mask failed to decode');};
setTimeout(()=>{renderHQ();buildHQForegroundPieces();},0);
setTimeout(()=>{if(!hqForegroundPieces.length)buildHQForegroundPieces();},250);
setTimeout(()=>{if(!hqForegroundPieces.length)buildHQForegroundPieces();},800);

if(hqCollisionImg.complete&&hqCollisionImg.naturalWidth) setTimeout(rebuildHQCollisionMask,0);
if(hqInteractionImg.complete&&hqInteractionImg.naturalWidth) setTimeout(hqInteractionReader.rebuild,0);

const galleryBaseImg=new Image(); galleryBaseImg.decoding='async';
galleryBaseImg.src=ATM_MAPS.asset('gallery','visual');
const galleryOverlayImg=new Image(); galleryOverlayImg.decoding='async';
galleryOverlayImg.src=ATM_MAPS.asset('gallery','depth');
const galleryCollisionImg=new Image(); galleryCollisionImg.decoding='async';
galleryCollisionImg.src=ATM_MAPS.asset('gallery','collision');

const gallery=document.createElement('canvas'); gallery.width=galleryWorld.w*tile; gallery.height=galleryWorld.h*tile; const gg=gallery.getContext('2d'); gg.imageSmoothingEnabled=false;
const galleryObstacleMask={canvas:document.createElement('canvas'),data:null,ready:false,scale:1}; // Gallery: white blocked, black walkable
const galleryForegroundPieces=[];

function renderGallery(){
  gg.clearRect(0,0,gallery.width,gallery.height);
  if(galleryBaseImg.complete&&galleryBaseImg.naturalWidth){
    gg.imageSmoothingEnabled=false;
    gg.drawImage(galleryBaseImg,0,0,galleryBaseImg.naturalWidth,galleryBaseImg.naturalHeight,0,0,gallery.width,gallery.height);
  }else{
    gg.fillStyle='#15161d';
    gg.fillRect(0,0,gallery.width,gallery.height);
    gg.fillStyle='#8ad7ff';
    gg.font='900 24px monospace';
    gg.textAlign='center';
    gg.fillText('LOADING NFT ART GALLERY...',gallery.width/2,gallery.height/2);
  }
}
function rebuildGalleryCollisionMask(){
  const w=Math.max(1,Math.floor(gallery.width*galleryObstacleMask.scale));
  const h=Math.max(1,Math.floor(gallery.height*galleryObstacleMask.scale));
  const c=galleryObstacleMask.canvas;c.width=w;c.height=h;
  const cctx=c.getContext('2d',{willReadFrequently:true});
  cctx.imageSmoothingEnabled=false;
  cctx.clearRect(0,0,w,h);
  if(!(galleryCollisionImg.complete&&galleryCollisionImg.naturalWidth)){
    galleryObstacleMask.ready=false; galleryObstacleMask.data=null; return;
  }
  cctx.drawImage(galleryCollisionImg,0,0,galleryCollisionImg.naturalWidth,galleryCollisionImg.naturalHeight,0,0,w,h);
  const px=cctx.getImageData(0,0,w,h).data;
  const blocked=new Uint8Array(w*h);
  for(let i=0,p=0;i<px.length;i+=4,p++){
    const sum=px[i]+px[i+1]+px[i+2];
    blocked[p]=(px[i+3]>10 && sum>=420)?1:0;
  }
  galleryObstacleMask.data=blocked;
  galleryObstacleMask.ready=true;
}
function galleryObstacleAtPoint(px,py){
  if(!galleryObstacleMask.ready||!galleryObstacleMask.data) return false;
  const w=galleryObstacleMask.canvas.width,h=galleryObstacleMask.canvas.height;
  const mx=Math.max(0,Math.min(w-1,Math.floor((px/gallery.width)*w)));
  const my=Math.max(0,Math.min(h-1,Math.floor((py/gallery.height)*h)));
  return galleryObstacleMask.data[my*w+mx]===1;
}
function galleryObstacleAtFootprint(px,py){
  const samples=[[-10,16],[0,14],[10,16],[-12,23],[0,27],[12,23]];
  return samples.some(([ox,oy])=>galleryObstacleAtPoint(px+ox,py+oy));
}
function buildGalleryForegroundPieces(){
  galleryForegroundPieces.length=0;
  if(!(galleryBaseImg.complete&&galleryBaseImg.naturalWidth&&galleryOverlayImg.complete&&galleryOverlayImg.naturalWidth)) return;
  const w=gallery.width, h=gallery.height;

  const baseCanvas=document.createElement('canvas');
  baseCanvas.width=w; baseCanvas.height=h;
  const bctx=baseCanvas.getContext('2d',{willReadFrequently:true});
  bctx.imageSmoothingEnabled=false;
  bctx.clearRect(0,0,w,h);
  bctx.drawImage(galleryBaseImg,0,0,galleryBaseImg.naturalWidth,galleryBaseImg.naturalHeight,0,0,w,h);

  const maskCanvas=document.createElement('canvas');
  maskCanvas.width=w; maskCanvas.height=h;
  const mctx=maskCanvas.getContext('2d',{willReadFrequently:true});
  mctx.imageSmoothingEnabled=false;
  mctx.clearRect(0,0,w,h);
  mctx.drawImage(galleryOverlayImg,0,0,galleryOverlayImg.naturalWidth,galleryOverlayImg.naturalHeight,0,0,w,h);

  const baseData=bctx.getImageData(0,0,w,h).data;
  const maskData=mctx.getImageData(0,0,w,h).data;
  const groups=new Map();

  for(let i=0,p=0;i<maskData.length;i+=4,p++){
    const r=maskData[i], g=maskData[i+1], b=maskData[i+2], a=maskData[i+3];
    if(a<=10 || (r<8&&g<8&&b<8)) continue;
    const key=(r<<16)|(g<<8)|b;
    let group=groups.get(key);
    const x=p%w, y=(p/w)|0;
    if(!group){
      group={pixels:[],minx:x,maxx:x,miny:y,maxy:y,color:key};
      groups.set(key,group);
    }
    group.pixels.push(p);
    if(x<group.minx) group.minx=x;
    if(x>group.maxx) group.maxx=x;
    if(y<group.miny) group.miny=y;
    if(y>group.maxy) group.maxy=y;
  }

  for(const group of groups.values()){
    if(group.pixels.length<20) continue;
    const pw=group.maxx-group.minx+1;
    const ph=group.maxy-group.miny+1;
    const pieceCanvas=document.createElement('canvas');
    pieceCanvas.width=pw; pieceCanvas.height=ph;
    const pctx=pieceCanvas.getContext('2d');
    const pieceData=pctx.createImageData(pw,ph);
    const out=pieceData.data;

    for(const p of group.pixels){
      const sx=p%w, sy=(p/w)|0;
      const si=p*4;
      const di=((sy-group.miny)*pw+(sx-group.minx))*4;
      out[di]=baseData[si];
      out[di+1]=baseData[si+1];
      out[di+2]=baseData[si+2];
      out[di+3]=255;
    }
    pctx.putImageData(pieceData,0,0);
    galleryForegroundPieces.push({
      canvas:pieceCanvas,
      x:group.minx,
      y:group.miny,
      w:pw,
      h:ph,
      depth:group.maxy,
      color:group.color
    });
  }

  galleryForegroundPieces.sort((a,b)=>a.depth-b.depth);
  console.log('NFT Gallery foreground objects loaded:',galleryForegroundPieces.length);
}
function drawGalleryOverlay(){
  /* depth-sorted gallery foreground objects are rendered through drawDepthScene */
}
function getGalleryPlayerRenderMetrics(item){
  if(item.type==='remote'){
    return {
      x:item.p.drawX,
      y:item.p.drawY,
      footY:item.p.drawY+20,
      left:item.p.drawX-32,
      right:item.p.drawX+32,
      top:item.p.drawY-52,
      bottom:item.p.drawY+20,
      draw(){
        drawPlayerSprite(item.p.drawX,item.p.drawY,item.p.dir,item.p.frame,item.p.name,.92,0,item.p.jump||0,item.p.character||'classic',!!item.p.jetpackActive,!!item.p.jetpack,!!item.p.jetpackEquipped,item.p.loadout||null,item.p.activity||null);
        window.ATMZombieOutbreak?.drawPlayerEffects?.(ctx,{x:item.p.drawX,y:item.p.drawY,jumpAmount:item.p.jump||0,downed:false,fireActive:!!item.p?.powers?.fire,invisible:false,local:false});
      }
    };
  }
  const bob=player.moving?Math.abs(Math.sin(player.animTimer*1.2))*2.0:0;
  return {
    x:player.x,
    y:player.y,
    footY:player.y+20,
    left:player.x-32,
    right:player.x+32,
    top:player.y-52,
    bottom:player.y+20,
    draw(){
      drawPlayerSprite(player.x,player.y,player.dir,player.frame,'',(powerUps.invisibility>0 ? .28 : 1),bob,jumpLift(),selectedCharacter,jetpackState.active,jetpackState.thrusting,canUseJetpack(),window.atmActiveLoadout||null);
      window.ATMZombieOutbreak?.drawPlayerEffects?.(ctx,{x:player.x,y:player.y,jumpAmount:jumpLift(),downed:false,fireActive:powerUps.fire>0,invisible:powerUps.invisibility>0,local:true});
    }
  };
}
function galleryOccluderAppliesToPlayer(piece,m){
  if(!(m.right>=piece.x && m.left<=piece.x+piece.w && m.bottom>=piece.y && m.top<=piece.y+piece.h)) return false;
  return m.footY <= piece.depth+1;
}
function drawGalleryPlayersAndOccluders(){
  const playerItems=[];
  for(const [id,p] of remotePlayers){
    if(p.map!=='gallery'||p?.powers?.invisibility) continue;
    playerItems.push({depth:p.drawY+20,type:'remote',p});
  }
  playerItems.push({depth:player.y+20,type:'local'});
  playerItems.sort((a,b)=>a.depth-b.depth);

  const occluders=galleryForegroundPieces;
  for(const item of playerItems){
    const metrics=getGalleryPlayerRenderMetrics(item);
    metrics.draw();
    for(const piece of occluders){
      if(galleryOccluderAppliesToPlayer(piece,metrics)){
        drawStaticOccluder(piece.canvas,piece.x,piece.y,piece.w,piece.h);
      }
    }
  }
}
galleryBaseImg.onload=()=>{renderGallery();buildGalleryForegroundPieces();};
galleryBaseImg.onerror=()=>{console.error('Embedded NFT Gallery base image failed to decode');};
galleryCollisionImg.onload=rebuildGalleryCollisionMask;
galleryCollisionImg.onerror=()=>{console.error('Embedded NFT Gallery collision mask failed to decode');};
galleryOverlayImg.onload=buildGalleryForegroundPieces;
galleryOverlayImg.onerror=()=>{console.error('Embedded NFT Gallery depth mask failed to decode');};
setTimeout(()=>{renderGallery();buildGalleryForegroundPieces();},0);
setTimeout(()=>{if(!galleryForegroundPieces.length)buildGalleryForegroundPieces();},250);
setTimeout(()=>{if(!galleryForegroundPieces.length)buildGalleryForegroundPieces();},800);
if(galleryCollisionImg.complete&&galleryCollisionImg.naturalWidth) setTimeout(rebuildGalleryCollisionMask,0);


const arcadeBaseImg=new Image(); arcadeBaseImg.decoding='async';
arcadeBaseImg.src=ATM_MAPS.asset('arcade','visual');
const arcadeOverlayImg=new Image(); arcadeOverlayImg.decoding='async';
arcadeOverlayImg.src=ATM_MAPS.asset('arcade','depth');
const arcadeCollisionImg=new Image(); arcadeCollisionImg.decoding='async';
arcadeCollisionImg.src=ATM_MAPS.asset('arcade','collision');
const arcadeInteractionImg=new Image(); arcadeInteractionImg.decoding='async';
arcadeInteractionImg.src=ATM_MAPS.asset('arcade','interaction');

const arcadeSize=ATM_MAPS.pixelSize('arcade');
const arcade=document.createElement('canvas'); arcade.width=arcadeSize.w; arcade.height=arcadeSize.h; const ag=arcade.getContext('2d'); ag.imageSmoothingEnabled=false;
const arcadeObstacleMask={canvas:document.createElement('canvas'),data:null,ready:false,scale:1};
const arcadeForegroundPieces=[];
const ARCADE_INTERACTION_TYPES=ATM_INTERACTIONS.types;
const ARCADE_INTERACTION_PALETTE=Object.freeze([
  Object.freeze({type:ARCADE_INTERACTION_TYPES.misc,name:'arcade-zone',r:229,g:254,b:82}),
  Object.freeze({type:ARCADE_INTERACTION_TYPES.misc,name:'jukebox-zone',r:255,g:123,b:0}),
  Object.freeze({type:ARCADE_INTERACTION_TYPES.vending,name:'vending-zone',r:234,g:51,b:35})
]);
const arcadeInteractionReader=ATM_INTERACTIONS.createMaskReader({
  id:'ATM Token Arcade',
  image:arcadeInteractionImg,
  width:()=>arcade.width,
  height:()=>arcade.height,
  palette:ARCADE_INTERACTION_PALETTE,
  tolerance:18
});

function renderArcade(){
  ag.clearRect(0,0,arcade.width,arcade.height);
  if(arcadeBaseImg.complete&&arcadeBaseImg.naturalWidth){
    ag.imageSmoothingEnabled=false;
    ag.drawImage(arcadeBaseImg,0,0,arcadeBaseImg.naturalWidth,arcadeBaseImg.naturalHeight,0,0,arcade.width,arcade.height);
  }else{
    ag.fillStyle='#16131d';ag.fillRect(0,0,arcade.width,arcade.height);
    ag.fillStyle='#ff5fd7';ag.font='900 24px monospace';ag.textAlign='center';
    ag.fillText('LOADING ATM TOKEN ARCADE...',arcade.width/2,arcade.height/2);
  }
}
function rebuildArcadeCollisionMask(){
  const w=arcade.width,h=arcade.height,c=arcadeObstacleMask.canvas;c.width=w;c.height=h;
  const cctx=c.getContext('2d',{willReadFrequently:true});cctx.imageSmoothingEnabled=false;cctx.clearRect(0,0,w,h);
  if(!(arcadeCollisionImg.complete&&arcadeCollisionImg.naturalWidth)){arcadeObstacleMask.ready=false;arcadeObstacleMask.data=null;return;}
  cctx.drawImage(arcadeCollisionImg,0,0,arcadeCollisionImg.naturalWidth,arcadeCollisionImg.naturalHeight,0,0,w,h);
  const px=cctx.getImageData(0,0,w,h).data,blocked=new Uint8Array(w*h);
  for(let i=0,p=0;i<px.length;i+=4,p++){const sum=px[i]+px[i+1]+px[i+2];blocked[p]=(px[i+3]>10&&sum>=420)?1:0;}
  arcadeObstacleMask.data=blocked;arcadeObstacleMask.ready=true;
}
function arcadeObstacleAtPoint(px,py){
  if(!arcadeObstacleMask.ready||!arcadeObstacleMask.data)return false;
  const w=arcadeObstacleMask.canvas.width,h=arcadeObstacleMask.canvas.height;
  const mx=Math.max(0,Math.min(w-1,Math.floor((px/arcade.width)*w)));
  const my=Math.max(0,Math.min(h-1,Math.floor((py/arcade.height)*h)));
  return arcadeObstacleMask.data[my*w+mx]===1;
}
function arcadeObstacleAtFootprint(px,py){
  const samples=[[-10,16],[0,14],[10,16],[-12,23],[0,27],[12,23]];
  return samples.some(([ox,oy])=>arcadeObstacleAtPoint(px+ox,py+oy));
}
const ARCADE_AUTHORED_ZONES=Object.freeze([
  Object.freeze({id:'arcadeJukebox',type:'misc',name:'ARCADE JUKEBOX',text:'Choose music for the ATM Token Arcade.',x1:570,y1:360,x2:685,y2:404,padX:18,padTop:12,padBottom:44}),
  Object.freeze({id:'atmSkyRun',type:'sky-run',name:'ATM SKY RUN',text:'Race across the rooftops, collect cash, activate checkpoints, and reach the vault.',x1:769,y1:357,x2:842,y2:393,padX:18,padTop:12,padBottom:48}),
  Object.freeze({id:'atmPlatformPanic',type:'platform-panic',name:'ATM PLATFORM PANIC',text:'Climb moving platforms and survive the rising lava.',x1:859,y1:357,x2:931,y2:393,padX:18,padTop:12,padBottom:48}),
  Object.freeze({id:'atmRingRumble',type:'ring-rumble',name:'ATM RING RUMBLE',text:'Knock opponents off the arena while the outer platform rings collapse.',x1:948,y1:357,x2:1019,y2:393,padX:18,padTop:12,padBottom:48}),
  Object.freeze({id:'atmFlappyJetpack',type:'flappy-jetpack',name:'ATM FLAPPY JETPACK',text:'Tap the jetpack through an endless skyline of tower gaps.',x1:1035,y1:357,x2:1110,y2:393,padX:18,padTop:12,padBottom:48}),
  Object.freeze({id:'arcadeTokenCounter',type:'misc',name:'ATM TOKEN COUNTER',text:'Exchange arcade winnings and view ATM Token Arcade rewards here.',x1:871,y1:637,x2:1035,y2:659,padX:20,padTop:12,padBottom:50}),
  Object.freeze({id:'atmNeonRacer',type:'neon-racer',name:'ATM NEON RACER',text:'Dodge traffic, collect ATM coins, and survive an accelerating neon city run.',x1:115,y1:718,x2:187,y2:752,padX:18,padTop:12,padBottom:46}),
  Object.freeze({id:'arcadeShooterCabinet',type:'misc',name:'SHOOTER CABINET',text:'A future ATM Town shooter game will launch from this cabinet.',x1:204,y1:718,x2:277,y2:752,padX:18,padTop:12,padBottom:46}),
  Object.freeze({id:'arcadeFighterCabinet',type:'misc',name:'FIGHTER CABINET',text:'A future ATM Town fighting game will launch from this cabinet.',x1:293,y1:718,x2:364,y2:752,padX:18,padTop:12,padBottom:46}),
  Object.freeze({id:'arcadeVending',type:'vending',name:'ATM POWER-UP VENDING',text:'Purchase a temporary ATM Town power-up.',x1:941,y1:981,x2:1102,y2:1004,padX:22,padTop:12,padBottom:54})
]);
function arcadeAuthoredZoneAt(px,py){
  let best=null,bestDistance=Infinity;
  for(const zone of ARCADE_AUTHORED_ZONES){
    const left=zone.x1-zone.padX,right=zone.x2+zone.padX,top=zone.y1-zone.padTop,bottom=zone.y2+zone.padBottom;
    if(px<left||px>right||py<top||py>bottom)continue;
    const nearestX=Math.max(zone.x1,Math.min(zone.x2,px));
    const nearestY=Math.max(zone.y1,Math.min(zone.y2,py));
    const distance=Math.hypot(px-nearestX,py-nearestY);
    if(distance<bestDistance){best=zone;bestDistance=distance;}
  }
  return best?{zone:best,distance:bestDistance}:null;
}
function arcadeInteractionHit(px,py){
  if(arcadeInteractionReader.ready){
    const directType=arcadeInteractionReader.typeAt(px,py);
    if(directType!==ARCADE_INTERACTION_TYPES.none)return{type:directType,x:px,y:py,distance:0};
    const nearMask=arcadeInteractionReader.nearest(px,py,28,'',2);
    if(nearMask)return nearMask;
  }
  return null;
}
function arcadeInteractionThing(){
  const feet=getPlayerInteractionFeet();
  const authored=arcadeAuthoredZoneAt(feet.x,feet.y);
  if(authored)return{...authored.zone,maskDistance:authored.distance};

  // Retain direct mask sampling for future painted zones that are not yet registered above.
  const hit=arcadeInteractionHit(feet.x,feet.y);
  if(!hit)return null;
  if(hit.type===ARCADE_INTERACTION_TYPES.vending){
    return{id:'arcadeVending',type:'vending',name:'ATM POWER-UP VENDING',text:'Purchase a temporary ATM Town power-up.',maskDistance:hit.distance};
  }
  return null;
}
function buildArcadeForegroundPieces(){
  arcadeForegroundPieces.length=0;
  if(!(arcadeBaseImg.complete&&arcadeBaseImg.naturalWidth&&arcadeOverlayImg.complete&&arcadeOverlayImg.naturalWidth))return;
  const w=arcade.width,h=arcade.height;
  const baseCanvas=document.createElement('canvas');baseCanvas.width=w;baseCanvas.height=h;
  const bctx=baseCanvas.getContext('2d',{willReadFrequently:true});bctx.imageSmoothingEnabled=false;
  bctx.drawImage(arcadeBaseImg,0,0,arcadeBaseImg.naturalWidth,arcadeBaseImg.naturalHeight,0,0,w,h);
  const maskCanvas=document.createElement('canvas');maskCanvas.width=w;maskCanvas.height=h;
  const mctx=maskCanvas.getContext('2d',{willReadFrequently:true});mctx.imageSmoothingEnabled=false;
  mctx.drawImage(arcadeOverlayImg,0,0,arcadeOverlayImg.naturalWidth,arcadeOverlayImg.naturalHeight,0,0,w,h);
  const baseData=bctx.getImageData(0,0,w,h).data,maskData=mctx.getImageData(0,0,w,h).data,groups=new Map();
  for(let i=0,p=0;i<maskData.length;i+=4,p++){
    const r=maskData[i],g=maskData[i+1],b=maskData[i+2],a=maskData[i+3];
    if(a<=10||(r<8&&g<8&&b<8))continue;
    const key=(r<<16)|(g<<8)|b,x=p%w,y=(p/w)|0;let group=groups.get(key);
    if(!group){group={pixels:[],minx:x,maxx:x,miny:y,maxy:y,color:key};groups.set(key,group);}
    group.pixels.push(p);if(x<group.minx)group.minx=x;if(x>group.maxx)group.maxx=x;if(y<group.miny)group.miny=y;if(y>group.maxy)group.maxy=y;
  }
  for(const group of groups.values()){
    if(group.pixels.length<20)continue;
    const pw=group.maxx-group.minx+1,ph=group.maxy-group.miny+1,pieceCanvas=document.createElement('canvas');pieceCanvas.width=pw;pieceCanvas.height=ph;
    const pctx=pieceCanvas.getContext('2d'),pieceData=pctx.createImageData(pw,ph),out=pieceData.data;
    for(const p of group.pixels){const sx=p%w,sy=(p/w)|0,si=p*4,di=((sy-group.miny)*pw+(sx-group.minx))*4;out[di]=baseData[si];out[di+1]=baseData[si+1];out[di+2]=baseData[si+2];out[di+3]=255;}
    pctx.putImageData(pieceData,0,0);
    arcadeForegroundPieces.push({canvas:pieceCanvas,x:group.minx,y:group.miny,w:pw,h:ph,depth:group.maxy,color:group.color});
  }
  arcadeForegroundPieces.sort((a,b)=>a.depth-b.depth);
  console.log('ATM Token Arcade foreground objects loaded:',arcadeForegroundPieces.length);
}
function getArcadePlayerRenderMetrics(item){
  if(item.type==='remote')return{x:item.p.drawX,y:item.p.drawY,footY:item.p.drawY+20,left:item.p.drawX-32,right:item.p.drawX+32,top:item.p.drawY-52,bottom:item.p.drawY+20,draw(){drawPlayerSprite(item.p.drawX,item.p.drawY,item.p.dir,item.p.frame,item.p.name,.92,0,item.p.jump||0,item.p.character||'classic',!!item.p.jetpackActive,!!item.p.jetpack,!!item.p.jetpackEquipped,item.p.loadout||null,item.p.activity||null);window.ATMZombieOutbreak?.drawPlayerEffects?.(ctx,{x:item.p.drawX,y:item.p.drawY,jumpAmount:item.p.jump||0,downed:false,fireActive:!!item.p?.powers?.fire,invisible:false,local:false});}};
  const bob=player.moving?Math.abs(Math.sin(player.animTimer*1.2))*2:0;
  return{x:player.x,y:player.y,footY:player.y+20,left:player.x-32,right:player.x+32,top:player.y-52,bottom:player.y+20,draw(){drawPlayerSprite(player.x,player.y,player.dir,player.frame,'',(powerUps.invisibility>0 ? .28 : 1),bob,jumpLift(),selectedCharacter,jetpackState.active,jetpackState.thrusting,canUseJetpack(),window.atmActiveLoadout||null);window.ATMZombieOutbreak?.drawPlayerEffects?.(ctx,{x:player.x,y:player.y,jumpAmount:jumpLift(),downed:false,fireActive:powerUps.fire>0,invisible:powerUps.invisibility>0,local:true});}};
}
function arcadeOccluderAppliesToPlayer(piece,m){
  if(!(m.right>=piece.x&&m.left<=piece.x+piece.w&&m.bottom>=piece.y&&m.top<=piece.y+piece.h))return false;
  return m.footY<=piece.depth+1;
}
function drawArcadePlayersAndOccluders(){
  const playerItems=[];
  for(const [id,p] of remotePlayers){if(p.map!=='arcade'||p?.powers?.invisibility)continue;playerItems.push({depth:p.drawY+20,type:'remote',p});}
  playerItems.push({depth:player.y+20,type:'local'});playerItems.sort((a,b)=>a.depth-b.depth);
  for(const item of playerItems){const metrics=getArcadePlayerRenderMetrics(item);metrics.draw();for(const piece of arcadeForegroundPieces){if(arcadeOccluderAppliesToPlayer(piece,metrics))drawStaticOccluder(piece.canvas,piece.x,piece.y,piece.w,piece.h);}}
}
arcadeBaseImg.onload=()=>{renderArcade();buildArcadeForegroundPieces();};
arcadeBaseImg.onerror=()=>console.error('ATM Token Arcade base image failed to decode');
arcadeCollisionImg.onload=rebuildArcadeCollisionMask;
arcadeCollisionImg.onerror=()=>console.error('ATM Token Arcade collision mask failed to decode');
arcadeOverlayImg.onload=buildArcadeForegroundPieces;
arcadeOverlayImg.onerror=()=>console.error('ATM Token Arcade depth mask failed to decode');
arcadeInteractionImg.onload=arcadeInteractionReader.rebuild;
arcadeInteractionImg.onerror=()=>console.error('ATM Token Arcade interaction mask failed to decode');
setTimeout(()=>{renderArcade();buildArcadeForegroundPieces();},0);
setTimeout(()=>{if(!arcadeForegroundPieces.length)buildArcadeForegroundPieces();},250);
setTimeout(()=>{if(!arcadeForegroundPieces.length)buildArcadeForegroundPieces();},800);
if(arcadeCollisionImg.complete&&arcadeCollisionImg.naturalWidth)setTimeout(rebuildArcadeCollisionMask,0);
if(arcadeInteractionImg.complete&&arcadeInteractionImg.naturalWidth)setTimeout(arcadeInteractionReader.rebuild,0);

const loungeBaseImg=new Image(); loungeBaseImg.decoding='async';
loungeBaseImg.src=ATM_MAPS.asset('lounge','visual');
const loungeOverlayImg=new Image(); loungeOverlayImg.decoding='async';
loungeOverlayImg.src=ATM_MAPS.asset('lounge','depth');
const loungeCollisionImg=new Image(); loungeCollisionImg.decoding='async';
loungeCollisionImg.src=ATM_MAPS.asset('lounge','collision');
const loungeInteractionImg=new Image(); loungeInteractionImg.decoding='async';
loungeInteractionImg.src=ATM_MAPS.asset('lounge','interaction');

const loungeSize=ATM_MAPS.pixelSize('lounge');
const lounge=document.createElement('canvas'); lounge.width=loungeSize.w; lounge.height=loungeSize.h; const lg=lounge.getContext('2d'); lg.imageSmoothingEnabled=false;
const loungeObstacleMask={canvas:document.createElement('canvas'),data:null,ready:false,scale:1};
const loungeForegroundPieces=[];
const LOUNGE_INTERACTION_TYPES=ATM_INTERACTIONS.types;
const loungeInteractionReader=ATM_INTERACTIONS.createMaskReader({
  id:'Community Lounge',
  image:loungeInteractionImg,
  width:()=>lounge.width,
  height:()=>lounge.height,
  palette:ATM_INTERACTIONS.corePalette
});

function renderLounge(){
  lg.clearRect(0,0,lounge.width,lounge.height);
  if(loungeBaseImg.complete&&loungeBaseImg.naturalWidth){
    lg.imageSmoothingEnabled=false;
    lg.drawImage(loungeBaseImg,0,0,loungeBaseImg.naturalWidth,loungeBaseImg.naturalHeight,0,0,lounge.width,lounge.height);
  }else{
    lg.fillStyle='#16131d';lg.fillRect(0,0,lounge.width,lounge.height);
    lg.fillStyle='#58f1e6';lg.font='900 24px monospace';lg.textAlign='center';
    lg.fillText('LOADING COMMUNITY LOUNGE...',lounge.width/2,lounge.height/2);
  }
}
function rebuildLoungeCollisionMask(){
  const w=lounge.width,h=lounge.height,c=loungeObstacleMask.canvas;c.width=w;c.height=h;
  const cctx=c.getContext('2d',{willReadFrequently:true});cctx.imageSmoothingEnabled=false;cctx.clearRect(0,0,w,h);
  if(!(loungeCollisionImg.complete&&loungeCollisionImg.naturalWidth)){loungeObstacleMask.ready=false;loungeObstacleMask.data=null;return;}
  cctx.drawImage(loungeCollisionImg,0,0,loungeCollisionImg.naturalWidth,loungeCollisionImg.naturalHeight,0,0,w,h);
  const px=cctx.getImageData(0,0,w,h).data,blocked=new Uint8Array(w*h);
  for(let i=0,p=0;i<px.length;i+=4,p++){const sum=px[i]+px[i+1]+px[i+2];blocked[p]=(px[i+3]>10&&sum>=420)?1:0;}
  loungeObstacleMask.data=blocked;loungeObstacleMask.ready=true;
}
function loungeObstacleAtPoint(px,py){
  if(!loungeObstacleMask.ready||!loungeObstacleMask.data)return false;
  const w=loungeObstacleMask.canvas.width,h=loungeObstacleMask.canvas.height;
  const mx=Math.max(0,Math.min(w-1,Math.floor((px/lounge.width)*w)));
  const my=Math.max(0,Math.min(h-1,Math.floor((py/lounge.height)*h)));
  return loungeObstacleMask.data[my*w+mx]===1;
}
function loungeObstacleAtFootprint(px,py){
  const samples=[[-10,16],[0,14],[10,16],[-12,23],[0,27],[12,23]];
  return samples.some(([ox,oy])=>loungeObstacleAtPoint(px+ox,py+oy));
}
function loungeInteractionNear(px,py,radius=38,typeFilter='',step=3){
  return loungeInteractionReader.nearest(px,py,radius,typeFilter,step);
}
function loungeInteractionThing(){
  const feet=getPlayerInteractionFeet();
  let hit=loungeInteractionNear(feet.x,feet.y,38);
  // The authored media-wall color is painted on the screen itself, behind the sofa.
  // Use the same longer reach already used by HQ display interactions without widening other lounge zones.
  if(!hit)hit=loungeInteractionNear(feet.x,feet.y,175,'html',6);
  if(!hit)return null;
  if(hit.type===LOUNGE_INTERACTION_TYPES.entry)return{id:'loungeMaskExit',type:'entry',name:'EXIT TO TOWN',text:'Return to ATM Town.',maskDistance:hit.distance};
  if(hit.type===LOUNGE_INTERACTION_TYPES.vending)return{id:'loungeVending',type:'vending',name:'ATM POWER-UP VENDING',text:'Purchase a temporary ATM Town power-up.',maskDistance:hit.distance};
  if(hit.type===LOUNGE_INTERACTION_TYPES.voice)return{id:'loungeVoice',type:'voice',name:'ATM TOWN PROXIMITY VOICE',text:'Join voice anywhere. Nearby players on your current map will be audible.',maskDistance:hit.distance};
  if(hit.type===LOUNGE_INTERACTION_TYPES.html)return{id:'loungeMediaWall',type:'html',name:'LOUNGE MEDIA WALL',text:'A large HTML display window for community videos, events, and shared web experiences.',maskDistance:hit.distance};
  if(hit.type===LOUNGE_INTERACTION_TYPES.atm)return{id:'loungeAtm',type:'atm',name:'ATM TERMINAL',text:'A future ATM token and XRPL terminal.',maskDistance:hit.distance};
  if(hit.type===LOUNGE_INTERACTION_TYPES.misc){
    if(hit.y<360)return{id:'loungeJukebox',type:'misc',name:'LOUNGE JUKEBOX',text:'Choose music and set the mood for the Community Lounge.',maskDistance:hit.distance};
    if(hit.x>850&&hit.y<670)return{id:'loungeDarts',type:'misc',name:'ATM DARTS 301',text:'Play a solo, local two-player, or online 301 darts match.',maskDistance:hit.distance};
    if(hit.x<850&&hit.y>650)return{id:'loungePool',type:'misc',name:'POOL TABLE',text:'The Community Lounge pool minigame will launch from here.',maskDistance:hit.distance};
    return{id:'loungeArcade',type:'misc',name:'LOUNGE ARCADE CABINET',text:'A playable lounge arcade cabinet is planned for this station.',maskDistance:hit.distance};
  }
  return null;
}
function buildLoungeForegroundPieces(){
  loungeForegroundPieces.length=0;
  if(!(loungeBaseImg.complete&&loungeBaseImg.naturalWidth&&loungeOverlayImg.complete&&loungeOverlayImg.naturalWidth))return;
  const w=lounge.width,h=lounge.height;
  const baseCanvas=document.createElement('canvas');baseCanvas.width=w;baseCanvas.height=h;
  const bctx=baseCanvas.getContext('2d',{willReadFrequently:true});bctx.imageSmoothingEnabled=false;
  bctx.drawImage(loungeBaseImg,0,0,loungeBaseImg.naturalWidth,loungeBaseImg.naturalHeight,0,0,w,h);
  const maskCanvas=document.createElement('canvas');maskCanvas.width=w;maskCanvas.height=h;
  const mctx=maskCanvas.getContext('2d',{willReadFrequently:true});mctx.imageSmoothingEnabled=false;
  mctx.drawImage(loungeOverlayImg,0,0,loungeOverlayImg.naturalWidth,loungeOverlayImg.naturalHeight,0,0,w,h);
  const baseData=bctx.getImageData(0,0,w,h).data,maskData=mctx.getImageData(0,0,w,h).data,groups=new Map();
  for(let i=0,p=0;i<maskData.length;i+=4,p++){
    const r=maskData[i],g=maskData[i+1],b=maskData[i+2],a=maskData[i+3];
    if(a<=10||(r<8&&g<8&&b<8))continue;
    const key=(r<<16)|(g<<8)|b,x=p%w,y=(p/w)|0;let group=groups.get(key);
    if(!group){group={pixels:[],minx:x,maxx:x,miny:y,maxy:y,color:key};groups.set(key,group);}
    group.pixels.push(p);if(x<group.minx)group.minx=x;if(x>group.maxx)group.maxx=x;if(y<group.miny)group.miny=y;if(y>group.maxy)group.maxy=y;
  }
  for(const group of groups.values()){
    if(group.pixels.length<20)continue;
    const pw=group.maxx-group.minx+1,ph=group.maxy-group.miny+1,pieceCanvas=document.createElement('canvas');pieceCanvas.width=pw;pieceCanvas.height=ph;
    const pctx=pieceCanvas.getContext('2d'),pieceData=pctx.createImageData(pw,ph),out=pieceData.data;
    for(const p of group.pixels){const sx=p%w,sy=(p/w)|0,si=p*4,di=((sy-group.miny)*pw+(sx-group.minx))*4;out[di]=baseData[si];out[di+1]=baseData[si+1];out[di+2]=baseData[si+2];out[di+3]=255;}
    pctx.putImageData(pieceData,0,0);
    loungeForegroundPieces.push({canvas:pieceCanvas,x:group.minx,y:group.miny,w:pw,h:ph,depth:group.maxy,color:group.color});
  }
  loungeForegroundPieces.sort((a,b)=>a.depth-b.depth);
  console.log('Community Lounge foreground objects loaded:',loungeForegroundPieces.length);
}
function getLoungePlayerRenderMetrics(item){
  if(item.type==='remote')return{x:item.p.drawX,y:item.p.drawY,footY:item.p.drawY+20,left:item.p.drawX-32,right:item.p.drawX+32,top:item.p.drawY-52,bottom:item.p.drawY+20,draw(){drawPlayerSprite(item.p.drawX,item.p.drawY,item.p.dir,item.p.frame,item.p.name,.92,0,item.p.jump||0,item.p.character||'classic',!!item.p.jetpackActive,!!item.p.jetpack,!!item.p.jetpackEquipped,item.p.loadout||null,item.p.activity||null);window.ATMZombieOutbreak?.drawPlayerEffects?.(ctx,{x:item.p.drawX,y:item.p.drawY,jumpAmount:item.p.jump||0,downed:false,fireActive:!!item.p?.powers?.fire,invisible:false,local:false});}};
  const bob=player.moving?Math.abs(Math.sin(player.animTimer*1.2))*2:0;
  return{x:player.x,y:player.y,footY:player.y+20,left:player.x-32,right:player.x+32,top:player.y-52,bottom:player.y+20,draw(){drawPlayerSprite(player.x,player.y,player.dir,player.frame,'',(powerUps.invisibility>0 ? .28 : 1),bob,jumpLift(),selectedCharacter,jetpackState.active,jetpackState.thrusting,canUseJetpack(),window.atmActiveLoadout||null);window.ATMZombieOutbreak?.drawPlayerEffects?.(ctx,{x:player.x,y:player.y,jumpAmount:jumpLift(),downed:false,fireActive:powerUps.fire>0,invisible:powerUps.invisibility>0,local:true});}};
}
function loungeOccluderAppliesToPlayer(piece,m){
  if(!(m.right>=piece.x&&m.left<=piece.x+piece.w&&m.bottom>=piece.y&&m.top<=piece.y+piece.h))return false;
  return m.footY<=piece.depth+1;
}
function drawLoungePlayersAndOccluders(){
  const playerItems=[];
  for(const [id,p] of remotePlayers){if(p.map!=='lounge'||p?.powers?.invisibility)continue;playerItems.push({depth:p.drawY+20,type:'remote',p});}
  playerItems.push({depth:player.y+20,type:'local'});playerItems.sort((a,b)=>a.depth-b.depth);
  for(const item of playerItems){const metrics=getLoungePlayerRenderMetrics(item);metrics.draw();for(const piece of loungeForegroundPieces){if(loungeOccluderAppliesToPlayer(piece,metrics))drawStaticOccluder(piece.canvas,piece.x,piece.y,piece.w,piece.h);}}
}
loungeBaseImg.onload=()=>{renderLounge();buildLoungeForegroundPieces();};
loungeBaseImg.onerror=()=>console.error('Community Lounge base image failed to decode');
loungeCollisionImg.onload=rebuildLoungeCollisionMask;
loungeCollisionImg.onerror=()=>console.error('Community Lounge collision mask failed to decode');
loungeInteractionImg.onload=loungeInteractionReader.rebuild;
loungeInteractionImg.onerror=()=>console.error('Community Lounge interaction mask failed to decode');
loungeOverlayImg.onload=buildLoungeForegroundPieces;
loungeOverlayImg.onerror=()=>console.error('Community Lounge depth mask failed to decode');
setTimeout(()=>{renderLounge();buildLoungeForegroundPieces();},0);
setTimeout(()=>{if(!loungeForegroundPieces.length)buildLoungeForegroundPieces();},250);
setTimeout(()=>{if(!loungeForegroundPieces.length)buildLoungeForegroundPieces();},800);
if(loungeCollisionImg.complete&&loungeCollisionImg.naturalWidth)setTimeout(rebuildLoungeCollisionMask,0);
if(loungeInteractionImg.complete&&loungeInteractionImg.naturalWidth)setTimeout(loungeInteractionReader.rebuild,0);


const ATM_SUPABASE_URL='https://xnyjurertwohlqczaeux.supabase.co';
const ATM_SUPABASE_KEY='sb_publishable_MspBOZia1KQFBItNYn6Z-Q_0xASDJzD';
let authSession=null;
let playerAccount=null;
// v235.11.4 entry stability: once the player has deliberately entered the
// town, late auth/passkey callbacks must never reopen the access flow over
// live gameplay. The flag is intentionally page-session only.
let townEntryActive=false;
let townEntryInProgress=false;
let passkeySignInInProgress=false;
function hideTownAccessFlow(){
  const panel=document.getElementById('multiplayerPanel');
  if(panel)panel.style.display='none';
  const overlay=document.getElementById('landingOverlay');
  if(overlay)overlay.style.display='none';
  document.body.classList.remove('access-flow-open');
}
window.atmTownEntryIsActive=()=>townEntryActive;
let walletPollTimer=null;
let walletPollPayloadUuid='';
let walletResumeAttempts=0;
const ATM_XAMAN_PENDING_KEY='atm_xaman_pending';

function readPendingXamanLink(){
  try{
    const raw=localStorage.getItem(ATM_XAMAN_PENDING_KEY);if(!raw)return null;
    const parsed=JSON.parse(raw);return parsed&&/^[0-9a-f-]{36}$/i.test(String(parsed.payload_uuid||''))?parsed:null;
  }catch(_error){return null;}
}
function savePendingXamanLink(value){try{localStorage.setItem(ATM_XAMAN_PENDING_KEY,JSON.stringify(value));}catch(_error){}}
function clearPendingXamanLink(){try{localStorage.removeItem(ATM_XAMAN_PENDING_KEY);}catch(_error){}}
function setXamanLinkBar(message,state='waiting'){
  const bar=document.getElementById('xamanLinkBar');const text=document.getElementById('xamanLinkBarText');
  if(!bar||!text)return;
  if(!message){bar.hidden=true;bar.className='xamanLinkBar';text.textContent='';return;}
  bar.hidden=false;bar.className='xamanLinkBar '+state;text.textContent=message;
}
function resetXamanLinkButton(){
  const button=document.getElementById('linkWalletBtn');if(!button)return;
  const linked=!!playerAccount?.wallet_address;button.disabled=linked;button.textContent=linked?'Wallet linked':'Connect Xaman';
}
function xamanReturnPayloadFromUrl(){
  try{
    const params=new URLSearchParams(location.search);if(params.get('xaman_return')!=='1')return null;
    const uuid=String(params.get('payload')||'');
    params.delete('xaman_return');params.delete('payload');
    const clean=location.pathname+(params.toString()?'?'+params.toString():'')+location.hash;
    history.replaceState(null,'',clean);
    return /^[0-9a-f-]{36}$/i.test(uuid)?uuid:null;
  }catch(_error){return null;}
}

async function getSupabaseClient(){
  await loadSupabaseLibrary();
  if(!supabaseClient){
    supabaseClient=window.supabase.createClient(ATM_SUPABASE_URL,ATM_SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,experimental:{passkey:true}}});
  }
  return supabaseClient;
}
function setIdentityStatus(message,tone='normal'){
  const el=document.getElementById('identityStatus');
  if(el){el.textContent=message||'';el.classList.toggle('dangerText',tone==='error');if(tone==='ok')el.style.color='#7cf7bd';else if(tone!=='error')el.style.color='#9fc3cc';}
  for(const id of ['welcomeStatus','signupStatus']){const mirror=document.getElementById(id);if(!mirror)continue;mirror.textContent=message||'';mirror.classList.toggle('danger',tone==='error');mirror.classList.toggle('ok',tone==='ok');}
}
function shortWallet(value){return value&&value.length>14?value.slice(0,7)+'…'+value.slice(-6):value;}
function updateEntryProgress(activeStep=1,completed=[]){
  document.querySelectorAll('.entryStep').forEach((step,index)=>{
    const number=index+1;step.classList.toggle('active',number===activeStep);step.classList.toggle('done',completed.includes(number));
  });
}
function renderIdentity(){
  const loading=document.getElementById('identityLoading'),guest=document.getElementById('identityGuest'),signed=document.getElementById('identitySignedIn'),badge=document.getElementById('identityBadge');
  if(loading)loading.style.display='none';
  const isSigned=!!authSession?.user;
  if(guest)guest.style.display=isSigned?'none':'block';
  if(signed)signed.style.display=isSigned?'block':'none';
  if(badge){badge.textContent=isSigned?'SIGNED IN':'GUEST';badge.classList.toggle('signed',isSigned);}
  updateEntryProgress(isSigned?2:1,isSigned?[1]:[]);
  if(window.atmFlowAuthUpdated)window.atmFlowAuthUpdated(isSigned);
  if(isSigned){
    const email=authSession.user.email||'Player account'; document.getElementById('accountEmail').textContent=email;
    const wallet=playerAccount?.wallet_address;
    document.getElementById('walletLine').innerHTML=wallet?'Wallet: <span class="walletValue" title="'+wallet+'">'+shortWallet(wallet)+'</span>':'Wallet: <span class="walletValue">Not linked</span>';
    const linkBtn=document.getElementById('linkWalletBtn'); if(linkBtn){linkBtn.innerHTML='<span class="identityBtnIcon">◈</span>'+(wallet?'WALLET LINKED':'LINK XAMAN');linkBtn.disabled=!!wallet;}
    const nameField=document.getElementById('displayName');
    if(nameField&&!nameField.value&&playerAccount?.display_name)nameField.value=playerAccount.display_name.slice(0,20);
  }
}
async function loadPlayerAccount(){
  if(!authSession?.user){playerAccount=null;renderIdentity();return;}
  const client=await getSupabaseClient();
  const {data,error}=await client.from('player_accounts').select('user_id,email,display_name,selected_character,wallet_address,wallet_verified_at').eq('user_id',authSession.user.id).maybeSingle();
  if(error){setIdentityStatus('Account profile could not be loaded: '+error.message,'error');return;}
  playerAccount=data||null; renderIdentity();
  applyKnownAccountPresentation();
  setTimeout(()=>window.atmRestoreAccountLocation?.(),0);
  window.atmLockerAccountUpdated?.();
}

function applyKnownAccountPresentation(){
  if(!authSession?.user||!playerAccount)return false;
  const savedCharacter=ALLOWED_CHARACTERS.includes(playerAccount.selected_character)?playerAccount.selected_character:'classic';
  try{selectCharacter(savedCharacter);}catch(_error){selectedCharacter=savedCharacter;}
  const nameField=document.getElementById('displayName');
  if(nameField&&playerAccount.display_name)nameField.value=String(playerAccount.display_name).slice(0,20);
  if(playerAccount.display_name)playerName=String(playerAccount.display_name).slice(0,20);
  return true;
}
async function openKnownAccountProfile(){
  if(!authSession?.user)return false;
  // A late duplicate passkey/auth completion can arrive after multiplayer has
  // already opened. Never put the entry UI back on top of an active town.
  if(townEntryActive){hideTownAccessFlow();return true;}
  if(!playerAccount)await loadPlayerAccount();
  applyKnownAccountPresentation();
  if(window.atmShowFlowScreen)window.atmShowFlowScreen('profile');
  return true;
}
window.atmOpenKnownAccountProfile=openKnownAccountProfile;

async function initializeIdentity(){
  try{
    const client=await getSupabaseClient();
    const {data}=await client.auth.getSession(); authSession=data.session||null;
    await loadPlayerAccount();
    await window.ATMPay?.refresh?.();
    await window.ATMPWA?.onAuthChanged?.(Boolean(authSession?.user));
    resumePendingXamanLink();
    resumePendingMagnetPayment();
    client.auth.onAuthStateChange((_event,session)=>{
      // Keep the Supabase auth callback synchronous. Follow-up profile/API work
      // is deferred so a token refresh cannot re-enter the auth lock or race the
      // access flow while the player is entering the town.
      window.ATMEmbeddedWallet?.resetForAuthChange?.();
      authSession=session||null;
      setTimeout(async()=>{
        await loadPlayerAccount();
        if(authSession?.user)await window.ATMPay?.refresh?.();
        await window.ATMPWA?.onAuthChanged?.(Boolean(authSession?.user));
        resumePendingXamanLink();
        resumePendingMagnetPayment();
      },0);
    });
  }catch(error){
    document.getElementById('identityLoading').style.display='none';document.getElementById('identityGuest').style.display='block';
    setIdentityStatus('Account service unavailable. Guest play still works.','error');
  }
}
async function sendEmailLogin(){
  const email=(document.getElementById('identityEmail').value||'').trim();
  if(!/^\S+@\S+\.\S+$/.test(email)){setIdentityStatus('Enter a valid email address.','error');return;}
  const btn=document.getElementById('emailLoginBtn');btn.disabled=true;btn.textContent='SENDING…';
  try{
    const client=await getSupabaseClient();
    const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:'https://atm-town-web.vercel.app'}});
    if(error)throw error;
    setIdentityStatus('Check your email and open the ATM Town sign-in link.','ok');
  }catch(error){setIdentityStatus(error.message||'Email sign-in failed.','error');}
  finally{btn.disabled=false;btn.innerHTML='<span class="identityBtnIcon">✉</span>SEND VERIFICATION EMAIL';}
}
async function signInWithPasskey(){
  if(passkeySignInInProgress)return false;
  passkeySignInInProgress=true;
  const btn=document.getElementById('passkeyLoginBtn');
  const landingBtn=document.getElementById('landingLoginBtn');
  if(btn){btn.disabled=true;btn.textContent='WAITING…';}
  if(landingBtn){landingBtn.disabled=true;landingBtn.setAttribute('aria-busy','true');}
  try{
    setIdentityStatus('Opening your device passkey…');
    const client=await getSupabaseClient();const {data,error}=await client.auth.signInWithPasskey();if(error)throw error;
    authSession=data?.session||authSession||(await client.auth.getSession()).data.session||null;
    await loadPlayerAccount();
    await window.ATMPay?.refresh?.();
    setIdentityStatus('Passkey sign-in complete.','ok');
    if(!townEntryActive)await openKnownAccountProfile();
    return true;
  }catch(error){setIdentityStatus(error.message||'No ATM Town passkey was found on this device. Use Sign Up to verify your email.','error');return false;}
  finally{
    passkeySignInInProgress=false;
    if(btn){btn.disabled=false;btn.innerHTML='<span class="identityBtnIcon">⌁</span>USE PASSKEY';}
    if(landingBtn){landingBtn.disabled=false;landingBtn.removeAttribute('aria-busy');}
  }
}
async function registerPasskey(){
  if(!authSession?.user){setIdentityStatus('Sign in by email before adding a passkey.','error');return;}
  const btn=document.getElementById('registerPasskeyBtn');btn.disabled=true;btn.textContent='WAITING…';
  try{
    const client=await getSupabaseClient(); const {error}=await client.auth.registerPasskey({friendlyName:'ATM Town '+new Date().toLocaleDateString()}); if(error)throw error;
    setIdentityStatus('Passkey added to this account.','ok');
  }catch(error){setIdentityStatus(error.message||'Passkey registration was not completed.','error');}
  finally{btn.disabled=false;btn.innerHTML='<span class="identityBtnIcon">⌁</span>ADD PASSKEY';}
}
async function apiWithAuth(url,options={}){
  const token=authSession?.access_token;if(!token)throw new Error('Sign in first.');
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,...(options.headers||{})}});
  const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error||'Request failed.'); return data;
}
// Narrow bridge for the isolated v234 embedded-wallet module. It receives only
// the authenticated API helper/client accessor; wallet secrets never cross it.
window.atmApiWithAuth=apiWithAuth;
window.atmGetSupabaseClient=getSupabaseClient;
async function linkXamanWallet(){
  if(!authSession?.user){setIdentityStatus('Sign in by email or passkey before linking Xaman.','error');return;}
  const btn=document.getElementById('linkWalletBtn');btn.disabled=true;btn.textContent='Opening Xaman…';
  setXamanLinkBar('Creating a secure wallet verification request…','waiting');
  try{
    const data=await apiWithAuth('/api/xaman-link?action=start',{method:'POST',body:'{}'});
    const pending={payload_uuid:data.payload_uuid,expires_at:data.expires_at||null,created_at:new Date().toISOString()};
    savePendingXamanLink(pending);
    try{localStorage.setItem('atm_signup_pending','1');}catch(_error){}
    setXamanLinkBar('Opening Xaman. Sign the request, then return to ATM Town.','waiting');
    // Same-tab navigation prevents Android from leaving the player on a separate
    // Xaman web request tab. Xaman's return URL brings this tab back to ATM Town.
    window.location.assign(data.deeplink);
  }catch(error){
    setXamanLinkBar(error.message||'Could not start Xaman linking.','error');
    btn.disabled=false;btn.textContent='Connect Xaman';
  }
}
function finishWalletPoll(){
  if(walletPollTimer)clearTimeout(walletPollTimer);walletPollTimer=null;walletPollPayloadUuid='';walletResumeAttempts=0;
}
function pollWalletLink(payloadUuid){
  if(!/^[0-9a-f-]{36}$/i.test(String(payloadUuid||'')))return;
  if(walletPollPayloadUuid===payloadUuid&&walletPollTimer)return;
  finishWalletPoll();walletPollPayloadUuid=payloadUuid;let attempts=0;
  const check=async()=>{
    if(document.hidden){walletPollTimer=setTimeout(check,1800);return;}
    attempts++;
    try{
      const data=await apiWithAuth('/api/xaman-link?action=status&payload_uuid='+encodeURIComponent(payloadUuid));
      if(data.status==='signed'){
        finishWalletPoll();clearPendingXamanLink();
        await loadPlayerAccount();
        const wallet=data.wallet_address||playerAccount?.wallet_address||'';
        setXamanLinkBar('Signed successfully. Wallet linked'+(wallet?' · '+shortWallet(wallet):'.'),'success');
        const signupStatus=document.getElementById('signupStatus');if(signupStatus){signupStatus.textContent='Xaman wallet verified and linked.';signupStatus.classList.add('ok');signupStatus.classList.remove('danger');}
        resetXamanLinkButton();return;
      }
      if(data.status==='rejected'){
        finishWalletPoll();clearPendingXamanLink();setXamanLinkBar('The Xaman request was rejected. Tap Connect Xaman to try again.','error');resetXamanLinkButton();return;
      }
      if(data.status==='failed'){
        finishWalletPoll();clearPendingXamanLink();setXamanLinkBar(data.error||'The wallet could not be linked to this account.','error');resetXamanLinkButton();return;
      }
      if(data.status==='expired'){
        // Xaman can still resolve a request after expiry if it was opened first,
        // so keep checking briefly instead of treating expiry as immediately final.
        setXamanLinkBar('The request expired, but ATM Town is checking for a completed signature…','waiting');
      }else if(data.phase==='opened'){
        setXamanLinkBar('Xaman opened. Waiting for the signed result…','waiting');
      }else{
        setXamanLinkBar('Checking the Xaman signature…','waiting');
      }
    }catch(error){
      setXamanLinkBar('Signed request not confirmed yet. Checking again…','waiting');
    }
    if(attempts<12){walletPollTimer=setTimeout(check,3000);}else{
      finishWalletPoll();setXamanLinkBar('No final result was received yet. Return to this page after signing and ATM Town will check again.','waiting');resetXamanLinkButton();
    }
  };
  check();
}
function resumePendingXamanLink(){
  const returnedUuid=xamanReturnPayloadFromUrl();
  if(returnedUuid)savePendingXamanLink({payload_uuid:returnedUuid,returned_at:new Date().toISOString()});
  const pending=readPendingXamanLink();if(!pending)return;
  try{localStorage.setItem('atm_signup_pending','1');}catch(_error){}
  // Resume the wallet check in the background during gameplay. A stale or
  // slow Xaman return must not reopen the landing/signup flow over the town.
  if(!townEntryActive&&window.atmShowFlowScreen)window.atmShowFlowScreen('signup');
  setXamanLinkBar('Checking whether the Xaman request was signed…','waiting');
  if(!authSession?.access_token){
    if(walletResumeAttempts++<20)setTimeout(resumePendingXamanLink,400);
    return;
  }
  walletResumeAttempts=0;pollWalletLink(pending.payload_uuid);
}
async function signOutAccount(){
  try{window.ATMEmbeddedWallet?.resetForAuthChange?.();const client=await getSupabaseClient();await client.auth.signOut();playerAccount=null;setIdentityStatus('Signed out. Guest play is still available.');renderIdentity();}
  catch(error){setIdentityStatus(error.message||'Sign out failed.','error');}
}
document.getElementById('emailLoginBtn')?.addEventListener('click',sendEmailLogin);
document.getElementById('passkeyLoginBtn')?.addEventListener('click',signInWithPasskey);
document.getElementById('registerPasskeyBtn')?.addEventListener('click',registerPasskey);
document.getElementById('linkWalletBtn')?.addEventListener('click',linkXamanWallet);
document.getElementById('signOutBtn')?.addEventListener('click',signOutAccount);
window.addEventListener('pageshow',()=>{resumePendingXamanLink();resumePendingMagnetPayment();});
window.addEventListener('focus',()=>{resumePendingXamanLink();resumePendingMagnetPayment();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){resumePendingXamanLink();resumePendingMagnetPayment();}});
initializeIdentity();

function addChatLine(name,message,meta={}){
  if(window.ATMLiveChat?.receiveMessage){
    window.ATMLiveChat.receiveMessage({
      message_id:meta.messageId||meta.message_id||'',
      created_at:meta.createdAt||meta.created_at||new Date().toISOString(),
      sender_user_id:meta.senderUserId||meta.sender_user_id||'',
      sender_player_id:meta.senderPlayerId||meta.sender_player_id||'',
      sender_name:name,
      message,
      room:roomName
    },{local:Boolean(meta.local),historical:Boolean(meta.historical)});
    return;
  }
  const log=document.getElementById('chatLog');if(!log)return;const line=document.createElement('div');line.className='chatLine';line.textContent=name+': '+message;log.appendChild(line);while(log.children.length>4)log.removeChild(log.firstChild);setTimeout(()=>line.remove(),5000);
}
function showBubble(id,name,message,x,y,map,meta={}){chatBubbles.push({id,name,message,x,y,map,expires:Date.now()+6500});addChatLine(name,message,{...meta,senderPlayerId:id});}
async function connectMultiplayer(){
  const panel=document.getElementById('multiplayerPanel');
  const button=document.getElementById('joinOnline');
  if(townEntryInProgress)return;
  if(townEntryActive&&onlineMode){hideTownAccessFlow();return;}
  if(button.disabled)return;
  townEntryInProgress=true;
  const statusEl=document.getElementById('loginStatus');
  const nameInput=document.getElementById('displayName');
  const roomInput=document.getElementById('roomName');
  const urlInput=document.getElementById('supabaseUrl');
  const keyInput=document.getElementById('supabaseKey');

  playerName=(nameInput.value||'').trim().slice(0,20);
  roomName=(roomInput.value||'atm-town-alpha').trim().slice(0,40);
  const url=urlInput.value.trim(),key=keyInput.value.trim();

  if(!playerName){
    statusEl.textContent='Enter a display name first.';
    statusEl.style.color='#ffd166';
    nameInput.focus();
    townEntryInProgress=false;
    return;
  }
  if(!url||!key){
    statusEl.textContent='Supabase connection details are missing.';
    statusEl.style.color='#ff8fa8';
    townEntryInProgress=false;
    return;
  }
  button.disabled=true;
  button.textContent='LOADING ONLINE MODE...';
  button.style.opacity='.65';
  statusEl.textContent='Loading secure multiplayer connection...';
  statusEl.style.color='#9fc3cc';
  try{
    await loadSupabaseLibrary();
  }catch(err){
    statusEl.textContent=(err&&err.message)?err.message:'Multiplayer library could not be loaded.';
    statusEl.style.color='#ff8fa8';
    button.disabled=false;
    button.textContent='RETRY JOIN';
    button.style.opacity='1';
    townEntryInProgress=false;
    return;
  }

  button.textContent='CONNECTING...';
  statusEl.textContent='Connecting to room '+roomName+'...';
  statusEl.style.color='#9fc3cc';

  safeStorageSet('atm_mp',JSON.stringify({playerName,roomName,url,key,character:selectedCharacter}));

  try{
    if(realtimeChannel){
      try{await realtimeChannel.unsubscribe();}catch(_e){}
      realtimeChannel=null;
    }
    remotePlayers.clear();
    onlineMode=false;

    supabaseClient=await getSupabaseClient();
    realtimeChannel=supabaseClient.channel('atm-town:'+roomName,{config:{presence:{key:playerId},broadcast:{self:false}}});
    realtimeChannel.on('presence',{event:'sync'},()=>{
      const state=realtimeChannel.presenceState();
      presencePlayers.clear();
      for(const [presenceKey,rawMetas] of Object.entries(state||{})){
        const metas=Array.isArray(rawMetas)?rawMetas:[rawMetas];
        const meta=metas[metas.length-1]||{};
        const id=String(meta.id||presenceKey||'');
        if(!id)continue;
        presencePlayers.set(id,{
          id,
          name:String(meta.name||'Player').slice(0,30),
          map:String(meta.map||''),
          character:String(meta.character||'classic').slice(0,40),
          online_at:String(meta.online_at||''),
          atmPay:meta.atmPay&&typeof meta.atmPay==='object'?meta.atmPay:null
        });
      }
      currentOnlineCount=Math.max(1,presencePlayers.size);
      if(window.ATMPeopleHub?.setOnlineCount)window.ATMPeopleHub.setOnlineCount(currentOnlineCount);
      else document.getElementById('onlineBadge').textContent=currentOnlineCount+' online';
      window.dispatchEvent(new CustomEvent('atm:online-players-changed'));
    });
    realtimeChannel.on('broadcast',{event:'player_state'},({payload})=>{
      if(payload.id===playerId)return;
      const old=remotePlayers.get(payload.id)||{};
      remotePlayers.set(payload.id,{...old,...payload,lastSeen:Date.now(),drawX:old.drawX??payload.x,drawY:old.drawY??payload.y});updateVoiceProximityVolumes();updateVoiceCount();window.dispatchEvent(new CustomEvent('atm:online-players-changed'));
    });
    realtimeChannel.on('broadcast',{event:'chat'},({payload})=>{
      if(payload.id!==playerId)showBubble(payload.id,payload.name,payload.message,payload.x,payload.y,payload.map,{messageId:payload.message_id,createdAt:payload.created_at,senderUserId:payload.user_id});
    });
    realtimeChannel.on('broadcast',{event:'player_ping'},({payload})=>{
      const myUserId=String(window.ATMPay?.getPublicIdentity?.()?.user_id||'');
      if(!payload||!myUserId||String(payload.target_user_id||'')!==myUserId)return;
      window.ATMPWA?.receivePing?.(payload);
    });
    realtimeChannel.on('broadcast',{event:'world_event_hint'},({payload})=>{
      if(!payload||String(payload.sender_id||'')===playerId)return;
      window.ATMWorldEvents?.refresh?.('realtime-hint');
    });
    realtimeChannel.on('broadcast',{event:'zombie_combat'},({payload})=>{
      if(!payload||String(payload.senderId||'')===playerId)return;
      window.ATMZombieOutbreak?.receiveNetwork?.(payload);
    });
    realtimeChannel.on('broadcast',{event:'nft_trade_offer'},({payload})=>{
      if(!payload||String(payload.sellerWallet||'')!==lockerWalletAddress())return;
      const amount=Number(payload.amountXrp||0);showXrplPaymentToast(`${payload.buyerName||'A player'} made a ${amount} XRP offer on your displayed NFT.`,'success',10000);
      lockerState.nftBuyOffers.delete(String(payload.tokenId||'').toUpperCase());
    });
    realtimeChannel.on('broadcast',{event:'leave'},({payload})=>{remotePlayers.delete(payload.id);window.dispatchEvent(new CustomEvent('atm:online-players-changed'));});

    await new Promise((resolve,reject)=>{
      let settled=false;
      const timer=setTimeout(()=>{
        if(settled)return;
        settled=true;
        reject(new Error('Connection timed out. Check mobile data or Wi-Fi and try again.'));
      },20000);

      realtimeChannel.subscribe(async channelStatus=>{
        if(settled)return;
        if(channelStatus==='SUBSCRIBED'){
          settled=true;
          clearTimeout(timer);
          try{
            onlineMode=true;
            await realtimeChannel.track({id:playerId,name:playerName,map:currentMap,character:selectedCharacter,online_at:new Date().toISOString(),atmPay:window.ATMPay?.getPublicIdentity?.()||null});
            broadcastState(true);
            if(authSession?.user){supabaseClient.from('player_accounts').update({display_name:playerName,selected_character:selectedCharacter}).eq('user_id',authSession.user.id).then(()=>{});}
            window.ATMLiveChat?.connectRoom?.(roomName);
            resolve();
          }catch(err){reject(err);}
        }else if(channelStatus==='CHANNEL_ERROR' || channelStatus==='TIMED_OUT' || channelStatus==='CLOSED'){
          settled=true;
          clearTimeout(timer);
          reject(new Error('Could not join the multiplayer room ('+channelStatus+').'));
        }
      });
    });

    statusEl.textContent='Connected. Entering ATM Town...';
    statusEl.style.color='#7cf7bd';
    townEntryActive=true;
    hideTownAccessFlow();
    // Do not leave this control permanently disabled. If an OS/browser restore
    // ever exposes the profile screen, it remains recoverable instead of dead.
    button.disabled=false;
    button.textContent='Enter Town Online';
    button.style.opacity='1';
  }catch(err){
    onlineMode=false;
    statusEl.textContent=(err&&err.message)?err.message:'Unable to connect. Please try again.';
    statusEl.style.color='#ff8fa8';
    button.disabled=false;
    button.textContent='RETRY JOIN';
    button.style.opacity='1';
  }finally{
    townEntryInProgress=false;
  }
}
function broadcastState(force=false){
  if(!onlineMode||!realtimeChannel)return;const now=Date.now();if(!force&&now-lastBroadcast<100)return;lastBroadcast=now;
  realtimeChannel.send({type:'broadcast',event:'player_state',payload:{id:playerId,name:playerName,x:player.x,y:player.y,dir:player.dir,frame:player.frame,jump:jumpLift(),jetpack:jetpackState.thrusting,jetpackActive:jetpackState.active,jetpackEquipped:canUseJetpack(),map:currentMap,voiceZone:currentBroadcastVoiceZoneId(),activity:currentPlayerActivity,character:selectedCharacter,loadout:{body:(window.atmActiveLoadout||{}).body||null,chest:(window.atmActiveLoadout||{}).chest||null,face:(window.atmActiveLoadout||{}).face||null,head:(window.atmActiveLoadout||{}).head||null,back:(window.atmActiveLoadout||{}).back||null,katana:(window.atmActiveLoadout||{}).katana||null,hands:(window.atmActiveLoadout||{}).hands||null,feet:(window.atmActiveLoadout||{}).feet||null,aura:(window.atmActiveLoadout||{}).aura||null},powers:{invisibility:powerUps.invisibility>0,juggernaut:powerUps.juggernaut>0,fire:powerUps.fire>0},zombieCombat:window.ATMZombieOutbreak?.getBroadcastState?.()||null,propHunt:window.ATMPropHunt?.getBroadcastState?.()||null,tradeBeacon:tradeBeaconBroadcastPayload(),atmPay:window.ATMPay?.getPublicIdentity?.()||null}});
}
window.addEventListener('atm:world-event-triggered',(event)=>{
  if(!onlineMode||!realtimeChannel)return;
  const detail=event?.detail||{};
  try{realtimeChannel.send({type:'broadcast',event:'world_event_hint',payload:{sender_id:playerId,event_id:String(detail.event_id||''),event_type:String(detail.type||''),sent_at:Date.now()}});}catch(_error){}
  // Push the local combat/event state immediately instead of waiting for the
  // normal 100 ms multiplayer heartbeat.
  broadcastState(true);
});

window.addEventListener('atm:zombie-survival-change',()=>broadcastState(true));

window.addEventListener('atm:zombie-network-send',(event)=>{
  if(!onlineMode||!realtimeChannel)return;
  const detail=event?.detail;
  if(!detail||String(detail.eventId||'')==='')return;
  try{
    realtimeChannel.send({
      type:'broadcast',
      event:'zombie_combat',
      payload:{...detail,senderId:playerId,sentAt:Date.now()}
    });
  }catch(_error){}
});

const ARCADE_GAME_PRESENCE_CONFIG=Object.freeze({
  'sky-run':{panel:'skyRunPanel',label:'SKY RUN'},
  'platform-panic':{panel:'platformPanicPanel',label:'PLATFORM PANIC'},
  'ring-rumble':{panel:'ringRumblePanel',label:'RING RUMBLE'},
  'flappy-jetpack':{panel:'flappyJetpackPanel',label:'FLAPPY JETPACK'},
  'neon-racer':{panel:'neonRacerPanel',label:'NEON RACER'}
});
function characterPreviewSource(characterId){
  return document.querySelector(`.characterChoice[data-character="${characterId||'classic'}"] img`)?.src||document.querySelector('.characterChoice[data-character="classic"] img')?.src||'';
}
function ensureArcadeGamePresence(){
  for(const [gameId,config] of Object.entries(ARCADE_GAME_PRESENCE_CONFIG)){
    const panel=document.getElementById(config.panel);if(!panel||panel.querySelector('.arcadeGamePresence'))continue;
    const box=document.createElement('aside');box.className='arcadeGamePresence';box.dataset.gameId=gameId;box.hidden=true;
    const title=document.createElement('div');title.className='arcadeGamePresenceTitle';title.textContent='PLAYERS IN THIS GAME';
    const list=document.createElement('div');list.className='arcadeGamePresenceList';box.append(title,list);panel.appendChild(box);
  }
}
function updateArcadeGamePresence(){
  ensureArcadeGamePresence();const now=Date.now();
  for(const [gameId,config] of Object.entries(ARCADE_GAME_PRESENCE_CONFIG)){
    const panel=document.getElementById(config.panel),box=panel?.querySelector('.arcadeGamePresence'),list=box?.querySelector('.arcadeGamePresenceList');if(!box||!list)continue;
    const panelOpen=panel.classList.contains('open');box.hidden=!panelOpen;if(!panelOpen)continue;
    const players=[];
    if(currentPlayerActivity?.type==='arcade-game'&&currentPlayerActivity.gameId===gameId)players.push({id:playerId,name:playerName||'You',character:selectedCharacter,local:true});
    for(const [id,p] of remotePlayers){
      if(now-(p.lastSeen||0)>9000||p.map!=='arcade'||p.activity?.type!=='arcade-game'||p.activity.gameId!==gameId)continue;
      players.push({id,name:p.name||'Player',character:p.character||'classic',local:false});
    }
    list.replaceChildren();
    if(!players.length){const empty=document.createElement('div');empty.className='arcadeGamePresenceEmpty';empty.textContent='No other players are currently in this game.';list.appendChild(empty);continue;}
    for(const p of players){
      const row=document.createElement('div');row.className='arcadeGamePresencePlayer'+(p.local?' local':'');
      const src=characterPreviewSource(p.character);if(src){const img=document.createElement('img');img.src=src;img.alt='';row.appendChild(img);}else row.appendChild(document.createElement('span'));
      const copy=document.createElement('div'),name=document.createElement('strong'),status=document.createElement('small');name.textContent=p.local?(p.name+' · YOU'):p.name;status.textContent='IN-GAME · '+config.label;copy.append(name,status);row.appendChild(copy);list.appendChild(row);
    }
  }
}
setInterval(updateArcadeGamePresence,500);

function publishArcadeGameState(gameId,stateData){
  if(currentPlayerActivity?.type!=='arcade-game'||currentPlayerActivity.gameId!==gameId)return;
  currentPlayerActivity={...currentPlayerActivity,state:{...stateData,updatedAt:Date.now()}};broadcastState();
}
function arcadeGameRemotePlayers(gameId){
  const now=Date.now(),list=[];
  for(const [id,p] of remotePlayers){
    const raw=p.activity?.state;if(now-(p.lastSeen||0)>9000||p.map!=='arcade'||p.activity?.type!=='arcade-game'||p.activity.gameId!==gameId||!raw)continue;
    const cache=p._arcadeGameDraw||(p._arcadeGameDraw={});let draw=cache[gameId];if(!draw)draw=cache[gameId]={x:raw.x??0,y:raw.y??0,rotation:raw.rotation??0};
    if(Number.isFinite(raw.x))draw.x+=(raw.x-draw.x)*.28;if(Number.isFinite(raw.y))draw.y+=(raw.y-draw.y)*.28;if(Number.isFinite(raw.rotation))draw.rotation+=(raw.rotation-draw.rotation)*.24;
    list.push({...p,miniState:{...raw,x:draw.x,y:draw.y,rotation:draw.rotation}});
  }
  return list;
}
function drawArcadeMiniGhost(targetCtx,remote,x,footY,dir='right',frame=1,scale=.185){
  if(!targetCtx||!remote)return;let characterId=remote.character||'classic',loadout=remote.loadout||{},config=CHARACTER_SHEETS?.[characterId],image=characterSheetImgs?.[characterId];
  if(characterId==='classic'&&loadout.body&&ATM_EQUIPMENT_SHEETS?.[loadout.body]&&equipmentSheetImgs?.[loadout.body]?.complete&&equipmentSheetImgs[loadout.body].naturalWidth){config=ATM_EQUIPMENT_SHEETS[loadout.body];image=equipmentSheetImgs[loadout.body];}
  const drawLayer=(img,cfg)=>{if(!img?.complete||!img.naturalWidth||!cfg)return;const cols=cfg.cols||3,rows=cfg.rows||4,fw=Math.floor(img.naturalWidth/cols),fh=Math.floor(img.naturalHeight/rows),row=Math.max(0,(cfg.rowOrder||['down','left','up','right']).indexOf(dir)),safeFrame=Math.max(0,Math.min(cols-1,frame)),ax=Number.isFinite(cfg.anchorX)?cfg.anchorX:fw/2,ay=Number.isFinite(cfg.anchorY)?cfg.anchorY:fh-1;targetCtx.drawImage(img,safeFrame*fw,row*fh,fw,fh,Math.round(x-ax*scale),Math.round(footY-ay*scale),Math.round(fw*scale),Math.round(fh*scale));};
  targetCtx.save();targetCtx.globalAlpha=.62;
  if(config&&image?.complete&&image.naturalWidth)drawLayer(image,config);else{targetCtx.fillStyle='#9fc3cc';targetCtx.fillRect(x-14,footY-44,28,44);}
  if(characterId==='classic'){
    for(const slot of ['back','katana','chest','face','feet','head','hands']){const id=loadout[slot],cfg=ATM_EQUIPMENT_SHEETS?.[id],img=equipmentSheetImgs?.[id];if(id)drawLayer(img,cfg);}
  }
  targetCtx.globalAlpha=.92;targetCtx.font='900 9px system-ui';targetCtx.textAlign='center';const label=String(remote.name||'Player').slice(0,22),w=Math.min(130,targetCtx.measureText(label).width+12);targetCtx.fillStyle='rgba(3,10,14,.82)';targetCtx.fillRect(x-w/2,footY-66,w,15);targetCtx.fillStyle='#eaffff';targetCtx.fillText(label,x,footY-55);targetCtx.restore();
}
window.atmPublishArcadeGameState=publishArcadeGameState;
window.atmArcadeGameRemotes=arcadeGameRemotePlayers;
window.atmDrawArcadeMiniGhost=drawArcadeMiniGhost;

let multiplayerResumeInProgress=false;
let lastMultiplayerResumeAt=0;
async function resumeMultiplayerConnection(){
  const openingPanel=document.getElementById('multiplayerPanel');
  const accessOverlay=document.getElementById('landingOverlay');
  // If the browser restores stale access-flow DOM after the player entered,
  // repair it immediately instead of trapping gameplay behind a disabled page.
  if(townEntryActive&&accessOverlay&&getComputedStyle(accessOverlay).display!=='none')hideTownAccessFlow();
  // Keep the access flow open until the player deliberately starts.
  if(!townEntryActive&&((openingPanel&&getComputedStyle(openingPanel).display!=='none')||(accessOverlay&&getComputedStyle(accessOverlay).display!=='none')))return;
  if(document.hidden||multiplayerResumeInProgress)return;
  const now=Date.now();
  if(now-lastMultiplayerResumeAt<1200)return;
  lastMultiplayerResumeAt=now;
  const saved=safeJsonParse(safeStorageGet('atm_mp','{}'),{});
  if(!saved.url||!saved.key||!saved.playerName)return;
  multiplayerResumeInProgress=true;
  try{
    const channelReady=onlineMode&&realtimeChannel&&(realtimeChannel.state==='joined'||realtimeChannel.state==='subscribed');
    if(channelReady){
      try{
        await realtimeChannel.track({id:playerId,name:playerName,map:currentMap,character:selectedCharacter,online_at:new Date().toISOString(),atmPay:window.ATMPay?.getPublicIdentity?.()||null});
        broadcastState(true);
        setTimeout(()=>broadcastState(true),300);
        return;
      }catch(_e){}
    }
    onlineMode=false;
    if(realtimeChannel){try{await realtimeChannel.unsubscribe();}catch(_e){} realtimeChannel=null;}
    const button=document.getElementById('joinOnline');
    if(button){button.disabled=false;button.textContent='JOIN ONLINE';button.style.opacity='1';}
    await connectMultiplayer();
    broadcastState(true);
    setTimeout(()=>broadcastState(true),300);
  }finally{
    multiplayerResumeInProgress=false;
  }
}
window.addEventListener('pageshow',()=>setTimeout(resumeMultiplayerConnection,250));
window.addEventListener('focus',()=>setTimeout(resumeMultiplayerConnection,250));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(resumeMultiplayerConnection,250);});
let lastChatSentAt=0;
function sendChat(){
  const input=document.getElementById('chatInput');const message=String(input?.value||'').replace(/\s+/g,' ').trim().slice(0,180);if(!message)return;
  const keepLiveChatFocused=!!window.ATMLiveChat?.isOpen?.();
  const now=Date.now();if(now-lastChatSentAt<500)return;lastChatSentAt=now;input.value='';
  const messageId=globalThis.crypto?.randomUUID?.()||`chat_${now}_${Math.random().toString(36).slice(2,12)}`;
  const createdAt=new Date(now).toISOString();const senderUserId=String(authSession?.user?.id||'');
  showBubble(playerId,playerName,message,player.x,player.y,currentMap,{messageId,createdAt,senderUserId,local:true});
  if(onlineMode&&realtimeChannel){
    realtimeChannel.send({type:'broadcast',event:'chat',payload:{id:playerId,user_id:senderUserId,name:playerName,message,message_id:messageId,created_at:createdAt,x:player.x,y:player.y,map:currentMap}});
    window.ATMLiveChat?.persistSentMessage?.({message_id:messageId,message});
  }
  if(keepLiveChatFocused&&input){
    requestAnimationFrame(()=>{
      if(!window.ATMLiveChat?.isOpen?.())return;
      try{input.focus({preventScroll:true});}catch(_e){input.focus();}
      window.ATMHudLayout?.sync?.();
    });
  }
}
window.atmSendChat=sendChat;
function updateRemoteInterpolation(){
  const now=Date.now();
  for(const [id,p] of remotePlayers){
    if(now-p.lastSeen>12000){remotePlayers.delete(id);continue;}
    const beforeX=Number(p.drawX),beforeY=Number(p.drawY);
    p.drawX+=(p.x-p.drawX)*.22;
    p.drawY+=(p.y-p.drawY)*.22;

    // v235.12.1 invisibility is asymmetric by design: the player using it can
    // still see a faint self, while everybody else sees only moving footprints.
    // Generate those footprints locally from the already-synchronized remote
    // movement so we do not add another realtime packet type.
    const remoteInvisible=!!p?.powers?.invisibility;
    const remoteDowned=!!p?.zombieCombat?.downed;
    const remoteAirborne=(Number(p.jump)||0)>1||!!p.jetpackActive;
    const travel=(Number.isFinite(beforeX)&&Number.isFinite(beforeY))?Math.hypot(p.drawX-beforeX,p.drawY-beforeY):0;
    if(remoteInvisible&&!remoteDowned&&!remoteAirborne&&p.map===currentMap&&travel>.01){
      p._invisibleStepCarry=(Number(p._invisibleStepCarry)||0)+travel;
      while(p._invisibleStepCarry>=28){
        spawnFootstepEffect(p.drawX,p.drawY,p.dir||'down','rgba(188,243,255,.36)',.92);
        p._invisibleStepCarry-=28;
      }
    }else if(!remoteInvisible||remoteDowned||remoteAirborne||p.map!==currentMap){
      p._invisibleStepCarry=0;
    }
  }
}
const JUMP_DIRECTIONAL_ACCEL=1450;
const JUMP_MOMENTUM_DRAG=2.8;
const JUMP_MOMENTUM_STOP_SPEED=4;
const jumpState={active:false,elapsed:0,duration:.64,baseHeight:38,profileHeight:38,profileDuration:.64,astronautLowGravity:false,bounceBoost:false,lastSafeX:TOWN_INITIAL_SPAWN.x,lastSafeY:TOWN_INITIAL_SPAWN.y,momentumX:0,momentumY:0};
const ASTRONAUT_LOW_GRAVITY=Object.freeze({bodyId:'body:astronaut',heightMultiplier:4,durationMultiplier:2.7,bounceDurationMultiplier:2,barrierClearance:24});
function astronautLowGravityActive(){
  return selectedCharacter==='classic'&&(window.atmActiveLoadout||{}).body===ASTRONAUT_LOW_GRAVITY.bodyId;
}
function astronautJumpLowGravityActive(){
  return jumpState.active&&jumpState.astronautLowGravity;
}
function astronautJetpackLowGravityActive(){
  return jetpackState.active&&jetpackState.astronautLowGravity;
}
function buildJumpProfile(){
  const astronaut=astronautLowGravityActive();
  const bounce=powerUps.bounce>0;
  const height=jumpState.baseHeight*(astronaut?ASTRONAUT_LOW_GRAVITY.heightMultiplier:1)*(bounce?2:1);
  // Bounce adds height without replacing the astronaut profile. Doubling the
  // astronaut arc duration along with its height preserves the slow visual rise
  // and fall instead of making the combined jump race through the taller arc.
  const duration=jumpState.duration*(astronaut?ASTRONAUT_LOW_GRAVITY.durationMultiplier*(bounce?ASTRONAUT_LOW_GRAVITY.bounceDurationMultiplier:1):1);
  return{astronaut,bounce,height,duration};
}
function lockJumpProfile(){
  const profile=buildJumpProfile();
  jumpState.astronautLowGravity=profile.astronaut;
  jumpState.bounceBoost=profile.bounce;
  jumpState.profileHeight=profile.height;
  jumpState.profileDuration=profile.duration;
}
function clearJumpProfile(){
  jumpState.astronautLowGravity=false;
  jumpState.bounceBoost=false;
  jumpState.profileHeight=jumpState.baseHeight;
  jumpState.profileDuration=jumpState.duration;
}
function currentJumpDuration(){
  return jumpState.active?jumpState.profileDuration:buildJumpProfile().duration;
}
function currentJumpHeight(){
  return jumpState.active?jumpState.profileHeight:buildJumpProfile().height;
}
function jumpLift(){
  if(jetpackState.active)return Math.max(0,jetpackState.lift)+(jetpackState.thrusting?Math.sin(performance.now()*.014)*2:0);
  if(!jumpState.active)return 0;
  const p=Math.max(0,Math.min(1,jumpState.elapsed/currentJumpDuration()));
  return Math.sin(Math.PI*p)*currentJumpHeight();
}
function currentJumpVerticalVelocity(){
  if(!jumpState.active)return 0;
  const duration=Math.max(0.001,currentJumpDuration());
  const p=Math.max(0,Math.min(1,jumpState.elapsed/duration));
  return Math.PI*currentJumpHeight()/duration*Math.cos(Math.PI*p);
}
function activateJetpack(pointerId=null){
  if(currentMap!=='town'||dialogOpen||jetpackState.active||!jumpState.active||!canUseJetpack())return false;
  const startingLift=Math.max(10,jumpLift());
  const astronautJetpack=jumpState.astronautLowGravity;
  const inheritedJumpVelocity=astronautJetpack?Math.max(0,currentJumpVerticalVelocity()):0;
  jetpackState.active=true;
  jetpackState.thrusting=true;
  jetpackState.astronautLowGravity=astronautJetpack;
  jetpackState.lift=startingLift;
  jetpackState.velocity=astronautJetpack
    ?Math.min(JETPACK_MAX_RISE_SPEED,Math.max(ASTRONAUT_JETPACK_MIN_ACTIVATION_RISE_SPEED,inheritedJumpVelocity,jetpackState.velocity||0))
    :Math.max(95,jetpackState.velocity||0);
  jetpackState.releaseElapsed=0;
  jetpackState.controlPointerId=pointerId;
  jetpackState.lastSafeX=player.x;
  jetpackState.lastSafeY=player.y;
  // Preserve the player's airborne direction when switching from a jump to the jetpack.
  jetpackState.momentumX=jumpState.momentumX;
  jetpackState.momentumY=jumpState.momentumY;
  jumpState.active=false;
  jumpState.elapsed=0;
  jumpState.momentumX=0;
  jumpState.momentumY=0;
  clearJumpProfile();
  startJetpackBoostSound();
  updateJetpackHud(true);
  broadcastState(true);
  return true;
}
function beginJetpackThrust(pointerId=null){
  if(currentMap!=='town'||dialogOpen||!canUseJetpack())return false;
  if(jumpState.active)return activateJetpack(pointerId);
  if(!jetpackState.active)return false;
  jetpackState.thrusting=true;
  jetpackState.releaseElapsed=0;
  jetpackState.controlPointerId=pointerId;
  startJetpackBoostSound();
  updateJetpackHud(true);
  broadcastState(true);
  return true;
}
function releaseJetpackThrust(pointerId=null){
  if(!jetpackState.active)return;
  if(jetpackState.controlPointerId!==null&&pointerId!==null&&jetpackState.controlPointerId!==pointerId)return;
  jetpackState.thrusting=false;
  jetpackState.releaseElapsed=0;
  jetpackState.controlPointerId=null;
  stopJetpackBoostSound();
  updateJetpackHud(true);
  broadcastState(true);
}
function startJump(){
  if(dialogOpen||window.ATMZombieOutbreak?.isLocalDowned?.()===true)return;
  if(jetpackState.active){beginJetpackThrust(null);return;}
  if(jumpState.active){if(canUseJetpack())activateJetpack(null);return;}
  lockJumpProfile();
  jumpState.active=true;
  jumpState.elapsed=0;
  jumpState.lastSafeX=player.x;
  jumpState.lastSafeY=player.y;
  // Seed every jump with the player's current movement direction so releasing
  // the joystick produces a brief, natural airborne coast instead of a hard stop.
  let launchX=joy.x+gamepadState.moveX,launchY=joy.y+gamepadState.moveY;
  if(keys['a']||keys['arrowleft'])launchX-=1;
  if(keys['d']||keys['arrowright'])launchX+=1;
  if(keys['w']||keys['arrowup'])launchY-=1;
  if(keys['s']||keys['arrowdown'])launchY+=1;
  const launchMag=Math.hypot(launchX,launchY);
  const launchSpeed=player.speed*(powerUps.speed>0?1.5:1);
  if(launchMag>0){
    jumpState.momentumX=launchX/launchMag*launchSpeed;
    jumpState.momentumY=launchY/launchMag*launchSpeed;
  }else{
    jumpState.momentumX=0;
    jumpState.momentumY=0;
  }
  broadcastState(true);
}
function directionFromVector(dx,dy){
  // Movement remains fully diagonal, but character art uses the original
  // four-direction animations. The strongest axis controls facing.
  const ax=Math.abs(dx),ay=Math.abs(dy);
  if(ax>ay)return dx>=0?'right':'left';
  return dy>=0?'down':'up';
}

function canvasTextLines(value,maxWidth,maxLines=2){
  const words=String(value||'').trim().split(/\s+/).filter(Boolean),lines=[];let line='';
  for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width<=maxWidth||!line)line=test;else{lines.push(line);line=word;if(lines.length===maxLines-1)break;}}
  if(line&&lines.length<maxLines)lines.push(line);
  const used=lines.join(' ').split(/\s+/).filter(Boolean).length;if(used<words.length&&lines.length){let last=lines[lines.length-1];while(last&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);lines[lines.length-1]=(last||'')+'…';}
  return lines.length?lines:['Player'];
}
function roundedRectPath(x,y,w,h,r=7){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}

const TOWN_BOT_DEFS=Object.freeze([
  Object.freeze({id:'bot-atm',name:'ATM Bot',characterId:'classic',speed:74,pauseBase:1.4,route:[{x:1558,y:711},{x:1676,y:905},{x:1496,y:1084},{x:1376,y:870}]}),
  Object.freeze({id:'bot-fuzzy',name:'Fuzzy',characterId:'fuzzy',speed:72,pauseBase:1.7,route:[{x:888,y:659},{x:1080,y:680},{x:1080,y:740},{x:900,y:740},{x:720,y:690}]}),
  Object.freeze({id:'bot-miracle',name:'Miracle',characterId:'miracle',speed:70,pauseBase:1.9,route:[{x:1206,y:1922},{x:1378,y:2076},{x:1228,y:2258},{x:1048,y:2104}]}),
  Object.freeze({id:'bot-luci',name:'Luci',characterId:'luci',speed:76,pauseBase:1.5,route:[{x:2472,y:555},{x:2632,y:706},{x:2740,y:700},{x:2740,y:600},{x:2470,y:600},{x:2314,y:720}]}),
  Object.freeze({id:'bot-triskeleton',name:'Triskeleton',characterId:'triskeleton',speed:68,pauseBase:2.1,route:[{x:1820,y:3309},{x:2050,y:3300},{x:2200,y:3350},{x:2100,y:3400},{x:1900,y:3400},{x:1650,y:3400}]})
]);
let townBots=[];
let townBotsReady=false;
let townBotMasksReady=false;
const TOWN_BOT_ROUTE_POINTS=Object.freeze(TOWN_BOT_DEFS.flatMap(def=>(def.route||[]).map(point=>Object.freeze({x:point.x,y:point.y}))));
function clampTownCoord(x,y){
  const bounds=townWorldBounds();
  return {
    x:Math.max(bounds.minX+36,Math.min(bounds.maxX-36,Math.round(x))),
    y:Math.max(bounds.minY+40,Math.min(bounds.maxY-30,Math.round(y)))
  };
}
function findNearestTownWalkablePoint(x,y,maxRadius=220,step=18){
  const base=clampTownCoord(x,y);
  if(obstacleMask.ready&&!obstacleAtFootprint(base.x,base.y))return base;
  for(let radius=step;radius<=maxRadius;radius+=step){
    for(let angle=0;angle<360;angle+=20){
      const rad=angle*Math.PI/180;
      const candidate=clampTownCoord(base.x+Math.cos(rad)*radius,base.y+Math.sin(rad)*radius);
      if(!obstacleMask.ready||!obstacleAtFootprint(candidate.x,candidate.y))return candidate;
    }
  }
  return base;
}
function ensureTownPlayerWalkable(reason='runtime'){
  if(currentMap!=='town'||!obstacleMask.ready||!Number.isFinite(player.x)||!Number.isFinite(player.y))return false;
  if(!obstacleAtFootprint(player.x,player.y))return false;
  const originalX=player.x,originalY=player.y;
  let safe=findNearestTownWalkablePoint(originalX,originalY,720,16);
  if(obstacleAtFootprint(safe.x,safe.y))safe=findNearestTownWalkablePoint(TOWN_INITIAL_SPAWN.x,TOWN_INITIAL_SPAWN.y,960,16);
  if(obstacleAtFootprint(safe.x,safe.y)){
    console.warn('ATM Town could not find a safe walkable spawn point.',{reason,x:originalX,y:originalY});
    return false;
  }
  player.x=safe.x;
  player.y=safe.y;
  jetpackState.lastSafeX=safe.x;
  jetpackState.lastSafeY=safe.y;
  const viewW=W/zoom,viewH=H/zoom;
  const bounds=townWorldBounds(),mapW=bounds.width,mapH=bounds.height;
  cam.x=mapW<=viewW?bounds.minX+(mapW-viewW)/2:Math.max(bounds.minX,Math.min(player.x-viewW/2,bounds.maxX-viewW));
  cam.y=mapH<=viewH?bounds.minY+(mapH-viewH)/2:Math.max(bounds.minY,Math.min(player.y-viewH/2,bounds.maxY-viewH));
  console.info('ATM Town moved player to nearest safe walkable point.',{reason,from:{x:originalX,y:originalY},to:{x:safe.x,y:safe.y}});
  try{saveAccountLocation();}catch(_error){}
  return true;
}

function townBotPauseDuration(bot,nextIndex=bot.targetIndex){
  return bot.pauseBase+(((bot.seed||1)+nextIndex)%3)*0.35;
}
function townBotStringSeed(value){
  let hash=2166136261;
  for(const ch of String(value||'')){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}
function townBotSeededRandom(seed){
  let state=(seed>>>0)||0x6d2b79f5;
  return ()=>{
    state+=0x6D2B79F5;
    let t=state;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function buildTownBotAtmLoadout(botId='bot-atm'){
  // Generate an ATM-only wardrobe that belongs to the NPC, never the local player.
  // The six-hour seed keeps the assortment consistent for players who load the same town period.
  const appearanceCycle=Math.floor(getSharedTownTimeMs()/(6*60*60*1000));
  const random=townBotSeededRandom(townBotStringSeed(botId+':'+appearanceCycle));
  const choicesBySlot={body:[],back:[],katana:[],chest:[],face:[],hands:[],feet:[],head:[]};
  for(const [itemId,config] of Object.entries(ATM_EQUIPMENT_SHEETS)){
    const slot=config?.slot;
    if(!choicesBySlot[slot])continue;
    if(slot==='body'&&itemId==='body:astronaut')continue;
    choicesBySlot[slot].push(itemId);
  }
  const pick=slot=>{
    const choices=choicesBySlot[slot]||[];
    return choices.length?choices[Math.floor(random()*choices.length)]:null;
  };
  const loadout={
    body:pick('body'),
    chest:pick('chest'),
    face:pick('face'),
    hands:pick('hands'),
    feet:pick('feet')
  };
  if(random()>.28)loadout.head=pick('head');
  if(random()>.36)loadout.back=pick('back');
  if(random()>.72)loadout.katana=pick('katana');
  return loadout;
}
function createTownBot(def,index){
  const route=(def.route||[]).map(point=>findNearestTownWalkablePoint(point.x,point.y));
  const startIndex=route.length?((index%route.length)+route.length)%route.length:0;
  const start=route[startIndex]||findNearestTownWalkablePoint(TOWN_INITIAL_SPAWN.x,TOWN_INITIAL_SPAWN.y);
  const targetIndex=route.length?(startIndex+1)%route.length:0;
  return {
    ...def,
    seed:index+1,
    route,
    x:start.x,
    y:start.y,
    drawX:start.x,
    drawY:start.y,
    dir:'down',
    frame:1,
    animTimer:0,
    moving:false,
    wait:townBotPauseDuration({pauseBase:def.pauseBase,seed:index+1,targetIndex},targetIndex)*0.6,
    routeIndex:startIndex,
    targetIndex,
    stuckFor:0,
    loadout:def.characterId==='classic'?buildTownBotAtmLoadout(def.id):{}
  };
}
function ensureTownBotsReady(){
  if(townBotsReady||!townBotMasksReady||!obstacleMask.ready)return;
  townBots=TOWN_BOT_DEFS.map((def,index)=>createTownBot(def,index));
  townBotsReady=true;
}
function resetTownBots(){
  townBotsReady=false;
  townBots.length=0;
}
async function initializeTownStreamingGameplay(){
  try{
    await townWorldStream.ready;
    await Promise.all([
      townWorldStream.preloadPlayerNeighborhood(player.x,player.y),
      townWorldStream.preloadMaskPoints(TOWN_BOT_ROUTE_POINTS,['collision','stairs'],1)
    ]);
    townBotMasksReady=true;
    resetTownBots();
    if(currentMap==='town'){
      ensureTownBotsReady();
      ensureTownPlayerWalkable('streamed-world-initialization');
    }
  }catch(error){
    console.error('ATM Town streamed gameplay masks failed to initialize.',error);
  }
}
initializeTownStreamingGameplay();
function updateTownBots(dt){
  ensureTownBotsReady();
  if(!townBotsReady)return;
  for(const bot of townBots){
    if(!bot.route.length){
      bot.moving=false;
      bot.frame=1;
      continue;
    }
    if(bot.wait>0){
      bot.wait=Math.max(0,bot.wait-dt);
      bot.moving=false;
      bot.animTimer=0;
      bot.frame=1;
      continue;
    }
    const target=bot.route[bot.targetIndex]||bot.route[0];
    const prevX=bot.x;
    const prevY=bot.y;
    const dx=target.x-bot.x;
    const dy=target.y-bot.y;
    const dist=Math.hypot(dx,dy);
    if(dist<8){
      bot.x=target.x;
      bot.y=target.y;
      bot.drawX=bot.x;
      bot.drawY=bot.y;
      bot.routeIndex=bot.targetIndex;
      bot.targetIndex=(bot.targetIndex+1)%bot.route.length;
      bot.wait=townBotPauseDuration(bot,bot.targetIndex);
      bot.moving=false;
      bot.animTimer=0;
      bot.frame=1;
      continue;
    }
    const dirX=dx/dist;
    const dirY=dy/dist;
    bot.dir=directionFromVector(dirX,dirY);
    const travel=Math.min(dist,bot.speed*dt);
    const nextX=bot.x+dirX*travel;
    const nextY=bot.y+dirY*travel;
    let moved=false;
    if(!obstacleAtFootprint(nextX,bot.y)){
      bot.x=nextX;
      moved=true;
    }
    if(!obstacleAtFootprint(bot.x,nextY)){
      bot.y=nextY;
      moved=true;
    }
    if(!moved){
      bot.stuckFor+=dt;
      if(bot.stuckFor>1.1){
        bot.route[bot.targetIndex]=findNearestTownWalkablePoint(target.x,target.y,280,20);
        bot.targetIndex=(bot.targetIndex+1)%bot.route.length;
        bot.wait=0.25;
        bot.stuckFor=0;
      }
      bot.moving=false;
      bot.animTimer=0;
      bot.frame=1;
    }else{
      bot.stuckFor=0;
      bot.drawX=bot.x;
      bot.drawY=bot.y;
      bot.animTimer+=dt*7;
      bot.frame=Math.floor(bot.animTimer)%3;
      bot.moving=true;
      bot.stepCarry=(bot.stepCarry||0)+Math.hypot(bot.x-prevX,bot.y-prevY);
      while(bot.stepCarry>=34){
        spawnFootstepEffect(bot.x,bot.y,bot.dir,'rgba(88,241,230,.20)',.72);
        bot.stepCarry-=34;
      }
    }
  }
}
function drawTownBotMiniMarkers(dx,dy,dw,dh){
  ensureTownBotsReady();
  if(!townBotsReady)return;
  const bounds=townWorldBounds();
  mctx.save();
  mctx.fillStyle='rgba(88,241,230,.88)';
  for(const bot of townBots){
    const bx=dx+((bot.x-bounds.minX)/bounds.width)*dw;
    const by=dy+((bot.y-bounds.minY)/bounds.height)*dh;
    mctx.beginPath();
    mctx.arc(bx,by,2.3,0,Math.PI*2);
    mctx.fill();
  }
  mctx.restore();
}


const WORLD_ALIVE_DESTINATIONS=Object.freeze([
  {id:'hq',label:'ATM HQ',zoneId:'hq'},
  {id:'arcade',label:'ATM TOKEN ARCADE',zoneId:'arcade'},
  {id:'lounge',label:'COMMUNITY LOUNGE',zoneId:'gameLounge'},
  {id:'gallery',label:'NFT ART GALLERY',zoneId:'nftmega'},
  {id:'directory',label:'ATM TOWN DIRECTORY',miscId:'townInfoHub'},
  {id:'arena',label:'EVENT ARENA',zoneId:'arena'}
]);
const worldAliveState={
  particles:[],
  coinHudPulse:0,
  playerStepCarry:0,
  prevAirborne:false,
  areaId:'',
  areaLabel:'',
  areaTimer:0
};
let currentNearThing=null;
function pushWorldParticle(particle){
  const list=worldAliveState.particles;
  if(list.length>260)list.splice(0,list.length-220);
  list.push(particle);
}
function spawnFootstepEffect(x,y,dir='down',tint='rgba(148,248,235,0.30)',scale=1){
  const directionVectors={down:{x:0,y:1},up:{x:0,y:-1},left:{x:-1,y:0},right:{x:1,y:0}};
  const forward=directionVectors[dir]||directionVectors.down;
  const sideways={x:-forward.y,y:forward.x};
  const footprintY=y+27;
  const angle=(dir==='left'||dir==='right')?Math.PI/2:0;
  for(let i=0;i<2;i++){
    const side=(i===0?-1:1);
    const life=.72+Math.random()*.14;
    pushWorldParticle({
      layer:'ground',shape:'footprint',
      x:x-forward.x*5+sideways.x*4.2*side,
      y:footprintY-forward.y*5+sideways.y*4.2*side,
      vx:0,vy:0,life,maxLife:life,
      size:(4.5+Math.random()*.7)*scale,
      angle,color:tint
    });
  }
}
function spawnLandingEffect(x,y,power=1){
  const footY=y+30;
  pushWorldParticle({layer:'ground',shape:'ring',x,y:footY,life:.48,maxLife:.48,size:18*power,grow:46*power,color:'rgba(88,241,230,.42)'});
  for(let i=0;i<8;i++){
    const angle=(Math.PI*2*i)/8+(Math.random()-.5)*.18;
    const speed=18+Math.random()*22;
    pushWorldParticle({layer:'ground',shape:'dust',x:x+Math.cos(angle)*4,y:footY+Math.sin(angle)*2,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*8-10,life:.42+Math.random()*.16,maxLife:.42+Math.random()*.16,size:8+Math.random()*4,color:'rgba(255,209,102,.34)'});
  }
}
function spawnCoinPickupEffect(x,y){
  pushWorldParticle({layer:'ground',shape:'ring',x,y:y-4,life:.52,maxLife:.52,size:14,grow:58,color:'rgba(255,209,102,.46)'});
  for(let i=0;i<12;i++){
    const angle=(Math.PI*2*i)/12+(Math.random()-.5)*.24;
    const speed=34+Math.random()*28;
    pushWorldParticle({layer:'ground',shape:'spark',x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-18,life:.52+Math.random()*.18,maxLife:.52+Math.random()*.18,size:4+Math.random()*3,color:i%2===0?'rgba(255,209,102,.95)':'rgba(88,241,230,.92)'});
  }
}
function updateWorldAlive(dt){
  if(worldAliveState.coinHudPulse>0)worldAliveState.coinHudPulse=Math.max(0,worldAliveState.coinHudPulse-dt*2.2);
  const hudCoins=document.getElementById('coins')?.parentElement;
  if(hudCoins){
    const pulse=worldAliveState.coinHudPulse;
    hudCoins.style.transform=pulse>0?`scale(${(1+pulse*.12).toFixed(3)}) translateY(${-pulse*2.5}px)`:'scale(1) translateY(0px)';
    hudCoins.style.boxShadow=pulse>0?`0 0 ${Math.round(14+pulse*22)}px rgba(255,209,102,${(0.14+pulse*.26).toFixed(3)})`:'none';
  }
  const particles=worldAliveState.particles;
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.life-=dt;
    if(p.life<=0){particles.splice(i,1);continue;}
    if(p.shape==='ring')p.size+=(p.grow||36)*dt;
    else{
      p.x+=(p.vx||0)*dt;
      p.y+=(p.vy||0)*dt;
      p.vx=(p.vx||0)*Math.exp(-dt*3.2);
      p.vy=(p.vy||0)*Math.exp(-dt*3.2)-dt*10;
      p.size=Math.max(1,(p.size||6)-dt*3.2);
    }
  }
  let activeDestination=null;
  if(currentMap==='town'){
    for(const dest of WORLD_ALIVE_DESTINATIONS){
      const zone=dest.zoneId?TOWN_ENTRY_ZONES.find(z=>z.id===dest.zoneId):TOWN_MISC_ZONES.find(z=>z.id===dest.miscId);
      if(!zone)continue;
      const center=zoneCenter(zone);
      const distance=Math.hypot(player.x-center.x,player.y-center.y);
      const maxDistance=(zone.radius||115)+54;
      if(distance<=maxDistance&&(!activeDestination||distance<activeDestination.distance))activeDestination={id:dest.id,label:dest.label,distance};
    }
  }
  if(activeDestination&&activeDestination.id!==worldAliveState.areaId){
    worldAliveState.areaId=activeDestination.id;
    worldAliveState.areaLabel=activeDestination.label;
    worldAliveState.areaTimer=2.35;
  }else if(!activeDestination&&currentMap!=='town'){
    worldAliveState.areaId='';
  }
  if(worldAliveState.areaTimer>0)worldAliveState.areaTimer=Math.max(0,worldAliveState.areaTimer-dt);
}
function drawWorldAliveGroundEffects(){
  if(!worldAliveState.particles.length)return;
  ctx.save();
  for(const p of worldAliveState.particles){
    if(p.layer&&p.layer!=='ground')continue;
    const alpha=Math.max(0,Math.min(1,p.life/Math.max(.001,p.maxLife||p.life)));
    ctx.globalAlpha=alpha;
    if(p.shape==='ring'){
      ctx.strokeStyle=p.color||'rgba(255,255,255,.35)';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.ellipse(p.x,p.y,Math.max(4,p.size),Math.max(2,p.size*.32),0,0,Math.PI*2);
      ctx.stroke();
    }else if(p.shape==='footprint'){
      ctx.fillStyle=p.color||'rgba(188,243,255,.30)';
      ctx.beginPath();
      ctx.ellipse(p.x,p.y,Math.max(2.5,p.size*.58),Math.max(4,p.size),p.angle||0,0,Math.PI*2);
      ctx.fill();
    }else if(p.shape==='spark'){
      ctx.fillStyle=p.color||'rgba(255,255,255,.9)';
      ctx.fillRect(Math.round(p.x-p.size*.5),Math.round(p.y-p.size*.5),Math.max(2,p.size),Math.max(2,p.size));
    }else{
      ctx.fillStyle=p.color||'rgba(255,255,255,.32)';
      ctx.beginPath();
      ctx.ellipse(p.x,p.y,Math.max(2,p.size),Math.max(1.4,p.size*.45),0,0,Math.PI*2);
      ctx.fill();
    }
  }
  ctx.restore();
}
function thingHighlightAnchor(thing){
  if(!thing)return null;
  if(currentMap==='town'&&thing.id&&ATM_MAPS.fromEntrance(thing.id)){
    const building=ATM_MAPS.fromEntrance(thing.id);
    return getBuildingInteractPoint(building);
  }
  if(Number.isFinite(thing.x1)&&Number.isFinite(thing.x2)&&Number.isFinite(thing.y1)&&Number.isFinite(thing.y2))return{x:(thing.x1+thing.x2)/2,y:(thing.y1+thing.y2)/2};
  if(Number.isFinite(thing.x)&&Number.isFinite(thing.y))return {x:thing.x,y:thing.y};
  return null;
}
function drawWorldAliveOverlay(t){
  if(!currentNearThing)return;
  const anchor=thingHighlightAnchor(currentNearThing);
  if(!anchor)return;
  const pulse=.5+.5*Math.sin(t*.0065);
  const radius=16+pulse*8;
  const label=(currentNearThing.type==='player-nft-beacon'?'VIEW':(currentNearThing.type==='vending'?'USE':(currentNearThing.type==='voice'?'JOIN':(currentMap==='town'&&currentNearThing.id==='townInfoHub'?'MAP':'ACTION'))));
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  ctx.fillStyle='rgba(88,241,230,.16)';
  ctx.beginPath();
  ctx.ellipse(anchor.x,anchor.y-18,radius*1.1,radius*.58,0,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle='rgba(88,241,230,.75)';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.ellipse(anchor.x,anchor.y-18,radius,radius*.42,0,0,Math.PI*2);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='900 9px monospace';
  const textY=anchor.y-38;
  const textW=Math.max(38,ctx.measureText(label).width+16);
  ctx.fillStyle='rgba(5,18,26,.84)';
  ctx.strokeStyle='rgba(88,241,230,.45)';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.roundRect(anchor.x-textW/2,textY-9,textW,18,7);
  ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(232,255,252,.96)';
  ctx.fillText(label,anchor.x,textY+.5);
  ctx.restore();
}
function drawWorldAliveUi(){
  if(worldAliveState.areaTimer<=0||!worldAliveState.areaLabel)return;
  const fade=Math.min(1,worldAliveState.areaTimer/.35,worldAliveState.areaTimer/1.8);
  const pulse=.5+.5*Math.sin(performance.now()*.0045);
  const label=worldAliveState.areaLabel;
  ctx.save();
  ctx.globalAlpha=Math.max(.0,Math.min(1,fade));
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='900 10px monospace';
  const padX=18;
  const width=Math.max(150,ctx.measureText(label).width+padX*2);
  const x=W/2-width/2;
  const y=28;
  ctx.fillStyle='rgba(5,18,26,.86)';
  ctx.strokeStyle=`rgba(88,241,230,${(0.38+pulse*.18).toFixed(3)})`;
  ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.roundRect(x,y,width,26,10);
  ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(232,255,252,.96)';
  ctx.fillText(label,W/2,y+13.5);
  ctx.restore();
}

function drawPlayerNameplate(x,labelBottom,name,activity=null){
  ctx.save();ctx.font='900 11px system-ui';
  const lines=canvasTextLines(name,156,2);
  const arcadeTag=activity?.type==='arcade-game'?'IN-GAME · '+String(activity.label||'ARCADE GAME').replace(/\s+VOICE$/i,''):'';
  const lockerTag=activity?.type==='locker'?'IN LOCKER':'';
  const tag=lockerTag||arcadeTag;
  const widths=lines.map(line=>ctx.measureText(line).width);ctx.font='1000 8px system-ui';if(tag)widths.push(ctx.measureText(tag).width);
  const width=Math.min(176,Math.max(54,...widths)+16),lineH=13,tagH=tag?14:0,height=lines.length*lineH+tagH+8;
  const viewLeft=cam.x+5,viewRight=cam.x+W/zoom-5;let cx=x;if(Number.isFinite(viewLeft)&&Number.isFinite(viewRight)&&viewRight>viewLeft+width)cx=Math.max(viewLeft+width/2,Math.min(viewRight-width/2,x));
  const top=Math.max(cam.y+5,labelBottom-height);roundedRectPath(cx-width/2,top,width,height,7);ctx.fillStyle='rgba(3,10,14,.9)';ctx.fill();ctx.strokeStyle=activity?.type==='arcade-game'?'rgba(255,209,102,.8)':(activity?.type==='locker'?'rgba(112,249,200,.78)':'rgba(88,241,230,.34)');ctx.lineWidth=1;ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='top';ctx.font='900 11px system-ui';ctx.fillStyle='#eaffff';lines.forEach((line,index)=>ctx.fillText(line,cx,top+5+index*lineH));
  if(tag){ctx.font='1000 8px system-ui';ctx.fillStyle=activity?.type==='locker'?'#70f9c8':'#ffd166';ctx.fillText(tag,cx,top+5+lines.length*lineH);}
  ctx.restore();
}

function drawPlayerSprite(x,y,dir,frame,name='',alpha=1,bob=0,jumpAmount=0,characterId='classic',jetpackActive=false,jetpackThrusting=false,jetpackEquipped=false,equipmentLoadout=null,activity=null,suppressShadow=false){
  // Jetpack flight uses the directional idle frame. All other jumps freeze on
  // one directional walking-step frame so the legs are posed but not animated.
  if(jetpackActive){frame=1;bob=0;}
  else if(jumpAmount>0.01){frame=0;bob=0;}
  const directionAlias={upLeft:'up',upRight:'up',downLeft:'down',downRight:'down'};
  const visualDir=directionAlias[dir]||dir;
  if(!CHARACTER_SHEETS[characterId]&&!CHARACTER_SPRITES[characterId])characterId='classic';
  const activeLoadout=equipmentLoadout||window.atmActiveLoadout||{};
  const bodyItemId=characterId==='classic'?activeLoadout.body:null;
  const bodySheetConfig=bodyItemId?ATM_EQUIPMENT_SHEETS[bodyItemId]:null;
  const bodySheetImage=bodyItemId?equipmentSheetImgs[bodyItemId]:null;
  const characterConfig=CHARACTER_SHEETS[characterId];
  const characterImage=characterSheetImgs[characterId];
  const sheetConfig=(bodySheetConfig&&bodySheetImage?.complete&&bodySheetImage.naturalWidth)?bodySheetConfig:characterConfig;
  const sheetImage=(bodySheetConfig&&bodySheetImage?.complete&&bodySheetImage.naturalWidth)?bodySheetImage:characterImage;

  const defaultScale=.33;
  let image=null;
  let sourceRect=null;
  let frameWidth=192;
  let frameHeight=256;
  let spriteScale=defaultScale;
  let spriteAnchorX=frameWidth/2;
  let spriteAnchorY=frameHeight-1;

  if(sheetConfig&&sheetImage&&sheetImage.complete&&sheetImage.naturalWidth>0){
    const rowIndex=Math.max(0,(sheetConfig.rowOrder||['down','left','up','right']).indexOf(visualDir));
    const safeFrame=Math.max(0,Math.min((sheetConfig.cols||3)-1,Number.isFinite(frame)?frame:1));
    frameWidth=Math.floor(sheetImage.naturalWidth/(sheetConfig.cols||3));
    frameHeight=Math.floor(sheetImage.naturalHeight/(sheetConfig.rows||4));
    sourceRect={sx:safeFrame*frameWidth,sy:rowIndex*frameHeight,sw:frameWidth,sh:frameHeight};
    image=sheetImage;
    spriteScale=Number.isFinite(sheetConfig.displayScale)?sheetConfig.displayScale:defaultScale;
    spriteAnchorX=Number.isFinite(sheetConfig.anchorX)?sheetConfig.anchorX:frameWidth/2;
    spriteAnchorY=Number.isFinite(sheetConfig.anchorY)?sheetConfig.anchorY:frameHeight-1;
  }else{
    const spriteSet=characterSpriteImgs[characterId]||characterSpriteImgs.classic;
    if(spriteSet){
      const frames=spriteSet[visualDir]||spriteSet.down||[];
      image=frames[frame]||frames[1]||frames[0]||null;
      if(image&&image.complete&&image.naturalWidth>0){frameWidth=image.naturalWidth;frameHeight=image.naturalHeight;}
    }
    spriteAnchorX=frameWidth/2;spriteAnchorY=frameHeight-1;
  }

  ctx.save();
  ctx.globalAlpha=alpha;
  if(image&&image.complete&&image.naturalWidth>0&&image.naturalHeight>0){
    const dw=Math.round(frameWidth*spriteScale);
    const dh=Math.round(frameHeight*spriteScale);
    const groundFootY=Math.round(y+34-bob);
    const visualFootY=Math.round(groundFootY-jumpAmount);
    const drawX=Math.round(x-spriteAnchorX*spriteScale);
    const drawY=Math.round(visualFootY-spriteAnchorY*spriteScale);

    if(!suppressShadow){
      const shadowScale=1-Math.min(.46,(jumpAmount/Math.max(1,currentJumpHeight()))*.46);
      ctx.fillStyle='rgba(3,10,14,.24)';ctx.beginPath();
      ctx.ellipse(Math.round(x),groundFootY-1,Math.max(14,Math.round(Math.max(26,dw*.50)*shadowScale)),Math.max(4,9*shadowScale),0,0,Math.PI*2);ctx.fill();
    }

    if(jetpackThrusting&&jetpackEquipped&&visualDir==='down'){
      const hiddenNozzle={x:138,y:268};
      const hiddenFlamePulse=3+Math.abs(Math.sin(performance.now()*.025))*6;
      const hiddenNozzleX=drawX+(hiddenNozzle.x/256)*dw;
      const hiddenNozzleY=drawY+(hiddenNozzle.y/320)*dh;
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(88,241,230,.5)';ctx.beginPath();ctx.moveTo(hiddenNozzleX-2.5,hiddenNozzleY);ctx.lineTo(hiddenNozzleX+2.5,hiddenNozzleY);ctx.lineTo(hiddenNozzleX,hiddenNozzleY+12+hiddenFlamePulse);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,139,36,.72)';ctx.beginPath();ctx.moveTo(hiddenNozzleX-1.6,hiddenNozzleY+.5);ctx.lineTo(hiddenNozzleX+1.6,hiddenNozzleY+.5);ctx.lineTo(hiddenNozzleX,hiddenNozzleY+6+hiddenFlamePulse*.55);ctx.closePath();ctx.fill();ctx.restore();
    }

    if(sourceRect)ctx.drawImage(image,sourceRect.sx,sourceRect.sy,sourceRect.sw,sourceRect.sh,drawX,drawY,dw,dh);
    else ctx.drawImage(image,drawX,drawY,dw,dh);

    // All ATM equipment sheets use the same expanded 3x4 frame standard.
    // Body is the base shell; backpack and katana are independent layers, followed by the remaining slots.
    const drawEquipmentLayer=(itemId)=>{
      const layerConfig=itemId?ATM_EQUIPMENT_SHEETS[itemId]:null;
      const layerImage=itemId?equipmentSheetImgs[itemId]:null;
      if(!layerConfig||!layerImage?.complete||!layerImage.naturalWidth)return;
      const lc=layerConfig.cols||3,lr=layerConfig.rows||4;
      const lfw=Math.floor(layerImage.naturalWidth/lc),lfh=Math.floor(layerImage.naturalHeight/lr);
      const lrow=Math.max(0,(layerConfig.rowOrder||['down','left','up','right']).indexOf(visualDir));
      const lframe=Math.max(0,Math.min(lc-1,Number.isFinite(frame)?frame:1));
      const ls=Number.isFinite(layerConfig.displayScale)?layerConfig.displayScale:spriteScale;
      const lax=Number.isFinite(layerConfig.anchorX)?layerConfig.anchorX:lfw/2;
      const lay=Number.isFinite(layerConfig.anchorY)?layerConfig.anchorY:lfh-1;
      const ldw=Math.round(lfw*ls),ldh=Math.round(lfh*ls);
      const ldx=Math.round(x-lax*ls),ldy=Math.round(visualFootY-lay*ls);
      ctx.drawImage(layerImage,lframe*lfw,lrow*lfh,lfw,lfh,ldx,ldy,ldw,ldh);
    };

    if(characterId==='classic'){
      const backItemId=!jetpackEquipped?activeLoadout.back:null;
      if(backItemId)drawEquipmentLayer(backItemId);
      if(activeLoadout.katana)drawEquipmentLayer(activeLoadout.katana);
      for(const slotId of ['chest','face','feet','head']){
        const itemId=activeLoadout[slotId];
        if(itemId)drawEquipmentLayer(itemId);
      }
    }

    let overlayDrawX=drawX,overlayDrawY=drawY,overlayDestW=dw,overlayDestH=dh,overlayFrameWidth=256,overlayFrameHeight=320;
    if(jetpackEquipped&&jetpackOverlayImg.complete&&jetpackOverlayImg.naturalWidth>0){
      const overlayCols=jetpackOverlaySheet.cols||3,overlayRows=jetpackOverlaySheet.rows||4;
      const overlayRowIndex=Math.max(0,(jetpackOverlaySheet.rowOrder||['down','left','up','right']).indexOf(visualDir));
      const overlayFrame=Math.max(0,Math.min(overlayCols-1,Number.isFinite(frame)?frame:1));
      overlayFrameWidth=Math.floor(jetpackOverlayImg.naturalWidth/overlayCols);overlayFrameHeight=Math.floor(jetpackOverlayImg.naturalHeight/overlayRows);
      const overlayScale=Number.isFinite(jetpackOverlaySheet.displayScale)?jetpackOverlaySheet.displayScale:spriteScale;
      const overlayAnchorX=Number.isFinite(jetpackOverlaySheet.anchorX)?jetpackOverlaySheet.anchorX:overlayFrameWidth/2;
      const overlayAnchorY=Number.isFinite(jetpackOverlaySheet.anchorY)?jetpackOverlaySheet.anchorY:overlayFrameHeight-1;
      overlayDestW=Math.round(overlayFrameWidth*overlayScale);overlayDestH=Math.round(overlayFrameHeight*overlayScale);
      overlayDrawX=Math.round(x-overlayAnchorX*overlayScale);overlayDrawY=Math.round(visualFootY-overlayAnchorY*overlayScale);
      ctx.drawImage(jetpackOverlayImg,overlayFrame*overlayFrameWidth,overlayRowIndex*overlayFrameHeight,overlayFrameWidth,overlayFrameHeight,overlayDrawX,overlayDrawY,overlayDestW,overlayDestH);
    }

    // Hands/gloves are a foreground layer and must remain visible over the jetpack.
    if(characterId==='classic'&&activeLoadout.hands)drawEquipmentLayer(activeLoadout.hands);

    if(jetpackThrusting&&jetpackEquipped){
      const nozzleSourceMap={down:[{x:181,y:268}],left:[{x:178,y:249}],up:[{x:105,y:259},{x:151,y:259}],right:[{x:76,y:251}]};
      const nozzles=nozzleSourceMap[visualDir]||nozzleSourceMap.down;
      const flamePulse=3+Math.abs(Math.sin(performance.now()*.025))*6;
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(const nozzle of nozzles){
        const nozzleX=overlayDrawX+(nozzle.x/overlayFrameWidth)*overlayDestW;
        const nozzleY=overlayDrawY+(nozzle.y/overlayFrameHeight)*overlayDestH;
        ctx.fillStyle='rgba(88,241,230,.78)';ctx.beginPath();ctx.moveTo(nozzleX-2.5,nozzleY);ctx.lineTo(nozzleX+2.5,nozzleY);ctx.lineTo(nozzleX,nozzleY+12+flamePulse);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,139,36,.98)';ctx.beginPath();ctx.moveTo(nozzleX-1.6,nozzleY+.5);ctx.lineTo(nozzleX+1.6,nozzleY+.5);ctx.lineTo(nozzleX,nozzleY+6+flamePulse*.55);ctx.closePath();ctx.fill();
      }
      ctx.restore();
    }

    if(name)drawPlayerNameplate(x,drawY-5,name,activity);
  }
  ctx.restore();
}
function drawNpcSprite(n){
  const x=n.x*tile,y=n.y*tile;
  ctx.fillStyle='rgba(3,10,14,.20)';ctx.beginPath();ctx.ellipse(x,y+13,8,3.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=n.c;ctx.fillRect(x-8,y-10,16,20);
  ctx.fillStyle='#f0c496';ctx.fillRect(x-6,y-18,12,10);
  ctx.fillStyle='#222';ctx.fillRect(x-2,y-15,2,2);ctx.fillRect(x+2,y-15,2,2);
  ctx.fillStyle='#111';ctx.fillRect(x-8,y+10,6,10);ctx.fillRect(x+2,y+10,6,10);
}
function drawStaticOccluder(sourceCanvas,x,y,w,h){
  // The source canvas contains only this foreground object's pixels.
  // Always sample from the source canvas origin; x/y are destination world coordinates.
  ctx.drawImage(sourceCanvas,0,0,sourceCanvas.width,sourceCanvas.height,x,y,w,h);
}




function getBuildingInteractPoint(b){
  if(b.door)return {x:b.door.x*tile,y:b.door.y*tile,radius:b.door.radius||INTERACTION_DISTANCE};
  return {x:(b.x+b.w/2)*tile,y:(b.y+b.h-0.55)*tile,radius:INTERACTION_DISTANCE};
}


function getBuildingDepth(b){
  if(b.id==='hq') return (b.y+b.h-1.35)*tile;
  if(b.id==='nftmega') return (b.y+b.h-1.05)*tile;
  return (b.y+b.h-0.55)*tile;
}



function getHQPlayerRenderMetrics(item){
  if(item.type==='remote'){
    return {
      x:item.p.drawX,
      y:item.p.drawY,
      footY:item.p.drawY+20,
      left:item.p.drawX-32,
      right:item.p.drawX+32,
      top:item.p.drawY-52,
      bottom:item.p.drawY+20,
      draw(){
        drawPlayerSprite(item.p.drawX,item.p.drawY,item.p.dir,item.p.frame,item.p.name,.92,0,item.p.jump||0,item.p.character||'classic',!!item.p.jetpackActive,!!item.p.jetpack,!!item.p.jetpackEquipped,item.p.loadout||null,item.p.activity||null);
        window.ATMZombieOutbreak?.drawPlayerEffects?.(ctx,{x:item.p.drawX,y:item.p.drawY,jumpAmount:item.p.jump||0,downed:false,fireActive:!!item.p?.powers?.fire,invisible:false,local:false});
      }
    };
  }
  const onStairs=playerOnStairs();
  const amount=onStairs?0.75:2.0;
  const bob=player.moving?Math.abs(Math.sin(player.animTimer*1.2))*amount:0;
  return {
    x:player.x,
    y:player.y,
    footY:player.y+20,
    left:player.x-32,
    right:player.x+32,
    top:player.y-52,
    bottom:player.y+20,
    draw(){
      drawPlayerSprite(player.x,player.y,player.dir,player.frame,'',(powerUps.invisibility>0 ? .28 : 1),bob,jumpLift(),selectedCharacter,jetpackState.active,jetpackState.thrusting,canUseJetpack(),window.atmActiveLoadout||null);
      window.ATMZombieOutbreak?.drawPlayerEffects?.(ctx,{x:player.x,y:player.y,jumpAmount:jumpLift(),downed:false,fireActive:powerUps.fire>0,invisible:powerUps.invisibility>0,local:true});
    }
  };
}
function hqOccluderAppliesToPlayer(piece,m){
  if(!(m.right>=piece.x && m.left<=piece.x+piece.w && m.bottom>=piece.y && m.top<=piece.y+piece.h)) return false;
  return m.footY <= piece.depth+1;
}
function drawHQPlayersAndOccluders(){
  const playerItems=[];
  for(const [id,p] of remotePlayers){
    if(p.map!=='hq'||p?.powers?.invisibility) continue;
    playerItems.push({depth:p.drawY+20,type:'remote',p});
  }
  playerItems.push({depth:player.y+20,type:'local'});
  playerItems.sort((a,b)=>a.depth-b.depth);

  const occluders=hqForegroundPieces;
  for(const item of playerItems){
    const metrics=getHQPlayerRenderMetrics(item);
    metrics.draw();
    for(const piece of occluders){
      if(hqOccluderAppliesToPlayer(piece,metrics)){
        drawStaticOccluder(piece.canvas,piece.x,piece.y,piece.w,piece.h);
      }
    }
  }
}

function drawHordePlayerSprite({x,y,dir,frame,name='',alpha=1,bob=0,jump=0,character='classic',jetpackActive=false,jetpack=false,jetpackEquipped=false,loadout=null,activity=null,downed=false}){
  ctx.save();
  if(downed){const pivotY=y+20;ctx.translate(x,pivotY);ctx.rotate(Math.PI/2);ctx.translate(-x,-pivotY);}
  drawPlayerSprite(x,y,dir,frame,downed?'':name,alpha,bob,jump,character,jetpackActive,jetpack,jetpackEquipped,loadout,downed?null:activity,downed);
  ctx.restore();
  if(downed&&name)drawPlayerNameplate(x,y-55,name,{label:'DOWN'});
}
function drawDepthScene(t){
  updateRemoteInterpolation();
  const items=[];
  if(currentMap==='town'){
    ensureTownBotsReady();
    updateTownForegroundStreaming();
    for(const piece of townForegroundPieces) if(townForegroundNearView(piece,160)) items.push({depth:piece.depth,type:'townpiece',piece});
    for(const [id,p] of remotePlayers){
      if(p.map!==currentMap)continue;
      items.push({depth:p.drawY+20,type:'remote',id:String(id),p});
    }
    for(const bot of townBots){
      items.push({depth:bot.drawY+20,type:'bot',bot});
    }
    for(const actor of window.ATMZombieOutbreak?.getDepthActors?.({map:currentMap})||[]){
      items.push({depth:Number(actor.depth)||Number(actor.y)||0,type:'zombie',actor});
    }
    items.push({depth:player.y+20,type:'local'});
    items.sort((a,b)=>a.depth-b.depth);
    for(const item of items){
      if(item.type==='townpiece'){
        const piece=item.piece;
        const requestedNightAlpha=Math.max(0,Math.min(1,currentTownNightAlpha||0));
        const nightPiece=townForegroundNightPieceMap.get(piece.src);
        const nightReady=!!(nightPiece&&nightPiece.img&&nightPiece.img.complete&&nightPiece.img.naturalWidth);
        // Never let a foreground object disappear while its night asset is still
        // loading. Keep the daytime occluder fully visible until the matching
        // night image is ready, then crossfade both at the same authored depth.
        const nightAlpha=nightReady?requestedNightAlpha:0;
        if(piece.img&&piece.img.complete&&piece.img.naturalWidth){
          const dayAlpha=1-nightAlpha;
          if(dayAlpha>0){
            ctx.save();
            ctx.globalAlpha=dayAlpha;
            ctx.drawImage(piece.img,piece.x,piece.y,piece.w,piece.h);
            ctx.restore();
          }
        }
        if(nightAlpha>0){
          ctx.save();
          ctx.globalAlpha=nightAlpha;
          ctx.drawImage(nightPiece.img,nightPiece.x,nightPiece.y,nightPiece.w,nightPiece.h);
          ctx.restore();
        }
      }else if(item.type==='remote'){
        const remoteDowned=!!item.p?.zombieCombat?.downed,remoteInvisible=!!item.p?.powers?.invisibility;
        // Remote invisibility is complete: no body, nameplate, shadow, weapon,
        // jetpack flame, Inferno aura, or other reveal. Footprints are emitted
        // from synchronized movement in updateRemoteInterpolation().
        if(remoteInvisible)continue;
        const propOverride=window.ATMPropHunt?.drawPlayerOverride?.(ctx,{sessionId:item.id,isLocal:false,map:item.p.map,x:item.p.drawX,y:item.p.drawY,jumpAmount:item.p.jump||0,alpha:.92,name:item.p.name,propHunt:item.p.propHunt||null})===true;
        if(!propOverride){
          drawHordePlayerSprite({x:item.p.drawX,y:item.p.drawY,dir:item.p.dir,frame:item.p.frame,name:item.p.name,alpha:.92,jump:item.p.jump||0,character:item.p.character||'classic',jetpackActive:!!item.p.jetpackActive,jetpack:!!item.p.jetpack,jetpackEquipped:!!item.p.jetpackEquipped,loadout:item.p.loadout||null,activity:item.p.activity||null,downed:remoteDowned});
          window.ATMZombieOutbreak?.drawPlayerEffects?.(ctx,{x:item.p.drawX,y:item.p.drawY,jumpAmount:item.p.jump||0,downed:remoteDowned,fireActive:!!item.p?.powers?.fire,invisible:false,local:false});
          if(!remoteDowned)window.ATMZombieOutbreak?.drawRemoteWeapon?.(ctx,item.p);
        }
      }else if(item.type==='bot'){
        const bot=item.bot;
        drawPlayerSprite(bot.drawX,bot.drawY,bot.dir,bot.frame,bot.name,0.96,0,0,bot.characterId,false,false,false,bot.loadout||{},null);
      }else if(item.type==='zombie'){
        window.ATMZombieOutbreak?.drawActor?.(ctx,item.actor);
      }else if(item.type==='local'){
        const onStairs=playerOnStairs();
        const amount=onStairs?0.75:2.0;
        const bob=player.moving?Math.abs(Math.sin(player.animTimer*1.2))*amount:0;
        const localDowned=window.ATMZombieOutbreak?.isLocalDowned?.()===true;
        const localPropOverride=window.ATMPropHunt?.drawPlayerOverride?.(ctx,{sessionId:playerId,isLocal:true,map:currentMap,x:player.x,y:player.y,jumpAmount:jumpLift(),alpha:(powerUps.invisibility>0 ? .28 : 1),name:playerName})===true;
        if(!localPropOverride){
          drawHordePlayerSprite({x:player.x,y:player.y,dir:player.dir,frame:player.frame,name:'',alpha:(powerUps.invisibility>0 ? .28 : 1),bob,jump:jumpLift(),character:selectedCharacter,jetpackActive:jetpackState.active,jetpack:jetpackState.thrusting,jetpackEquipped:canUseJetpack(),loadout:window.atmActiveLoadout||null,downed:localDowned});
          window.ATMZombieOutbreak?.drawPlayerEffects?.(ctx,{x:player.x,y:player.y,jumpAmount:jumpLift(),downed:localDowned,fireActive:powerUps.fire>0,invisible:powerUps.invisibility>0,local:true});
        }
      }
    }
  }else if(currentMap==='hq'){
    drawHQPlayersAndOccluders();
  }else if(currentMap==='gallery'){
    drawGalleryPlayersAndOccluders();
  }else if(currentMap==='arcade'){
    drawArcadePlayersAndOccluders();
  }else if(currentMap==='lounge'){
    drawLoungePlayersAndOccluders();
  }
}

function drawChatBubbles(){
  const now=Date.now();
  for(let i=chatBubbles.length-1;i>=0;i--){
    const b=chatBubbles[i];if(now>b.expires){chatBubbles.splice(i,1);continue;}if(b.map!==currentMap)continue;
    let bx=b.x,by=b.y,bubbleLift=0;if(b.id!==playerId&&remotePlayers.has(b.id)){const p=remotePlayers.get(b.id);bx=p.drawX;by=p.drawY;bubbleLift=Math.max(0,Number(p.jump||0));}else if(b.id===playerId){bx=player.x;by=player.y;bubbleLift=Math.max(0,Number(jumpLift()||0));}
    // Proximity is a ground-plane distance, while the visual bubble anchor follows
    // the rendered player upward during jumping / jetpack flight.
    if(Math.hypot(player.x-bx,player.y-by)>420&&b.id!==playerId)continue;
    const bubbleY=by-bubbleLift;
    ctx.save();ctx.font='700 11px system-ui';const lines=canvasTextLines(String(b.message||'').slice(0,140),220,3),lineH=14;
    const width=Math.min(240,Math.max(60,...lines.map(line=>ctx.measureText(line).width))+18),height=lines.length*lineH+12;
    const left=cam.x+7,right=cam.x+W/zoom-7;let cx=bx;if(right>left+width)cx=Math.max(left+width/2,Math.min(right-width/2,bx));const top=Math.max(cam.y+7,bubbleY-78-height);
    roundedRectPath(cx-width/2,top,width,height,8);ctx.fillStyle='rgba(5,18,26,.94)';ctx.fill();ctx.strokeStyle='#58f1e6';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='top';lines.forEach((line,index)=>ctx.fillText(line,cx,top+6+index*lineH));ctx.restore();
  }
}
const savedMp=safeJsonParse(safeStorageGet('atm_mp','{}'),{});if(savedMp.playerName)document.getElementById('displayName').value=savedMp.playerName;if(savedMp.roomName)document.getElementById('roomName').value=savedMp.roomName;if(savedMp.url)document.getElementById('supabaseUrl').value=savedMp.url;if(savedMp.key)document.getElementById('supabaseKey').value=savedMp.key;

const characterPickerEl=document.querySelector('.characterPicker');
if(characterPickerEl){
  characterPickerEl.querySelectorAll('.characterChoice').forEach(button=>{if(!ALLOWED_CHARACTERS.includes(button.dataset.character))button.remove();});
  for(const entry of EXTRA_CHARACTER_PICKER_ENTRIES){
    if(characterPickerEl.querySelector(`[data-character="${entry.id}"]`)) continue;
    const button=document.createElement('button');
    button.type='button';
    button.className='characterChoice';
    button.dataset.character=entry.id;
    button.setAttribute('aria-label',entry.label);
    const img=document.createElement('img');
    img.src=entry.preview;
    img.alt=`${entry.label} character`;
    const span=document.createElement('span');
    span.textContent=entry.label;
    button.appendChild(img);
    button.appendChild(span);
    characterPickerEl.appendChild(button);
  }
}

function selectCharacter(characterId){const requested=ALLOWED_CHARACTERS.includes(characterId)?characterId:'classic';if(window.atmLockerCanSelectCharacter&&!window.atmLockerCanSelectCharacter(requested)){window.atmLockerOpenForLockedCharacter?.(requested);return false;}selectedCharacter=(CHARACTER_SPRITES[requested]||CHARACTER_SHEETS[requested])?requested:'classic';document.querySelectorAll('.characterChoice').forEach(button=>button.classList.toggle('selected',button.dataset.character===selectedCharacter));updateEntryProgress(3,authSession?.user?[1,2]:[2]);window.atmLockerCharacterChanged?.(selectedCharacter);return true;}
document.querySelectorAll('.characterChoice').forEach(button=>button.addEventListener('click',()=>selectCharacter(button.dataset.character)));
selectCharacter(savedMp.character||'classic');
const joinOnlineButton=document.getElementById('joinOnline');joinOnlineButton.addEventListener('click',connectMultiplayer);document.getElementById('joinOffline').addEventListener('click',()=>{playerName=(document.getElementById('displayName').value||'Guest').trim();safeStorageSet('atm_mp',JSON.stringify({...savedMp,playerName,character:selectedCharacter}));townEntryActive=true;hideTownAccessFlow();if(authSession?.user){getSupabaseClient().then(c=>c.from('player_accounts').update({display_name:playerName,selected_character:selectedCharacter}).eq('user_id',authSession.user.id));}});document.getElementById('chatSend').addEventListener('click',sendChat);document.getElementById('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendChat();}});window.addEventListener('beforeunload',()=>{saveAccountLocation();if(realtimeChannel)realtimeChannel.send({type:'broadcast',event:'leave',payload:{id:playerId}});});

const keys={};
function isTextEntryTarget(target){
  return !!(target && (target.tagName==='INPUT'||target.tagName==='TEXTAREA'||target.tagName==='SELECT'||target.isContentEditable));
}
addEventListener('keydown',e=>{
  if(isTextEntryTarget(e.target))return;
  if(!e.atmGamepadSynthetic)gamepadMarkNonControllerInput('keyboard');
  const k=e.key.toLowerCase();keys[k]=true;
  if((e.code==='Space'||k==='j')&&!e.repeat){e.preventDefault();startJump();}
});
addEventListener('keyup',e=>{
  if(isTextEntryTarget(e.target))return;
  const k=e.key.toLowerCase();
  keys[k]=false;
  if(e.code==='Space'||k==='j')releaseJetpackThrust(null);
});
document.querySelectorAll('input,textarea,select,[contenteditable="true"]').forEach(el=>{
  el.addEventListener('focus',()=>{for(const key of Object.keys(keys))keys[key]=false;releaseJetpackThrust(null);});
});
let joy={x:0,y:0,active:false,id:null}; const stick=document.getElementById('stick'), knob=document.getElementById('knob');
function setJoy(cx,cy){ const r=stick.getBoundingClientRect(), sx=r.left+r.width/2, sy=r.top+r.height/2; let dx=cx-sx, dy=cy-sy, mag=Math.hypot(dx,dy), max=29; if(mag>max){ dx=dx/mag*max; dy=dy/mag*max; } joy.x=dx/max; joy.y=dy/max; knob.style.transform=`translate(${dx}px,${dy}px)`; }
function endJoy(e){
  if(e&&joy.id!==null&&Number.isFinite(Number(e.pointerId))&&e.pointerId!==joy.id)return;
  const oldId=joy.id;joy.active=false;joy.id=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)';
  if(oldId!==null){try{if(stick.hasPointerCapture?.(oldId))stick.releasePointerCapture(oldId);}catch(_e){}}
}
stick.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();endJoy();joy.active=true;joy.id=e.pointerId;try{stick.setPointerCapture(e.pointerId);}catch(_e){}setJoy(e.clientX,e.clientY);},{passive:false});
stick.addEventListener('pointermove',e=>{if(joy.active&&e.pointerId===joy.id){e.preventDefault();setJoy(e.clientX,e.clientY);}},{passive:false});
stick.addEventListener('pointerup',endJoy);stick.addEventListener('pointercancel',endJoy);stick.addEventListener('lostpointercapture',endJoy);
window.addEventListener('pointerup',e=>{if(joy.active&&e.pointerId===joy.id)endJoy(e);},{passive:true});
window.addEventListener('pointercancel',e=>{if(joy.active&&e.pointerId===joy.id)endJoy(e);},{passive:true});
window.addEventListener('blur',()=>endJoy());
document.addEventListener('visibilitychange',()=>{if(document.hidden)endJoy();});
document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button===0)gamepadMarkNonControllerInput(e.pointerType==='touch'?'touch':'pointer');},{capture:true,passive:true});
// Dynamic forms (World Events, ATM Pay, etc.) also release movement immediately when text entry starts.
document.addEventListener('focusin',e=>{if(!isTextEntryTarget(e.target))return;for(const key of Object.keys(keys))keys[key]=false;releaseJetpackThrust(null);endJoy();});
// Safari fallback: long-press/drag on game chrome should never start page text selection or a callout.
document.addEventListener('selectstart',e=>{if(!isTextEntryTarget(e.target)&&!e.target?.closest?.('code,pre,.walletValue,.selectable,[data-selectable="true"]'))e.preventDefault();});
document.addEventListener('contextmenu',e=>{if(!isTextEntryTarget(e.target)&&!e.target?.closest?.('code,pre,.walletValue,.selectable,[data-selectable="true"]'))e.preventDefault();});
// v235.1.4: iPhone Safari can interpret joystick + jump/action as a native page pinch.
// Block Safari gesture events and multi-touch page gestures on gameplay chrome while leaving text entry usable.
function blockNativeGameplayZoom(e){
  if(isTextEntryTarget(e.target))return;
  // v235.1.5: cancel Safari's native page gesture only. Never release the
  // joystick here: a normal two-thumb joystick + jump press can emit a
  // gesturestart on iPhone even though both game controls must remain active.
  e.preventDefault();
}
for(const eventName of ['gesturestart','gesturechange','gestureend']){
  document.addEventListener(eventName,blockNativeGameplayZoom,{passive:false});
}
document.addEventListener('touchmove',e=>{
  if((e.touches?.length||0)<2||isTextEntryTarget(e.target))return;
  e.preventDefault();
},{passive:false});

// v235.4: desktop Xbox-style controller support through the browser Gamepad API.
// Standard mapping follows the common Xbox layout: A jump/confirm, B back,
// X world action, Y map, LB People Hub, RB Locker, left stick/D-pad movement,
// right stick camera look, and RT as an alternate airborne jetpack thrust control.
const ATM_GAMEPAD_DEADZONE=0.18;
const ATM_GAMEPAD_UI_AXIS_THRESHOLD=0.72;
const ATM_GAMEPAD_ARCADE_AXIS_THRESHOLD=0.34;
const ATM_GAMEPAD_BUTTON=Object.freeze({A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,VIEW:8,MENU:9,LS:10,RS:11,UP:12,DOWN:13,LEFT:14,RIGHT:15});
const gamepadState={
  index:null,
  id:'',
  connected:false,
  moveX:0,
  moveY:0,
  lookX:0,
  lookY:0,
  previousButtons:[],
  lastActivityAt:0,
  lastInputDevice:'pointer',
  nextUiNavAt:0,
  uiAxisLatched:false,
  arcadeKeys:new Set()
};
const ATM_GAMEPAD_JETPACK_TOUCH='TAP TO JUMP · PRESS & HOLD IN AIR TO RISE · RELEASE TO FALL';
const ATM_GAMEPAD_JETPACK_CONTROLLER='A TO JUMP · PRESS A AGAIN OR HOLD RT IN AIR TO RISE · RELEASE TO FALL';
function gamepadSetJetpackTip(controller=false){
  const tip=document.querySelector('#jetpackTip span');
  if(tip)tip.textContent=controller?ATM_GAMEPAD_JETPACK_CONTROLLER:ATM_GAMEPAD_JETPACK_TOUCH;
}
function gamepadEnsureUi(){
  if(document.getElementById('atmGamepadStatus'))return;
  const style=document.createElement('style');
  style.textContent=`
#atmGamepadStatus{position:fixed;left:50%;top:max(14px,env(safe-area-inset-top));transform:translate(-50%,-14px);z-index:12050;opacity:0;pointer-events:none;padding:8px 12px;border-radius:999px;border:1px solid rgba(112,249,200,.34);background:rgba(4,20,27,.94);color:#dffcff;font:900 10px/1 system-ui;letter-spacing:.045em;box-shadow:0 10px 30px rgba(0,0,0,.38);transition:opacity .18s ease,transform .18s ease;white-space:nowrap}
#atmGamepadStatus.show{opacity:1;transform:translate(-50%,0)}
body.atm-gamepad-active button:focus,body.atm-gamepad-active [role="button"]:focus,body.atm-gamepad-active input:focus,body.atm-gamepad-active select:focus,body.atm-gamepad-active textarea:focus{outline:3px solid #70f9c8!important;outline-offset:3px!important;box-shadow:0 0 0 3px rgba(112,249,200,.18)!important}
`;
  document.head.appendChild(style);
  const badge=document.createElement('div');badge.id='atmGamepadStatus';badge.setAttribute('aria-live','polite');document.body.appendChild(badge);
}
let gamepadStatusTimer=0;
function gamepadStatus(message,duration=2500){
  gamepadEnsureUi();
  const badge=document.getElementById('atmGamepadStatus');if(!badge)return;
  badge.textContent=message;badge.classList.add('show');clearTimeout(gamepadStatusTimer);gamepadStatusTimer=setTimeout(()=>badge.classList.remove('show'),duration);
}
function gamepadMarkActivity(){
  gamepadState.lastActivityAt=performance.now();
  gamepadState.lastInputDevice='gamepad';
  document.body.classList.add('atm-gamepad-active');
  gamepadSetJetpackTip(true);
}
function gamepadMarkNonControllerInput(device='pointer'){
  gamepadState.lastInputDevice=device;
  document.body.classList.remove('atm-gamepad-active');
  gamepadSetJetpackTip(false);
}
function gamepadPromptActive(){return gamepadState.connected&&gamepadState.lastInputDevice==='gamepad';}
function gamepadApplyDeadzone(x=0,y=0,deadzone=ATM_GAMEPAD_DEADZONE){
  const mag=Math.hypot(x,y);if(mag<=deadzone)return{x:0,y:0};
  const scaled=Math.min(1,(mag-deadzone)/(1-deadzone));
  return{x:x/mag*scaled,y:y/mag*scaled};
}
function gamepadElementVisible(el){
  if(!el||el.hidden||el.disabled||el.getAttribute('aria-hidden')==='true')return false;
  const rect=el.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return false;
  const style=getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0;
}
function gamepadActiveUiRoot(){
  const selectors=[
    '#atmWorldEventOverlay.open','#atmEmbeddedWalletModal.open','#atmPeopleHubModal.open',
    '#lockerPanel.open','#tradeNftPanel.open','#arcadeLeaderboardPanel.open','#directoryPanel.open',
    '#atmDartsPanel.open','#skyRunPanel.open','#platformPanicPanel.open','#ringRumblePanel.open','#flappyJetpackPanel.open','#neonRacerPanel.open'
  ];
  for(const selector of selectors){const el=document.querySelector(selector);if(gamepadElementVisible(el))return el;}
  if(vendingOpen){const el=document.getElementById('vendingPanel');if(gamepadElementVisible(el))return el;}
  const dialog=document.getElementById('dialog');if(gamepadElementVisible(dialog))return dialog;
  const landing=document.getElementById('landingOverlay');if(document.body.classList.contains('access-flow-open')&&gamepadElementVisible(landing))return landing;
  return null;
}
function gamepadFocusable(root){
  if(!root)return[];
  return [...root.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(gamepadElementVisible);
}
function gamepadPreferredUiTarget(root,items=gamepadFocusable(root)){
  const preferred=root?.querySelector('.peopleHubTab.active,.lockerTab.active,.atmPayTab.active,.atmWorldEventBtn:not([disabled]),.flowPrimary:not([disabled]),button.primary:not([disabled]),.atmWalletBtn.primary:not([disabled])');
  if(gamepadElementVisible(preferred))return preferred;
  return items.find(el=>!/(close|back|cancel)/i.test(`${el.id||''} ${el.className||''} ${el.getAttribute?.('aria-label')||''}`))||items[0]||null;
}
function gamepadMoveUiFocus(step=1){
  const root=gamepadActiveUiRoot();if(!root)return false;
  const items=gamepadFocusable(root);if(!items.length)return false;
  const active=document.activeElement;let index=items.indexOf(active);
  if(index<0){const preferred=gamepadPreferredUiTarget(root,items);index=items.indexOf(preferred);if(index<0)index=0;}
  else index=(index+step+items.length)%items.length;
  items[index].focus({preventScroll:false});
  try{items[index].scrollIntoView({block:'nearest',inline:'nearest'});}catch(_error){}
  return true;
}
function gamepadActivateUi(){
  const root=gamepadActiveUiRoot();if(!root)return false;
  let target=document.activeElement;
  if(!target||!root.contains(target)||!gamepadElementVisible(target))target=gamepadPreferredUiTarget(root);
  if(!target)return false;
  if(['INPUT','TEXTAREA','SELECT'].includes(target.tagName)){target.focus();return true;}
  target.click();return true;
}
function gamepadDispatchKey(key,code,down){
  const event=new KeyboardEvent(down?'keydown':'keyup',{key,code,bubbles:true,cancelable:true});
  try{Object.defineProperty(event,'atmGamepadSynthetic',{value:true});}catch(_error){}
  window.dispatchEvent(event);
}
const ATM_GAMEPAD_KEY_META=Object.freeze({
  ArrowLeft:{key:'ArrowLeft',code:'ArrowLeft'},ArrowRight:{key:'ArrowRight',code:'ArrowRight'},
  ArrowUp:{key:'ArrowUp',code:'ArrowUp'},ArrowDown:{key:'ArrowDown',code:'ArrowDown'},
  Space:{key:' ',code:'Space'},Escape:{key:'Escape',code:'Escape'}
});
function gamepadSetArcadeKey(name,down){
  const held=gamepadState.arcadeKeys.has(name);if(held===down)return;
  const meta=ATM_GAMEPAD_KEY_META[name];if(!meta)return;
  if(down)gamepadState.arcadeKeys.add(name);else gamepadState.arcadeKeys.delete(name);
  gamepadDispatchKey(meta.key,meta.code,down);
}
function gamepadReleaseArcadeKeys(){for(const name of [...gamepadState.arcadeKeys])gamepadSetArcadeKey(name,false);}
function gamepadArcadeMode(){
  if(document.body.classList.contains('sky-run-open'))return'sky-run';
  if(document.body.classList.contains('platform-panic-open'))return'platform-panic';
  if(document.body.classList.contains('ring-rumble-open'))return'ring-rumble';
  if(document.body.classList.contains('flappy-jetpack-open'))return'flappy-jetpack';
  if(document.body.classList.contains('neon-racer-open'))return'neon-racer';
  if(document.body.classList.contains('atm-darts-open'))return'darts';
  return'';
}
function gamepadUpdateArcadeAxes(mode,x,y){
  if(!mode||mode==='flappy-jetpack'||mode==='darts'){gamepadReleaseArcadeKeys();return;}
  gamepadSetArcadeKey('ArrowLeft',x<-ATM_GAMEPAD_ARCADE_AXIS_THRESHOLD);
  gamepadSetArcadeKey('ArrowRight',x>ATM_GAMEPAD_ARCADE_AXIS_THRESHOLD);
  if(mode==='ring-rumble'){
    gamepadSetArcadeKey('ArrowUp',y<-ATM_GAMEPAD_ARCADE_AXIS_THRESHOLD);
    gamepadSetArcadeKey('ArrowDown',y>ATM_GAMEPAD_ARCADE_AXIS_THRESHOLD);
  }else{
    gamepadSetArcadeKey('ArrowUp',false);gamepadSetArcadeKey('ArrowDown',false);
  }
}
function gamepadArcadeStartButton(mode){
  const ids={'sky-run':'skyRunStart','platform-panic':'platformPanicStart','ring-rumble':'ringRumbleStart','flappy-jetpack':'flappyJetpackStart','neon-racer':'neonRacerStart'};
  const button=document.getElementById(ids[mode]||'');return gamepadElementVisible(button)?button:null;
}
function gamepadBack(){
  const closeSelectors=[
    '#atmWorldEventOverlay.open .atmWorldEventClose','#atmEmbeddedWalletModal.open #atmWalletClose','#atmPeopleHubModal.open #atmPeopleHubClose',
    '#lockerPanel.open #lockerNftDetailClose','#lockerPanel.open #lockerCloseButton','#tradeNftPanel.open #tradeNftClose',
    '#arcadeLeaderboardPanel.open #arcadeLeaderboardClose','#directoryPanel.open #directoryClose',
    '#atmDartsPanel.open #atmDartsClose','#skyRunPanel.open #skyRunClose','#platformPanicPanel.open #platformPanicClose',
    '#ringRumblePanel.open #ringRumbleClose','#flappyJetpackPanel.open #flappyJetpackClose','#neonRacerPanel.open #neonRacerClose'
  ];
  for(const selector of closeSelectors){const button=document.querySelector(selector);if(gamepadElementVisible(button)){button.click();return true;}}
  if(vendingOpen){document.getElementById('closeVending')?.click();return true;}
  const dialog=document.getElementById('dialog');if(gamepadElementVisible(dialog)){document.getElementById('closeDialog')?.click();return true;}
  const root=gamepadActiveUiRoot();const back=root?.querySelector('.flowBack,#magnetCheckoutBack,[data-back]');if(gamepadElementVisible(back)){back.click();return true;}
  return false;
}
function gamepadButtonDown(gamepad,index,threshold=.5){const button=gamepad?.buttons?.[index];return !!button&&(button.pressed||Number(button.value||0)>=threshold);}
function gamepadPressed(index,current){return !!current[index]&&!gamepadState.previousButtons[index];}
function gamepadReleased(index,current){return !current[index]&&!!gamepadState.previousButtons[index];}
function gamepadFindActive(){
  if(!navigator.getGamepads)return null;
  const pads=[...navigator.getGamepads()].filter(Boolean);
  if(gamepadState.index!==null){const preferred=pads.find(p=>p.index===gamepadState.index);if(preferred)return preferred;}
  return pads.find(p=>p.mapping==='standard')||pads[0]||null;
}
function gamepadHandleButtonEdges(gamepad,current,arcadeMode,uiRoot){
  if(gamepadPressed(ATM_GAMEPAD_BUTTON.B,current)){
    gamepadMarkActivity();
    if(!gamepadBack()&&arcadeMode){gamepadDispatchKey('Escape','Escape',true);gamepadDispatchKey('Escape','Escape',false);}
  }
  if(gamepadPressed(ATM_GAMEPAD_BUTTON.A,current)){
    gamepadMarkActivity();
    const startButton=gamepadArcadeStartButton(arcadeMode);
    if(startButton){startButton.click();}
    else if(arcadeMode==='sky-run'||arcadeMode==='platform-panic'||arcadeMode==='flappy-jetpack'){gamepadSetArcadeKey('Space',true);}
    else if(uiRoot){gamepadActivateUi();}
    else{startJump();}
  }
  if(gamepadReleased(ATM_GAMEPAD_BUTTON.A,current)){
    if(gamepadState.arcadeKeys.has('Space'))gamepadSetArcadeKey('Space',false);
    else if(!arcadeMode&&!current[ATM_GAMEPAD_BUTTON.RT])releaseJetpackThrust(null);
  }
  if(gamepadPressed(ATM_GAMEPAD_BUTTON.X,current)){
    gamepadMarkActivity();
    if(uiRoot)gamepadActivateUi();
    else if(!arcadeMode&&(nearestTradeBeaconRemote()||nearestVendingMachine()||nearestThing()))triggerActionPress();
  }
  if(gamepadPressed(ATM_GAMEPAD_BUTTON.Y,current)){
    gamepadMarkActivity();
    if(uiRoot)gamepadActivateUi();else if(!arcadeMode&&!dialogOpen)openDirectory(currentMap);
  }
  if(gamepadPressed(ATM_GAMEPAD_BUTTON.LB,current)){
    gamepadMarkActivity();
    if(uiRoot)gamepadMoveUiFocus(-1);else if(!arcadeMode)window.ATMPeopleHub?.open?.('online');
  }
  if(gamepadPressed(ATM_GAMEPAD_BUTTON.RB,current)){
    gamepadMarkActivity();
    if(uiRoot)gamepadMoveUiFocus(1);else if(!arcadeMode)lockerOpen();
  }
  if(gamepadPressed(ATM_GAMEPAD_BUTTON.VIEW,current)){
    gamepadMarkActivity();if(!uiRoot&&!arcadeMode&&!dialogOpen)openDirectory(currentMap);
  }
  if(gamepadPressed(ATM_GAMEPAD_BUTTON.MENU,current)){
    gamepadMarkActivity();if(!uiRoot&&!arcadeMode)window.ATMPeopleHub?.open?.('online');
  }
  if(gamepadPressed(ATM_GAMEPAD_BUTTON.RT,current)&&!uiRoot&&!arcadeMode&&canUseJetpack()&&(jumpState.active||jetpackState.active)){
    gamepadMarkActivity();beginJetpackThrust(null);
  }
  if(gamepadReleased(ATM_GAMEPAD_BUTTON.RT,current)&&!arcadeMode&&!current[ATM_GAMEPAD_BUTTON.A])releaseJetpackThrust(null);
}
function pollGamepad(now=performance.now()){
  const gamepad=gamepadFindActive();
  if(!gamepad){
    if(gamepadState.connected){gamepadState.connected=false;gamepadState.index=null;gamepadState.id='';gamepadState.moveX=gamepadState.moveY=gamepadState.lookX=gamepadState.lookY=0;gamepadReleaseArcadeKeys();gamepadStatus('🎮 CONTROLLER DISCONNECTED');document.body.classList.remove('atm-gamepad-active');gamepadSetJetpackTip(false);}
    return;
  }
  if(!gamepadState.connected||gamepadState.index!==gamepad.index){
    gamepadState.connected=true;gamepadState.index=gamepad.index;gamepadState.id=String(gamepad.id||'Controller');gamepadState.previousButtons=[];
    gamepadStatus('🎮 CONTROLLER CONNECTED · A JUMP · X ACTION · Y MAP',3400);
  }
  const left=gamepadApplyDeadzone(Number(gamepad.axes?.[0]||0),Number(gamepad.axes?.[1]||0));
  const right=gamepadApplyDeadzone(Number(gamepad.axes?.[2]||0),Number(gamepad.axes?.[3]||0));
  const current=gamepad.buttons.map((_,index)=>gamepadButtonDown(gamepad,index,(index===ATM_GAMEPAD_BUTTON.LT||index===ATM_GAMEPAD_BUTTON.RT) ? 0.35 : 0.5));
  // Safari/Chromium both expose D-pad as standard buttons for Xbox controllers.
  let moveX=left.x,moveY=left.y;
  if(Math.hypot(moveX,moveY)<.08){moveX=(current[ATM_GAMEPAD_BUTTON.RIGHT]?1:0)-(current[ATM_GAMEPAD_BUTTON.LEFT]?1:0);moveY=(current[ATM_GAMEPAD_BUTTON.DOWN]?1:0)-(current[ATM_GAMEPAD_BUTTON.UP]?1:0);}
  const arcadeMode=gamepadArcadeMode();
  const uiRoot=gamepadActiveUiRoot();
  const meaningful=Math.hypot(left.x,left.y)>.08||Math.hypot(right.x,right.y)>.12||current.some(Boolean);
  if(meaningful)gamepadMarkActivity();
  if(arcadeMode)gamepadUpdateArcadeAxes(arcadeMode,moveX,moveY);else gamepadReleaseArcadeKeys();
  if(uiRoot&&!arcadeMode){
    gamepadState.moveX=0;gamepadState.moveY=0;gamepadState.lookX=0;gamepadState.lookY=0;
    const navX=Math.abs(left.x)>.55?left.x:((current[ATM_GAMEPAD_BUTTON.RIGHT]?1:0)-(current[ATM_GAMEPAD_BUTTON.LEFT]?1:0));
    const navY=Math.abs(left.y)>.55?left.y:((current[ATM_GAMEPAD_BUTTON.DOWN]?1:0)-(current[ATM_GAMEPAD_BUTTON.UP]?1:0));
    const navValue=Math.abs(navY)>=Math.abs(navX)?navY:navX;
    if(Math.abs(navValue)>=ATM_GAMEPAD_UI_AXIS_THRESHOLD){
      if(!gamepadState.uiAxisLatched||now>=gamepadState.nextUiNavAt){gamepadMoveUiFocus(navValue>0?1:-1);gamepadState.uiAxisLatched=true;gamepadState.nextUiNavAt=now+170;}
    }else if(Math.abs(navValue)<.4){gamepadState.uiAxisLatched=false;gamepadState.nextUiNavAt=0;}
  }else if(!arcadeMode){
    gamepadState.moveX=moveX;gamepadState.moveY=moveY;gamepadState.lookX=right.x;gamepadState.lookY=right.y;
  }else{
    gamepadState.moveX=gamepadState.moveY=gamepadState.lookX=gamepadState.lookY=0;
  }
  gamepadHandleButtonEdges(gamepad,current,arcadeMode,uiRoot);
  gamepadState.previousButtons=current;
}
window.addEventListener('gamepadconnected',event=>{gamepadState.index=event.gamepad.index;gamepadState.connected=true;gamepadState.id=String(event.gamepad.id||'Controller');gamepadState.previousButtons=[];gamepadStatus('🎮 CONTROLLER CONNECTED · A JUMP · X ACTION · Y MAP',3400);});
window.addEventListener('gamepaddisconnected',event=>{if(gamepadState.index!==event.gamepad.index)return;gamepadState.connected=false;gamepadState.index=null;gamepadState.id='';gamepadState.moveX=gamepadState.moveY=gamepadState.lookX=gamepadState.lookY=0;gamepadReleaseArcadeKeys();document.body.classList.remove('atm-gamepad-active');gamepadSetJetpackTip(false);gamepadStatus('🎮 CONTROLLER DISCONNECTED');});
window.ATMGamepad=Object.freeze({snapshot:()=>({connected:gamepadState.connected,index:gamepadState.index,id:gamepadState.id,lastInputDevice:gamepadState.lastInputDevice,moveX:gamepadState.moveX,moveY:gamepadState.moveY,lookX:gamepadState.lookX,lookY:gamepadState.lookY})});


function interiorExitThing(mapId=currentMap){
  if(!ATM_MAPS.isInterior(mapId))return null;
  const spawn=ATM_MAPS.spawn(mapId);
  const exitTarget=ATM_MAPS.exitTarget(mapId);
  if(!exitTarget)return null;
  const exit={
    x:spawn.x,
    y:spawn.y,
    radius:INTERACTION_DISTANCE,
    name:'EXIT TO '+ATM_MAPS.label(exitTarget),
    text:'Return to '+ATM_MAPS.label(exitTarget).replace('ATM TOWN','ATM Town')+'.',
    targetMap:exitTarget
  };
  return Math.hypot(player.x-exit.x,player.y-exit.y)<exit.radius?exit:null;
}
function normalizeRemoteAtmPayIdentity(value){
  if(!value||typeof value!=='object')return null;
  const userId=String(value.user_id||''),handle=String(value.handle||'').toLowerCase();
  if(!/^[0-9a-f-]{36}$/i.test(userId)||!/^[a-z0-9_]{3,20}$/.test(handle)||value.atm_pay_ready===false)return null;
  return {user_id:userId,handle,display_name:String(value.display_name||'ATM Player').slice(0,30),character_id:String(value.character_id||'classic').slice(0,40),atm_pay_ready:true};
}
function rememberAtmPeopleEncounter(remoteId,remotePlayer,identity,distance){
  if(!identity||!Number.isFinite(distance)||distance>180)return;
  const item={session_id:String(remoteId||''),name:String(remotePlayer?.name||identity.display_name||'ATM Player').slice(0,30),map:String(remotePlayer?.map||currentMap),character_id:String(remotePlayer?.character||identity.character_id||'classic').slice(0,40),atmPay:identity,seen_at:Date.now()};
  atmPeopleEncounters.set(identity.user_id,item);
  try{sessionStorage.setItem('atm_people_encounters_v1',JSON.stringify([...atmPeopleEncounters.values()].sort((a,b)=>b.seen_at-a.seen_at).slice(0,24)));}catch(_error){}
}
function restoreAtmPeopleEncounters(){
  try{const items=JSON.parse(sessionStorage.getItem('atm_people_encounters_v1')||'[]');for(const item of Array.isArray(items)?items:[]){const identity=normalizeRemoteAtmPayIdentity(item?.atmPay);if(identity)atmPeopleEncounters.set(identity.user_id,{...item,atmPay:identity});}}catch(_error){}
}
restoreAtmPeopleEncounters();
function atmPeopleOnlinePlayers(){
  const now=Date.now();const out=[];const seen=new Set();
  const selfIdentity=normalizeRemoteAtmPayIdentity(window.ATMPay?.getPublicIdentity?.());
  out.push({session_id:playerId,name:playerName||'You',map:currentMap,character_id:selectedCharacter,is_self:true,distance:0,nearby:false,atmPay:selfIdentity});
  seen.add(String(playerId));

  // Supabase Presence is the authoritative online roster. player_state broadcasts
  // enrich each presence entry with live map/position/activity/ATM Pay data, but a
  // missed or stale broadcast must never make an actually-online player disappear
  // from the People Hub while the HUD still counts them.
  for(const [id,presence] of presencePlayers){
    const sessionId=String(id||'');if(!sessionId||sessionId===String(playerId))continue;
    const remote=remotePlayers.get(id)||remotePlayers.get(sessionId)||null;
    const liveRemote=remote&&now-(remote.lastSeen||0)<=12000?remote:null;
    const source=liveRemote||presence||{};
    const map=String(source.map||presence?.map||'');
    const sameMap=map===currentMap;
    const x=Number(liveRemote?.drawX??liveRemote?.x),y=Number(liveRemote?.drawY??liveRemote?.y);
    const distance=liveRemote&&sameMap&&Number.isFinite(x)&&Number.isFinite(y)?Math.hypot(player.x-x,player.y-y):null;
    const identity=normalizeRemoteAtmPayIdentity(liveRemote?.atmPay||presence?.atmPay);
    if(identity&&distance!==null)rememberAtmPeopleEncounter(sessionId,liveRemote||presence,identity,distance);
    out.push({session_id:sessionId,name:String(liveRemote?.name||presence?.name||identity?.display_name||'Player').slice(0,30),map,character_id:String(liveRemote?.character||presence?.character||identity?.character_id||'classic').slice(0,40),is_self:false,distance,nearby:distance!==null&&distance<=180,atmPay:identity});
    seen.add(sessionId);
  }

  // A fresh player_state can arrive just before Presence sync. Keep that short race
  // visible, then Presence becomes authoritative on the next sync.
  for(const [id,p] of remotePlayers){
    const sessionId=String(id||'');if(!sessionId||seen.has(sessionId)||now-(p.lastSeen||0)>12000)continue;
    const sameMap=p.map===currentMap;const x=Number(p.drawX??p.x),y=Number(p.drawY??p.y);const distance=sameMap&&Number.isFinite(x)&&Number.isFinite(y)?Math.hypot(player.x-x,player.y-y):null;
    const identity=normalizeRemoteAtmPayIdentity(p.atmPay);if(identity&&distance!==null)rememberAtmPeopleEncounter(sessionId,p,identity,distance);
    out.push({session_id:sessionId,name:String(p.name||identity?.display_name||'Player').slice(0,30),map:String(p.map||''),character_id:String(p.character||identity?.character_id||'classic').slice(0,40),is_self:false,distance,nearby:distance!==null&&distance<=180,atmPay:identity});
  }
  out.sort((a,b)=>Number(b.nearby)-Number(a.nearby)||Number(b.map===currentMap)-Number(a.map===currentMap)||(a.distance??1e9)-(b.distance??1e9)||a.name.localeCompare(b.name));
  return out;
}
function atmPeopleRecentEncounters(){return [...atmPeopleEncounters.values()].sort((a,b)=>(b.seen_at||0)-(a.seen_at||0)).slice(0,12).map(item=>({...item,atmPay:item.atmPay?{...item.atmPay}:null}));}
function sendAtmPlayerPing(payload){
  if(!onlineMode||!realtimeChannel||!payload||payload.type!=='player_ping')return false;
  try{realtimeChannel.send({type:'broadcast',event:'player_ping',payload});return true;}catch(_error){return false;}
}
window.ATMGamePeople={snapshot:()=>{const online=atmPeopleOnlinePlayers();return {onlineCount:Math.max(1,online.length),online,encounters:atmPeopleRecentEncounters(),currentMap};},sendPing:sendAtmPlayerPing};
function nearestAtmPayRemote(maxDistance=82){
  const now=Date.now();let best=null,bestDistance=maxDistance;
  for(const [id,p] of remotePlayers){
    if(p.map!==currentMap||now-(p.lastSeen||0)>9000)continue;
    const identity=normalizeRemoteAtmPayIdentity(p.atmPay);if(!identity)continue;
    const x=Number(p.drawX??p.x),y=Number(p.drawY??p.y);if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    const distance=Math.hypot(player.x-x,player.y-y);
    if(distance<bestDistance){bestDistance=distance;best={id:'atm-pay-player:'+id,type:'player-atm-pay',name:p.name||identity.display_name,text:`Pay @${identity.handle} with ATM Pay.`,remoteId:id,remotePlayer:p,atmPay:identity,x,y,radius:maxDistance};}
  }
  return best;
}
function nearestHordeRevivePlayer(maxDistance=78){
  if(currentMap!=='town'||window.ATMZombieOutbreak?.isActive?.()!==true)return null;
  const now=Date.now();let best=null,bestDistance=maxDistance;
  for(const [id,p] of remotePlayers){if(p?.map!=='town'||now-Number(p.lastSeen||0)>3500||!p?.zombieCombat?.downed)continue;const x=Number(p.drawX??p.x),y=Number(p.drawY??p.y);if(!Number.isFinite(x)||!Number.isFinite(y))continue;const d=Math.hypot(player.x-x,player.y-y);if(d<bestDistance){bestDistance=d;best={id:'horde-revive:'+id,type:'horde-revive',name:'REVIVE '+String(p.name||'PLAYER').toUpperCase(),text:'Bring this player back into The Horde.',remoteId:String(id),x,y,radius:maxDistance};}}return best;
}
function nearestThing(){
  const tradeTarget=nearestTradeBeaconRemote();if(tradeTarget)return tradeTarget;
  const reviveTarget=nearestHordeRevivePlayer();if(reviveTarget)return reviveTarget;
  const propHuntTarget=window.ATMPropHunt?.nearestTarget?.();if(propHuntTarget)return propHuntTarget;
  let best=null,dist=99999,bestRadius=175;
  if(currentMap==='hq'){
    const maskedInteraction=hqInteractionThing();
    if(maskedInteraction)return maskedInteraction;
    if(!hqInteractionReader.ready){
      for(const t of HQ_INTERACTION_ZONES){
        const center=zoneCenter(t);
        const d=Math.hypot(player.x-center.x,player.y-center.y);
        const r=zoneHitRadius(t);
        if((rectContainsPoint(t,player.x,player.y,20)||d<r)&&d<dist){dist=d;best=t;bestRadius=r;}
      }
    }
    const exit=interiorExitThing();
    if(exit){
      const ed=Math.hypot(player.x-exit.x,player.y-exit.y);
      if(ed<dist){dist=ed;best=exit;bestRadius=exit.radius;}
    }
    return dist<bestRadius?best:null;
  }
  if(currentMap==='gallery'||currentMap==='arcade')return interiorExitThing();
  if(currentMap==='lounge'){
    const maskedInteraction=loungeInteractionThing();
    if(maskedInteraction)return maskedInteraction;
    // Keep the existing doorway fallback because the supplied mask does not paint the bottom exit blue.
    return interiorExitThing();
  }
  const nearbyVending=nearestVendingMachine();
  if(nearbyVending)return nearbyVending;
  const maskedTown=townInteractionThing();
  if(maskedTown)return maskedTown;
  const feet=getPlayerInteractionFeet();
  if(!townInteractionReader.ready){
    for(const zone of TOWN_ENTRY_ZONES){
      const center=zoneCenter(zone);
      const d=Math.hypot(feet.x-center.x,feet.y-center.y);
      const r=zoneHitRadius(zone);
      if((rectContainsPoint(zone,feet.x,feet.y,18)||d<r)&&d<dist){dist=d;best=zone;bestRadius=r;}
    }
    for(const zone of TOWN_MISC_ZONES){
      const center=zoneCenter(zone);
      const d=Math.hypot(feet.x-center.x,feet.y-center.y);
      const r=zoneHitRadius(zone);
      if((rectContainsPoint(zone,feet.x,feet.y,18)||d<r)&&d<dist){dist=d;best=zone;bestRadius=r;}
    }
  }
  for(const s of signs){
    const cx=s.x*tile,cy=s.y*tile;const d=Math.hypot(player.x-cx,player.y-cy);
    if(d<dist){dist=d;best={name:s.t,text:'A district sign marking part of ATM Town.'};bestRadius=145;}
  }
  return dist<bestRadius?best:null;
}
function formatPowerTime(seconds){
  const total=Math.max(0,Math.ceil(seconds));
  const mins=Math.floor(total/60),secs=total%60;
  return mins+':'+String(secs).padStart(2,'0');
}
function updatePowerHud(force=false){
  const totalSecond=Math.ceil(powerUps.speed)+Math.ceil(powerUps.bounce)*10000+Math.ceil(powerUps.magnet)*100000000+Math.ceil(powerUps.invisibility)*1000000000000+Math.ceil(powerUps.juggernaut)*1000000000000000+Math.ceil(powerUps.fire)*1000000000000000000;
  if(!force&&totalSecond===powerHudSecond)return;
  powerHudSecond=totalSecond;
  for(const type of ['speed','bounce','magnet','invisibility','juggernaut','fire']){
    const active=powerUps[type]>0;
    const value=formatPowerTime(powerUps[type]);
    document.getElementById(type+'PowerTimer').classList.toggle('active',active);
    document.getElementById(type+'PowerTime').textContent=value;
    const productTimer=document.getElementById(type+'ProductTimer');
    if(productTimer)productTimer.textContent=active?'ACTIVE · '+value+' REMAINING':'';
  }
}
function addPowerUp(type){
  if(!(type in powerUps))return;
  powerUps[type]+=VENDING_POWER_SECONDS;
  updatePowerHud(true);
  const message=document.getElementById('vendingMessage');
  const names={speed:'⚡ Lightning',bounce:'↟ Bounce',magnet:'🧲 Magnet',jetpack:'🚀 Jetpack',invisibility:'👻 Ghost',juggernaut:'🛡️ Juggernaut',fire:'🔥 Inferno'};
  message.textContent=names[type]+' time increased by 30 seconds! No coins charged.';
  if(type==='jetpack'){syncJetpackUi();updateJetpackHud(true);window.atmLockerInventoryChanged?.();}
  clearTimeout(addPowerUp.messageTimer);
  addPowerUp.messageTimer=setTimeout(()=>{message.textContent='';},1500);
  broadcastState(true);
}
/* ===== v219: Xaman payload checkout with seamless browser return ===== */
const ATM_MAGNET_UNIT_PRICE=100;
const ATM_MAGNET_MAX_QUANTITY=99;
const ATM_MAGNET_PENDING_KEY='atm_magnet_payment_pending_v1';
// Keep the v215 key so queued purchases survive this deployment.
const ATM_MAGNET_RECOVERY_KEY='atm_magnet_payment_recovery_v215';
const ATM_MAGNET_ACTIVE_STALE_MS=10*60*1000;
let magnetCartQty=0;
let magnetPaymentPollTimer=null;
let magnetPaymentPollUuid='';
let magnetPaymentResumeAttempts=0;
let xrplPaymentToastTimer=0;
let magnetRecoveryTimer=null;
let magnetRecoveryBusy=false;
let magnetRecoveryAttempts=0;
function showXrplPaymentToast(message,state='waiting',duration=0){
  const toast=document.getElementById('xrplPaymentToast');if(!toast)return;
  clearTimeout(xrplPaymentToastTimer);toast.textContent=message;toast.className='visible '+state;
  if(duration>0)xrplPaymentToastTimer=setTimeout(()=>{toast.className='';toast.textContent='';},duration);
}
window.addEventListener('atm:pay-notification',event=>{
  const detail=event?.detail||{};showXrplPaymentToast(String(detail.message||'ATM Pay activity updated.'),detail.tone==='success'?'success':'waiting',9000);
});
function currentMagnetUserId(){return String(authSession?.user?.id||'');}
function savePendingMagnetPayment(value){try{localStorage.setItem(ATM_MAGNET_PENDING_KEY,JSON.stringify(value));}catch(_error){}}
function readPendingMagnetPayment(){try{return JSON.parse(localStorage.getItem(ATM_MAGNET_PENDING_KEY)||'null');}catch(_error){return null;}}
function clearPendingMagnetPayment(){try{localStorage.removeItem(ATM_MAGNET_PENDING_KEY);}catch(_error){}}
function clearPendingMagnetPaymentIf(payloadUuid){const pending=readPendingMagnetPayment();if(String(pending?.payload_uuid||'')===String(payloadUuid||''))clearPendingMagnetPayment();}
function readMagnetRecoveryQueue(){try{const value=JSON.parse(localStorage.getItem(ATM_MAGNET_RECOVERY_KEY)||'[]');return Array.isArray(value)?value:[];}catch(_error){return [];}}
function saveMagnetRecoveryQueue(queue){try{localStorage.setItem(ATM_MAGNET_RECOVERY_KEY,JSON.stringify((Array.isArray(queue)?queue:[]).slice(-50)));}catch(_error){}}
function queueMagnetRecovery(value){
  if(!value?.payload_uuid)return;
  const queue=readMagnetRecoveryQueue().filter(item=>item?.payload_uuid!==value.payload_uuid);
  queue.push({...value,user_id:value.user_id||currentMagnetUserId()||'',queued_at:new Date().toISOString()});saveMagnetRecoveryQueue(queue);
}
function removeMagnetRecovery(payloadUuid){saveMagnetRecoveryQueue(readMagnetRecoveryQueue().filter(item=>item?.payload_uuid!==payloadUuid));}
function magnetRecoveryBelongsToCurrentUser(item){const stored=String(item?.user_id||''),current=currentMagnetUserId();return !stored||!current||stored===current;}

function magnetPaymentReturnPayloadFromUrl(){
  try{
    const url=new URL(location.href),params=url.searchParams;if(params.get('xaman_payment_return')!=='1')return null;
    const result={payload_uuid:String(params.get('payload')||''),purchase_id:String(params.get('purchase')||''),tx_hash:String(params.get('txid')||'')};
    params.delete('xaman_payment_return');params.delete('payload');params.delete('purchase');params.delete('txid');params.delete('tab');url.search=params.toString();history.replaceState(null,'',url.pathname+(url.search?'?'+url.search:'')+url.hash);
    return /^[0-9a-f-]{36}$/i.test(result.payload_uuid)?result:null;
  }catch(_error){return null;}
}
function updateMagnetCartUi(){
  const qty=document.getElementById('magnetQtyValue'),button=document.getElementById('magnetCheckoutButton');
  if(qty)qty.textContent=String(magnetCartQty);
  if(button){button.disabled=magnetCartQty<1;button.textContent=magnetCartQty>0?'CHECK OUT · '+(magnetCartQty*ATM_MAGNET_UNIT_PRICE)+' $ATM':'SELECT QUANTITY';}
  const checkoutQty=document.getElementById('magnetCheckoutQuantity'),checkoutTotal=document.getElementById('magnetCheckoutTotal');
  if(checkoutQty)checkoutQty.textContent=String(magnetCartQty);if(checkoutTotal)checkoutTotal.textContent=(magnetCartQty*ATM_MAGNET_UNIT_PRICE)+' $ATM';
}
function setMagnetCheckoutStatus(message='',state=''){const node=document.getElementById('magnetCheckoutStatus');if(node){node.textContent=message;node.dataset.state=state;}}
function refreshMagnetCheckoutAccount(){
  const walletNode=document.getElementById('magnetCheckoutWallet'),pay=document.getElementById('magnetPayButton'),reset=document.getElementById('magnetResetPending');
  const wallet=String(playerAccount?.wallet_address||'');
  const pending=readPendingMagnetPayment();
  if(walletNode)walletNode.textContent=!authSession?.user?'Sign in to an ATM Town account before paying.':wallet?'Paying wallet: '+wallet:'Link and verify a Xaman wallet from your account screen before paying.';
  if(pay)pay.disabled=!authSession?.user||!wallet||magnetCartQty<1||!!magnetPaymentPollUuid;
  if(reset)reset.classList.toggle('visible',!!pending?.payload_uuid||!!magnetPaymentPollUuid);
}
function openMagnetCheckout(){
  if(magnetCartQty<1)return;const panel=document.getElementById('magnetCheckoutPanel');if(!panel)return;
  updateMagnetCartUi();refreshMagnetCheckoutAccount();setMagnetCheckoutStatus('Review the total, then continue to Xaman.');panel.hidden=false;
}
function closeMagnetCheckout(){const panel=document.getElementById('magnetCheckoutPanel');if(panel)panel.hidden=true;setMagnetCheckoutStatus('');}
function finishMagnetPaymentPoll(){if(magnetPaymentPollTimer)clearTimeout(magnetPaymentPollTimer);magnetPaymentPollTimer=null;magnetPaymentPollUuid='';refreshMagnetCheckoutAccount();}
const ATM_MAGNET_APPLIED_KEY='atm_magnet_applied_receipts_v214';
function readAppliedMagnetReceipts(){try{const value=JSON.parse(localStorage.getItem(ATM_MAGNET_APPLIED_KEY)||'{}');return value&&typeof value==='object'?value:{};}catch(_error){return {};}}
function magnetReceiptApplied(payloadUuid){return !!readAppliedMagnetReceipts()[String(payloadUuid||'')];}
function markMagnetReceiptApplied(payloadUuid,txHash=''){try{const receipts=readAppliedMagnetReceipts();receipts[String(payloadUuid||'')]={tx_hash:String(txHash||''),applied_at:new Date().toISOString()};const keys=Object.keys(receipts).slice(-50);const trimmed={};for(const key of keys)trimmed[key]=receipts[key];localStorage.setItem(ATM_MAGNET_APPLIED_KEY,JSON.stringify(trimmed));}catch(_error){}}
async function acknowledgeMagnetGrant(payloadUuid){
  if(!payloadUuid||!authSession?.access_token)return;
  try{await apiWithAuth('/api/xaman-vending-status',{method:'POST',body:JSON.stringify({payload_uuid:payloadUuid})});}
  catch(error){console.warn('Magnet payment acknowledgement will retry on next return:',error);setTimeout(()=>acknowledgeMagnetGrant(payloadUuid),5000);}
}
async function applyVerifiedMagnetPurchase(data,payloadUuid,options={}){
  const seconds=Math.max(0,Number(data?.grant_seconds)||0),quantity=Math.max(0,Number(data?.quantity)||0);
  const alreadyApplied=magnetReceiptApplied(payloadUuid);
  if(seconds>0&&!alreadyApplied){
    powerUps.magnet+=seconds;updatePowerHud(true);broadcastState(true);
    markMagnetReceiptApplied(payloadUuid,data?.tx_hash||'');
    const message='Payment confirmed · '+quantity+' Magnet Can'+(quantity===1?'':'s')+' · +'+seconds+' seconds';
    const vendingMessage=document.getElementById('vendingMessage');if(vendingMessage)vendingMessage.textContent=message;
    showXrplPaymentToast(message,'success',9000);
  }else if(alreadyApplied){
    showXrplPaymentToast('Payment confirmed · Magnet time was already added on this device.','success',7000);
  }else{
    showXrplPaymentToast('Payment confirmed, but this reward was already acknowledged.','success',7000);
  }
  if(data?.requires_acknowledgement||alreadyApplied)await acknowledgeMagnetGrant(payloadUuid);
  if(!options.background){magnetCartQty=0;updateMagnetCartUi();closeMagnetCheckout();}
}

function clearStuckMagnetCheck(message='Payment check moved to background recovery. You can start a new checkout.'){
  const pending=readPendingMagnetPayment();
  if(pending?.payload_uuid)queueMagnetRecovery(pending);
  finishMagnetPaymentPoll();clearPendingMagnetPayment();refreshMagnetCheckoutAccount();
  setMagnetCheckoutStatus(message,'waiting');showXrplPaymentToast(message,'waiting',9000);
  scheduleMagnetRecovery(500);
}
function scheduleMagnetRecovery(delay=5000){
  if(magnetRecoveryTimer)clearTimeout(magnetRecoveryTimer);
  magnetRecoveryTimer=setTimeout(recoverOutstandingMagnetPayments,delay);
}
async function recoverOutstandingMagnetPayments(){
  if(magnetRecoveryBusy)return;
  if(document.hidden||!authSession?.access_token){scheduleMagnetRecovery(2500);return;}
  magnetRecoveryBusy=true;
  try{
    const queued=readMagnetRecoveryQueue().filter(magnetRecoveryBelongsToCurrentUser);
    for(const item of queued.slice(0,3)){
      try{
        const exact=await apiWithAuth('/api/xaman-vending-status?payload_uuid='+encodeURIComponent(item.payload_uuid)+'&recover_legacy=1');
        if(exact?.status==='paid'){
          const creditedNow=Number(exact.grant_seconds)>0&&!magnetReceiptApplied(item.payload_uuid);
          await applyVerifiedMagnetPurchase(exact,item.payload_uuid,{background:true});
          removeMagnetRecovery(item.payload_uuid);magnetRecoveryAttempts=0;
          if(creditedNow)showXrplPaymentToast('Recovered and credited an earlier Magnet Can payment.','success',9000);
          scheduleMagnetRecovery(1200);return;
        }
        if(['rejected','failed','expired'].includes(exact?.status))removeMagnetRecovery(item.payload_uuid);
      }catch(error){console.warn('Queued Magnet payment check failed:',item.payload_uuid,error);}
    }

    const data=await apiWithAuth('/api/xaman-vending-status?recover=1');
    if(data?.status==='paid'&&data?.payload_uuid){
      const creditedNow=Number(data.grant_seconds)>0&&!magnetReceiptApplied(data.payload_uuid);
      await applyVerifiedMagnetPurchase(data,data.payload_uuid,{background:true});
      removeMagnetRecovery(data.payload_uuid);magnetRecoveryAttempts=0;
      if(creditedNow)showXrplPaymentToast('Recovered and credited an earlier Magnet Can payment.','success',9000);
      scheduleMagnetRecovery(1200);return;
    }
    magnetRecoveryAttempts++;
    const queue=readMagnetRecoveryQueue().filter(magnetRecoveryBelongsToCurrentUser);
    if(queue.length&&magnetRecoveryAttempts<120)scheduleMagnetRecovery(10000);
    else if(magnetRecoveryAttempts<20)scheduleMagnetRecovery(15000);
  }catch(error){
    console.warn('Background Magnet payment recovery failed:',error);
    magnetRecoveryAttempts++;
    if(magnetRecoveryAttempts<120)scheduleMagnetRecovery(12000);
  }finally{magnetRecoveryBusy=false;}
}
function pollMagnetPayment(payloadUuid){
  if(!/^[0-9a-f-]{36}$/i.test(String(payloadUuid||'')))return;
  if(magnetPaymentPollUuid===payloadUuid&&magnetPaymentPollTimer)return;
  finishMagnetPaymentPoll();magnetPaymentPollUuid=payloadUuid;let attempts=0;refreshMagnetCheckoutAccount();
  const check=async()=>{
    if(document.hidden){magnetPaymentPollTimer=setTimeout(check,1800);return;}
    if(!authSession?.access_token){
      if(attempts++<40){magnetPaymentPollTimer=setTimeout(check,500);return;}
      const pending=readPendingMagnetPayment();if(pending?.payload_uuid===payloadUuid)queueMagnetRecovery(pending);
      clearPendingMagnetPaymentIf(payloadUuid);finishMagnetPaymentPoll();scheduleMagnetRecovery(1000);
      showXrplPaymentToast('Sign in to finish checking the Magnet Can payment. It remains queued for recovery.','error',9000);return;
    }
    attempts++;
    try{
      const data=await apiWithAuth('/api/xaman-vending-status?payload_uuid='+encodeURIComponent(payloadUuid)+'&recover_legacy=1');
      if(data.status==='paid'){
        finishMagnetPaymentPoll();await applyVerifiedMagnetPurchase(data,payloadUuid);clearPendingMagnetPaymentIf(payloadUuid);removeMagnetRecovery(payloadUuid);return;
      }
      if(['rejected','failed','expired'].includes(data.status)){
        finishMagnetPaymentPoll();clearPendingMagnetPaymentIf(payloadUuid);removeMagnetRecovery(payloadUuid);const message=data.error||('Payment '+data.status+'.');setMagnetCheckoutStatus(message,'error');showXrplPaymentToast(message,'error',9000);return;
      }
      const phase=data.phase==='validating'?'Payment sent · confirming the exact XRPL transaction…':data.phase==='opened'?'Xaman opened · waiting for approval…':data.phase==='waiting'?'Waiting for Xaman payment approval…':data.phase==='waiting-for-ledger-payment'?'Legacy payment · searching the validated XRPL ledger…':'Waiting for Xaman payment approval…';
      setMagnetCheckoutStatus(phase,'waiting');showXrplPaymentToast(phase,'waiting');
    }catch(error){setMagnetCheckoutStatus(error.message||'Payment check failed.','error');}
    if(attempts<80)magnetPaymentPollTimer=setTimeout(check,3000);
    else{
      const pending=readPendingMagnetPayment();if(pending?.payload_uuid===payloadUuid)queueMagnetRecovery(pending);
      clearPendingMagnetPaymentIf(payloadUuid);finishMagnetPaymentPoll();scheduleMagnetRecovery(800);
      const message='Payment check moved to background recovery. You can start a new checkout without paying again for this one.';
      setMagnetCheckoutStatus(message,'waiting');showXrplPaymentToast(message,'waiting',10000);
    }
  };
  check();
}
async function startMagnetPayment(){
  if(magnetCartQty<1)return;
  if(!authSession?.user){setMagnetCheckoutStatus('Sign in before paying.','error');return;}
  if(!playerAccount?.wallet_address){setMagnetCheckoutStatus('Link and verify Xaman from your account screen first.','error');return;}
  const pay=document.getElementById('magnetPayButton');if(pay){pay.disabled=true;pay.textContent='CREATING PAYMENT…';}
  setMagnetCheckoutStatus('Creating a secure Xaman payment request…','waiting');
  try{
    const data=await apiWithAuth('/api/xaman-vending-start',{method:'POST',body:JSON.stringify({quantity:magnetCartQty})});
    const previous=readPendingMagnetPayment();if(previous?.payload_uuid)queueMagnetRecovery(previous);
    savePendingMagnetPayment({payload_uuid:data.payload_uuid,purchase_id:data.purchase_id,user_id:currentMagnetUserId(),quantity:data.quantity,total:data.total,expires_at:data.expires_at,created_at:data.created_at||new Date().toISOString()});
    setMagnetCheckoutStatus('Opening Xaman. Approve the exact '+data.total+' ATM payment, then tap Close in Xaman and return to this browser tab. ATM Town will confirm it automatically.','waiting');
    showXrplPaymentToast('Xaman opened · this ATM Town session is waiting safely…','waiting');
    pollMagnetPayment(data.payload_uuid);
    window.location.assign(data.deeplink);
  }catch(error){setMagnetCheckoutStatus(error.message||'Could not create the Xaman payment.','error');showXrplPaymentToast(error.message||'Could not create payment.','error',9000);}
  finally{if(pay){pay.textContent='PAY WITH XAMAN';refreshMagnetCheckoutAccount();}}
}
function resumePendingMagnetPayment(){
  const returned=magnetPaymentReturnPayloadFromUrl();
  if(returned){const existing=readPendingMagnetPayment()||{};savePendingMagnetPayment({...existing,payload_uuid:returned.payload_uuid,purchase_id:existing.purchase_id||returned.purchase_id,tx_hash:returned.tx_hash||existing.tx_hash||'',user_id:existing.user_id||currentMagnetUserId(),returned_at:new Date().toISOString()});showXrplPaymentToast('Returned from Xaman · confirming the payment…','waiting');}
  const pending=readPendingMagnetPayment();
  if(!pending?.payload_uuid){scheduleMagnetRecovery(700);return;}
  const currentUser=currentMagnetUserId(),pendingUser=String(pending.user_id||'');
  if(currentUser&&pendingUser&&currentUser!==pendingUser){
    queueMagnetRecovery(pending);clearPendingMagnetPayment();finishMagnetPaymentPoll();refreshMagnetCheckoutAccount();scheduleMagnetRecovery(700);return;
  }
  const createdAt=Date.parse(pending.created_at||pending.returned_at||'')||0;
  const stale=createdAt&&Date.now()-createdAt>ATM_MAGNET_ACTIVE_STALE_MS;
  if(stale){
    queueMagnetRecovery({...pending,user_id:pending.user_id||currentUser});clearPendingMagnetPayment();finishMagnetPaymentPoll();refreshMagnetCheckoutAccount();
    showXrplPaymentToast('Old payment check moved to background recovery. New checkout is unlocked.','waiting',9000);
    scheduleMagnetRecovery(500);return;
  }
  showXrplPaymentToast('Checking the Xaman callback and exact XRPL transaction…','waiting');
  if(!authSession?.access_token){if(magnetPaymentResumeAttempts++<40)setTimeout(resumePendingMagnetPayment,500);return;}
  magnetPaymentResumeAttempts=0;pollMagnetPayment(pending.payload_uuid);scheduleMagnetRecovery(3000);
}
let jetpackTipTimer=0;
let jetpackTipShownForCurrentActivation=false;
function hideJetpackTip(){
  clearTimeout(jetpackTipTimer);jetpackTipTimer=0;
  const tip=document.getElementById('jetpackTip');if(tip)tip.classList.remove('visible');
}
function showJetpackTip(){
  const tip=document.getElementById('jetpackTip');if(!tip)return;
  tip.classList.add('visible');clearTimeout(jetpackTipTimer);
  jetpackTipTimer=setTimeout(()=>{tip.classList.remove('visible');jetpackTipTimer=0;},60000);
}
function syncJetpackUi(){
  const timer=document.getElementById('jetpackProductTimer');
  const hudName=document.querySelector('#jetpackPowerTimer .powerName');
  const active=canUseJetpack();
  const permanent=hasPermanentEquippedJetpack();
  const value=permanent?'NFT OWNED · PERMANENT':formatPowerTime(powerUps.jetpack);
  if(timer)timer.textContent=active?(permanent?'ACTIVE · '+value:'ACTIVE · '+value+' REMAINING'):'';
  if(active&&!jetpackTipShownForCurrentActivation){jetpackTipShownForCurrentActivation=true;showJetpackTip();}
  if(!active){jetpackTipShownForCurrentActivation=false;hideJetpackTip();}
  if(hudName)hudName.textContent='JETPACK';
}
function openVending(){
  if(vendingOpen)return;
  vendingOpen=true;vendingOpenedAt=performance.now();dialogOpen=true;joy.x=joy.y=0;knob.style.transform='translate(0,0)';
  document.body.classList.add('vending-modal-open');
  document.getElementById('vendingPanel').classList.add('open');
  updatePowerHud(true);
  syncJetpackUi();
  updateMagnetCartUi();refreshMagnetCheckoutAccount();
}
function closeVending(options={}){
  const force=options?.force===true;
  if(!vendingOpen)return false;
  if(!force&&performance.now()-vendingOpenedAt<VENDING_OPEN_GESTURE_GUARD_MS)return false;
  closeMagnetCheckout();
  vendingOpen=false;dialogOpen=false;
  document.body.classList.remove('vending-modal-open');
  document.getElementById('vendingPanel').classList.remove('open');
  document.getElementById('vendingMessage').textContent='';
  return true;
}
function updatePowerUps(dt){
  let changed=false;
  for(const type of ['speed','bounce','magnet','jetpack','invisibility','juggernaut','fire']){
    if(powerUps[type]>0){
      const before=Math.ceil(powerUps[type]);
      powerUps[type]=Math.max(0,powerUps[type]-dt);
      if(type==='jetpack'&&powerUps[type]<=0&&jetpackState.active&&!hasPermanentEquippedJetpack())endJetpack();
      if(Math.ceil(powerUps[type])!==before)changed=true;
    }
  }
  if(changed){updatePowerHud();syncJetpackUi();updateJetpackHud();window.atmLockerInventoryChanged?.();}
}
function updateJetpackHud(force=false){
  const timer=document.getElementById('jetpackPowerTimer');
  const time=document.getElementById('jetpackPowerTime');
  if(!timer||!time)return;
  syncJetpackUi();
  timer.classList.toggle('active',canUseJetpack());
  if(!canUseJetpack()){time.textContent='LOCKED';return;}
  const permanent=hasPermanentEquippedJetpack();
  const remaining=permanent?'NFT':formatPowerTime(powerUps.jetpack);
  if(!jetpackState.active){time.textContent='READY · '+remaining;return;}
  const mode=jetpackState.thrusting?'RISING':((jetpackState.velocity>20)?'COAST':'FALLING');
  time.textContent=mode+' · '+remaining;
}
function endJetpack(){
  if(!jetpackState.active)return;
  stopJetpackBoostSound();
  jetpackState.active=false;
  jetpackState.thrusting=false;
  jetpackState.astronautLowGravity=false;
  jetpackState.lift=0;
  jetpackState.velocity=0;
  jetpackState.releaseElapsed=0;
  jetpackState.controlPointerId=null;
  jetpackState.momentumX=0;
  jetpackState.momentumY=0;
  if(currentMap==='town'&&obstacleAtFootprint(player.x,player.y)){
    player.x=jetpackState.lastSafeX;
    player.y=jetpackState.lastSafeY;
  }
  updateJetpackHud(true);
  broadcastState(true);
}

const directoryPanel=document.getElementById('directoryPanel');
const directoryCanvas=document.getElementById('directoryCanvas');
const directoryCtx=directoryCanvas.getContext('2d');
const directoryLocationsEl=document.getElementById('directoryLocations');
let directoryOpen=false;
let directoryTargetMap='town';
let directorySelectedIndex=-1;
function directoryLocationData(mapName){
  if(mapName==='town')return [
    {name:'ATM Token Arcade',description:'Arcade games, tokens, and multiplayer challenges.',zone:TOWN_ENTRY_ZONES.find(z=>z.id==='arcade')},
    {name:'ATM HQ',description:'ATM Town headquarters and meeting area.',zone:TOWN_ENTRY_ZONES.find(z=>z.id==='hq')},
    {name:'Community Lounge',description:'Social lounge, television, Darts, and voice chat.',zone:TOWN_ENTRY_ZONES.find(z=>z.id==='gameLounge')},
    {name:'ATM Town Directory',description:'The in-world directory terminal.',zone:TOWN_MISC_ZONES.find(z=>z.id==='townInfoHub')},
    {name:'NFT Art Gallery',description:'NFT art and collection gallery.',zone:TOWN_ENTRY_ZONES.find(z=>z.id==='nftmega')},
    {name:'Event Arena',description:'Southwestern event and entertainment venue.',zone:TOWN_ENTRY_ZONES.find(z=>z.id==='arena')},
    {name:'Community Spot',description:'Boardwalk social area near the beach.',zone:TOWN_MISC_ZONES.find(z=>z.id==='communitySpot')},
    {name:'Upgrades Kiosk',description:'Future technology and upgrade terminal.',zone:TOWN_MISC_ZONES.find(z=>z.id==='upgradesKiosk')},
    {name:'Byte Bistro',description:'Future lower-district social venue.',zone:TOWN_ENTRY_ZONES.find(z=>z.id==='bank')}
  ];
  const destination=ATM_MAPS.runtime(mapName,townZoom);
  return [{name:destination.label+' Entrance',description:'Exit point back toward ATM Town.',point:{x:destination.spawn.x,y:destination.spawn.y}}];
}
function directorySource(mapName){
  if(mapName==='hq')return {w:hq.width,h:hq.height,minX:0,minY:0,image:hqBaseImg};
  if(mapName==='gallery')return {w:gallery.width,h:gallery.height,minX:0,minY:0,image:galleryBaseImg};
  if(mapName==='arcade')return {w:arcade.width,h:arcade.height,minX:0,minY:0,image:arcadeBaseImg};
  if(mapName==='lounge')return {w:lounge.width,h:lounge.height,minX:0,minY:0,image:loungeBaseImg};
  const bounds=townWorldBounds();
  return {w:bounds.width,h:bounds.height,minX:bounds.minX,minY:bounds.minY,image:floorMapImg};
}
function directoryPoint(item){return item.point||zoneCenter(item.zone);}
function directorySetCanvasSize(mapName){
  const section=directoryCanvas.parentElement;
  const available=Math.max(240,Math.floor(section.clientWidth-16));
  const source=directorySource(mapName);
  const ratio=source.w/source.h;
  const cssWidth=Math.min(760,available);
  const cssHeight=Math.max(260,Math.round(cssWidth/ratio));
  const dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
  directoryCanvas.style.width=cssWidth+'px';
  directoryCanvas.style.height=cssHeight+'px';
  directoryCanvas.width=Math.round(cssWidth*dpr);
  directoryCanvas.height=Math.round(cssHeight*dpr);
  directoryCtx.setTransform(dpr,0,0,dpr,0,0);
  return {width:cssWidth,height:cssHeight,source};
}
function drawDirectory(){
  if(!directoryOpen)return;
  const mapName=directoryTargetMap;
  const sizing=directorySetCanvasSize(mapName),width=sizing.width,height=sizing.height,source=sizing.source;
  const title=mapName==='town'?'ATM Town Directory':ATM_MAPS.label(mapName)+' Map';
  document.getElementById('directoryTitle').textContent=title;
  document.getElementById('directorySubtitle').textContent=mapName==='town'?'Full town map and major landmarks.':'Large interior map with your current position.';
  directoryCtx.clearRect(0,0,width,height);
  directoryCtx.fillStyle='#071923';directoryCtx.fillRect(0,0,width,height);
  const mapRatio=source.w/source.h,boxRatio=width/height;
  let dw,dh,dx,dy;
  if(mapRatio<boxRatio){dh=height;dw=dh*mapRatio;dx=(width-dw)/2;dy=0;}else{dw=width;dh=dw/mapRatio;dx=0;dy=(height-dh)/2;}
  if(mapName==='town'&&floorMapImg.complete&&floorMapImg.naturalWidth){
    const r=getFloorSourceRect();directoryCtx.imageSmoothingEnabled=true;try{directoryCtx.imageSmoothingQuality='high';}catch(_error){}
    directoryCtx.drawImage(floorMapImg,r.sx,r.sy,r.sw,r.sh,dx,dy,dw,dh);
    if(currentTownNightAlpha>0&&floorMapNightImg.complete&&floorMapNightImg.naturalWidth){const nr=getSourceRectForImage(floorMapNightImg,3120,4320);directoryCtx.save();directoryCtx.globalAlpha=currentTownNightAlpha;directoryCtx.drawImage(floorMapNightImg,nr.sx,nr.sy,nr.sw,nr.sh,dx,dy,dw,dh);directoryCtx.restore();}
  }else if(mapName!=='town'&&source.image.complete&&source.image.naturalWidth){directoryCtx.imageSmoothingEnabled=false;directoryCtx.drawImage(source.image,0,0,source.image.naturalWidth,source.image.naturalHeight,dx,dy,dw,dh);}
  else{directoryCtx.fillStyle='#142631';directoryCtx.fillRect(dx,dy,dw,dh);}
  directoryCtx.strokeStyle='rgba(88,241,230,.58)';directoryCtx.lineWidth=2;directoryCtx.strokeRect(dx+1,dy+1,dw-2,dh-2);
  const mapPoint=(x,y)=>({x:dx+((x-(source.minX||0))/source.w)*dw,y:dy+((y-(source.minY||0))/source.h)*dh});
  const locations=directoryLocationData(mapName);
  locations.forEach((item,index)=>{
    const p=directoryPoint(item),m=mapPoint(p.x,p.y),selected=index===directorySelectedIndex;
    directoryCtx.fillStyle=selected?'#ff4fa3':'#58f1e6';directoryCtx.beginPath();directoryCtx.arc(m.x,m.y,selected?9:8,0,Math.PI*2);directoryCtx.fill();directoryCtx.strokeStyle='#06161c';directoryCtx.lineWidth=2;directoryCtx.stroke();directoryCtx.fillStyle=selected?'#fff':'#06212b';directoryCtx.font='1000 10px system-ui';directoryCtx.textAlign='center';directoryCtx.textBaseline='middle';directoryCtx.fillText(String(index+1),m.x,m.y+.5);
  });
  const playerMapPoint=mapPoint(player.x,player.y);directoryCtx.fillStyle='#ffd166';directoryCtx.beginPath();directoryCtx.arc(playerMapPoint.x,playerMapPoint.y,7,0,Math.PI*2);directoryCtx.fill();directoryCtx.strokeStyle='#06161c';directoryCtx.lineWidth=3;directoryCtx.stroke();
  directoryCtx.fillStyle='rgba(5,18,26,.92)';directoryCtx.font='1000 9px system-ui';directoryCtx.textAlign='center';directoryCtx.textBaseline='alphabetic';const youY=Math.max(dy+12,playerMapPoint.y-11);directoryCtx.fillRect(playerMapPoint.x-18,youY-10,36,13);directoryCtx.fillStyle='#ffd166';directoryCtx.fillText('YOU',playerMapPoint.x,youY);
  directoryLocationsEl.innerHTML='';
  locations.forEach((item,index)=>{const card=document.createElement('button');card.type='button';card.className='directoryLocation'+(index===directorySelectedIndex?' selected':'');card.innerHTML='<span class="directoryLocationNumber">'+(index+1)+'</span><span class="directoryLocationText"><b>'+item.name+'</b><span>'+item.description+'</span></span>';card.addEventListener('click',()=>{directorySelectedIndex=index;drawDirectory();});directoryLocationsEl.appendChild(card);});
}
function openDirectory(mapName='town'){
  if(directoryOpen)return;directoryTargetMap=mapName;directorySelectedIndex=-1;directoryOpen=true;dialogOpen=true;joy.x=joy.y=0;knob.style.transform='translate(0,0)';document.body.classList.add('directory-open');directoryPanel.classList.add('open');directoryPanel.setAttribute('aria-hidden','false');requestAnimationFrame(drawDirectory);
}
function closeDirectory(){
  if(!directoryOpen)return;directoryOpen=false;dialogOpen=false;document.body.classList.remove('directory-open');directoryPanel.classList.remove('open');directoryPanel.setAttribute('aria-hidden','true');
}
function interactionHint(thing){let hint='';if(thing?.type==='player-nft-beacon')hint='';else if(thing?.type==='horde-revive')hint='Tap ACTION to revive '+String(thing.name||'player').replace(/^REVIVE /,'');else if(thing?.type==='prop-hunt-target')hint='Tap ACTION to tag this hidden prop';else if(currentMap==='arcade'&&thing&&['sky-run','platform-panic','ring-rumble','flappy-jetpack','neon-racer'].includes(thing.type))hint='Tap PLAY to launch '+thing.name;else if(currentMap==='lounge'&&thing?.id==='loungeDarts')hint='Tap ACTION to play ATM DARTS 301';else if(currentMap==='hq'&&thing?.id==='hqCommandCore')hint='Tap ACTION to open the World Event Control';else if(currentMap==='town'&&thing?.id==='townInfoHub')hint='Tap MAP to open the ATM Town directory';else hint=ATM_INTERACTIONS.hintFor(thing,currentMap);if(gamepadPromptActive())return String(hint||'').replace(/^Tap VIEW NFT/i,'Press X').replace(/^Tap PLAY/i,'Press X').replace(/^Tap ACTION/i,'Press X').replace(/^Tap ENTER/i,'Press X').replace(/^Tap MAP/i,'Press Y');return hint;}
function showDialog(title,text){dialogOpen=true;document.getElementById('dialogTitle').textContent=title;document.getElementById('dialogText').textContent=text;document.getElementById('dialog').style.display='block';}
function switchMap(map,sourceBuilding=null){
  const destination=ATM_MAPS.runtime(map,townZoom);
  if(destination.interior&&sourceBuilding){
    const door=getBuildingInteractPoint(sourceBuilding);
    townReturnPoint=ATM_MAPS.townReturnPoint(map,door);
  }
  currentMap=map;
  zoom=destination.zoom;
  document.getElementById('mapLabel').textContent=destination.label+' · '+ATM_DISPLAY_BUILD.version;
  if(map==='town'&&townReturnPoint){
    player.x=townReturnPoint.x;
    player.y=townReturnPoint.y;
    player.dir='down';
  }else{
    player.x=destination.spawn.x;
    player.y=destination.spawn.y;
    player.dir=destination.direction;
  }
  if(map==='town'){
    townWorldStream.preloadPlayerNeighborhood(player.x,player.y).then(()=>ensureTownPlayerWalkable('map-entry')).catch(error=>console.error('ATM Town map-entry preload failed.',error));
  }
  const viewW=W/zoom,viewH=H/zoom;
  if(map==='town'){
    const bounds=townWorldBounds();
    cam.x=bounds.width<=viewW?bounds.minX+(bounds.width-viewW)/2:Math.max(bounds.minX,Math.min(player.x-viewW/2,bounds.maxX-viewW));
    cam.y=bounds.height<=viewH?bounds.minY+(bounds.height-viewH)/2:Math.max(bounds.minY,Math.min(player.y-viewH/2,bounds.maxY-viewH));
  }else{
    const activeW=destination.pixelSize.w,activeH=destination.pixelSize.h;
    cam.x=activeW<=viewW?(activeW-viewW)/2:Math.max(0,Math.min(player.x-viewW/2,activeW-viewW));
    cam.y=activeH<=viewH?(activeH-viewH)/2:Math.max(0,Math.min(player.y-viewH/2,activeH-viewH));
  }
  broadcastState(true);
  saveAccountLocation();
}
const ATM_ACCOUNT_LOCATION_PREFIX='atm_account_location_v1:';
let restoredAccountLocationUserId='';
function accountLocationKey(){return authSession?.user?.id?ATM_ACCOUNT_LOCATION_PREFIX+authSession.user.id:'';}
function saveAccountLocation(){
  const key=accountLocationKey();if(!key||!Number.isFinite(player.x)||!Number.isFinite(player.y))return;
  const returnPoint=ATM_MAPS.isInterior(currentMap)&&townReturnPoint&&Number.isFinite(townReturnPoint.x)&&Number.isFinite(townReturnPoint.y)
    ?{x:Math.round(townReturnPoint.x*10)/10,y:Math.round(townReturnPoint.y*10)/10}
    :null;
  const value={map:currentMap,x:Math.round(player.x*10)/10,y:Math.round(player.y*10)/10,dir:player.dir||'down',townReturnPoint:returnPoint,savedAt:Date.now()};
  try{localStorage.setItem(key,JSON.stringify(value));}catch(_error){}
}
function fallbackTownReturnPointForInterior(mapId){
  if(!ATM_MAPS.isInterior(mapId))return null;
  const entranceId=ATM_CONFIG?.maps?.[mapId]?.entranceId;
  const zone=entranceId?TOWN_ENTRY_ZONES.find(item=>item.id===entranceId):null;
  if(!zone)return null;
  const door=getBuildingInteractPoint(zone);
  return ATM_MAPS.townReturnPoint(mapId,door);
}
function restoreAccountLocation(){
  const userId=authSession?.user?.id;if(!userId||restoredAccountLocationUserId===userId)return false;
  restoredAccountLocationUserId=userId;const key=ATM_ACCOUNT_LOCATION_PREFIX+userId;let saved=null;
  try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch(_error){}
  const allowedMaps=new Set(['town','hq','gallery','arcade','lounge']);
  if(!saved||!allowedMaps.has(saved.map)||!Number.isFinite(saved.x)||!Number.isFinite(saved.y))return false;
  const destination=ATM_MAPS.runtime(saved.map,townZoom),pad=24;
  currentMap=saved.map;zoom=destination.zoom;
  if(ATM_MAPS.isInterior(currentMap)){
    const savedReturn=saved.townReturnPoint;
    townReturnPoint=savedReturn&&Number.isFinite(savedReturn.x)&&Number.isFinite(savedReturn.y)
      ?{x:Number(savedReturn.x),y:Number(savedReturn.y)}
      :fallbackTownReturnPointForInterior(currentMap);
  }else{
    townReturnPoint=null;
  }
  if(currentMap==='town'){
    const applySavedTownPoint=()=>{
      const bounds=townWorldBounds();
      player.x=Math.max(bounds.minX+pad,Math.min(bounds.maxX-pad,saved.x));
      player.y=Math.max(bounds.minY+pad,Math.min(bounds.maxY-pad,saved.y));
    };
    applySavedTownPoint();
    townWorldStream.ready.then(()=>{
      // Re-apply against manifest bounds so future negative saved coordinates are
      // not lost if account restore happens before manifest fetch completes.
      applySavedTownPoint();
      return townWorldStream.preloadPlayerNeighborhood(player.x,player.y);
    }).then(()=>ensureTownPlayerWalkable('saved-location-restore')).catch(error=>console.error('ATM Town saved-location preload failed.',error));
  }else{
    player.x=Math.max(pad,Math.min(destination.pixelSize.w-pad,saved.x));
    player.y=Math.max(pad,Math.min(destination.pixelSize.h-pad,saved.y));
  }
  player.dir=['up','down','left','right'].includes(saved.dir)?saved.dir:destination.direction;
  const mapLabel=document.getElementById('mapLabel');if(mapLabel)mapLabel.textContent=destination.label+' · '+ATM_DISPLAY_BUILD.version;
  const viewW=W/zoom,viewH=H/zoom;
  if(currentMap==='town'){
    const bounds=townWorldBounds();
    cam.x=bounds.width<=viewW?bounds.minX+(bounds.width-viewW)/2:Math.max(bounds.minX,Math.min(player.x-viewW/2,bounds.maxX-viewW));
    cam.y=bounds.height<=viewH?bounds.minY+(bounds.height-viewH)/2:Math.max(bounds.minY,Math.min(player.y-viewH/2,bounds.maxY-viewH));
  }else{
    cam.x=destination.pixelSize.w<=viewW?(destination.pixelSize.w-viewW)/2:Math.max(0,Math.min(player.x-viewW/2,destination.pixelSize.w-viewW));
    cam.y=destination.pixelSize.h<=viewH?(destination.pixelSize.h-viewH)/2:Math.max(0,Math.min(player.y-viewH/2,destination.pixelSize.h-viewH));
  }
  broadcastState(true);return true;
}
window.atmRestoreAccountLocation=restoreAccountLocation;
setInterval(saveAccountLocation,5000);
window.addEventListener('pagehide',saveAccountLocation);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveAccountLocation();});
function interact(){
  if(window.ATMZombieOutbreak?.isLocalDowned?.()===true){window.ATMWorldEvents?.toast?.('💀 YOU ARE DOWN · WAIT FOR A REVIVE',1400);return;}
  const tradeTarget=nearestTradeBeaconRemote();if(tradeTarget&&!dialogOpen){tradeNftOpen(tradeTarget);return;}
  const reviveTarget=nearestHordeRevivePlayer();if(reviveTarget&&!dialogOpen){window.ATMZombieOutbreak?.requestRevive?.(reviveTarget.remoteId);return;}
  // Vending keeps priority over normal world objects after player Trade Beacons.
  const vending=nearestVendingMachine();
  if(vending&&!vendingOpen){openVending();return;}
  if(dialogOpen)return;
  const t=nearestThing();
  if(t&&t.type==='vending'){openVending();return;}
  if(t&&t.type==='prop-hunt-target'){window.ATMPropHunt?.tagTarget?.(t);return;}
  if(currentMap==='town'&&t){
    const destinationMap=ATM_MAPS.fromEntrance(t.id);
    if(destinationMap){switchMap(destinationMap,t);return;}
  }
  if(ATM_MAPS.isInterior(currentMap)&&t&&t.targetMap){switchMap(t.targetMap);return;}
  if(currentMap==='town'&&t&&t.id==='townInfoHub'){openDirectory('town');return;}
  if(currentMap==='hq'&&t&&t.id==='hqCommandCore'){window.ATMWorldEvents?.openControlPanel?.({map:currentMap,x:player.x,y:player.y});return;}
  if(t&&t.type==='voice'){joinHQVoice();return;}
  if(t&&t.id==='loungeDarts'){window.openATMDarts?.();return;}
  if(t)showDialog(t.name,t.text||'ATM Town location');else showDialog('ATM Town','Walk around the district, collect coins, and interact with landmarks.');
}
const actionButton=document.getElementById('action');
actionButton.setAttribute('aria-hidden','true');actionButton.tabIndex=-1;
let lastActionPressAt=0;
let lastPointerActionAt=-Infinity;
function triggerActionPress(e){
  if(e){e.preventDefault();e.stopPropagation();}
  const now=performance.now();
  if(now-lastActionPressAt<500)return;
  lastActionPressAt=now;
  actionButton.classList.add('pressed');
  setTimeout(()=>actionButton.classList.remove('pressed'),120);
  interact();
}
actionButton.addEventListener('pointerdown',e=>{
  lastPointerActionAt=performance.now();
  triggerActionPress(e);
},{passive:false});
// Desktop fallback only. Ignore Safari's delayed synthetic click after a touch/pointer action.
actionButton.addEventListener('click',e=>{
  if(performance.now()-lastPointerActionAt<1200){e.preventDefault();e.stopPropagation();return;}
  triggerActionPress(e);
},{passive:false});

document.getElementById('closeDialog').addEventListener('click',()=>{ dialogOpen=false; document.getElementById('dialog').style.display='none'; });
document.getElementById('directoryClose').addEventListener('click',closeDirectory);
document.getElementById('directoryCloseBottom').addEventListener('click',closeDirectory);
directoryPanel.addEventListener('click',event=>{if(event.target===directoryPanel)closeDirectory();});
const miniMapButton=document.getElementById('mini');
miniMapButton.addEventListener('pointerdown',event=>event.stopPropagation());
miniMapButton.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(!dialogOpen)openDirectory(currentMap);});
miniMapButton.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&!dialogOpen){event.preventDefault();openDirectory(currentMap);}});
window.addEventListener('resize',()=>{if(directoryOpen)requestAnimationFrame(drawDirectory);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&directoryOpen)closeDirectory();});
document.querySelectorAll('[data-buy-power]').forEach(button=>button.addEventListener('click',()=>addPowerUp(button.dataset.buyPower)));
document.getElementById('magnetQtyMinus')?.addEventListener('click',()=>{magnetCartQty=Math.max(0,magnetCartQty-1);updateMagnetCartUi();refreshMagnetCheckoutAccount();});
document.getElementById('magnetQtyPlus')?.addEventListener('click',()=>{magnetCartQty=Math.min(ATM_MAGNET_MAX_QUANTITY,magnetCartQty+1);updateMagnetCartUi();refreshMagnetCheckoutAccount();});
document.getElementById('magnetCheckoutButton')?.addEventListener('click',openMagnetCheckout);
document.getElementById('magnetCheckoutBack')?.addEventListener('click',closeMagnetCheckout);
document.getElementById('magnetPayButton')?.addEventListener('click',startMagnetPayment);
document.getElementById('magnetResetPending')?.addEventListener('click',()=>clearStuckMagnetCheck());
document.getElementById('closeVending').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeVending();});
document.getElementById('jetpackTipClose')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();hideJetpackTip();});
document.getElementById('vendingPanel').addEventListener('click',e=>{if(e.target.id==='vendingPanel')closeVending();});
syncJetpackUi();
updatePowerHud(true);
updateMagnetCartUi();
setTimeout(resumePendingMagnetPayment,300);
window.addEventListener('focus',()=>scheduleMagnetRecovery(250));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleMagnetRecovery(250);});
updateJetpackHud(true);

function update(dt){
  syncJetpackBoostSound();
  updateTownBots(dt);
  updatePowerUps(dt);
  if(jumpState.active){
    if(currentMap==='town'&&astronautJumpLowGravityActive()&&!obstacleAtFootprint(player.x,player.y)){
      jumpState.lastSafeX=player.x;
      jumpState.lastSafeY=player.y;
    }
    jumpState.elapsed+=dt;
    if(jumpState.elapsed>=currentJumpDuration()){
      if(currentMap==='town'&&astronautJumpLowGravityActive()&&obstacleAtFootprint(player.x,player.y)){
        player.x=jumpState.lastSafeX;
        player.y=jumpState.lastSafeY;
      }
      jumpState.active=false;
      jumpState.elapsed=0;
      jumpState.momentumX=0;
      jumpState.momentumY=0;
      clearJumpProfile();
      broadcastState(true);
    }
  }
  if(jetpackState.active){
    if(jetpackState.thrusting){
      jetpackState.releaseElapsed=0;
      jetpackState.velocity=Math.min(JETPACK_MAX_RISE_SPEED,jetpackState.velocity+JETPACK_RISE_ACCEL*dt);
    }else{
      jetpackState.releaseElapsed+=dt;
      const astronautJetpack=astronautJetpackLowGravityActive();
      const fallGravityStart=astronautJetpack?ASTRONAUT_JETPACK_FALL_GRAVITY_START:JETPACK_FALL_GRAVITY_START;
      const fallGravityRamp=astronautJetpack?ASTRONAUT_JETPACK_FALL_GRAVITY_RAMP:JETPACK_FALL_GRAVITY_RAMP;
      const fallGravityMax=astronautJetpack?ASTRONAUT_JETPACK_FALL_GRAVITY_MAX:JETPACK_FALL_GRAVITY_MAX;
      const maxFallSpeed=astronautJetpack?ASTRONAUT_JETPACK_MAX_FALL_SPEED:JETPACK_MAX_FALL_SPEED;
      if(astronautJetpack&&jetpackState.velocity>0){
        // The astronaut still coasts upward after release, but the stronger
        // damping reduces that carry distance to about half of the v173 arc.
        const previousVelocity=jetpackState.velocity;
        jetpackState.velocity=Math.max(0,jetpackState.velocity-ASTRONAUT_JETPACK_UPWARD_RELEASE_BRAKE*dt);
        // Start the low-gravity fall timer from zero at the apex so descent
        // remains smooth and unchanged by the stronger upward damping.
        if(previousVelocity>0&&jetpackState.velocity===0)jetpackState.releaseElapsed=0;
      }else if(!astronautJetpack&&jetpackState.velocity>0&&jetpackState.releaseElapsed<JETPACK_RELEASE_COAST){
        jetpackState.velocity=Math.max(0,jetpackState.velocity-JETPACK_COAST_BRAKE*dt);
      }else{
        const fallTime=astronautJetpack
          ?Math.max(0,jetpackState.releaseElapsed)
          :Math.max(0,jetpackState.releaseElapsed-JETPACK_RELEASE_COAST);
        const fallGravity=Math.min(fallGravityMax,fallGravityStart+fallTime*fallGravityRamp);
        jetpackState.velocity=Math.max(-maxFallSpeed,jetpackState.velocity-fallGravity*dt);
      }
    }
    jetpackState.lift+=jetpackState.velocity*dt;
    if(jetpackState.lift>=JETPACK_MAX_LIFT){
      jetpackState.lift=JETPACK_MAX_LIFT;
      if(jetpackState.velocity>0)jetpackState.velocity=0;
    }
    if(currentMap==='town'&&!obstacleAtFootprint(player.x,player.y)){
      jetpackState.lastSafeX=player.x;
      jetpackState.lastSafeY=player.y;
    }
    if(jetpackState.lift<=0&&!jetpackState.thrusting){
      jetpackState.lift=0;
      endJetpack();
    }else{
      updateJetpackHud();
    }
  }
  if(dialogOpen){
    // Modal UI (Locker, directory, dialogs) must not make the player vanish from
    // multiplayer. Keep the same throttled state heartbeat used during normal play
    // so remote clients retain position/activity and proximity voice stays audible.
    broadcastState();
    return;
  }
  let dx=joy.x+gamepadState.moveX,dy=joy.y+gamepadState.moveY;
  if(keys['a']||keys['arrowleft'])dx-=1;
  if(keys['d']||keys['arrowright'])dx+=1;
  if(keys['w']||keys['arrowup'])dy-=1;
  if(keys['s']||keys['arrowdown'])dy+=1;
  const mag=Math.hypot(dx,dy);
  const combatMoveX=mag>0?dx/mag:0,combatMoveY=mag>0?dy/mag:0;
  const zombieParticipants=[{id:playerId,x:player.x,y:player.y,map:currentMap,local:true,downed:window.ATMZombieOutbreak?.isLocalDowned?.()===true,invisible:powerUps.invisibility>0,juggernaut:powerUps.juggernaut>0,fireActive:powerUps.fire>0}];
  if(currentMap==='town'){
    const zombieNow=Date.now();
    for(const [id,p] of remotePlayers){
      if(p?.map!=='town'||zombieNow-Number(p.lastSeen||0)>3500)continue;
      const px=Number.isFinite(Number(p.drawX))?Number(p.drawX):Number(p.x);
      const py=Number.isFinite(Number(p.drawY))?Number(p.drawY):Number(p.y);
      if(Number.isFinite(px)&&Number.isFinite(py))zombieParticipants.push({id,x:px,y:py,map:'town',downed:!!p?.zombieCombat?.downed,invisible:!!p?.powers?.invisibility,juggernaut:!!p?.powers?.juggernaut,fireActive:!!p?.powers?.fire});
    }
  }
  window.ATMZombieOutbreak?.update?.({
    dt,map:currentMap,x:player.x,y:player.y,localId:playerId,networkOnline:onlineMode,
    movementX:combatMoveX,movementY:combatMoveY,
    controllerAimX:gamepadState.lookX,controllerAimY:gamepadState.lookY,
    participants:zombieParticipants,
    mapBounds:currentMap==='town'?townWorldBounds():null,
    isBlocked:(x,y)=>currentMap==='town'?obstacleAtFootprint(x,y):blocked(x,y),
    screenToWorld:(clientX,clientY)=>{
      const rect=canvas.getBoundingClientRect();
      return {x:cam.x+(clientX-rect.left)/zoom,y:cam.y+(clientY-rect.top)/zoom};
    }
  });
  const hordeDowned=window.ATMZombieOutbreak?.isLocalDowned?.()===true;
  if(hordeDowned){dx=0;dy=0;if(jumpState.active)jumpState.active=false;if(jetpackState.active)endJetpack();}
  const zombieMotion=window.ATMZombieOutbreak?.movementOverride?.({map:currentMap,movementX:combatMoveX,movementY:combatMoveY,currentDir:player.dir,airborne:jumpState.active||jetpackState.active})||null;
  let moved=false;
  let onStairs=false;
  const beforeX=player.x,beforeY=player.y;
  if(jetpackState.active){
    const activeSize=ATM_MAPS.pixelSize(currentMap);
    const mapW=activeSize.w;
    const mapH=activeSize.h;
    const jetpackSpeed=player.speed*(powerUps.speed>0?1.5:1)*JETPACK_DIRECTIONAL_BOOST;
    if(mag>0){
      dx/=mag;dy/=mag;
      const targetVX=dx*jetpackSpeed,targetVY=dy*jetpackSpeed;
      const changeX=targetVX-jetpackState.momentumX,changeY=targetVY-jetpackState.momentumY;
      const changeMag=Math.hypot(changeX,changeY);
      if(changeMag>0){
        const step=Math.min(changeMag,JETPACK_DIRECTIONAL_ACCEL*dt);
        jetpackState.momentumX+=changeX/changeMag*step;
        jetpackState.momentumY+=changeY/changeMag*step;
      }
      player.dir=directionFromVector(dx,dy);
    }else{
      const momentumDecay=Math.exp(-JETPACK_MOMENTUM_DRAG*dt);
      jetpackState.momentumX*=momentumDecay;
      jetpackState.momentumY*=momentumDecay;
      if(Math.hypot(jetpackState.momentumX,jetpackState.momentumY)<JETPACK_MOMENTUM_STOP_SPEED){
        jetpackState.momentumX=0;
        jetpackState.momentumY=0;
      }else{
        player.dir=directionFromVector(jetpackState.momentumX,jetpackState.momentumY);
      }
    }
    const nx=player.x+jetpackState.momentumX*dt;
    const ny=player.y+jetpackState.momentumY*dt;
    if(currentMap==='town'){
      const bounds=townWorldBounds();
      player.x=Math.max(bounds.minX+player.r,Math.min(bounds.maxX-player.r,nx));
      player.y=Math.max(bounds.minY+player.r,Math.min(bounds.maxY-player.r,ny));
    }else{
      player.x=Math.max(player.r,Math.min(mapW-player.r,nx));
      player.y=Math.max(player.r,Math.min(mapH-player.r,ny));
    }
    moved=Math.hypot(player.x-beforeX,player.y-beforeY)>0.05;
  }else if(jumpState.active){
    const jumpSpeed=player.speed*(powerUps.speed>0?1.5:1);
    if(mag>0){
      dx/=mag;dy/=mag;
      const targetVX=dx*jumpSpeed,targetVY=dy*jumpSpeed;
      const changeX=targetVX-jumpState.momentumX,changeY=targetVY-jumpState.momentumY;
      const changeMag=Math.hypot(changeX,changeY);
      if(changeMag>0){
        const step=Math.min(changeMag,JUMP_DIRECTIONAL_ACCEL*dt);
        jumpState.momentumX+=changeX/changeMag*step;
        jumpState.momentumY+=changeY/changeMag*step;
      }
      player.dir=directionFromVector(dx,dy);
    }else{
      const momentumDecay=Math.exp(-JUMP_MOMENTUM_DRAG*dt);
      jumpState.momentumX*=momentumDecay;
      jumpState.momentumY*=momentumDecay;
      if(Math.hypot(jumpState.momentumX,jumpState.momentumY)<JUMP_MOMENTUM_STOP_SPEED){
        jumpState.momentumX=0;
        jumpState.momentumY=0;
      }else{
        player.dir=directionFromVector(jumpState.momentumX,jumpState.momentumY);
      }
    }
    const nx=player.x+jumpState.momentumX*dt;
    const ny=player.y+jumpState.momentumY*dt;
    if(!blocked(nx,player.y))player.x=nx;else jumpState.momentumX=0;
    if(!blocked(player.x,ny))player.y=ny;else jumpState.momentumY=0;
    moved=Math.hypot(player.x-beforeX,player.y-beforeY)>0.05;
  }else if(mag>0){
    dx/=mag;dy/=mag;
    onStairs=playerOnStairs()||stairWalkwayAt(player.x+dx*10,player.y+dy*10);
    const moveSpeed=player.speed*(powerUps.speed>0?1.5:1)*(onStairs?0.72:1);
    const nx=player.x+dx*moveSpeed*dt;
    const ny=player.y+dy*moveSpeed*dt;
    if(!blocked(nx,player.y))player.x=nx;
    if(!blocked(player.x,ny))player.y=ny;
    moved=Math.hypot(player.x-beforeX,player.y-beforeY)>0.05;
    player.dir=directionFromVector(dx,dy);
  }
  // During combat, aim owns the four-direction body sprite. Movement remains
  // independent, so moving against the aim direction reads as backpedaling.
  if(zombieMotion?.bodyDir)player.dir=zombieMotion.bodyDir;
  const travelDist=Math.hypot(player.x-beforeX,player.y-beforeY);
  const airborne=jumpState.active||jetpackState.active;
  if(currentMap==='town'&&!airborne&&travelDist>0.05){
    worldAliveState.playerStepCarry+=travelDist;
    while(worldAliveState.playerStepCarry>=28){
      spawnFootstepEffect(player.x,player.y,player.dir,'rgba(188,243,255,.30)',.92);
      worldAliveState.playerStepCarry-=28;
    }
  }else if(airborne){
    worldAliveState.playerStepCarry=0;
  }
  if(worldAliveState.prevAirborne&&!airborne)spawnLandingEffect(player.x,player.y,jumpState.bounceBoost?1.18:1);
  worldAliveState.prevAirborne=airborne;
  if(jetpackState.active){
    // Jetpack flight keeps the established center/idle stance.
    player.animTimer=0;
    player.frame=1;
  }else if(jumpState.active){
    // Ground jumps, Bounce jumps, and Astronaut jumps use a fixed outer
    // walking-step pose so the legs look active without cycling in midair.
    player.animTimer=0;
    player.frame=0;
  }else if(moved){
    const combatAnimDirection=zombieMotion?.animationDirection===-1?-1:1;
    player.animTimer+=dt*(onStairs?7:8)*combatAnimDirection;
    while(player.animTimer<0)player.animTimer+=3000;
    player.frame=Math.floor(player.animTimer)%3;
  }
  player.moving=moved;
  if(!moved&&!airborne){player.animTimer=0;player.frame=1;}
  if(currentMap==='town'&&!coinSpawnsReady)initializeRandomCoinSpawns();
  if(currentMap==='town'&&powerUps.magnet>0){
    for(const c of coinsArr){
      if(c.taken)continue;
      const dx=player.x-c.x,dy=player.y-c.y,dist=Math.hypot(dx,dy);
      if(dist>COIN_PICKUP_RADIUS&&dist<MAGNET_RANGE){
        const step=Math.min(dist-COIN_PICKUP_RADIUS*.35,MAGNET_PULL_SPEED*dt);
        c.x+=dx/dist*step;c.y+=dy/dist*step;
      }
    }
  }
  if(currentMap==='town')for(const c of coinsArr){
    if(!c.taken&&Math.hypot(player.x-c.x,player.y-c.y)<COIN_PICKUP_RADIUS){
      c.taken=true;coins++;
      spawnCoinPickupEffect(c.x,c.y);
      worldAliveState.coinHudPulse=.9;
      document.getElementById('coins').textContent=coins;
      document.getElementById('progress').textContent=coins;
      if(coins===COIN_TOTAL)showDialog('Quest Complete','You collected all 6 coins. This tiled cyberpunk district can be expanded next with interiors and quests.');
    }
  }
  window.ATMWorldEvents?.updateGameplay?.({map:currentMap,x:player.x,y:player.y});
  window.ATMPropHunt?.updateContext?.({localId:playerId,localName:playerName,localMap:currentMap,localX:player.x,localY:player.y,remotePlayers});
  const cameraLift=jetpackState.active?jetpackState.lift*.68:0;
  const zombieOwnsRightStick=window.ATMZombieOutbreak?.controllerOwnsRightStick?.()===true;
  const controllerLookX=zombieOwnsRightStick?0:gamepadState.lookX*220,controllerLookY=zombieOwnsRightStick?0:gamepadState.lookY*150;
  const targetX=player.x+controllerLookX-W/(2*zoom),targetY=player.y-cameraLift+controllerLookY-H/(2*zoom);
  cam.x+=(targetX-cam.x)*Math.min(1,dt*6);
  cam.y+=(targetY-cam.y)*Math.min(1,dt*6);
  const activeSize=ATM_MAPS.pixelSize(currentMap);
  const activeW=activeSize.w;
  const activeH=activeSize.h;
  const viewW=W/zoom,viewH=H/zoom;
  if(currentMap==='town'){
    const bounds=townWorldBounds();
    cam.x=bounds.width<=viewW?bounds.minX+(bounds.width-viewW)/2:Math.max(bounds.minX,Math.min(cam.x,bounds.maxX-viewW));
    cam.y=bounds.height<=viewH?bounds.minY+(bounds.height-viewH)/2:Math.max(bounds.minY,Math.min(cam.y,bounds.maxY-viewH));
  }else{
    cam.x=activeW<=viewW?(activeW-viewW)/2:Math.max(0,Math.min(cam.x,activeW-viewW));
    cam.y=activeH<=viewH?(activeH-viewH)/2:Math.max(0,Math.min(cam.y,activeH-viewH));
  }
  const nearThing=nearestThing();
  currentNearThing=nearThing;
  updateWorldAlive(dt);
  const hintEl=document.getElementById('hint');
  const hintText=interactionHint(nearThing);
  hintEl.textContent=hintText;
  hintEl.style.opacity=(nearThing&&hintText)?1:0;
  const registeredEntrance=nearThing&&currentMap==='town'&&ATM_MAPS.fromEntrance(nearThing.id);
  let actionLabel='ACTION';
  if(nearThing?.type==='player-nft-beacon')actionLabel='VIEW NFT';
  else if(nearThing?.type==='horde-revive')actionLabel='REVIVE';
  else if(nearThing?.type==='prop-hunt-target')actionLabel='TAG';
  else if(nearThing&&['sky-run','platform-panic','ring-rumble','flappy-jetpack','neon-racer'].includes(nearThing.type))actionLabel='PLAY';
  else if(nearThing?.type==='vending')actionLabel='USE';
  else if(nearThing?.type==='voice')actionLabel='JOIN';
  else if(registeredEntrance)actionLabel='ENTER';
  else if(nearThing&&currentMap==='town'&&nearThing.id==='townInfoHub')actionLabel='MAP';
  actionButton.textContent=(gamepadPromptActive()?'X · ':'')+actionLabel;
  actionButton.classList.toggle('available',!!nearThing);
  actionButton.setAttribute('aria-hidden',nearThing?'false':'true');
  actionButton.tabIndex=nearThing?0:-1;
  broadcastState();
}
function drawCoins(t){
  for(const c of coinsArr){
    if(c.taken) continue;
    const bob=Math.sin(t*0.004+c.phase)*4;
    const pulse=1+Math.sin(t*0.006+c.phase)*0.04;
    const x=c.x;
    const y=c.y+bob;
    const size=(c.size||COIN_DRAW_SIZE)*pulse;
    ctx.save();
    ctx.fillStyle='rgba(88,241,230,.14)';
    ctx.beginPath();
    ctx.arc(x,y,size*0.58,0,Math.PI*2);
    ctx.fill();
    ctx.shadowColor='rgba(255,255,255,.22)';
    ctx.shadowBlur=12;
    if(c.img&&c.img.complete&&c.img.naturalWidth){
      ctx.drawImage(c.img,x-size/2,y-size/2,size,size);
    }else{
      ctx.fillStyle='#ffd166';
      ctx.beginPath();
      ctx.arc(x,y,10,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#8a5a00';
      ctx.font='900 12px system-ui';
      ctx.textAlign='center';
      ctx.fillText('$',x,y+4);
    }
    ctx.restore();
  }
}

function drawMini(){
  mctx.clearRect(0,0,220,148);
  if(currentMap==='hq' || currentMap==='gallery' || currentMap==='arcade' || currentMap==='lounge'){
    const interiorCanvas=currentMap==='hq'?hq:(currentMap==='gallery'?gallery:(currentMap==='arcade'?arcade:lounge));
    const interiorImg=currentMap==='hq'?hqBaseImg:(currentMap==='gallery'?galleryBaseImg:(currentMap==='arcade'?arcadeBaseImg:loungeBaseImg));
    mctx.fillStyle='#0b1820';
    mctx.fillRect(0,0,220,148);
    const mapRatio=interiorCanvas.width/interiorCanvas.height;
    const boxRatio=220/148;
    let dw,dh,dx,dy;
    if(mapRatio<boxRatio){
      dh=148; dw=dh*mapRatio; dx=(220-dw)/2; dy=0;
    }else{
      dw=220; dh=dw/mapRatio; dx=0; dy=(148-dh)/2;
    }
    if(interiorImg.complete&&interiorImg.naturalWidth){
      mctx.imageSmoothingEnabled=false;
      mctx.drawImage(interiorImg,0,0,interiorImg.naturalWidth,interiorImg.naturalHeight,dx,dy,dw,dh);
    }else{
      mctx.fillStyle='#1b2430';mctx.fillRect(dx,dy,dw,dh);
    }
    mctx.strokeStyle='rgba(88,241,230,.55)';mctx.lineWidth=2;mctx.strokeRect(dx+1,dy+1,dw-2,dh-2);
    const px=dx+(player.x/interiorCanvas.width)*dw;
    const py=dy+(player.y/interiorCanvas.height)*dh;
    mctx.fillStyle='#fff';mctx.beginPath();mctx.arc(px,py,4,0,Math.PI*2);mctx.fill();
    return;
  }
  mctx.fillStyle='#08202b';
  mctx.fillRect(0,0,220,148);
  const bounds=townWorldBounds();
  const mapRatio=bounds.width/bounds.height;
  const boxRatio=220/148;
  let dw,dh,dx,dy;
  if(mapRatio<boxRatio){
    dh=148; dw=dh*mapRatio; dx=(220-dw)/2; dy=0;
  }else{
    dw=220; dh=dw/mapRatio; dx=0; dy=(148-dh)/2;
  }
  if(floorMapImg.complete&&floorMapImg.naturalWidth){
    const r=getFloorSourceRect();
    mctx.imageSmoothingEnabled=true;
    try{mctx.imageSmoothingQuality='high';}catch(_e){}
    mctx.drawImage(floorMapImg,r.sx,r.sy,r.sw,r.sh,dx,dy,dw,dh);
    if(currentTownNightAlpha>0&&floorMapNightImg.complete&&floorMapNightImg.naturalWidth){
      const nr=getSourceRectForImage(floorMapNightImg,3120,4320);
      mctx.save();
      mctx.globalAlpha=currentTownNightAlpha;
      mctx.drawImage(floorMapNightImg,nr.sx,nr.sy,nr.sw,nr.sh,dx,dy,dw,dh);
      mctx.restore();
    }
    mctx.imageSmoothingEnabled=false;
  }else{
    mctx.fillStyle='#cfc1ad';mctx.fillRect(dx,dy,dw,dh);
  }
  mctx.strokeStyle='rgba(88,241,230,.55)';mctx.lineWidth=2;mctx.strokeRect(dx+1,dy+1,dw-2,dh-2);
  const px=dx+((player.x-bounds.minX)/bounds.width)*dw;
  const py=dy+((player.y-bounds.minY)/bounds.height)*dh;
  drawTownBotMiniMarkers(dx,dy,dw,dh);
  mctx.fillStyle='#fff';mctx.beginPath();mctx.arc(px,py,4,0,Math.PI*2);mctx.fill();
}

function loop(t){
  pollGamepad(t);
  const dt=Math.min((t-last)/1000,.033);last=t;update(dt);
  updateHordeNightfall(t);
  currentTownNightAlpha=Math.max(getTownNightAlpha(getSharedTownTimeMs()),hordeNightfallAlpha*HORDE_NIGHTFALL.nightMix);
  ctx.clearRect(0,0,W,H);
  const snappedCamX=Math.round(cam.x*zoom*DPR)/(zoom*DPR);
  const snappedCamY=Math.round(cam.y*zoom*DPR)/(zoom*DPR);
  updateLoungeTvEmbed(snappedCamX,snappedCamY);
  ctx.save();ctx.scale(zoom,zoom);ctx.translate(-snappedCamX,-snappedCamY);
  if(currentMap==='hq')ctx.drawImage(hq,0,0);else if(currentMap==='gallery')ctx.drawImage(gallery,0,0);else if(currentMap==='arcade')ctx.drawImage(arcade,0,0);else if(currentMap==='lounge')ctx.drawImage(lounge,0,0);else drawVisibleTownChunks();
  if(currentMap==='town')drawCoins(t);
  window.ATMWorldEvents?.drawGround?.(ctx,{map:currentMap,now:t});
  drawWorldAliveGroundEffects();
  drawDepthScene(t);
  window.ATMWorldEvents?.drawAir?.(ctx,{map:currentMap,now:t,cameraX:snappedCamX,cameraY:snappedCamY,viewportWidth:W/zoom,viewportHeight:H/zoom,zoom});
  drawWorldAliveOverlay(t);
  // Horde Nightfall restricts visibility to the player bubble and authored
  // street lamps. The blackout is drawn first, then the street-light layer
  // restores only the intentionally lit zones with a synchronized grid flicker.
  if(currentMap==='town'){
    drawHordeVisionDarkness(ctx,snappedCamX,snappedCamY);
    drawTownLightOverlay(ctx,getHordeStreetLightAlpha(getSharedTownTimeMs()));
  }
  drawChatBubbles();
  ctx.restore();updateTradeBeaconWorldOverlays(t);drawWorldAliveUi();drawMini();requestAnimationFrame(loop);
}
syncTownWorldClock();
setInterval(syncTownWorldClock,5*60*1000);
requestAnimationFrame(loop);

(function(){
  const overlay=document.getElementById('landingOverlay');
  const shell=overlay?.querySelector('.flowShell');
  let currentScreen='welcome';
  let entryMode='signed';
  const screen=(name)=>overlay?.querySelector('[data-flow-screen="'+name+'"]');
  function setStatus(id,text,tone=''){
    const el=document.getElementById(id);if(!el)return;el.textContent=text||'';el.classList.toggle('danger',tone==='error');el.classList.toggle('ok',tone==='ok');
  }
  function selectedButton(){return document.querySelector('.characterChoice.selected')||document.querySelector('.characterChoice[data-character="classic"]');}
  function selectedInfo(){const b=selectedButton();return {id:b?.dataset.character||'classic',name:(b?.querySelector('span')?.textContent||'ATM').trim(),src:b?.querySelector('img')?.src||''};}
  function updateCharacterSummary(){
    const info=selectedInfo();const preview=document.getElementById('entryCharacterPreview');const label=document.getElementById('entryCharacterLabel');const selectedLabel=document.getElementById('selectedCharacterName');
    if(preview&&info.src)preview.src=info.src;if(label)label.textContent=info.name;if(selectedLabel)selectedLabel.textContent=info.name+' selected';
    document.querySelectorAll('.profileCharacterChoice').forEach(button=>{const active=button.dataset.profileCharacter===info.id;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',active?'true':'false');});
  }
  function applyEntryMode(mode){
    entryMode=mode;shell.dataset.entryMode=mode;
    const online=document.getElementById('joinOnline'),offline=document.getElementById('joinOffline'),note=document.getElementById('entryModeNote'),eyebrow=document.getElementById('profileEyebrow');
    if(mode==='guest'){
      selectCharacter('classic');updateCharacterSummary();
      if(online)online.textContent='Enter Town as Guest';if(offline)offline.style.display='none';if(note)note.textContent='Guest accounts use ATM and progress is not attached to an account.';if(eyebrow)eyebrow.textContent='Guest Entry';
    }else{
      if(online)online.textContent='Enter Town Online';if(offline)offline.style.display='block';if(note)note.textContent='Your selected character will be used online.';if(eyebrow)eyebrow.textContent='Final Step';
    }
  }
  function show(name){
    if(!overlay)return;
    // Ignore late duplicate login/auth callbacks once gameplay has started.
    if(townEntryActive){hideTownAccessFlow();return;}
    document.body.classList.add('access-flow-open');currentScreen=name;shell.dataset.screen=name;overlay.style.display='block';overlay.querySelectorAll('.flowScreen').forEach(s=>s.classList.toggle('active',s.dataset.flowScreen===name));
    if(name==='character'){applyEntryMode('signed');updateCharacterSummary();setTimeout(()=>selectedButton()?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}),40);}
    if(name==='profile')updateCharacterSummary();
    const first=name==='signup'?document.getElementById('identityEmail'):name==='profile'?document.getElementById('displayName'):null;if(first)setTimeout(()=>{try{first.focus({preventScroll:true});}catch(_){first.focus();}},80);
  }
  window.atmShowFlowScreen=show;
  window.atmFlowAuthUpdated=(signed)=>{
    const continueBtn=document.getElementById('signupContinueBtn');if(continueBtn)continueBtn.disabled=!signed;
    if(signed){setStatus('signupStatus','Email verified. Add a passkey or Xaman wallet now, or continue.','ok');}
    else if(currentScreen==='signup'){setStatus('signupStatus','Verify your email to continue.');}
  };
  document.getElementById('landingLoginBtn')?.addEventListener('click',async()=>{
    setStatus('welcomeStatus','Opening your fingerprint, face, or device passkey…');
    if(authSession?.user){setStatus('welcomeStatus','Account already signed in.','ok');await window.atmOpenKnownAccountProfile?.();return;}
    await signInWithPasskey();
  });
  document.getElementById('landingSignupBtn')?.addEventListener('click',()=>{try{localStorage.setItem('atm_signup_pending','1');}catch(_e){}show('signup');});
  document.getElementById('landingGuestBtn')?.addEventListener('click',()=>{applyEntryMode('guest');show('profile');});
  document.getElementById('signupBackBtn')?.addEventListener('click',()=>show('welcome'));
  document.getElementById('characterBackBtn')?.addEventListener('click',()=>show('welcome'));
  document.getElementById('profileBackBtn')?.addEventListener('click',()=>show(entryMode==='guest'?'welcome':'character'));
  document.getElementById('signupContinueBtn')?.addEventListener('click',()=>{if(!authSession?.user){setStatus('signupStatus','Verify your email before continuing.','error');return;}try{localStorage.removeItem('atm_signup_pending');}catch(_e){}show('character');});
  document.getElementById('characterNextBtn')?.addEventListener('click',()=>{applyEntryMode('signed');show('profile');});
  document.querySelector('.characterPicker')?.addEventListener('click',()=>setTimeout(updateCharacterSummary,0));
  document.getElementById('profileCharacterPicker')?.addEventListener('click',event=>{
    const button=event.target.closest('.profileCharacterChoice');if(!button||entryMode==='guest')return;
    if(selectCharacter(button.dataset.profileCharacter)!==false)updateCharacterSummary();
  });
  window.atmFlowAuthUpdated(!!authSession?.user);
  let signupPending=false;try{signupPending=localStorage.getItem('atm_signup_pending')==='1';}catch(_error){}
  const xamanPending=!!readPendingXamanLink()||new URLSearchParams(location.search).get('xaman_return')==='1';
  if(xamanPending){show('signup');setTimeout(resumePendingXamanLink,250);}
  else{
    show('welcome');
    // Return verified signup users to the signup page after opening the email link.
    setTimeout(()=>{if(signupPending&&authSession?.user)show('signup');},900);
  }
})();



// v235.11 Attribute Store foundation builds on the v235.10 entitlement pass.
// The Locker is owned-only; unowned character attributes belong in the Store.
// v235.10 Locker commerce foundation. The linked wallet is the source of truth
// for You Are ATM collection entitlements; non-starter cosmetics are store-locked
// unless a matching collection attribute is verified. Checkout comes after the
// entitlement pass is tested against real holder wallets.
const ATM_LOCKER_FOUND_KEY='atm_locker_found_items_v1';
const ATM_LOCKER_LOADOUT_KEY='atm_locker_loadout_v1';
const ATM_LOCKER_SAVED_CHARACTERS_KEY='atm_locker_saved_characters_v1';
const ATM_TRADE_BEACON_KEY='atm_trade_beacon_v1';

const ATM_YOU_ARE_ATM_COLLECTION=Object.freeze({
  name:'You Are ATM',
  issuer:'rsQJqZ7gbHR8hAfWP2fSzY2Zbg6akcMd2H',
  taxon:1
});
// Explicit trait aliases only. These intentionally avoid fuzzy cross-category
// matching so an unrelated NFT trait cannot unlock the wrong in-game asset.
const ATM_YOU_ARE_ATM_TRAIT_RULES=Object.freeze({
  'head:baby-blue-headphones':{traitTypes:['Head'],values:['Baby Blue Headphones']},
  'head:banana-headphones':{traitTypes:['Head'],values:['Banana Headphones']},
  'head:blue-mohawk':{traitTypes:['Head'],values:['Blue Mohawk','Teal Blue Mohawk']},
  'head:bullish-black':{traitTypes:['Head'],values:['Bullish Black','Bullish Black Horns','Black Horns']},
  'head:buuvva-headphones':{traitTypes:['Head'],values:['Buuvva Headphones']},
  'head:green-headphones':{traitTypes:['Head'],values:['Green Headphones']},
  'head:orange-green-mohawk':{traitTypes:['Head'],values:['Orange Green Mohawk']},
  'head:paper-hat':{traitTypes:['Head'],values:['Paper Hat']},
  'head:pink-mohawk':{traitTypes:['Head'],values:['Pink Mohawk']},
  'head:red-headphones':{traitTypes:['Head'],values:['Red Headphones']},
  'back:green-katana':{traitTypes:['Katana'],values:['Green','Green Katana']},
  'back:white-katana':{traitTypes:['Katana'],values:['White','White Katana']},
  'back:yellow-katana':{traitTypes:['Katana'],values:['Yellow','Yellow Katana']},
  'equipment:jetpack':{traitTypes:['Back'],values:['Jetpack','Jet Pack']},
  'face:gold':{traitTypes:['Face'],values:['Gold','Gold Face']},
  // Confirmed collection aliases that already line up with current ATM Town art.
  'backpack:blue-green':{traitTypes:['Back'],values:['Blue Green Backpack','Blue & Green Backpack']},
  'backpack:blue-yellow':{traitTypes:['Back'],values:['Blue Yellow Backpack','Blue & Yellow Backpack']},
  'backpack:bright-orange':{traitTypes:['Back'],values:['Bright Orange Backpack']},
  'backpack:gold-purple':{traitTypes:['Back'],values:['Gold Purple Backpack','Gold & Purple Backpack','Yellow Purple Backpack']},
  'backpack:green':{traitTypes:['Back'],values:['Green Backpack']},
  'backpack:pink-teal':{traitTypes:['Back'],values:['Pink Teal Backpack','Pink & Teal Backpack']},
  'backpack:rucksack':{traitTypes:['Back'],values:['Rucksack']},
  'backpack:teal':{traitTypes:['Back'],values:['Teal Backpack']},
  'backpack:yellow-pink':{traitTypes:['Back'],values:['Yellow Pink Backpack','Yellow & Pink Backpack']},
  'face:black-dead-face':{traitTypes:['Face'],values:['Dead Emote Black','Black Dead Face']},
  'face:white-dead-face':{traitTypes:['Face'],values:['Dead Emote White','White Dead Face']},
  'face:squint-face-black':{traitTypes:['Face'],values:['Squint Emote Black','Black Squint Face']},
  'face:squint-face-white':{traitTypes:['Face'],values:['Squint Emote White','White Squint Face']},
  'gloves:boxing-gloves':{traitTypes:['Hand'],values:['Boxing Gloves']},
  'chest:baby-blue':{traitTypes:['Clothing'],values:['Baby Blue']},
  'chest:gold':{traitTypes:['Clothing'],values:['Gold']},
  'body:red':{traitTypes:['ATM'],values:['Red']}
});
function atmYouAreAtmMapping(itemId){
  const rule=ATM_YOU_ARE_ATM_TRAIT_RULES[itemId];if(!rule)return null;
  return Object.freeze({issuer:ATM_YOU_ARE_ATM_COLLECTION.issuer,taxon:ATM_YOU_ARE_ATM_COLLECTION.taxon,attributes:Object.freeze([Object.freeze({traitTypes:Object.freeze(rule.traitTypes.slice()),values:Object.freeze(rule.values.slice())})])});
}
function atmMonetizeCatalogItem(rawItem){
  const item={...rawItem};
  if(item.type!=='equipment')return Object.freeze(item);
  const mapping=atmYouAreAtmMapping(item.id);
  if(item.id==='equipment:jetpack')return Object.freeze({...item,rarity:'You Are ATM / Vending',ownership:'session',xrpl:mapping||item.xrpl||null,description:'Permanent when your verified You Are ATM NFT has Back: Jetpack. Otherwise temporary vending time still works.'});
  if(item.ownership==='development')return Object.freeze({...item,rarity:mapping?'You Are ATM / Store':'Store',ownership:'store',xrpl:mapping||null});
  return Object.freeze({...item,xrpl:item.xrpl||mapping||null});
}

const ATM_LOCKER_SLOTS=Object.freeze([
  {id:'body',label:'BODY',icon:'🦺'},
  {id:'chest',label:'CHEST',icon:'🖥️'},
  {id:'face',label:'FACE',icon:'🙂'},
  {id:'head',label:'HEAD',icon:'🎩'},
  {id:'back',label:'BACKPACK',icon:'🎒'},
  {id:'katana',label:'KATANA',icon:'⚔️'},
  {id:'hands',label:'GLOVES',icon:'🥊'},
  {id:'feet',label:'SHOES',icon:'🥾'},
  {id:'aura',label:'AURA',icon:'✨'}
]);
const ATM_ITEM_CATALOG=Object.freeze([
  {id:'character:classic',name:'ATM',type:'character',slot:'base',characterId:'classic',rarity:'Starter',ownership:'starter',emoji:'🟩',xrpl:null},
  {id:'character:fuzzy',name:'Fuzzy',type:'character',slot:'base',characterId:'fuzzy',rarity:'Starter',ownership:'starter',emoji:'🐻',xrpl:null},
  {id:'character:miracle',name:'Miracle',type:'character',slot:'base',characterId:'miracle',rarity:'Starter',ownership:'starter',emoji:'😇',xrpl:null},
  {id:'character:luci',name:'Luci',type:'character',slot:'base',characterId:'luci',rarity:'Starter',ownership:'starter',emoji:'😈',xrpl:null},
  {id:'character:triskeleton',name:'Triskeleton',type:'character',slot:'base',characterId:'triskeleton',rarity:'Starter',ownership:'starter',emoji:'💀',xrpl:null},
  {id:'character:phnix',name:'Phnix',type:'character',slot:'base',characterId:'phnix',rarity:'Starter',ownership:'starter',emoji:'🔥',xrpl:null},
  {id:'character:bear',name:'Bear',type:'character',slot:'base',characterId:'bear',rarity:'Starter',ownership:'starter',emoji:'🐻',xrpl:null},
  {id:'character:xoge',name:'Xoge',type:'character',slot:'base',characterId:'xoge',rarity:'Starter',ownership:'starter',emoji:'🦊',xrpl:null},
  {id:'character:flippy',name:'Flippy',type:'character',slot:'base',characterId:'flippy',rarity:'Starter',ownership:'starter',emoji:'🔌',xrpl:null},
  {id:'character:salute',name:'Salute',type:'character',slot:'base',characterId:'salute',rarity:'Starter',ownership:'starter',emoji:'🫡',xrpl:null},
  {id:'character:brad',name:'Brad',type:'character',slot:'base',characterId:'brad',rarity:'Starter',ownership:'starter',emoji:'🧢',xrpl:null},
  {id:'character:david',name:'David',type:'character',slot:'base',characterId:'david',rarity:'Starter',ownership:'starter',emoji:'🧠',xrpl:null},
  {id:'character:kaj',name:'Kaj',type:'character',slot:'base',characterId:'kaj',rarity:'Starter',ownership:'starter',emoji:'⚡',xrpl:null},
  {id:'character:daniel',name:'Daniel',type:'character',slot:'base',characterId:'daniel',rarity:'Starter',ownership:'starter',emoji:'🕶️',xrpl:null},
  {id:'character:army',name:'ARMY',type:'character',slot:'base',characterId:'army',rarity:'Starter',ownership:'starter',emoji:'🛡️',xrpl:null},
  {id:'body:astronaut',name:'Astronaut Body',type:'equipment',slot:'body',rarity:'Low Gravity',ownership:'development',emoji:'🧑‍🚀',xrpl:null,description:'Passive: 4× normal jump height with a slow low-gravity rise and fall. Bounce stacks to 8× height while preserving the astronaut low-gravity arc and momentum.',compatibleCharacterIds:['classic']},
  {id:'body:black',name:'Black Body',type:'equipment',slot:'body',rarity:'Development',ownership:'development',emoji:'⬛',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'body:cyber-blue',name:'Cyber Blue Body',type:'equipment',slot:'body',rarity:'Development',ownership:'development',emoji:'🔵',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'body:cyber-orange',name:'Cyber Orange Body',type:'equipment',slot:'body',rarity:'Development',ownership:'development',emoji:'🟠',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'body:cyber-pink',name:'Cyber Pink Body',type:'equipment',slot:'body',rarity:'Development',ownership:'development',emoji:'🩷',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'body:cyber-purple',name:'Cyber Purple Body',type:'equipment',slot:'body',rarity:'Development',ownership:'development',emoji:'🟣',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'body:gold',name:'Gold Body',type:'equipment',slot:'body',rarity:'Development',ownership:'development',emoji:'🟡',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'body:green',name:'Green Body',type:'equipment',slot:'body',rarity:'Development',ownership:'development',emoji:'🟢',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'body:navy-blue',name:'Navy Blue Body',type:'equipment',slot:'body',rarity:'Development',ownership:'development',emoji:'🔷',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'body:red',name:'Red Body',type:'equipment',slot:'body',rarity:'Development',ownership:'development',emoji:'🔴',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'backpack:blue-green',name:'Blue & Green Backpack',type:'equipment',slot:'back',rarity:'Development',ownership:'development',emoji:'🎒',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'backpack:blue-yellow',name:'Blue & Yellow Backpack',type:'equipment',slot:'back',rarity:'Development',ownership:'development',emoji:'🎒',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'backpack:bright-orange',name:'Bright Orange Backpack',type:'equipment',slot:'back',rarity:'Development',ownership:'development',emoji:'🎒',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'backpack:gold-purple',name:'Gold & Purple Backpack',type:'equipment',slot:'back',rarity:'Development',ownership:'development',emoji:'🎒',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'backpack:green',name:'Green Backpack',type:'equipment',slot:'back',rarity:'Development',ownership:'development',emoji:'🎒',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'backpack:pink-teal',name:'Pink & Teal Backpack',type:'equipment',slot:'back',rarity:'Development',ownership:'development',emoji:'🎒',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'backpack:rucksack',name:'Rucksack',type:'equipment',slot:'back',rarity:'Development',ownership:'development',emoji:'🎒',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'backpack:teal',name:'Teal Backpack',type:'equipment',slot:'back',rarity:'Development',ownership:'development',emoji:'🎒',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'backpack:yellow-pink',name:'Yellow & Pink Backpack',type:'equipment',slot:'back',rarity:'Development',ownership:'development',emoji:'🎒',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'head:baby-blue-headphones',name:'Baby Blue Headphones',type:'equipment',slot:'head',rarity:'Development',ownership:'development',emoji:'🎩',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'head:banana-headphones',name:'Banana Headphones',type:'equipment',slot:'head',rarity:'Development',ownership:'development',emoji:'🎩',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'head:blue-mohawk',name:'Blue Mohawk',type:'equipment',slot:'head',rarity:'Development',ownership:'development',emoji:'🎩',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'head:bullish-black',name:'Bullish Black Horns',type:'equipment',slot:'head',rarity:'Development',ownership:'development',emoji:'🎩',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'head:buuvva-headphones',name:'Buuvva Headphones',type:'equipment',slot:'head',rarity:'Development',ownership:'development',emoji:'🎩',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'head:green-headphones',name:'Green Headphones',type:'equipment',slot:'head',rarity:'Development',ownership:'development',emoji:'🎩',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'back:green-katana',name:'Green Katana',type:'equipment',slot:'katana',rarity:'Development',ownership:'development',emoji:'⚔️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'head:orange-green-mohawk',name:'Orange Green Mohawk',type:'equipment',slot:'head',rarity:'Development',ownership:'development',emoji:'🎩',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'head:paper-hat',name:'Paper Hat',type:'equipment',slot:'head',rarity:'Development',ownership:'development',emoji:'🎩',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'head:pink-mohawk',name:'Pink Mohawk',type:'equipment',slot:'head',rarity:'Development',ownership:'development',emoji:'🎩',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'head:red-headphones',name:'Red Headphones',type:'equipment',slot:'head',rarity:'Development',ownership:'development',emoji:'🎩',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'back:white-katana',name:'White Katana',type:'equipment',slot:'katana',rarity:'Development',ownership:'development',emoji:'⚔️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'back:yellow-katana',name:'Yellow Katana',type:'equipment',slot:'katana',rarity:'Development',ownership:'development',emoji:'⚔️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'chest:baby-blue',name:'Baby Blue Chest',type:'equipment',slot:'chest',rarity:'Development',ownership:'development',emoji:'🖥️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'chest:blue',name:'Blue Chest',type:'equipment',slot:'chest',rarity:'Development',ownership:'development',emoji:'🖥️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'chest:gold',name:'Gold Chest',type:'equipment',slot:'chest',rarity:'Development',ownership:'development',emoji:'🖥️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'chest:green',name:'Green Chest',type:'equipment',slot:'chest',rarity:'Development',ownership:'development',emoji:'🖥️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'chest:og',name:'OG Chest',type:'equipment',slot:'chest',rarity:'Development',ownership:'development',emoji:'🖥️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'chest:pastel-blue',name:'Pastel Blue Chest',type:'equipment',slot:'chest',rarity:'Development',ownership:'development',emoji:'🖥️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'chest:pastel-red',name:'Pastel Red Chest',type:'equipment',slot:'chest',rarity:'Development',ownership:'development',emoji:'🖥️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'chest:red',name:'Red Chest',type:'equipment',slot:'chest',rarity:'Development',ownership:'development',emoji:'🖥️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'chest:yellow',name:'Yellow Chest',type:'equipment',slot:'chest',rarity:'Development',ownership:'development',emoji:'🖥️',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'face:black-dead-face',name:'Black Dead Face',type:'equipment',slot:'face',rarity:'Development',ownership:'development',emoji:'🙂',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'face:gold',name:'Gold Face',type:'equipment',slot:'face',rarity:'Development',ownership:'development',emoji:'🙂',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'face:og',name:'OG Face',type:'equipment',slot:'face',rarity:'Development',ownership:'development',emoji:'🙂',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'face:squint-face-black',name:'Black Squint Face',type:'equipment',slot:'face',rarity:'Development',ownership:'development',emoji:'🙂',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'face:squint-face-white',name:'White Squint Face',type:'equipment',slot:'face',rarity:'Development',ownership:'development',emoji:'🙂',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'face:white-dead-face',name:'White Dead Face',type:'equipment',slot:'face',rarity:'Development',ownership:'development',emoji:'🙂',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'gloves:baby-blue',name:'Baby Blue Gloves',type:'equipment',slot:'hands',rarity:'Development',ownership:'development',emoji:'🥊',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'gloves:blue',name:'Blue Gloves',type:'equipment',slot:'hands',rarity:'Development',ownership:'development',emoji:'🥊',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'gloves:boxing-gloves',name:'Boxing Gloves',type:'equipment',slot:'hands',rarity:'Development',ownership:'development',emoji:'🥊',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'gloves:green',name:'Green Gloves',type:'equipment',slot:'hands',rarity:'Development',ownership:'development',emoji:'🥊',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'gloves:orange',name:'Orange Gloves',type:'equipment',slot:'hands',rarity:'Development',ownership:'development',emoji:'🥊',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'gloves:purple',name:'Purple Gloves',type:'equipment',slot:'hands',rarity:'Development',ownership:'development',emoji:'🥊',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'gloves:tan',name:'Tan Gloves',type:'equipment',slot:'hands',rarity:'Development',ownership:'development',emoji:'🥊',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'gloves:yellow',name:'Yellow Gloves',type:'equipment',slot:'hands',rarity:'Development',ownership:'development',emoji:'🥊',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'shoes:baby-blue',name:'Baby Blue Shoes',type:'equipment',slot:'feet',rarity:'Development',ownership:'development',emoji:'🥾',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'shoes:gold',name:'Gold Shoes',type:'equipment',slot:'feet',rarity:'Development',ownership:'development',emoji:'🥾',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'shoes:green',name:'Green Shoes',type:'equipment',slot:'feet',rarity:'Development',ownership:'development',emoji:'🥾',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'shoes:red',name:'Red Shoes',type:'equipment',slot:'feet',rarity:'Development',ownership:'development',emoji:'🥾',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'shoes:tan',name:'Tan Shoes',type:'equipment',slot:'feet',rarity:'Development',ownership:'development',emoji:'🥾',xrpl:null,compatibleCharacterIds:['classic']},
  {id:'equipment:jetpack',name:'Jetpack Module',type:'equipment',slot:'back',rarity:'Session',ownership:'session',emoji:'🚀',xrpl:null,description:'Purchased from an ATM Town vending machine. Each purchase adds 30 seconds.'}
].map(atmMonetizeCatalogItem));
window.ATM_ITEM_CATALOG=ATM_ITEM_CATALOG;
window.ATM_YOU_ARE_ATM_COLLECTION=ATM_YOU_ARE_ATM_COLLECTION;

let lockerFoundItems=safeJsonParse(safeStorageGet(ATM_LOCKER_FOUND_KEY,'{}'),{});
let lockerLoadout=safeJsonParse(safeStorageGet(ATM_LOCKER_LOADOUT_KEY,'{}'),{});
if(typeof lockerLoadout.back==='string'&&lockerLoadout.back.startsWith('back:')){lockerLoadout.katana=lockerLoadout.back;delete lockerLoadout.back;safeStorageSet(ATM_LOCKER_LOADOUT_KEY,JSON.stringify(lockerLoadout));}
let lockerSavedCharacters=safeJsonParse(safeStorageGet(ATM_LOCKER_SAVED_CHARACTERS_KEY,'[]'),[]);
if(!Array.isArray(lockerSavedCharacters))lockerSavedCharacters=[];
let lockerActiveSavedCharacterId=null;
window.atmActiveLoadout={...lockerLoadout};
const lockerPurchasedItems=new Set();
let lockerState={open:false,tab:'character',slot:'body',filter:'my-characters',direction:'down',nfts:[],ledgerIndex:null,validated:false,status:'idle',error:'',selectedItemId:null,nftMetadata:new Map(),nftMetadataLoading:new Set(),nftBuyOffers:new Map(),nftOffersLoading:new Set(),nftSearch:'',nftSort:'serial-desc',selectedNftId:null,nftHydrationGeneration:0,truncated:false};
let lockerPreviewFrame=1;
let lockerNftRenderTimer=0;
let tradeBeaconState=safeJsonParse(safeStorageGet(ATM_TRADE_BEACON_KEY,'{}'),{});
if(!tradeBeaconState||typeof tradeBeaconState!=='object')tradeBeaconState={};
const tradeBeaconNodes=new Map();
let tradeNftViewedTarget=null;
function tradeBeaconModeLabel(mode){return mode==='open_to_trade'?'OPEN TO TRADE':'SHOWCASE';}
function tradeBeaconIsLocalActive(){return !!(tradeBeaconState.active&&tradeBeaconState.tokenId&&tradeBeaconState.wallet&&tradeBeaconState.wallet===lockerWalletAddress());}
function tradeBeaconSafeImageUrl(value){const raw=String(value||'').trim();if(!raw)return '';try{const url=new URL(raw,location.origin);if(url.protocol!=='https:'&&url.origin!==location.origin)return '';const host=url.hostname.toLowerCase();if(host==='localhost'||host.endsWith('.local')||/^127\./.test(host)||/^10\./.test(host)||/^192\.168\./.test(host)||/^169\.254\./.test(host))return '';return url.href;}catch(_e){return '';}}
function tradeBeaconImageCandidates(beacon){return [beacon?.imageUrl,...(Array.isArray(beacon?.imageCandidates)?beacon.imageCandidates:[])].map(tradeBeaconSafeImageUrl).filter((v,i,a)=>v&&a.indexOf(v)===i).slice(0,4);}
function tradeBeaconBuildFromNft(nft,mode){
  const meta=lockerNftMetadata(nft)||{};const candidates=[meta.image_url,...(Array.isArray(meta.image_candidates)?meta.image_candidates:[])].map(v=>String(v||'').trim()).filter((v,i,a)=>v&&a.indexOf(v)===i).slice(0,4);
  return {active:true,mode:mode==='open_to_trade'?'open_to_trade':'showcase',tokenId:lockerNftTokenId(nft),name:lockerNftDisplayName(nft),collection:String(meta.collection||''),imageUrl:candidates[0]||'',imageCandidates:candidates,issuer:String(nft?.Issuer||''),serial:lockerNftSerial(nft),wallet:lockerWalletAddress(),transferable:nft?.transferable!==false,ledgerIndex:lockerState.ledgerIndex||null,updatedAt:Date.now()};
}
function tradeBeaconBroadcastPayload(){
  if(!tradeBeaconIsLocalActive())return null;
  const b=tradeBeaconState;return {active:true,mode:b.mode,tokenId:b.tokenId,name:String(b.name||'XRPL NFT').slice(0,100),collection:String(b.collection||'').slice(0,100),imageUrl:String(b.imageUrl||'').slice(0,1200),imageCandidates:tradeBeaconImageCandidates(b),issuer:String(b.issuer||'').slice(0,80),serial:Number.isFinite(Number(b.serial))?Number(b.serial):null,wallet:String(b.wallet||'').slice(0,80),transferable:b.transferable!==false,ledgerIndex:b.ledgerIndex||null,updatedAt:b.updatedAt||Date.now()};
}
function tradeBeaconSave(){safeStorageSet(ATM_TRADE_BEACON_KEY,JSON.stringify(tradeBeaconState||{}));}
async function tradeBeaconSet(nft,mode){
  if(!nft||!lockerWalletAddress())return false;
  await lockerLoadNftMetadata(nft);
  tradeBeaconState=tradeBeaconBuildFromNft(nft,mode);tradeBeaconSave();lockerSetStatus((mode==='open_to_trade'?'Trade beacon active: ':'Showcase active: ')+tradeBeaconState.name+'.','ok');lockerRenderNftDetail();broadcastState(true);return true;
}
function tradeBeaconClear(message='Trade beacon cleared.'){
  tradeBeaconState={};tradeBeaconSave();lockerSetStatus(message,'ok');lockerRenderNftDetail();broadcastState(true);updateTradeBeaconWorldOverlays(performance.now());
}
function tradeBeaconValidateOwnership(){
  if(!tradeBeaconState?.active)return;
  const wallet=lockerWalletAddress();const owned=lockerState.nfts.some(nft=>lockerNftTokenId(nft)===String(tradeBeaconState.tokenId||'').toUpperCase());
  if(!wallet||tradeBeaconState.wallet!==wallet||!owned)tradeBeaconClear('Trade beacon cleared because that NFT is no longer verified in this linked wallet.');
}
function tradeBeaconSetImage(host,candidates,alt='XRPL NFT'){
  host.textContent='';const list=(candidates||[]).filter(Boolean);let index=0;
  const fallback=()=>{host.textContent='';const f=document.createElement('div');f.className='tradeBeaconFallback';f.textContent='◈';host.appendChild(f);};
  if(!list.length){fallback();return;}
  const img=document.createElement('img');img.alt=alt;img.referrerPolicy='no-referrer';img.loading='eager';img.decoding='async';img.src=list[0];img.addEventListener('error',()=>{index++;if(index<list.length)img.src=list[index];else fallback();});host.appendChild(img);
}
function tradeBeaconEnsureNode(key,beacon,ownerName,local=false){
  const layer=document.getElementById('tradeBeaconLayer');if(!layer)return null;let node=tradeBeaconNodes.get(key);
  if(!node){node=document.createElement('div');node.className='tradeBeaconWorld';node.innerHTML='<div class="tradeBeaconThumb"></div><div class="tradeBeaconLabel"></div><div class="tradeBeaconOwner"></div>';layer.appendChild(node);tradeBeaconNodes.set(key,node);}
  const signature=[beacon?.tokenId,beacon?.mode,beacon?.imageUrl,(beacon?.imageCandidates||[]).join('|'),ownerName].join('::');
  if(node.dataset.signature!==signature){node.dataset.signature=signature;node.classList.toggle('trade',beacon?.mode==='open_to_trade');tradeBeaconSetImage(node.querySelector('.tradeBeaconThumb'),tradeBeaconImageCandidates(beacon),beacon?.name||'XRPL NFT');node.querySelector('.tradeBeaconLabel').textContent=tradeBeaconModeLabel(beacon?.mode);node.querySelector('.tradeBeaconOwner').textContent=local?'YOU':String(ownerName||'PLAYER');}
  return node;
}
function tradeBeaconScreenPoint(x,y){
  const rect=canvas.getBoundingClientRect();const sx=rect.left+(x-cam.x)*zoom*(rect.width/Math.max(1,W));const sy=rect.top+(y-cam.y)*zoom*(rect.height/Math.max(1,H));return{x:sx,y:sy,rect};
}
function updateTradeBeaconWorldOverlays(t=performance.now()){
  // Anchor the DOM beacon to the same airborne Y used by drawPlayerSprite.
  // This keeps the NFT directly above jumping/jetpacking local and remote players
  // instead of leaving it behind at the character's ground coordinate.
  const activeKeys=new Set();const add=(key,x,y,lift,beacon,ownerName,local=false)=>{if(!beacon?.active||!beacon?.tokenId)return;const airborneLift=Math.max(0,Number(lift)||0);const point=tradeBeaconScreenPoint(x,y-airborneLift);const margin=85;if(point.x<point.rect.left-margin||point.x>point.rect.right+margin||point.y<point.rect.top-margin||point.y>point.rect.bottom+margin)return;const node=tradeBeaconEnsureNode(key,beacon,ownerName,local);if(!node)return;activeKeys.add(key);const bob=Math.sin((t+(local?0:key.length*83))*.004)*3;node.style.display='grid';node.style.left=Math.round(point.x)+'px';node.style.top=Math.round(point.y-Math.max(62,72*zoom)+bob)+'px';node.style.opacity='1';};
  if(tradeBeaconIsLocalActive())add('local',player.x,player.y,jumpLift(),tradeBeaconState,playerName||'You',true);
  const now=Date.now();for(const [id,p] of remotePlayers){if(p.map!==currentMap||now-(p.lastSeen||0)>12000||!p.tradeBeacon?.active)continue;add('remote:'+id,p.drawX??p.x,p.drawY??p.y,p.jump||0,p.tradeBeacon,p.name||'Player',false);}
  for(const [key,node] of tradeBeaconNodes){if(activeKeys.has(key))continue;node.remove();tradeBeaconNodes.delete(key);}
}
function nearestTradeBeaconRemote(maxDistance=105){
  const now=Date.now();let best=null,bestDistance=maxDistance;
  for(const [id,p] of remotePlayers){if(p.map!==currentMap||now-(p.lastSeen||0)>12000||!p.tradeBeacon?.active||!p.tradeBeacon?.tokenId)continue;const x=Number(p.drawX??p.x),y=Number(p.drawY??p.y);if(!Number.isFinite(x)||!Number.isFinite(y))continue;const d=Math.hypot(player.x-x,player.y-y);if(d<bestDistance){bestDistance=d;best={id:'trade-beacon:'+id,type:'player-nft-beacon',name:(p.name||'Player')+' · '+tradeBeaconModeLabel(p.tradeBeacon.mode),text:'View '+(p.name||'this player')+"'s displayed XRPL NFT.",remoteId:id,remotePlayer:p,beacon:p.tradeBeacon,x,y,radius:maxDistance};}}
  return best;
}
function tradeNftClose(){tradeNftViewedTarget=null;const panel=document.getElementById('tradeNftPanel');if(panel){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}dialogOpen=false;}
function tradeNftFact(label,value){const row=document.createElement('div');row.className='tradeNftFact';const k=document.createElement('span');k.textContent=label;const v=document.createElement('strong');v.textContent=String(value??'—')||'—';row.append(k,v);return row;}
const ATM_NFT_TRADE_PENDING_KEY='atm_nft_trade_pending_v233';
let nftTradePollTimer=null;
function savePendingNftTrade(value){try{localStorage.setItem(ATM_NFT_TRADE_PENDING_KEY,JSON.stringify(value||{}));}catch(_e){}}
function readPendingNftTrade(){try{return JSON.parse(localStorage.getItem(ATM_NFT_TRADE_PENDING_KEY)||'null');}catch(_e){return null;}}
function clearPendingNftTrade(){try{localStorage.removeItem(ATM_NFT_TRADE_PENDING_KEY);}catch(_e){}}
function tradeOfferSetStatus(message,tone=''){const node=document.getElementById('tradeOfferStatus');if(node){node.textContent=message||'';node.className='tradeOfferStatus'+(tone?' '+tone:'');}}
function broadcastNftOfferNotice(data){if(!realtimeChannel||!onlineMode)return;try{realtimeChannel.send({type:'broadcast',event:'nft_trade_offer',payload:{sellerWallet:String(data?.counterparty_wallet||''),tokenId:String(data?.token_id||''),offerIndex:String(data?.offer_index||''),amountXrp:Number(data?.amount_xrp||0),buyerName:playerName||'ATM Player',sentAt:Date.now()}});}catch(_e){}}
function pollNftTradePayload(payloadUuid){
  if(!/^[0-9a-f-]{36}$/i.test(String(payloadUuid||'')))return;if(nftTradePollTimer)clearTimeout(nftTradePollTimer);let attempts=0;
  const check=async()=>{if(document.hidden){nftTradePollTimer=setTimeout(check,1800);return;}attempts++;
    try{const data=await apiWithAuth('/api/xrpl-nft-trade?action=status&payload_uuid='+encodeURIComponent(payloadUuid));
      if(data.status==='open'){clearPendingNftTrade();nftTradePollTimer=null;tradeOfferSetStatus(`Offer confirmed on XRPL · ${data.amount_xrp} XRP.`,'ok');showXrplPaymentToast(`NFT offer confirmed · ${data.amount_xrp} XRP`,'success',9000);broadcastNftOfferNotice(data);return;}
      if(data.status==='accepted'){clearPendingNftTrade();nftTradePollTimer=null;showXrplPaymentToast('NFT trade completed on XRPL. Refreshing your collection…','success',9000);setTimeout(()=>lockerRefreshXrpl(false),900);return;}
      if(['failed','rejected','expired'].includes(data.status)){clearPendingNftTrade();nftTradePollTimer=null;const msg=data.error||`NFT offer ${data.status}.`;tradeOfferSetStatus(msg,'error');showXrplPaymentToast(msg,'error',9000);return;}
      tradeOfferSetStatus(data.phase==='validating'?'Signed · validating the exact XRPL transaction…':data.phase==='opened'?'Xaman opened · waiting for your signature…':'Waiting for Xaman…');
    }catch(error){tradeOfferSetStatus(error.message||'Could not check NFT offer.','error');}
    if(attempts<100)nftTradePollTimer=setTimeout(check,3000);
  };check();
}
async function startNftBuyOffer(target,amountXrp){
  const beacon=target?.beacon;if(!beacon)return;if(!authSession?.user){tradeOfferSetStatus('Sign in to make an NFT offer.','error');return;}if(!lockerWalletAddress()){tradeOfferSetStatus('Link and verify Xaman before making an offer.','error');return;}
  const amount=String(amountXrp||'').trim();if(!/^\d+(?:\.\d{1,6})?$/.test(amount)||Number(amount)<=0){tradeOfferSetStatus('Enter a valid XRP offer greater than zero.','error');return;}
  const submit=document.getElementById('tradeOfferSubmit');if(submit)submit.disabled=true;tradeOfferSetStatus('Creating XRPL buy offer…');
  try{const data=await apiWithAuth('/api/xrpl-nft-trade?action=start',{method:'POST',body:JSON.stringify({token_id:beacon.tokenId,seller_wallet:beacon.wallet,amount_xrp:amount})});savePendingNftTrade({payload_uuid:data.payload_uuid,action:'create_buy_offer',token_id:data.token_id,seller_wallet:data.seller_wallet,amount_xrp:data.amount_xrp,created_at:Date.now()});tradeOfferSetStatus('Opening Xaman. Review the NFT and XRP amount, sign, then return to this browser tab.');pollNftTradePayload(data.payload_uuid);window.location.assign(data.deeplink);}catch(error){tradeOfferSetStatus(error.message||'Could not create NFT offer.','error');if(submit)submit.disabled=false;}
}
async function startAcceptNftBuyOffer(nft,offer){
  if(!authSession?.user||!lockerWalletAddress()){lockerSetStatus('Link and verify Xaman before accepting NFT offers.','error');return;}
  const ok=confirm(`Accept ${offer.amount_xrp} XRP from ${offer.buyer_name||offer.buyer_wallet||'this buyer'} for ${lockerNftDisplayName(nft)}? This transfers the NFT if the XRPL transaction succeeds.`);if(!ok)return;
  lockerSetStatus('Creating Xaman acceptance request…');
  try{const data=await apiWithAuth('/api/xrpl-nft-trade?action=accept',{method:'POST',body:JSON.stringify({token_id:lockerNftTokenId(nft),offer_index:offer.offer_index})});savePendingNftTrade({payload_uuid:data.payload_uuid,action:'accept_buy_offer',token_id:data.token_id,offer_index:data.offer_index,amount_xrp:data.amount_xrp,created_at:Date.now()});lockerSetStatus('Opening Xaman. Review the NFT sale carefully before signing.','ok');pollNftTradePayload(data.payload_uuid);window.location.assign(data.deeplink);}catch(error){lockerSetStatus(error.message||'Could not accept NFT offer.','error');}
}
function resumePendingNftTrade(){const pending=readPendingNftTrade();if(!pending?.payload_uuid||!authSession?.access_token)return;if(Date.now()-Number(pending.created_at||0)>45*60*1000){clearPendingNftTrade();return;}pollNftTradePayload(pending.payload_uuid);}
window.addEventListener('focus',()=>setTimeout(resumePendingNftTrade,250));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(resumePendingNftTrade,250);});

function tradeNftOpen(target){
  const beacon=target?.beacon;if(!beacon)return;tradeNftViewedTarget=target;dialogOpen=true;joy.x=joy.y=0;knob.style.transform='translate(0,0)';const panel=document.getElementById('tradeNftPanel'),content=document.getElementById('tradeNftContent'),title=document.getElementById('tradeNftTitle');if(!panel||!content)return;panel.classList.add('open');panel.setAttribute('aria-hidden','false');if(title)title.textContent=beacon.name||'XRPL NFT';content.textContent='';
  const body=document.createElement('div');body.className='tradeNftBody';const art=document.createElement('div');art.className='tradeNftArt';tradeBeaconSetImage(art,tradeBeaconImageCandidates(beacon),beacon.name||'XRPL NFT');const info=document.createElement('div');info.className='tradeNftInfo';const mode=document.createElement('div');mode.className='tradeNftMode';mode.textContent=tradeBeaconModeLabel(beacon.mode);const h=document.createElement('h3');h.className='tradeNftName';h.textContent=beacon.name||'XRPL NFT';const owner=document.createElement('div');owner.className='tradeNftOwner';owner.textContent='Displayed by '+String(target.remotePlayer?.name||'Player')+(beacon.wallet?' · '+lockerShortWallet(beacon.wallet):'');const facts=document.createElement('div');facts.className='tradeNftFacts';facts.append(tradeNftFact('COLLECTION',beacon.collection||'—'),tradeNftFact('SERIAL',beacon.serial??'—'),tradeNftFact('ISSUER',beacon.issuer||'—'),tradeNftFact('TOKEN ID',beacon.tokenId||'—'));info.append(mode,h,owner,facts);body.append(art,info);content.appendChild(body);
  const actions=document.createElement('div');actions.className='tradeNftActions';
  const offer=document.createElement('button');offer.type='button';offer.textContent='MAKE XRP OFFER';offer.disabled=beacon.mode!=='open_to_trade';offer.title=offer.disabled?'This player is showcasing this NFT but is not currently open to trade.':'Create a real XRPL NFT buy offer signed with Xaman.';actions.appendChild(offer);
  const nftSwap=document.createElement('button');nftSwap.type='button';nftSwap.disabled=true;nftSwap.textContent='OFFER MY NFT';nftSwap.title='NFT-for-NFT negotiation is the next trading phase.';actions.appendChild(nftSwap);
  const composer=document.createElement('div');composer.className='tradeOfferComposer';composer.hidden=true;const label=document.createElement('label');label.textContent='YOUR XRP OFFER';const row=document.createElement('div');row.className='tradeOfferAmountRow';const input=document.createElement('input');input.id='tradeOfferAmount';input.type='number';input.min='0.000001';input.step='0.000001';input.inputMode='decimal';input.placeholder='25';const currency=document.createElement('span');currency.textContent='XRP';row.append(input,currency);label.appendChild(row);const submit=document.createElement('button');submit.type='button';submit.id='tradeOfferSubmit';submit.className='tradeOfferSubmit';submit.textContent='REVIEW & SIGN WITH XAMAN';const status=document.createElement('div');status.id='tradeOfferStatus';status.className='tradeOfferStatus';status.textContent='The offer is created on XRPL only after you approve it in Xaman.';composer.append(label,submit,status);actions.appendChild(composer);
  offer.addEventListener('click',()=>{composer.hidden=!composer.hidden;if(!composer.hidden)input.focus();});submit.addEventListener('click',()=>startNftBuyOffer(target,input.value));
  const note=document.createElement('div');note.className='tradeNftNote';note.textContent='ATM Town never receives either wallet secret. XRP buy offers and acceptance are native XRPL transactions reviewed in Xaman.';actions.appendChild(note);content.appendChild(actions);
}

async function lockerLoadBuyOffers(nft,force=false){const tokenId=lockerNftTokenId(nft);if(!tokenId||lockerState.nftOffersLoading.has(tokenId))return;if(!force&&lockerState.nftBuyOffers.has(tokenId))return;lockerState.nftOffersLoading.add(tokenId);lockerRenderNftDetail();try{const data=await apiWithAuth('/api/xrpl-nft-trade?action=offers&token_id='+encodeURIComponent(tokenId));lockerState.nftBuyOffers.set(tokenId,Array.isArray(data.offers)?data.offers:[]);lockerSetStatus(`${(data.offers||[]).length} active XRP buy offer${(data.offers||[]).length===1?'':'s'} found on XRPL.`,'ok');}catch(error){lockerSetStatus(error.message||'Could not load NFT buy offers.','error');}finally{lockerState.nftOffersLoading.delete(tokenId);lockerRenderNftDetail();}}

const ATM_LEADERBOARD_GAMES=Object.freeze({'sky-run':{label:'ATM Sky Run',metric:'FASTEST TIME'},'platform-panic':{label:'ATM Platform Panic',metric:'HIGHEST CLIMB'},'flappy-jetpack':{label:'ATM Flappy Jetpack',metric:'HIGH SCORE'},'ring-rumble':{label:'ATM Ring Rumble',metric:'ONLINE WINS'}});
const arcadeLeaderboardSessions=new Map();
const ATM_LEADERBOARD_PENDING_KEY='atm_leaderboard_pending_v2332';
let leaderboardRetryBusy=false;
function leaderboardCharacterPreview(id){if(id==='fuzzy')return 'assets/characters/thumbnails/character-fuzzy.webp';if(id==='miracle')return 'assets/characters/thumbnails/character-miracle.webp';if(id==='luci')return 'assets/characters/thumbnails/character-luci.webp';if(id==='triskeleton')return 'assets/characters/thumbnails/character-triskeleton.webp';return 'assets/characters/thumbnails/character-atm.webp';}
function leaderboardReadPending(){try{const parsed=JSON.parse(localStorage.getItem(ATM_LEADERBOARD_PENDING_KEY)||'[]');return Array.isArray(parsed)?parsed:[];}catch(_e){return [];}}
function leaderboardWritePending(rows){try{localStorage.setItem(ATM_LEADERBOARD_PENDING_KEY,JSON.stringify((Array.isArray(rows)?rows:[]).slice(-20)));}catch(_e){}}
function leaderboardUpsertPending(record){const rows=leaderboardReadPending().filter(row=>row?.session_id!==record.session_id);rows.push(record);leaderboardWritePending(rows);}
function leaderboardDropPending(sessionId){leaderboardWritePending(leaderboardReadPending().filter(row=>row?.session_id!==sessionId));}
function leaderboardStatusNode(gameId){const detailIds={'sky-run':'skyRunMessageDetail','platform-panic':'platformPanicMessageDetail','flappy-jetpack':'flappyJetpackMessageDetail','ring-rumble':'ringRumbleMessageDetail'};const detail=document.getElementById(detailIds[gameId]||'');if(!detail?.parentElement)return null;let node=detail.parentElement.querySelector(`[data-atm-leaderboard-save="${gameId}"]`);if(!node){node=document.createElement('div');node.dataset.atmLeaderboardSave=gameId;node.style.cssText='margin:8px auto 0;font:900 11px/1.25 system-ui;letter-spacing:.45px;text-align:center;min-height:14px';detail.insertAdjacentElement('afterend',node);}return node;}
function leaderboardSetSaveState(gameId,state,message=''){const node=leaderboardStatusNode(gameId);if(!node)return;const labels={idle:'',saving:'SAVING VERIFIED SCORE…',saved:'VERIFIED & SAVED ✓',pending:'CONNECTION ISSUE · SCORE QUEUED FOR RETRY',rejected:'SCORE NOT SAVED · RUN COULD NOT BE VERIFIED'};node.textContent=message||labels[state]||'';node.style.display=node.textContent?'block':'none';node.style.color=state==='saved'?'#7cf7bd':state==='rejected'?'#ff9b9b':'#ffd166';window.dispatchEvent(new CustomEvent('atm:leaderboard-status',{detail:{game_id:gameId,status:state,message:node.textContent}}));}
async function leaderboardApi(body){const token=authSession?.access_token;if(!token){const error=new Error('Sign in first.');error.status=401;throw error;}let response;try{response=await fetch('/api/leaderboards',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body)});}catch(error){error.network=true;throw error;}const data=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(data.error||'Leaderboard request failed.');error.status=response.status;error.payload=data;throw error;}return data;}
async function atmLeaderboardStart(gameId,metadata={}){leaderboardSetSaveState(gameId,'idle');if(!authSession?.access_token||!ATM_LEADERBOARD_GAMES[gameId])return null;const pending=leaderboardApi({action:'start',game_id:gameId,metadata}).then(data=>{arcadeLeaderboardSessions.set(gameId,data.session_id);return data.session_id;}).catch(error=>{console.warn('Leaderboard session start failed:',error);leaderboardSetSaveState(gameId,'rejected','LEADERBOARD SESSION DID NOT START · THIS RUN CANNOT BE VERIFIED');return null;});arcadeLeaderboardSessions.set(gameId,pending);return pending;}
async function leaderboardSubmitRecord(record,{retry=false}={}){if(!record?.session_id||!record?.game_id)return null;if(record.user_id&&authSession?.user?.id&&record.user_id!==authSession.user.id)return null;try{const data=await leaderboardApi({action:'submit',game_id:record.game_id,session_id:record.session_id,score_value:record.score_value,secondary_value:record.secondary_value,details:record.details||{}});leaderboardDropPending(record.session_id);if(arcadeLeaderboardSessions.get(record.game_id)===record.session_id)arcadeLeaderboardSessions.delete(record.game_id);leaderboardSetSaveState(record.game_id,'saved',data.idempotent?'VERIFIED & SAVED ✓ · RECOVERED AFTER RETRY':'VERIFIED & SAVED ✓');return data;}catch(error){console.warn(retry?'Leaderboard retry failed:':'Leaderboard submission failed:',error);if([400,409,422].includes(Number(error.status))){leaderboardDropPending(record.session_id);if(arcadeLeaderboardSessions.get(record.game_id)===record.session_id)arcadeLeaderboardSessions.delete(record.game_id);leaderboardSetSaveState(record.game_id,'rejected',error.message||'SCORE NOT SAVED · RUN COULD NOT BE VERIFIED');return null;}leaderboardUpsertPending({...record,attempts:Number(record.attempts||0)+1,last_attempt_at:Date.now()});leaderboardSetSaveState(record.game_id,'pending');return null;}}
async function atmLeaderboardSubmit(gameId,result={}){if(!authSession?.access_token)return null;let session=arcadeLeaderboardSessions.get(gameId);if(session&&typeof session.then==='function')session=await session;if(!session){leaderboardSetSaveState(gameId,'rejected','SCORE NOT SAVED · NO VERIFIED SERVER SESSION');return null;}const record={session_id:session,game_id:gameId,user_id:authSession?.user?.id||'',score_value:Math.round(Number(result.score_value)||0),secondary_value:Math.round(Number(result.secondary_value)||0),details:result.details||{},created_at:Date.now(),attempts:0};leaderboardUpsertPending(record);leaderboardSetSaveState(gameId,'saving');return leaderboardSubmitRecord(record);}
async function retryPendingLeaderboardScores(){if(leaderboardRetryBusy||document.hidden||!authSession?.access_token||navigator.onLine===false)return;const userId=authSession?.user?.id||'';const cutoff=Date.now()-70*60*1000;let rows=leaderboardReadPending();const stale=rows.filter(row=>Number(row?.created_at||0)<cutoff);if(stale.length){rows=rows.filter(row=>Number(row?.created_at||0)>=cutoff);leaderboardWritePending(rows);}const pending=rows.filter(row=>!row.user_id||row.user_id===userId).slice(0,3);if(!pending.length)return;leaderboardRetryBusy=true;try{for(const record of pending){if(navigator.onLine===false)break;await leaderboardSubmitRecord(record,{retry:true});}}finally{leaderboardRetryBusy=false;}}
window.addEventListener('online',()=>setTimeout(retryPendingLeaderboardScores,250));window.addEventListener('focus',()=>setTimeout(retryPendingLeaderboardScores,350));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(retryPendingLeaderboardScores,350);});setInterval(()=>{if(!document.hidden&&leaderboardReadPending().length)retryPendingLeaderboardScores();},15000);setTimeout(retryPendingLeaderboardScores,2500);
function arcadeLeaderboardClose(){const panel=document.getElementById('arcadeLeaderboardPanel');if(panel){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}}
async function arcadeLeaderboardOpen(gameId){const cfg=ATM_LEADERBOARD_GAMES[gameId];if(!cfg)return;const panel=document.getElementById('arcadeLeaderboardPanel'),title=document.getElementById('arcadeLeaderboardTitle'),metric=document.getElementById('arcadeLeaderboardMetric'),status=document.getElementById('arcadeLeaderboardStatus'),list=document.getElementById('arcadeLeaderboardList');if(!panel||!list)return;panel.classList.add('open');panel.setAttribute('aria-hidden','false');title.textContent=cfg.label+' · TOP 20';metric.textContent=cfg.metric+' · SESSION-VERIFIED';status.textContent='LOADING';list.innerHTML='<div class="arcadeLeaderboardEmpty">Loading verified scores…</div>';try{const response=await fetch('/api/leaderboards?game_id='+encodeURIComponent(gameId),{cache:'no-store'});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Leaderboard unavailable.');status.textContent=(data.entries?.length||0)+'/20';list.textContent='';if(!data.entries?.length){list.innerHTML='<div class="arcadeLeaderboardEmpty">No verified scores yet. Sign in and be the first player on the board.</div>';return;}for(const entry of data.entries){const row=document.createElement('div');row.className='arcadeLeaderboardRow';const rank=document.createElement('div');rank.className='arcadeLeaderboardRank';rank.textContent='#'+entry.rank;const avatar=document.createElement('img');avatar.className='arcadeLeaderboardAvatar';avatar.src=leaderboardCharacterPreview(entry.character);avatar.alt='';const player=document.createElement('div');player.className='arcadeLeaderboardPlayer';const name=document.createElement('strong');name.textContent=entry.player_name||'ATM Player';const wallet=document.createElement('small');wallet.textContent=entry.wallet||'NO WALLET LINKED';player.append(name,wallet);const score=document.createElement('div');score.className='arcadeLeaderboardScore';score.textContent=entry.score_display;row.append(rank,avatar,player,score);list.appendChild(row);}}catch(error){status.textContent='UNAVAILABLE';list.innerHTML='<div class="arcadeLeaderboardEmpty"></div>';list.firstChild.textContent=error.message||'Leaderboard unavailable.';}}
window.atmLeaderboardStart=atmLeaderboardStart;window.atmLeaderboardSubmit=atmLeaderboardSubmit;window.atmOpenLeaderboard=arcadeLeaderboardOpen;
document.querySelectorAll('.arcadeLeaderboardOpen').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();arcadeLeaderboardOpen(button.dataset.leaderboardGame);}));document.getElementById('arcadeLeaderboardClose')?.addEventListener('click',arcadeLeaderboardClose);document.getElementById('arcadeLeaderboardPanel')?.addEventListener('pointerdown',event=>{if(event.target.id==='arcadeLeaderboardPanel')arcadeLeaderboardClose();});

window.atmTradeBeacon=Object.freeze({get:()=>tradeBeaconBroadcastPayload(),clear:()=>tradeBeaconClear(),nearest:()=>nearestTradeBeaconRemote()});


function lockerSetStatus(message,tone=''){
  const node=document.getElementById('lockerStatus');if(!node)return;
  node.textContent=message||'';node.style.color=tone==='error'?'#ff9bbf':tone==='ok'?'#70f9c8':'#9fc3cc';
}
function lockerWalletAddress(){return String(playerAccount?.wallet_address||'');}
function lockerShortWallet(value){return value?shortWallet(value):'Not linked';}
function lockerDecodeHexUri(hex){
  if(!hex||typeof hex!=='string'||hex.length%2)return '';
  try{const bytes=new Uint8Array(hex.match(/.{1,2}/g).map(part=>parseInt(part,16)));return new TextDecoder().decode(bytes).replace(/\0/g,'');}catch(_e){return '';}
}
function lockerNormalizeTrait(value){return String(value??'').trim().toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function lockerIsYouAreAtmNft(nft){return String(nft?.Issuer||'')===ATM_YOU_ARE_ATM_COLLECTION.issuer&&Number(nft?.NFTokenTaxon)===ATM_YOU_ARE_ATM_COLLECTION.taxon;}
function lockerYouAreAtmNfts(){return lockerState.nfts.filter(lockerIsYouAreAtmNft);}
function lockerHasXrplMapping(item){
  const map=item?.xrpl;if(!map)return false;
  return !!(String(map.issuer||'').trim()||Number.isFinite(map.taxon)||(Array.isArray(map.tokenIds)&&map.tokenIds.length)||(Array.isArray(map.uriIncludes)&&map.uriIncludes.length)||(Array.isArray(map.attributes)&&map.attributes.length));
}
function lockerAttributeRuleMatches(rule,meta){
  const attributes=Array.isArray(meta?.attributes)?meta.attributes:[];
  const traitTypes=new Set((rule?.traitTypes||[]).map(lockerNormalizeTrait).filter(Boolean));
  const values=new Set((rule?.values||[]).map(lockerNormalizeTrait).filter(Boolean));
  if(!traitTypes.size||!values.size)return false;
  return attributes.some(attribute=>traitTypes.has(lockerNormalizeTrait(attribute?.trait_type))&&values.has(lockerNormalizeTrait(attribute?.value)));
}
function lockerNftMatches(item,nft){
  const map=item.xrpl||{};
  if(map.issuer&&String(nft.Issuer||'')!==String(map.issuer))return false;
  if(Number.isFinite(map.taxon)&&Number(nft.NFTokenTaxon)!==Number(map.taxon))return false;
  if(Array.isArray(map.tokenIds)&&map.tokenIds.length&&!map.tokenIds.includes(String(nft.NFTokenID||'')))return false;
  if(Array.isArray(map.uriIncludes)&&map.uriIncludes.length){
    const decoded=lockerDecodeHexUri(nft.URI||'').toLowerCase();
    if(!map.uriIncludes.some(value=>decoded.includes(String(value).toLowerCase())))return false;
  }
  if(Array.isArray(map.attributes)&&map.attributes.length){
    const meta=lockerNftMetadata(nft);if(!meta||meta.status!=='resolved')return false;
    if(!map.attributes.some(rule=>lockerAttributeRuleMatches(rule,meta)))return false;
  }
  return true;
}
function lockerXrplMappingPending(item){
  if(!lockerHasXrplMapping(item)||!Array.isArray(item?.xrpl?.attributes)||!item.xrpl.attributes.length)return false;
  return lockerState.nfts.some(nft=>{
    const map=item.xrpl||{};
    if(map.issuer&&String(nft?.Issuer||'')!==String(map.issuer))return false;
    if(Number.isFinite(map.taxon)&&Number(nft?.NFTokenTaxon)!==Number(map.taxon))return false;
    const tokenId=lockerNftTokenId(nft),meta=lockerNftMetadata(nft);
    return !meta||lockerState.nftMetadataLoading.has(tokenId);
  });
}
function lockerOwnershipInfo(item){
  if(item?.ownership==='saved')return {owned:true,quantity:1,label:'SAVED BUILD',source:'saved'};
  if(lockerHasXrplMapping(item)){
    const matches=lockerState.nfts.filter(nft=>lockerNftMatches(item,nft));
    if(matches.length)return {owned:true,quantity:matches.length,label:matches.length>1?'NFT OWNED ×'+matches.length:'NFT OWNED',source:'xrpl',matches};
  }
  if(lockerPurchasedItems.has(String(item?.id||'')))return {owned:true,quantity:1,label:'PURCHASED',source:'purchase'};
  if(item.ownership==='starter')return {owned:true,quantity:1,label:'STARTER',source:'starter'};
  if(item.ownership==='session'){
    const seconds=item.id==='equipment:jetpack'?Math.ceil(powerUps.jetpack):0;
    if(seconds>0)return {owned:true,quantity:seconds,label:formatPowerTime(seconds)+' LEFT',source:'session'};
  }
  if(lockerHasXrplMapping(item)&&lockerXrplMappingPending(item))return {owned:false,quantity:0,label:'VERIFYING NFT',source:'verifying'};
  if(item.ownership==='session')return {owned:false,quantity:0,label:lockerHasXrplMapping(item)?'VENDING / NFT':'NOT FOUND',source:'store'};
  if(item.ownership==='found'){
    const quantity=Math.max(0,Number(lockerFoundItems[item.id]||0));
    return {owned:quantity>0,quantity,label:quantity>0?'FOUND ×'+quantity:'NOT FOUND',source:'found'};
  }
  if(item.ownership==='store')return {owned:false,quantity:0,label:lockerHasXrplMapping(item)?'STORE / NFT':'STORE LOCKED',source:'store'};
  if(item.ownership==='development')return {owned:false,quantity:0,label:'STORE LOCKED',source:'store'};
  return {owned:false,quantity:0,label:'LOCKED',source:'unknown'};
}
function lockerItemForCharacter(characterId){return ATM_ITEM_CATALOG.find(item=>item.characterId===characterId)||null;}
function lockerCharacterName(characterId){return lockerItemForCharacter(characterId)?.name||characterId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function lockerRenderSavedBuildThumbnail(characterId,loadout={},direction='down'){
  try{
    const thumb=document.createElement('canvas');thumb.width=128;thumb.height=128;
    const tctx=thumb.getContext('2d');if(!tctx)return '';
    const cw=thumb.width,ch=thumb.height;tctx.imageSmoothingEnabled=false;
    const gradient=tctx.createLinearGradient(0,0,0,ch);gradient.addColorStop(0,'#0d2b38');gradient.addColorStop(1,'#041019');
    tctx.fillStyle=gradient;tctx.fillRect(0,0,cw,ch);
    tctx.strokeStyle='rgba(88,241,230,.08)';tctx.lineWidth=1;
    for(let x=0;x<cw;x+=20){tctx.beginPath();tctx.moveTo(x,0);tctx.lineTo(x,ch);tctx.stroke();}
    for(let y=0;y<ch;y+=20){tctx.beginPath();tctx.moveTo(0,y);tctx.lineTo(cw,y);tctx.stroke();}

    let config=CHARACTER_SHEETS[characterId],image=characterSheetImgs[characterId];
    const bodyItemId=loadout?.body;const bodySheet=bodyItemId&&ATM_EQUIPMENT_SHEETS[bodyItemId];const bodyImage=bodyItemId&&equipmentSheetImgs[bodyItemId];
    if(characterId==='classic'&&bodySheet&&bodyImage?.complete&&bodyImage.naturalWidth){config=bodySheet;image=bodyImage;}
    if(!config||!image?.complete||!image.naturalWidth)return '';

    const cols=config.cols||3,frameW=Math.floor(image.naturalWidth/cols),frameH=Math.floor(image.naturalHeight/(config.rows||4));
    const row=Math.max(0,(config.rowOrder||['down','left','up','right']).indexOf(direction));
    const frame=Math.max(0,Math.min(cols-1,1));
    const scale=Math.min(.96,(ch-18)/frameH,(cw-18)/frameW);
    const anchorX=Number.isFinite(config.anchorX)?config.anchorX:frameW/2,anchorY=Number.isFinite(config.anchorY)?config.anchorY:frameH-1;
    const footX=Math.round(cw/2),footY=ch-10,dx=Math.round(footX-anchorX*scale),dy=Math.round(footY-anchorY*scale),dw=Math.round(frameW*scale),dh=Math.round(frameH*scale);

    tctx.fillStyle='rgba(0,0,0,.32)';tctx.beginPath();tctx.ellipse(footX,footY+1,28,7,0,0,Math.PI*2);tctx.fill();
    tctx.drawImage(image,frame*frameW,row*frameH,frameW,frameH,dx,dy,dw,dh);

    const drawEquip=(slotId)=>{
      const itemId=loadout?.[slotId];if(!itemId||itemId==='equipment:jetpack')return;
      const ec=ATM_EQUIPMENT_SHEETS[itemId],ei=equipmentSheetImgs[itemId];
      if(!ec||!ei?.complete||!ei.naturalWidth)return;
      const ecols=ec.cols||3,efw=Math.floor(ei.naturalWidth/ecols),efh=Math.floor(ei.naturalHeight/(ec.rows||4));
      const erow=Math.max(0,(ec.rowOrder||['down','left','up','right']).indexOf(direction));
      const eframe=Math.max(0,Math.min(ecols-1,1));
      const eax=Number.isFinite(ec.anchorX)?ec.anchorX:efw/2,eay=Number.isFinite(ec.anchorY)?ec.anchorY:efh-1;
      const edx=Math.round(footX-eax*scale),edy=Math.round(footY-eay*scale),edw=Math.round(efw*scale),edh=Math.round(efh*scale);
      tctx.drawImage(ei,eframe*efw,erow*efh,efw,efh,edx,edy,edw,edh);
    };

    if(characterId==='classic'){
      drawEquip('back');
      drawEquip('katana');
      for(const slotId of ['chest','face','feet','head'])drawEquip(slotId);
      drawEquip('hands');
    }
    return thumb.toDataURL('image/webp',.9);
  }catch(_error){return '';}
}
function lockerItemPreview(item){
  if(item?.type==='saved-character'){
    const cached=item._previewCache||(item._previewCache=lockerRenderSavedBuildThumbnail(item.characterId,item.loadout,'down'));
    if(cached)return cached;
    if(item.preview)return item.preview;
    const bodyId=item.loadout?.body;const bodyPreview=bodyId&&ATM_EQUIPMENT_SHEETS[bodyId]?.preview;if(bodyPreview)return bodyPreview;
  }
  if(item.characterId){const img=document.querySelector(`.characterChoice[data-character="${item.characterId}"] img`);if(img?.src)return img.src;}
  const equipment=ATM_EQUIPMENT_SHEETS[item.id];if(equipment?.preview)return equipment.preview;
  return '';
}
function lockerPersistSavedCharacters(){safeStorageSet(ATM_LOCKER_SAVED_CHARACTERS_KEY,JSON.stringify(lockerSavedCharacters));}
function lockerCaptureBuildPreview(){
  const data=lockerRenderSavedBuildThumbnail(selectedCharacter,lockerLoadout,lockerState.direction);
  if(data)return data;
  const source=document.getElementById('lockerPreviewCanvas');if(!source||!source.width||!source.height)return '';
  try{
    const thumb=document.createElement('canvas');thumb.width=128;thumb.height=128;
    const tctx=thumb.getContext('2d');if(!tctx)return '';
    tctx.imageSmoothingEnabled=false;
    const scale=Math.min(thumb.width/source.width,thumb.height/source.height);
    const dw=Math.round(source.width*scale),dh=Math.round(source.height*scale),dx=Math.round((thumb.width-dw)/2),dy=Math.round((thumb.height-dh)/2);
    tctx.drawImage(source,0,0,source.width,source.height,dx,dy,dw,dh);
    return thumb.toDataURL('image/webp',.82);
  }catch(_error){return '';}
}
function lockerCurrentBuildName(){const active=lockerSavedCharacters.find(build=>build.id===lockerActiveSavedCharacterId);return active?.name||'';}
function lockerSaveCurrentCharacter(){
  const suggested=lockerCurrentBuildName()||`My ATM ${lockerSavedCharacters.length+1}`;
  const entered=window.prompt('Name this character build:',suggested);if(entered===null)return;
  const name=String(entered).trim().slice(0,32)||suggested;
  const build={id:'saved:'+Date.now(),name,type:'saved-character',slot:'base',ownership:'saved',rarity:'Saved Build',characterId:selectedCharacter,loadout:{...lockerLoadout,base:lockerItemForCharacter(selectedCharacter)?.id||'character:classic'},preview:lockerCaptureBuildPreview(),savedAt:new Date().toISOString(),emoji:'💾'};
  lockerSavedCharacters.unshift(build);lockerPersistSavedCharacters();lockerActiveSavedCharacterId=build.id;lockerState.filter='my-characters';lockerSetStatus(name+' saved to My Characters. Asset ownership will still be checked whenever it is loaded.','ok');lockerRender();
}
function lockerApplySavedCharacter(build){
  if(!build||build.type!=='saved-character')return;
  const target=lockerCanSelectCharacter(build.characterId)?build.characterId:'classic';
  if(selectCharacter(target)===false)return;
  const next={base:lockerItemForCharacter(target)?.id||'character:classic'};
  for(const [slot,itemId] of Object.entries(build.loadout||{})){
    if(slot==='base')continue;
    const item=ATM_ITEM_CATALOG.find(entry=>entry.id===itemId);if(!item||!lockerOwnershipInfo(item).owned)continue;
    if(Array.isArray(item.compatibleCharacterIds)&&!item.compatibleCharacterIds.includes(target))continue;
    next[slot]=item.id;
  }
  lockerLoadout=next;lockerActiveSavedCharacterId=build.id;lockerSaveLoadout();lockerSetStatus(build.name+' loaded. Every equipped asset was rechecked against current ownership.','ok');lockerRender();broadcastState(true);
}
function lockerEquippedItem(slot){
  if(slot==='base')return lockerItemForCharacter(selectedCharacter);
  if(slot==='back'&&powerUps.jetpack>0)return ATM_ITEM_CATALOG.find(item=>item.id==='equipment:jetpack')||null;
  const id=lockerLoadout[slot];return id?ATM_ITEM_CATALOG.find(item=>item.id===id)||null:null;
}
function lockerIsEquipped(item){if(item?.type==='saved-character')return lockerActiveSavedCharacterId===item.id;return lockerEquippedItem(item.slot)?.id===item.id;}
function lockerSaveLoadout(){window.atmActiveLoadout={...lockerLoadout};safeStorageSet(ATM_LOCKER_LOADOUT_KEY,JSON.stringify(lockerLoadout));}
function lockerEquipItem(item){
  const ownership=lockerOwnershipInfo(item);
  if(!ownership.owned){lockerSetStatus(item.name+' is locked. Link and refresh the owning XRPL wallet, or find the item in game.','error');return;}
  if(item.type==='saved-character'){lockerApplySavedCharacter(item);return;}
  lockerActiveSavedCharacterId=null;
  if(Array.isArray(item.compatibleCharacterIds)&&!item.compatibleCharacterIds.includes(selectedCharacter)){
    const target=item.compatibleCharacterIds[0]||'classic';selectCharacter(target);lockerLoadout.base=lockerItemForCharacter(target)?.id||'character:classic';
  }
  if(item.slot!=='base'&&lockerLoadout[item.slot]===item.id&&(item.id!=='equipment:jetpack'||ownership.source==='xrpl')){
    delete lockerLoadout[item.slot];lockerSaveLoadout();lockerState.selectedItemId=null;lockerSetStatus(item.name+' unequipped.','ok');lockerRender();broadcastState(true);return;
  }
  if(item.slot==='base'){
    if(selectCharacter(item.characterId)===false)return;lockerLoadout.base=item.id;
  }else if(item.id==='equipment:jetpack'){
    lockerLoadout.back=item.id;
    if(ownership.source==='xrpl')lockerSetStatus('Jetpack equipped permanently from your verified You Are ATM NFT.','ok');
    else lockerSetStatus('Jetpack is equipped automatically while vending time remains.','ok');
  }else{
    lockerLoadout[item.slot]=item.id;
    if(item.id==='body:astronaut')lockerSetStatus('Astronaut Body equipped. Low gravity is active: 4× jump height, or 8× with Bounce while keeping the same slow astronaut rise, fall, and momentum profile.','ok');
    else if(item.slot==='back'&&powerUps.jetpack>0)lockerSetStatus(item.name+' saved. The active jetpack temporarily overrides the back slot.','ok');
    else lockerSetStatus(item.name+' equipped.','ok');
  }
  lockerSaveLoadout();lockerState.selectedItemId=item.id;lockerRender();broadcastState(true);
}
function lockerGrantFoundItem(itemId,quantity=1){
  const item=ATM_ITEM_CATALOG.find(entry=>entry.id===itemId);if(!item||item.ownership!=='found')return false;
  lockerFoundItems[itemId]=Math.max(0,Number(lockerFoundItems[itemId]||0)+Math.max(1,Math.floor(quantity)));
  safeStorageSet(ATM_LOCKER_FOUND_KEY,JSON.stringify(lockerFoundItems));lockerRender();return true;
}
function lockerRevokeFoundItem(itemId,quantity=1){
  if(!lockerFoundItems[itemId])return false;
  lockerFoundItems[itemId]=Math.max(0,Number(lockerFoundItems[itemId])-Math.max(1,Math.floor(quantity)));
  safeStorageSet(ATM_LOCKER_FOUND_KEY,JSON.stringify(lockerFoundItems));lockerRender();return true;
}
function lockerCanSelectCharacter(characterId){
  const item=lockerItemForCharacter(characterId);return !item||lockerOwnershipInfo(item).owned;
}
window.atmLockerCanSelectCharacter=lockerCanSelectCharacter;
window.atmLockerOpenForLockedCharacter=(characterId)=>{lockerOpen();lockerState.slot='body';lockerState.filter='my-characters';lockerState.selectedItemId=lockerItemForCharacter(characterId)?.id||null;lockerRender();lockerSetStatus(lockerCharacterName(characterId)+' is not owned by the linked wallet.','error');};
window.atmLockerCharacterChanged=(characterId)=>{lockerActiveSavedCharacterId=null;lockerLoadout.base=lockerItemForCharacter(characterId)?.id||'character:classic';lockerSaveLoadout();lockerRender();};
window.atmLockerInventoryChanged=()=>{if(lockerState.status==='ready'&&!lockerState.nftMetadataLoading.size)lockerEnforceEquipmentOwnership();if(lockerState.open)lockerRender();};
window.atmLockerAccountUpdated=()=>{lockerUpdateWalletBadge();if(lockerState.open&&lockerWalletAddress())lockerRefreshXrpl(true);else lockerRender();};
window.atmInventory=Object.freeze({catalog:ATM_ITEM_CATALOG,collection:ATM_YOU_ARE_ATM_COLLECTION,traitRules:ATM_YOU_ARE_ATM_TRAIT_RULES,open:()=>lockerOpen(),refreshXrpl:()=>lockerRefreshXrpl(false),entitlements:()=>ATM_ITEM_CATALOG.filter(item=>lockerOwnershipInfo(item).source==='xrpl').map(item=>item.id),grantFoundItem:lockerGrantFoundItem,revokeFoundItem:lockerRevokeFoundItem});
window.atmLockerOwns=(itemId)=>{const item=ATM_ITEM_CATALOG.find(entry=>entry.id===itemId);return !!item&&lockerOwnershipInfo(item).owned;};
window.atmLockerPermanentJetpackEquipped=()=>{const item=ATM_ITEM_CATALOG.find(entry=>entry.id==='equipment:jetpack');const source=item?lockerOwnershipInfo(item).source:'';return lockerLoadout.back==='equipment:jetpack'&&!!item&&(source==='xrpl'||source==='purchase');};

function lockerUpdateWalletBadge(){
  const node=document.getElementById('lockerWalletBadge');if(!node)return;
  const wallet=lockerWalletAddress();node.innerHTML=wallet?'Wallet: <strong title="'+wallet+'">'+lockerShortWallet(wallet)+'</strong>':'Wallet: <strong>Not linked</strong>';
}

function lockerNftTokenId(nft){return String(nft?.NFTokenID||'').toUpperCase();}
function lockerNftSerial(nft){return Number.isFinite(Number(nft?.nft_serial))?Number(nft.nft_serial):null;}
function lockerNftMetadata(nft){return lockerState.nftMetadata.get(lockerNftTokenId(nft))||null;}
function lockerNftDisplayName(nft){const meta=lockerNftMetadata(nft);const serial=lockerNftSerial(nft);return String(meta?.name||'').trim()||(serial!==null?'XRPL NFT #'+serial:'XRPL NFT');}
function lockerItemsUnlockedByNft(nft){return ATM_ITEM_CATALOG.filter(item=>lockerHasXrplMapping(item)&&lockerNftMatches(item,nft));}
function lockerNftShortToken(nft){const id=lockerNftTokenId(nft);return id.length>16?id.slice(0,8)+'…'+id.slice(-8):id||'Unknown token';}
function lockerNftShortIssuer(nft){const issuer=String(nft?.Issuer||'');return issuer?lockerShortWallet(issuer):'Unknown issuer';}
function lockerNftScheduleRender(){clearTimeout(lockerNftRenderTimer);lockerNftRenderTimer=setTimeout(()=>{lockerNftRenderTimer=0;if(lockerState.open)lockerRender();window.atmAttributeStoreRender?.();},90);}
function lockerNftImageNode(nft,detail=false){
  const host=document.createElement('div');host.className=detail?'lockerNftDetailArt':'lockerNftArt';
  const meta=lockerNftMetadata(nft);const candidates=[meta?.image_url,...(Array.isArray(meta?.image_candidates)?meta.image_candidates:[])].map(value=>String(value||'').trim()).filter((value,index,list)=>value&&list.indexOf(value)===index);let candidateIndex=0;
  const fallback=()=>{const current=host.querySelector('img');if(current)current.remove();if(!host.querySelector('.lockerNftFallback')){const node=document.createElement('div');node.className='lockerNftFallback';node.textContent='◈';host.insertBefore(node,host.firstChild);}};
  if(candidates.length){
    const image=document.createElement('img');image.alt=lockerNftDisplayName(nft);image.src=candidates[0];image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';image.addEventListener('error',()=>{candidateIndex++;if(candidateIndex<candidates.length){image.src=candidates[candidateIndex];return;}fallback();});host.appendChild(image);
  }else fallback();
  return host;
}
function lockerNftFiltered(){
  const query=String(lockerState.nftSearch||'').trim().toLowerCase();
  const list=lockerState.nfts.filter(nft=>{
    if(!query)return true;
    const meta=lockerNftMetadata(nft);const hay=[lockerNftDisplayName(nft),nft?.Issuer,nft?.NFTokenID,nft?.NFTokenTaxon,nft?.nft_serial,meta?.collection,nft?.uri].join(' ').toLowerCase();return hay.includes(query);
  });
  list.sort((a,b)=>{
    if(lockerState.nftSort==='serial-asc')return (lockerNftSerial(a)??Number.MAX_SAFE_INTEGER)-(lockerNftSerial(b)??Number.MAX_SAFE_INTEGER);
    if(lockerState.nftSort==='name')return lockerNftDisplayName(a).localeCompare(lockerNftDisplayName(b),undefined,{numeric:true,sensitivity:'base'});
    if(lockerState.nftSort==='issuer')return String(a?.Issuer||'').localeCompare(String(b?.Issuer||''))||(lockerNftSerial(b)??0)-(lockerNftSerial(a)??0);
    return (lockerNftSerial(b)??-1)-(lockerNftSerial(a)??-1);
  });
  return list;
}
function lockerNftSetSelected(nft){
  lockerState.selectedNftId=lockerNftTokenId(nft)||null;
  const detail=document.getElementById('lockerNftDetail');if(detail)detail.classList.add('open');
  lockerRenderNftCollection();
  if(nft)lockerLoadNftMetadata(nft);
}
function lockerNftSelected(){return lockerState.nfts.find(nft=>lockerNftTokenId(nft)===lockerState.selectedNftId)||null;}
function lockerNftFact(label,value){const row=document.createElement('div');row.className='lockerNftFact';const key=document.createElement('span');key.textContent=label;const val=document.createElement('strong');val.textContent=String(value??'—')||'—';row.append(key,val);return row;}
function lockerRenderNftDetail(){
  const host=document.getElementById('lockerNftDetailContent');if(!host)return;host.textContent='';
  const nft=lockerNftSelected();
  if(!nft){const empty=document.createElement('div');empty.className='lockerNftDetailPlaceholder';const strong=document.createElement('strong');strong.textContent='Select an NFT';const span=document.createElement('span');span.textContent='Tap any NFT in your XRPL collection to inspect its ledger data, artwork, metadata, and transfer flags.';empty.append(strong,span);host.appendChild(empty);return;}
  const meta=lockerNftMetadata(nft);const body=document.createElement('div');body.className='lockerNftDetailBody';body.appendChild(lockerNftImageNode(nft,true));
  const title=document.createElement('div');title.className='lockerNftDetailTitle';const h=document.createElement('h3');h.textContent=lockerNftDisplayName(nft);const sub=document.createElement('span');sub.textContent=(meta?.collection?meta.collection+' · ':'')+(lockerNftSerial(nft)!==null?'SERIAL #'+lockerNftSerial(nft):'ON-LEDGER NFT');title.append(h,sub);body.appendChild(title);
  const badges=document.createElement('div');badges.className='lockerNftBadges';
  const badge=(text,tone='')=>{const b=document.createElement('span');b.className='lockerNftBadge'+(tone?' '+tone:'');b.textContent=text;badges.appendChild(b);};
  badge(nft.transferable?'TRANSFERABLE':'TRANSFER RESTRICTED',nft.transferable?'good':'warn');if(nft.xrp_only)badge('XRP ONLY','warn');if(nft.mutable)badge('MUTABLE URI');if(nft.burnable)badge('BURNABLE');if(lockerIsYouAreAtmNft(nft)){badge('YOU ARE ATM · TAXON 1','good');const unlocks=lockerItemsUnlockedByNft(nft);if(unlocks.length)badge('UNLOCKS '+unlocks.length+' GAME ITEM'+(unlocks.length===1?'':'S'),'good');}badge(lockerState.validated?'VALIDATED LEDGER':'LEDGER READ');body.appendChild(badges);
  if(meta?.description){const description=document.createElement('div');description.className='lockerNftDescription';description.textContent=meta.description;body.appendChild(description);}
  if(meta?.status==='unavailable'&&meta?.error){const warning=document.createElement('div');warning.className='lockerNftDescription';warning.textContent='Artwork/metadata unavailable: '+meta.error;body.appendChild(warning);}
  if(meta?.status==='missing'){const warning=document.createElement('div');warning.className='lockerNftDescription';warning.textContent='No metadata URI is stored on this NFToken, so ATM Town has no on-ledger location to retrieve artwork from.';body.appendChild(warning);}
  const facts=document.createElement('div');facts.className='lockerNftFacts';facts.append(lockerNftFact('ISSUER',nft.Issuer||'—'),lockerNftFact('TAXON',nft.NFTokenTaxon??'—'),lockerNftFact('TOKEN ID',nft.NFTokenID||'—'),lockerNftFact('URI',nft.uri||lockerDecodeHexUri(nft.URI||'')||'No URI'));body.appendChild(facts);
  if(Array.isArray(meta?.attributes)&&meta.attributes.length){const traits=document.createElement('div');traits.className='lockerNftTraits';for(const trait of meta.attributes.slice(0,12)){const item=document.createElement('div');item.className='lockerNftTrait';const label=document.createElement('span');label.textContent=trait.trait_type||'TRAIT';const value=document.createElement('strong');value.textContent=trait.value||'—';item.append(label,value);traits.appendChild(item);}body.appendChild(traits);}
  if(lockerIsYouAreAtmNft(nft)&&meta?.status==='resolved'){const unlocks=lockerItemsUnlockedByNft(nft);const entitlement=document.createElement('div');entitlement.className='lockerNftDescription';entitlement.innerHTML=unlocks.length?'<strong>ATM TOWN UNLOCKS:</strong> '+unlocks.map(item=>item.name).join(' · '):'<strong>ATM TOWN UNLOCKS:</strong> No mapped in-game item yet for this NFT’s current traits.';body.appendChild(entitlement);}
  if(lockerState.nftMetadataLoading.has(lockerNftTokenId(nft))){const load=document.createElement('div');load.className='lockerNftLoadingBar';const i=document.createElement('i');load.appendChild(i);body.appendChild(load);}
  const tokenId=lockerNftTokenId(nft);const activeForThis=tradeBeaconIsLocalActive()&&tradeBeaconState.tokenId===tokenId;const beaconState=document.createElement('div');beaconState.className='lockerNftBeaconState'+(activeForThis&&tradeBeaconState.mode==='open_to_trade'?' trade':'');beaconState.innerHTML=activeForThis?'<strong>BEACON ACTIVE:</strong> '+tradeBeaconModeLabel(tradeBeaconState.mode)+' · visible above your player in multiplayer.':'Choose how this NFT should appear above your player.';body.appendChild(beaconState);
  const actions=document.createElement('div');actions.className='lockerNftFutureActions';
  const showcase=document.createElement('button');showcase.type='button';showcase.className='tradeBeaconAction'+(activeForThis&&tradeBeaconState.mode==='showcase'?' active':'');showcase.textContent=activeForThis&&tradeBeaconState.mode==='showcase'?'SHOWCASING':'SHOWCASE';showcase.title='Display this NFT above your character.';showcase.addEventListener('click',()=>tradeBeaconSet(nft,'showcase'));actions.appendChild(showcase);
  const trade=document.createElement('button');trade.type='button';trade.className='tradeBeaconAction'+(activeForThis&&tradeBeaconState.mode==='open_to_trade'?' active':'');trade.textContent=activeForThis&&tradeBeaconState.mode==='open_to_trade'?'OPEN TO TRADE ✓':'OPEN TO TRADE';trade.title='Display this NFT above your character and invite other players to inspect it.';trade.addEventListener('click',()=>tradeBeaconSet(nft,'open_to_trade'));actions.appendChild(trade);
  if(tradeBeaconIsLocalActive()){const clear=document.createElement('button');clear.type='button';clear.className='tradeBeaconClear';clear.textContent=activeForThis?'CLEAR BEACON':'CLEAR CURRENT';clear.title=activeForThis?'Remove this NFT from above your player.':'Remove the currently active Trade Beacon.';clear.addEventListener('click',()=>tradeBeaconClear());actions.appendChild(clear);}else{const sell=document.createElement('button');sell.type='button';sell.disabled=true;sell.textContent='SELL';sell.title='Public sell listings are the next marketplace phase.';actions.appendChild(sell);}const offersButton=document.createElement('button');offersButton.type='button';offersButton.className='tradeBeaconAction';offersButton.textContent=lockerState.nftOffersLoading.has(tokenId)?'LOADING OFFERS…':lockerState.nftBuyOffers.has(tokenId)?'REFRESH BUY OFFERS':'BUY OFFERS';offersButton.disabled=lockerState.nftOffersLoading.has(tokenId)||!nft.transferable;offersButton.addEventListener('click',()=>lockerLoadBuyOffers(nft,true));actions.appendChild(offersButton);body.appendChild(actions);
  if(lockerState.nftBuyOffers.has(tokenId)||lockerState.nftOffersLoading.has(tokenId)){const offersBox=document.createElement('div');offersBox.className='lockerNftOffers';const oh=document.createElement('div');oh.className='lockerNftOffersHeader';const os=document.createElement('strong');os.textContent='XRPL BUY OFFERS';const oc=document.createElement('span');const offerRows=lockerState.nftBuyOffers.get(tokenId)||[];oc.textContent=lockerState.nftOffersLoading.has(tokenId)?'CHECKING LEDGER':offerRows.length+' ACTIVE';oh.append(os,oc);offersBox.appendChild(oh);if(lockerState.nftOffersLoading.has(tokenId)){const empty=document.createElement('div');empty.className='lockerNftOffersEmpty';empty.textContent='Reading active buy offers from the validated XRP Ledger…';offersBox.appendChild(empty);}else if(!offerRows.length){const empty=document.createElement('div');empty.className='lockerNftOffersEmpty';empty.textContent='No active XRP buy offers were found for this NFT.';offersBox.appendChild(empty);}else for(const offer of offerRows){const row=document.createElement('div');row.className='lockerNftOfferRow';const copy=document.createElement('div');const amount=document.createElement('strong');amount.textContent=offer.amount_xrp+' XRP';const who=document.createElement('small');who.textContent=(offer.buyer_name||'XRPL buyer')+' · '+(offer.buyer_wallet||'wallet');copy.append(amount,who);const accept=document.createElement('button');accept.type='button';accept.className='lockerNftOfferAccept';accept.textContent='ACCEPT';accept.addEventListener('click',()=>startAcceptNftBuyOffer(nft,offer));row.append(copy,accept);offersBox.appendChild(row);}body.appendChild(offersBox);}
  const note=document.createElement('div');note.className='lockerNftFutureNote';note.textContent='v233 supports real XRP buy offers and owner acceptance through Xaman. Public SELL listings and NFT-for-NFT negotiation come next.';body.appendChild(note);host.appendChild(body);
}
function lockerRenderNftGrid(){
  const grid=document.getElementById('lockerNftGrid'),empty=document.getElementById('lockerNftEmpty'),count=document.getElementById('lockerNftGridCount'),metaStatus=document.getElementById('lockerNftMetadataStatus');if(!grid||!empty)return;grid.textContent='';
  const list=lockerNftFiltered();if(count)count.textContent=list.length+' NFT'+(list.length===1?'':'s')+(list.length!==lockerState.nfts.length?' shown':'');
  const resolved=lockerState.nfts.filter(nft=>{const meta=lockerNftMetadata(nft);return meta&&['resolved','direct-image'].includes(meta.status);}).length;const missing=lockerState.nfts.filter(nft=>lockerNftMetadata(nft)?.status==='missing').length;const loading=lockerState.nftMetadataLoading.size;const unavailable=Math.max(0,lockerState.nfts.length-resolved-loading-missing);if(metaStatus)metaStatus.textContent=loading?`Loading artwork · ${resolved}/${lockerState.nfts.length}`:(lockerState.nfts.length?`Artwork ready · ${resolved}/${lockerState.nfts.length}${unavailable?` · ${unavailable} unavailable`:''}${missing?` · ${missing} no URI`:''}`:'Read-only XRPL collection');
  const emptyText=document.getElementById('lockerNftEmptyText');
  if(!list.length){grid.style.display='none';empty.classList.add('visible');if(emptyText)emptyText.textContent=lockerState.nfts.length?'No NFTs match your search.':lockerWalletAddress()?'No NFTs were returned for this linked wallet.':'Link a verified Xaman wallet or refresh XRPL to load your collection.';return;}grid.style.display='grid';empty.classList.remove('visible');
  for(const nft of list){
    const tokenId=lockerNftTokenId(nft);const meta=lockerNftMetadata(nft);const button=document.createElement('button');button.type='button';button.className='lockerNftCard'+(tokenId===lockerState.selectedNftId?' selected':'');button.dataset.nftokenId=tokenId;button.appendChild(lockerNftImageNode(nft,false));
    const art=button.firstChild;const serial=document.createElement('span');serial.className='lockerNftSerial';serial.textContent=lockerNftSerial(nft)!==null?'#'+lockerNftSerial(nft):lockerNftShortToken(nft);art.appendChild(serial);const dot=document.createElement('i');const metaReady=meta&&['resolved','direct-image'].includes(meta.status);dot.className='lockerNftMetaState'+(lockerState.nftMetadataLoading.has(tokenId)?' loading':metaReady?' ready':'');dot.title=metaReady?'Metadata resolved':lockerState.nftMetadataLoading.has(tokenId)?'Loading metadata':meta?'Metadata unavailable':'Ledger data loaded';art.appendChild(dot);
    const name=document.createElement('span');name.className='lockerNftName';name.textContent=lockerNftDisplayName(nft);const sub=document.createElement('span');sub.className='lockerNftSub';sub.textContent=(meta?.collection?meta.collection+' · ':'')+lockerNftShortIssuer(nft);button.append(name,sub);button.addEventListener('click',()=>lockerNftSetSelected(nft));grid.appendChild(button);
  }
}
function lockerRenderNftCollection(){
  const wallet=document.getElementById('lockerNftWallet'),ledger=document.getElementById('lockerNftLedger');const address=lockerWalletAddress();if(wallet){wallet.textContent=address||'Not linked';wallet.title=address||'';}if(ledger){ledger.textContent=address?(lockerState.ledgerIndex?`${lockerState.validated?'Validated':'Ledger'} ${lockerState.ledgerIndex}${lockerState.truncated?' · collection truncated by safety cap':''}`:'Ready to read your XRPL collection.'):'Connect Xaman to load your on-ledger collection.';}
  const search=document.getElementById('lockerNftSearch'),sort=document.getElementById('lockerNftSort');if(search&&search.value!==lockerState.nftSearch)search.value=lockerState.nftSearch;if(sort&&sort.value!==lockerState.nftSort)sort.value=lockerState.nftSort;lockerRenderNftGrid();lockerRenderNftDetail();
}
async function lockerLoadNftMetadata(nft){
  const tokenId=lockerNftTokenId(nft);if(!tokenId||lockerState.nftMetadata.has(tokenId)||lockerState.nftMetadataLoading.has(tokenId))return;const uri=String(nft?.URI||'');
  if(!uri){lockerState.nftMetadata.set(tokenId,{status:'missing',name:'',description:'',image_url:'',attributes:[]});lockerNftScheduleRender();return;}
  lockerState.nftMetadataLoading.add(tokenId);lockerNftScheduleRender();
  try{const data=await apiWithAuth('/api/xrpl-nft-metadata',{method:'POST',body:JSON.stringify({nftoken_id:tokenId,uri})});lockerState.nftMetadata.set(tokenId,data||{status:'unavailable'});}catch(error){lockerState.nftMetadata.set(tokenId,{status:'unavailable',error:error?.message||'Metadata unavailable.',name:'',description:'',image_url:'',attributes:[]});}finally{lockerState.nftMetadataLoading.delete(tokenId);lockerNftScheduleRender();}
}
async function lockerHydrateNftMetadata(){
  const generation=++lockerState.nftHydrationGeneration;const queue=lockerState.nfts.filter(nft=>!lockerState.nftMetadata.has(lockerNftTokenId(nft))&&!lockerState.nftMetadataLoading.has(lockerNftTokenId(nft))).sort((a,b)=>Number(lockerIsYouAreAtmNft(b))-Number(lockerIsYouAreAtmNft(a)));let cursor=0;const workers=Math.min(4,queue.length);
  await Promise.all(Array.from({length:workers},async()=>{while(generation===lockerState.nftHydrationGeneration&&cursor<queue.length){const nft=queue[cursor++];await lockerLoadNftMetadata(nft);}}));
  if(generation===lockerState.nftHydrationGeneration){lockerEnforceEquipmentOwnership();if(lockerState.open)lockerRender();}
}
async function lockerRefreshXrpl(silent=false){
  const button=document.getElementById('lockerRefreshButton');
  if(!authSession?.user){lockerState.status='guest';lockerState.nfts=[];lockerState.selectedNftId=null;lockerEnforceEquipmentOwnership();lockerSetStatus('Sign in and link Xaman to verify XRPL NFT ownership.','error');lockerRender();return;}
  if(!lockerWalletAddress()){lockerState.status='unlinked';lockerState.nfts=[];lockerState.selectedNftId=null;lockerEnforceEquipmentOwnership();lockerSetStatus('Link a Xaman wallet from your account screen before refreshing XRPL ownership.','error');lockerRender();return;}
  if(lockerState.status==='loading')return;
  lockerState.status='loading';lockerState.error='';if(button)button.disabled=true;if(!silent){for(const [tokenId,meta] of lockerState.nftMetadata.entries())if(!meta||['unavailable','missing'].includes(meta.status))lockerState.nftMetadata.delete(tokenId);lockerSetStatus('Reading validated NFT ownership from the XRP Ledger…');}lockerRender();
  try{
    const data=await apiWithAuth('/api/xrpl-inventory',{method:'GET'});
    lockerState.nfts=Array.isArray(data.nfts)?data.nfts:[];
    lockerState.ledgerIndex=data.ledger_index??null;lockerState.validated=data.validated===true;lockerState.truncated=data.truncated===true;lockerState.status='ready';
    const ownedIds=new Set(lockerState.nfts.map(lockerNftTokenId));for(const key of lockerState.nftMetadata.keys())if(!ownedIds.has(key))lockerState.nftMetadata.delete(key);if(lockerState.selectedNftId&&!ownedIds.has(lockerState.selectedNftId))lockerState.selectedNftId=null;tradeBeaconValidateOwnership();
    const youAreAtmCount=lockerYouAreAtmNfts().length;lockerSetStatus(`${lockerState.nfts.length} NFT${lockerState.nfts.length===1?'':'s'} found · ${youAreAtmCount} You Are ATM${youAreAtmCount===1?'':' NFTs'} · ${lockerShortWallet(data.account||lockerWalletAddress())}${lockerState.ledgerIndex?' · ledger '+lockerState.ledgerIndex:''}${lockerState.truncated?' · safety limit reached':''}.`,'ok');
    lockerEnforceCharacterOwnership();lockerHydrateNftMetadata();
  }catch(error){
    lockerState.status='error';lockerState.error=error?.message||'XRPL inventory lookup failed.';lockerSetStatus(lockerState.error,'error');
  }finally{if(button)button.disabled=false;lockerRender();}
}
function lockerEnforceCharacterOwnership(){
  if(lockerCanSelectCharacter(selectedCharacter))return;
  selectCharacter('classic');lockerSetStatus('Your previous character is not owned by the linked wallet, so ATM was equipped.','error');
}
function lockerEnforceEquipmentOwnership(){
  let changed=false;const removed=[];
  for(const [slot,itemId] of Object.entries({...lockerLoadout})){
    if(slot==='base')continue;
    const item=ATM_ITEM_CATALOG.find(entry=>entry.id===itemId);if(!item)continue;
    if(lockerOwnershipInfo(item).owned)continue;
    // Temporary vending jetpack is only invalid after time reaches zero and no NFT entitlement remains.
    delete lockerLoadout[slot];changed=true;removed.push(item.name);
  }
  if(changed){lockerSaveLoadout();lockerActiveSavedCharacterId=null;broadcastState(true);}
  if(!canUseJetpack()&&jetpackState.active)endJetpack();
  if(removed.length)lockerSetStatus('Ownership refreshed. Locked equipment removed: '+removed.join(', ')+'.','error');
  return changed;
}
function lockerSyncEntryPicker(){
  document.querySelectorAll('.characterChoice[data-character]').forEach(button=>{
    const owned=lockerCanSelectCharacter(button.dataset.character);button.classList.toggle('locked',!owned);button.disabled=!owned;
  });
}
function lockerSlotName(slot){return ATM_LOCKER_SLOTS.find(entry=>entry.id===slot)?.label||slot.toUpperCase();}
function lockerSetTab(tab){lockerState.tab=tab;document.querySelectorAll('.lockerTab').forEach(node=>node.classList.toggle('active',node.dataset.lockerTab===tab));document.querySelectorAll('.lockerView').forEach(node=>node.classList.toggle('active',node.dataset.lockerView===tab));lockerRender();if(tab==='nfts'&&lockerState.nfts.length)lockerHydrateNftMetadata();}
function lockerCreateSlots(){
  const host=document.getElementById('lockerSlots');if(!host)return;host.textContent='';
  for(const slot of ATM_LOCKER_SLOTS){
    const item=lockerEquippedItem(slot.id);const button=document.createElement('button');button.type='button';button.className='lockerSlot'+(lockerState.slot===slot.id?' active':'');button.dataset.slot=slot.id;
    button.innerHTML=`<span class="lockerSlotLabel">${slot.label}</span><span class="lockerSlotValue">${item?item.name:'EMPTY'}</span><span class="lockerSlotIcon">${slot.icon}</span>`;
    button.addEventListener('click',()=>{lockerState.slot=slot.id;lockerState.filter=slot.id;lockerRender();});host.appendChild(button);
  }
}
function lockerCreateFilters(){
  const host=document.getElementById('lockerFilters');if(!host)return;host.textContent='';
  const filters=[['my-characters','MY CHARACTERS'],['body','BODY'],['chest','CHEST'],['face','FACE'],['head','HEAD'],['back','BACKPACK'],['katana','KATANA'],['hands','GLOVES'],['feet','SHOES'],['aura','AURA']];
  for(const [id,label] of filters){const button=document.createElement('button');button.type='button';button.className='lockerFilter'+(lockerState.filter===id?' active':'');button.textContent=label;button.addEventListener('click',()=>{lockerState.filter=id;if(id!=='my-characters')lockerState.slot=id;lockerRender();});host.appendChild(button);}
}
function lockerItemCompatibleWithCharacter(item,characterId=selectedCharacter){
  return !Array.isArray(item?.compatibleCharacterIds)||!item.compatibleCharacterIds.length||item.compatibleCharacterIds.includes(characterId);
}
function lockerVisibleItems(forInventory=false){
  // v235.11: the Locker is ownership, not a storefront. Never render unowned
  // cosmetics here; users browse those in the Attribute Store instead.
  if(forInventory)return ATM_ITEM_CATALOG.filter(item=>lockerOwnershipInfo(item).owned);
  if(lockerState.filter==='my-characters')return lockerSavedCharacters.slice();
  return ATM_ITEM_CATALOG.filter(item=>item.slot===lockerState.filter&&lockerOwnershipInfo(item).owned&&lockerItemCompatibleWithCharacter(item));
}
function lockerCreateItemCard(item){
  const info=lockerOwnershipInfo(item);const equipped=lockerIsEquipped(item);const button=document.createElement('button');button.type='button';button.className='lockerItemCard'+(equipped?' equipped':'')+(info.owned?'':' locked')+(info.source==='xrpl'?' nftOwned':'')+(info.source==='store'?' storeLocked':'');button.dataset.itemId=item.id;
  const preview=lockerItemPreview(item);const art=preview?`<img alt="${item.name}" src="${preview}">`:`<span class="lockerItemEmoji">${item.emoji||'◈'}</span>`;
  const itemMeta=item.type==='saved-character'?'MY CHARACTERS · SAVED BUILD':item.type==='character'?'MY CHARACTERS · PRESET':`${lockerSlotName(item.slot)} · ${item.rarity||item.type}`;
  button.innerHTML=`<span class="lockerItemBadge">${equipped?'EQUIPPED':info.label}</span><span class="lockerItemArt">${art}</span><span class="lockerItemName">${item.name}</span><span class="lockerItemMeta">${itemMeta}</span>`;
  button.addEventListener('click',()=>{lockerState.selectedItemId=item.id;if(info.owned)lockerEquipItem(item);else if(info.source==='verifying'){lockerSetStatus('Checking your You Are ATM NFT metadata for '+item.name+'…');lockerRender();}else if(info.source==='store'){lockerSetStatus(item.name+' is store-locked. A matching You Are ATM NFT unlocks it automatically when mapped; direct purchase checkout is the next commerce step.','error');lockerRender();}else{lockerSetStatus(item.name+' is locked. Ownership source: '+info.source.toUpperCase()+'.','error');lockerRender();}});return button;
}
function lockerOwnedEmptyNode(message='You do not own an attribute in this category yet.'){
  const empty=document.createElement('div');empty.className='lockerSourceNote';empty.innerHTML='<b>Owned assets only.</b><br>'+message;
  const cta=document.createElement('button');cta.type='button';cta.className='lockerStoreCta';cta.textContent='OPEN ATTRIBUTE STORE';cta.addEventListener('click',()=>window.atmOpenAttributeStore?.(selectedCharacter));empty.appendChild(cta);return empty;
}
function lockerRenderGrids(){
  const itemGrid=document.getElementById('lockerItemGrid');if(itemGrid){itemGrid.textContent='';if(lockerState.filter==='my-characters'&&!lockerSavedCharacters.length){const note=document.createElement('div');note.className='lockerSourceNote';note.innerHTML='<b>No custom characters saved yet.</b><br>Build a character with attributes you own, then tap SAVE BUILD beside the preview.';itemGrid.appendChild(note);}for(const item of lockerVisibleItems(false))itemGrid.appendChild(lockerCreateItemCard(item));if(!itemGrid.children.length)itemGrid.appendChild(lockerOwnedEmptyNode());}
  const inventoryGrid=document.getElementById('lockerInventoryGrid');if(inventoryGrid){inventoryGrid.textContent='';for(const item of lockerVisibleItems(true))inventoryGrid.appendChild(lockerCreateItemCard(item));if(!inventoryGrid.children.length)inventoryGrid.appendChild(lockerOwnedEmptyNode('Refresh XRPL ownership or visit the Attribute Store to shop.'));}
}
function lockerDrawPreview(){
  const canvas=document.getElementById('lockerPreviewCanvas');if(!canvas)return;
  const rect=canvas.getBoundingClientRect();const cw=Math.max(1,Math.round(rect.width)),ch=Math.max(1,Math.round(rect.height));
  const dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));const pixelW=Math.max(1,Math.round(cw*dpr)),pixelH=Math.max(1,Math.round(ch*dpr));
  if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH;}
  const pctx=canvas.getContext('2d');pctx.setTransform(dpr,0,0,dpr,0,0);pctx.clearRect(0,0,cw,ch);pctx.imageSmoothingEnabled=false;
  const gradient=pctx.createLinearGradient(0,0,0,ch);gradient.addColorStop(0,'#0d2b38');gradient.addColorStop(1,'#041019');pctx.fillStyle=gradient;pctx.fillRect(0,0,cw,ch);
  pctx.strokeStyle='rgba(88,241,230,.08)';pctx.lineWidth=1;for(let x=0;x<cw;x+=24){pctx.beginPath();pctx.moveTo(x,0);pctx.lineTo(x,ch);pctx.stroke()}for(let y=0;y<ch;y+=24){pctx.beginPath();pctx.moveTo(0,y);pctx.lineTo(cw,y);pctx.stroke()}
  const characterId=selectedCharacter;
  let config=CHARACTER_SHEETS[characterId],image=characterSheetImgs[characterId];
  const bodyItem=lockerEquippedItem('body');
  if(characterId==='classic'&&bodyItem&&ATM_EQUIPMENT_SHEETS[bodyItem.id]&&equipmentSheetImgs[bodyItem.id]?.complete&&equipmentSheetImgs[bodyItem.id].naturalWidth){config=ATM_EQUIPMENT_SHEETS[bodyItem.id];image=equipmentSheetImgs[bodyItem.id];}
  if(!config||!image?.complete||!image.naturalWidth){pctx.fillStyle='#9fc3cc';pctx.font='700 14px system-ui';pctx.textAlign='center';pctx.fillText('Loading character…',cw/2,ch/2);return;}
  const cols=config.cols||3,rows=config.rows||4,frameW=Math.floor(image.naturalWidth/cols),frameH=Math.floor(image.naturalHeight/rows);
  const row=Math.max(0,(config.rowOrder||['down','left','up','right']).indexOf(lockerState.direction));const frame=Math.max(0,Math.min(cols-1,lockerPreviewFrame));
  const scale=Math.min(1.05,(ch-55)/frameH,(cw-36)/frameW);const anchorX=Number.isFinite(config.anchorX)?config.anchorX:frameW/2,anchorY=Number.isFinite(config.anchorY)?config.anchorY:frameH-1;
  const footX=cw/2,footY=ch-25,dx=Math.round(footX-anchorX*scale),dy=Math.round(footY-anchorY*scale),dw=Math.round(frameW*scale),dh=Math.round(frameH*scale);
  pctx.fillStyle='rgba(0,0,0,.34)';pctx.beginPath();pctx.ellipse(footX,footY+2,44,10,0,0,Math.PI*2);pctx.fill();pctx.drawImage(image,frame*frameW,row*frameH,frameW,frameH,dx,dy,dw,dh);

  const drawPreviewEquipment=(item)=>{
    if(!item||item.id==='equipment:jetpack')return;
    const ec=ATM_EQUIPMENT_SHEETS[item.id],ei=equipmentSheetImgs[item.id];
    if(!ec||!ei?.complete||!ei.naturalWidth)return;
    const ecols=ec.cols||3,erows=ec.rows||4,efw=Math.floor(ei.naturalWidth/ecols),efh=Math.floor(ei.naturalHeight/erows);
    const erow=Math.max(0,(ec.rowOrder||['down','left','up','right']).indexOf(lockerState.direction));
    const eframe=Math.max(0,Math.min(ecols-1,lockerPreviewFrame));
    const es=Math.min(1.05,(ch-55)/efh,(cw-36)/efw),eax=Number.isFinite(ec.anchorX)?ec.anchorX:efw/2,eay=Number.isFinite(ec.anchorY)?ec.anchorY:efh-1;
    const edx=Math.round(footX-eax*es),edy=Math.round(footY-eay*es),edw=Math.round(efw*es),edh=Math.round(efh*es);
    pctx.drawImage(ei,eframe*efw,erow*efh,efw,efh,edx,edy,edw,edh);
  };
  if(characterId==='classic'){
    const backItem=lockerEquippedItem('back');
    if(!canUseJetpack())drawPreviewEquipment(backItem);
    drawPreviewEquipment(lockerEquippedItem('katana'));
    for(const slotId of ['chest','face','feet','head'])drawPreviewEquipment(lockerEquippedItem(slotId));
  }
  if(canUseJetpack()&&jetpackOverlayImg.complete&&jetpackOverlayImg.naturalWidth){const oc=jetpackOverlaySheet.cols||3,or=jetpackOverlaySheet.rows||4,ofw=Math.floor(jetpackOverlayImg.naturalWidth/oc),ofh=Math.floor(jetpackOverlayImg.naturalHeight/or),orow=Math.max(0,(jetpackOverlaySheet.rowOrder||['down','left','up','right']).indexOf(lockerState.direction)),os=Math.min(1.05,(ch-55)/ofh,(cw-36)/ofw),oax=Number.isFinite(jetpackOverlaySheet.anchorX)?jetpackOverlaySheet.anchorX:ofw/2,oay=Number.isFinite(jetpackOverlaySheet.anchorY)?jetpackOverlaySheet.anchorY:ofh-1,odx=Math.round(footX-oax*os),ody=Math.round(footY-oay*os),odw=Math.round(ofw*os),odh=Math.round(ofh*os);pctx.drawImage(jetpackOverlayImg,frame*ofw,orow*ofh,ofw,ofh,odx,ody,odw,odh);}
  if(characterId==='classic')drawPreviewEquipment(lockerEquippedItem('hands'));
}
function lockerRender(){
  lockerUpdateWalletBadge();lockerSyncEntryPicker();lockerCreateSlots();lockerCreateFilters();lockerRenderGrids();lockerDrawPreview();lockerRenderNftCollection();
  const base=lockerItemForCharacter(selectedCharacter);const activeSaved=lockerSavedCharacters.find(build=>build.id===lockerActiveSavedCharacterId)||null;const name=document.getElementById('lockerPreviewName'),slot=document.getElementById('lockerPreviewSlotText'),pill=document.getElementById('lockerPreviewOwnership');if(name)name.textContent=activeSaved?.name||(selectedCharacter==='classic'?'Current ATM Build':base?.name||lockerCharacterName(selectedCharacter));if(slot)slot.textContent=(activeSaved?'Saved character':'Unsaved character build')+' · '+lockerState.direction.toUpperCase();if(pill)pill.textContent=activeSaved?'SAVED':'UNSAVED';
  const owned=ATM_ITEM_CATALOG.filter(item=>lockerOwnershipInfo(item).owned).length;const nftUnlocked=ATM_ITEM_CATALOG.filter(item=>lockerOwnershipInfo(item).source==='xrpl').length;const equipped=ATM_LOCKER_SLOTS.filter(slot=>!!lockerEquippedItem(slot.id)).length;const ownedNode=document.getElementById('lockerOwnedCount'),nftNode=document.getElementById('lockerNftCount'),youAreAtmNode=document.getElementById('lockerYouAreAtmCount'),unlockNode=document.getElementById('lockerNftUnlockCount'),equippedNode=document.getElementById('lockerEquippedCount');if(ownedNode)ownedNode.textContent=String(owned);if(nftNode)nftNode.textContent=String(lockerState.nfts.length);if(youAreAtmNode)youAreAtmNode.textContent=String(lockerYouAreAtmNfts().length);if(unlockNode)unlockNode.textContent=String(nftUnlocked);if(equippedNode)equippedNode.textContent=String(equipped);
  document.querySelectorAll('.lockerDirection').forEach(node=>node.classList.toggle('active',node.dataset.lockerDirection===lockerState.direction));const dirLabel=document.getElementById('lockerPreviewDirectionLabel');if(dirLabel)dirLabel.textContent=({down:'FRONT',left:'LEFT',up:'BACK',right:'RIGHT'})[lockerState.direction]||lockerState.direction.toUpperCase();
}
function lockerOpen(){
  attributeStoreRefreshCommerce?.();
  if(lockerState.open||vendingOpen)return;
  lockerPreviousActivity=currentPlayerActivity;
  currentPlayerActivity={type:'locker',label:'LOCKER',startedAt:Date.now()};
  lockerState.open=true;dialogOpen=true;joy.x=joy.y=0;knob.style.transform='translate(0,0)';document.body.classList.add('locker-modal-open');const panel=document.getElementById('lockerPanel');panel.classList.add('open');panel.setAttribute('aria-hidden','false');
  broadcastState(true);updateVoiceProximityVolumes();
  lockerSetTab(lockerState.tab);lockerSetStatus(lockerWalletAddress()?'Locker open. You Are ATM traits from issuer '+ATM_YOU_ARE_ATM_COLLECTION.issuer+' / Taxon '+ATM_YOU_ARE_ATM_COLLECTION.taxon+' unlock mapped gear.':'Locker open. Link Xaman to verify You Are ATM NFT attribute ownership.');if(lockerWalletAddress()&&lockerState.status==='idle')lockerRefreshXrpl(true);else lockerRender();
}
function lockerClose(){
  if(!lockerState.open)return;
  lockerState.open=false;dialogOpen=false;
  if(currentPlayerActivity?.type==='locker')currentPlayerActivity=lockerPreviousActivity;
  lockerPreviousActivity=null;
  document.body.classList.remove('locker-modal-open');const panel=document.getElementById('lockerPanel');panel.classList.remove('open');panel.setAttribute('aria-hidden','true');
  broadcastState(true);updateVoiceProximityVolumes();
}

document.getElementById('lockerButton')?.addEventListener('click',lockerOpen);
document.getElementById('lockerCloseButton')?.addEventListener('click',lockerClose);
document.getElementById('lockerRefreshButton')?.addEventListener('click',()=>lockerRefreshXrpl(false));
document.getElementById('lockerSaveCharacterButton')?.addEventListener('click',lockerSaveCurrentCharacter);
document.querySelectorAll('.lockerTab').forEach(button=>button.addEventListener('click',()=>lockerSetTab(button.dataset.lockerTab)));
document.getElementById('lockerNftSearch')?.addEventListener('input',event=>{lockerState.nftSearch=String(event.target.value||'');lockerRenderNftCollection();});
document.getElementById('lockerNftSort')?.addEventListener('change',event=>{lockerState.nftSort=String(event.target.value||'serial-desc');lockerRenderNftCollection();});
document.getElementById('lockerNftDetailClose')?.addEventListener('click',()=>{document.getElementById('lockerNftDetail')?.classList.remove('open');});
document.getElementById('tradeNftClose')?.addEventListener('click',tradeNftClose);
document.getElementById('tradeNftPanel')?.addEventListener('pointerdown',event=>{if(event.target.id==='tradeNftPanel')tradeNftClose();});

document.querySelectorAll('.lockerDirection').forEach(button=>button.addEventListener('click',()=>{lockerState.direction=button.dataset.lockerDirection;lockerRender();}));
document.getElementById('lockerPanel')?.addEventListener('pointerdown',event=>{if(event.target.id==='lockerPanel')lockerClose();});
window.addEventListener('resize',()=>{if(lockerState.open)lockerDrawPreview();},{passive:true});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&lockerState.open){event.preventDefault();lockerClose();}});
// ===== v235.12 Character Attribute Store + permanent Mainnet crypto checkout =====
const ATM_ATTRIBUTE_STORE_CART_KEY='atm_attribute_store_cart_v1';
const ATM_ATTRIBUTE_STORE_CONFIG=ATM_CONFIG?.attributeStore||Object.freeze({baseCurrency:'USD',checkoutEnabled:false,purchaseNetwork:'mainnet',merchantAddress:'rMSDXpxDpV2pQJDHbp77XHHhT9QHMrfPYB',defaultUsdPrice:null,prices:Object.freeze({}),paymentCategories:Object.freeze([{id:'cash',label:'CASH',rail:'CARD',currency:'USD'},{id:'crypto',label:'CRYPTO',rail:'XRPL',network:'mainnet'}]),cryptoAssets:Object.freeze([{id:'atm',label:'ATM',type:'issued',currency:'ATM',issuer:'raDZ4t8WPXkmDfJWMLBcNZmmSHmBC523NZ'},{id:'rlusd',label:'RLUSD',type:'issued',currency:'524C555344000000000000000000000000000000',issuer:'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'},{id:'xrp',label:'XRP',type:'native',currency:'XRP',issuer:null}])});
let attributeStoreState={open:false,checkoutOpen:false,characterId:'classic',filter:'all',paymentCategory:'crypto',cryptoAsset:'atm',cart:safeJsonParse(safeStorageGet(ATM_ATTRIBUTE_STORE_CART_KEY,'[]'),[])};
let attributeStoreServerPrices=Object.create(null);
let attributeStoreCommerceLoaded=false;
let attributeStorePaymentPollTimer=null;
const ATM_ATTRIBUTE_STORE_PENDING_KEY='atm_attribute_store_pending_v1';
if(!Array.isArray(attributeStoreState.cart))attributeStoreState.cart=[];
attributeStoreState.cart=[...new Set(attributeStoreState.cart.map(String))].filter(id=>ATM_ITEM_CATALOG.some(item=>item.id===id&&item.type==='equipment'));
let attributeStorePreviousActivity=null;
function attributeStorePersistCart(){safeStorageSet(ATM_ATTRIBUTE_STORE_CART_KEY,JSON.stringify(attributeStoreState.cart));}
function attributeStoreCharacters(){return ATM_ITEM_CATALOG.filter(item=>item.type==='character');}
function attributeStoreItemCharacterIds(item){if(Array.isArray(item?.storeCharacterIds)&&item.storeCharacterIds.length)return item.storeCharacterIds.slice();if(Array.isArray(item?.compatibleCharacterIds)&&item.compatibleCharacterIds.length)return item.compatibleCharacterIds.slice();if(item?.id==='equipment:jetpack')return ['classic'];return ['classic'];}
function attributeStoreItemInCharacter(item,characterId){return item?.type==='equipment'&&attributeStoreItemCharacterIds(item).includes(characterId);}
function attributeStoreItemIsCatalogProduct(item){return item?.type==='equipment'&&(item.ownership==='store'||item.ownership==='development'||item.ownership==='session'||lockerHasXrplMapping(item));}
function attributeStorePrice(item,assetId='usd'){const server=attributeStoreServerPrices?.[item?.id]?.[assetId];const raw=server??(assetId==='usd'?(ATM_ATTRIBUTE_STORE_CONFIG?.prices?.[item.id]??item.storePriceUsd??ATM_ATTRIBUTE_STORE_CONFIG?.defaultUsdPrice):null);if(raw===null||raw===undefined||raw==='')return null;const value=Number(raw);return Number.isFinite(value)&&value>0?value:null;}
function attributeStorePriceText(item){const price=attributeStorePrice(item,'usd');return price===null?'PRICE NOT SET':new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(price);}
function attributeStoreAssetPriceText(amount,assetId){if(amount===null||amount===undefined)return '—';if(assetId==='usd')return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(amount));return `${Number(amount).toLocaleString(undefined,{maximumFractionDigits:6})} ${String(assetId||'').toUpperCase()}`;}
function attributeStoreCharacterName(characterId){return lockerCharacterName(characterId).toUpperCase();}
function attributeStoreSetStatus(message,tone=''){const node=document.getElementById('attributeStoreStatus');if(!node)return;node.textContent=message||'';node.className=tone||'';}
function attributeStoreCartItems(){return attributeStoreState.cart.map(id=>ATM_ITEM_CATALOG.find(item=>item.id===id)).filter(Boolean);}
function attributeStoreNormalizeCart(){const before=attributeStoreState.cart.length;attributeStoreState.cart=attributeStoreState.cart.filter(id=>{const item=ATM_ITEM_CATALOG.find(entry=>entry.id===id);return item&&attributeStoreItemIsCatalogProduct(item)&&!lockerOwnershipInfo(item).owned;});if(before!==attributeStoreState.cart.length)attributeStorePersistCart();}
function attributeStoreUpdateButton(){const button=document.getElementById('attributeStoreButton'),count=document.getElementById('attributeStoreButtonCount');if(!button||!count)return;attributeStoreNormalizeCart();const total=attributeStoreState.cart.length;count.textContent=String(total);button.classList.toggle('hasItems',total>0);}
function attributeStoreCharacterThumbnail(characterId){return lockerItemPreview(lockerItemForCharacter(characterId));}
function attributeStoreCreateCharacters(){const host=document.getElementById('attributeStoreCharacters');if(!host)return;host.textContent='';for(const character of attributeStoreCharacters()){const count=ATM_ITEM_CATALOG.filter(item=>attributeStoreItemIsCatalogProduct(item)&&attributeStoreItemInCharacter(item,character.characterId)).length;const button=document.createElement('button');button.type='button';button.className='attributeStoreCharacter'+(attributeStoreState.characterId===character.characterId?' active':'');const preview=attributeStoreCharacterThumbnail(character.characterId);button.innerHTML=(preview?`<img alt="${character.name}" src="${preview}">`:`<span class="fallback">${character.emoji||'◈'}</span>`)+`<span><strong>${character.name}</strong><small>${count} ATTRIBUTE${count===1?'':'S'}</small></span>`;button.addEventListener('click',()=>{attributeStoreState.characterId=character.characterId;attributeStoreState.filter='all';attributeStoreRender();});host.appendChild(button);}}
function attributeStoreCreateFilters(){const host=document.getElementById('attributeStoreFilters');if(!host)return;host.textContent='';const filters=[['all','ALL'],['body','BODY'],['chest','CHEST'],['face','FACE'],['head','HEAD'],['back','BACKPACK'],['katana','KATANA'],['hands','GLOVES'],['feet','SHOES'],['utility','UTILITY']];for(const [id,label] of filters){const button=document.createElement('button');button.type='button';button.className='attributeStoreFilter'+(attributeStoreState.filter===id?' active':'');button.textContent=label;button.addEventListener('click',()=>{attributeStoreState.filter=id;attributeStoreRender();});host.appendChild(button);}}
function attributeStoreSlotMatch(item,filter){if(filter==='all')return true;if(filter==='utility')return item.id==='equipment:jetpack'||item.slot==='aura';return item.slot===filter;}
function attributeStoreVisibleItems(){return ATM_ITEM_CATALOG.filter(item=>attributeStoreItemIsCatalogProduct(item)&&attributeStoreItemInCharacter(item,attributeStoreState.characterId)&&attributeStoreSlotMatch(item,attributeStoreState.filter));}
function attributeStoreToggleCart(item){const info=lockerOwnershipInfo(item);if(info.owned){attributeStoreSetStatus(item.name+' is already owned and is available in your Locker.','ok');return;}const index=attributeStoreState.cart.indexOf(item.id);if(index>=0){attributeStoreState.cart.splice(index,1);attributeStoreSetStatus(item.name+' removed from cart.');}else{attributeStoreState.cart.push(item.id);attributeStoreSetStatus(item.name+' added to cart.','ok');}attributeStorePersistCart();attributeStoreRender();}
function attributeStoreCreateItem(item){const info=lockerOwnershipInfo(item),inCart=attributeStoreState.cart.includes(item.id),card=document.createElement('article');card.className='attributeStoreItem'+(info.owned?' owned':'')+(inCart?' inCart':'');const preview=lockerItemPreview(item);const art=preview?`<img alt="${item.name}" src="${preview}">`:`<span class="fallback">${item.emoji||'◈'}</span>`;const badge=info.owned?(info.source==='xrpl'?'NFT OWNED':info.source==='purchase'?'PURCHASED':'OWNED'):(inCart?'IN CART':lockerHasXrplMapping(item)?'NFT OR STORE':'STORE');card.innerHTML=`<span class="attributeStoreItemBadge">${badge}</span><div class="attributeStoreItemArt">${art}</div><div class="attributeStoreItemName">${item.name}</div><div class="attributeStoreItemMeta">${lockerSlotName(item.slot)} · ${attributeStoreCharacterName(attributeStoreState.characterId)}</div><div class="attributeStoreItemPrice">${info.owned?'IN YOUR LOCKER':attributeStorePriceText(item)}</div>`;const action=document.createElement('button');action.type='button';action.className='attributeStoreItemAction';action.textContent=info.owned?'OWNED ✓':inCart?'REMOVE FROM CART':'ADD TO CART';action.disabled=info.owned;action.addEventListener('click',()=>attributeStoreToggleCart(item));card.appendChild(action);return card;}
function attributeStoreRenderCatalog(){const grid=document.getElementById('attributeStoreGrid'),title=document.getElementById('attributeStoreCatalogTitle'),count=document.getElementById('attributeStoreCatalogCount');if(!grid)return;const items=attributeStoreVisibleItems();if(title)title.textContent=attributeStoreCharacterName(attributeStoreState.characterId)+' ATTRIBUTES';if(count)count.textContent=items.length+' item'+(items.length===1?'':'s');grid.textContent='';for(const item of items)grid.appendChild(attributeStoreCreateItem(item));if(!items.length){const empty=document.createElement('div');empty.className='attributeStoreEmpty';const hasAny=ATM_ITEM_CATALOG.some(item=>attributeStoreItemIsCatalogProduct(item)&&attributeStoreItemInCharacter(item,attributeStoreState.characterId));empty.innerHTML=hasAny?'<strong>No matching attributes</strong>Change the attribute type.':`<strong>No ${lockerCharacterName(attributeStoreState.characterId)} attribute layers yet</strong>This character catalog is ready. New modular ${lockerCharacterName(attributeStoreState.characterId)} assets will appear automatically when they are added to the item catalog.`;grid.appendChild(empty);}}
function attributeStoreSelectedPaymentLabel(){return attributeStoreState.paymentCategory==='cash'?'CASH':String(attributeStoreState.cryptoAsset||'atm').toUpperCase();}
async function attributeStoreRefreshCommerce(){
  try{
    const response=await fetch('/api/xaman-vending-start?commerce=attribute-store&mode=catalog',{cache:'no-store'}),data=await response.json().catch(()=>({}));
    if(response.ok){attributeStoreServerPrices=data?.prices&&typeof data.prices==='object'?data.prices:Object.create(null);attributeStoreCommerceLoaded=true;}
  }catch(error){console.warn('Attribute Store pricing refresh failed:',error);}
  if(authSession?.access_token){
    try{const data=await apiWithAuth('/api/xaman-vending-start?commerce=attribute-store&mode=entitlements');lockerPurchasedItems.clear();for(const id of data?.item_ids||[])lockerPurchasedItems.add(String(id));}
    catch(error){console.warn('Attribute entitlement refresh failed:',error);}
  }
  attributeStoreNormalizeCart();if(attributeStoreState.open)attributeStoreRender();if(lockerState.open)lockerRender();
}
function attributeStoreSelectedAssetId(){return attributeStoreState.paymentCategory==='cash'?'usd':String(attributeStoreState.cryptoAsset||'atm');}
function attributeStoreCartPricing(assetId=attributeStoreSelectedAssetId()){
  const items=attributeStoreCartItems(),prices=items.map(item=>attributeStorePrice(item,assetId));
  return {items,prices,allPriced:items.length>0&&prices.every(value=>value!==null),total:prices.every(value=>value!==null)?prices.reduce((sum,value)=>sum+Number(value||0),0):null};
}
function attributeStoreSavePending(value){try{if(value)localStorage.setItem(ATM_ATTRIBUTE_STORE_PENDING_KEY,JSON.stringify(value));else localStorage.removeItem(ATM_ATTRIBUTE_STORE_PENDING_KEY);}catch(_){}}
function attributeStoreReadPending(){try{return JSON.parse(localStorage.getItem(ATM_ATTRIBUTE_STORE_PENDING_KEY)||'null');}catch(_){return null;}}
function attributeStoreStopPoll(){if(attributeStorePaymentPollTimer){clearTimeout(attributeStorePaymentPollTimer);attributeStorePaymentPollTimer=null;}}
function attributeStorePollPayment(payloadUuid){
  if(!/^[0-9a-f-]{36}$/i.test(String(payloadUuid||'')))return;attributeStoreStopPoll();let attempts=0;
  const check=async()=>{if(document.hidden){attributeStorePaymentPollTimer=setTimeout(check,1800);return;}attempts++;
    try{const data=await apiWithAuth('/api/xaman-vending-status?commerce=attribute-store&payload_uuid='+encodeURIComponent(payloadUuid));
      if(data.status==='paid'){attributeStoreStopPoll();attributeStoreSavePending(null);attributeStoreSetStatus('Purchase confirmed on XRPL Mainnet. Attributes added to your Locker.','ok');await attributeStoreRefreshCommerce();attributeStoreCheckoutClose();return;}
      if(['rejected','failed','expired'].includes(data.status)){attributeStoreStopPoll();attributeStoreSavePending(null);attributeStoreSetStatus(data.error||('Payment '+data.status+'.'),'error');return;}
      attributeStoreSetStatus(data.phase==='validating'?'Payment sent · validating exact XRPL transaction…':data.phase==='opened'?'Xaman opened · waiting for approval…':'Waiting for Xaman approval…');
    }catch(error){attributeStoreSetStatus(error.message||'Payment status check failed.','error');}
    if(attempts<100)attributeStorePaymentPollTimer=setTimeout(check,3000);else{attributeStoreStopPoll();attributeStoreSetStatus('Payment verification is still pending. Reopen the Store to resume checking.');}
  };check();
}
async function attributeStoreStartCheckout(){
  if(attributeStoreState.paymentCategory==='cash'){attributeStoreSetStatus('Cash / card checkout is the next payment rail and is not live yet. Crypto checkout is available first.','error');return;}
  const pricing=attributeStoreCartPricing();if(!pricing.items.length)return;if(!pricing.allPriced){attributeStoreSetStatus('One or more items do not have a price for '+attributeStoreState.cryptoAsset.toUpperCase()+'.','error');return;}
  if(!authSession?.access_token){attributeStoreSetStatus('Sign in before purchasing attributes.','error');return;}if(!playerAccount?.wallet_address){attributeStoreSetStatus('Link and verify Xaman before making an XRPL purchase.','error');return;}
  const button=document.getElementById('attributeStoreCheckoutButton');if(button){button.disabled=true;button.textContent='CREATING XAMAN PAYMENT…';}
  try{const data=await apiWithAuth('/api/xaman-vending-start?commerce=attribute-store',{method:'POST',body:JSON.stringify({item_ids:pricing.items.map(item=>item.id),asset_id:attributeStoreState.cryptoAsset})});attributeStoreSavePending({payload_uuid:data.payload_uuid,purchase_id:data.purchase_id,created_at:Date.now()});attributeStoreSetStatus(`Opening Xaman for ${data.total} ${data.asset_label}. Return to ATM Town after signing.`);attributeStorePollPayment(data.payload_uuid);window.location.assign(data.deeplink);}
  catch(error){attributeStoreSetStatus(error.message||'Could not start Attribute Store checkout.','error');attributeStoreRenderCart();}
}
function attributeStoreResumePending(){const pending=attributeStoreReadPending();if(!pending?.payload_uuid||!authSession?.access_token)return;attributeStorePollPayment(pending.payload_uuid);}
window.addEventListener('focus',()=>setTimeout(attributeStoreResumePending,250));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(attributeStoreResumePending,250);});
function attributeStoreRenderCart(){
  attributeStoreNormalizeCart();
  const host=document.getElementById('attributeStoreCartItems'),title=document.getElementById('attributeStoreCartTitle'),totalNode=document.getElementById('attributeStoreCartTotal'),review=document.getElementById('attributeStoreCheckoutReviewButton'),checkout=document.getElementById('attributeStoreCheckoutButton'),note=document.getElementById('attributeStoreCheckoutNote'),summaryHost=document.getElementById('attributeStoreCheckoutSummaryItems'),summaryTotal=document.getElementById('attributeStoreCheckoutSummaryTotal');
  const items=attributeStoreCartItems();
  if(title)title.textContent=items.length+' ITEM'+(items.length===1?'':'S');
  if(host){host.textContent='';if(!items.length){const empty=document.createElement('div');empty.className='attributeStoreCartEmpty';empty.textContent='Your cart is empty. Shop any character catalog and add attributes here.';host.appendChild(empty);}for(const item of items){const row=document.createElement('div');row.className='attributeStoreCartRow';const preview=lockerItemPreview(item);row.innerHTML=preview?`<img alt="${item.name}" src="${preview}"><div><strong>${item.name}</strong><small>${attributeStorePriceText(item)}</small></div>`:`<span class="fallback">${item.emoji||'◈'}</span><div><strong>${item.name}</strong><small>${attributeStorePriceText(item)}</small></div>`;const remove=document.createElement('button');remove.type='button';remove.className='attributeStoreCartRemove';remove.textContent='×';remove.setAttribute('aria-label','Remove '+item.name);remove.addEventListener('click',()=>attributeStoreToggleCart(item));row.appendChild(remove);host.appendChild(row);}}
  if(summaryHost){summaryHost.textContent='';if(!items.length){const empty=document.createElement('div');empty.className='attributeStoreCartEmpty';empty.textContent='Your cart is empty.';summaryHost.appendChild(empty);}for(const item of items){const row=document.createElement('div');row.className='attributeStoreCheckoutSummaryRow';const preview=lockerItemPreview(item),price=attributeStorePriceText(item);row.innerHTML=(preview?`<img alt="${item.name}" src="${preview}">`:`<span class="fallback">${item.emoji||'◈'}</span>`)+`<div><strong>${item.name}</strong><small>${lockerSlotName(item.slot)} · ${attributeStoreCharacterName(attributeStoreState.characterId)}</small></div><b>${price}</b>`;summaryHost.appendChild(row);}}
  const usdPricing=attributeStoreCartPricing('usd'),selectedPricing=attributeStoreCartPricing(attributeStoreSelectedAssetId());
  const formattedTotal=usdPricing.allPriced?attributeStoreAssetPriceText(usdPricing.total,'usd'):'—';
  if(totalNode)totalNode.textContent=formattedTotal;
  if(summaryTotal)summaryTotal.textContent=attributeStoreState.paymentCategory==='cash'?formattedTotal:(selectedPricing.allPriced?attributeStoreAssetPriceText(selectedPricing.total,attributeStoreState.cryptoAsset):'—');
  if(review){review.disabled=items.length===0;review.textContent=items.length?'REVIEW PAYMENT · '+items.length+' ITEM'+(items.length===1?'':'S'):'REVIEW PAYMENT';}
  const cryptoLive=attributeStoreState.paymentCategory==='crypto'&&ATM_ATTRIBUTE_STORE_CONFIG?.checkoutEnabled===true&&attributeStoreCommerceLoaded&&selectedPricing.allPriced;
  if(checkout){checkout.disabled=!cryptoLive;checkout.textContent=attributeStoreState.paymentCategory==='cash'?'CARD CHECKOUT · COMING SOON':cryptoLive?`PAY ${attributeStoreAssetPriceText(selectedPricing.total,attributeStoreState.cryptoAsset)} · XAMAN`:items.length?'PRICE REQUIRED':'CHECKOUT';}
  if(note)note.textContent=!items.length?'Add an unowned attribute to start a cart.':attributeStoreState.paymentCategory==='cash'?'USD/card checkout is staged for a future card processor.':!selectedPricing.allPriced?'One or more items still need a '+String(attributeStoreState.cryptoAsset||'').toUpperCase()+' price.':'XRPL Mainnet payment is verified server-side before permanent ownership is granted.';
  if(!items.length&&attributeStoreState.checkoutOpen)attributeStoreCheckoutClose();
  attributeStoreUpdateButton();
}
function attributeStoreRenderPayments(){
  const categories=document.getElementById('attributeStorePaymentCategories'),crypto=document.getElementById('attributeStoreCryptoAssets'),cash=document.getElementById('attributeStoreCashInfo'),choiceLabel=document.querySelector('.attributeStorePaymentChoiceLabel');
  if(categories){categories.textContent='';for(const method of ATM_ATTRIBUTE_STORE_CONFIG.paymentCategories||[]){const button=document.createElement('button');button.type='button';button.className='attributeStorePaymentCategory'+(attributeStoreState.paymentCategory===method.id?' active':'');button.textContent=method.id==='cash'?'CASH / CARD':'CRYPTO';button.title=method.rail;button.setAttribute('aria-pressed',attributeStoreState.paymentCategory===method.id?'true':'false');button.addEventListener('click',()=>{attributeStoreState.paymentCategory=method.id;attributeStoreRenderPayments();attributeStoreRenderCart();});categories.appendChild(button);}}
  const cryptoActive=attributeStoreState.paymentCategory==='crypto';
  if(choiceLabel)choiceLabel.hidden=!cryptoActive;
  if(crypto){crypto.hidden=!cryptoActive;crypto.textContent='';for(const asset of ATM_ATTRIBUTE_STORE_CONFIG.cryptoAssets||[]){const button=document.createElement('button');button.type='button';button.className='attributeStoreCryptoAsset'+(attributeStoreState.cryptoAsset===asset.id?' active':'');button.textContent=asset.label;button.title='XRPL '+String(ATM_ATTRIBUTE_STORE_CONFIG.purchaseNetwork||'mainnet').toUpperCase();button.setAttribute('aria-pressed',attributeStoreState.cryptoAsset===asset.id?'true':'false');button.addEventListener('click',()=>{attributeStoreState.cryptoAsset=asset.id;attributeStoreRenderPayments();attributeStoreRenderCart();});crypto.appendChild(button);}}
  if(cash)cash.hidden=cryptoActive;
}
function attributeStoreCheckoutOpen(){
  if(!attributeStoreState.open||!attributeStoreCartItems().length)return;
  attributeStoreState.checkoutOpen=true;
  const sheet=document.getElementById('attributeStoreCheckoutSheet');
  sheet?.classList.add('open');sheet?.setAttribute('aria-hidden','false');
  attributeStoreRenderPayments();attributeStoreRenderCart();
  requestAnimationFrame(()=>document.getElementById('attributeStoreCheckoutCloseButton')?.focus?.({preventScroll:true}));
}
function attributeStoreCheckoutClose(){
  attributeStoreState.checkoutOpen=false;
  const sheet=document.getElementById('attributeStoreCheckoutSheet');
  sheet?.classList.remove('open');sheet?.setAttribute('aria-hidden','true');
}
function attributeStoreRender(){if(!attributeStoreState.open){attributeStoreUpdateButton();return;}attributeStoreNormalizeCart();attributeStoreCreateCharacters();attributeStoreCreateFilters();attributeStoreRenderCatalog();attributeStoreRenderPayments();attributeStoreRenderCart();}
window.atmAttributeStoreRender=attributeStoreRender;
function attributeStoreOpen(characterId=selectedCharacter){if(attributeStoreState.open||vendingOpen)return;if(lockerState.open)lockerClose();attributeStorePreviousActivity=currentPlayerActivity;currentPlayerActivity={type:'attribute-store',label:'ATTRIBUTE STORE',startedAt:Date.now()};attributeStoreState.characterId=attributeStoreCharacters().some(item=>item.characterId===characterId)?characterId:'classic';attributeStoreState.open=true;attributeStoreState.checkoutOpen=false;dialogOpen=true;joy.x=joy.y=0;knob.style.transform='translate(0,0)';document.body.classList.add('attribute-store-open');const panel=document.getElementById('attributeStorePanel');panel?.classList.add('open');panel?.setAttribute('aria-hidden','false');broadcastState(true);updateVoiceProximityVolumes();attributeStoreSetStatus('Shopping '+lockerCharacterName(attributeStoreState.characterId)+' attributes. Owned items are labeled in place; unowned items can be added to cart.');attributeStoreRender();attributeStoreRefreshCommerce();attributeStoreResumePending();if(lockerWalletAddress()&&lockerState.status==='idle')lockerRefreshXrpl(true);}
function attributeStoreClose(){if(!attributeStoreState.open)return;attributeStoreCheckoutClose();attributeStoreState.open=false;dialogOpen=false;if(currentPlayerActivity?.type==='attribute-store')currentPlayerActivity=attributeStorePreviousActivity;attributeStorePreviousActivity=null;document.body.classList.remove('attribute-store-open');const panel=document.getElementById('attributeStorePanel');panel?.classList.remove('open');panel?.setAttribute('aria-hidden','true');broadcastState(true);updateVoiceProximityVolumes();attributeStoreUpdateButton();}
window.atmOpenAttributeStore=attributeStoreOpen;
window.atmAttributeStore=Object.freeze({open:attributeStoreOpen,close:attributeStoreClose,config:ATM_ATTRIBUTE_STORE_CONFIG,cart:()=>attributeStoreCartItems().map(item=>item.id),visible:()=>attributeStoreVisibleItems().map(item=>item.id),checkoutOpen:attributeStoreCheckoutOpen,checkoutClose:attributeStoreCheckoutClose});
document.getElementById('attributeStoreButton')?.addEventListener('click',()=>attributeStoreOpen(selectedCharacter));
document.getElementById('attributeStoreCloseButton')?.addEventListener('click',attributeStoreClose);
document.getElementById('attributeStoreRefreshButton')?.addEventListener('click',()=>lockerRefreshXrpl(false).then(()=>attributeStoreRender()));
document.getElementById('attributeStoreClearCart')?.addEventListener('click',()=>{attributeStoreState.cart=[];attributeStorePersistCart();attributeStoreCheckoutClose();attributeStoreSetStatus('Cart cleared.');attributeStoreRender();});
document.getElementById('attributeStoreCheckoutReviewButton')?.addEventListener('click',attributeStoreCheckoutOpen);
document.getElementById('attributeStoreCheckoutCloseButton')?.addEventListener('click',attributeStoreCheckoutClose);
document.getElementById('attributeStoreCheckoutBackButton')?.addEventListener('click',attributeStoreCheckoutClose);
document.getElementById('attributeStoreCheckoutSheet')?.addEventListener('pointerdown',event=>{if(event.target.id==='attributeStoreCheckoutSheet')attributeStoreCheckoutClose();});
document.getElementById('attributeStoreCheckoutButton')?.addEventListener('click',attributeStoreStartCheckout);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&attributeStoreState.checkoutOpen){event.preventDefault();attributeStoreCheckoutClose();return;}if(event.key==='Escape'&&attributeStoreState.open){event.preventDefault();attributeStoreClose();}});
attributeStoreUpdateButton();

document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(document.getElementById('arcadeLeaderboardPanel')?.classList.contains('open')){event.preventDefault();arcadeLeaderboardClose();return;}if(document.getElementById('tradeNftPanel')?.classList.contains('open')){event.preventDefault();tradeNftClose();}});
Object.values(characterSheetImgs).forEach(image=>image?.addEventListener?.('load',()=>{if(lockerState.open)lockerRender();}));Object.values(equipmentSheetImgs).forEach(image=>image?.addEventListener?.('load',()=>{if(lockerState.open)lockerRender();}));jetpackOverlayImg?.addEventListener?.('load',()=>{if(lockerState.open)lockerRender();});
lockerLoadout.base=lockerItemForCharacter(selectedCharacter)?.id||'character:classic';lockerSaveLoadout();lockerRender();
