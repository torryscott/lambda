# Conventions

Technical reference for editing the data files, the codes, and the tools. If you're only
running the site, the [README](../README.md) is enough.

---

## Flag naming

```
inc_<view>_<structure>
```

- `inc_` marks a structure-inclusion flag. The pages filter on this prefix, so don't use it
  for anything else.
- `<view>` is the view or sub-view the structure belongs to: `mid`, `cor`, `dorsal`, `lat`,
  `vent`, `post`.
- `<structure>` is the structure name, lowercased, non-alphanumerics collapsed to underscores.

### Short codes

Each flag has a permanent short code in `codes.js`: view letter plus number (`D1`, `L4`,
`C12`). Codes name the bit positions that student links are built from and label the rows
in the builder. Rules:

- A code is assigned once and never changed or reused, even if the structure is retired.
  Retired codes are kept in `codes.js` with a comment.
- A new structure takes the next number in its view's run, wherever it sits in the list.
- Run `python3 scripts/check-codes.py` after touching `codes.js` or a data file. It reads
  the data files as the authoritative list and reports any structure without a code.

Letters: `D` dorsal · `L` lateral · `V` ventral · `P` posterior · `C` coronal · `M` midsagittal.

### Bit positions

Instructor links made by the builder are inclusion masks. `BITS` in `codes.js` lists every
code in a permanent order; bit *i* of `?on=` is set when the structure with code `BITS[i]` is
in. `VIEW_BITS` in `views.js` does the same for `?views=`. Masks are RFC 4648 base32,
lowercase, no padding, least significant bit first within each byte; positions past the end
of a mask read as off.

- Both lists are **append only**. A new code or view goes at the end. Never insert, remove,
  or reorder: every existing link reads by position.
- Because a link only has bits for what existed when it was made, additions never appear in
  older links. That is the intended behavior.
- `scripts/check-codes.py` reports any code or view without a position.

### The `dosal` typo

One flag is `inc_dosal_dorsomedian_fissure`, a misspelling that predates this system. It's
kept deliberately: its code is what instructor links carry, and renaming the flag would have
to happen in `codes.js`, the data file, and the capture tool at once while breaking nothing
for students. Treat a fix as a breaking change.

---

## Views and groups

`views.js` lists the twelve views, their display labels, and the three groups: `surface`,
`midsagittal`, `coronal`. Each group names a representative view for thumbnails. The atlas
chooser, the quiz chooser, the tab strips, and the glossary filters all read this file, so a
new view is added there once.

---

## URL parameters

| Parameter | Pages | Meaning |
|---|---|---|
| `on=<mask>` | all | Show exactly these structures (base32 over `BITS`); written by the builder |
| `views=<mask>` | all | Show exactly these views (base32 over `VIEW_BITS`); written by the builder |
| `view=<id>` | atlas, quiz, print | One view |
| `style=numbers` | print | Numbered key instead of names on the figure |
| `defs=1` | print | Include definitions under each plate |
| `scope=all` | print | With `view`, start with every view selected |
| `fill=filled` | print | Navy labels with white text instead of the outline default |
| `labels=<factor>` | print | Label size, 0.7 to 1.6; overlapping labels are nudged apart |
| `marker=<factor>` | print | Dot size, 0.5 to 2 |
| `head=<parts>` | print | Heading parts to print: any of `view,count,title,cls,rule`, or `none` |
| `group=<id>` | atlas | Open a group at its first view |
| `set=<id>` | quiz | Quiz a group, or `all` |
| `mode=<id>` | quiz | `name` (default) or `describe`; `find` falls back to `name` while withheld |
| `pin=<flag>` | atlas | Arrive in reveal mode with that structure picked |
| `class=<name>` | all | Class name shown in the header; trimmed to 60 characters by `LAMBDA_VIEWS.className()` |

Links out of any page keep `on`, `views`, and `class` and drop `view`, `group`, `set`, and `pin`. Use
`LAMBDA_VIEWS.link(page, { view: id })` to build one.

---

## Data file format

`data/<view>.json`:

