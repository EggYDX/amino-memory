# 界面重设计与参考记录

研究和实施日期：2026-10-10至2026-10-11。直接修改现有React项目，保留出题、判分、FSRS、备份格式、IndexedDB和全部结构资源。

## 布局变化

| 页面 | 原结构 | 新结构 |
|---|---|---|
| 全站 | 固定左导航，主内容被压缩 | 桌面轻量顶部导航；手机五项底部导航；练习时使用独立界面 |
| 首页 | 欢迎标题、推荐大卡、指标行、重复快捷入口 | 七个方向共用一个学习工作台；中心可翻看、揭晓的结构图；旁侧嵌入真实到期复习和覆盖记录 |
| 图鉴 | 同等权重的重复卡片 | 默认索引与大结构图联动；保留并列浏览与骨架对照；手机使用横向索引和可展开筛选 |
| 自定义 | 纵向堆叠全部设置 | 考察内容、练习范围、题量策略三个步骤；编辑状态保留；旁侧实时出题示例；只有一个开始入口 |
| 训练 | 中间纵向题卡 | 桌面结构与作答分区；手机结构优先，按需输入；逐目标校正与整题反馈分层呈现 |
| 记录 | 四个指标卡和列表 | 练习走势、累计表现与22项覆盖条；历史、错题、方向、单项四种视图；独立完成页 |
| 设置 | 多个同类大卡片 | 分区标题与行式设置，备份和清空分别呈现 |

评估过整页单张闪卡和学习工作台两种组织。选择工作台，让频繁切换的7种方向保留直接入口，同时把结构图放到主要视觉区域。进一步将手机图鉴的竖向索引改成横向索引，减少结构图前的控件高度。原首页截图见 [before-home.png](redesign/before-home.png)，新版见 [desktop-home.png](redesign/desktop-home.png) 和 [mobile-home.png](redesign/mobile-home.png)。

## 视觉体系

冷瓷背景 `#f4f6fa`、深蓝文字 `#26334e`、导航蓝 `#2f4161`、矿物青 `#267477`、赭金 `#896328`、灰紫 `#735875`、校正红 `#a44f5a`。颜色分别服务于导航、回忆成功、揭晓与练习走势、结构分类、答案校正，深色主题另有对应令牌。结构图保留原绘图颜色，并使用清晰的白色图面。

中文使用本地系统字体；缩写和数字使用Bahnschrift/Segoe UI并采用稳定数字排版。结构图、选项、章节行、索引、进度和反馈条采用不同形态，避免全站等尺寸卡片。核心颜色在 `src/tokens.css`，布局与组件样式在 `src/styles.css`。

## 实际访问的参考

| 资源 | 实际研究范围 | 采用或取舍 |
|---|---|---|
| [Mobbin](https://mobbin.com/) | 公开首页；访问发现入口后需要登录 | 未获取登录后的完整产品流程，不据此声称完成产品案例研究 |
| [Refero](https://refero.design/) | 公开首页、Web Apps检索入口；完整流程未获取 | 仅记录公开组织方式，未使用无法验证的案例 |
| [Linear](https://linear.app/) | 实际官网与内嵌产品示例，等待内容完成加载 | 信息密度、文字层级、轻分隔；不沿用它的产品侧栏和宣传结构 |
| [Monkeytype](https://monkeytype.com/) | 实际输入练习，键入后观察计时、错误字和专注状态 | 当前任务占主要空间，次要操作收敛；不复制其黑黄视觉 |
| [Motion Primitives](https://motion-primitives.com/docs/animated-background) | 导航示例；实际点击 [Transition Panel](https://motion-primitives.com/docs/transition-panel) 的Next；读取 animated-background、transition-panel、dialog、morphing-dialog 源码 | 共享选中背景、Presence替换内容；按本项目频率重新设定时间和距离 |
| [Animate UI](https://animate-ui.com/docs/components/radix/dialog) | 实际打开Dialog；读取组件及Radix dialog primitive实现 | 入退场与焦点语义；本项目使用原生dialog和轻位移，不采用模糊或3D翻转 |
| [React Bits](https://reactbits.dev/components/animated-list) | 关闭推广遮罩后查看Animated List演示；读取AnimatedList、CountUp、SpotlightCard源码 | 研究列表反馈；不采用0.7缩放、全局拦截Tab、光斑和文字特效 |
| [Hover](https://www.hover.dev/components/tabs) | 公开Tabs演示，实际切换Kanban | 选中指示器的空间连续性；部分源码为付费内容，未复制 |
| [Openlet](https://github.com/ChloeVPin/openlet) | 实际读取card-slider、flashcard、product-layout实现；未找到可确认的公开演示入口 | 回想与揭晓分离、移动过渡和减少动效；未照搬3D翻牌或背景图 |
| [Spaced Repetition App](https://github.com/joelbreit/spaced-repetition-app) | 读取CardReviewView、ReviewSummary；打开 [真实演示](https://flashcards.joelbreit.com/)，Study All后Show Answer | 学习动作与回顾结果分离；本项目保留自动判分和原FSRS策略 |

具体组件来源：[Motion Primitives源码](https://github.com/ibelick/motion-primitives/tree/main/components/core)、[Animate UI源码](https://github.com/imskyleen/animate-ui/tree/main/apps/www/registry/primitives/radix/dialog)、[React Bits源码](https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/AnimatedList)。公开站点截图和源码摘录保存在本次研究工作目录，未将第三方页面拼接进产品。

## 动效落实

使用 `motion/react`，统一共享指示器、内容Presence和模态管理。导航、分段切换与索引使用共享layoutId和低回弹弹簧；页面约140ms，切题约120ms，内容替换约130ms；按钮选中、正确与错误有即时区别；错误输入有轻微水平纠正，反馈条短距进入；图鉴筛选采用布局过渡；配置步骤保留状态并过渡；弹窗、暂停、Toast有进入和退出；进度用scaleX，完成环只在完成时绘制。

`MotionConfig reducedMotion="user"`、组件的 `useReducedMotion` 与CSS媒体查询跟随系统减少动态效果。输入、提交、存储和判定均不依赖动画完成；快速切换以最新选择为准。动效用途、时长和可访问性依据已安装的 frontend-design、ui-ux-pro-max、motion-design Skill复核。

## 二次复核与迭代

根据真实浏览器截图继续修正：手机图鉴控件高度、初始选中项的可见性、跨页与切题滚动位置、手机输入时机、Pyl选项的图面大小、浅色辅助文字对比度、dialog焦点恢复、覆盖图ARIA语义、输入错误的就地反馈，以及Toast的消息类型。34张新版截图在 `docs/redesign/`，包含六种主页面、配置步骤、反馈、成绩、结构选项、对照、暂停、确认和深色主题。

完整结果与限制见 [QA.md](QA.md)。
