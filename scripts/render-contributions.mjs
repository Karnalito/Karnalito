import fs from 'node:fs/promises';

const DAY = 86400000;
const login = process.env.PROFILE_LOGIN || 'Karnalito';
const token = process.env.GITHUB_TOKEN;
const themes = {
  dark: {bg:'#0B1020',panel:'#111A2C',line:'#293552',bright:'#EFF4FF',text:'#B9C6E1',muted:'#8295BA',accent:'#75C9F4',violet:'#9B88F6',levels:['#1C2941','#29456D','#426CA4','#6889D4','#8DCFF8']},
  light:{bg:'#F8FAFF',panel:'#FFFFFF',line:'#D8E2F2',bright:'#152344',text:'#3D5276',muted:'#687FA1',accent:'#256EA8',violet:'#6954C5',levels:['#EAF0F9','#C0DCF2','#8FBCE7','#6E91D1','#6259C9']}
};
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const day=d=>d.toISOString().slice(0,10);
const format=n=>new Intl.NumberFormat('en-US').format(n);
const square=(x,y,w,h,color,r=0,extra='')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+color+'" '+extra+'/>';
const label=(x,y,words,size,color,weight=400,spacing=0,anchor='start')=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="'+size+'" font-weight="'+weight+'" text-anchor="'+anchor+'" letter-spacing="'+spacing+'">'+xml(words)+'</text>';

