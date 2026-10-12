import {adminClient,requireUser} from './auth.js';
import {fail} from './map-import-validation.js';
import {verifyMapTicket} from './map-import-ticket.js';
export {issueMapTicket} from './map-import-ticket.js';
export async function authenticateMapRequest(req){const header=String(req.headers.authorization||'');if(!header.startsWith('MapTicket '))return requireUser(req);const value=verifyMapTicket(header.slice(10)),admin=adminClient(),{data,error}=await admin.auth.admin.getUserById(value.sub);if(error||!data?.user||data.user.banned_until&&Date.parse(data.user.banned_until)>Date.now())throw fail('Your admin account is unavailable.',401);return{admin,user:data.user};}
