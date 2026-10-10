import { mkdir, writeFile } from 'node:fs/promises';
const designs = [
  ['elegant', '#faf7f0', '#243e36', '#a26945', 'AMAYA & KAVIN', 'Together, always'],
  ['cinematic', '#192d30', '#fff5df', '#d3ac68', 'AMAYA & KAVIN', 'A beautiful beginning'],
  ['minimal', '#f4f1eb', '#262626', '#6b7569', 'GOOD COMPANY.', 'Great evening.'],
  ['floral', '#fff6f2', '#583e44', '#a34f68', 'AMAYA & KAVIN', 'A letter from the garden'],
  ['birthday', '#fff5dc', '#472944', '#a94b31', 'MAYA TURNS 30', 'Let’s make a little noise'],
  ['engagement', '#f5eae7', '#603e36', '#986044', 'WE SAID YES', 'Amaya & Kavin'],
  ['traditional', '#542e32', '#fff5dc', '#edc78b', 'GOLDEN GATHERING', 'A celebration of togetherness'],
  ['photo', '#e9ede6', '#263d35', '#646747', 'AMAYA & KAVIN', 'Our story in frames'],
];
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
function branch(x, y, rotate = 0) { return `<g transform="translate(${x} ${y}) rotate(${rotate})" fill="none" stroke-width="1.3"><path d="M0 90Q35 50 100 0"/><ellipse cx="27" cy="53" rx="8" ry="20" transform="rotate(-30 27 53)"/><ellipse cx="54" cy="38" rx="20" ry="7" transform="rotate(-25 54 38)"/><ellipse cx="68" cy="16" rx="6" ry="17" transform="rotate(-25 68 16)"/></g>`; }
await mkdir('public/templates', { recursive: true });
for (const [kind, background, ink, accent, title, subtitle] of designs) {
  let decoration = '';
  if (kind === 'elegant') decoration = `<path d="M52 447V204a148 148 0 0 1 296 0v243Z" fill="none"/>${branch(25,35)}${branch(375,480,180)}`;
  if (kind === 'cinematic') decoration = '<path d="M24 480V180a176 176 0 0 1 352 0v300Z" fill="none"/><path d="M42 462V180a158 158 0 0 1 316 0v282Z" fill="none"/><path d="M200 46v74M166 83h68M176 59l48 48M224 59l-48 48"/><path d="M200 180v285" opacity=".15"/>';
  if (kind === 'minimal') decoration = '<path d="M35 105h330M35 427h330"/><path d="M290 430l35-75" stroke-width="3"/><text x="35" y="83" fill="currentColor" stroke="none" font-family="Arial" font-size="10" letter-spacing="3">AN INVITATION TO GATHER</text>';
  if (kind === 'floral') decoration = `<path d="M65 148Q65 100 115 100h220v270q0 50-50 50H65Z" fill="none"/>${branch(12,35)}${branch(389,495,180)}<g fill="currentColor" opacity=".25"><circle cx="67" cy="87" r="23"/><circle cx="82" cy="71" r="17"/><circle cx="54" cy="69" r="16"/><circle cx="345" cy="456" r="20"/></g>`;
  if (kind === 'birthday') decoration = `<g opacity=".65">${Array.from({length:18},(_,i)=>`<rect x="${15+(i*67)%360}" y="${20+(i*53)%470}" width="6" height="13" rx="2" transform="rotate(${i*17} ${15+(i*67)%360} ${20+(i*53)%470})" fill="currentColor" stroke="none"/>`).join('')}</g><text x="200" y="158" text-anchor="middle" fill="currentColor" stroke="none" font-family="Georgia" font-size="68">✹</text>`;
  if (kind === 'engagement') decoration = '<circle cx="176" cy="140" r="34" fill="none" stroke-width="2"/><circle cx="223" cy="140" r="34" fill="none" stroke-width="2"/><path d="M70 400q130 45 260 0" fill="none"/>';
  if (kind === 'traditional') decoration = '<rect x="24" y="24" width="352" height="472" fill="none"/><rect x="35" y="35" width="330" height="450" fill="none"/><path d="M155 130h90M200 85v90M166 96l68 68M234 96l-68 68M155 425h90M200 380v90M166 391l68 68M234 391l-68 68" stroke-width="1.5"/>';
  if (kind === 'photo') decoration = '<defs><clipPath id="photo"><path d="M55 228V150a145 145 0 0 1 290 0v78Z"/></clipPath></defs><g clip-path="url(#photo)" stroke="none"><rect x="55" y="0" width="290" height="240" fill="#bfcdb9"/><circle cx="271" cy="81" r="31" fill="#fff3d3"/><path d="M55 170q100-95 190 0t100-20v110H55Z" fill="#81977e"/><path d="M55 210q110-70 190-2t100-15v80H55Z" fill="#556e58"/></g>';
  const top = kind === 'photo' ? 302 : 246;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520"><rect width="400" height="520" fill="${background}"/><g stroke="${accent}" color="${accent}">${decoration}</g><g fill="${ink}" text-anchor="middle"><text x="200" y="${top-42}" font-family="Arial,sans-serif" font-size="8" letter-spacing="2.5">WITH LOVE, YOU ARE INVITED</text><text x="200" y="${top}" font-family="${kind === 'minimal' || kind === 'birthday' ? 'Arial,sans-serif' : 'Georgia,serif'}" font-size="${kind === 'traditional' ? 23 : 28}" letter-spacing="${kind === 'minimal' ? '-1' : '0'}">${escape(title)}</text><text x="200" y="${top+35}" font-family="Georgia,serif" font-style="italic" font-size="17">${escape(subtitle)}</text><path d="M174 ${top+65}h52" stroke="${accent}"/><text x="200" y="${top+94}" font-family="Arial,sans-serif" font-size="9" letter-spacing="2">YOUR DATE · YOUR PLACE</text></g></svg>`;
  await writeFile(`public/templates/${kind}.svg`, svg);
}
console.log('Generated eight original SVG posters.');
