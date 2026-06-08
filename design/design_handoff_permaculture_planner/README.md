# Handoff: Permaculture Garden Planner

## Overview

A web app prototype for planning and visualising a permaculture homestead. Users see a zoned overhead map of their property, click into individual zones for detailed companion-planting layouts, and run an AI "Generate plan" wizard that proposes new elements to add. The design covers the full flow: map overview → zone detail → plan generation wizard → plan preview sidebar → apply to map.

## About the Design Files

The files in this bundle are **design references built in HTML + React/JSX** — high-fidelity prototypes showing intended look and behavior. They are **not** production code to copy directly. Your task is to **recreate these designs in your target codebase** using its existing component library, routing, state management, and API patterns. The visual language, layout structure, and interactions documented here are the source of truth.

## Fidelity

**High-fidelity.** Colors, typography, spacing, shadows, animations, and micro-interactions are all finalised. Recreate pixel-accurately.

---

## Design Tokens

### Colors (CSS custom properties)

```css
/* Core palette */
--forest:       #3d6b34   /* primary green — buttons, active states */
--forest-2:     #5e9050   /* mid green — hover tints */
--forest-deep:  #1f3a18   /* dark green — text on light, ruler bg */
--ink:          #1d2a20   /* near-black body text */
--ink-soft:     #485547   /* secondary text */
--muted:        #7c857a   /* placeholder / disabled */
--line:         #d3cdb8   /* borders */
--line-soft:    #e8e2cc   /* subtle dividers */
--paper:        #fbf7ea   /* sidebar / panel backgrounds */
--cream:        #ece2c8   /* app background */
--sage:         #d8e3c0   /* selected row tints, soft fills */
--earth:        #b87348   /* soil / warm accent */
--earth-soft:   #d4a484   /* lighter soil */
--clay:         #c2613b   /* terracotta */
--amber:        #d49644   /* harvest accent */
--sun:          #e3a83f
/* Map-only */
--grass:        #d8e3c0
--grass-2:      #c8d6ad
--soil:         #b87348
--ruler:        #1f3a18   /* dark ruler strip */
```

### Typography

| Role | Family | Size | Weight | Letter-spacing |
|------|--------|------|--------|----------------|
| Body | Inter | 13–14px | 400/500 | — |
| Display / serif headings | Newsreader (Google Fonts) | 18–30px | 400/600 | -0.01em |
| Monospace / labels | JetBrains Mono | 9–12px | 400/500 | 0.06–0.18em |

Google Fonts import:
```
Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400
Inter:wght@400;500;600;700
JetBrains Mono:wght@400;500
```

### Spacing & Shape

- App padding: `24px` outer, `16–20px` inner panels
- Border radius: buttons `6px`, pills `999px`, map tiles `3px`, cards `8–10px`
- Shadows: `0 2px 6px rgba(80,50,20,0.25)` (cards), `0 10px 30px rgba(20,30,25,0.25)` (toasts/overlays)

---

## Screens / Views

### 1. App Shell

**Layout:** Full-viewport flex column — `TopBar (56px) → ZoneTabs (44px) → Main row (flex 1)`.

```
┌────────────── TopBar ──────────────┐
├────────── ZoneTabs ────────────────┤
│  Map area (flex 1)  │  Sidebar     │
│                     │  (256px)     │
└─────────────────────┴──────────────┘
```

**TopBar:**
- Left: leaf icon (22px circle, `--forest` bg) + `GARDEN.name` in Newsreader 15px
- Center: `{W}×{H} m · Zone {hardinessZone}` mono 11px + guild health bar (5 × 14×4px pills, active `--forest`, inactive `--line`)
- Right: `Generate plan` button (outline `--forest`, sparkle icon), `Setup` button (outline `--line`), `Save` button (solid `--forest`, text `#f4f1e6`)

**ZoneTabs:** horizontal scrollable row, `8px 20px` padding, zone pill buttons — active: solid `--forest` bg, text `#f4f1e6`; inactive: transparent, text `--ink-soft`, border `--line`. All `border-radius: 999px`, `font-size: 12px`.

**Map area:** flex 1 container, `padding: 24px`, inner rounded card (`border-radius: 10px`, `border: 1px solid --line-soft`, `background: --paper`). Map canvas fills this card. Bottom-left: legend chip (Existing / Proposed / Enhance). Bottom-right: scale bar "10 m".

