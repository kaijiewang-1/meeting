# Git 错误原因、避免方式和解决流程

## 本次问题概述

这次 Git 问题主要由本地分支和远端分支同时产生新提交导致。

当时本地 `main` 和远端 `origin/main` 的状态是：

```text
main...origin/main [ahead 1, behind 1]
```

含义是：

- 本地比远端多 1 个提交。
- 远端也比本地多 1 个提交。
- 两边已经分叉，不能直接普通 push。

后续执行 rebase 时，又出现了冲突和 Vim 编辑器卡住的问题。

## 具体原因

### 1. 本地和远端提交分叉

远端已经有别人或另一台机器推送的新提交：

```text
44db5f4 修复主题色为#871d41，修复按钮悬浮字体显示问题，优化新建预约页面布局
```

本地也有尚未推送的提交：

```text
ce20116 合并整理
```

这两个提交都基于较早的共同提交产生，所以 Git 无法直接判断应该如何合并。

### 2. rebase 没有正确落到 origin/main 之后

一开始处于一个未完成的 rebase 状态，Git 提示：

```text
You are currently editing a commit while rebasing branch 'main'
```

说明 rebase 流程还没有完全结束。

后来需要明确执行：

```bash
git rebase origin/main
```

把本地提交重新放到远端最新提交之后。

### 3. 冲突来自目录迁移和生成文件

rebase 时出现了这些冲突：

```text
backend/routes/__pycache__/approval_routes.cpython-312.pyc
backend/routes/__pycache__/notification_routes.cpython-312.pyc
frontend-vue/src/package-lock.json
```

原因分别是：

- `__pycache__/*.pyc` 是 Python 编译产物，不应该提交到仓库。
- 本地版本删除了旧 `backend/`。
- 本地版本删除了旧 `front/`，并迁移到 `frontend-vue/`。
- Git 把旧 `front/package-lock.json` 错误推断成了 `frontend-vue/src/package-lock.json`。

所以正确处理方式是删除这些冲突产物，保留整理后的目录结构。

### 4. Vim 提交信息编辑器卡住

执行：

```bash
git rebase --continue
```

时，Git 打开了 Vim 编辑提交信息。

由于编辑器没有正常退出，留下了：

```text
.git/.COMMIT_EDITMSG.swp
```

导致再次继续 rebase 时出现 swap 文件警告。

## 本次解决方式

### 1. 查看分支状态

```bash
git status --short --branch
```

确认分支处于：

```text
main...origin/main [ahead 1, behind 1]
```

### 2. 查看本地和远端分叉

```bash
git log --oneline --decorate --graph --all --max-count=12
```

确认本地提交和远端提交是并列分叉。

### 3. rebase 到远端最新提交

```bash
git rebase origin/main
```

这一步把本地提交重放到 `origin/main` 后面。

### 4. 解决冲突

删除不应该保留的冲突文件：

```bash
git rm backend/routes/__pycache__/approval_routes.cpython-312.pyc
git rm backend/routes/__pycache__/notification_routes.cpython-312.pyc
git rm frontend-vue/src/package-lock.json
```

### 5. 清理 Vim swap 文件

确认没有 Vim 进程占用后，删除残留 swap：

```powershell
Remove-Item -LiteralPath .git\.COMMIT_EDITMSG.swp
```

### 6. 非交互继续 rebase

为了避免再次进入 Vim：

```powershell
$env:GIT_EDITOR='true'; git rebase --continue
```

最终生成新的本地提交：

```text
c0697b4 合并整理
```

### 7. 验证构建

```bash
npm run build
```

构建通过后再 push。

### 8. 推送远端

```bash
git push origin main
```

最终本地和远端同步：

```text
main...origin/main
```

## 如何避免类似问题

### 1. 每次开始开发前先拉取远端最新代码

推荐：

```bash
git pull --rebase origin main
```

这样可以减少无意义的 merge commit，也更容易保持提交历史清晰。

### 2. push 前先检查状态

```bash
git status --short --branch
```

如果看到：

```text
[behind 1]
```

说明远端有新提交，需要先 pull 或 rebase。

如果看到：

```text
[ahead 1, behind 1]
```

说明本地和远端已经分叉，需要先处理同步，不能直接 push。

### 3. 不提交生成文件

以下文件通常不应该提交：

- `__pycache__/`
- `*.pyc`
- `target/`
- `dist/`
- `.class`
- IDE 临时文件
- 编辑器 swap 文件

建议在 `.gitignore` 中加入：

```gitignore
__pycache__/
*.pyc
target/
dist/
*.swp
```

注意：如果这些文件已经被 Git 跟踪，仅加入 `.gitignore` 不会自动取消跟踪，需要额外执行：

```bash
git rm --cached <file>
```

### 4. 目录迁移时尽量一次性完成

本次冲突和旧目录迁移有关：

- `front/` 删除。
- 样式文件迁移到 `frontend-vue/src/styles/`。
- 旧 `backend/` 删除。
- 新 `backend-spring/` 保留。

做这类大范围迁移时，最好：

- 先同步远端最新代码。
- 单独提交目录迁移。
- 避免同时混入大量业务修改。
- 提交前检查是否有错误路径，比如 `frontend-vue/src/package-lock.json`。

### 5. 避免 Git 打开 Vim 卡住

可以设置一个更熟悉的编辑器，例如 VS Code：

```bash
git config --global core.editor "code --wait"
```

或者在继续 rebase 时临时跳过编辑器：

```powershell
$env:GIT_EDITOR='true'; git rebase --continue
```

## 常用排查命令

查看当前状态：

```bash
git status
```

查看简洁分支状态：

```bash
git status --short --branch
```

查看冲突文件：

```bash
git diff --name-only --diff-filter=U
```

查看本地和远端分叉：

```bash
git log --oneline --decorate --graph --all --max-count=20
```

查看本地相对远端多了哪些提交：

```bash
git log --oneline origin/main..HEAD
```

查看远端相对本地多了哪些提交：

```bash
git log --oneline HEAD..origin/main
```

继续 rebase：

```bash
git rebase --continue
```

放弃当前 rebase，回到 rebase 前状态：

```bash
git rebase --abort
```

## 推荐工作流

日常开发建议按下面顺序：

```bash
git status --short --branch
git pull --rebase origin main

# 修改代码

git status --short
git add .
git commit -m "你的提交信息"
git pull --rebase origin main
git push origin main
```

如果团队多人同时开发，建议进一步使用功能分支：

```bash
git checkout -b feature/xxx
git push origin feature/xxx
```

然后通过 Pull Request 合并到 `main`，可以显著减少直接在 `main` 上产生冲突的概率。

