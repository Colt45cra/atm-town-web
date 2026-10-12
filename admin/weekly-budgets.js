export function budgetUsage(used,limit){
 if(limit==null)return {percent:0,label:'No weekly cap',level:'none'};
 const toUnits=value=>{const match=String(value).match(/^(\d+)(?:\.(\d{0,6}))?$/);if(!match)throw Error('Weekly usage unavailable');return BigInt(match[1])*1000000n+BigInt((match[2]||'').padEnd(6,'0'));};
 const cap=toUnits(limit),spent=toUnits(used);
 const hundredths=cap===0n?10000n:spent*10000n/cap;
 const percent=Number(hundredths>10000n?10000n:hundredths)/100;
 return {percent,label:hundredths>=10000n?'Limit reached':hundredths>=9500n?'Almost at limit':hundredths>=8000n?'Near limit':'Within budget',level:hundredths>=10000n?'reached':hundredths>=9500n?'critical':hundredths>=8000n?'warning':'ok'};
}

export function fundedBudgetUsage(committed,total){
 if(total==null||committed==null)return {percent:0,label:'Funding data unavailable',level:'none'};
 const units=value=>{const m=String(value).match(/^(\\d+)(?:\\.(\\d{0,12}))?$/);if(!m)throw Error('Invalid funded-budget amount');return BigInt(m[1])*1000000000000n+BigInt((m[2]||'').padEnd(12,'0'));};
 const cap=units(total),spent=units(committed);
 if(cap===0n)return {percent:100,label:'Not funded',level:'reached'};
 const hundredths=spent*10000n/cap;
 return {percent:Number(hundredths>10000n?10000n:hundredths)/100,label:hundredths>=10000n?'Funded limit reached':hundredths>=9500n?'Almost out of funded tokens':hundredths>=8000n?'Funded allocation running low':'Funded allocation available',level:hundredths>=10000n?'reached':hundredths>=9500n?'critical':hundredths>=8000n?'warning':'ok'};
}

