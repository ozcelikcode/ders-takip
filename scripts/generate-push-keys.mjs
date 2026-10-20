// Adds a VAPID key pair for Web Push to backend/.env. Existing keys are never replaced:
// rotating them silently would break every browser subscription.
import { appendFileSync, readFileSync } from 'node:fs';
import webpush from 'web-push';

const file = new URL('../backend/.env', import.meta.url);
let current;
try {
  current = readFileSync(file, 'utf8');
} catch {
  console.error('backend/.env is missing. Run `npm run configure` first.');
  process.exit(1);
}
if (/^VAPID_PUBLIC_KEY=.+/m.test(current)) {
  console.log('VAPID keys already exist in backend/.env; nothing changed.');
  process.exit(0);
}
const contact = process.argv[2] ?? current.match(/^MAIL_FROM=.*?([^\s<>"]+@[^\s<>"]+)/m)?.[1];
if (!contact) {
  console.error('Pass a contact address for push services: npm run push:keys -- you@example.com');
  process.exit(1);
}
const { publicKey, privateKey } = webpush.generateVAPIDKeys();
appendFileSync(file, `${current.endsWith('\n') ? '' : '\n'}VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\nVAPID_SUBJECT=mailto:${contact}\n`);
console.log('Added VAPID keys to backend/.env. Restart the backend to enable browser notifications.');
