import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('js/email-policy.js','utf8'),domains=readFileSync('data/email-policy/disposable-domains.txt','utf8');
function policy(fetcher=async()=>({ok:true,text:async()=>domains})){const context={window:{},fetch:fetcher};vm.runInNewContext(source,context);return context.window.ATMEmailPolicy;}
test('blocks known disposable services, aliases, case changes and subdomains',async()=>{const p=policy();for(const d of ['yopmail.com','YOPMAIL.COM','sub.yopmail.com','petchi.uk','pngk.uk','adadad.uk','sharklasers.com','guerrillamail.org','macr2.com','instaddr.win'])assert.equal(await p.isDisposable('player@'+d),true,d);});
test('keeps established providers and work/school domains available, without substring matches',async()=>{const p=policy();for(const d of ['gmail.com','googlemail.com','outlook.com','hotmail.com','icloud.com','yahoo.com','proton.me','protonmail.com','tutamail.com','taylorfarms.com','student.funaab.edu.ng','notyopmail.com','yopmail.com.example.org'])assert.equal(await p.isDisposable('player@'+d),false,d);});
test('a failed list load can be retried',async()=>{let count=0;const p=policy(async()=>{if(++count===1)return{ok:false};return{ok:true,text:async()=>domains};});await assert.rejects(p.isDisposable('player@yopmail.com'));assert.equal(await p.isDisposable('player@yopmail.com'),true);});
