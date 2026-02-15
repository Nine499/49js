// ==UserScript==
// @name         Twitter/X Original Image URL Enforcer
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Force original image quality on Twitter/X with high-performance Regex replacement
// @author       Nine499
// @match        *://twitter.com/*
// @match        *://x.com/*
// @match        *://mobile.twitter.com/*
// @match        *://tweetdeck.twitter.com/*
// @match        *://pbs.twimg.com/*
// @updateURL    https://github.com/Nine499/49js/raw/refs/heads/master/pbs.twimg.com-orig.js
// @downloadURL  https://github.com/Nine499/49js/raw/refs/heads/master/pbs.twimg.com-orig.js
// @icon         https://abs.twimg.com/favicons/twitter.2.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 预编译正则，避免在循环中重复编译 (Performance Hotspot)
    // 匹配 name=xxx，分组1保留前缀字符(?|&)
    const NAME_PARAM_REGEX = /([?&]name=)[^&]+/;
    const TARGET_HOST_CHECK = 'pbs.twimg.com';
    const TARGET_MARKER = 'name=orig';

    /**
     * 高性能 URL 转换器 (String & Regex 模式)
     * 相比 new URL() API，字符串操作在 V8 引擎中通常快 10-50 倍
     * @param {string} url - 原始 URL
     * @returns {string|null} - 返回修改后的 URL，无需修改返回 null
     */
    const getOrigUrl = (url) => {
        // 1. 极速筛选：非目标域名或已经是高清图，直接跳过
        if (!url || !url.includes(TARGET_HOST_CHECK) || url.includes(TARGET_MARKER)) {
            return null;
        }

        // 2. 替换逻辑 (Upsert)
        if (NAME_PARAM_REGEX.test(url)) {
            // Case A: 存在 name 参数 -> 替换为 name=orig
            return url.replace(NAME_PARAM_REGEX, '$1orig');
        } else {
            // Case B: 不存在 name 参数 -> 追加
            // 检查是否已有查询参数来决定连接符
            const separator = url.includes('?') ? '&' : '?';
            return url + separator + TARGET_MARKER;
        }
    };

    // ==========================================
    // 策略 A: Direct Visit Mode (CDN 直接访问)
    // ==========================================
    if (window.location.hostname === TARGET_HOST_CHECK) {
        const newUrl = getOrigUrl(window.location.href);
        if (newUrl) {
            window.location.replace(newUrl);
        }
        return; // 直接访问无需监听 DOM
    }

    // ==========================================
    // 策略 B: SPA DOM Observer (主站浏览)
    // ==========================================
    const handleElement = (node) => {
        // 处理 IMG
        if (node.tagName === 'IMG') {
            const newSrc = getOrigUrl(node.src);
            if (newSrc) {
                node.src = newSrc;
                // 关键：移除 srcset，否则高 DPI 屏幕浏览器会忽略 src 属性
                if (node.hasAttribute('srcset')) node.removeAttribute('srcset');
            }
            return;
        }
        // 处理 A (在新标签页打开)
        if (node.tagName === 'A') {
            const newHref = getOrigUrl(node.href);
            if (newHref) node.href = newHref;
        }
    };

    // 使用单个处理器处理 mutations，减少函数创建开销
    const mutationHandler = (mutations) => {
        for (const mutation of mutations) {
            // 1. 处理新增节点 (Added Nodes)
            if (mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue; // 忽略文本/注释节点

                    // 检查自身
                    handleElement(node);

                    // 深度检查子节点 (针对 Twitter 的组件嵌套结构)
                    // getElementsByTagName 在动态 DOM 扫描中通常比 querySelectorAll 快
                    if (node.firstElementChild) {
                        const imgs = node.getElementsByTagName('img');
                        for (let i = 0, len = imgs.length; i < len; i++) {
                            // 内联逻辑减少函数调用栈
                            const img = imgs[i];
                            const newSrc = getOrigUrl(img.src);
                            if (newSrc) {
                                img.src = newSrc;
                                if (img.hasAttribute('srcset')) img.removeAttribute('srcset');
                            }
                        }

                        const links = node.getElementsByTagName('a');
                        for (let i = 0, len = links.length; i < len; i++) {
                            const link = links[i];
                            const newHref = getOrigUrl(link.href);
                            if (newHref) link.href = newHref;
                        }
                    }
                }
            }

            // 2. 处理属性变更 (Attributes) - 针对 React 仅更新属性不替换 DOM 的情况
            else if (mutation.type === 'attributes') {
                handleElement(mutation.target);
            }
        }
    };

    const observer = new MutationObserver(mutationHandler);

    // Twitter/X 是高度动态的 SPA，需要监听整个 body
    // 尽量推迟到 body 出现再监听，但 run-at document-start 保证尽早介入
    const startObserver = () => {
        if (!document.body) {
            requestAnimationFrame(startObserver);
            return;
        }
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'href'] // 仅监听关键属性，极大减少 CPU 占用
        });
    };

    startObserver();

})();
