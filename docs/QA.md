# 验证记录

日期：2026-10-10至2026-10-11（Asia/Shanghai）。环境：Windows、Node.js 24.19.0、Playwright 1.64.0的Chromium、Vitest 4.1.11、axe-core 4.13.0。

## 本次结果

| 检查 | 结果 |
|---|---|
| TypeScript严格检查、Vite生产构建 | 通过，已更新随包dist |
| 核心逻辑、存储与CMD格式 | 31项通过 |
| 浏览器交互与兼容场景 | 20项通过，包含子路径专项，无跳过 |
| 桌面、手机和平板 | 375/390、768、1440及844×390横屏，无横向溢出 |
| 前后布局与实图检查 | 保存旧首页与34张新版截图，逐页检查并迭代 |
| 浅色/深色页面、对照dialog的axe扫描 | 所选WCAG A/AA规则未报告违规 |
| 手机图鉴、填空训练和结构选择的axe扫描 | 所选WCAG A/AA规则未报告违规 |
| 键盘操作与焦点 | 分段控件方向键、Tab、Escape、dialog焦点约束与返回通过 |
| 反馈与恢复 | 多目标部分正确、大小写、查看、跳过、暂停、草稿刷新恢复、IME提交通过 |
| 备份 | 导出、版本拒绝、合并、替换、取消/确认清空通过 |
| 图鉴 | 索引联动、字段隐藏/揭晓、别名搜索、收藏、对照、紧凑图失败回退通过 |
| 学习记录 | 用一次实际5题训练生成4对1错的记录、成绩、走势和覆盖图 |
| 减少动态效果 | 系统媒体设置下布局、答题与页面操作通过 |
| 快速导航与中断过渡 | 最终页面与选项跟随最新操作，无脚本异常 |
| 根路径与模拟GitHub仓库子路径 | 刷新、结构图、Hash导航、断网重载与练习通过 |
| 化学资源与核心代码 | 51个受保护文件SHA256全部与改版前一致 |
| 主页面和交互截图运行中的pageerror | 0 |

核心测试继续覆盖22种映射、50种合法线索/目标组合、7种模式、三种重复策略、别名、部分得分、首次与重复区分、FSRS独立首答与24小时边界、保持率、到期方向和异常备份校验。IndexedDB名称、版本及状态键未改动。

PWA预缓存约599KiB，包含应用、全部正式/紧凑结构和图标。Motion只有交互触发的过渡，没有持续运行的背景动效；图鉴规模为22项，筛选使用位置变换；新走势统计按结果一次归集每日题量，避免重复格式化整份记录。自动可访问性扫描不等同于完整WCAG认证。

## 视觉与交互检查

已查看首页、图鉴两种视图、训练两类作答、配置三步骤、统计各视图、设置、成绩、对照、选项放大、暂停、确认、Toast、深色主题。Pyl在手机选择题中占整行并可放大；正式SVG用于对照，紧凑SVG仅去掉外围空白，其绘图内容逐种验证一致。

复核依据：frontend-design与ui-ux-pro-max的层次、响应式、触摸、可读性、表单和焦点要求，以及motion-design的频率、时长和减少动态效果要求。修正项见 [DESIGN.md](DESIGN.md)。截图在 [redesign/](redesign/)，浏览器检查的原始摘要见 [browser-check.json](redesign/browser-check.json)。这些截图来自隔离测试浏览器，展示测试训练，不是用户原有学习记录。

## 复现

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

默认执行19项，子路径专项明确跳过。完整20项需要另一个终端先运行 `node scripts/subpath-server.mjs`，然后：

```powershell
$env:TEST_SUBPATH = '1'
pnpm test:e2e
```

截图复核：启动本地4173预览服务后执行 `node scripts/visual-qa.mjs`。该脚本使用独立浏览器上下文，不改动用户日常浏览器中的记录。

## 已保留的启动修复

CMD仍采用UTF-8无BOM、CRLF，`.gitattributes`保持Windows换行。此前已实际验证普通PATH、Node不在PATH时自动查找Codex运行时、带空格目录；本次格式回归测试继续通过。启动入口仍运行随包dist，不依赖在线安装。

## 验证边界

手机检查使用Chromium视口模拟；键盘打开状态用VisualViewport缩小模拟，IME用组合事件验证。没有进行真实iPhone/Android软键盘、Safari或主屏幕安装的实机测试。真实触摸和系统键盘的最终行为仍需设备验证。

GitHub Pages子路径及离线访问已本地验证；尚未创建远程仓库或执行真实GitHub Actions发布。结构资源沿用已核对版本，未重新取得教师复核。部署步骤见 [DEPLOY.md](DEPLOY.md)。
