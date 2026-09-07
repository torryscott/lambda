# Specimen plates

Photographs of a preserved sheep brain, dissected for the lab practicum.

Photographed by Torry Dennis. Licensed CC BY 4.0 — see [`LICENSE`](LICENSE).

---

## `clean/` — atlas plates

Specimen on white with margin for label pills. These are what the interactive atlas renders;
labels are drawn as live HTML on top, which is what makes them independently filterable.

| File | View | Dimensions |
|---|---|---|
| `midsagittal.jpg` | Midsagittal section | 2000 × 1257 |
| `dorsal.jpg` | Dorsal surface | 1512 × 2000 |
| `lateral.jpg` | Lateral surface | 2000 × 1423 |
| `ventral.jpg` | Ventral surface | 2000 × 1419 |
| `posterior-internal.jpg` | Posterior, internal | 2000 × 1850 |
| `pulled-back-lateral.jpg` | Lateral, cerebellum retracted | 2000 × 1438 |
| `coronal-a.jpg` … `coronal-f.jpg` | Coronal series, rostral → caudal | ~2000 × 1450–1540 |

All twelve views have clean plates.

### A note on `pulled-back-lateral`

The unlabeled master for this one was thought lost. It turned up inside
`Pulled Back Lateral View.pdf` — the labels there are **vector text drawn over an
untouched 4032 × 3024 raster**, so the photograph was never flattened. Extracting the
embedded image recovered it at full resolution:

```python
import fitz                      # PyMuPDF
doc = fitz.open("Pulled Back Lateral View.pdf")
xref = doc[0].get_images(full=True)[0][0]
open("raw.png", "wb").write(doc.extract_image(xref)["image"])
```

Worth trying first if another master goes missing — a PDF export usually keeps the photo
and the labels as separate layers.

The extracted raster still had the lab background, so it was masked with Vision's
foreground-instance segmentation, then the blue glove was dropped by channel
(`B - R > 25`) and the residual shadow by luminance.

### Regenerating

Masters are PNGs with the background masked out via alpha. They're kept locally rather than
committed — 47 MB against 1.9 MB for the derived JPEGs. To rebuild the plates from them:

```bash
python3 scripts/prepare-plates.py
```

The script flattens alpha onto white, trims to the specimen, adds a 16% margin, and downscales
to a 2000 px long edge. Adjust with `--margin`, `--max-dim`, and `--quality`.

## `labeled/` — original plates

Labels are burned into the pixels, so these can't drive the dynamic atlas. Kept as reference
for what each view is supposed to show, and as a fallback if clean versions never materialize.

| File | View | Structures labeled |
|---|---|---|
| `dorsal.jpg` | Dorsal surface | 12 |
| `lateral.jpg` | Lateral surface | 11 |
| `ventral.jpg` | Ventral surface | 16 |
| `posterior-internal.jpg` | Posterior, internal | 3 |
| `pulled-back-lateral.jpg` | Lateral, cerebellum retracted | 5 |
| `coronal-a.jpg` … `coronal-f.jpg` | Coronal series, rostral → caudal | 3–10 each |

---

## Attribution

  Sheep brain specimen photographs by Torry Dennis, licensed CC BY 4.0.
  Source: https://github.com/torryscott/lambda
