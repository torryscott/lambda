/* Lambda — usage counts. See worker/README.md.
   Each event is one empty POST to Lambda's counter on Cloudflare: no body,
   no cookie, no identifier. The counter keeps whole-day totals and nothing
   else. Only the published site counts; a copy served from this machine
   sends to `wrangler dev` (port 8787) instead, and a browser switched off on
   the usage page, or driven by automation, sends nothing.

   <script src="counts.js" data-page="atlas"> counts one open of that page,
   and the first page a browser opens on a given day also counts one
   visit-day. Pages count their own events with LAMBDA_COUNT.hit(kind); the
   kinds the counter accepts are listed in worker/index.js. */
(function () {
  var HOST = window.location.hostname;
  var ENDPOINT = HOST === 'torryscott.github.io' ? 'https://lambda-counts.torryscott.workers.dev'
    : /^(localhost|127\.0\.0\.1)$/.test(HOST) ? 'http://127.0.0.1:8787' : '';
  var OFF = 'lambda.nocount', DAY = 'lambda.counted-day';

  function off() { try { return window.localStorage.getItem(OFF) === '1'; } catch (e) { return false; } }
  function hit(kind) {
    if (!ENDPOINT || navigator.webdriver || off()) return;
    var url = ENDPOINT + '/api/hit/' + kind;
    try { if (navigator.sendBeacon && navigator.sendBeacon(url)) return; } catch (e) {}
    try { fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true }); } catch (e) {}
  }

  window.LAMBDA_COUNT = {
    endpoint: ENDPOINT,
    hit: hit,
    off: off,
    setOff: function (yes) {
      try { if (yes) window.localStorage.setItem(OFF, '1'); else window.localStorage.removeItem(OFF); } catch (e) {}
    }
  };

  var me = document.currentScript, page = me && me.getAttribute('data-page');
  if (!page) return;
  hit('page/' + page);
  // One visit per browser per day (UTC, the counter's days). The date stays
  // in this browser; nothing about it is sent.
  try {
    var today = new Date().toISOString().slice(0, 10);
    if (window.localStorage.getItem(DAY) !== today) {
      window.localStorage.setItem(DAY, today);
      hit('visit-day');
    }
  } catch (e) {}
})();
