export function mountAdminStats({api,node}){
 const $=id=>document.getElementById(id);let requestId=0;
 function tokenName(code){if(/^[0-9a-f]{40}$/i.test(code||'')){return (code.match(/../g)||[]).map(x=>String.fromCharCode(parseInt(x,16))).join('').replace(/\0/g,'');}return code||'Token';}
 async function refresh(){
  const request=++requestId;$('statsNote').textContent='Loading reward totals…';
  try{
   const result=await api('admin-stats&period='+$('earnerPeriod').value);if(request!==requestId)return;
   $('visitorsToday').textContent=result.visitors.total;
   $('visitorBreakdown').textContent=`${result.visitors.players} players · ${result.visitors.guests} guest browsers`;
   $('statsNote').textContent=[result.warning,`Visitor tracking began ${result.tracking_started_at?new Date(result.tracking_started_at).toLocaleString('en-US',{timeZone:'America/Chicago'})+' Central':'with this update'}. Guests are counted per browser; earlier visits are not included.`].filter(Boolean).join(' ');
   const host=$('earnerRows');host.replaceChildren();
   if(!result.tokens.length)host.append(node('p','No confirmed rewards for this period.'));
   for(const token of result.tokens){
    const section=node('section');section.append(node('h3',tokenName(token.currency)),node('p','Issuer: '+(token.issuer||'Native XRP')));
    const wrap=node('div');wrap.style.overflowX='auto';const table=node('table');table.style.width='100%';
    const head=node('thead'),hr=node('tr');for(const title of ['Rank','Player name(s)','Wallet','Earned','Payouts'])hr.append(node('th',title));head.append(hr);table.append(head);
    const body=node('tbody');for(const earner of token.earners){const tr=node('tr');tr.append(node('td',earner.rank),node('td',earner.names.join(', ')||'Unknown player'));const wallet=node('td'),link=node('a',earner.wallet_address);link.href='https://livenet.xrpl.org/accounts/'+encodeURIComponent(earner.wallet_address);link.target='_blank';link.rel='noopener noreferrer';wallet.append(link);tr.append(wallet,node('td',earner.amount),node('td',earner.payouts));body.append(tr);}table.append(body);wrap.append(table);section.append(wrap);host.append(section);
   }
  }catch(error){if(request!==requestId)return;$('statsNote').textContent=error.message;$('visitorsToday').textContent='Unavailable';}
 }
 $('earnerPeriod').addEventListener('change',refresh);return {refresh};
}
