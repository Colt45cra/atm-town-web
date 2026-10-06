export function remainingFunding(required, received='0', scale=12) {
 const units=value=>{const m=String(value??'0').match(/^(\d+)(?:\.(\d+))?$/);if(!m||(m[2]||'').length>scale)throw new Error('Invalid funding amount');return BigInt(m[1])*10n**BigInt(scale)+BigInt((m[2]||'').padEnd(scale,'0')||'0');};
 const left=units(required)-units(received);if(left<=0n)return '0';const fraction=String(left%10n**BigInt(scale)).padStart(scale,'0').replace(/0+$/,'');return `${left/10n**BigInt(scale)}${fraction?'.'+fraction:''}`;
}
export function fundingStep(cycle,symbol) {
 if(!cycle)return {label:'Review top-up',message:'Review the required deposit before opening Xaman.'};
 if(cycle.status==='active'||cycle.fundingStage==='ready')return {ready:true,label:'Top-up confirmed',message:'Both funding steps are confirmed.'};
 if(cycle.status!=='pending')throw new Error('Unexpected funding status');
 const fees=cycle.fundingStage==='xrp';if(!fees&&cycle.fundingStage!=='payout')throw new Error('Unknown funding step');
 const amount=remainingFunding(fees?cycle.xrpFeeRequired:cycle.payoutDepositRequired,fees?cycle.xrpReceived:cycle.payoutReceived,fees?6:12);
 const asset=fees?'XRP':symbol;
 return {stage:fees?'xrp':'token',amount,asset,label:fees?`Fund fees: ${amount} XRP`:`Continue: send ${amount} ${symbol}`,message:fees?`Step 1 of 2: add ${amount} XRP for reward-wallet transaction fees. Your ${symbol} deposit follows after this confirms.`:`Step 2 of 2: deposit ${amount} ${symbol}. The XRP fee step is confirmed. Reward budget: ${cycle.payoutBudget} ${symbol}; the required deposit includes Payload’s funding buffer and any issuer transfer allowance.`};
}