export function dataModel(calendar, today=new Date()){
  if(!calendar || !Array.isArray(calendar.weeks))throw Error('Contribution calendar unavailable');
  const endDate=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()));
  const fromDate=new Date(endDate.getTime()-364*DAY);
  const from=day(fromDate),end=day(endDate);
  const found=new Map();
  for(const week of calendar.weeks)for(const entry of week.contributionDays || []){
    if(entry.date<from||entry.date>end)continue;
    if(!/^\d{4}-\d\d-\d\d$/.test(entry.date)||!Number.isSafeInteger(entry.contributionCount)||entry.contributionCount<0||found.has(entry.date))throw Error('Malformed contribution days');
    found.set(entry.date,entry.contributionCount);
  }
  if(found.size!==365)throw Error('Incomplete contribution calendar: '+found.size+'/365 days');
  const days=[];
  for(let t=fromDate.getTime();t<=endDate.getTime();t+=DAY){const date=day(new Date(t));days.push({date,count:found.get(date)});}
  let total=0,activeDays=0,longest=0,run=0;
  for(const d of days){total+=d.count;if(d.count){activeDays++;run++;longest=Math.max(longest,run);}else run=0;}
  const byDay=new Map(days.map(d=>[d.date,d.count]));
  let check=endDate;
  if(!byDay.get(end))check=new Date(endDate.getTime()-DAY);
  let current=0;while(byDay.get(day(check))>0){current++;check=new Date(check.getTime()-DAY);}
  return {days,total,activeDays,longest,current,end,max:Math.max(1,...days.map(d=>d.count))};
}
export function render(model,themeName){
  const c=themes[themeName];if(!c)throw Error('Unknown theme');
  const {days,total,activeDays,longest,current,end,max}=model;
  const out=['<svg xmlns="http://www.w3.org/2000/svg" width="1056" height="315" viewBox="0 0 1056 315" role="img" aria-labelledby="activity-title activity-desc">'];
  out.push('<title id="activity-title">Karnalito GitHub activity, past 365 days</title>');
  out.push('<desc id="activity-desc">'+xml(format(total)+' contributions, '+activeDays+' active days, '+current+' day current streak, '+longest+' day longest streak.')+'</desc>');
  out.push('<defs><linearGradient id="bar" x1="0" x2="1"><stop offset="0%" stop-color="'+c.accent+'"/><stop offset="100%" stop-color="'+c.violet+'"/></linearGradient><linearGradient id="scan"><stop offset="0%" stop-color="'+c.accent+'" stop-opacity="0"/><stop offset="50%" stop-color="'+c.accent+'" stop-opacity="0.18"/><stop offset="100%" stop-color="'+c.accent+'" stop-opacity="0"/></linearGradient><clipPath id="matrix-clip"><rect x="308" y="144" width="681" height="92" rx="3"/></clipPath></defs>');
  out.push(square(1,1,1054,313,c.bg,18,'stroke="'+c.line+'" stroke-width="1.5"'));
  out.push(square(23,23,1010,270,c.panel,12));out.push(square(23,23,4,270,'url(#bar)',2));
  out.push(label(48,51,'FIELD REPORT  /  ACTIVITY INTELLIGENCE',12,c.accent,700,1.9));
  out.push(label(987,51,'HOURLY REFRESH TARGET  /  UTC',11,c.muted,600,1.1,'end'));out.push('<circle cx="1005" cy="46" r="3.5" fill="'+c.accent+'"><animate attributeName="opacity" values="0.25;1;0.25" dur="3.4s" repeatCount="indefinite"/></circle>');
  out.push('<path d="M 48 65 H 1008" stroke="'+c.line+'"/>');
  out.push(label(48,107,'TOTAL CONTRIBUTIONS',12,c.muted,700,1.2));
  out.push(label(48,165,format(total),49,c.bright,750));
  out.push(label(48,194,'Through '+end,12,c.muted));
  out.push('<path d="M 274 81 V 263" stroke="'+c.line+'"/>');
  out.push(label(295,105,'CONTRIBUTION MATRIX',12,c.text,700,1.5));
  const first=new Date(days[0].date+'T00:00:00Z');
  first.setUTCDate(first.getUTCDate()-first.getUTCDay());
  let month='',lastMonthX=-100;
  for(const entry of days){
    const date=new Date(entry.date+'T00:00:00Z');
    const delta=Math.round((date.getTime()-first.getTime())/DAY),week=Math.floor(delta/7);
    const x=311+week*12.75,y=148+date.getUTCDay()*12.75;
    const bucket=entry.count===0?0:Math.min(4,1+Math.floor(entry.count/max*3.999));
    out.push(square(x.toFixed(1),y.toFixed(1),9.7,9.7,c.levels[bucket],2));
    const ym=entry.date.slice(0,7);
    if(ym!==month){month=ym;if(x-lastMonthX>36){out.push(label(x.toFixed(1),132,date.toLocaleDateString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase(),10,c.muted,600));lastMonthX=x;}}
  }
  out.push('<g clip-path="url(#matrix-clip)" pointer-events="none"><rect x="275" y="145" width="44" height="89" fill="url(#scan)"><animate attributeName="x" values="275;1012" dur="18s" repeatCount="indefinite"/></rect></g>');
  const latest=days.findLast(entry=>entry.count>0);
  if(latest){
    const date=new Date(latest.date+'T00:00:00Z');
    const delta=Math.round((date.getTime()-first.getTime())/DAY);
    const x=(311+Math.floor(delta/7)*12.75).toFixed(1),y=(148+date.getUTCDay()*12.75).toFixed(1);
    out.push('<rect x="'+x+'" y="'+y+'" width="9.7" height="9.7" rx="2" fill="none" stroke="'+c.accent+'" stroke-width="1.25"><animate attributeName="stroke-opacity" values="0.2;1;0.2" dur="3.6s" repeatCount="indefinite"/></rect>');
  }
  out.push(label(296,165,'S',10,c.muted));out.push(label(296,203,'W',10,c.muted));out.push(label(296,241,'S',10,c.muted));
  out.push(label(48,232,'ACTIVE DAYS',11,c.muted,650,1));
  out.push(label(48,257,format(activeDays),21,c.accent,700));
  out.push(label(151,232,'LONGEST STREAK',11,c.muted,650,.6));
  out.push(label(151,257,longest+'d',21,c.violet,700));
  out.push(label(297,279,'CURRENT STREAK  '+current+'D',10,c.muted,700,.75));
  out.push(label(860,279,'LESS',10,c.muted,650));
  c.levels.forEach((v,i)=>out.push(square(897+i*16,269,11,11,v,2)));
  out.push(label(992,279,'MORE',10,c.muted,650));
  out.push('</svg>');
  return out.join('\n');
}
async function main(){
 if(!token)throw Error('GITHUB_TOKEN missing');
 if(!/^[a-zA-Z0-9-]{1,39}$/.test(login))throw Error('Invalid profile username');
 const query='query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}';
 const response=await fetch('https://api.github.com/graphql',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','User-Agent':'profile-dashboard'},body:JSON.stringify({query,variables:{login}}),signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('GitHub GraphQL HTTP '+response.status);
 const json=await response.json();
 if(json.errors?.length)throw Error(json.errors.map(e=>e.message).join('; '));
 const model=dataModel(json.data?.user?.contributionsCollection?.contributionCalendar);
 await fs.mkdir('assets',{recursive:true});
 for(const t of ['dark','light'])await fs.writeFile('assets/contributions-'+t+'.svg',render(model,t)+'\n');
 console.log('Refreshed dashboard: '+model.total+' contributions / '+model.activeDays+' active days');
}
if(process.argv[1]?.endsWith('render-contributions.mjs'))main().catch(e=>{console.error(e);process.exitCode=1;});