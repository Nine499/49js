# Twitter/X 原图强制显示工具 (Original Image Enforcer)

![Version](https://img.shields.io/badge/version-1.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)

通过高性能正则替换，强制 Twitter/X (推特) 显示原始高质量图片。

## ✨ 特性

- 🚀 **零延迟**：即将引入 IntersectionObserver 优化 (Coming Soon)
- ⚡ **轻量级**：纯原生 JavaScript 实现，无任何外部依赖
- 🛡️ **隐私安全**：代码完全开源，不收集任何用户数据

## 📥 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展。
2. 点击下方链接安装脚本：
   - [安装 pbs.twimg.com-orig.js](pbs.twimg.com-orig.js)

## 🛠️ 技术细节

本脚本旨在解决 Twitter 默认加载压缩图片的问题。

**优化策略 (开发中)**：
- **IntersectionObserver**：仅当图片进入视口区域时才触发原图加载，大幅节省带宽并提升页面滚动性能。
- **事件委托 (Event Delegation)**：减少事件监听器数量，降低内存占用。

**当前实现**：
- 使用 `MutationObserver` 实时监听 DOM 变化，自动替换新加载内容的图片链接。
- 高性能正则匹配：预编译 Regex，避免重复开销。

