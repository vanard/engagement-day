import { randomBytes, createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

// One code per invitation group. Guests in the same group share the code; `?to=` only
// changes the greeting on each guest's link.
const [site, groupName, destination, ...guestNames] = process.argv.slice(2);
if (!site || !groupName?.trim() || [...groupName].length > 100 || !destination) {
  throw new Error('Usage: node scripts/create-invitation.mjs https://your-site.vercel.app "Group name" /private/path/group.json ["Guest name" ...]');
}
const guests = guestNames.map((name) => name.trim());
if (guests.some((name) => !name || [...name].length > 100)) throw new Error('Guest names must be 1-100 characters.');
const output = resolve(destination);
const relativePath = relative(process.cwd(), output);
if (!relativePath.startsWith('..')) throw new Error('Save private invitation links outside the project directory.');
const base = new URL(site);
if (base.protocol !== 'https:') throw new Error('Use the HTTPS invitation URL.');
// 12 random bytes = 96 bits, 16 URL-safe characters.
const token = randomBytes(12).toString('base64url');
const link = (guest) => {
  const url = new URL(base);
  url.search = guest ? new URLSearchParams({ to: guest }).toString() : '';
  url.hash = token;
  return url.toString();
};
writeFileSync(output, JSON.stringify({
  display_name: groupName.trim(),
  token_hash: createHash('sha256').update(token).digest('hex'),
  group_link: link(),
  guest_links: guests.map((name) => ({ name, url: link(name) })),
}, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log('Private group file created. Insert its display_name and token_hash into invitation_parties before sharing the links.');
