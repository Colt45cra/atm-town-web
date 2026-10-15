/* Signup guidance mirrors the database policy; the database is authoritative. */
(function(global){
 'use strict';
 let domainsPromise;
 async function isDisposable(email){
  const domain=String(email||'').trim().toLowerCase().split('@')[1]?.replace(/\.$/,'')||'';
  if(!domain)return false;
  if(!domainsPromise)domainsPromise=fetch('/data/email-policy/disposable-domains.txt',{cache:'no-cache'}).then(async response=>{
   if(!response.ok)throw new Error('Could not check your email provider. Please try again.');
   return new Set((await response.text()).trim().split(/\r?\n/));
  }).catch(error=>{domainsPromise=null;throw error;});
  const domains=await domainsPromise,labels=domain.split('.');
  for(let i=0;i<labels.length-1;i++)if(domains.has(labels.slice(i).join('.')))return true;
  return false;
 }
 global.ATMEmailPolicy={isDisposable,message:'Temporary or disposable email addresses are not accepted. Please use a regular email address such as Gmail, Outlook, iCloud, Yahoo, or your work or school email.'};
})(window);
