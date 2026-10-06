export async function saveArcadeSettings({form,body,api,onSaved,status}) {
 const button=form.querySelector('button.save');button.disabled=true;
 try {
  const result=await api('admin-rule',body),rule=result.rule;
  if(!rule||rule.game_id!==body.game_id)throw new Error('Saved reward settings could not be confirmed. Refresh and try again.');
  for(const key of ['atm_per_coin','daily_atm_limit','max_coins','payload_program_slug'])form.elements.namedItem(key).value=rule[key]??'';
  form.elements.namedItem('enabled').checked=rule.enabled===true;
  onSaved(rule);
  status('Rewards saved. These are the current game settings.');
  return true;
 }catch(error){status(error.message);return false;}
 finally{button.disabled=false;}
}
