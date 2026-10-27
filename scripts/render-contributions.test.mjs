import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dataModel,render} from './render-contributions.mjs';

function sample(end='2026-10-27'){
  const last=Date.parse(end+'T00:00:00Z'),days=[];
  for(let i=364;i>=0;i--){const date=new Date(last-i*86400000).toISOString().slice(0,10);days.push({date,contributionCount:0});}
  return {weeks:[{contributionDays:days}]};
}
test('365 day window and accurate totals',()=>{
 const c=sample();c.weeks[0].contributionDays.at(-1).contributionCount=2;
 c.weeks[0].contributionDays.at(-2).contributionCount=4;
 const m=dataModel(c,new Date('2026-10-27T11:00:00Z'));
 assert.equal(m.total,6);assert.equal(m.activeDays,2);
 assert.equal(m.current,2);assert.equal(m.longest,2);
 assert.equal(m.days.length,365);
});
test('current streak includes yesterday when today is empty',()=>{
 const c=sample();c.weeks[0].contributionDays.at(-2).contributionCount=2;
 const m=dataModel(c,new Date('2026-10-27T00:00:00Z'));assert.equal(m.current,1);
});
test('missing data fails instead of publishing misleading zero contributions',()=>{
 assert.throws(()=>dataModel({weeks:[]},new Date('2026-10-27T10:00:00Z')),/Incomplete/);
});
test('both SVG themes provide accessible safe vector graphics',()=>{
 const m=dataModel(sample(),new Date('2026-10-27T10:00:00Z'));
 for(const theme of ['dark','light']){
  const svg=render(m,theme);
  assert.match(svg,/aria-labelledby="activity-title activity-desc"/);
  assert.match(svg,/FIELD REPORT/);assert.match(svg,/CONTRIBUTION MATRIX/);
  assert.ok((svg.match(/<rect /g)||[]).length>=365);
  assert.doesNotMatch(svg,/<script|<foreignObject|<animate/);
 }
});