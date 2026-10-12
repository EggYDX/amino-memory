import { TAGS, type Amino } from '../data/amino';
export type AtlasField='name'|'three'|'one'|'pkaR'|'pI';
export const ATLAS_FIELDS:AtlasField[]=['name','three','one','pkaR','pI'];
export const ATLAS_LABELS={name:'中文名称',three:'三字母',one:'单字母',pkaR:'pKₐ(R)',pI:'pI'};
export function AminoProperties({amino,show,details=true}:{amino:Amino;show:(f:AtlasField)=>boolean;details?:boolean}) {
  return <div className="amino-properties">
    {(amino.pkaR!==undefined||amino.pI!==undefined)&&<dl className="chemical-values">{(['pkaR','pI'] as const).filter(f=>amino[f]!==undefined).map(f=><div key={f}><dt>{ATLAS_LABELS[f]}</dt><dd className="code">{show(f)?amino[f]!.toFixed(2):'•••'}</dd></div>)}</dl>}
    {!!amino.tags.length&&<div className="property-tags">{amino.tags.map(tag=><span key={tag}>{TAGS[tag]}</span>)}</div>}
    {details&&amino.note&&<details className="property-notes"><summary>侧链特点</summary><p>{amino.note}</p></details>}
  </div>;
}
