# 氨基酸 · 记忆练习

22种氨基酸的结构、中文名称、三字母与单字母缩写训练。React、TypeScript、Vite；所有学习数据保存在浏览器 IndexedDB。无需账号、后台服务或付费接口。

## 直接使用

本交付包含已构建的 `dist/`。Windows 双击 **启动网页.cmd**，然后在浏览器打开终端显示的 `http://127.0.0.1:4173/`。

启动脚本使用本机 Node.js，也可以识别 Codex 自带的 Node.js；运行已构建版本无需下载依赖。若端口已占用，可用 `node scripts/serve.mjs 4175` 更换端口。启动后保留终端窗口，按 Ctrl+C 停止。

请通过脚本打开本项目：ES模块与PWA需要稳定的HTTP站点环境，双击HTML的 `file://` 模式会受浏览器限制。相同浏览器与相同本地网址可以继续读取原记录。

## 本次界面改版

已改为学习工作台、索引式图鉴、分步配置、独立答题、走势记录与行式设置；手机使用底部导航、横向图鉴索引和按需输入。使用Motion实现导航指示器、切题、答案状态、布局变化、弹窗与进度反馈，跟随系统减少动态效果。

[设计变化与真实参考](docs/DESIGN.md) · [验证记录](docs/QA.md) · [GitHub上传和设置步骤](docs/DEPLOY.md)

## 修改与开发

环境：Node.js 22.12 或更新版本；pnpm 11.25.0。依赖版本已写入锁文件。

```powershell
cd E:\Codex\2026-10-10\an\outputs\amino-memory
pnpm install --frozen-lockfile
pnpm dev
```

在其他电脑解压后，进入实际项目目录即可。也可用 `npm install`、`npm run dev`；GitHub Actions 使用 pnpm 锁文件。

```powershell
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm preview
```

`pnpm dev` 是开发模式；PWA 离线能力在生产构建的 `pnpm preview` 或内置启动脚本下验证。

## 已实现

- 图鉴：22种结构、名称、缩写；单独隐藏字段、隐藏全部、逐张揭晓、搜索、排序、分类、标准20种筛选、收藏、难点标记、结构放大、并排对照和单项专项训练。
- 7种快捷训练：结构到缩写、名称到缩写、缩写到名称、缩写互转、结构到名称、名称到结构和混合训练。可在配置中切换双向缩写及单/多目标。
- 自定义：任意不重叠的已知条件与目标；多目标分开判分；缩写始终填空；中文名称填空或2/4选1；结构2/4选1，默认4选1；多个预设；动态范围与自由勾选；正整数自由题量。
- 答题：严格大小写默认开启、首尾空格清理、登记别名、组合输入保护、回车提交、原位反馈、查看答案、跳过、暂停、刷新恢复、提前结束、重练和错题练习。
- 记忆：自适应强化、均衡轮换、错题强化；优先基础覆盖；按精确记忆方向追踪表现；FSRS跨天调度与保持率调整。
- 记录：整题成绩、目标部分得分、首次成绩、覆盖率、重复次数、按方向的记录、历史错题、实际混淆、单项历史、下次复习时间与到期任务。
- 备份：JSON导出、结构及版本校验、合并/替换、重复记录检查、确认清空、存储失败提示。
- 响应式浅/深色主题、系统主题、减少动效、安全区域、PWA静态资源预缓存、离线练习和版本更新提示。

## 数据与结构资源

`src/data/amino.ts` 是唯一氨基酸数据表；所有页面和训练引擎共用。22份正式SVG位于 `public/structures/`，答题紧凑视图位于其 `compact/` 子目录。更换正式SVG后，在项目根目录运行 `node scripts/compact-structures.mjs` 重新生成紧凑视图，再执行 `pnpm build`。此脚本需要已安装Playwright的Chromium。若采用其他图片格式，也可更新 `structure` 路径并移除该项目的可选 `compactStructure` 字段；训练引擎不需要改动。

全部教材截图已逐项分离并在本次开发中核对。教材裁剪仅作本地参考，未打包进源码或 `dist/`。正式资源为重新编写的SVG，去除了名称与缩写。PubChem官方结构元数据与立体构型记录保存在 `docs/pubchem-structures.json`。

有关质子化形式、Fischer投影、特殊环结构与分类口径，见 [STRUCTURES.md](docs/STRUCTURES.md)。本次检查结果见 [QA.md](docs/QA.md)。

## 记忆与统计口径

记忆键包括氨基酸、全部已知条件、单个考察目标、填空/选择及选项数量。不同线索组合、选择题与主动回忆分别记录。

每个精确记忆键在同一场训练最多更新一次FSRS；滚动24小时内也不重复更新。只使用这一独立首答：答错/查看答案为 Again，选择题答对或回忆超过20秒为 Hard，其他正确填空为 Good。跳过不更新FSRS。场内重复仍计入实际作答、方向表现和强化调度。采用 `ts-fsrs` 的长期调度模式，默认目标保持率90%。这是明确的产品评分策略，不代表人工自评。

整题正确率以已提交答案的题目为分母，须所有目标正确；查看答案和跳过单列。首次正确率以本场每种氨基酸第一次呈现为分母，查看/跳过视为未独立答对。方向正确率逐目标记录，跳过不计，查看答案计为未回忆成功。至少3个观察样本后才展示方向百分比；薄弱项目由某个精确方向练习至少3次且正确率低于75%确定。

到期训练使用原来的已知条件、目标和作答形式。重复出现的题目并不等于新的独立知识点；复习状态与练习历史分别保存。

## GitHub Pages

推荐部署方案为GitHub Pages。完整上传、Pages设置和备份迁移步骤见 [DEPLOY.md](docs/DEPLOY.md)。

已附 `.github/workflows/pages.yml`。用户自行创建仓库后，把此项目的**内容作为仓库根目录**上传到 `main`，在 Settings → Pages → Source 选择 **GitHub Actions**，即可由工作流运行测试、构建并部署 `dist/`。本次未创建远程仓库或执行公开部署。

Vite 使用 `base: './'`，图片和PWA资源使用相对路径，页面使用 `#home`、`#atlas` 等Hash路由。已实测 `/amino-memory/#atlas` 子路径的刷新与离线访问；仓库名称可以不同。部署方法参考 [Vite官方说明](https://vite.dev/guide/static-deploy.html#github-pages) 和 [GitHub Pages工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 手机上使用

GitHub Pages部署后，在Safari或Chrome打开HTTPS网址，再从浏览器菜单选择“添加到主屏幕”或“安装应用”。首次联网打开并等待资源缓存后，可继续离线练习。手机访问不了电脑的 `127.0.0.1`，它仅用于本机预览。

浏览器之间不自动同步。换设备使用设置页手动导出/导入备份；清理站点数据会删除记录。

## 项目结构

```text
src/data/         氨基酸映射与结构资源接口
src/core/         出题、判分、场内调度、FSRS、存储、备份校验
src/components/   通用UI与本地数据状态
src/pages/        首页、图鉴、自定义、训练、学习记录、设置
public/           正式结构SVG与PWA图标
tests/            Playwright交互、布局、离线与子路径测试
scripts/          本地静态预览及视觉核对脚本
docs/             结构核对资料、验证记录与截图
```

本地备份格式版本为1；不同浏览器或站点源使用独立存储。后续修改数据结构需要同步维护版本迁移及导入校验。当前以单个原子状态快照写入IndexedDB；历史特别庞大时可再改为逐条存储。
