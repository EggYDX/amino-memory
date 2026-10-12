import { fsrs } from 'ts-fsrs';
import { AMINOS, BY_ID } from '../data/amino';
import type { AppData, Field, Question, Result } from './types';

// Product heuristics, not fitted learning-science constants. Spacing/retrieval evidence:
// https://doi.org/10.1016/j.jml.2006.09.004
export const PRACTICE = { halfLifeDays:14, correctionGap:3, maxAminoShare:0.3, needShare:0.55, newShare:0.25,
  sameDayEvidence:0.25,priorMass:2,borrowedMass:0.5,errorGain:3,riskGain:3,lapseGain:2,manualGain:0.4,
  aminoPenalty:0.6,directionPenalty:0.7 };
export const DAY = 86400000;
export function modeFor(q: Question, f: Field): 'input'|'choice' {
  return f==='structure'||(f==='name'&&q.nameMode==='choice')?'choice':'input';
}
export function skillKey(q: Question, target: Field): string {
  const mode=modeFor(q,target);
  return `${q.amino}|${[...q.known].sort().join('+')}|${target}|${mode}${mode==='choice'?':'+q.choices:''}`;
}
export function allResults(d: AppData): Result[] {
  return [...d.sessions.flatMap(s=>s.results),...(d.active?.results??[])];
}
export function mistakenAmino(r: Result, field: Field): string|undefined {
  const a=r.answers.find(a=>a.field===field);
  if(!a||a.correct||r.status!=='wrong')return;
  const value=a.answer.trim().toLowerCase();
  return AMINOS.find(i=>i.id!==r.question.amino&&(a.mode==='choice'?i.id.toLowerCase()===value:
    field==='name'?[i.name,...i.aliases].includes(a.answer.trim()):field==='one'?i.one.toLowerCase()===value:i.three.toLowerCase()===value))?.id;
}
export function learningIndex(history:Result[]){
  const skills=new Map<string,Result[]>();const amino=new Map<string,Result[]>();
  for(const r of history){if(r.status==='skip')continue;for(const a of r.answers){const list=skills.get(a.key)??[];list.push(r);skills.set(a.key,list);}const list=amino.get(r.question.amino)??[];list.push(r);amino.set(r.question.amino,list);}
  for(const list of skills.values())list.sort((a,b)=>a.at.localeCompare(b.at));
  return {skills,amino};
}
export function skillProfile(d:AppData,key:string,history=allResults(d),now=Date.now(),index=learningIndex(history)) {
  const own=index.skills.get(key)??[];
  let mass=0,fail=0,confusion=0,streak=0;
  const days=new Set<string>();
  for(const r of own){
    const a=r.answers.find(a=>a.key===key)!;
    const age=Math.max(0,now-Date.parse(r.at))/DAY;
    const day=r.at.slice(0,10);const first=!days.has(day);days.add(day);
    // Same-day successes are useful correction evidence, but not independent mastery samples.
    const weight=Math.pow(0.5,age/PRACTICE.halfLifeDays)*(first?1:PRACTICE.sameDayEvidence)*(a.mode==='choice'&&a.correct&&a.recall!=='guess'?1-1/r.question.choices:1);
    mass+=weight;if(!a.correct||a.recall==='guess'){fail+=weight;streak=0;}else streak++;
    if(mistakenAmino(r,a.field))confusion+=weight;
  }
  const amino=key.split('|')[0];
  const other=(index.amino.get(amino)??[]).filter(r=>!r.answers.some(a=>a.key===key)).slice(-6);
  const borrowed=other.length?other.filter(r=>r.status!=='correct').length/other.length:0.5;
  // At most half a prior observation is borrowed; structure and abbreviation skills stay distinct.
  const error=(fail+0.5+(mass<2?borrowed*PRACTICE.borrowedMass:0))/(mass+PRACTICE.priorMass+(mass<2?PRACTICE.borrowedMass:0));
  const last=own.at(-1);const lastAnswer=last?.answers.find(a=>a.key===key);
  const recentFailure=!!lastAnswer&&(!lastAnswer.correct||lastAnswer.recall==='guess')&&now-Date.parse(last!.at)<14*DAY;
  const m=d.memories[key];
  const retrievability=m?fsrs().get_retrievability({...m.card,due:new Date(m.card.due),last_review:m.card.last_review?new Date(m.card.last_review):undefined},new Date(now),false):null;
  const due=!!m&&Date.parse(m.card.due)<=now;
  const risk=retrievability===null?0:Math.max(0,(d.settings.retention-retrievability)/d.settings.retention);
  const weak=recentFailure||(mass>=1.5&&error>0.36&&streak<3)||(risk>0.25&&own.length>=2);
  return {n:own.length,mass,error,streak,recentFailure,confusion:confusion/(mass+1)/(1+streak),due,risk,retrievability,
    weak,lastAt:last?.at,lastCorrect:!!lastAnswer?.correct&&lastAnswer.recall!=='guess',
    priority:1+error*PRACTICE.errorGain/(1+Math.max(0,streak-1))+risk*PRACTICE.riskGain+(recentFailure?PRACTICE.lapseGain:0)+confusion/(mass+1)/(1+streak)+(d.difficult.includes(amino)?PRACTICE.manualGain/(1+streak):0)};
}
export function weakIds(d:AppData,now=Date.now()):string[] {
  const history=allResults(d);const index=learningIndex(history);const keys=new Set(history.flatMap(r=>r.answers.map(a=>a.key)));
  const manual=d.difficult.filter(id=>!index.amino.has(id)||[...keys].filter(k=>k.startsWith(id+'|')).some(k=>skillProfile(d,k,history,now,index).streak<3));
  return [...new Set([...keys].filter(k=>skillProfile(d,k,history,now,index).weak).map(k=>k.split('|')[0]).concat(manual))];
}
export function errorKeys(results:Result[]):string[] {
  return [...new Set(results.flatMap(r=>r.status==='skip'?[]:r.answers.filter(a=>!a.correct||a.recall==='guess').map(a=>a.key)))];
}
export function questionFromKey(key:string):Pick<Question,'amino'|'known'|'targets'|'nameMode'|'choices'> {
  const [amino,known,target,format]=key.split('|');
  return {amino,known:known.split('+') as Field[],targets:[target as Field],nameMode:target==='name'&&format.startsWith('choice')?'choice':'input',choices:format.endsWith(':2')?2:4};
}
export function trainingTitle(c:{mixed:boolean;known:Field[];targets:Field[];scope?:string}) {
  if(c.scope==='due')return '到期复习';
  if(c.mixed)return '混合练习';
  const labels={structure:'结构',name:'名称',three:'三字母',one:'单字母'};
  return `${c.known.map(f=>labels[f]).join('＋')} → ${c.targets.map(f=>labels[f]).join('＋')}`;
}
export function confusionEvidence(results:Result[]) {
  const groups=new Map<string,{from:string;to:string;results:Result[]}>();
  for(const r of results){const others=new Set(r.answers.map(a=>mistakenAmino(r,a.field)).filter((id):id is string=>!!id));
    for(const to of others){const from=r.question.amino;const key=[from,to].sort().join('/');const v=groups.get(key)??{from,to,results:[]};v.results.push(r);groups.set(key,v);}}
  return [...groups.entries()].map(([pair,v])=>({pair,...v})).sort((a,b)=>b.results.length-a.results.length);
}
export const validSkillKey=(key:string)=>{
  const [amino,known,target,format,...rest]=key.split('|');const fields=['structure','name','three','one'];
  if(rest.length||!BY_ID[amino]||!known||!fields.includes(target)||known.split('+').some(f=>!fields.includes(f)||f===target)||new Set(known.split('+')).size!==known.split('+').length)return false;
  const q=questionFromKey(key);return ['input','choice:2','choice:4'].includes(format)&&skillKey({...q,id:'',options:{}},q.targets[0])===key;
};
