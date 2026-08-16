import webpush from 'web-push';

const keys=webpush.generateVAPIDKeys();
console.log('ATM TOWN — WEB PUSH VAPID KEYS');
console.log('Add these to ATM Town Vercel → Settings → Environment Variables.');
console.log('');
console.log(`WEB_PUSH_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`WEB_PUSH_VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('WEB_PUSH_VAPID_SUBJECT=https://atm-town-web.vercel.app');
console.log('');
console.log('Keep WEB_PUSH_VAPID_PRIVATE_KEY private. Do not commit it to Git.');
