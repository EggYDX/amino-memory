export interface Amino {
  id: string; name: string; three: string; one: string; category: string;
  aliases: string[]; confused: string[]; cid: number; standard: boolean;
  structure: string; compactStructure?: string; verified: boolean;
  categoryId: string; tags: string[]; note?: string;
  pkaR?: number; pI?: number;
}
const rows: [string, string, string, string, string[], string[], number][] = [
  ['甘氨酸','Gly','G','非极性',[],['Ala'],750],
  ['丙氨酸','Ala','A','非极性',[],['Gly'],5950],
  ['缬氨酸','Val','V','非极性',[],['Leu','Ile'],6287],
  ['亮氨酸','Leu','L','非极性',[],['Ile','Val'],6106],
  ['异亮氨酸','Ile','I','非极性',[],['Leu','Val'],6306],
  ['丝氨酸','Ser','S','极性不带电',[],['Thr','Cys'],5951],
  ['苏氨酸','Thr','T','极性不带电',[],['Ser'],6288],
  ['半胱氨酸','Cys','C','极性不带电',[],['Sec','Ser'],5862],
  ['甲硫氨酸','Met','M','极性不带电',['蛋氨酸'],['Cys','Lys'],6137],
  ['天冬氨酸','Asp','D','酸性',[],['Asn','Glu'],5960],
  ['谷氨酸','Glu','E','酸性',[],['Gln','Asp'],33032],
  ['天冬酰胺','Asn','N','极性不带电',[],['Asp','Gln'],6267],
  ['谷氨酰胺','Gln','Q','极性不带电',[],['Glu','Asn'],5961],
  ['赖氨酸','Lys','K','碱性',[],['Arg','Pyl'],5962],
  ['精氨酸','Arg','R','碱性',[],['Lys'],6322],
  ['组氨酸','His','H','碱性',[],['Trp'],6274],
  ['苯丙氨酸','Phe','F','芳香族',[],['Tyr','Trp'],6140],
  ['酪氨酸','Tyr','Y','芳香族',[],['Phe'],6057],
  ['色氨酸','Trp','W','芳香族',[],['His','Phe'],6305],
  ['脯氨酸','Pro','P','非极性',[],['Pyl'],145742],
  ['硒代半胱氨酸','Sec','U','特殊编码',['硒半胱氨酸'],['Cys'],25076],
  ['吡咯赖氨酸','Pyl','O','特殊编码',[],['Lys','Pro'],5460671],
];
export const CATEGORY_INFO:Record<string,{id:string;note:string}>={
  '非极性脂肪族':{id:'aliphatic',note:'按教材归为非极性脂肪族，侧链的结构各有差别。'},
  '极性不带电':{id:'polar',note:'沿用教材分组；电荷状态仍取决于环境，甲硫氨酸的整体侧链偏疏水。'},
  '芳香族':{id:'aromatic',note:'按侧链芳香结构分组，成员的极性并不完全相同。'},
  '酸性':{id:'acidic',note:'侧链含酸性可电离基团，实际电荷取决于 pH。'},
  '碱性':{id:'basic',note:'侧链含碱性可电离基团，实际电荷取决于 pH。'},
  '特殊编码':{id:'encoded',note:'表示特殊的遗传编码身份，与侧链极性属于不同分类维度。'},
};
export const TAGS:Record<string,string>={branch:'支链',hydroxyl:'羟基',thiol:'巯基',thioether:'硫醚',amide:'酰胺',phenol:'酚羟基',imidazole:'咪唑',guanidino:'胍基',selenol:'硒醇基',cycle:'侧链成环',achiral:'无手性'};
const features:Record<string,{tags:string[];note?:string}>={
  Gly:{tags:['achiral']},Val:{tags:['branch']},Leu:{tags:['branch']},Ile:{tags:['branch']},
  Ser:{tags:['hydroxyl']},Thr:{tags:['hydroxyl']},Asn:{tags:['amide']},Gln:{tags:['amide']},
  Cys:{tags:['thiol'],note:'巯基可被氧化，两个残基之间可形成二硫键；与硫醚基团的性质不同。'},
  Met:{tags:['thioether'],note:'侧链 –CH₂–CH₂–S–CH₃ 含硫醚，整体偏疏水，极性表现不明显。硫醚与水的氢键作用较弱；部分教材据此归为非极性，本教材归为极性不带电。'},
  Tyr:{tags:['phenol'],note:'芳香环上的酚羟基使侧链具有一定极性；芳香族分组不等于统一的极性分类。'},
  His:{tags:['imidazole'],note:'咪唑侧链的质子化取决于 pH；生理 pH 附近通常以不带正电的形式为主，局部环境会影响电离。'},
  Arg:{tags:['guanidino']},Pro:{tags:['cycle']},
  Sec:{tags:['selenol'],note:'特殊编码身份与侧链化学性质分开理解。硒醇基与巯基的结构相近，电离与反应性质有差别。'},
  Pyl:{tags:['amide'],note:'特殊编码身份不表示特定极性。侧链含酰胺连接的吡咯啉环，不能直接沿用赖氨酸末端游离氨基的性质。'},
};
// Course values supplied by the user. These five are a study focus, not an exhaustive ionizable-side-chain list.
const properties:Record<string,{pkaR:number;pI:number}>={Lys:{pkaR:10.53,pI:9.74},His:{pkaR:6,pI:7.59},Arg:{pkaR:12.48,pI:10.76},Asp:{pkaR:3.65,pI:2.77},Glu:{pkaR:4.25,pI:3.22}};
export const AMINOS: Amino[] = rows.map(([name,three,one,rawCategory,aliases,confused,cid]) => {
  const category=rawCategory==='非极性'?'非极性脂肪族':rawCategory;
  return {id: three, name, three, one, category,categoryId:CATEGORY_INFO[category].id, aliases, confused, cid,
  tags:features[three]?.tags??[],...(features[three]?.note?{note:features[three].note}:{}),...properties[three],
  standard: !['Sec','Pyl'].includes(three), structure: `structures/${three}.svg`, compactStructure:`structures/compact/${three}.svg`, verified: true,
};});
export const BY_ID = Object.fromEntries(AMINOS.map(a => [a.id, a])) as Record<string, Amino>;
export const CATEGORIES = [...new Set(AMINOS.map(a => a.category))];
