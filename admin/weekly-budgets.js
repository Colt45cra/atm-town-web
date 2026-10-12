export function budgetUsage(used,limit){
 if(limit==null)return {percent:0,label:'No weekly cap',level:'none'};
 const toUnits=value=>{const match=String(value).match(/^(\d+)(?:\.(\d{0,6}))?$/);if(!match)throw Error('Weekly usage unavailable');return BigInt(match[1])*1000000n+BigInt((match[2]||'').padEnd(6,'0'));};
 const cap=toUnits(limit),spent=toUnits(used);
 const hundredths=cap===0n?10000n:spent*10000n/cap;
 const percent=Number(hundredths>10000n?10000n:hundredths)/100;
 return {percent,label:hundredths>=10000n?'Limit reached':hundredths>=9500n?'Almost at limit':hundredths>=8000n?'Near limit':'Within budget',level:hundredths>=10000n?'reached':hundredths>=9500n?'critical':hundredths>=8000n?'warning':'ok'};
}

const drafts=new Map();
export function renderWeeklyBudgets({host,wallets,node,programName,tokenName,balanceText,api,status,onSaved}){
 host.replaceChildren();
 host.append(node('p','Weekly token budgets and payout counts reset Monday at 00:00 UTC. Raising a limit takes effect immediately; it does not add tokens to the wallet. Each program has its own budget, including programs that pay the same token.'));
 for(const wallet of wallets){
  const row=node('article');row.className='row weekly-budget';
  row.append(node('h3',programName(wallet.slug)));
  if(wallet.error||wallet.weeklyTokensUsed==null){
   row.append(node('p',wallet.error||'Weekly usage unavailable. Refresh to try again.'));host.append(row);continue;
  }
  const symbol=tokenName(wallet.currency),usage=budgetUsage(wallet.weeklyTokensUsed,wallet.weeklyTokenBudget);
  row.dataset.level=usage.level;
  const badge=node('strong',`${symbol} · ${usage.label}`);badge.className='budget-status';row.append(badge);
  if(wallet.weeklyTokenBudget!=null){const progress=node('progress');progress.max=100;progress.value=usage.percent;progress.setAttribute('aria-label',`${symbol} weekly token budget used: ${usage.percent}%`);row.append(progress);}
  row.append(node('p',`Paid: ${balanceText(wallet.weeklyTokensPaid)} ${symbol} · Pending: ${balanceText(wallet.weeklyTokensPending)} ${symbol}`));
  row.append(node('p',`Used / committed: ${balanceText(wallet.weeklyTokensUsed)} ${symbol} · Remaining: ${wallet.weeklyTokensRemaining==null?'No weekly cap':balanceText(wallet.weeklyTokensRemaining)+' '+symbol}`));
  const counts=budgetUsage(String(wallet.weeklyClaimsUsed),wallet.weeklyClaimLimit==null?null:String(wallet.weeklyClaimLimit));
  const countNote=node('p',wallet.weeklyClaimLimit==null?`Payouts this week: ${wallet.weeklyClaimsUsed}. Funding-cycle payout allowance applies.`:`Payouts this week: ${wallet.weeklyClaimsUsed} / ${wallet.weeklyClaimLimit} · ${wallet.weeklyClaimsRemaining} remaining · ${counts.label}`);
  countNote.className='budget-count';countNote.dataset.level=counts.level;row.append(countNote);
  row.append(node('p',`Next reset: ${new Date(wallet.weeklyResetsAt).toLocaleString()} (Monday 00:00 UTC)`));
  row.append(node('p',`Funded token budget remaining: ${balanceText(wallet.payoutBudgetRemaining)} ${symbol}. Wallet balance: ${balanceText(wallet.payoutBalance)} ${symbol}.`));
  if(wallet.status!=='active')row.append(node('p',`Program status: ${wallet.status}. Fund and enable this program to pay rewards.`));
  const form=node('form');form.className='weekly-budget-form';
  function input(label,value,step){const wrap=node('label',label),control=node('input');control.type='number';control.min='0';control.step=step;control.value=value??'';control.placeholder='No weekly cap';wrap.append(control);form.append(wrap);return control;}
  const draft=drafts.get(wallet.slug);
  const tokens=input(`Weekly token budget (${symbol})`,draft?.tokens??wallet.weeklyTokenBudget,'0.000001');
  const claims=input('Weekly payout allowance (number of payments)',draft?.claims??wallet.weeklyClaimLimit,'1');claims.min='1';claims.max='10000000';claims.placeholder='Use funding-cycle allowance';
  for(const control of [tokens,claims])control.addEventListener('input',()=>{drafts.set(wallet.slug,{tokens:tokens.value,claims:claims.value});form.dataset.dirty='true';});
  form.append(node('p','Blank token budget = no weekly token cap. Zero = pause new reward reservations. Blank payout allowance = use the funded cycle’s payment allowance. Existing reserved payments remain committed.'));
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
