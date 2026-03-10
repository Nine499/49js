# 49js Userscript 集合

本仓库收录多个可直接安装的 Tampermonkey userscript。每个脚本独立生效，按各自 `@match` 规则运行，互不依赖。

## 快速安装

### 1) 安装 Tampermonkey

- 浏览器扩展安装地址：https://www.tampermonkey.net/

### 2) 安装 `pbs.twimg.com-orig.js`

- 远程安装（推荐）：
  - https://github.com/Nine499/49js/raw/refs/heads/master/pbs.twimg.com-orig.js
- 本地安装（开发）：
  - 仓库文件：`pbs.twimg.com-orig.js`

### 3) 安装 `fanbox-Kemono.js`

- 远程安装（推荐）：
  - https://github.com/Nine499/49js/raw/refs/heads/master/fanbox-Kemono.js
- 本地安装（开发）：
  - 仓库文件：`fanbox-Kemono.js`

### 4) 安装 `d-twimg.js`

- 远程安装（推荐）：
  - https://github.com/Nine499/49js/raw/refs/heads/master/d-twimg.js
- 本地安装（开发）：
  - 仓库文件：`d-twimg.js`

## 脚本目录

| 脚本 | 作用 | 匹配范围 | 输出行为 | 适用场景 |
| --- | --- | --- | --- | --- |
| `pbs.twimg.com-orig.js` | 统一原图参数 | `*://pbs.twimg.com/*` | 将 URL 参数 `name` 规范为 `orig`，必要时重定向 | 在 X/Twitter 图片直链页获取原图 |
| `fanbox-Kemono.js` | 帖子页跳转按钮 | `https://www.fanbox.cc/@*/posts/*` | 注入“打开 Kemono”按钮，跳转到对应 post | 在 Fanbox 帖子页快速跳转 |
| `d-twimg.js` | 推文原图下载按钮 | `https://x.com/*/status/*` | 在推文详情页“查看”附近插入“下载原图”按钮，批量下载当前推文原图 | 在 X 推文详情页保存多图原图 |

## 脚本详情

### `pbs.twimg.com-orig.js`

- 作用：把 `pbs.twimg.com` 图片链接统一到原图参数。
- 生效范围：`*://pbs.twimg.com/*`
- 行为规则：
  - 若 `name=orig`，不处理。
  - 若 `name` 缺失或不是 `orig`，改写为 `orig` 并执行 `location.replace`。
  - 非 `pbs.twimg.com` 域名不生效。
- 示例：
  - `https://pbs.twimg.com/media/xxx.jpg?format=jpg&name=small` → `name=orig`
  - `https://pbs.twimg.com/media/xxx.jpg?format=jpg` → 补上 `name=orig`

### `fanbox-Kemono.js`

- 作用：在 Fanbox 帖子页生成跳转到 Kemono 的按钮。
- 生效范围：`https://www.fanbox.cc/@*/posts/*`
- 行为规则：
  - 从路径提取 `creatorId` 与 `postId`。
  - 调用 `creator.get` 获取数字 `userId`，并缓存到 `sessionStorage`。
  - 在页面右下角注入“打开 Kemono”按钮，跳转至对应 post。
- 示例：
  - 访问 `https://www.fanbox.cc/@<creator>/posts/<postId>` 后，页面出现按钮。
  - 点击按钮后打开 `https://kemono.cr/fanbox/user/<numericUserId>/post/<postId>`。
- 注意事项：
  - 依赖页面可正常访问 Fanbox API。

### `d-twimg.js`

- 作用：在 X 推文详情页为当前推文添加“下载原图”按钮。
- 生效范围：`https://x.com/*/status/*`
- 行为规则：
  - 只处理当前 URL 对应主推文中的 `pbs.twimg.com/media` 图片。
  - 下载时统一把图片 URL 规范到 `name=orig`。
  - 文件名格式为 `<user>-<tweetId>-p<序号>.<扩展名>`。
  - 按钮挂载在推文底部“查看”区域附近，点击后顺序触发下载。
- 示例：
  - `https://x.com/<user>/status/<tweetId>` 页面点击“下载原图”后，得到：
    - `<user>-<tweetId>-p1.jpg`
    - `<user>-<tweetId>-p2.png`
    - ...

## FAQ

### 1) 脚本没生效怎么办？

按顺序排查：

1. 确认 Tampermonkey 已启用。
2. 确认访问页面匹配脚本 `@match`。
3. 刷新页面并观察脚本是否被执行。

### 2) 为什么只在特定域名生效？

脚本按元数据 `@match` 精确匹配，默认不会跨站运行，这是预期行为。

### 3) 远程安装和本地安装有什么区别？

- 远程安装：通过 `@updateURL` / `@downloadURL` 跟随仓库更新，适合日常使用。
- 本地安装：适合调试和开发，版本由本地文件控制。

## 版本与更新

- 版本号采用时间格式：`YYYY.MM.DD.HHMMSS`
- 更新记录建议区分：
  - 行为变更（影响脚本执行逻辑）
  - 文档变更（仅说明更新）

## License

MIT
