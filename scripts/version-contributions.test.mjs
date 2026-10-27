import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionContributionImages } from './version-contributions.mjs';

const readme = '<picture><source media="(prefers-color-scheme: dark)" srcset="assets/contributions-dark.svg" /><img src="assets/contributions-light.svg" alt="Activity" /></picture>';
test('refreshes both theme URLs using the same deterministic content hash', () => {
  const updated = versionContributionImages(readme, '<svg>dark</svg>', '<svg>light</svg>');
  const paths = [...updated.matchAll(/contributions-(?:dark|light)\.svg\?v=([a-f0-9]{12})/g)];
  assert.equal(paths.length, 2);
  assert.equal(paths[0][1], paths[1][1]);
  assert.equal(versionContributionImages(updated, '<svg>dark</svg>', '<svg>light</svg>'), updated);
});
test('changes version when either SVG changes', () => {
  const first = versionContributionImages(readme, 'one', 'two');
  assert.notEqual(versionContributionImages(first, 'one!', 'two'), first);
  assert.notEqual(versionContributionImages(first, 'one', 'two!'), first);
});
test('preserves surrounding profile content and fails on missing URLs', () => {
  const original = 'Intro\n' + readme + '\nWorkbench';
  const changed = versionContributionImages(original, 'A', 'B');
  assert.ok(changed.startsWith('Intro\n') && changed.endsWith('\nWorkbench'));
  assert.throws(() => versionContributionImages('<picture/>', 'A', 'B'), /Expected exactly one/);
});
