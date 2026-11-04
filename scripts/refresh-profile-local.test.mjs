import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const source = resolve('scripts/refresh-profile-local.sh');
function fixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'profile-refresh-test-'));
  const repo = join(root, 'repo');
  mkdirSync(join(repo, 'scripts'), {recursive: true});
  mkdirSync(join(root, 'bin'));
  const script = join(repo, 'scripts/refresh-profile-local.sh');
  copyFileSync(source, script);
  const writes = join(root, 'commands.log');
  const mockgit = `#!/bin/bash
printf 'git %s\\n' "$*" >> "$LOG_FILE"
case "$*" in
'branch --show-current') echo "\${MOCK_BRANCH:-main}";;
'remote get-url origin') echo 'https://github.com/Karnalito/Karnalito.git';;
'status --porcelain --untracked-files=no') echo "\${MOCK_STATUS:-}";;
'diff --cached --quiet') [[ "\${MOCK_DIFF:-1}" == 0 ]];;
'push origin HEAD:main') [[ "\${MOCK_PUSH_FAIL:-0}" == 0 ]];;
esac
`;
  writeFileSync(join(root,'bin','git'),mockgit,{mode:0o755});
  writeFileSync(join(root,'bin','node'),`#!/bin/bash\nprintf 'node %s\\n' "$*" >> "$LOG_FILE"\n`,{mode:0o755});
  writeFileSync(join(root,'bin','gh'),`#!/bin/bash\nprintf 'gh %s\\n' "$*" >> "$LOG_FILE"\necho 'fake-token'\n`,{mode:0o755});
  const launcher = join(root,'installed-script');
  symlinkSync(script,launcher);
  const env={...process.env, HOME:root, XDG_CACHE_HOME:join(root,'cache'), PATH:join(root,'bin')+':'+process.env.PATH, LOG_FILE:writes, GITHUB_TOKEN:'test-token', ...overrides};
  const result=spawnSync('/bin/bash',[launcher],{encoding:'utf8',env,timeout:10000});
  const commands=readFileSync(writes,'utf8');
  rmSync(root,{recursive:true,force:true});
  return {result,commands};
}
test('success: tests, render, version and publish only expected artifacts',()=>{
  const {result,commands}=fixture();
  assert.equal(result.status,0,result.stderr);
  assert.match(commands,/node --test scripts\/render-contributions.test.mjs/);
  assert.match(commands,/node scripts\/render-contributions.mjs/);
  assert.match(commands,/git add -- README.md assets\/contributions-dark.svg assets\/contributions-light.svg/);
  assert.match(commands,/git push origin HEAD:main/);
});
test('dirty checkout blocks all pull, render and publishing',()=>{
  const {result,commands}=fixture({MOCK_STATUS:' M README.md'});
  assert.equal(result.status,1);
  assert.doesNotMatch(commands,/git pull|git push|node --test/);
});
test('other branch blocks all writes',()=>{
  const {result,commands}=fixture({MOCK_BRANCH:'feature'});
  assert.equal(result.status,1);
  assert.doesNotMatch(commands,/git pull|git push|node --test/);
});
test('no generated diff avoids a commit and push',()=>{
  const {result,commands}=fixture({MOCK_DIFF:'0'});
  assert.equal(result.status,0,result.stderr);
  assert.doesNotMatch(commands,/git push|git -c/);
});
test('failed push preserves generated commit and reports failure',()=>{
  const {result,commands}=fixture({MOCK_PUSH_FAIL:'1'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/Local generated commit preserved/);
  assert.match(commands,/git push origin HEAD:main/);
});
