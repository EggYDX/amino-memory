# 更新网站

在线地址：[氨基酸 · 记忆练习](https://eggydx.github.io/amino-memory/)。

1. 修改后运行 `pnpm test` 和 `pnpm build`，必要时运行 `pnpm test:e2e`。
2. 将源代码、资源、锁文件等改动提交并推送到仓库的 `main`。不用上传 `node_modules/` 或手动上传 `dist/`。
3. 在 GitHub 的 Actions 查看 **Deploy to GitHub Pages** 是否成功；现有工作流会测试、构建并部署。
4. 网页显示新版本提示后，结束当前练习再点“更新”。手机主屏幕版同样通过这个入口更新。

更新仍使用原网址，浏览器记录可以保留。换站点、换设备或清理缓存前，先从设置导出 JSON，再在目标浏览器导入。浏览器的“清除网站数据”会同时删除学习记录。

本地预览：`pnpm preview`；发布包也可双击 `启动网页.cmd`。用同一浏览器和网址访问才能读到原来的本地记录。
