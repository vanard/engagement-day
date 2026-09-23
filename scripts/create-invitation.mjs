import { randomBytes, createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const [site, displayName, destination] = process.argv.slice(2);
if (!site || !displayName?.trim() || [...displayName].length > 100 || !destination) {
  throw new Error('Usage: node scripts/create-invitation.mjs https://your-site.vercel.app "Guest name" /private/path/guest.json');
}
const output = resolve(destination);
const relativePath = relative(process.cwd(), output);
if (!relativePath.startsWith('..')) throw new Error('Save private invitation links outside the project directory.');
const url = new URL(site);
if (url.protocol !== 'https:') throw new Error('Use the HTTPS invitation URL.');
const token = randomBytes(32).toString('base64url');
url.search = new URLSearchParams({ to: displayName }).toString();
url.hash = new URLSearchParams({ token }).toString();
writeFileSync(output, JSON.stringify({
  display_name: displayName.trim(),
  token_hash: createHash('sha256').update(token).digest('hex'),
  invitation_url: url.toString(),
}, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log('Private invitation file created. Insert its display_name and token_hash into invitation_parties before sharing the link.');
