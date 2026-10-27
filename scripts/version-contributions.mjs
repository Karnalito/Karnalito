import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

export function versionContributionImages(readme, darkSvg, lightSvg) {
  const version = createHash('sha256')
    .update(darkSvg).update('\0').update(lightSvg)
    .digest('hex').slice(0, 12);
  let updated = readme;
  const urls = [
    ['srcset', 'dark'],
    ['src', 'light'],
  ];
  for (const [attribute, variant] of urls) {
    const pattern = new RegExp('(' + attribute + '=")assets/contributions-' +
      variant + '\\.svg(?:\\?v=[a-f0-9]{12})?(")', 'g');
    const matches = [...updated.matchAll(pattern)];
    if (matches.length !== 1) {
      throw new Error('Expected exactly one ' + variant + ' contribution image, found ' + matches.length);
    }
    updated = updated.replace(pattern, '$1assets/contributions-' + variant + '.svg?v=' + version + '$2');
  }
  return updated;
}

async function main() {
  const [readme, dark, light] = await Promise.all([
    readFile('README.md', 'utf8'),
    readFile('assets/contributions-dark.svg', 'utf8'),
    readFile('assets/contributions-light.svg', 'utf8'),
  ]);
  const next = versionContributionImages(readme, dark, light);
  if (next !== readme) {
    await writeFile('README.md', next);
    console.log('Updated contribution artwork version in README');
  } else {
    console.log('Contribution artwork version unchanged');
  }
}

if (process.argv[1]?.endsWith('version-contributions.mjs')) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
