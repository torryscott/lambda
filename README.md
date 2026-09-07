# Lambda

An open sheep brain study guide.

**A customizable sheep brain neuroanatomy practicum for Qualtrics, with an interactive
labeled atlas.**

Students identify structures on photographs of a preserved sheep brain across three
anatomical views. Instructors decide which structures are included **without editing
or duplicating the survey**.

Built for an undergraduate neurobiology lab practicum, and released
so other instructors can run it, adapt it, or extend it to their own specimens.


---

## Why this exists

Most anatomy question banks are all-or-nothing: the survey tests every structure it contains,
and narrowing it means duplicating and pruning the whole instrument. That doesn't survive
contact with reality — different sections cover different material, and a midterm isn't a final.

This module solves that with URL flags. Every structure has a short code (`D1`, `M3` — see
`codes.js`). An instructor who doesn't cover the claustrum appends `?off=C8` and it disappears —
from the quiz *and* from the interactive atlas. The [link builder](tools/link-builder.html)
writes these for you. No forked copy to maintain.

A companion **link builder** turns that into a checkbox interface, so nobody has to hand-write
query strings.

---

## What's in the box

| Piece | What it does |
|---|---|
| **Qualtrics survey** | The practicum itself — three views, randomized blocks, timed questions, auto-graded short answers with feedback |
| **Link builder** | Instructor-facing page: check the structures you want, get a shareable student link |
| **Interactive atlas** | Study mode with toggleable labels, leader lines, hover/tap reveal — filtered by the same flags |
| **Coordinate capture tool** | Authoring tool for placing atlas labels on a new specimen photo |

---

## Quick start

1. **Import the survey.** In Qualtrics: *Projects → Create project → Survey → Import a QSF file*,
   and choose [`qualtrics/lamina.qsf`](qualtrics/lamina.qsf). Specimen photographs load from
   GitHub Pages, so there's nothing to upload — it renders on import.
2. **Note your new survey ID** — the `SV_…` string in the address bar.
3. **Set the end-of-survey redirect.** Ships empty, because it has to contain *your* survey ID.
   Open
   [`qualtrics/end-of-survey-redirect.txt`](qualtrics/end-of-survey-redirect.txt), replace the
   survey ID with yours, then paste it into *Survey options → Survey termination → Redirect to a URL*.
   This is what preserves an instructor's structure selection when the module loops.
4. **Share `index.html`** with students — it lists every view and offers the atlas or the
   practicum for each. Instructor flags carry through every link, including navigation back.
5. **Point the link builder at your survey.** Open [`tools/link-builder.html`](tools/link-builder.html),
   and change the default URL in the **Survey base URL** field (or edit the `value` attribute in the
   file so it defaults correctly for everyone).
6. **Host the link builder** anywhere that serves static files — GitHub Pages, institutional web
   space, Netlify. It's a single self-contained file with no build step.

That's the minimum. The survey works immediately; everything below is customization.

---

The home page is a hero and two buttons. **Open the atlas** goes to a chooser (`atlas.html` with no view): Surface views, Midsagittal, or Coronal sections, or any single view from the grid below them. Inside a group the atlas shows a tab strip to its sibling views, and every atlas page has a **Quiz this view** link. **Take the quiz** goes to its own chooser (`quiz.html` with no view): the same three groups plus Everything. `quiz.html?set=surface` (or `coronal`, `midsagittal`, `all`) runs the structures of every view in that group; `quiz.html?view=dorsal` still runs a single view. The groups are defined once in `views.js`.

A group run goes one view at a time by default, views in random order and structures shuffled within each, with a **Shuffle across views** option for the full exam feel. The instructor's `?off=` selection carries through every chooser, tab, and link.

The quiz has three modes, chosen on its start screen. **Name it** marks a structure with a pulsing dot and asks for its name. **Find it** gives the name and asks the student to tap the structure; a tap counts if it lands within a small radius of the target, or within a larger one while still being closer to the target than to any other structure. **Describe it** shows the structure's definition and asks for its name, so it needs no image and is the accessible equivalent of the other two. `quiz.html?view=dorsal&mode=find` (or `mode=describe`) opens a view straight into that mode. The start screen also sets the time per question (1, 3, or 10 minutes, or no limit) and can hold the marker still; both are remembered on the device.

The **Glossary** (`glossary.html`) lists every structure with its tissue type and definition, merged across views, with a search box, a group filter, and a link to each view it appears in; it honors the instructor's selection. Every page has a skip link and landmarks, the study-mode and quiz-mode groups take arrow keys, and Escape dismisses an atlas definition. The accessibility statement is its own page, accessibility.html, linked from the home page footer; the target is WCAG 2.1 AA.

A structure may also carry a `zone`: a list of `[x, y]` fractions outlining the region a Find it tap should count for, traced with the capture tool's Draw zone button. Structures without a zone are graded by distance to their marker.

