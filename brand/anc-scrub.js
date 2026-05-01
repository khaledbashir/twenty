/* ANC Twenty Operations white-label runtime patcher.
 *
 * Twenty's bundled JS contains hard-coded "Twenty" strings (auth screens,
 * footer notes, error messages) that source-rebuild would replace at compile
 * time — but we're using the official image as the runtime base. This script
 * runs MutationObserver in the browser and replaces those strings live.
 *
 * Loaded via <script defer> injected into index.html by the overlay Dockerfile.
 */
(function () {
  'use strict';

  const REPLACEMENTS = [
    [/Welcome to Twenty/g, 'Welcome to ANC Operations'],
    [/Sign in to Twenty/g, 'Sign in to ANC Operations'],
    [/Sign up to Twenty/g, 'Sign up to ANC Operations'],
    [/Join Twenty/g, 'Join ANC Operations'],
    [/By using Twenty,/g, 'By using ANC Operations,'],
    [/Sync your Emails and Calendar with Twenty/g, 'Sync your Emails and Calendar with ANC Operations'],
    [/contact Twenty team/g, 'contact ANC Operations team'],
    [/contact Twenty support/g, 'contact ANC Operations support'],
    [/Page Not Found \| Twenty/g, 'Page Not Found | ANC Operations'],
    // Generic fallback for standalone "Twenty" word in user-facing labels
    // (skip URLs like twenty.com — covered by check below)
  ];

  function processTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    let text = node.textContent;
    if (!text || text.length < 3 || text.length > 5000) return;
    let changed = false;
    for (const [rx, repl] of REPLACEMENTS) {
      if (rx.test(text)) {
        text = text.replace(rx, repl);
        changed = true;
      }
    }
    if (changed) node.textContent = text;
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    // Skip script/style/textarea/input — don't munge code or user input
    const tag = (root.tagName || '').toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) processTextNode(n);
  }

  function init() {
    walk(document.body);
    setTimeout(() => walk(document.body), 200);
    setTimeout(() => walk(document.body), 800);
    setTimeout(() => walk(document.body), 2000);

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const node of m.addedNodes) walk(node);
        } else if (m.type === 'characterData') {
          processTextNode(m.target);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });

    // Also fix document.title if changed by Twenty
    setInterval(() => {
      if (document.title && document.title.includes('Twenty') && !document.title.includes('ANC')) {
        document.title = document.title.replace(/Twenty/g, 'ANC Operations');
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
