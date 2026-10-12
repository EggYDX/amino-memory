import type { Card } from 'ts-fsrs';

export type Field = 'structure' | 'name' | 'three' | 'one';
export const FIELDS: Field[] = ['structure','name','three','one'];
export const LABEL: Record<Field,string> = { structure:'化学结构', name:'中文名称', three:'三字母缩写', one:'单字母缩写' };
export type Strategy = 'adaptive' | 'balanced' | 'weak';
export type Scope = 'all' | 'standard' | 'selected' | 'favorites' | 'errors' | 'weak' | 'due';
export interface Config {
  title: string; known: Field[]; targets: Field[]; scope: Scope; selected: string[];
  count: number; strategy: Strategy; nameMode: 'input' | 'choice'; choices: 2 | 4;
  mixed: boolean;
  focusKeys?: string[];
}
export interface Question {
  id: string; amino: string; known: Field[]; targets: Field[];
  nameMode: 'input' | 'choice'; choices: 2 | 4; options: Partial<Record<Field,string[]>>;
}
export type Status = 'correct' | 'wrong' | 'reveal' | 'skip';
export interface TargetResult {
  field: Field; answer: string; correct: boolean; mode: 'input' | 'choice'; key: string;
  scheduled: boolean;
  recall?: 'guess' | 'hard' | 'good' | 'easy';
  reviewKind?: 'new' | 'review' | 'relearn';
}
export interface Result {
  id: string; question: Question; answers: TargetResult[]; status: Status;
  at: string; ms: number; repeat: number;
}
export interface Session {
  id: string; config: Config; pool: string[]; started: string; ended?: string;
  results: Result[]; question: Question | null; draft: Partial<Record<Field,string>>;
  questionStarted: number; paused: boolean; pausedAt?: number; pauseMs: number;
  reviewKeys?: string[];
}
export type StoredCard = Omit<Card,'due' | 'last_review'> & { due: string; last_review?: string };
export interface Memory {
  key: string; amino: string; known: Field[]; target: Field; mode: 'input' | 'choice'; choices?: 2 | 4;
  card: StoredCard; reviews: { at: string; rating: number; session: string }[];
  lastBefore?: StoredCard;
}
export interface Settings {
  caseSensitive: boolean; theme: 'light' | 'dark' | 'system'; retention: number;
  autoNext: boolean;
}
export interface AppData {
  version: 1; updated: string; settings: Settings; favorites: string[]; difficult: string[];
  presets: { id: string; config: Config }[]; sessions: Session[];
  memories: Record<string, Memory>; active: Session | null;
}
export const DEFAULT_CONFIG: Config = {
  title:'看结构，背缩写', known:['structure'], targets:['three','one'], scope:'all',
  selected:[], count:22, strategy:'adaptive', nameMode:'input', choices:4, mixed:false,
};
export const freshData = (): AppData => ({
  version:1, updated:new Date().toISOString(),
  settings:{caseSensitive:true,theme:'light',retention:0.9,autoNext:false},
  favorites:[], difficult:[], presets:[], sessions:[], memories:{}, active:null,
});
