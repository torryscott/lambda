/* Lambda — usage counts. See worker/README.md.
   Each event is one small POST to Lambda's counter on Cloudflare, with no
   cookie and nothing that identifies a person. The counter keeps whole-day
   totals and nothing else. Only the published site counts; a copy served
   from this machine sends to `wrangler dev` (port 8787) instead, and a
   browser switched off on the usage page, or driven by automation, sends
   nothing.

   <script src="counts.js" data-page="atlas"> counts one open of that page,
   and the first page a browser opens on a given day also counts one
   visit-day. Pages count their own events with LAMBDA_COUNT.hit(kind); the
   kinds the counter accepts are listed in worker/index.js.

   A page opened through an instructor's link (?class=, ?on=, ?views=) adds
   that link's class id to each event, so the author's private view can show
   each class's totals. The id is a hash of the class name and the selection,
   the same for every student on that link, never anything about a student. */
(function () {
  var HOST = window.location.hostname;
  var ENDPOINT = HOST === 'torryscott.github.io' ? 'https://lambda-counts.torryscott.workers.dev'
    : /^(localhost|127\.0\.0\.1)$/.test(HOST) ? 'http://127.0.0.1:8787' : '';
  var OFF = 'lambda.nocount', DAY = 'lambda.counted-day', CLASS_DAY = 'lambda.class-day.';
  var B32 = 'abcdefghijklmnopqrstuvwxyz234567';

  function store(key, value) {
    try { if (value === undefined) return window.localStorage.getItem(key); window.localStorage.setItem(key, value); } catch (e) { return null; }
  }
  function off() { return store(OFF) === '1'; }
  function send(path, text) {
    if (!ENDPOINT || navigator.webdriver || off()) return;
    var url = ENDPOINT + path;
    // A string body goes as text/plain, which needs no CORS preflight.
    try { if (navigator.sendBeacon && navigator.sendBeacon(url, text)) return; } catch (e) {}
    try { fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, body: text }); } catch (e) {}
  }

  /* The instructor's link behind a URL, or null for the plain site: an id
     (FNV-1a of class name, ?on= and ?views=), the class name, and how many
     structures and views the masks include (null = all). */
  function bits(mask) {
    var n = 0;
    for (var i = 0; i < mask.length; i++) {
      var x = B32.indexOf(mask.charAt(i).toLowerCase());
      if (x < 0) return null;
      for (; x; x >>= 1) n += x & 1;
    }
    return n;
  }
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function classOf(href) {
    var q;
    try { q = new URL(href, window.location.href).searchParams; } catch (e) { return null; }
    var name = (q.get('class') || '').trim().slice(0, 60), on = q.get('on') || '', views = q.get('views') || '';
    if (!name && !on && !views) return null;
    return { id: fnv(name + '\n' + on + '\n' + views), name: name, s: on ? bits(on) : null, v: views ? bits(views) : null };
  }
  var CLASS = classOf(window.location.href);

  function hit(kind, cls) {
    var c = cls === undefined ? CLASS : cls;
    send('/api/hit/' + kind + (c ? '?c=' + c.id : ''));
  }
  function registerClass(c, how) {
    if (c) send('/api/class?c=' + c.id, JSON.stringify({ name: c.name, s: c.s, v: c.v, how: how || 'visited' }));
  }
  /* A finished batch of quiz answers: [[code, result], ...]. */
  function answers(mode, items) {
    if (items && items.length) send('/api/answers' + (CLASS ? '?c=' + CLASS.id : ''), JSON.stringify({ m: mode, a: items }));
  }

  window.LAMBDA_COUNT = {
    endpoint: ENDPOINT,
    hit: hit,
    answers: answers,
    classOf: classOf,
    registerClass: registerClass,
    off: off,
    setOff: function (yes) {
      try { if (yes) window.localStorage.setItem(OFF, '1'); else window.localStorage.removeItem(OFF); } catch (e) {}
    }
  };

  var me = document.currentScript, page = me && me.getAttribute('data-page');
  if (!page) return;
  hit('page/' + page);
  // One visit per browser per day (UTC, the counter's days), and one per
  // class link per day. The dates stay in this browser; nothing about them
  // is sent.
  var today = new Date().toISOString().slice(0, 10);
  if (store(DAY) !== today && store(DAY, today) !== null) hit('visit-day', null);
  if (CLASS && store(CLASS_DAY + CLASS.id) !== today && store(CLASS_DAY + CLASS.id, today) !== null) {
    registerClass(CLASS, 'visited');
    hit('visit-day-class');
  }
})();