The capture tool works without a mouse: list rows take the arrow keys and Enter, **Add at center** places a marker, and with the plate focused the arrow keys nudge the dot (`D`), the pill (`P`), or a zone corner (`Z`, `[` and `]` to change corner) by 1 px, or 10 px with Shift. A zone can be traced with the arrow keys and Space. The Keyboard panel in the tool lists all of it.

## How the flag system works

Each structure has a permanent short code — a view letter plus a number — and a long flag
name. Both live in `codes.js`; the code is what goes in links.

```
?off=D1.M3        hide these structures; everything else shown
```

Codes are case-insensitive and never reused. The long form is still honored:

```
inc_mid_thalamus
inc_cor_caudate
inc_vent_optic_chiasm
```

Every question inside that structure's block carries Display Logic reading
**"show if the flag is not equal to `0`"**. The `not equal` matters: an unset flag is not `0`,
so the default with no URL parameters is *everything visible*. Instructors only ever
specify what to **remove**.

```
https://YOUR-DOMAIN.qualtrics.com/jfe/form/SV_XXXX?inc_cor_caudate=0&inc_mid_fornix=0
```

Two structures excluded, the other 108 shown.

### Why per-view flags

The same structure gets a separate flag in each view it appears in — the pons is
`inc_vent_pons` on the ventral surface, `inc_lat_pons` laterally, and `inc_mid_pons` in
midsagittal section. They're different images, different spatial context, and arguably
different learning targets, so they're independently toggleable.

---

## Repository layout

```
qualtrics/
  lamina.qsf         Import this into Qualtrics
  end-of-survey-redirect.txt     Redirect URL that preserves flag state
  atlas-embeds/                  Paste-ready atlas code, per view
    midsagittal.html               → question HTML source view
    midsagittal.js                 → question JavaScript editor
    preview.html                   → preview the embed outside Qualtrics

tools/
  link-builder.html              Instructor UI for building student links
  atlas-coord-capture.html       Authoring tool for placing atlas labels

index.html                       Entry point — pick a view and a mode
atlas.html                       Interactive atlas — ?view=<view>
quiz.html                        Practicum quiz  — ?view=<view>
data/
  midsagittal.json               Structures for one view: coordinates,
                                 matter types, explanations, synonyms

atlases/
  midsagittal.html               Redirect to atlas.html (old links)

images/
  clean/                         Unlabeled plates — what the dynamic atlas needs
  labeled/                       Original plates with labels burned in (reference)

scripts/
  image-map.json                 Plate → Pages URL → Qualtrics image ID mapping
  prepare-plates.py              Background-removed PNGs → atlas-ready JPEGs
  bake-atlas.py                  Embed sources → the survey file
  build-variants.py              Regenerates the Qualtrics-hosted variant
  serve.py                       Local dev server

docs/
  CONVENTIONS.md                 Block naming, display logic, matter types, atlas data format
```

---

## Two variants

The same survey ships twice. The only difference is where specimen photographs are fetched from.

| File | Images from | Use it when |
|---|---|---|
| `lamina.qsf` | GitHub Pages | **Default.** Adopting the module, or any situation where you'd rather not upload twelve plates by hand. Works immediately on import. |
| `lamina-qualtrics-hosted.qsf` | Your Qualtrics graphics library | Running a graded practicum. Keeps everything on one service, so an outage elsewhere can't put a broken image in front of a student mid-exam. |

To build the second variant for your own account:

1. Upload the plates from `images/clean/` to your Qualtrics graphics library.
2. Paste each image's `IM_…` id into [`scripts/image-map.json`](scripts/image-map.json).
3. Run:

```bash
python3 scripts/build-variants.py
```

The script swaps URLs and verifies the result is still valid JSON. Nothing else changes —
the two files are byte-identical apart from the image addresses.

---

## Working on the atlas

The atlas exists twice: as a standalone page (`atlases/`) and as a Qualtrics embed
(`qualtrics/atlas-embeds/`). After editing the embed sources, fold them back into the
survey file so the QSF doesn't drift:

```bash
python3 scripts/bake-atlas.py        # embed sources -> lamina.qsf
python3 scripts/build-variants.py    # regenerate the image-URL variant
```

To see the embed without pasting into Qualtrics, run `python3 scripts/serve.py` and open
[`qualtrics/atlas-embeds/preview.html`](qualtrics/atlas-embeds/preview.html). It stubs the
Qualtrics API and renders the embed inside a container of realistic width.

---

## Extending it

### Adding a structure

Each quiz block is five questions plus a page break:

| Question | Type | Contents |
|---|---|---|
| Pic | Descriptive (graphic) | Specimen photo with an **X** on the structure |
| Ans | Text entry | *"Identify the structure marked by the X"* + a matter-type hint |
| Timer | Timing | 60-second countdown |
| — | Page break | |
| Pic (reveal) | Descriptive (graphic) | Answer-reveal image |
| Feedback | Descriptive (text) | Student's answer vs. correct answer, plus a *"What is the …?"* explainer |