**Plant Sidebar (default state):** 256px wide, `border-left: 1px solid --line`. Header: mono uppercase "PLANTS" label + display "Drag onto map". Search input (`border-radius: 6px`). Scrollable plant list: each row 22px icon (leaf, `--cream` bg) + plant name 13px. Favourites get a `FAV` mono badge + `--sage` row background.

---

### 2. General Map View (active zone: "general")

The centrepiece. A framed overhead permaculture plan diagram.

**Background:** Warm parchment `radial-gradient(#ece0c2, #e3d5b2, #ddcca6)`.

**Forest band (west, left edge):** 9.5% of canvas width, full height. Top-down canopy texture via layered `radial-gradient` blobs in 5 greens (#74a64d, #4f7e31, #6c9e46, #426c28, #5c8a3a, base #3d6627→#335821). Casts inward shadow `inset -14px 0 18px -10px rgba(20,40,15,0.55)`. Centered vertical label "VEST · PĂDURE" (cream pill, Newsreader 11px bold, rotated -90°).

**River band (east, right edge):** 10.5% of canvas width. Blue gradient left→right `#8fc0d8 → #5b9ec2 → #3f86ae → #5aa1c6`. 4 flowing SVG current lines (rgba(255,255,255,0.32)). Left 13px: pebble bank via radial-gradient dots (#b8b0a0, #a39a88, #c4bcac). Centered vertical label "EST · RÂU" (water-toned pill, rotated -90°).

**Homestead plot:** Positioned `left: 12.5%, right: 13.5%, top: 8%, bottom: 7%`. Hedge border: absolutely positioned at `inset: -9px`, `border-radius: 11px`, same canopy gradient as forest, box-shadow outer ring. Interior ground div: `border-radius: 4px`, parchment background, `overflow: hidden` (clips zone decoration).

**Zone tiles (unclipped layer):** Sit as a sibling of the ground div (not inside it) so labels near the right edge are never cut off.

**Compass:** SVG rose, 46×46px, top-right of canvas (inside river band), cream circle bg, north triangle in `#b8462f`, south in `#6b6356`.

**Ruler bars:** Hidden on General view. Shown on all detail views.

**Zones (all clickable, open their detail tab):**

| id | label | x,y,w,h | fill color |
|----|-------|---------|------------|
| pasture | Pasture | 4,4,30,16 | #cbe0a8 |
| bees | Bee Hives | 36,4,14,10 | #f0d68a |
| orchard | Orchard | 52,4,32,18 | #bcd9a4 |
| guild | Apple Guild | 86,6,10,14 | #d8e0b4 |
| grain | Grain Plot | 4,22,14,14 | #e8d090 |
| berry | Berry Patch | 20,24,16,12 | #e8c4ce |
| veg | Vegetable Garden | 38,24,32,18 | #cfd9ad |
| chickens | Chicken Coop | 72,24,12,12 | #dec8a8 |
| herbs | Herb Garden | 4,38,16,18 | #c4dcc8 |
| house | House | 22,44,14,14 | #d8b88c |
| greenhouse | Greenhouse | 38,44,10,10 | #d4e8b8 |
| patio | Patio | 50,44,8,8 | #d4d0c2 |
| compost | Compost | 60,44,8,6 | #b8967e |
| pond | Duck Pond (blob) | 70,44,16,14 | #a4cee0 |

Coordinate system: 100m × 60m garden, zones expressed in metres, rendered as `%` of canvas.

Each tile: semi-transparent fill (color + `aa`), `border: 1.2px solid rgba(120,80,30,0.45)`, `border-radius: 3px`, centered `ZoneLabel` (cream pill, Newsreader, uppercase, 10–11.5px). On hover: border darkens, box-shadow appears, small "Open" badge top-right.

Iconic decorations per zone (schematic, low-detail — "hints"):
- **orchard:** 8 small tree circles (radial-gradient green spheres)
- **guild:** 1 central large tree
- **bees:** 3 bee-hive trapezoids (striped amber/brown)
- **veg:** 3 soil bed rectangles (dark brown)
- **berry:** 6 small bush dots (pink-purple)
- **herbs:** 6 herb bush dots (purple/green mix)
- **grain:** hatched amber stripe pattern
- **pasture:** 3 white oval animal shapes
- **house/greenhouse/compost:** SVG icon from `assets/structures/`
- **pond:** SVG ellipse (blue #5fa2c8 + white specular)
- **chickens:** 4 yellow oval chicken shapes
- **patio:** 45°/135° crosshatch pattern

---

### 3. Vegetable Garden Detail

Fills the canvas when "Vegetable Garden" tab is active. A grid of wooden raised beds (3–4 across), each divided into compartments, each compartment densely packed with plant sprites.

**Raised bed frame:**
- Wood gradient on frame border (warm oak tones)
- Frame thickness scales with bed size
- Inner grid of compartments separated by wooden dividers (gap: `max(3, frame*0.62)px`)

**Each compartment cell (soil box):**
- Background: warm chocolate-brown soil — layered `radial-gradient` speckle (rgba dots) over `radial-gradient(ellipse, #7a4f2c, #5e3a1f, #46290f)`, `background-size` tiled
- Inner shadow: `inset 0 2px 7px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(30,15,4,0.4)`
- `overflow: hidden`

**Plant sprites (dense scatter):**
- Deterministic seeded PRNG (mulberry32) per cell so layout is stable across renders
- Jittered grid: columns × rows computed from area × plantsPerM², jitter ±42.5% of cell spacing
- Scale: `base × cellSize × (0.78 + rng * 0.62)` — varied sizes
- Rotation: ±17°
- Depth sorted back→front by y + size/2
- `filter: drop-shadow(0 2px 2.5px rgba(20,8,0,0.55)) saturate(1.08)`

**Companion cells** (two plants side-by-side):
- Left half: plant A sprites; right half: plant B sprites; sorted together for depth
- Centred "companion pill" label over the dividing line

**Density tiers:**
- `wide`: 1.6 plants/m², base scale 1.55
- `medium`: 3.0 plants/m², base scale 1.3
- `tight`: 5.5 plants/m², base scale 1.1
- Count capped at 95 per cell to prevent lag

**Plant icons:** SVG files in `assets/veg/` — apple.svg, blueberry.svg, calendula.svg, chamomile.svg, corn.svg, elderberry.svg, garlic.svg, hazelnut.svg, plum.svg, raspberry.svg, rose.svg, strawberry.svg, sunflower.svg

---

### 4. Apple Guild Detail

Circular guild layout: central apple tree + 6 companion plants at 60° intervals.

- SVG wash circles behind (greens, blues) establish the guild boundary
- Central tree: large green radial-gradient circle with apple icon
- Companion ring: each at radius ~18m from centre, `PlantTile` icons with callout pill labels showing role (Pollinator, Nitrogen Fixer, etc.) connected by dashed SVG leader lines
- Guild boundary: dashed circle stroke

---

### 5. Other Zone Details

Each zone has a distinct visual vocabulary (see `zone-details.jsx`):
- **Orchard:** grid of fruit trees with type labels
- **Duck Pond:** organic pond shape with marginal + aquatic plant rings
- **Herb Garden:** organic cluster layout of individual herb patches with labels
- **Berry Patch, Chicken Coop, Pasture, Greenhouse, Compost, Bee Hives, Grain Plot, Patio, House:** bespoke illustrated detail views

---

### 6. Generate Plan Wizard

Full-screen overlay (sheet or side-panel layout, controlled by Tweaks). 3 steps:

**Step 1 — Conditions:**
- Visual selection cards for: Terrain (flat/gentle/steep), Water (rain/manual/irrigated), Sun (full/partial/mixed), Soil type
- 2-column grid of cards, each with label + description, border highlights on select

**Step 2 — Intent:**
- Goal cards (Food / Low maintenance / Flowers / Wildlife / Mixed) — larger cards, icon + description
- Inline options: garden style, hours/week available, known problem areas (multi-select chips)
- Custom notes textarea

**Step 3 — Review:**
- Left column: mini map preview of current garden + list of what the AI will see
- Right column: plain-language summary of request + "Generate" CTA button

**Loading state:** Fullscreen overlay, animated leaf/spinner, "Crafting your plan…" text.

---

### 7. Plan Preview Sidebar

Replaces the Plant Sidebar after generation. 320px wide, scrollable groups:

- **Variant tabs:** A (Food Focus) / B (Biodiversity) toggle at top
- **Confidence bar:** e.g. "88% match" with segmented bar
- **Groups:** "What will grow", "Water & structures", "Existing to enhance", "Tips"
  - Each item: checkbox (toggles inclusion), action badge (ADD/ENHANCE/TIP), plant chips, size tag, "why" tooltip
- **Footer:** Eye toggle (hide/show proposed overlay on map), Reject / Apply buttons

**Map overlay** while preview is active: proposed elements shown as dashed-border zones with `rgba(45,90,69,0.3)` fill layered on top of existing.

---

## Interactions & Behavior

| Trigger | Behavior |
|---------|----------|
| Click zone tile (General) | Switch to that zone's detail tab |
| Click zone tab | Switch active zone view, rulers + compass show |
| Click Generate plan | Opens wizard overlay |
| Wizard → Generate | 1.8s simulated loading → plan preview |
| Plan preview → Apply | Applies selected items to map, shows toast "Applied N elements to map" (3s) |
| Plan preview → Reject | Closes preview, returns to idle |
| Plan preview → Edit / New | Re-opens wizard |
| Hover zone tile | Border darkens, "Open" badge appears (0.15s transition) |
| Tweaks panel | Persist to localStorage; live-reload palette and layout |

**Palette tweaks (live):** Four presets via CSS custom property overrides on `:root` — Garden green (default), Deep forest, Harvest amber, Linen neutral.

---

## State Management

```
stage: 'idle' | 'wizard' | 'loading' | 'preview' | 'applied'
activeZone: string (zone id)
activeVariant: 'A' | 'B'
selected: Set<string> (names of plan items to apply)
hovered: string | null
previewHidden: boolean
toast: string | null
```

---

## Assets

All in `prototype/assets/`:

```
assets/
  veg/
    apple.svg, blueberry.svg, calendula.svg, chamomile.svg,
    corn.svg, elderberry.svg, garlic.svg, hazelnut.svg,
    plum.svg, raspberry.svg, rose.svg, strawberry.svg, sunflower.svg
  structures/
    animalArea.svg, bed.svg, compost.svg, greenhouse.svg,
    house.svg, pond.svg
```

---

## Source Files

| File | Purpose |
|------|---------|
| `index.html` | Entry point — fonts, CSS vars, script load order |
| `app.jsx` | App shell: TopBar, ZoneTabs, layout, state orchestration, Tweaks |
| `canvas.jsx` | Garden map canvas: General view (forest/river framing, zone tiles), all detail views (Vegetable Garden, Apple Guild, Pond, Herb Garden), ruler bars, shared primitives (Tree, Bush, ZoneLabel, etc.) |
| `zone-details.jsx` | Additional zone detail views registered to `window.ZoneDetails` |
| `wizard.jsx` | 3-step plan generation wizard overlay |
| `preview.jsx` | Plan preview sidebar with variant toggle + item selection |
| `icons.jsx` | Monoline SVG icon set (Leaf, Sparkle, Check, Compass, Plus, etc.) |
| `tweaks-panel.jsx` | In-prototype Tweaks panel (TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSelect, TweakButton) — wire to your own settings system |

---

## Notes for Implementation

1. **Garden coordinate system:** All zone positions are in metres on a `100m × 60m` grid, rendered as CSS `%` of the canvas. Zone tiles and decorations all use this coordinate space.

2. **Seeded PRNG:** Both canvas.jsx and zone-details.jsx use deterministic LCG/mulberry32 PRNGs keyed to each zone/bed/cell so the scattered plant layouts are stable. Re-implement with the same seeds for identical results.

3. **Dense plant scatter algorithm (Vegetable Garden):**
   - Compute count = `area_m² × plantsPerM²` (capped at 95)
   - Jittered grid: cols = round(√(count × aspectRatio)), rows = ceil(count / cols)
   - Per-cell jitter: ±42.5% of cell spacing
   - Scale: `base × min(dx,dy) × (0.78 + rng × 0.62)`
   - Depth sort by `y + size/2` before render

4. **`overflow: hidden` on soil cells** clips plant sprites cleanly — companion labels must be in a separate unclipped layer to avoid being cut.

5. **Tweaks panel** wires via `postMessage` to a host protocol — replace with your own settings drawer/store.

6. **No real AI calls** in the prototype — the wizard fires a `setTimeout(1800ms)` then shows mock plan data. Wire to your actual AI endpoint from `wizard.jsx`'s generate handler.
