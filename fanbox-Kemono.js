// ==UserScript==
// @name         Fanbox -> Kemono 按钮（数字ID）
// @namespace    http://tampermonkey.net/
// @version      2026.04.15.000001
// @description  在 Fanbox 帖子页添加按钮，点击后用数字 userId 打开 Kemono
// @author       Nine499
// @icon         https://s.pximg.net/common/images/fanbox/favicon.ico
// @match        https://www.fanbox.cc/@*/posts/*
// @match        https://*.fanbox.cc/posts/*
// @grant        none
// @downloadURL  https://github.com/Nine499/49js/raw/refs/heads/master/fanbox-Kemono.js
// @updateURL    https://github.com/Nine499/49js/raw/refs/heads/master/fanbox-Kemono.js
// ==/UserScript==

(() => {
  "use strict";

  const path = location.pathname;
  const host = location.hostname;

  const wwwMatch = path.match(/^\/@([^/]+)\/posts\/([^/]+)\/?$/);
  const subdomainMatch = path.match(/^\/posts\/([^/]+)\/?$/);
  const subdomainCreatorId = host.match(/^([^.]+)\.fanbox\.cc$/)?.[1];

  const creatorId = wwwMatch?.[1] || (subdomainCreatorId !== "www" ? subdomainCreatorId : null);
  const postId = wwwMatch?.[2] || subdomainMatch?.[1];

  if (!creatorId || !postId) return;

  const cacheKey = `fanbox:numericUserId:${creatorId}`;

  const getNumericUserId = async () => {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;

    const res = await fetch(
      `https://api.fanbox.cc/creator.get?creatorId=${encodeURIComponent(creatorId)}`,
      { credentials: "include" },
    );
    if (!res.ok) return null;

    const userId = (await res.json())?.body?.user?.userId;
    if (userId) sessionStorage.setItem(cacheKey, userId);
    return userId || null;
  };

  const createButton = (url) => {
    const a = document.createElement("a");
    a.textContent = "打开 Kemono";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.cssText = [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:99999",
      "padding:8px 12px",
      "border-radius:6px",
      "background:#1e90ff",
      "color:#fff",
      "text-decoration:none",
      "font:14px/1.2 sans-serif",
      "box-shadow:0 2px 8px rgba(0,0,0,.2)",
    ].join(";");
    document.body.appendChild(a);
  };

  (async () => {
    try {
      const numericUserId = await getNumericUserId();
      if (!numericUserId) return;

      const targetUrl = `https://kemono.cr/fanbox/user/${numericUserId}/post/${postId}`;
      if (document.body) {
        createButton(targetUrl);
      } else {
        window.addEventListener(
          "DOMContentLoaded",
          () => createButton(targetUrl),
          { once: true },
        );
      }
    } catch {}
  })();
})();
