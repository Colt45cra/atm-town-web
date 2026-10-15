import { initBotId } from 'botid/client/core';
initBotId({protect:[
 {path:'/api/leaderboards',method:'POST',advancedOptions:{checkLevel:'basic'}},
 {path:'/api/xaman-vending-start',method:'POST',advancedOptions:{checkLevel:'basic'}}
]});
window.ATMTownHumanCheck=async function(){
 const response=await fetch('/api/leaderboards?action=rewards-human-check',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.verified!==true)throw new Error(data.error||'Could not verify your browser. Refresh ATM Town and try again.');
};
