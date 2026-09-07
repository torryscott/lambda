# Lambda

An open sheep brain study guide: an interactive labeled atlas of a preserved sheep brain
across twelve views, a self-quiz on the same structures, and a glossary of every structure
with its definition. Instructors choose which structures their students see through a link,
without editing anything.

**Live site:** https://torryscott.github.io/lambda/

Built for an undergraduate neurobiology lab practicum, and released so other instructors can
run it, adapt it, or extend it to their own specimens.

---

## What's in it

| Page | What it does |
|---|---|
| **Atlas** (`atlas.html`) | Twelve photographs of a dissected sheep brain with live labels. Three study modes: show labels, hover or tap to reveal, hide markers. Picking a marker shows its definition. |
| **Quiz** (`quiz.html`) | A timed practicum on the same structures. *Name it* marks a structure with a pulsing dot and asks for its name; *By definition* shows the definition and asks for the name, so it needs no image. Runs cover a group of views, everything, or a single view. |
| **Glossary** (`glossary.html`) | Every structure with its tissue type, definition, synonyms, and a link to each view it appears in. Searchable, filterable by group. |
| **Link builder** (`tools/link-builder.html`) | Instructor page: uncheck the structures you don't teach, name your class, and copy a student link. Every page honors it. |
| **Capture tool** (`tools/atlas-coord-capture.html`) | Authoring page for placing markers and labels on a new plate. Works with a mouse or a keyboard. |
| **Accessibility statement** (`accessibility.html`) | What works, known limitations, and how to report a problem. |

The twelve views fall into three groups, defined once in `views.js`: **Surface views**
(dorsal, lateral, ventral, posterior, and a retracted lateral view),
**Midsagittal**, and **Coronal sections** A through F.

---

## Quick start

**Students** open the site and choose the atlas or the quiz. Nothing to install.

**Instructors** who teach a subset of the structures:

1. Open the [link builder](https://torryscott.github.io/lambda/tools/link-builder.html).
2. Uncheck the structures you don't cover, and add a class name if you want students to see
   whose link they're on.
3. Copy the link and give it to students. The atlas, quiz, and glossary all show only what
   you left checked, and the selection follows every link inside the site.

**Running it yourself:** it's a static site. Fork the repository, turn on GitHub Pages, and
it works. To develop locally, run `python3 scripts/serve.py` and open `http://localhost:8731/`
(the pages fetch data files, which browsers block on `file://` URLs).

---

## How instructor links work

The link builder writes an **inclusion** link. Every structure has a permanent bit position,
and the link carries a mask, packed as base32, with a bit set for each structure that is in:

```
https://torryscott.github.io/lambda/?on=5777777777x7777773776py&views=74hq
```

`views=` does the same for the views. A structure or view added to Lambda after a link was
made has no bit in that link, so it stays out. Links therefore mean exactly what they meant
on the day they were made; an instructor who wants new material opens the builder from their
link, which pre-fills, and copies a new one.

Bit positions are append-only: a new code goes at the end of `BITS` in `codes.js`, and a new
view at the end of `VIEW_BITS` in `views.js`. Nothing is ever inserted, removed, or reordered.
`scripts/check-codes.py` checks that every code and view has a position.

Every structure also has a permanent short code, a view letter and a number, listed in
`codes.js`. Older links used them to say what to **hide**, and that form is still honored:

```
https://torryscott.github.io/lambda/?off=D1.M3
```

Codes are case-insensitive and are never reused, even if a structure is retired. The long
form, `inc_<view>_<structure>=0`, is still honored too. With no parameters, everything is
shown.

The same structure gets a separate code in each view it appears in: the pons is one code on
the ventral surface, another laterally, another in midsagittal section. They are different
photographs and arguably different learning targets, so they can be toggled independently.

Other parameters, all optional:

| Parameter | Page | Meaning |
|---|---|---|
| `view=<id>` | atlas, quiz | One view, e.g. `dorsal`, `coronal-b` |
| `group=<id>` | atlas | Open a group at its first view: `surface`, `midsagittal`, `coronal` |
| `set=<id>` | quiz | Quiz a group, or `all` for everything |
| `mode=describe` | quiz | Start in *By definition* |
| `pin=<flag>` | atlas | Open with one structure already picked (the glossary uses this) |
| `on=<mask>` | all | Inclusion mask over structure bit positions; the builder writes this |
| `views=<mask>` | all | Inclusion mask over view bit positions; the builder writes this |
| `off=<codes>` | all | Older form: hide these structures |
| `class=<name>` | all | A class name, shown above the title on the home page and beside the wordmark elsewhere; up to 60 characters |

---

## Repository layout

```
index.html                 Home: two buttons
atlas.html                 Atlas, and its chooser when no view is given
quiz.html                  Quiz, and its chooser when no set or view is given
glossary.html              Every structure with its definition
accessibility.html         Accessibility statement
codes.js                   Short codes <-> flags, bit positions; parses ?on= and ?off=
views.js                   The twelve views and their three groups
favicon.svg, icon-*.png    Site icon; the PNGs are what a phone's home screen uses
manifest.webmanifest       Name and icons for "Add to Home Screen"

data/<view>.json           One file per view: structures, coordinates, definitions
images/clean/              Unlabeled plates the atlas draws on
images/labeled/            The original labeled plates, for reference
images/thumbs/, hero/      Generated thumbnails and the home page image

tools/link-builder.html    Instructor link builder
tools/atlas-coord-capture.html   Place markers, labels, and zones on a plate
tools/straighten.html      Find the rotation that squares up a plate

scripts/prepare-plates.py  Background-removed masters -> atlas plates and thumbnails
scripts/extract-coronal-f.py     Recover the Coronal F plate from the atlas PDF
scripts/check-codes.py     Verify every structure has a code
scripts/serve.py           Local dev server on port 8731

docs/CONVENTIONS.md        Codes, data format, matter types, answer matching
```

---

## The data files

`data/<view>.json` is the single source of truth. The atlas, the quiz, the glossary, and
the link builder all read it, so a coordinate or a definition is written once:

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
      "about":  "The thalamus is a gray matter structure located in the diencephalon. It acts as a sensory and motor relay.",
      "accept": ["dorsal thalamus", "thalami"],
      "target": { "x": 0.3617, "y": 0.5241 },
      "label":  { "x": 0.3640, "y": 0.8002 }
    }
  ]
}
```

- `target` is the marker on the anatomy and `label` is where the pill sits, both as fractions
  of the image, so the figure scales to any screen. Label positions are placed by hand and
  never rearranged by code.
- `matter` is the tissue-type hint the quiz shows. `about` is the definition; the glossary
  merges entries with the same `name` across views and shows the longest one. `accept` lists
  genuine synonyms the quiz should count as right.
- A structure may also carry a `zone`, a list of `[x, y]` fractions outlining the region a
  *Find it* tap should count for. Find it is built but not offered yet.

---

## Adding a view or a structure

1. Put an unlabeled plate in `images/clean/` (a PNG with the background removed, or a JPEG on
   white), and run `python3 scripts/prepare-plates.py --only <id>` to make the atlas plate and
   thumbnail.
2. Create `data/<id>.json` and open `tools/atlas-coord-capture.html?view=<id>`. Click a
   structure on the plate to drop a marker, drag the dot and the pill where they belong, and
   copy the JSON back into the data file. The tool also works from the keyboard: the list
   takes the arrow keys, **Add at center** places a marker, and the arrow keys nudge the dot,
   the pill, or a zone corner.
3. Add the view to a group in `views.js` and append its id to `VIEW_BITS` there. Give each
   new structure a code in `codes.js` and append the code to `BITS`. Run
   `python3 scripts/check-codes.py` to confirm every structure and view has a position.
   Existing instructor links will not show the new material until the instructor makes a
   new link; that is by design.
4. Fill in `matter`, `about`, and `accept` for each structure.

Nothing else changes. The choosers, the tab strips, the glossary, and the link builder all
read the data files and `views.js`.

Nothing here is sheep-specific except the photographs and the structure list. Swap in your own
plates and structures and the machinery works unchanged.

---

## Accessibility

The target is WCAG 2.1 AA, which is what ADA Title II sets for public colleges. Every page
has a skip link, landmarks, and visible focus. Atlas markers are real buttons that read their
definition through a live region; the study-mode and quiz-mode groups take the arrow keys.
The quiz's time limit can be turned off and its marker held still. *By definition* is the
non-visual equivalent of the photo-based quiz, and the Glossary is the text version of the
figures. Details, and the known limitations, are on the
[accessibility statement](https://torryscott.github.io/lambda/accessibility.html).

---

## Status

Complete and in use: all twelve views mapped and reviewed, 109 structure entries with
definitions, the two quiz modes, the glossary, and the instructor links. Withheld for now:
the *Find it* quiz mode, which is built but not yet offered. Screen reader testing on a phone
is still to be done.

---

## License

- **Code:** MIT. See [`LICENSE`](LICENSE).
- **Images:** CC BY 4.0. See [`images/LICENSE`](images/LICENSE). Reuse and adapt freely
  with attribution.

The site icon is from Lucide; see [THIRD-PARTY.md](THIRD-PARTY.md).

## Citation

If this is useful in your teaching or shows up in your scholarship, please cite it;
see [`CITATION.cff`](CITATION.cff).

## Contributing

Adaptations to other specimens, additional views, better definitions, and accessibility fixes
are all welcome. If you build an atlas for a species this doesn't cover, a pull request would
be useful to other instructors.
