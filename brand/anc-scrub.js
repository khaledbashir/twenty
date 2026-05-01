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
    [/^Documentation$/g, ''],  // Hide Twenty docs link (also covered by CSS)
  ];

  // Element-level kill list — remove these elements outright (text content match).
  const KILL_TEXT = [
    /^\s*Documentation\s*$/i,  // Twenty docs link in settings sidebar
  ];

  function killByText(root) {
    if (!root || !root.querySelectorAll) return;
    const els = root.querySelectorAll('a, button, span, div, li');
    for (const el of els) {
      if (!el.isConnected) continue;
      const ownText = Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent.trim()).join(' ').trim();
      if (ownText && KILL_TEXT.some(rx => rx.test(ownText))) {
        // Walk up to a sensible container (a sidebar item is usually wrapped in a li or button)
        let target = el;
        while (target.parentElement && target.parentElement.children.length === 1 && target.parentElement.tagName !== 'BODY') {
          target = target.parentElement;
        }
        target.remove();
      }
    }
  }

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
    killByText(document.body);
    setTimeout(() => { walk(document.body); killByText(document.body); }, 200);
    setTimeout(() => { walk(document.body); killByText(document.body); }, 800);
    setTimeout(() => { walk(document.body); killByText(document.body); }, 2000);

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const node of m.addedNodes) {
            walk(node);
            if (node.nodeType === Node.ELEMENT_NODE) killByText(node);
          }
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

  // Detect iframe-embed mode: either ?embed=1 in URL or running inside a frame
  // whose parent is on services.ancsports.net. Sets html.anc-embed so the CSS
  // overrides hide Twenty's own nav chrome (services-dashboard's sidebar is
  // the only nav surface in that mode).
  function applyEmbedClass() {
    try {
      const isEmbed = new URLSearchParams(location.search).has('embed') ||
                      (window.self !== window.top);
      if (isEmbed) document.documentElement.classList.add('anc-embed');
    } catch (e) {
      // cross-origin parent throws — that's the strongest signal we're embedded
      document.documentElement.classList.add('anc-embed');
    }
  }
  applyEmbedClass();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
