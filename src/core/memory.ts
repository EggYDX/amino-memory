import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';
import type { AppData, Field, Memory, Result, StoredCard, TargetResult } from './types';

export function storeCard(card: Card): StoredCard {
  return {...card,due:card.due.toISOString(),last_review:card.last_review?.toISOString()};
}
export function restoreCard(card: StoredCard): Card {
  return {...card,due:new Date(card.due),last_review:card.last_review?new Date(card.last_review):undefined};
}
const scheduler=(retention:number)=>fsrs({request_retention:retention,enable_fuzz:false,enable_short_term:false});
// Guard times are application policies; FSRS mathematics and library parameters remain intact.
export const SCHEDULING={lapseGap:60000,repeatLapseGap:600000,nextDayGap:8*3600000,dueGap:4*3600000,longGap:86400000};
const ratingFor=(a:TargetResult)=>!a.correct||a.recall==='guess'?Rating.Again:a.recall==='hard'?Rating.Hard:a.recall==='easy'?Rating.Easy:Rating.Good;
export function updateMemories(old: Record<string,Memory>, r: Result, session: string, retention: number): Record<string,Memory> {
  if(r.status==='skip')return old;
  const next={...old};const now=new Date(r.at);const model=scheduler(retention);
  for(const answer of r.answers) {
    const previous=old[answer.key];
    const last=previous?.reviews.at(-1);const elapsed=last?now.getTime()-Date.parse(last.at):Infinity;
    const failure=!answer.correct||answer.recall==='guess';
    // The question engine runs short correction; rapid successes do not grow long-term stability.
    // Spaced lapses remain useful forgetting evidence. Immediate failures belong to one episode.
    const lapse=failure&&elapsed>=SCHEDULING.lapseGap&&(last?.rating!==Rating.Again||elapsed>=SCHEDULING.repeatLapseGap);
    const midnight=last&&new Date(last.at).toDateString()!==now.toDateString();
    const independent=elapsed>=SCHEDULING.longGap||(!!midnight&&elapsed>=SCHEDULING.nextDayGap)||(!!previous&&now.getTime()>=Date.parse(previous.card.due)&&elapsed>=SCHEDULING.dueGap);
    if(previous&&!(failure?lapse:independent))continue;
    const card=previous ? restoreCard(previous.card) : createEmptyCard(now);
    const scheduled=model.next(card,now,ratingFor(answer)).card;
    next[answer.key]={key:answer.key,amino:r.question.amino,known:[...r.question.known],target:answer.field,mode:answer.mode,
      ...(answer.mode==='choice'?{choices:r.question.choices}:{}),card:storeCard(scheduled),lastBefore:storeCard(card),
      reviews:[...(previous?.reviews??[]),{at:r.at,rating:ratingFor(answer),session}]};
    answer.scheduled=true;answer.reviewKind=!previous?'new':midnight?'review':'relearn';
  }
  return next;
}
export function reviseRecall(d:AppData,questionId:string,field:Field,recall:NonNullable<TargetResult['recall']>):AppData {
  const s=d.active;const index=s?.results.findIndex(r=>r.question.id===questionId)??-1;if(!s||index<0)return d;
  const original=s.results[index];const found=original.answers.find(a=>a.field===field);
  if(!found?.correct||s.paused||(recall==='guess'&&found.mode!=='choice'))return d;
  const r={...original,answers:original.answers.map(a=>a.field===field?{...a,recall}:a)};
  const answer=r.answers.find(a=>a.field===field)!;const m=d.memories[answer.key];let memories=d.memories;
  if(m?.lastBefore&&answer.scheduled&&m.reviews.at(-1)?.at===r.at&&m.reviews.at(-1)?.session===s.id){
    const card=scheduler(d.settings.retention).next(restoreCard(m.lastBefore),new Date(r.at),ratingFor(answer)).card;
    memories={...memories,[m.key]:{...m,card:storeCard(card),reviews:[...m.reviews.slice(0,-1),{at:r.at,rating:ratingFor(answer),session:s.id}]}};
  }else if(recall==='guess')memories=updateMemories(d.memories,r,s.id,d.settings.retention);
  return {...d,memories,active:{...s,results:s.results.map((old,i)=>i===index?r:old)}};
}
