export interface Amino {
  id: string; name: string; three: string; one: string; category: string;
  aliases: string[]; confused: string[]; cid: number; standard: boolean;
  structure: string; compactStructure?: string; verified: boolean;
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
export const AMINOS: Amino[] = rows.map(([name,three,one,category,aliases,confused,cid]) => ({
  id: three, name, three, one, category, aliases, confused, cid,
  standard: !['Sec','Pyl'].includes(three), structure: `structures/${three}.svg`, compactStructure:`structures/compact/${three}.svg`, verified: true,
}));
export const BY_ID = Object.fromEntries(AMINOS.map(a => [a.id, a])) as Record<string, Amino>;
export const CATEGORIES = [...new Set(AMINOS.map(a => a.category))];
