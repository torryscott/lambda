/* Lambda — PDF export for the printable atlas.

   Builds the PDF in the browser with pdf-lib, so every browser produces the
   same file: the plate photograph embedded at full resolution, leaders and
   dots as vector shapes, and labels set as real text in the site's fonts.
   The page hands over what to draw (see collect() in print.html); this file
   only lays it out. Coordinates arrive as fractions of the plate, the same
   ones the on-screen solver and any dragging produced. */
(function () {
  'use strict';
  var LIBS = [
    'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'
  ];
  var FONTS = {
    sans: 'fonts/IBMPlexSans-Regular.ttf', sansBold: 'fonts/IBMPlexSans-SemiBold.ttf',
    mono: 'fonts/IBMPlexMono-Regular.ttf', monoMed: 'fonts/IBMPlexMono-Medium.ttf',
    serif: 'fonts/LibreCaslonText-Regular.ttf'
  };
  var PAPER = { letter: [792, 612], a4: [841.89, 595.28] };   // landscape, points
  var MARGIN = 36;
  var MARK = ['M12 18V5', 'M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4', 'M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5',
              'M17.997 5.125a4 4 0 0 1 2.526 5.77', 'M18 18a4 4 0 0 0 2-7.464', 'M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517',
              'M6 18a4 4 0 0 1-2-7.464', 'M6.003 5.125a4 4 0 0 0-2.526 5.77'];

  var libsReady = null, fontBytes = null;
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function ready() {
    if (!libsReady) libsReady = loadScript(LIBS[0]).then(function () { return loadScript(LIBS[1]); });
    return libsReady;
  }
  function fetchBytes(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status + ' for ' + url); return r.arrayBuffer(); });
  }
  function loadFonts() {
    if (!fontBytes) fontBytes = Promise.all(Object.keys(FONTS).map(function (k) { return fetchBytes(FONTS[k]).then(function (b) { return [k, b]; }); }))
      .then(function (pairs) { var o = {}; pairs.forEach(function (p) { o[p[0]] = p[1]; }); return o; });
    return fontBytes;
  }

  function col(hex) { var n = parseInt(hex.slice(1), 16); return PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }
  var C = { navy: '#1e3a5f', ink: '#1F1C18', soft: '#4E4841', muted: '#797167', tissue: '#C08A62', rule: '#E9E5DE', white: '#FFFFFF' };

  /* Word wrap for a font at a size, never wider than maxW. A label that
     needs two lines is balanced: the break that makes the wider line as
     narrow as possible, which is what the page's labels do too. */
  function wrap(text, font, size, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    var w = function (s) { return font.widthOfTextAtSize(s, size); };
    words.forEach(function (word) {
      var t = line ? line + ' ' + word : word;
      if (w(t) <= maxW || !line) line = t; else { lines.push(line); line = word; }
    });
    if (line) lines.push(line);
    if (lines.length === 2 && words.length > 2) {
      var best = null;
      for (var i = 1; i < words.length; i++) {
        var a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        var wa = w(a), wb = w(b);
        if (wa > maxW || wb > maxW) continue;
        var m = Math.max(wa, wb);
        if (!best || m < best.m) best = { m: m, lines: [a, b] };
      }
      if (best) lines = best.lines;
    }
    return lines;
  }
  function ascent(font, size) { return font.heightAtSize(size, { descender: false }); }
  function fullHeight(font, size) { return font.heightAtSize(size); }

  function build(job) {
    return ready().then(loadFonts).then(function (fb) {
      var PL = window.PDFLib;
      var doc = PL.PDFDocument.create();
      return doc.then(function (pdf) {
        pdf.registerFontkit(window.fontkit);
        return Promise.all(Object.keys(fb).map(function (k) { return pdf.embedFont(fb[k], { subset: true }).then(function (f) { return [k, f]; }); }))
          .then(function (pairs) {
            var F = {}; pairs.forEach(function (p) { F[p[0]] = p[1]; });
            return Promise.all(job.pages.map(function (p) { return fetchBytes(p.image).then(function (b) { return pdf.embedJpg(b); }); }))
              .then(function (imgs) { return { pdf: pdf, F: F, imgs: imgs }; });
          });
      }).then(function (ctx) {
        var pdf = ctx.pdf, F = ctx.F;
        var size = PAPER[job.paper] || PAPER.letter, W = size[0], H = size[1];
        var innerW = W - MARGIN * 2, innerH = H - MARGIN * 2;
        pdf.setTitle('Lambda atlas' + (job.cls ? ' — ' + job.cls : ''));
        pdf.setAuthor('Torry Dennis'); pdf.setCreator('Lambda · torryscott.github.io/lambda'); pdf.setProducer('Lambda');

        /* helpers that think in top-left coordinates */
        function text(page, str, x, yTop, font, sz, color, spacing) {
          var y = H - yTop - ascent(font, sz);
          if (!spacing) { page.drawText(str, { x: x, y: y, size: sz, font: font, color: color }); return; }
          var cx = x;
          for (var i = 0; i < str.length; i++) { var ch = str[i]; page.drawText(ch, { x: cx, y: y, size: sz, font: font, color: color }); cx += font.widthOfTextAtSize(ch, sz) + spacing; }
        }
        function widthSpaced(str, font, sz, spacing) { var w = 0; for (var i = 0; i < str.length; i++) w += font.widthOfTextAtSize(str[i], sz) + spacing; return w - spacing; }
        function line(page, x1, y1, x2, y2, color, w) { page.drawLine({ start: { x: x1, y: H - y1 }, end: { x: x2, y: H - y2 }, thickness: w, color: color }); }
        function circle(page, cx, cy, r, fill, stroke, sw) { page.drawCircle({ x: cx, y: H - cy, size: r, color: fill, borderColor: stroke, borderWidth: sw || 0 }); }
        function roundRect(page, x, yTop, w, h, r, fill, stroke, sw) {
          // pdf-lib has no rounded rect: build an SVG path
          r = Math.min(r, w / 2, h / 2);
          var d = 'M' + r + ' 0 H' + (w - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + w + ' ' + r + ' V' + (h - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (w - r) + ' ' + h
                + ' H' + r + ' A' + r + ' ' + r + ' 0 0 1 0 ' + (h - r) + ' V' + r + ' A' + r + ' ' + r + ' 0 0 1 ' + r + ' 0 Z';
          page.drawSvgPath(d, { x: x, y: H - yTop, color: fill, borderColor: stroke, borderWidth: sw || 0 });
        }
        function wordmark(page, xRight, yTop, sz) {
          var gap = sz * 0.38, iconSz = sz * 1.15;
          var wLambda = F.serif.widthOfTextAtSize('Lambda', sz), wDot = F.serif.widthOfTextAtSize('.', sz);
          var total = iconSz + gap + wLambda + wDot;
          var x = xRight - total, iy = yTop + (sz * 1.1 - iconSz) / 2;
          MARK.forEach(function (d) { page.drawSvgPath(d, { x: x, y: H - iy, scale: iconSz / 24, borderColor: col(C.navy), borderWidth: 2.4 * iconSz / 24, borderLineCap: PL.LineCapStyle.Round }); });
          text(page, 'Lambda', x + iconSz + gap, yTop + (sz * 1.1 - ascent(F.serif, sz)) / 2 - (fullHeight(F.serif, sz) - ascent(F.serif, sz)) / 2, F.serif, sz, col(C.ink));
          text(page, '.', x + iconSz + gap + wLambda, yTop + (sz * 1.1 - ascent(F.serif, sz)) / 2 - (fullHeight(F.serif, sz) - ascent(F.serif, sz)) / 2, F.serif, sz, col(C.tissue));
        }

        var head = job.head, opts = job.opts;
        var headShown = head.view || head.count || head.title || (head.cls && job.cls);
        var HEAD_H = headShown ? 56 : 0;

        job.pages.forEach(function (p, pi) {
          var page = pdf.addPage([W, H]);
          var top = MARGIN;
          if (headShown) {
            var leftX = MARGIN, y = top;
            if (head.view) {
              if (p.group) { text(page, p.group.toUpperCase(), leftX, y, F.mono, 8, col(C.muted), 1.1); y += 11; }
              text(page, p.label + ' view', leftX, y, F.serif, 19, col(C.ink));
              if (head.count) {
                var tw = F.serif.widthOfTextAtSize(p.label + ' view', 19);
                text(page, '· ' + p.shown.length + ' structure' + (p.shown.length === 1 ? '' : 's'), leftX + tw + 6, y + 9, F.sans, 9.5, col(C.muted));
              }
            } else if (head.count) {
              text(page, p.shown.length + ' structure' + (p.shown.length === 1 ? '' : 's'), leftX, y + 14, F.sans, 9.5, col(C.muted));
            }
            var ry = top, right = W - MARGIN;
            if (head.title) {
              wordmark(page, right, ry, 13.5); ry += 13.5 * 1.1 + 2;
              var t2 = 'Sheep Brain Atlas'; text(page, t2, right - F.sans.widthOfTextAtSize(t2, 9), ry, F.sans, 9, col(C.soft)); ry += 9 * 1.3 + 1;
            }
            if (head.cls && job.cls) {
              var cl = job.cls.toUpperCase(); text(page, cl, right - widthSpaced(cl, F.sansBold, 8.5, 0.7), ry, F.sansBold, 8.5, col(C.navy), 0.7);
            }
            if (head.rule) line(page, MARGIN, top + HEAD_H - 10, W - MARGIN, top + HEAD_H - 10, col(C.ink), 1.2);
          }

          /* the plate */
          var availW = innerW, availH = innerH - HEAD_H - 4;
          var side = opts.style === 'numbers' && !opts.defs;
          var keyW = 2.7 * 72, gap = 18;
          var plateH = opts.defs ? Math.min(availH, 4.8 * 72) : availH - 4;
          var plateW = Math.min(side ? availW - keyW - gap : availW, plateH * p.w / p.h);
          plateH = plateW * p.h / p.w;
          var px = side ? MARGIN : MARGIN + (availW - plateW) / 2, py = top + HEAD_H;
          page.drawImage(ctx.imgs[pi], { x: px, y: H - py - plateH, width: plateW, height: plateH });

          var ls = opts.labels, ms = opts.marker, outline = opts.fill !== 'filled';
          var em = plateW * 0.014 * ls;
          var X = function (fx) { return px + fx * plateW; }, Y = function (fy) { return py + fy * plateH; };

          // leaders, then dots, then labels, so labels sit on top
          p.shown.forEach(function (s) { line(page, X(s.lx), Y(s.ly), X(s.tx), Y(s.ty), col(C.navy), 0.8); });
          p.shown.forEach(function (s) {
            var r = plateW * 0.005 * ms, halo = Math.max(0.6, plateW * 0.003 * ms);
            circle(page, X(s.tx), Y(s.ty), r + halo, col(C.white));
            circle(page, X(s.tx), Y(s.ty), r, col(C.navy));
          });
          p.shown.forEach(function (s, i) {
            var cx = X(s.lx), cy = Y(s.ly);
            if (opts.style === 'numbers') {
              var d = plateW * 0.026 * ls, nsz = plateW * 0.0135 * ls, label = String(s.num);
              circle(page, cx, cy, d / 2, outline ? col(C.white) : col(C.navy), outline ? col(C.navy) : col(C.white), Math.max(0.5, plateW * 0.0012));
              var nw = F.monoMed.widthOfTextAtSize(label, nsz);
              text(page, label, cx - nw / 2, cy - ascent(F.monoMed, nsz) / 2 - nsz * 0.02, F.monoMed, nsz, outline ? col(C.navy) : col(C.white));
            } else {
              var font = F.sansBold, lines = wrap(s.name, font, em, 12 * em - 1.6 * em), lineH = em * 1.15;
              var tw2 = Math.max.apply(null, lines.map(function (l) { return font.widthOfTextAtSize(l, em); }));
              var bw = tw2 + 1.6 * em, bh = lines.length * lineH + 0.6 * em;
              var bx = cx - bw / 2, by = cy - bh / 2;
              roundRect(page, bx, by, bw, bh, em, outline ? col(C.white) : col(C.navy), outline ? col(C.navy) : col(C.white), Math.max(0.5, plateW * 0.001));
              var full = fullHeight(font, em), asc = ascent(font, em);
              lines.forEach(function (l, li) {
                var lw = font.widthOfTextAtSize(l, em);
                var lineTop = by + 0.3 * em + li * lineH;
                text(page, l, cx - lw / 2, lineTop + (lineH - full) / 2, font, em, outline ? col(C.navy) : col(C.white));
              });
            }
          });

          /* the key */
          if (side) {
            var kx = px + plateW + gap, ky = py + 2, step = 13.5;
            if (p.shown.length * step > availH) step = Math.max(9, availH / p.shown.length);
            var ksz = Math.min(9, step * 0.68);
            p.shown.forEach(function (s) {
              var n = String(s.num), nw2 = F.mono.widthOfTextAtSize(n, ksz - 0.5);
              text(page, n, kx + 14 - nw2, ky, F.mono, ksz - 0.5, col(C.navy));
              text(page, s.name, kx + 20, ky, F.sans, ksz, col(C.ink));
              ky += step;
            });
          } else if (opts.defs) {
            var colW = (innerW - 24) / 2, cols = [MARGIN, MARGIN + colW + 24], ci = 0;
            var yk = py + plateH + 12, bottom = H - MARGIN, cur = page, first = true;
            p.shown.forEach(function (s) {
              var nameSz = 9, defSz = 9, lh = 12;
              var defLines = wrap(s.about || '', F.sans, defSz, colW);
              var need = 13 + defLines.length * lh + 6;
              if (yk + need > bottom) {
                if (ci === 0) { ci = 1; yk = first ? py + plateH + 12 : MARGIN; }
                else { cur = pdf.addPage([W, H]); ci = 0; yk = MARGIN; first = false; }
              }
              var x0 = cols[ci];
              if (!(first && yk === py + plateH + 12) && !(yk === MARGIN)) line(cur, x0, yk - 3, x0 + colW, yk - 3, col(C.rule), 0.5);
              var xx = x0;
              if (opts.style === 'numbers') { text(cur, String(s.num), xx, yk, F.mono, 8.5, col(C.navy)); xx += 16; }
              text(cur, s.name, xx, yk, F.sansBold, nameSz, col(C.ink));
              if (s.matter) text(cur, s.matter, xx + F.sansBold.widthOfTextAtSize(s.name, nameSz) + 6, yk + 1, F.sans, 8, col(C.muted));
              var dy = yk + 13;
              defLines.forEach(function (l) { text(cur, l, x0, dy, F.sans, defSz, col(C.soft)); dy += lh; });
              yk = dy + 6;
            });
          }
        });
        return pdf.save();
      });
    });
  }

  function download(job) {
    return build(job).then(function (bytes) {
      var blob = new Blob([bytes], { type: 'application/pdf' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Lambda atlas' + (job.cls ? ' — ' + job.cls.replace(/[\\/:*?"<>|]+/g, ' ') : '') + '.pdf';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return bytes;
    });
  }

  window.LAMBDA_EXPORT = { build: build, download: download };
})();
