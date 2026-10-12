# 结构图与教材约定

## 化学表示

正式 SVG 位于 `public/structures/`。共同 α-碳位于 `(160,80)`，α-羧基朝上、氨基朝左、氢朝右、侧链朝下，沿用教材 L 型 Fischer 投影；甘氨酸无手性。苏氨酸与异亮氨酸对应 `(2S,3R)` 和 `(2S,3S)`；L-半胱氨酸与 L-硒代半胱氨酸按 CIP 规则 α 位为 R。

图中 α 位统一表示为 `NH₃⁺ / COO⁻`；Asp/Glu 侧链为羧酸根，Lys/Arg 带正电，His 和 Pyl 的环按教材表示为质子化形式。这些图形约定不表示任意 pH 下都具有同样电荷；His 在生理 pH 附近通常并非主要以带正电形式存在。

Pro 的五元环包含 α 氨基，表示为质子化仲胺 `H₂N⁺`。Pyl 保留四个 CH₂、ε 位酰胺、五元甲基吡咯啉环和环上 `(2R,3R)` 立体关系。Sec 为 `CH₂—SeH`。

PubChem 的中性结构用于核对原子连接与立体构型，质子化形式可以与教材不同。资料见 [PubChem 结构数据](pubchem-structures.json)、[L-Selenocysteine](https://pubchem.ncbi.nlm.nih.gov/compound/25076) 和 [L-Pyrrolysine](https://pubchem.ncbi.nlm.nih.gov/compound/5460671)。

## 分类与性质

`src/data/amino.ts` 统一维护名称、缩写、教材主分类、辅助结构标签和说明。教材分组为非极性脂肪族6种、极性不带电6种、芳香族3种、酸性2种、碱性3种、特殊编码2种。

Met 保留教材的极性不带电归属；硫醚侧链整体偏疏水，其他教材可能据此归为非极性。芳香族是结构分类，Tyr 的酚羟基仍具有一定极性；特殊编码反映遗传编码身份，与侧链极性属于不同维度。化学性质参考 [Essential chemistry for biochemists](https://pmc.ncbi.nlm.nih.gov/articles/PMC5869253/) 与 [Molecular Biology of the Cell](https://www.ncbi.nlm.nih.gov/books/NBK26830/)，教材归组保持课程口径。

五组 pKₐ(R) / pI 为用户提供的课程重点值：Lys 10.53/9.74、His 6.00/7.59、Arg 12.48/10.76、Asp 3.65/2.77、Glu 4.25/3.22。不为其他项目填充未经确认的数值。该五种不是所有可电离侧链或所有具有 pI 的氨基酸的清单，数值还取决于实验条件。

## 资源维护

答题紧凑视图位于 `public/structures/compact/`，仅调整 SVG 视口并保留原子、键、电荷和立体标记。正式结构图不含名称或缩写答案。

替换正式 SVG 后运行 `node scripts/compact-structures.mjs`，再执行 `pnpm build`；生成脚本需要 Playwright Chromium。名称、ID 或缩写变更会影响记录索引，应避免直接修改。分类标签与图鉴性质不进入答题字段或 FSRS 记忆键。
