(function(global){
 'use strict';
 const ttl=15*60*1000;
 function afk(player,now=Date.now()){return !!player.afk||now-Number(player.lastSeen||now)>12000;}
 function alive(player,now=Date.now()){return now-Number(player.lastSeen||0)<=ttl;}
 function unique(list){const players=new Map();for(const p of list){const key=p.account_id?'account:'+p.account_id:p.guest_id?'guest:'+p.guest_id:'session:'+p.session_id;const old=players.get(key);if(!old||p.is_self||(!old.is_self&&((old.afk&&!p.afk)||old.afk===p.afk&&Number(p.lastSeen||0)>Number(old.lastSeen||0))))players.set(key,p);}return [...players.values()];}
 global.ATMPlayerPresence=Object.freeze({afk,alive,unique});
})(window);
