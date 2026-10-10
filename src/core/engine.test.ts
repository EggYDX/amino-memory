import { describe,it,expect } from 'vitest';
import { AMINOS, BY_ID } from '../data/amino';
import { freshData, DEFAULT_CONFIG, FIELDS, type AppData, type Config, type Question } from './types';
import { advance, allResults, answerValue, checkAnswer, finish, modeConfig, nextQuestion, pause, poolFor, skillKey, startSession, stats, submit, validateConfig, weakIds, dueMemories } from './engine';
import { validateImport, exportJSON, mergeData, saveData, loadData } from './storage';
import 'fake-indexeddb/auto';
const start=(c:Partial<Config>={}):AppData=>{const d=freshData();d.active=startSession({...DEFAULT_CONFIG,...c},d,100000);return d;};
const answerAll=(d:AppData,correct=true,now=110000)=>{const q=d.active!.question!;d={...d,active:{...d.active!,draft:Object.fromEntries(q.targets.map(f=>[f,correct?(q.options[f]?q.amino:answerValue(q,f)):'错误']))}};return submit(d,'answer',now);};
const seeded=()=>{let n=42;return ()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};};

describe('amino data and question contracts',()=>{
  it('contains the exact 22 mappings, unique assets and 20 standard entries',()=>{
    expect(AMINOS.map(a=>`${a.three}/${a.one}`).join(',')).toBe('Gly/G,Ala/A,Val/V,Leu/L,Ile/I,Ser/S,Thr/T,Cys/C,Met/M,Asp/D,Glu/E,Asn/N,Gln/Q,Lys/K,Arg/R,His/H,Phe/F,Tyr/Y,Trp/W,Pro/P,Sec/U,Pyl/O');
    expect(new Set(AMINOS.map(a=>a.structure)).size).toBe(22);expect(AMINOS.filter(a=>a.standard)).toHaveLength(20);
  });
  it.each([0,1,2,3,4,5,6])('runs quick mode %s',i=>{const d=start(modeConfig(i));const q=d.active!.question!;expect(q.known.some(f=>q.targets.includes(f))).toBe(false);expect(answerAll(d).active!.results[0].status).toBe('correct');});
  it('generates every legal known/target combination, including all four custom examples',()=>{
    let legal=0;
    for(let k=1;k<16;k++)for(let t=1;t<16;t++){
      const known=FIELDS.filter((_,i)=>k&(1<<i));const targets=FIELDS.filter((_,i)=>t&(1<<i));const c={...DEFAULT_CONFIG,known,targets};
      if(k&t){expect(validateConfig(c)).toBeTruthy();continue;}legal++;
      for(const nameMode of ['input','choice'] as const){const d=start({...c,nameMode});const q=d.active!.question!;expect(q.known).toEqual(known);expect(q.targets).toEqual(targets);expect(answerAll(d).active!.results[0].status).toBe('correct');for(const f of ['three','one'] as const)expect(q.options[f]).toBeUndefined();}
    }
    expect(legal).toBe(50);
  });
  it('keeps four distinct structure choices with exactly one correct answer even in a one-item pool',()=>{
    const d=start({known:['name'],targets:['structure'],scope:'selected',selected:['Pyl']});const q=d.active!.question!;
    expect(q.options.structure).toHaveLength(4);expect(new Set(q.options.structure).size).toBe(4);expect(q.options.structure!.filter(a=>a==='Pyl')).toHaveLength(1);
  });
  it('supports two-choice Chinese questions without making abbreviation choices',()=>{
    const d=start({known:['three'],targets:['name','one'],nameMode:'choice',choices:2});expect(d.active!.question!.options.name).toHaveLength(2);expect(d.active!.question!.options.one).toBeUndefined();
  });
  it('checks case, trims only whitespace, and accepts registered aliases only',()=>{
    const q:Question={id:'q',amino:'Glu',known:['structure'],targets:['three','one'],nameMode:'input',choices:4,options:{}};
    expect(checkAnswer(q,'three',' Glu ')).toBe(true);expect(checkAnswer(q,'three','GLU')).toBe(false);expect(checkAnswer(q,'one','e')).toBe(false);expect(checkAnswer(q,'one','e',false)).toBe(true);
    expect(checkAnswer({...q,amino:'Met'},'name','蛋氨酸')).toBe(true);expect(checkAnswer({...q,amino:'Met'},'name','蛋氨')).toBe(false);
  });
  it('validates empty, overlapping and invalid count configurations',()=>{
    for(const c of [{known:[]},{targets:[]},{known:['three'],targets:['three']},{count:0},{count:2.5},{count:NaN},{count:-1}])expect(validateConfig({...DEFAULT_CONFIG,...c} as Config)).toBeTruthy();
    expect(validateConfig({...DEFAULT_CONFIG,count:1000})).toBeNull();expect(()=>start({scope:'favorites'})).toThrow('暂无');
  });
});
describe('sessions and scheduling',()=>{
  it.each([22,50,100])('completes %s questions with all 22 covered first, without adjacent repeats',count=>{
    let d=start({count});const random=seeded();
    for(let i=0;i<count;i++){d.active!.question=nextQuestion(d.active!,d,random);d=answerAll(d,true,100000+i*15000+5000);if(i===21)expect(new Set(d.active!.results.map(r=>r.question.amino)).size).toBe(22);if(i>0)expect(d.active!.results.at(-1)!.question.amino).not.toBe(d.active!.results.at(-2)!.question.amino);d=advance(d,110000+i*15000);}
    expect(d.active).toBeNull();expect(d.sessions[0].results).toHaveLength(count);expect(stats(d.sessions[0].results).repeats).toBe(count-22);
  });
  it.each(['adaptive','balanced','weak'] as const)('handles a single amino and 100 repeated answers using %s',strategy=>{
    let d=start({scope:'selected',selected:['Sec'],count:100,strategy});for(let i=0;i<100;i++){d=answerAll(d,i%2===0,110000+i*20000);d=advance(d,115000+i*20000);}expect(d.sessions[0].results).toHaveLength(100);expect(Object.values(d.memories).every(m=>m.card.reps===1)).toBe(true);expect(weakIds(d)).toContain('Sec');
  });
  it('balanced rotation stays uniform; adaptive and weak use direction-specific wrong history',()=>{
    let d=start({scope:'selected',selected:['Asp','Asn','Glu'],strategy:'balanced',count:50});for(let i=0;i<50;i++){d=answerAll(d);d=advance(d);}const counts=['Asp','Asn','Glu'].map(id=>d.sessions[0].results.filter(r=>r.question.amino===id).length);expect(Math.max(...counts)-Math.min(...counts)).toBeLessThanOrEqual(1);
    let history=start({scope:'selected',selected:['Asp'],count:5});for(let i=0;i<5;i++){history=answerAll(history,false,110000+i*10000);history=advance(history);}
    const balanced=startSession({...DEFAULT_CONFIG,count:50,selected:['Asp','Asn','Glu'],scope:'selected',strategy:'balanced'},history);const adaptive=structuredClone(balanced);adaptive.config.strategy='adaptive';const weak=structuredClone(balanced);weak.config.strategy='weak';
    const covered=history.sessions[0].results.slice(0,3).map((r,i)=>({...r,question:{...r.question,amino:['Asp','Asn','Glu'][i]}}));
    for(const s of [balanced,adaptive,weak])s.results=covered;
    const ctx={...history,active:null};expect(nextQuestion(adaptive,ctx,()=>0).amino).toBe('Asp');expect(nextQuestion(weak,ctx,()=>0).amino).toBe('Asp');
  });
  it('records partial credit, answer reveals and skips separately; double submission is ignored',()=>{
    let d=start({scope:'selected',selected:['Glu'],count:3});d.active!.draft={three:'Glu',one:'e'};d=submit(d,'answer',110000);expect(d.active!.results[0].status).toBe('wrong');expect(d.active!.results[0].answers.map(a=>a.correct)).toEqual([true,false]);expect(submit(d,'answer',111000)).toBe(d);
    d=advance(d);d=submit(d,'reveal');d=advance(d);d=submit(d,'skip');d=advance(d);expect(stats(d.sessions[0].results)).toMatchObject({wrong:1,revealed:1,skipped:1,accuracy:0});
  });
  it('pause excludes paused duration, and early finish preserves submitted answers',()=>{
    let d=start();d=pause(d,true,102000);expect(submit(d,'skip',108000)).toBe(d);d=pause(d,false,112000);d=answerAll(d,true,115000);expect(d.active!.results[0].ms).toBe(5000);d=finish(d,116000);expect(d.sessions[0].results).toHaveLength(1);
  });
  it('FSRS updates once per exact skill per rolling 24h; choice and recall stay distinct',()=>{
    let d=start({known:['structure'],targets:['name'],scope:'selected',selected:['Glu'],count:2});d=answerAll(d,true,100000);d=advance(d);d=answerAll(d,true,110000);expect(Object.values(d.memories)[0].card.reps).toBe(1);d=finish(d);
    d.active=startSession({...DEFAULT_CONFIG,known:['structure'],targets:['name'],scope:'selected',selected:['Glu']},d,120000);d=answerAll(d,true,125000);expect(Object.values(d.memories)[0].card.reps).toBe(1);d=finish(d);
    d.active=startSession({...DEFAULT_CONFIG,known:['structure'],targets:['name'],scope:'selected',selected:['Glu']},d,86500000);d=answerAll(d,true,86510000);expect(Object.values(d.memories)[0].card.reps).toBe(2);d=finish(d);
    d.active=startSession({...DEFAULT_CONFIG,known:['structure'],targets:['name'],nameMode:'choice',scope:'selected',selected:['Glu']},d,86520000);d=answerAll(d,true,86525000);expect(Object.values(d.memories)).toHaveLength(2);expect(Object.values(d.memories).find(m=>m.mode==='choice')!.reviews[0].rating).toBe(2);
  });
  it('higher retention shortens future intervals and due reviews preserve exact skills',()=>{
    const base=start({count:1});base.active!.question!.amino='Glu';let low=structuredClone(base);let high=structuredClone(base);low.settings.retention=.7;high.settings.retention=.99;low=answerAll(low);high=answerAll(high);expect(new Date(Object.values(high.memories)[0].card.due).getTime()).toBeLessThanOrEqual(new Date(Object.values(low.memories)[0].card.due).getTime());
    let d=finish(high);for(const m of Object.values(d.memories))m.card.due=new Date(0).toISOString();expect(dueMemories(d)).toHaveLength(2);const s=startSession({...DEFAULT_CONFIG,scope:'due',mixed:true},d);expect(s.question!.targets).toHaveLength(1);expect(d.memories[skillKey(s.question!,s.question!.targets[0])]).toBeTruthy();
  });
  it('mixed training exposes all direction types over a balanced long session',()=>{
    let d=start({count:100,mixed:true,strategy:'balanced'});for(let i=0;i<100;i++){d=answerAll(d);d=advance(d);}const signatures=new Set(d.sessions[0].results.map(r=>r.question.known.join('+')+'>'+r.question.targets.join('+')));expect(signatures.size).toBe(8);
  });
  it('due sessions cover every original due skill and repeat only those skills beyond the due count',()=>{
    let d=finish(answerAll(start({scope:'selected',selected:['Glu'],count:1})));
    for(const m of Object.values(d.memories))m.card.due=new Date(0).toISOString();
    const original=new Set(Object.keys(d.memories));d.active=startSession({...DEFAULT_CONFIG,scope:'due',mixed:true,count:5},d);
    for(let i=0;i<5;i++){const q=d.active!.question!;expect(original.has(skillKey(q,q.targets[0]))).toBe(true);d=answerAll(d,true,200000+i*20000);d=advance(d,210000+i*20000);}
    const keys=new Set(d.sessions.at(-1)!.results.slice(0,2).flatMap(r=>r.answers.map(a=>a.key)));expect(keys).toEqual(original);
  });
});
describe('persistence and backup boundaries',()=>{
  it('round trips sessions, memory, favorites, presets, drafts and IndexedDB',async()=>{
    let d=answerAll(start());d.active!.draft={three:'Gly',one:'G'};d.favorites=['Pyl'];d.presets=[{id:'preset',config:DEFAULT_CONFIG}];const exported=JSON.parse(exportJSON(d));const restored=validateImport(exported);expect(restored.active!.draft).toEqual(d.active!.draft);expect(restored.memories).toEqual(d.memories);await saveData(restored);expect((await loadData()).presets).toEqual(d.presets);
  });
  it('validates schema, configuration, unique choices and record consistency before import',()=>{
    const d=answerAll(start({known:['name'],targets:['structure']}));
    for(const mutate of [(x:any)=>x.version=2,(x:any)=>x.favorites=['xxx'],(x:any)=>x.settings.retention=1.1,(x:any)=>x.active.config.count=-1,(x:any)=>x.active.question.options.structure=['Gly','Gly','Gly','Gly'],(x:any)=>x.active.results[0].repeat=10,(x:any)=>x.active.results[0].answers[0].key='fake']){const copy=JSON.parse(exportJSON(d));mutate(copy);expect(()=>validateImport(copy)).toThrow();}
  });
  it('merging the same backup twice never duplicates sessions, favorites or presets',()=>{
    let d=finish(answerAll(start()));d.favorites=['Met'];d.presets=[{id:'p',config:DEFAULT_CONFIG}];const merged=mergeData(mergeData(freshData(),d),d);expect(merged.sessions).toHaveLength(1);expect(merged.favorites).toEqual(['Met']);expect(merged.presets).toHaveLength(1);expect(allResults(merged)).toHaveLength(1);
  });
  it('empty dynamic scopes are explicit and aliases share a single source of truth',()=>{
    for(const scope of ['favorites','errors','weak','due'] as const)expect(poolFor({...DEFAULT_CONFIG,scope},freshData())).toEqual([]);expect(BY_ID.Met.aliases).toContain('蛋氨酸');
  });
});
