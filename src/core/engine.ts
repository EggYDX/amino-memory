import { AMINOS, BY_ID } from '../data/amino';
import { FIELDS, LABEL, DEFAULT_CONFIG, type AppData, type Config, type Field, type Question, type Result, type Session, type Status, type TargetResult } from './types';
import { updateMemories } from './memory';

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
export function validateConfig(c: Config): string | null {
  if (!c.known.length || !c.targets.length) return '至少选择一个已知条件和一个考察目标';
  if (c.known.some(f => c.targets.includes(f))) return '已知条件与考察目标不能重叠';
  if (![...c.known,...c.targets].every(f => FIELDS.includes(f))) return '考察内容无效';
  if (!Number.isSafeInteger(c.count) || c.count < 1) return '题量必须是正整数';
  if (!c.title.trim()) return '请输入训练名称';
  return null;
}
export function modeFor(q: Question, f: Field): 'input' | 'choice' {
  return f === 'structure' || (f === 'name' && q.nameMode === 'choice') ? 'choice' : 'input';
}
export function skillKey(q: Question, target: Field): string {
  const mode = modeFor(q,target);
  return `${q.amino}|${[...q.known].sort().join('+')}|${target}|${mode}${mode==='choice' ? ':'+q.choices : ''}`;
}
export function allResults(d: AppData): Result[] { return [...d.sessions.flatMap(s=>s.results), ...(d.active?.results ?? [])]; }
export function weakIds(d: AppData): string[] {
  const results = allResults(d);
  const skills=new Map<string,{amino:string;n:number;correct:number}>();
  for(const r of results)if(r.status!=='skip')for(const a of r.answers){const v=skills.get(a.key)??{amino:r.question.amino,n:0,correct:0};v.n++;if(a.correct)v.correct++;skills.set(a.key,v);}
  return [...new Set([...skills.values()].filter(v=>v.n>=3&&v.correct/v.n<0.75).map(v=>v.amino))];
}
export function dueMemories(d: AppData, now = Date.now()) {
  return Object.values(d.memories).filter(m=>new Date(m.card.due).getTime()<=now).sort((a,b)=>a.card.due.localeCompare(b.card.due));
}
export function poolFor(c: Config, d: AppData): string[] {
  switch(c.scope) {
    case 'standard': return AMINOS.filter(a=>a.standard).map(a=>a.id);
    case 'selected': return [...new Set(c.selected)].filter(id=>BY_ID[id]);
    case 'favorites': return d.favorites;
    case 'errors': return [...new Set(allResults(d).filter(r=>r.status==='wrong'||r.status==='reveal').map(r=>r.question.amino))];
    case 'weak': return weakIds(d);
    case 'due': return [...new Set(dueMemories(d).map(m=>m.amino))];
    default: return AMINOS.map(a=>a.id);
  }
}
const shuffle = <T,>(items: T[], random: ()=>number): T[] => {
  const a=[...items]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a;
};
function directions(c: Config, d: AppData, amino: string, results: Result[]): Pick<Question,'known'|'targets'|'nameMode'|'choices'>[] {
  if(c.scope==='due') {
    const mem = dueMemories(d).filter(m=>m.amino===amino&&!results.some(r=>r.answers.some(a=>a.key===m.key)));
    if(mem.length) return mem.map(m=>({known:m.known,targets:[m.target],nameMode:m.target==='name'?m.mode:'input',choices:m.choices??4}));
    const practiced=results.filter(r=>r.question.amino===amino).map(r=>r.question);
    if(practiced.length)return [...new Map(practiced.map(q=>[q.targets.map(f=>skillKey(q,f)).join('|'),{known:q.known,targets:q.targets,nameMode:q.nameMode,choices:q.choices}])).values()];
  }
  if(!c.mixed) return [{known:c.known,targets:c.targets,nameMode:c.nameMode,choices:c.choices}];
  return [
    {known:['structure'],targets:['name']}, {known:['structure'],targets:['three','one']},
    {known:['name'],targets:['three','one']}, {known:['three'],targets:['name']},
    {known:['one'],targets:['name']}, {known:['three'],targets:['one']},
    {known:['one'],targets:['three']}, {known:['name'],targets:['structure']},
  ].map(x=>({...x,known:x.known as Field[],targets:x.targets as Field[],nameMode:c.nameMode,choices:c.choices}));
}
export function nextQuestion(s: Session, d: AppData, random=Math.random): Question {
  if(!s.pool.length) throw new Error('没有可练习的氨基酸，请修改范围');
  const counts=Object.fromEntries(s.pool.map(id=>[id,s.results.filter(r=>r.question.amino===id).length]));
  const uncovered=s.pool.filter(id=>counts[id]===0);
  const last=s.results.at(-1)?.question.amino;
  let candidates=uncovered.length ? uncovered : s.pool.filter(id=>s.pool.length===1 || id!==last);
  if(!candidates.length) candidates=s.pool;
  const history=allResults(d);
  if(s.config.scope==='due') {
    const unanswered=dueMemories(d).filter(m=>s.pool.includes(m.amino)&&!s.results.some(r=>r.answers.some(a=>a.key===m.key)));
    if(unanswered.length)candidates=[...new Set(unanswered.map(m=>m.amino))].filter(id=>unanswered.length===1||id!==last);
    if(!candidates.length)candidates=[...new Set(unanswered.map(m=>m.amino))];
  }
  const scored=candidates.flatMap(amino=>directions(s.config,d,amino,s.results).map(dir=>{
    const q:Question={id:'',amino,...dir,options:{}};
    const keys=dir.targets.map(f=>skillKey(q,f));
    const past=history.flatMap(r=>r.answers.map(a=>({a,r}))).filter(x=>keys.includes(x.a.key)&&x.r.status!=='skip');
    const wrong=past.filter(x=>!x.a.correct).length;
    const slow=past.filter(x=>x.a.correct && x.r.ms>12000).length;
    const local=s.results.filter(r=>r.question.amino===amino);
    const dirCount=local.filter(r=>r.answers.some(a=>keys.includes(a.key))).length;
    let score:number;
    if(s.config.strategy==='balanced') score=-counts[amino]*12-dirCount*3;
    else if(s.config.strategy==='weak') score=wrong*4+slow*0.3-dirCount*1.2-counts[amino]*0.5;
    else score=(wrong*3+slow*0.4)/(past.length+2)*5-dirCount*1.3-counts[amino]*0.6;
    // First cover all amino acids. Then coverage and direction-specific errors compete.
    return {q,score:score+random()*0.2};
  }));
  scored.sort((a,b)=>b.score-a.score);
  const q={...scored[0].q,id:crypto.randomUUID()};
  for(const target of q.targets) if(modeFor(q,target)==='choice') {
    const distractors=shuffle(AMINOS.filter(a=>a.id!==q.amino),random)
      .sort((a,b)=>Number(BY_ID[q.amino].confused.includes(b.id))-Number(BY_ID[q.amino].confused.includes(a.id)));
    q.options[target]=shuffle([q.amino,...distractors.slice(0,q.choices-1).map(a=>a.id)],random);
  }
  return q;
}
export function startSession(config: Config, d: AppData, now=Date.now()): Session {
  const err=validateConfig(config); if(err) throw new Error(err);
  const pool=poolFor(config,d); if(!pool.length) throw new Error('此范围暂无可练习项目，请修改范围');
  const s:Session={id:crypto.randomUUID(),config:structuredClone(config),pool,started:new Date(now).toISOString(),results:[],question:null,draft:{},questionStarted:now,paused:false,pauseMs:0};
  s.question=nextQuestion(s,d); return s;
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
  const next={...s,draft:{},questionStarted:now,pauseMs:0}; next.question=nextQuestion(next,d);
  return {...d,active:next};
}
export function finish(d: AppData, now=Date.now()): AppData {
  if(!d.active) return d;
  return {...d,active:null,sessions:[...d.sessions,{...d.active,ended:new Date(now).toISOString(),question:null,draft:{},paused:false}]};
}
export function pause(d: AppData, paused: boolean, now=Date.now()): AppData {
  const s=d.active; if(!s || s.paused===paused) return d;
  return {...d,active:{...s,paused,pausedAt:paused?now:undefined,pauseMs:s.pauseMs+(paused?0:Math.max(0,now-(s.pausedAt??now)))}};
}
export function stats(results: Result[]) {
  const answered=results.filter(r=>r.status==='correct'||r.status==='wrong');
  const first=results.filter(r=>r.repeat===0);
  return {total:results.length,answered:answered.length,correct:results.filter(r=>r.status==='correct').length,
    wrong:results.filter(r=>r.status==='wrong').length,revealed:results.filter(r=>r.status==='reveal').length,
    skipped:results.filter(r=>r.status==='skip').length,
    accuracy:answered.length ? Math.round(answered.filter(r=>r.status==='correct').length/answered.length*100):null,
    firstAccuracy:first.length?Math.round(first.filter(r=>r.status==='correct').length/first.length*100):null,
    coverage:new Set(results.map(r=>r.question.amino)).size,
    repeats:results.filter(r=>r.repeat>0).length};
}
export function directionLabel(q: Question, target?: Field): string {
  return `${q.known.map(f=>LABEL[f]).join('＋')} → ${target?LABEL[target]:q.targets.map(f=>LABEL[f]).join('＋')}`;
}
