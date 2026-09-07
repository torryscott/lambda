/* Lambda — the views and how they group.
   Shared by the home page, the atlas, and the quiz. A view's label and
   structures live in data/<id>.json; this file only says which views exist
   and which group each belongs to, so the choosers and tab strips agree. */
(function () {
  var GROUPS = [
    { id: 'surface', label: 'Surface views', short: 'Surface', rep: 'dorsal',
      blurb: 'The intact brain from outside: dorsal, lateral, ventral, posterior, and the lateral view with the cerebellum pulled back.',
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

  window.LAMBDA_VIEWS = {
    groups: GROUPS,
    all: ALL,
    everything: ['dorsal', 'ventral', 'midsagittal', 'coronal-b'],   // the four that stand for the whole set
    label: function (id) { return LABELS[id] || id; },
    group: function (id) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].id === id) return GROUPS[i]; return null; },
    groupOf: function (viewId) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].views.indexOf(viewId) > -1) return GROUPS[i]; return null; },
    thumb: function (id) { return 'images/thumbs/' + id + '.jpg'; },
    /* An instructor can name the class in the link (?class=...). It is shown
       on every page so students know whose link they are on. */
    className: function () {
      var c = new URLSearchParams(window.location.search).get('class');
      return c ? c.trim().slice(0, 60) : '';
    },
    /* A link to a page that keeps the instructor's ?off= selection and
       replaces the view / group / set part with what is asked for. */
    link: function (page, set) {
      var p = new URLSearchParams(window.location.search);
      ['view', 'group', 'set', 'pin'].forEach(function (k) { p.delete(k); });
      Object.keys(set || {}).forEach(function (k) { if (set[k]) p.set(k, set[k]); });
      var qs = p.toString();
      return page + (qs ? '?' + qs : '');
    }
  };
})();
