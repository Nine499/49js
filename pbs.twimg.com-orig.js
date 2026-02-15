// ==UserScript==
// @name         Twitter/X Original Image URL Enforcer
// @namespace    http://tampermonkey.net/
// @version      1.3
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

    /**
     * @fileoverview Twitter/X Original Image Enforcer
     *
     * Architecture:
     * 1. UrlUtils: Pure utility for string manipulation of Twitter image URLs.
     * 2. Direct Navigation Strategy: If the user visits pbs.twimg.com directly, redirect immediately.
     * 3. SPA/feed Strategy:
     *    - IntersectionObserver: Lazily updates <img> src attributes as they scroll into view.
     *      This is much more performant than eagerly updating all images in the DOM.
     *    - MutationObserver: Watches for new nodes to attach the IntersectionObserver.
     *    - Event Delegation: Updates <a> href attributes on hover/click to avoid expensive
     *      DOM queries for every link.
     */

    /**
     * Utility module for Twitter URL manipulation.
     * Handles the logic of converting typical quality variants to 'orig'.
     */
    const UrlUtils = {
        TARGET_HOST: 'pbs.twimg.com',
        PARAM_NAME: 'name',
        VALUE_ORIG: 'orig',
        NAME_REGEX: /([?&]name=)[^&]+/,

        /**
         * Checks if a URL is hosted on the target image CDN.
         * @param {string} url - The URL to check.
         * @returns {boolean} True if the URL matches the target host.
         */
        isTargetHost: (url) => {
             return url && url.includes(UrlUtils.TARGET_HOST);
        },

        /**
         * Transforms a Twitter image URL to its original quality version.
         * @param {string} url - The URL to transform.
         * @returns {string|null} - The transformed URL, or null if no transformation is needed.
         */
        getOrigUrl: (url) => {
            if (!UrlUtils.isTargetHost(url)) {
                return null;
            }

            // Optimization: Skip if already in original quality
            if (url.includes(`${UrlUtils.PARAM_NAME}=${UrlUtils.VALUE_ORIG}`)) {
                return null;
            }

            if (UrlUtils.NAME_REGEX.test(url)) {
                return url.replace(UrlUtils.NAME_REGEX, `$1${UrlUtils.VALUE_ORIG}`);
            } else {
                // Handle cases where the URL might not have query parameters yet
                const separator = url.includes('?') ? '&' : '?';
                return `${url}${separator}${UrlUtils.PARAM_NAME}=${UrlUtils.VALUE_ORIG}`;
            }
        }
    };

    // =========================================
    // Strategy A: Direct Visit Mode (CDN)
    // =========================================
    if (window.location.hostname === UrlUtils.TARGET_HOST) {
        const newUrl = UrlUtils.getOrigUrl(window.location.href);
        if (newUrl) {
            window.location.replace(newUrl);
        }
        return; // Stop execution; we are navigating away or already correct.
    }

    // =========================================
    // Strategy B: SPA DOM Observer (Main Site)
    // =========================================

    /**
     * IntersectionObserver Callback
     * Handles images as they enter the viewport.
     * @param {IntersectionObserverEntry[]} entries
     * @param {IntersectionObserver} observer
     */
    const handleIntersection = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;

                const newSrc = UrlUtils.getOrigUrl(img.src);
                if (newSrc) {
                    img.src = newSrc;
                    // Twitter often uses srcset for responsive images.
                    // Removing it forces the browser to use the new 'src'.
                    if (img.hasAttribute('srcset')) {
                        img.removeAttribute('srcset');
                    }
                }

                // Once processed, we don't need to observe this specific element anymore.
                observer.unobserve(img);
            }
        });
    };

    // Initialize IntersectionObserver with a rootMargin to preload images
    // slightly before they appear on screen.
    const imgObserver = new IntersectionObserver(handleIntersection, {
        rootMargin: '200px',
        threshold: 0.01
    });

    /**
     * Event Delegation Handler for Links
     * Updates anchor tags on interaction (hover/click) instead of strictly observing them.
     * This reduces overhead significantly on a feed with many links.
     * @param {Event} e - The mouse/pointer event.
     */
    const handleLinkInteraction = (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const newHref = UrlUtils.getOrigUrl(link.href);
        if (newHref) {
            link.href = newHref;
        }
    };

    /**
     * MutationObserver Callback
     * Detects new nodes added to the DOM (infinite scroll, navigation).
     * @param {MutationRecord[]} mutations
     */
    const handleMutations = (mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    // If the node itself is an image, observe it
                    if (node.tagName === 'IMG') {
                        imgObserver.observe(node);
                    }

                    // If the node contains images, observe them
                    // Using getElementsByTagName is faster than querySelectorAll
                    if (node.firstElementChild) {
                        const imgs = node.getElementsByTagName('img');
                        for (let i = 0, len = imgs.length; i < len; i++) {
                            imgObserver.observe(imgs[i]);
                        }
                    }
                }
            } else if (mutation.type === 'attributes') {
                // If an image src changes dynamically, re-observe it
                if (mutation.target.tagName === 'IMG' && mutation.attributeName === 'src') {
                    imgObserver.observe(mutation.target);
                }
            }
        }
    };

    // Initialize MutationObserver
    const mutationObserver = new MutationObserver(handleMutations);

    /**
     * Main Initialization Function
     * Sets up observers and event listeners.
     */
    const init = () => {
        if (!document.body) {
            requestAnimationFrame(init);
            return;
        }

        // 1. Observe existing images immediately
        const existingImgs = document.getElementsByTagName('img');
        for (let i = 0, len = existingImgs.length; i < len; i++) {
            imgObserver.observe(existingImgs[i]);
        }

        // 2. Start watching for new content
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src'] // Only care about src changes for attributes
        });

        // 3. Add event delegates for links
        // 'mouseover' allows updating the link before the user likely clicks or copies it.
        // 'click' and 'auxclick' catch direct interactions.
        document.body.addEventListener('mouseover', handleLinkInteraction, { passive: true });
        document.body.addEventListener('click', handleLinkInteraction, { passive: true });
        document.body.addEventListener('auxclick', handleLinkInteraction, { passive: true });
    };

    // Start the script
    init();

})();
