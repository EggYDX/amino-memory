import { AMINOS, BY_ID } from '../data/amino';
import { FIELDS, LABEL, DEFAULT_CONFIG, type AppData, type Config, type Field, type Question, type Result, type Session, type Status, type TargetResult } from './types';
import { updateMemories } from './memory';
import { allResults, errorKeys, learningIndex, mistakenAmino, modeFor, PRACTICE, questionFromKey, skillKey, skillProfile, validSkillKey, weakIds } from './learning';
export { allResults, errorKeys, modeFor, skillKey, trainingTitle, weakIds } from './learning';

export const MODES = [
  { title:'看结构，背缩写', known:['structure'], targets:['three','one'] },
  { title:'看名称，背缩写', known:['name'], targets:['three','one'] },
  { title:'看缩写，认名称', known:['three'], targets:['name'] },
  { title:'缩写互相转换', known:['three'], targets:['one'] },
  { title:'看结构，认名称', known:['structure'], targets:['name'] },
  { title:'看名称，选结构', known:['name'], targets:['structure'] },
  { title:'混合训练', known:['structure'], targets:['three','one'], mixed:true },
] as const;
export const modeConfig = (i: number): Config => ({...DEFAULT_CONFIG, ...MODES[i], known:[...MODES[i].known], targets:[...MODES[i].targets]});
export function reinforcementConfig(results:Result[],title='重点练习'):Config {
  const keys=errorKeys(results);const originals=[...new Set(keys.map(k=>k.split('|')[0]))];
  const actual=results.flatMap(r=>r.answers.map(a=>mistakenAmino(r,a.field))).filter((id):id is string=>!!id);
  const selected=[...new Set([...originals,...actual])];for(const id of originals){for(const other of BY_ID[id].confused)if(selected.length<3&&!selected.includes(other))selected.push(other);}
  const patterns=[...new Set(keys.map(k=>k.split('|').slice(1).join('|')))];
  const focusKeys=selected.flatMap(id=>patterns.map(pattern=>`${id}|${pattern}`));
  return {...DEFAULT_CONFIG,title,scope:'selected',selected,mixed:true,strategy:'adaptive',count:Math.min(22,Math.max(1,focusKeys.length*2)),...(focusKeys.length?{focusKeys}:{})};
}
export function validateConfig(c: Config): string | null {
  if (!c.known.length || !c.targets.length) return '至少选择一个已知条件和一个考察目标';
  if (c.known.some(f => c.targets.includes(f))) return '已知条件与考察目标不能重叠';
  if (![...c.known,...c.targets].every(f => FIELDS.includes(f))) return '考察内容无效';
  if (!Number.isSafeInteger(c.count) || c.count < 1) return '题量必须是正整数';
  if (!c.title.trim()) return '请输入训练名称';
  if(c.focusKeys&&(!c.focusKeys.length||c.focusKeys.some(k=>!validSkillKey(k))))return '专项记忆方向无效';
  return null;
}
export function dueMemories(d: AppData, now = Date.now()) {
  return Object.values(d.memories).filter(m=>new Date(m.card.due).getTime()<=now).sort((a,b)=>a.card.due.localeCompare(b.card.due));
}
export function poolFor(c: Config, d: AppData, now=Date.now()): string[] {
  switch(c.scope) {
    case 'standard': return AMINOS.filter(a=>a.standard).map(a=>a.id);
    case 'selected': return [...new Set(c.selected)].filter(id=>BY_ID[id]);
    case 'favorites': return d.favorites;
    case 'errors': return [...new Set(allResults(d).filter(r=>r.status==='wrong'||r.status==='reveal').map(r=>r.question.amino))];
    case 'weak': return weakIds(d);
    case 'due': return [...new Set(dueMemories(d,now).map(m=>m.amino))];
    default: return AMINOS.map(a=>a.id);
  }
}
const shuffle = <T,>(items: T[], random: ()=>number): T[] => {
  const a=[...items]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a;
};
function directions(c: Config, d: AppData, amino: string): Pick<Question,'known'|'targets'|'nameMode'|'choices'>[] {
  const focused=c.focusKeys??((c.scope==='errors'||c.scope==='weak')&&c.mixed?errorKeys(allResults(d)):undefined);
  if(focused){const keys=focused.filter(k=>k.split('|')[0]===amino);if(keys.length)return keys.map(questionFromKey);}
  if(!c.mixed) return [{known:c.known,targets:c.targets,nameMode:c.nameMode,choices:c.choices}];
  return [
    {known:['structure'],targets:['name']}, {known:['structure'],targets:['three','one']},
    {known:['name'],targets:['three','one']}, {known:['three'],targets:['name']},
    {known:['one'],targets:['name']}, {known:['three'],targets:['one']},
    {known:['one'],targets:['three']}, {known:['name'],targets:['structure']},
  ].map(x=>({...x,known:x.known as Field[],targets:x.targets as Field[],nameMode:c.nameMode,choices:c.choices}));
}
export function nextQuestion(s: Session, d: AppData, random=Math.random, now=Date.now()): Question {
  if(!s.pool.length) throw new Error('没有可练习的氨基酸，请修改范围');
  const counts=Object.fromEntries(s.pool.map(id=>[id,s.results.filter(r=>r.question.amino===id).length]));
  const last=s.results.at(-1)?.question.amino;
  const history=allResults(d);
  const index=learningIndex(history);
  let scored=s.pool.flatMap(amino=>directions(s.config,d,amino).map(dir=>{
    const q:Question={id:'',amino,...dir,options:{}};
    const keys=dir.targets.map(f=>skillKey(q,f));
    const profiles=keys.map(k=>skillProfile(d,k,history,now,index));
    const local=s.results.filter(r=>r.answers.some(a=>keys.includes(a.key)));
    const previous=local.at(-1);const gap=previous?s.results.length-1-s.results.indexOf(previous):Infinity;
    const failed=previous&&previous.answers.some(a=>keys.includes(a.key)&&(!a.correct||a.recall==='guess'))&&previous.status!=='skip';
    return {q,keys,profiles,dirCount:local.length,gap,retest:!!failed,
      kind:profiles.some(p=>p.weak||p.due)||(d.difficult.includes(amino)&&profiles.some(p=>p.streak<3))?'need':profiles.every(p=>p.n===0)?'new':'keep',
      weight:Math.max(...profiles.map(p=>p.priority))/(1+counts[amino]*PRACTICE.aminoPenalty+local.length*PRACTICE.directionPenalty),
      lifetime:profiles.reduce((n,p)=>n+p.n,0)};
  }));
  if(s.config.scope==='due'){
    // Freeze the due-direction list at launch; a successful answer can immediately change its due date.
    const keys=s.reviewKeys??dueMemories(d,Date.parse(s.started)).map(m=>m.key);
    scored=keys.filter(k=>!s.results.some(r=>r.answers.some(a=>a.key===k))).map(key=>{
      const q={...questionFromKey(key),id:'',options:{}} as Question;
      const p=skillProfile(d,key,history,now,index);return {q,keys:[key],profiles:[p],dirCount:0,gap:Infinity,retest:false,kind:'need',weight:p.priority,lifetime:p.n};
    });
    if(!scored.length)throw new Error('本轮到期方向已复习完毕');
  }
  const take=(items:typeof scored)=>{const total=items.reduce((n,x)=>n+x.weight,0);let draw=Math.min(0.999999,Math.max(0,random()))*total;return items.find(x=>(draw-=x.weight)<0)??items.at(-1)!;};
  const other=scored.filter(x=>x.q.amino!==last);if(other.length&&!(s.pool.length===2&&s.config.mixed))scored=other;
  const gap=Math.min(PRACTICE.correctionGap,Math.max(1,scored.length-1));
  const spaced=scored.filter(x=>x.gap>=gap);if(spaced.length)scored=spaced;
  const cap=Math.max(2,Math.ceil(s.config.count*PRACTICE.maxAminoShare));
  const diverse=scored.filter(x=>counts[x.q.amino]<cap);if(diverse.length)scored=diverse;
  let selected:typeof scored[number];
  if(s.config.strategy==='balanced'&&s.config.scope!=='due'){
    const minimum=Math.min(...scored.map(x=>counts[x.q.amino]));
    const round=scored.filter(x=>counts[x.q.amino]===minimum);
    const n=Math.min(...round.map(x=>x.dirCount));const dirs=round.filter(x=>x.dirCount===n);
    const lifetime=Math.min(...dirs.map(x=>x.lifetime));selected=take(dirs.filter(x=>x.lifetime===lifetime));
  }else{
    const ready=scored.filter(x=>x.retest&&x.gap>=gap);
    if(ready.length)selected=take(ready);
    else if(s.config.strategy==='weak'){
      const weak=scored.filter(x=>x.profiles.some(p=>p.weak)||(d.difficult.includes(x.q.amino)&&x.profiles.some(p=>p.streak<3)));
      selected=take(weak.length?weak:scored);
    }else{
      const hasWork=scored.some(x=>x.kind!=='keep');
      const buckets={need:scored.filter(x=>x.kind==='need'),new:scored.filter(x=>x.kind==='new'),keep:scored.filter(x=>x.kind==='keep'&&(!hasWork||counts[x.q.amino]===0))};
      // Lottery shares reserve exploration; redistribute unavailable shares instead of forcing coverage first.
      const available=[['need',PRACTICE.needShare],['new',PRACTICE.newShare],['keep',1-PRACTICE.needShare-PRACTICE.newShare]] as const;
      const bins=available.filter(([key])=>buckets[key].length);const total=bins.reduce((sum,x)=>sum+x[1],0);
      let draw=random()*total;const bucket=bins.find(x=>(draw-=x[1])<0)??bins.at(-1)!;selected=take(buckets[bucket[0]]);
    }
  }
  const q={...selected.q,id:crypto.randomUUID()};
  for(const target of q.targets) if(modeFor(q,target)==='choice') {
    const actual=history.filter(r=>r.question.amino===q.amino&&now-Date.parse(r.at)<14*86400000).flatMap(r=>r.answers.map(a=>mistakenAmino(r,a.field)));
    const distractors=shuffle(AMINOS.filter(a=>a.id!==q.amino),random)
      .sort((a,b)=>Number(actual.includes(b.id))-Number(actual.includes(a.id))||Number(BY_ID[q.amino].confused.includes(b.id))-Number(BY_ID[q.amino].confused.includes(a.id)));
    q.options[target]=shuffle([q.amino,...distractors.slice(0,q.choices-1).map(a=>a.id)],random);
  }
  return q;
}
export function startSession(config: Config, d: AppData, now=Date.now()): Session {
  const err=validateConfig(config); if(err) throw new Error(err);
  const pool=poolFor(config,d,now); if(!pool.length) throw new Error('此范围暂无可练习项目，请修改范围');
  const reviewKeys=config.scope==='due'?dueMemories(d,now).filter(m=>pool.includes(m.amino)).map(m=>m.key):undefined;
  const s:Session={id:crypto.randomUUID(),config:{...structuredClone(config),...(reviewKeys?{count:Math.min(config.count,reviewKeys.length)}:{})},pool,started:new Date(now).toISOString(),results:[],question:null,draft:{},questionStarted:now,paused:false,pauseMs:0,...(reviewKeys?{reviewKeys}:{})};
  s.question=nextQuestion(s,d,Math.random,now); return s;
}
export function answerValue(q: Question, field: Field): string { return field==='structure' ? q.amino : BY_ID[q.amino][field]; }
export function checkAnswer(q: Question, field: Field, value: string, caseSensitive=true): boolean {
  const v=value.trim(); const a=BY_ID[q.amino];
  if(modeFor(q,field)==='choice') return v===a.id;
  if(field==='name') return [a.name,...a.aliases].includes(v);
  const expected=answerValue(q,field);
  return caseSensitive ? v===expected : v.toLowerCase()===expected.toLowerCase();
}
export function submit(d: AppData, action: 'answer'|'reveal'|'skip', now=Date.now()): AppData {
  const s=d.active; if(!s || !s.question || s.paused || s.results.some(r=>r.question.id===s.question!.id)) return d;
  const q=s.question;
  if(action==='answer' && q.targets.some(f=>!s.draft[f]?.trim())) throw new Error('请完成所有考察内容再提交');
  const answers:TargetResult[]=q.targets.map(field=>({field,answer:s.draft[field]?.trim()??'',correct:action==='answer'&&checkAnswer(q,field,s.draft[field]??'',d.settings.caseSensitive),mode:modeFor(q,field),key:skillKey(q,field),scheduled:false}));
  const status:Status=action==='reveal'?'reveal':action==='skip'?'skip':answers.every(a=>a.correct)?'correct':'wrong';
  const result:Result={id:crypto.randomUUID(),question:q,answers,status,at:new Date(now).toISOString(),ms:Math.max(0,now-s.questionStarted-s.pauseMs),repeat:s.results.filter(r=>r.question.amino===q.amino).length};
  const memories=updateMemories(d.memories,result,s.id,d.settings.retention);
  return {...d,updated:new Date(now).toISOString(),memories,active:{...s,results:[...s.results,result]}};
}
export function advance(d: AppData, now=Date.now()): AppData {
  const s=d.active; if(!s || !s.question || !s.results.some(r=>r.question.id===s.question!.id)) return d;
  if(s.results.length>=s.config.count) return finish(d,now);
  const next={...s,draft:{},questionStarted:now,pauseMs:0}; next.question=nextQuestion(next,d,Math.random,now);
  return {...d,active:next};
}
export function finish(d: AppData, now=Date.now()): AppData {
  if(!d.active) return d;
  if(!d.active.results.length)return {...d,active:null};
  return {...d,active:null,sessions:[...d.sessions,{...d.active,ended:new Date(now).toISOString(),question:null,draft:{},paused:false}]};
}
export function pause(d: AppData, paused: boolean, now=Date.now()): AppData {
  const s=d.active; if(!s || s.paused===paused) return d;
  return {...d,active:{...s,paused,pausedAt:paused?now:undefined,pauseMs:s.pauseMs+(paused?0:Math.max(0,now-(s.pausedAt??now)))}};
}
export function stats(results: Result[]) {
  const answered=results.filter(r=>r.status==='correct'||r.status==='wrong');
  const encountered=new Set<string>();const first=results.filter(r=>{const keys=r.answers.map(a=>a.key);const fresh=keys.some(k=>!encountered.has(k));keys.forEach(k=>encountered.add(k));return fresh;});
  const targets=answered.flatMap(r=>r.answers);const pendingErrors=new Set<string>();
  const corrections=results.filter(r=>{const retest=(r.status==='correct'||r.status==='wrong')&&r.answers.some(a=>pendingErrors.has(a.key));if(r.status!=='skip')r.answers.forEach(a=>{if(a.correct&&a.recall!=='guess')pendingErrors.delete(a.key);else pendingErrors.add(a.key);});return retest;});
  const crossDay=answered.filter(r=>r.answers.some(a=>a.reviewKind==='review'));
  return {total:results.length,answered:answered.length,correct:results.filter(r=>r.status==='correct').length,
    wrong:results.filter(r=>r.status==='wrong').length,revealed:results.filter(r=>r.status==='reveal').length,
    skipped:results.filter(r=>r.status==='skip').length,
    accuracy:answered.length ? Math.round(answered.filter(r=>r.status==='correct').length/answered.length*100):null,
    firstAccuracy:first.length?Math.round(first.filter(r=>r.status==='correct').length/first.length*100):null,
    targetAccuracy:targets.length?Math.round(targets.filter(a=>a.correct).length/targets.length*100):null,
    correctionAccuracy:corrections.length?Math.round(corrections.filter(r=>r.status==='correct'&&!r.answers.some(a=>a.recall==='guess')).length/corrections.length*100):null,
    correctionCount:corrections.length,crossDayAccuracy:crossDay.length?Math.round(crossDay.filter(r=>r.status==='correct').length/crossDay.length*100):null,
    coverage:new Set(results.map(r=>r.question.amino)).size,
    repeats:results.filter(r=>r.repeat>0).length};
}
export function directionLabel(q: Question, target?: Field): string {
  return `${q.known.map(f=>LABEL[f]).join('＋')} → ${target?LABEL[target]:q.targets.map(f=>LABEL[f]).join('＋')}`;
}
