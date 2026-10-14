(function(global){
 'use strict';
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function combine(effects){const result={speed:1,gravity:1,jump:1};for(const effect of effects){for(const key of Object.keys(result)){const value=Number(effect?.[key]);if(Number.isFinite(value)&&value>0)result[key]*=value;}}return {speed:clamp(result.speed,.25,3),gravity:clamp(result.gravity,.1,3),jump:clamp(result.jump,.25,8)};}
 function jumpProfile(effects,baseHeight=38,baseDuration=.64){return {height:baseHeight*effects.jump,duration:baseDuration*Math.sqrt(effects.jump/effects.gravity)};}
 // Arcade mini-games intentionally cap extremes so upgrades matter without
 // creating unreachable jumps or uncontrolled speeds on fixed-size platforms.
 function arcadeProfile(effects){
  const raw=effects||{};
  const finite=(v,fallback)=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):fallback;
  const speed=clamp(finite(raw.speed,1),.75,1.8);
  const jump=clamp(finite(raw.jump,1),.7,1.75);
  const gravity=clamp(finite(raw.gravity,1),.75,1.3);
  // For a ballistic jump, height = velocity^2 / (2 * gravity).
  // This makes jump determine HEIGHT while gravity changes HANG TIME.
  return Object.freeze({speed,jump,gravity,jumpImpulse:Math.sqrt(jump*gravity)});
 }
 function arcadeLabel(profile){
  const p=arcadeProfile(profile);
  const parts=[];
  if(Math.abs(p.speed-1)>.01)parts.push('RUN '+p.speed.toFixed(2)+'×');
  if(Math.abs(p.jump-1)>.01)parts.push('JUMP '+p.jump.toFixed(2)+'×');
  if(Math.abs(p.gravity-1)>.01)parts.push('GRAVITY '+p.gravity.toFixed(2)+'×');
  return parts.join(' · ')||'STANDARD STATS';
 }
 global.ATMAttributeEffects=Object.freeze({combine,jumpProfile,arcadeProfile,arcadeLabel});
})(globalThis);