const drafts=new Map();
export function renderWeeklyBudgets({host,wallets,node,programName,tokenName,balanceText,api,status,onSaved,beginTopup,cancelTopup}){
 host.replaceChildren();
 host.append(node('p','Weekly token budgets and payout counts reset Monday at 00:00 UTC. Raising a limit takes effect immediately; it does not add tokens to the wallet. Each program has its own budget, including programs that pay the same token.'));
 for(const wallet of wallets){
  const row=node('article');row.className='row weekly-budget';
  row.append(node('h3',programName(wallet.slug)));
  if(wallet.error||wallet.weeklyTokensUsed==null){
   row.append(node('p',wallet.error||'Weekly usage unavailable. Refresh to try again.'));host.append(row);continue;
  }
  const symbol=tokenName(wallet.currency),usage=budgetUsage(wallet.weeklyTokensUsed,wallet.weeklyTokenBudget);
  const fundedUsage=fundedBudgetUsage(wallet.fundedTokensCommitted,wallet.fundedBudgetTotal);
  const fundedRemaining=wallet.payoutBudgetRemaining==null?null:Number(wallet.payoutBudgetRemaining);
  const fundedExhausted=fundedRemaining!==null&&Number.isFinite(fundedRemaining)&&fundedRemaining<=0;
  const rewardAmount=wallet.maxAmountPerSession==null?null:Number(wallet.maxAmountPerSession);
  const belowReward=rewardAmount!==null&&Number.isFinite(rewardAmount)&&fundedRemaining!==null&&Number.isFinite(fundedRemaining)&&fundedRemaining<rewardAmount;
  const levels={none:0,ok:0,warning:1,critical:2,reached:3};
  row.dataset.level=fundedExhausted||belowReward?'reached':(levels[fundedUsage.level]>levels[usage.level]?fundedUsage.level:usage.level);
  row.dataset.fundedLevel=fundedUsage.level;
  const badge=node('strong',fundedExhausted?`${symbol} · Funded allowance exhausted`:belowReward?`${symbol} · Not enough funded for one reward`:fundedUsage.level==='critical'?`${symbol} · Funded allocation almost exhausted`:fundedUsage.level==='warning'?`${symbol} · Funded allocation running low`:`${symbol} · Weekly: ${usage.label}`);
  badge.className='budget-status';row.append(badge);
  if(wallet.weeklyTokenBudget!=null){const progress=node('progress');progress.max=100;progress.value=usage.percent;progress.setAttribute('aria-label',`${symbol} weekly token budget used: ${usage.percent}%`);row.append(progress);}
  row.append(node('p',`Paid: ${balanceText(wallet.weeklyTokensPaid)} ${symbol} · Pending: ${balanceText(wallet.weeklyTokensPending)} ${symbol}`));
  row.append(node('p',`Used / committed: ${balanceText(wallet.weeklyTokensUsed)} ${symbol} · Remaining: ${wallet.weeklyTokensRemaining==null?'No weekly cap':balanceText(wallet.weeklyTokensRemaining)+' '+symbol}`));
  const counts=budgetUsage(String(wallet.weeklyClaimsUsed),wallet.weeklyClaimLimit==null?null:String(wallet.weeklyClaimLimit));
  const countNote=node('p',wallet.weeklyClaimLimit==null?`Payouts this week: ${wallet.weeklyClaimsUsed}. Funding-cycle payout allowance applies.`:`Payouts this week: ${wallet.weeklyClaimsUsed} / ${wallet.weeklyClaimLimit} · ${wallet.weeklyClaimsRemaining} remaining · ${counts.label}`);
  countNote.className='budget-count';countNote.dataset.level=counts.level;row.append(countNote);
  row.append(node('p',`Next reset: ${new Date(wallet.weeklyResetsAt).toLocaleString()} (Monday 00:00 UTC)`));
  const funded=node('section');funded.className='funded-budget';
  funded.append(node('h4','Funded payout allocation · All time (does not reset weekly)'));
  if(wallet.fundedBudgetTotal!=null&&wallet.fundedTokensPaid!=null&&wallet.fundedTokensPending!=null){
   funded.append(node('p',`Total approved funding: ${balanceText(wallet.fundedBudgetTotal)} ${symbol}`));
   funded.append(node('p',`Confirmed payouts: −${balanceText(wallet.fundedTokensPaid)} ${symbol}`));
   funded.append(node('p',`Reserved / submitted payouts: −${balanceText(wallet.fundedTokensPending)} ${symbol}`));
   funded.append(node('strong',`Funded remaining: ${balanceText(wallet.payoutBudgetRemaining)} ${symbol}`));
  }else{
   funded.append(node('p',`Funded remaining: ${balanceText(wallet.payoutBudgetRemaining)} ${symbol}. Full breakdown unavailable until the funding service updates.`));
  }
  if(wallet.fundedBudgetTotal!=null&&wallet.fundedTokensCommitted!=null){
   const progress=node('progress');progress.max=100;progress.value=fundedUsage.percent;
   progress.setAttribute('aria-label',`${symbol} funded allocation used: ${fundedUsage.percent}%`);
   funded.append(progress,node('p',`${fundedUsage.percent}% of all-time funded allocation committed · ${fundedUsage.label}`));
  }
  funded.append(node('p',`Actual reward-wallet token balance: ${balanceText(wallet.payoutBalance)} ${symbol}. This balance is shared; it is not the amount approved for this program.`));
  if(fundedExhausted)funded.append(node('p','No funded allowance remains. New rewards cannot be reserved even if the weekly cap is unlimited or tokens remain in the wallet.'));
  else if(belowReward)funded.append(node('p',`Only ${balanceText(wallet.payoutBudgetRemaining)} ${symbol} is approved, less than the ${balanceText(wallet.maxAmountPerSession)} ${symbol} needed for one reward.`));
  else if(wallet.weeklyTokenBudget==null)funded.append(node('p','No weekly token cap is configured, but the funded allocation still limits payouts.'));
  const details=node('details');details.className='funded-budget-editor';
  details.open=wallet.slug==='luci-666-welcome'||wallet.cycle?.status==='pending';
  details.append(node('summary','Increase funded payout budget'));
  details.append(node('p','Choose additional tokens for this program. This creates a reviewed funding request; the allocation increases only after the required Xaman deposit is confirmed. It does not change the weekly cap.'));
  const fundingForm=node('form');fundingForm.className='funded-budget-form';
  const amountLabel=node('label',`Additional funded tokens (${symbol})`),amount=node('input');
  amount.type='number';amount.min='0.000001';amount.step='0.000001';amount.required=true;
  const pending=wallet.cycle?.status==='pending';
  amount.value=pending?String(wallet.cycle.payoutBudget??''):'';
  amount.disabled=pending;
  amount.placeholder='Amount to add';amountLabel.append(amount);fundingForm.append(amountLabel);
  const requestButton=node('button',pending?'Continue funding request':'Review funding increase');
  requestButton.type='submit';fundingForm.append(requestButton);
  if(pending)fundingForm.append(node('p','A funding request is already pending. Continue it or cancel it before requesting a different amount.'));
  const requestHost=node('div');requestHost.className='funded-request-status';
  if(pending&&wallet.cycle?.kind!=='initial'&&cancelTopup){
   const cancel=node('button','Cancel pending request');cancel.type='button';cancel.className='cancel-topup';
   cancel.addEventListener('click',async()=>{await cancelTopup(wallet.slug,wallet.cycle.id,cancel,requestHost);});
   fundingForm.append(cancel);
  }
  fundingForm.addEventListener('input',()=>{fundingForm.dataset.dirty='true';});
  fundingForm.addEventListener('submit',event=>{event.preventDefault();if(beginTopup)beginTopup(wallet.slug,amount.value,requestButton,requestHost);});
  details.append(fundingForm,requestHost);funded.append(details);
  row.append(funded);
  if(wallet.status!=='active')row.append(node('p',`Program status: ${wallet.status}. Fund and enable this program to pay rewards.`));
  row.append(node('h4','Weekly limits · Reset Monday 00:00 UTC'));
  const form=node('form');form.className='weekly-budget-form';
  function input(label,value,step){const wrap=node('label',label),control=node('input');control.type='number';control.min='0';control.step=step;control.value=value??'';control.placeholder='No weekly cap';wrap.append(control);form.append(wrap);return control;}
  const draft=drafts.get(wallet.slug);
  const tokens=input(`Weekly token budget (${symbol})`,draft?.tokens??wallet.weeklyTokenBudget,'0.000001');
  const claims=input('Weekly payout allowance (number of payments)',draft?.claims??wallet.weeklyClaimLimit,'1');claims.min='1';claims.max='10000000';claims.placeholder='Use funding-cycle allowance';
  for(const control of [tokens,claims])control.addEventListener('input',()=>{drafts.set(wallet.slug,{tokens:tokens.value,claims:claims.value});form.dataset.dirty='true';});
  form.append(node('p','These limits reset weekly and do not add funded tokens. Blank token budget = no weekly token cap, but the funded allocation still applies. Zero = pause new reservations. Blank payout allowance = use the funded cycle’s payment allowance. Already reserved payments stay committed.'));
  const save=node('button','Save weekly limits');save.type='submit';form.append(save);
  form.addEventListener('submit',async event=>{
   event.preventDefault();save.disabled=true;
   try{await api('admin-weekly-budget',{slug:wallet.slug,weekly_token_budget:tokens.value===''?null:tokens.value,weekly_claim_limit:claims.value===''?null:Number(claims.value)});drafts.delete(wallet.slug);delete form.dataset.dirty;status(`${programName(wallet.slug)} weekly limits saved.`);await onSaved();}
   catch(error){status(error.message);}finally{save.disabled=false;}
  });
  row.append(form);host.append(row);
 }
 if(!wallets.length)host.append(node('p','Reward budgets are loading. Use Refresh balances to try again.'));
}
