/*
 * ATM Town — reusable in-world NPC dialogue standard.
 *
 * This file defines the interaction contract used by project/NPC characters:
 * - passive proximity beckon
 * - pause patrol + face the speaking player
 * - world-anchored answer bubble
 * - horizontal question carousel near the bottom HUD
 * - optional reward prompt below the carousel after N answered questions
 * - optional private/player-specific world pickup
 * - per-character visual theme via CSS custom properties
 *
 * Character modules keep their own dialogue/content and optional reward logic.
 */
(function initializeNpcDialogueStandard(global){
  'use strict';

  if(global.ATMNpcDialogueStandard)return;

  const STANDARD=Object.freeze({
    version:'1.0.0',
    layout:'world-bubble-bottom-carousel',
    questionOrientation:'horizontal',
    answerPlacement:'world-anchored',
    rewardPlacement:'below-carousel',
    rewardUnlockQuestions:3,
    pauseNpcWhileTalking:true,
    facePlayerWhileTalking:true,
    passiveBeckon:true,
    privateRewardPickup:true,
    aiRequired:false
  });

  const DEFAULT_THEME=Object.freeze({
    accent:'#42e8df',
    accentSoft:'rgba(66,232,223,.46)',
    accentText:'#dffffc',
    panel:'rgba(8,17,23,.92)',
    headerA:'rgba(10,54,62,.97)',
    headerB:'rgba(12,25,31,.96)',
    question:'rgba(20,39,50,.96)',
    answered:'#ffe2a0',
    rewardA:'rgba(37,103,99,.97)',
    rewardB:'rgba(30,76,72,.97)',
    rewardText:'#e7fffb',
    speech:'rgba(8,30,34,.96)',
    speechText:'#efffff'
  });

  const profiles=new Map();

  function normalizeTheme(theme={}){
    return Object.freeze({...DEFAULT_THEME,...theme});
  }

  function normalizeProfile(profile={}){
    const id=String(profile.id||'').trim();
    if(!id)throw new Error('NPC dialogue profile requires an id.');
    return Object.freeze({
      ...STANDARD,
      ...profile,
      id,
      rewardUnlockQuestions:Number.isFinite(Number(profile.rewardUnlockQuestions))
        ? Math.max(0,Number(profile.rewardUnlockQuestions))
        : STANDARD.rewardUnlockQuestions,
      theme:normalizeTheme(profile.theme)
    });
  }

  function register(profile){
    const normalized=normalizeProfile(profile);
    profiles.set(normalized.id,normalized);
    return normalized;
  }

  function get(id){
    return profiles.get(String(id||''))||null;
  }

  function list(){
    return [...profiles.values()];
  }

  function countAnswered(questionHost){
    if(!questionHost)return 0;
    return questionHost.querySelectorAll('.luci666Question.asked:not(.reward),[data-npc-question].asked:not([data-npc-reward])').length;
  }

  function rewardUnlocked(questionHost,profileOrId){
    const profile=typeof profileOrId==='string'?get(profileOrId):profileOrId;
    const threshold=profile?.rewardUnlockQuestions??STANDARD.rewardUnlockQuestions;
    return countAnswered(questionHost)>=threshold;
  }

  function applyTheme(target,profileOrId){
    if(!target?.style)return false;
    const profile=typeof profileOrId==='string'?get(profileOrId):profileOrId;
    const theme=profile?.theme||DEFAULT_THEME;
    const vars={
      '--atm-npc-accent':theme.accent,
      '--atm-npc-accent-soft':theme.accentSoft,
      '--atm-npc-accent-text':theme.accentText,
      '--atm-npc-panel':theme.panel,
      '--atm-npc-header-a':theme.headerA,
      '--atm-npc-header-b':theme.headerB,
      '--atm-npc-question':theme.question,
      '--atm-npc-answered':theme.answered,
      '--atm-npc-reward-a':theme.rewardA,
      '--atm-npc-reward-b':theme.rewardB,
      '--atm-npc-reward-text':theme.rewardText,
      '--atm-npc-speech':theme.speech,
      '--atm-npc-speech-text':theme.speechText
    };
    for(const [key,value] of Object.entries(vars))target.style.setProperty(key,value);
    target.dataset.atmNpcDialogueProfile=profile?.id||'';
    return true;
  }

  global.ATMNpcDialogueStandard=Object.freeze({
    STANDARD,
    DEFAULT_THEME,
    register,
    get,
    list,
    countAnswered,
    rewardUnlocked,
    applyTheme
  });
})(window);
