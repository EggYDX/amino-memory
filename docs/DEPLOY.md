# 部署到 GitHub Pages

本项目采用 **GitHub Pages + GitHub Actions**：上传源码后自动测试、构建和发布。22种结构图、练习和复习都在浏览器中运行，无需配置服务器、数据库或接口密钥。

## 上传项目

1. 解压新版压缩包，找到包含 `package.json`、`src/`、`public/`、`.github/` 的 `amino-memory` 文件夹。
2. 在 GitHub 新建一个空仓库，例如 `amino-memory`。GitHub Free 使用公开仓库；创建时不要勾选添加 README、许可证或 gitignore。
3. 在项目文件夹内打开终端，执行以下命令。仓库网址替换成自己的真实地址：

```powershell
git init -b main
git add .
git commit -m "Add amino acid learning app"
git remote add origin https://github.com/你的用户名/amino-memory.git
git push -u origin main
```

本机已安装 Git。首次提交若要求设置姓名和邮箱，按 Git 的提示设置自己的提交身份后再执行 `git commit`。推送时完成 GitHub 登录。

也可用 GitHub Desktop 上传：将已初始化的项目通过 **File → Add local repository** 加入，然后点击 **Publish repository**。免费方案发布公开仓库时取消 **Keep this code private**。不要把整个 `amino-memory` 文件夹再放进仓库的一层同名目录；`package.json` 应在仓库根目录。

`.gitignore` 已排除依赖、测试临时文件和 `dist/`。GitHub 会重新构建 `dist/`；请保留 `.github/workflows/pages.yml`、`pnpm-lock.yaml` 和 `.gitattributes`。

## 设置 Pages

1. 进入仓库 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
3. 打开 **Actions → Deploy to GitHub Pages → Run workflow**，选择 `main` 并运行。首次上传若已自动触发，可在设置好 Pages 后重新运行。
4. 等待 build、deploy 都变绿，再回到 Pages 打开网站。通常网址为 `https://你的用户名.github.io/amino-memory/`。

已有工作流会安装锁定依赖、执行31项核心测试、构建PWA、执行普通浏览器检查，然后只发布 `dist/`。子路径专项测试在本地另行运行。当前相对资源路径与Hash路由已在 `/amino-memory/` 下验证，仓库改名无需重写路由。

之后修改源码并推送到 `main`，就会自动更新网站。更新时完成当前练习，再点击网页中的更新提示。

## 本地继续使用

双击 `启动网页.cmd`，打开 `http://127.0.0.1:4173/`。不修改源码时无需安装项目依赖；脚本使用随包提供的生产构建。保持终端窗口开启，Ctrl+C 停止服务。

本地升级后继续使用原来的浏览器与相同网址，可以读取原学习记录。GitHub Pages 属于另一个站点，需要先在本地 **设置 → 导出 JSON**，再到线上 **设置 → 导入备份**。记录不会自动上传或跨设备同步。

手机打开 Pages 的HTTPS网址，首次联网等待资源缓存后可离线练习，也可以从浏览器菜单添加到主屏幕。

本次没有创建远程仓库或执行公开发布。依据：[GitHub Pages工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Vite部署说明](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Desktop导入](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop)、[GitHub Desktop发布](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop)。
