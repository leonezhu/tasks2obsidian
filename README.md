# tasks2obsidian

Google Tasks 页面上的 Obsidian 链接助手：复制任务内容时自动检测 `obsidian://` 链接和 `[[wikilink]]`，弹出小窗一键跳转打开 / 一键复制文件名。

两种形态二选一：

| 形态 | 路径 | 依赖 |
|---|---|---|
| **Chrome 扩展**（推荐） | `extension/` 目录 | 无，Chrome/Edge 原生加载 |
| 油猴脚本 | `tasks2obsidian.user.js` | Tampermonkey / Violentmonkey |

## 背景

笔记的 gtask 消化管道（Hermes cron）处理完任务后，会在 task 的 notes 里追加：

```
📚 Obsidian: obsidian://open?vault=notes&file=References/Technology/Xxx.md
🔗 Source: https://...
```

原来要打开 https://olo-phi.vercel.app/ → 粘贴 → 识别 → 点击打开，四步。这个脚本把"检测+弹窗"直接搬进 tasks.google.com 页面，复制即弹出，一步到位。

## 安装方式一：Chrome 扩展（推荐，免装 Tampermonkey）

1. Chrome 打开 `chrome://extensions/`
2. 右上角开启「开发者模式」
3. 点「加载已解压的扩展程序」→ 选择本仓库的 `extension/` 目录
4. 打开 https://tasks.google.com/tasks/ 使用

## 安装方式二：油猴脚本（Tampermonkey / Violentmonkey）

1. 浏览器装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 点 Tampermonkey 图标 → 添加新脚本 → 粘贴 `tasks2obsidian.user.js` 全部内容 → 保存
3. 打开 https://tasks.google.com/tasks/

## 使用

| 动作 | 效果 |
|---|---|
| 在任务上选中文字并复制（⌘C） | 自动检测选中文本，含 Obsidian 链接则右下角弹窗 |
| `Alt+V` | 随时手动检测剪贴板内容 |
| 弹窗点「打开」 | 新窗口跳转 `obsidian://` 链接（Obsidian 打开对应笔记） |
| 弹窗点「复制名」 | 复制文件名（如 `Xxx.md` → `Xxx`），方便去 Obsidian 里 ⌘O 快速搜索 |
| 点 ✕ 或 Esc 外区域 | 关闭弹窗 |

支持的链接格式：
- `obsidian://open?vault=xxx&file=path/to/note.md`（含空格文件名）
- `obsidian://open?vault=xxx&file=path%20with%20space.md`
- `[[wikilink]]` 和 `[[wikilink|alias]]`（自动拼 vault=notes 的 URI）

## 已知限制

- `copy` 事件依赖页面选中文本；tasks 页面个别区域（如 notes 展开详情）若用程序化复制不触发事件，用 `Alt+V` 兜底
- 点击「打开」用的是 `window.open`，浏览器可能拦截弹窗——首次使用允许该站点弹窗即可
- Chrome 强制要求 `obsidian://` 协议跳转前页面处于前台（浏览器安全策略），保持 tasks 标签页活跃即可

## Roadmap

- [x] 纯 Chrome 扩展版（Manifest V3）
- [ ] 检测到多个链接时聚合 OLO 深链（`?u=`）一键全开
- [ ] 记住上次关闭的链接 hash，24h 内不重复弹

## License

MIT
