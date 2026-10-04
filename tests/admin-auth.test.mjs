import test from 'node:test';
import assert from 'node:assert/strict';
import {adminSignInOptions,sendAdminSignInLink} from '../admin/auth.js';
import {requireTownAdmin} from '../lib/town-economy.js';
test('admin email login uses existing accounts and returns to the admin page',async()=>{
 let request;const client={auth:{async signInWithOtp(options){request=options;return {error:null};}}};
 await sendAdminSignInLink(client,'  existing@example.com  ','https://atmtown.fun');
 assert.deepEqual(request,{email:'existing@example.com',options:{shouldCreateUser:false,emailRedirectTo:'https://atmtown.fun/admin/'}});
});
test('preview email returns use one stable allowlisted branch URL',()=>{
 assert.equal(adminSignInOptions('https://atm-town-llpzv4fvx-colton-adams-s-projects.vercel.app').emailRedirectTo,'https://atm-town-web-git-admin-arcade-rewards-colton-adams-s-projects.vercel.app/admin/');
});
test('email validation and provider errors do not claim a link was sent',async()=>{
 const client={auth:{async signInWithOtp(){return {error:new Error('Email rate limit exceeded')};}}};
 await assert.rejects(sendAdminSignInLink(client,'invalid','https://atmtown.fun'),/Enter the email/);
 await assert.rejects(sendAdminSignInLink(client,'existing@example.com','https://atmtown.fun'),/rate limit/);
});
test('missing admin setup fails closed with a clear message',async()=>{
 const client={from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:null,error:{code:'PGRST205'}};}};}};
 await assert.rejects(requireTownAdmin(client,{id:'existing-user'}),error=>error.status===503&&error.message.includes('setup is pending'));
});
