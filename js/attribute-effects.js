(function(global){
 'use strict';
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function combine(effects){const result={speed:1,gravity:1,jump:1};for(const effect of effects){for(const key of Object.keys(result)){const value=Number(effect?.[key]);if(Number.isFinite(value)&&value>0)result[key]*=value;}}return {speed:clamp(result.speed,.25,3),gravity:clamp(result.gravity,.1,3),jump:clamp(result.jump,.25,8)};}
 function jumpProfile(effects,baseHeight=38,baseDuration=.64){return {height:baseHeight*effects.jump,duration:baseDuration*Math.sqrt(effects.jump/effects.gravity)};}
 global.ATMAttributeEffects=Object.freeze({combine,jumpProfile});
})(globalThis);
