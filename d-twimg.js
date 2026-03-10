// ==UserScript==
// @name         X 推文原图下载按钮
// @namespace    http://tampermonkey.net/
// @version      2026.03.10.201658
// @description  在 X 推文详情页添加按钮，下载当前推文的全部原图
// @author       Nine499
// @icon         https://abs.twimg.com/favicons/twitter.3.ico
// @match        https://x.com/*/status/*
// @grant        GM_download
// @grant        window.onurlchange
// @downloadURL  https://github.com/Nine499/49js/raw/refs/heads/master/d-twimg.js
// @updateURL    https://github.com/Nine499/49js/raw/refs/heads/master/d-twimg.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const BUTTON_ID = "d-twimg-download-button";
  const BUTTON_WRAPPER_ID = "d-twimg-download-wrapper";
  const BUTTON_TEXT_IDLE = "下载原图";
  const BUTTON_TEXT_BUSY = "下载中...";
  const BUTTON_TEXT_EMPTY = "无图片";
  const VIEW_LABEL_TEXT = "查看";
  const VIEW_LABEL_XPATH =
    "/html/body/div[1]/div/div/div[2]/main/div/div/div/div/div/section/div/div/div[1]/div/div/article/div/div/div[3]/div[3]/div/div[1]/div/a/span/span";

  function parseStatusPath(pathname) {
    const match = String(pathname || "").match(
      /^\/([^/]+)\/status\/([^/?#]+)$/,
    );
    if (!match) {
      return null;
    }

    return {
      screenName: match[1],
      tweetId: match[2],
    };
  }

  function normalizeOriginalImageUrl(input) {
    const url = new URL(input);
    if (url.hostname !== "pbs.twimg.com") {
      return null;
    }

    if (!url.pathname.startsWith("/media/")) {
      return null;
    }

    url.searchParams.set("name", "orig");
    return url.toString();
  }

  function getExtensionFromUrl(input) {
    const url = new URL(input);
    const format = url.searchParams.get("format");
    if (format) {
      return format.toLowerCase();
    }

    const match = url.pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : "jpg";
  }

  function buildDownloadName(screenName, tweetId, index, extension) {
    return `${screenName}-${tweetId}-p${index}.${extension || "jpg"}`;
  }

  function getButtonTextForState(state) {
    if (state === "busy") {
      return BUTTON_TEXT_BUSY;
    }

    if (state === "empty") {
      return BUTTON_TEXT_EMPTY;
    }

    return BUTTON_TEXT_IDLE;
  }

  function isStatusPage() {
    return parseStatusPath(window.location.pathname) !== null;
  }

  function getStatusUrlPath() {
    const parsed = parseStatusPath(window.location.pathname);
    return parsed ? `/${parsed.screenName}/status/${parsed.tweetId}` : null;
  }

  function findPrimaryArticle() {
    const statusPath = getStatusUrlPath();
    if (!statusPath) {
      return null;
    }

    const articles = Array.from(document.querySelectorAll("article"));
    for (const article of articles) {
      const links = article.querySelectorAll('a[href*="/status/"]');
      for (const link of links) {
        const href = new URL(link.href);
        if (href.pathname === statusPath) {
          return article;
        }
      }
    }

    return null;
  }

  function collectOriginalImageUrls(article) {
    const seen = new Set();
    const results = [];
    const images = article.querySelectorAll('img[src*="pbs.twimg.com"]');

    for (const image of images) {
      const normalized = normalizeOriginalImageUrl(
        image.currentSrc || image.src,
      );
      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      results.push(normalized);
    }

    return results;
  }

  function findViewLabelSpan(article) {
    const xpathNode = document.evaluate(
      VIEW_LABEL_XPATH,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;
    if (xpathNode instanceof HTMLElement && article.contains(xpathNode)) {
      return xpathNode;
    }

    const spans = article.querySelectorAll("span");
    for (const span of spans) {
      if (span.textContent?.trim() === VIEW_LABEL_TEXT) {
        return span;
      }
    }

    return null;
  }

  function buildInlineButton(referenceSpan) {
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.setAttribute("aria-label", BUTTON_TEXT_IDLE);
    button.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "gap:4px",
      "padding:0",
      "margin:0",
      "border:0",
      "background:transparent",
      "cursor:pointer",
      "color:inherit",
    ].join(";");

    const label = document.createElement("span");
    label.textContent = BUTTON_TEXT_IDLE;
    label.className = referenceSpan.className;
    label.setAttribute("data-role", "d-twimg-label");
    button.appendChild(label);

    button.addEventListener("click", () => {
      void handleDownloadClick(button);
    });

    return button;
  }

  function getInjectedWrapper() {
    return document.getElementById(BUTTON_WRAPPER_ID);
  }

  function removeInjectedButton() {
    getInjectedWrapper()?.remove();
  }

  function mountButtonInArticle(article) {
    const existingWrapper = getInjectedWrapper();
    const viewLabel = findViewLabelSpan(article);
    if (!viewLabel) {
      removeInjectedButton();
      return;
    }

    const viewLink = viewLabel.closest("a");
    const anchorHost = viewLink?.parentElement;
    if (!anchorHost) {
      return;
    }

    if (existingWrapper && article.contains(existingWrapper)) {
      return;
    }

    removeInjectedButton();

    const button = buildInlineButton(viewLabel);
    const wrapper = viewLink.cloneNode(false);
    wrapper.id = BUTTON_WRAPPER_ID;
    wrapper.removeAttribute("href");
    wrapper.removeAttribute("target");
    wrapper.removeAttribute("rel");
    wrapper.style.cursor = "pointer";
    wrapper.appendChild(button);

    anchorHost.insertAdjacentElement("afterend", wrapper);
  }

  function setButtonState(button, state, title) {
    const label = button.querySelector('[data-role="d-twimg-label"]');
    const text = getButtonTextForState(state);

    button.disabled = state === "busy";
    label.textContent = text;
    button.setAttribute("aria-label", text);
    button.title = title || "";
    button.style.opacity = state === "busy" ? "0.7" : "1";
    button.style.cursor = state === "busy" ? "wait" : "pointer";
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function waitForArticle(timeoutMs) {
    return new Promise((resolve) => {
      const existing = findPrimaryArticle();
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const article = findPrimaryArticle();
        if (!article) {
          return;
        }

        observer.disconnect();
        resolve(article);
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      window.setTimeout(() => {
        observer.disconnect();
        resolve(findPrimaryArticle());
      }, timeoutMs);
    });
  }

  function downloadFile(url, name) {
    return new Promise((resolve, reject) => {
      if (typeof GM_download !== "function") {
        reject(new Error("GM_download unavailable"));
        return;
      }

      try {
        GM_download({
          url,
          name,
          conflictAction: "uniquify",
          saveAs: false,
          onload: () => resolve(),
          onerror: (error) =>
            reject(new Error(error?.error || "download failed")),
          ontimeout: () => reject(new Error("download timeout")),
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function handleDownloadClick(button) {
    const parsed = parseStatusPath(window.location.pathname);
    if (!parsed) {
      setButtonState(button, "idle", "当前页面不是推文详情页");
      return;
    }

    setButtonState(button, "busy", "正在收集图片");
    const article = await waitForArticle(4000);

    if (!article) {
      setButtonState(button, "idle", "未找到当前推文内容");
      return;
    }

    const urls = collectOriginalImageUrls(article);
    if (urls.length === 0) {
      setButtonState(button, "empty", "当前推文没有可下载的正文图片");
      await delay(1200);
      setButtonState(button, "idle", "");
      return;
    }

    const failures = [];
    for (const [index, url] of urls.entries()) {
      const filename = buildDownloadName(
        parsed.screenName,
        parsed.tweetId,
        index + 1,
        getExtensionFromUrl(url),
      );

      try {
        await downloadFile(url, filename);
      } catch (error) {
        failures.push(
          `${filename}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (failures.length > 0) {
      setButtonState(button, "idle", failures.join("\n"));
      return;
    }

    setButtonState(button, "idle", `已触发 ${urls.length} 张原图下载`);
  }

  function ensureButton() {
    if (!isStatusPage()) {
      removeInjectedButton();
      return;
    }

    const article = findPrimaryArticle();
    if (!article) {
      return;
    }

    mountButtonInArticle(article);
  }

  let ensureScheduled = false;

  function scheduleEnsureButton() {
    if (ensureScheduled) {
      return;
    }

    ensureScheduled = true;
    window.requestAnimationFrame(() => {
      ensureScheduled = false;
      ensureButton();
    });
  }

  function bootstrap() {
    ensureButton();

    const observer = new MutationObserver(() => {
      scheduleEnsureButton();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    if (typeof window.addEventListener === "function") {
      window.addEventListener("urlchange", scheduleEnsureButton);
      window.addEventListener("popstate", scheduleEnsureButton);
    }
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
    } else {
      bootstrap();
    }
  }
})();
