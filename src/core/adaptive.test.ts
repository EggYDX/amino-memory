import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AMINOS, BY_ID } from '../data/amino';
import { advance, answerValue, dueMemories, finish, nextQuestion, reinforcementConfig, skillKey, startSession, stats, submit, weakIds } from './engine';
import { DAY, confusionEvidence, skillProfile } from './learning';
import { reviseRecall } from './memory';
import { exportJSON, mergeData, validateImport } from './storage';
import { DEFAULT_CONFIG, freshData, type AppData, type Config, type Field, type Question, type Result } from './types';
const NOW=Date.parse('2026-10-12T04:00:00Z');
const random=(seed=42)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const record=(amino:string,correct:boolean,at=NOW-DAY,known:Field[]=['structure'],target:Field='three',answer?:string):Result=>{
  const q:Question={id:crypto.randomUUID(),amino,known,targets:[target],nameMode:'input',choices:4,options:{}};
  return {id:crypto.randomUUID(),question:q,status:correct?'correct':'wrong',at:new Date(at).toISOString(),ms:3000,repeat:0,answers:[{field:target,answer:answer??(correct?answerValue(q,target):'错误'),correct,mode:'input',key:skillKey(q,target),scheduled:false}]};
};
function history(records:Result[]):AppData {
  const d=freshData();const seen=new Map<string,number>();const results=records.map(r=>{const repeat=seen.get(r.question.amino)??0;seen.set(r.question.amino,repeat+1);return {...r,repeat};});
  d.sessions=[{id:'history',config:{...DEFAULT_CONFIG,count:Math.max(1,records.length)},pool:AMINOS.map(a=>a.id),started:new Date(NOW-90*DAY).toISOString(),ended:new Date(NOW-DAY).toISOString(),results,question:null,draft:{},questionStarted:NOW-90*DAY,paused:false,pauseMs:0}];return d;
}
function answer(d:AppData,correct=true,now=Date.now()):AppData {
  const s=d.active!;const q=s.question!;
  return submit({...d,active:{...s,draft:Object.fromEntries(q.targets.map(f=>[f,correct?(q.options[f]?q.amino:answerValue(q,f)):'错误']))}},'answer',now);
}
function simulate(d:AppData,c:Partial<Config>,correct=(_q:Question)=>true,seed=42) {
  const draw=random(seed);vi.spyOn(Math,'random').mockImplementation(draw);
  d={...d,active:startSession({...DEFAULT_CONFIG,targets:['three'],...c},d,NOW)};
  while(d.active){vi.setSystemTime(Date.now()+60000);d=answer(d,correct(d.active.question!));d=advance(d,Date.now());}
  return d;
}
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(NOW);});
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
describe('direction-specific adaptive practice',()=>{
  it('handles a large old-error history without letting it dominate newly confirmed progress',()=>{
    const d=history([...Array.from({length:12000},(_,i)=>record('Asp',false,NOW-(100+i/1000)*DAY)),...Array.from({length:6},(_,i)=>record('Asp',true,NOW-(6-i)*DAY)),record('Asn',false,NOW-60000)]);
    const old=skillProfile(d,'Asp|structure|three|input');expect(old.n).toBe(12006);expect(old.weak).toBe(false);expect(old.priority).toBeLessThan(skillProfile(d,'Asn|structure|three|input').priority);
  });
  it('uses manual difficulty flags and predicted forgetting while reducing pressure after success',()=>{
    const d=history([record('Asp',true,NOW-3*DAY),record('Asp',true,NOW-2*DAY),record('Asp',true,NOW-DAY)]);d.difficult=['Asp','His'];
    expect(weakIds(d)).toContain('His');expect(weakIds(d)).not.toContain('Asp');
    const before=freshData();before.active=startSession({...DEFAULT_CONFIG,scope:'selected',selected:['Asp'],targets:['three']},before,NOW-20*DAY);
    const old=finish(answer(before,true,NOW-20*DAY));const p=skillProfile(old,'Asp|structure|three|input');expect(p.due).toBe(true);expect(p.risk).toBeGreaterThan(0);
  });
  it('keeps structure recognition separate from fluent abbreviation recall',()=>{
    const d=history([...Array.from({length:12},(_,i)=>record('Asp',true,NOW-(12-i)*DAY,['name'])),record('Asp',false,NOW-100000)]);
    const structure=skillProfile(d,'Asp|structure|three|input');const name=skillProfile(d,'Asp|name|three|input');
    expect(structure.recentFailure).toBe(true);expect(structure.priority).toBeGreaterThan(name.priority);expect(structure.n).toBe(1);expect(name.n).toBe(12);
  });
  it('decays old mistakes and reduces priority after consecutive successful recalls',()=>{
    const d=history([...Array.from({length:400},(_,i)=>record('Asp',false,NOW-(90+i/100)*DAY)),...Array.from({length:5},(_,i)=>record('Asp',true,NOW-(5-i)*DAY)),record('Asn',false,NOW-60000)]);
    expect(skillProfile(d,'Asp|structure|three|input').weak).toBe(false);
    expect(skillProfile(d,'Asp|structure|three|input').priority).toBeLessThan(skillProfile(d,'Asn|structure|three|input').priority);
    expect(weakIds(d)).not.toContain('Asp');
  });
  it('gives a weak direction more than one of 22 slots, with delayed independent retests',()=>{
    const source=history(AMINOS.flatMap(a=>[record(a.id,a.id!=='Asp',NOW-DAY),record(a.id,a.id!=='Asp',NOW-60000)]));
    const d=simulate(source,{count:22,strategy:'adaptive'},q=>q.amino!=='Asp');const results=d.sessions.at(-1)!.results;
    const positions=results.flatMap((r,i)=>r.question.amino==='Asp'?[i]:[]);
    // The former coverage-first engine gave Asp exactly one slot in a 22/22 round.
    expect(positions.length).toBeGreaterThan(1);expect(positions.length).toBeLessThanOrEqual(7);
    for(let i=1;i<positions.length;i++)expect(positions[i]-positions[i-1]).toBeGreaterThanOrEqual(4);
    expect(new Set(results.map(r=>r.question.amino)).size).toBeGreaterThan(7);
  });
  it('re-evaluates a newly missed skill during the current round, rather than precomputing the sequence',()=>{
    const d=simulate(freshData(),{count:22},q=>q.amino!=='Gly',13);const rs=d.sessions[0].results;
    const mistakes=rs.flatMap((r,i)=>r.status==='wrong'?[i]:[]);expect(mistakes.length).toBeGreaterThan(1);
    for(let i=1;i<mistakes.length;i++)expect(mistakes[i]-mistakes[i-1]).toBeGreaterThanOrEqual(4);
    expect(new Set(rs.map(r=>r.question.amino)).size).toBeLessThan(22);
  });
  it('balanced rotation covers 22/22 and carries missing directions across sessions',()=>{
    const first=simulate(freshData(),{count:22,strategy:'balanced'});expect(new Set(first.sessions[0].results.map(r=>r.question.amino)).size).toBe(22);
    vi.setSystemTime(NOW);const source=history(AMINOS.slice(0,11).map(a=>record(a.id,true)));
    const d=simulate(source,{count:5,strategy:'balanced'});expect(d.sessions.at(-1)!.results.every(r=>!AMINOS.slice(0,11).some(a=>a.id===r.question.amino))).toBe(true);
  });
  it('wrong-answer practice targets the failed conversion, not every skill of that amino',()=>{
    const d=history([record('Asp',false,NOW-60000,['structure'],'name','天冬酰胺'),...Array.from({length:8},(_,i)=>record('Asp',true,NOW-(8-i)*DAY,['name'],'three'))]);
    d.active=startSession({...DEFAULT_CONFIG,mixed:true,strategy:'weak'},d);
    const q=nextQuestion(d.active,d,()=>0,NOW);expect(q.amino).toBe('Asp');expect(q.known).toEqual(['structure']);expect(q.targets).toEqual(['name']);
    const balanced=nextQuestion({...d.active,config:{...d.active.config,strategy:'balanced'}},d,()=>0,NOW);expect(skillKey(balanced,balanced.targets[0])).not.toBe(skillKey(q,'name'));
  });
  it.each([1,2,3])('keeps a %s-amino mixed pool varied without a fixed two-item alternation',size=>{
    const d=simulate(freshData(),{scope:'selected',selected:AMINOS.slice(0,size).map(a=>a.id),mixed:true,count:40});const rs=d.sessions[0].results;
    expect(rs).toHaveLength(40);expect(new Set(rs.flatMap(r=>r.answers.map(a=>a.key))).size).toBeGreaterThanOrEqual(size*4);
    if(size===2)expect(rs.some((r,i)=>i>0&&r.question.amino===rs[i-1].question.amino)).toBe(true);
  });
  it('counts a multi-target confusion once per question and includes related distractors in the setup',()=>{
    const r=record('Ser',false,NOW,['structure'],'three','Trp');r.question.targets.push('one');r.answers.push({...r.answers[0],field:'one',answer:'W',key:skillKey(r.question,'one')});
    expect(confusionEvidence([r])[0].results).toHaveLength(1);const c=reinforcementConfig([r]);expect(c.selected).toContain('Trp');expect(c.selected.length).toBeGreaterThan(2);expect(c.count).toBeLessThanOrEqual(c.focusKeys!.length*2);expect(c.focusKeys).toContain('Ser|structure|three|input');
    const d=history([r]);d.active=startSession({...DEFAULT_CONFIG,scope:'selected',selected:['Ser'],known:['name'],targets:['structure']},d);expect(d.active.question!.options.structure).toContain('Trp');
  });
});
describe('FSRS and backup compatibility',()=>{
  it('uses Good without guessing difficulty from choice format or whole-question typing time',()=>{
    const d=freshData();d.active=startSession({...DEFAULT_CONFIG,known:['three'],targets:['name'],nameMode:'choice'},d);
    const scored=answer(d,true,NOW+45000);expect(Object.values(scored.memories)[0].reviews[0].rating).toBe(3);
    const input=freshData();input.active=startSession({...DEFAULT_CONFIG,targets:['three','one']},input);
    const slow=answer(input,true,NOW+90000);expect(Object.values(slow.memories).every(m=>m.reviews[0].rating===3)).toBe(true);
  });
  it('supports optional Easy and guessing without adding a second FSRS event',()=>{
    let d=freshData();d.active=startSession({...DEFAULT_CONFIG,targets:['three'],scope:'selected',selected:['Ile']},d);d=answer(d);
    d=reviseRecall(d,d.active!.question!.id,'three','easy');expect(Object.values(d.memories)[0].reviews[0].rating).toBe(4);expect(Object.values(d.memories)[0].card.reps).toBe(1);
    const choice=freshData();choice.active=startSession({...DEFAULT_CONFIG,known:['three'],targets:['name'],nameMode:'choice'},choice);let guess=answer(choice);
    guess=reviseRecall(guess,guess.active!.question!.id,'name','guess');expect(Object.values(guess.memories)[0].reviews[0].rating).toBe(1);expect(guess.active!.results[0].status).toBe('correct');expect(weakIds(guess)).toContain(guess.active!.question!.amino);
    expect(validateImport(JSON.parse(exportJSON(guess)))).toEqual({...guess,updated:JSON.parse(exportJSON(guess)).updated});
  });
  it('preserves spaced same-day lapse evidence, caps rapid successes, and accepts a cross-day recall',()=>{
    let d=freshData();const c={...DEFAULT_CONFIG,targets:['three'] as Field[],scope:'selected' as const,selected:['Asp']};d.active=startSession(c,d);d=answer(d);d=finish(d);
    d.active=startSession(c,d,NOW+180000);d=answer(d,false,NOW+240000);d=finish(d);expect(Object.values(d.memories)[0].card.reps).toBe(2);
    d.active=startSession(c,d,NOW+360000);d=answer(d,true,NOW+420000);expect(Object.values(d.memories)[0].card.reps).toBe(2);d=finish(d);
    d.active=startSession(c,d,NOW+DAY);d=answer(d,true,NOW+DAY+60000);expect(Object.values(d.memories)[0].card.reps).toBe(3);expect(d.active!.results[0].answers[0].reviewKind).toBe('review');
  });
  it('scores partial targets independently, skips without scheduling, and preserves retention behavior',()=>{
    const base=freshData();base.active=startSession({...DEFAULT_CONFIG,scope:'selected',selected:['Glu']},base);
    let d=submit({...base,active:{...base.active!,draft:{three:'Glu',one:'X'}}},'answer',NOW+20000);
    expect(d.memories['Glu|structure|three|input'].reviews[0].rating).toBe(3);expect(d.memories['Glu|structure|one|input'].reviews[0].rating).toBe(1);expect(stats(d.active!.results).targetAccuracy).toBe(50);
    const skip=submit(base,'skip');expect(Object.keys(skip.memories)).toHaveLength(0);
    const low=answer({...base,settings:{...base.settings,retention:.7}});const high=answer({...base,settings:{...base.settings,retention:.99}});
    expect(Date.parse(Object.values(high.memories)[0].card.due)).toBeLessThanOrEqual(Date.parse(Object.values(low.memories)[0].card.due));
  });
  it('snapshots every due direction and stops once that set has been attempted',()=>{
    let d=freshData();d.active=startSession({...DEFAULT_CONFIG,scope:'selected',selected:['Asp']},d);d=finish(answer(d));for(const m of Object.values(d.memories))m.card.due=new Date(NOW-1).toISOString();
    const original=dueMemories(d).map(m=>m.key);d.active=startSession({...DEFAULT_CONFIG,scope:'due',mixed:true,count:22},d);expect(d.active.config.count).toBe(2);
    while(d.active){d=answer(d,true,NOW+DAY);d=advance(d,NOW+DAY);}
    expect(d.sessions.at(-1)!.results.flatMap(r=>r.answers.map(a=>a.key)).sort()).toEqual(original.sort());
  });
  it('never records an empty session and round-trips old and extended version-1 data',()=>{
    let d=freshData();d.active=startSession(DEFAULT_CONFIG,d);const zero=finish(d);expect(zero.sessions).toHaveLength(0);expect(zero.memories).toEqual({});expect(finish(zero)).toBe(zero);
    d=finish(answer(d));d.favorites=['Met'];d.difficult=['His'];d.presets=[{id:'p',config:reinforcementConfig([record('Asp',false)])}];
    const restored=validateImport(JSON.parse(exportJSON(d)));expect(restored.favorites).toEqual(d.favorites);expect(restored.memories).toEqual(d.memories);expect(restored.presets).toEqual(d.presets);expect(mergeData(restored,restored).sessions).toHaveLength(1);
    const old=JSON.parse(exportJSON(d));Object.values(old.memories).forEach((m:any)=>delete m.lastBefore);old.sessions.forEach((s:any)=>s.results.forEach((r:any)=>r.answers.forEach((a:any)=>{delete a.reviewKind;delete a.recall;})));expect(validateImport(old).version).toBe(1);
  });
  it('keeps exactly five atlas-only numeric values and the textbook category memberships',()=>{
    expect(AMINOS.filter(a=>a.pkaR!==undefined)).toHaveLength(5);expect([BY_ID.Lys.pkaR,BY_ID.His.pkaR,BY_ID.Arg.pkaR,BY_ID.Asp.pkaR,BY_ID.Glu.pkaR]).toEqual([10.53,6,12.48,3.65,4.25]);
    expect([BY_ID.Lys.pI,BY_ID.His.pI,BY_ID.Arg.pI,BY_ID.Asp.pI,BY_ID.Glu.pI]).toEqual([9.74,7.59,10.76,2.77,3.22]);expect(BY_ID.Gly.pI).toBeUndefined();
    const counts=Object.fromEntries([...new Set(AMINOS.map(a=>a.category))].map(c=>[c,AMINOS.filter(a=>a.category===c).length]));expect(counts).toEqual({'非极性脂肪族':6,'极性不带电':6,'芳香族':3,'酸性':2,'碱性':3,'特殊编码':2});expect(BY_ID.Met.category).toBe('极性不带电');
  });
});