```json
{
  "view":  "midsagittal",
  "label": "Midsagittal",
  "image": "images/clean/midsagittal.jpg",
  "structures": [
    {
      "flag":   "inc_mid_thalamus",
      "name":   "Thalamus",
      "matter": "Gray Matter",
      "about":  "…",
      "accept": ["dorsal thalamus", "thalami"],
      "target": { "x": 0.3617, "y": 0.5241 },
      "label":  { "x": 0.3640, "y": 0.8002 },
      "zone":   [[0.30, 0.48], [0.42, 0.47], [0.43, 0.58], [0.31, 0.59]]
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `flag` | The inclusion flag; must have a code in `codes.js`. |
| `name` | Canonical structure name. The glossary merges entries across views by this name, so spell it the same everywhere. |
| `matter` | Tissue-type hint shown in the quiz and the glossary. |
| `about` | Definition. Shown in the atlas card, the glossary, and as the *By definition* question, where the structure's own name is masked. A synonym that appears in the definition is not accepted as the answer to that question. |
| `accept` | Genuine synonyms the quiz counts as right. |
| `target` | Marker position on the anatomy, as fractions of image width and height. |
| `label` | Label pill position, same coordinate space. Placed by hand; never moved by code. |
| `zone` | Optional. Polygon of `[x, y]` fractions a *Find it* tap should count for. |

Fractional coordinates mean the same data drives the figure at any rendered size.

The capture tool (`tools/atlas-coord-capture.html?view=<id>`) loads a data file, lets you
drag markers, pills, and zone corners, and exports in this same format, so its output pastes
straight back in. Deleting a marker in the tool drops it from the export.

---

## Matter-type vocabulary

Values in use:

- `Gray Matter`
- `White Matter`
- `Gray and White Matter`, for regions that are substantially both: cerebellum, pons, medulla
- `Gray Matter (Not a Lobe)`, for gyri and cortical regions
- `a Lobe`
- `a Groove`, for sulci and fissures
- `a Cavity`, for ventricles and cisterns
- `spongy tissue`, for the choroid plexus
- `a thin piece of tissue`, for the septum pellucidum

Where a structure appears in several views, the matter type stays the same in all of them.

---

## Comparative nomenclature

Labels follow the primate names students meet in textbooks, and definitions carry the
veterinary equivalent where the two differ: the central sulcus, precentral gyrus, and
postcentral gyrus name the cruciate sulcus region; the insula and temporal lobe name the
sylvian (pseudosylvian) sulcus. Rostral/caudal synonyms are accepted in the quiz, so
`rostral colliculus` counts for Superior Colliculus and `caudal commissure` for Posterior
Commissure.

---

## Answer matching

Free-text answers are checked in two layers.

### Handled automatically

The normalizer folds variation nobody should have to enumerate:

| Variation | Example |
|---|---|
| Case and whitespace | `THIRD  Ventricle` |
| Articles and prepositions | `the third ventricle`, `aqueduct of Sylvius` |
| Punctuation | `chiasm.` |
| Ordinals, as word, digit, or Roman | `third` = `3rd` = `III` = `3` |
| English plurals | `bodies` = `body` |
| Latin plurals | `colliculi` = `colliculus`, `gyri` = `gyrus`, `nuclei` = `nucleus` |
| Word order | `third ventricle` = `ventricle III` |

Word order is handled by comparing the sorted token set as a fallback, which also catches
Latin-style inversions like `gyrus cinguli`.

### Listed per structure

Genuine synonyms go in the structure's `accept` array. Entries are normalized the same way
as student input, so `accept` only needs the base form.

Deciding what to accept is a pedagogical call. Accepting `primary motor cortex` for
Precentral Gyrus is defensible, but it changes what the question tests. Keep `accept` to
other established names for the same structure, not parts of it and not misspellings.

The student-facing **Count mine as correct** button is the backstop: string matching can't
anticipate every acceptable answer, so the student can override a wrong verdict. If an
override keeps coming up, that's the signal to add the synonym.

### Checking for collisions

After editing `accept` lists, make sure no two structures in the same view can claim the same
answer, and check near-miss pairs by hand: superior versus inferior colliculus, pre- versus
postcentral gyrus, thalamus versus hypothalamus.

---

## Saved preferences

Pages remember a few choices in the browser's local storage, all under the `lambda.` prefix:
the atlas study mode, and the quiz's time limit, marker setting, and question order. Nothing
is sent anywhere.
