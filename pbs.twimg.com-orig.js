// ==UserScript==
// @name         Twitter/X Original Image URL Enforcer
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  强制将 pbs.twimg.com 的图片链接参数重写为 name=orig
// @author       GeekEngineer
// @match        *://twitter.com/*
// @match        *://x.com/*
// @match        *://mobile.twitter.com/*
// @match        *://tweetdeck.twitter.com/*
// @match        *://pbs.twimg.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const TARGET_HOST = 'pbs.twimg.com';
    const TARGET_PARAM = 'name';
    const TARGET_VALUE = 'orig';

    /**
     * 核心 URL 处理逻辑 (纯函数)
     * @param {string} rawUrl - 原始 URL 字符串
     * @returns {string|null} - 重组后的 URL，如果没有变更则返回 null
     */
    const transformUrl = (rawUrl) => {
        if (!rawUrl) return null;

        // 性能优化：快速预检
        if (!rawUrl.includes(TARGET_HOST)) return null;

        try {
            const url = new URL(rawUrl);

            // 校验 Host
            if (url.hostname !== TARGET_HOST) return null;

            // 幂等性检查：如果已经是 orig，直接返回 null，防止死循环
            if (url.searchParams.get(TARGET_PARAM) === TARGET_VALUE) return null;

            // Upsert 逻辑
            url.searchParams.set(TARGET_PARAM, TARGET_VALUE);

            return url.toString();
        } catch (e) {
            // 忽略非标准 URL 解析错误
            return null;
        }
    };

    /**
     * 策略 A: Direct Visit Mode
     * 针对直接访问图片链接的场景 (Host 为 pbs.twimg.com)
     */
    if (window.location.hostname === TARGET_HOST) {
        const newUrl = transformUrl(window.location.href);
        if (newUrl) {
            // 使用 replace 而非 assign，避免破坏浏览器回退历史
            window.location.replace(newUrl);
        }
        return; // 直接访问模式下，无需启动 DOM 监听，执行完毕退出
    }

    /**
     * 策略 B: SPA DOM Injection Mode
     * 针对在 Twitter/X 网站内浏览的场景
     */
    const processNode = (node) => {
        // 处理图片标签
        if (node.tagName === 'IMG' && node.src) {
            const newSrc = transformUrl(node.src);
            if (newSrc) {
                node.src = newSrc;
                // 移除 srcset 防止浏览器根据 DPI 自动回退到低清图
                if (node.hasAttribute('srcset')) {
                    node.removeAttribute('srcset');
                }
            }
        }

        // 处理超链接标签
        if (node.tagName === 'A' && node.href) {
            const newHref = transformUrl(node.href);
            if (newHref) node.href = newHref;
        }
    };

    // 实例化 MutationObserver
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        processNode(node);
                        // 深度扫描子节点
                        const imgs = node.getElementsByTagName('img');
                        const anchors = node.getElementsByTagName('a');
                        // 使用 HTMLCollection 的 for 循环比 querySelectorAll 略快
                        for (let i = 0; i < imgs.length; i++) processNode(imgs[i]);
                        for (let i = 0; i < anchors.length; i++) processNode(anchors[i]);
                    }
                });
            }

            if (mutation.type === 'attributes') {
                processNode(mutation.target);
            }
        });
    });

    // 启动监听
    observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'href']
    });

    console.log('[Geek Script] Twitter Original Image Enforcer Activated (Mode: SPA).');

})();
