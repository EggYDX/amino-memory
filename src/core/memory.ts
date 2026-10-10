import { createEmptyCard, fsrs, Rating, type Card } from 'ts-fsrs';
import type { Memory, Result, StoredCard } from './types';

export function storeCard(card: Card): StoredCard {
  return {...card,due:card.due.toISOString(),last_review:card.last_review?.toISOString()};
}
export function restoreCard(card: StoredCard): Card {
  return {...card,due:new Date(card.due),last_review:card.last_review?new Date(card.last_review):undefined};
}
export function updateMemories(old: Record<string,Memory>, r: Result, session: string, retention: number): Record<string,Memory> {
  if(r.status==='skip') return old;
  const next={...old}; const now=new Date(r.at);
  const scheduler=fsrs({request_retention:retention,enable_fuzz:false,enable_short_term:false});
  for(const answer of r.answers) {
    const previous=old[answer.key];
    // One first encounter per exact skill per rolling 24 hours. Repetitions remain training evidence.
    if(previous && (previous.reviews.some(x=>x.session===session) || now.getTime()-new Date(previous.reviews.at(-1)!.at).getTime()<86400000)) continue;
    const rating=!answer.correct ? Rating.Again : answer.mode==='choice'||r.ms>20000 ? Rating.Hard : Rating.Good;
    const card=previous ? restoreCard(previous.card) : createEmptyCard(now);
    const scheduled=scheduler.next(card,now,rating).card;
    next[answer.key]={key:answer.key,amino:r.question.amino,known:[...r.question.known],target:answer.field,mode:answer.mode,
      ...(answer.mode==='choice'?{choices:r.question.choices}:{}),card:storeCard(scheduled),
      reviews:[...(previous?.reviews??[]),{at:r.at,rating,session}]};
    answer.scheduled=true;
  }
  return next;
}