To add one:

1. Duplicate an existing block in the Qualtrics editor and rename it following the
   `<View> - <N> Block (<Structure>)` pattern.
2. Set Display Logic on **all five questions** to `inc_<view>_<structure>` **is not equal to** `0`.
3. Add the block to that view's Block Randomizer in Survey Flow, and increase the randomizer's
   subset count so it stays equal to the total.
4. Add the flag to `tools/link-builder.html` and `tools/atlas-coord-capture.html` — both hold a
   plain data array near the top of their `<script>` block.

See [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) for the exact display-logic JSON if you're
editing the QSF directly rather than clicking through the UI.

### One data file per view

`data/<view>.json` is the single source of truth. Both the atlas and the quiz read it, so a
coordinate is only ever written once:

```json
{
  "view": "midsagittal",
  "label": "Midsagittal",
  "image": "images/clean/midsagittal.jpg",
  "structures": [
    {
      "flag":   "inc_mid_thalamus",
      "name":   "Thalamus",
      "matter": "Gray Matter",
      "about":  "The thalamus is a relay for sensory and motor signals.",
      "accept": ["dorsal thalamus"],
      "target": { "x": 0.3617, "y": 0.5241 },
      "label":  { "x": 0.3640, "y": 0.8002 }
    }
  ]
}
```

The atlas uses `name`, `target` and `label`. The quiz additionally uses `matter`, `about` and
`accept`, and draws its X from the same `target`.

**Adding a view is one file.** Drop `data/<id>.json` in place and it appears on the index,
with both modes wired up. Nothing else to edit — `index.html` probes for the file and shows
the view as soon as it exists. Until then it renders as "Not yet available", so the index
doubles as a progress board while you build the set out.

### Building an atlas for a new view

The atlas needs an **unlabeled** photograph. Labels are rendered as live HTML on top, which is
what makes them filterable.

1. Open [`tools/atlas-coord-capture.html`](tools/atlas-coord-capture.html) and load the clean plate.
2. For each structure: pick its flag, click the anatomy, drag the label pill out to the margin.
   A leader line connects the two automatically.
3. Toggle **Preview hover mode** to check how it reads for students, and watch for label collisions.
4. Export the JSON.
5. Save the export as `data/<view>.json`, adding `matter`, `about` and any `accept`
   synonyms per structure. Both `atlas.html?view=<view>` and the quiz pick it up —
   no new pages to write.

The exported format:

```json
{
  "image": { "filename": "midsagittal.jpg", "width": 2000, "height": 1500 },
  "markers": [
    {
      "flag":   "inc_mid_thalamus",
      "text":   "Thalamus",
      "target": { "x": 0.3617, "y": 0.5241 },
      "label":  { "x": 0.3640, "y": 0.8002 }
    }
  ]
}
```

Coordinates are fractions of image dimensions, so the atlas scales to any display size.
`target` is the dot on the anatomy; `label` is where the text pill sits.

### Adapting to a different specimen

Nothing here is sheep-specific except the photographs and the structure list. Swap in your own
plates, rename the flags, and the machinery works unchanged.

---

## Accessibility

The atlas and link builder were built against WCAG 2.1 AA, which US public institutions are
required to meet under the DOJ's 2024 ADA Title II web rule:

- Atlas markers are real `<button>` elements — keyboard-focusable, with visible focus rings, and
  labels that reveal on focus as well as hover
- A visually-hidden list of visible structures gives screen readers a text equivalent of the map
- Study-mode controls use `role="radiogroup"`, and structure counts announce through `aria-live`
- Decorative leader lines are `aria-hidden`

**Not automatic:** alt text on the specimen photographs you upload to Qualtrics. Fill in each
graphic's description field.

---

## Status

Actively in development. Working today:

- Flag-based customization across all 110 structures
- Link builder covering every view, read from the same data files as the site
- Midsagittal interactive atlas (25 labeled structures)

In progress:

- Quiz content for 49 recently-scaffolded blocks (logic is wired; images and feedback text pending)
- Interactive atlases for the remaining 11 plates — **blocked on producing unlabeled versions**,
  since the plates in `images/labeled/` have text baked into the pixels

---

## License

Split, because code and photographs want different terms:

- **Code** — MIT. See [`LICENSE`](LICENSE). Covers the HTML tools, JavaScript, and the QSF.
- **Images** — CC BY 4.0. See [`images/LICENSE`](images/LICENSE). Reuse and adapt freely
  with attribution.

---

## Citation

If this is useful in your teaching or shows up in your scholarship, please cite it —
see [`CITATION.cff`](CITATION.cff).

---

## Contributing

Adaptations to other specimens, additional views, and accessibility fixes are all welcome.
If you build an atlas for a species this doesn't cover, a pull request would be genuinely useful
to other instructors.

The site icon is from Lucide; see [THIRD-PARTY.md](THIRD-PARTY.md).
