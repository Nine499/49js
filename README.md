# pbs.twimg.com 原图链接规范脚本 (Original Image URL Normalizer)

![Version](https://img.shields.io/badge/version-2026.02.16.084139-blue)
![License](https://img.shields.io/badge/license-MIT-green)

这个 userscript **只在 `pbs.twimg.com` 生效**。

当你在 X/Twitter 中右键图片并“在新标签页打开”后，进入 `pbs.twimg.com` 图片链接时，脚本会自动把 URL 规范为原图参数：`name=orig`。

## ✨ 行为说明

- 仅匹配：`*://pbs.twimg.com/*`
- 如果已是 `name=orig`：不跳转
- 如果 `name` 不是 `orig`：改写为 `orig`
- 如果没有 `name` 参数：自动补上 `name=orig`
- 对 `x.com` / `twitter.com` 以及其他网站：完全不生效

## ⚡ 性能设计

- 在 `document-start` 阶段执行
- 仅做一次 URL 解析与条件重定向
- 不使用 `MutationObserver` / `IntersectionObserver` / 事件监听
- 无 DOM 扫描与持续运行开销

## 📥 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展。
2. 点击下方链接安装脚本：
   - [安装 pbs.twimg.com-orig.js](pbs.twimg.com-orig.js)

## 🧪 URL 示例

- `https://pbs.twimg.com/media/xxx.jpg?format=jpg&name=small`
  - 自动变为：`...&name=orig`
- `https://pbs.twimg.com/media/xxx.jpg?format=jpg&name=orig`
  - 保持不变
- `https://pbs.twimg.com/media/xxx.jpg?format=jpg`
  - 自动补：`&name=orig`
