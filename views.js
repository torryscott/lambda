/* Lambda — the views and how they group.
   Shared by the home page, the atlas, and the quiz. A view's label and
   structures live in data/<id>.json; this file only says which views exist
   and which group each belongs to, so the choosers and tab strips agree. */
(function () {
  var GROUPS = [
    { id: 'surface', label: 'Surface views', short: 'Surface', rep: 'dorsal',
      blurb: 'The intact brain from outside: dorsal, lateral, ventral, posterior, and a retracted lateral view.',
      views: ['dorsal', 'lateral', 'ventral', 'posterior-internal', 'pulled-back-lateral'] },
    { id: 'midsagittal', label: 'Midsagittal', short: 'Midsagittal', rep: 'midsagittal',
      blurb: 'The brain cut down the midline, with the deep structures in profile.',
      views: ['midsagittal'] },
    { id: 'coronal', label: 'Coronal sections', short: 'Coronal', rep: 'coronal-b',
      blurb: 'Six slices from front to back, A through F.',
      views: ['coronal-a', 'coronal-b', 'coronal-c', 'coronal-d', 'coronal-e', 'coronal-f'] }
  ];
  var LABELS = {
    'dorsal': 'Dorsal', 'lateral': 'Lateral', 'ventral': 'Ventral',
    'posterior-internal': 'Posterior', 'pulled-back-lateral': 'Lateral, retracted',
    'midsagittal': 'Midsagittal',
    'coronal-a': 'Coronal A', 'coronal-b': 'Coronal B', 'coronal-c': 'Coronal C',
    'coronal-d': 'Coronal D', 'coronal-e': 'Coronal E', 'coronal-f': 'Coronal F'
  };
  var ALL = [];
  GROUPS.forEach(function (g) { g.views.forEach(function (v) { ALL.push(v); }); });
  var EVERYTHING = ['dorsal', 'ventral', 'midsagittal', 'coronal-b'];   // the four that stand for the whole set

  /* Bit positions for the views in an inclusion link (?views=). APPEND
     ONLY, like BITS in codes.js: a new view takes the next position at the
     end. A link that lists its views freezes the set, so a view added later
     stays out of links made before it. */
  var VIEW_BITS = ['dorsal', 'lateral', 'ventral', 'posterior-internal', 'pulled-back-lateral', 'midsagittal',
                   'coronal-a', 'coronal-b', 'coronal-c', 'coronal-d', 'coronal-e', 'coronal-f'];

  function findGroup(groups, id) { for (var i = 0; i < groups.length; i++) if (groups[i].id === id) return groups[i]; return null; }
  function findGroupOf(groups, viewId) { for (var i = 0; i < groups.length; i++) if (groups[i].views.indexOf(viewId) > -1) return groups[i]; return null; }

  /* What this link shows. Without ?views= that is the whole catalog. The
     mask decoder lives in codes.js; a page without it shows everything. */
  var L = window.LAMBDA;
  var q = new URLSearchParams(window.location.search);
  var vmask = (q.has('views') && L && L.mask) ? L.mask.decode(q.get('views')) : null;
  var SHOWN = GROUPS, SHOWN_ALL = ALL, SHOWN_EVERYTHING = EVERYTHING;
  if (vmask) {
    SHOWN = GROUPS.map(function (g) {
      var c = {}; for (var k in g) c[k] = g[k];
      c.views = g.views.filter(function (v) { return vmask(VIEW_BITS.indexOf(v)); });
      if (c.views.length && c.views.indexOf(c.rep) < 0) c.rep = c.views[0];
      return c;
    }).filter(function (g) { return g.views.length > 0; });
    SHOWN_ALL = [];
    SHOWN.forEach(function (g) { g.views.forEach(function (v) { SHOWN_ALL.push(v); }); });
    SHOWN_EVERYTHING = EVERYTHING.filter(function (v) { return SHOWN_ALL.indexOf(v) > -1; });
    if (!SHOWN_EVERYTHING.length) SHOWN_EVERYTHING = SHOWN_ALL.slice(0, 4);
  }

  window.LAMBDA_VIEWS = {
    groups: SHOWN,
    all: SHOWN_ALL,
    everything: SHOWN_EVERYTHING,
    label: function (id) { return LABELS[id] || id; },
    group: function (id) { return findGroup(SHOWN, id); },
    groupOf: function (viewId) { return findGroupOf(SHOWN, viewId); },
    /* The whole catalog, whatever the link says. The builder lists from this. */
    catalog: {
      groups: GROUPS, all: ALL, viewBits: VIEW_BITS,
      group: function (id) { return findGroup(GROUPS, id); },
      groupOf: function (viewId) { return findGroupOf(GROUPS, viewId); }
    },
    /* The ?views= value for a set of view ids. */
    encodeViews: function (ids) {
      var bits = [];
      ids.forEach(function (v) { var i = VIEW_BITS.indexOf(v); if (i > -1) bits[i] = true; });
      return window.LAMBDA.mask.encode(bits);
    },
    thumb: function (id) { return 'images/thumbs/' + id + '.jpg'; },
    /* An instructor can name the class in the link (?class=...). It is shown
       on every page so students know whose link they are on. */
    className: function () {
      var c = new URLSearchParams(window.location.search).get('class');
      return c ? c.trim().slice(0, 60) : '';
    },
    /* A link to a page that keeps the instructor's selection (?on=, ?views=,
       ?class=) and replaces the view / group / set part with what is asked
       for. */
    link: function (page, set) {
      var p = new URLSearchParams(window.location.search);
      ['view', 'group', 'set', 'pin'].forEach(function (k) { p.delete(k); });
      Object.keys(set || {}).forEach(function (k) { if (set[k]) p.set(k, set[k]); });
      var qs = p.toString();
      return page + (qs ? '?' + qs : '');
    }
  };
})();
