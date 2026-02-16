// ==UserScript==
// @name         Twitter/X Original Image URL Enforcer
// @namespace    http://tampermonkey.net/
// @version      2026.02.16.084139
// @description  Only on pbs.twimg.com: normalize image URL to original quality (name=orig)
// @author       Nine499
// @match        *://pbs.twimg.com/*
// @updateURL    https://github.com/Nine499/49js/raw/refs/heads/master/pbs.twimg.com-orig.js
// @downloadURL  https://github.com/Nine499/49js/raw/refs/heads/master/pbs.twimg.com-orig.js
// @icon         https://abs.twimg.com/favicons/twitter.2.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  let currentUrl;
  try {
    currentUrl = new URL(window.location.href);
  } catch {
    return;
  }

  if (currentUrl.hostname !== "pbs.twimg.com") {
    return;
  }

  if (currentUrl.searchParams.get("name") === "orig") {
    return;
  }

  currentUrl.searchParams.set("name", "orig");
  const nextUrl = currentUrl.toString();

  if (nextUrl !== window.location.href) {
    window.location.replace(nextUrl);
  }
})();
