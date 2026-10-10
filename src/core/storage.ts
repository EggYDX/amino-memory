import { openDB } from 'idb';
import { BY_ID } from '../data/amino';
import { checkAnswer, modeFor, pause, skillKey, validateConfig } from './engine';
import { FIELDS, freshData, type AppData, type Config, type Field, type Memory, type Question, type Result, type Session, type StoredCard } from './types';

const database = () => openDB('amino-memory',1,{upgrade(db){db.createObjectStore('state');}});
export async function loadData(): Promise<AppData> {
  const db=await database(); const value=await db.get('state','main'); db.close();
  if(value===undefined) return freshData();
  const data=validateImport(value);
  return data.active&&!data.active.paused?pause(data,true,Date.parse(data.updated)):data;
}
export async function saveData(data: AppData) {
  const db=await database(); await db.put('state',data,'main'); db.close();
}
export function exportJSON(data: AppData): string { return JSON.stringify({...data,updated:new Date().toISOString()},null,2); }
const bad = (s='文件数据无效') => { throw new Error(s); };
function object(x: unknown): Record<string,unknown> {
  if(!x || typeof x!=='object' || Array.isArray(x)) return bad();
  return x as Record<string,unknown>;
}
const textValue=(x:unknown,max=2000):string=>typeof x==='string'&&x.length<=max?x:bad();
const bool=(x:unknown):boolean=>typeof x==='boolean'?x:bad();
const num=(x:unknown,min=0,max=Number.MAX_SAFE_INTEGER):number=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max?x:bad();
const integer=(x:unknown,min=0,max=Number.MAX_SAFE_INTEGER):number=>Number.isSafeInteger(x)?num(x,min,max):bad();
const array=(x:unknown,max=100000):unknown[]=>Array.isArray(x)&&x.length<=max?x:bad('列表格式或长度无效');
const date=(x:unknown):string=>{const s=textValue(x,40);if(!Number.isFinite(Date.parse(s)))return bad('日期格式无效');return new Date(s).toISOString();};
const id=(x:unknown):string=>{const s=textValue(x,10);return BY_ID[s]?s:bad('未知的氨基酸');};
const unique=<T,>(a:T[]):T[]=>new Set(a).size===a.length?a:bad('文件包含重复项目');
const ids=(x:unknown)=>unique(array(x,22).map(id));
const field=(x:unknown):Field=>FIELDS.includes(x as Field)?x as Field:bad();
const fields=(x:unknown)=>unique(array(x,4).map(field));
const choice=(x:unknown):2|4=>x===2||x===4?x:bad();
const nameMode=(x:unknown):'input'|'choice'=>x==='input'||x==='choice'?x:bad();
function config(x:unknown):Config {
  const o=object(x); const c:Config={title:textValue(o.title,100),known:fields(o.known),targets:fields(o.targets),
    scope:textValue(o.scope) as Config['scope'], selected:ids(o.selected),count:integer(o.count,1),
    strategy:textValue(o.strategy) as Config['strategy'],nameMode:nameMode(o.nameMode),choices:choice(o.choices),mixed:bool(o.mixed)};
  if(!['all','standard','selected','favorites','errors','weak','due'].includes(c.scope)||!['adaptive','balanced','weak'].includes(c.strategy)||validateConfig(c))return bad('训练配置无效');
  return c;
}
function question(x:unknown):Question {
  const o=object(x);const q:Question={id:textValue(o.id,100),amino:id(o.amino),known:fields(o.known),targets:fields(o.targets),nameMode:nameMode(o.nameMode),choices:choice(o.choices),options:{}};
  if(!q.id||!q.known.length||!q.targets.length||q.known.some(f=>q.targets.includes(f)))return bad('题目配置无效');
  const opts=object(o.options);
  for(const f of q.targets) if(modeFor(q,f)==='choice') {
    const options=ids(opts[f]);if(options.length!==q.choices||options.filter(a=>a===q.amino).length!==1)return bad('题目选项无效');q.options[f]=options;
  }
  return q;
}
function result(x:unknown):Result {
  const o=object(x);const q=question(o.question);const status=textValue(o.status) as Result['status'];
  if(!['correct','wrong','reveal','skip'].includes(status))return bad();
  const answers=array(o.answers,4).map(a=>{
    const t=object(a);const f=field(t.field);const answer=textValue(t.answer);const mode=nameMode(t.mode);const correct=bool(t.correct);
    if(!q.targets.includes(f)||mode!==modeFor(q,f)||t.key!==skillKey(q,f))return bad('答题记录与题目不一致');
    if((status==='skip'||status==='reveal')&&correct)return bad('答题结果无效');
    if(correct && !checkAnswer(q,f,answer,false))return bad('答题结果无效');
    return {field:f,answer,mode,correct,key:skillKey(q,f),scheduled:bool(t.scheduled)};
  });
  unique(answers.map(a=>a.field));
  if(answers.length!==q.targets.length||(status==='correct'&&!answers.every(a=>a.correct))||(status==='wrong'&&answers.every(a=>a.correct)))return bad('答题结果无效');
  return {id:textValue(o.id,100),question:q,answers,status,at:date(o.at),ms:num(o.ms),repeat:integer(o.repeat)};
}
function session(x:unknown,active=false):Session {
  const o=object(x);const c=config(o.config);const pool=ids(o.pool);if(!pool.length)return bad('训练范围为空');
  const results=array(o.results).map(result);unique(results.map(r=>r.id));unique(results.map(r=>r.question.id));
  if(results.length>c.count)return bad('训练记录超过题量');
  const seen:Record<string,number>={};for(const r of results){if(!pool.includes(r.question.amino)||r.repeat!==(seen[r.question.amino]??0))return bad('重复次数无效');seen[r.question.amino]=(seen[r.question.amino]??0)+1;}
  const q=o.question===null?null:question(o.question);if(active&&(!q||!pool.includes(q.amino)))return bad('未完成训练格式无效');
  const draft:Session['draft']={};for(const [k,v] of Object.entries(object(o.draft))) {const f=field(k);if(q&&!q.targets.includes(f))return bad();draft[f]=textValue(v);}
  return {id:textValue(o.id,100),config:c,pool,started:date(o.started),...(o.ended?{ended:date(o.ended)}:{}),results,question:q,draft,
    questionStarted:num(o.questionStarted),paused:bool(o.paused),...(o.pausedAt!==undefined?{pausedAt:num(o.pausedAt)}:{}),pauseMs:num(o.pauseMs)};
}
function memory(x:unknown):Memory {
  const o=object(x);const c=object(o.card);const known=fields(o.known);const target=field(o.target);const mode=nameMode(o.mode);
  const choices=o.choices===undefined?undefined:choice(o.choices);
  const m:Memory={key:textValue(o.key),amino:id(o.amino),known,target,mode,...(choices?{choices}:{}),
    card:{due:date(c.due),stability:num(c.stability),difficulty:num(c.difficulty,0,10),elapsed_days:num(c.elapsed_days),scheduled_days:num(c.scheduled_days),reps:integer(c.reps),lapses:integer(c.lapses),state:integer(c.state,0,3),learning_steps:integer(c.learning_steps),...(c.last_review?{last_review:date(c.last_review)}:{})} as StoredCard,
    reviews:array(o.reviews).map(v=>{const r=object(v);return {at:date(r.at),rating:integer(r.rating,1,4),session:textValue(r.session,100)};})};
  const q:Question={id:'',amino:m.amino,known,targets:[target],nameMode:target==='name'?mode:'input',choices:choices??4,options:{}};
  if(!known.length||known.includes(target)||modeFor(q,target)!==mode||m.key!==skillKey(q,target)||!m.reviews.length||m.card.reps!==m.reviews.length)return bad('复习状态无效');
  for(let i=1;i<m.reviews.length;i++)if(Date.parse(m.reviews[i].at)<Date.parse(m.reviews[i-1].at))return bad('复习顺序无效');
  return m;
}
export function validateImport(value: unknown): AppData {
  const o=object(value);if(o.version!==1)return bad('备份版本不支持，请使用版本1的备份');
  const s=object(o.settings);const theme=textValue(s.theme) as AppData['settings']['theme'];if(!['light','dark','system'].includes(theme))return bad();
  const sessions=array(o.sessions).map(x=>session(x));unique(sessions.map(s=>s.id));
  const active=o.active===null?null:session(o.active,true);if(active&&sessions.some(s=>s.id===active.id))return bad('训练编号重复');
  unique([...sessions,...(active?[active]:[])].flatMap(s=>s.results.map(r=>r.id)));
  const memories:Record<string,Memory>={};for(const [key,v] of Object.entries(object(o.memories))){const m=memory(v);if(key!==m.key)return bad('复习索引无效');memories[key]=m;}
  const presets=array(o.presets,100).map(x=>{const p=object(x);return {id:textValue(p.id,100),config:config(p.config)};});unique(presets.map(p=>p.id));
  return {version:1,updated:date(o.updated),settings:{theme,retention:num(s.retention,0.7,0.99),caseSensitive:bool(s.caseSensitive),autoNext:bool(s.autoNext)},favorites:ids(o.favorites),difficult:ids(o.difficult),sessions,active,memories,presets};
}
export function mergeData(current:AppData,incoming:AppData):AppData {
  const sessions=new Map(current.sessions.map(s=>[s.id,s]));for(const s of incoming.sessions){const previous=sessions.get(s.id);if(!previous||s.results.length>previous.results.length)sessions.set(s.id,s);}
  const memories={...current.memories};for(const [key,m] of Object.entries(incoming.memories)){if(!memories[key]||Date.parse(m.reviews.at(-1)!.at)>Date.parse(memories[key].reviews.at(-1)!.at))memories[key]=m;}
  const active=current.active??incoming.active;
  return {...current,updated:new Date().toISOString(),sessions:[...sessions.values()].filter(s=>s.id!==active?.id).sort((a,b)=>a.started.localeCompare(b.started)),memories,
    favorites:[...new Set([...current.favorites,...incoming.favorites])],difficult:[...new Set([...current.difficult,...incoming.difficult])],
    presets:[...new Map([...incoming.presets,...current.presets].map(p=>[p.id,p])).values()],active};
}
