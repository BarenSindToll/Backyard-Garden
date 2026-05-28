# Handoff: Zone Detail Designs (Permaculture Planner)

## Overview
Each clickable zone on the General garden map now has its **own dedicated
detail view** with a unique visual vocabulary (orchard with companion guilds,
chicken coop with run and dust patches, three‑bin compost system, etc.).
Users click a zone tile (or a zone tab in the top bar) and see a rich,
illustrative top‑down view of that zone — not a generic grid.

The design intent is a hand‑drawn, watercolour permaculture plan: cream
paper background, leaf‑green washes, cream pill labels, wooden raised
beds, fruit trees with mulch rings.

## About the Design Files
The files in `prototype/` are **design references created in HTML/React via
in‑browser Babel** — prototypes showing intended look and behavior, not
production code to copy directly. The task is to **recreate these designs
in the existing `fixed-frontend` codebase** (React + Vite + Tailwind, with
the existing `src/components/garden-layout/` structure), following the
patterns already in place.

Open `prototype/index.html` in a browser to see the working prototype.
Click any zone tile on the General map, or use the zone tabs at the top of
the screen, to navigate between zones.

## Fidelity
**High‑fidelity (hifi)** — Exact colors, typography, and layout are specified
below. Where the design uses absolute positioning over a metre‑based
coordinate system, the implementation should preserve the same layout
metaphor (positions, ratios, ring radii) but is free to use the codebase's
existing Tailwind utilities and patterns for chrome (tabs, header, etc.).

The illustrative content (trees, hives, chickens, scarecrows, sheep, bee
hives, etc.) is **drawn in code** using CSS gradients, SVG paths, and small
patterns — there are NO custom illustration assets to import. The only
external assets are the small SVG plant icons already in
`fixed-frontend/src/assets/veg-icons/`.

---

## Target Files in the Codebase

Existing files that already match the design's structure:
- `src/components/garden-layout/ZoneTabs.jsx` — top‑bar zone navigation
- `src/components/garden-layout/GardenCanvas.jsx` — the main map renderer
- `src/components/garden-layout/ZoneCanvas.jsx` — grid view per zone
- `src/components/garden-layout/gardenZoneConfig.js` — zone type metadata

The new work belongs in a sibling folder/file:
- **NEW**: `src/components/garden-layout/zoneDetails/` — one file per zone
  (or a single `ZoneDetailViews.jsx` with a registry, matching how the
  prototype's `zone-details.jsx` is organised)
- **NEW**: `src/components/garden-layout/ZoneDetailCanvas.jsx` — the
  dispatcher that picks the right detail component for the active zone

The existing `ZoneCanvas.jsx` (the grid editor) should remain available
for users who want to plant individual cells. The detail view is a
**second, presentational layer** — clicking a zone should show the rich
illustrative view first, with an "Edit grid" affordance to drop into the
existing `ZoneCanvas`.

---

## Coordinate System

Every zone detail view uses a fixed **100 m × 60 m** virtual canvas. All
positions are expressed in metres and converted to percentages of the
container's width/height. This means the view scales gracefully to any
container size while preserving relative layouts.

```jsx
// Convert from metres to a CSS percentage
const xPct = (xMetres / 100) * 100 + '%';
const yPct = (yMetres / 60)  * 100 + '%';
```

For pixel‑exact rendering (e.g. icon sizes), the container measures itself
with a `ResizeObserver` and exposes `pxPerM` / `pxPerMY`:

```jsx
const ro = new ResizeObserver(([entry]) => {
  setPxPerM (entry.contentRect.width  / 100);
  setPxPerMY(entry.contentRect.height /  60);
});
```

---

## Zone Detail Views — Specification

Each view returns a single fragment containing:
- A **background `<svg>` layer** with watercolour washes, paths, and large
  patterned shapes (drawn in metre units via `viewBox="0 0 100 60"`)
- An absolutely‑positioned **foreground div layer** with illustrative
  HTML/CSS elements (trees as gradient circles, structures as styled
  divs, plant icons as `<img>` tags)
- A `CalloutCard` at the top with the zone name + subtitle
- A `<Pill>` label per significant element

### 1. Orchard
- 6 fruit trees in a 3 × 2 grid (top row y=17 m, bottom row y=43 m)
- Each tree has:
  - **Mulch ring**: dark brown radial gradient, radius 7–8 m
  - **Canopy**: green radial‑gradient circle, radius 4–4.5 m
  - **6 companion plants** in a ring around the canopy (calendula,
    chamomile, strawberry, garlic, blueberry, sunflower)
  - **Cream pill label** with the tree species below
- Mowed‑grass background with horizontal stripes, horizontal dirt walk
  at y=30 m
- Two bird‑box stakes in opposing corners
- Two fallen fruit (rotated apple/plum icons) near the path

### 2. Berry Patch
- 3 long raised beds (full width, 8 m tall) at y=14, 28, 42 m
- Bed frame: dark wood, straw‑mulch fill (`<pattern>` with diagonal lines)
- **Raspberry row** (top): adds vertical cane stakes + 3 horizontal
  training wires
- **Blueberry row** (middle): plain bushes
- **Strawberry row** (bottom): denser, zig‑zag pattern (`y ± 2 m`)
- **Netting overlay**: semi‑transparent 1.6 m grid covering the whole
  patch
- Yield tags rotated 90° on the right edge

### 3. Bee Hives (Apiary)
- 5 wooden **Langstroth hives** in a row at y=30 m
- Each hive: stacked boxes (4 high) with sloped roof + landing board + entrance hole
- Wildflower meadow background (calendula, sunflower, chamomile, rose
  icons scattered randomly, avoiding the hive band)
- 40 bees as small horizontally‑striped dots scattered across the meadow
- **Dashed flight curves** from each hive to nearby flowers (SVG paths)
- Sun in top‑right corner with rays
- Dirt path under hives (for the beekeeper)

### 4. Chicken Coop (Poultry)
- **Coop building** on the left (x=14 m, 24 × 22 m)
  - Sloped triangular roof (clip‑path) with horizontal shingle stripes
  - Wooden plank body (repeating linear gradient)
  - Window with cross frame, panel door with door knob, pop‑hole
    (chicken entrance) at bottom‑left
- **Outdoor run** on the right (x=40 m, 50 × 32 m)
  - Dirt yard pattern
  - **Chicken wire** hex pattern as a semi‑transparent overlay
  - Fence posts at corners + mid‑span
  - 5 brown **scratching/dust patches** (circles)
  - Red feed bowl + blue water bowl
- **11 chickens** scattered between coop and run, 3 breeds (brown / white
  / speckled) — each chicken is a `<div>` body + head with comb, beak, eye

### 5. Compost Yard
- Concrete pad behind 3 wooden bins at y=22 m
- **3 bins, each 24 × 24 m** at x=14, 42, 70 m
  - Bins use slatted wood (repeating linear gradient) with side posts
  - Compost pile inside scales with stage: Fresh 0.85 / Cooking 0.65 /
    Finished 0.45
  - Pile colours: green‑brown / mid‑brown / dark crumb
  - Wooden carved‑plaque label above each bin (FRESH / COOKING / FINISHED)
  - Italic subtitle below ("kitchen scraps · green", etc.)
- Pitchfork (rotated 8°) and shovel (rotated –12°) leaning at corners
- Wheelbarrow shadow as an ellipse

### 6. Greenhouse
- Gravel floor pattern with darker centre walking path
- **Glass roof grid** drawn as a semi‑transparent rectangle with vertical
  and horizontal mullions every ~10 m
- Faint **light beams** from windows (yellow polygons)
- **2 planting tables** (horizontal wooden bars) with rows of terracotta
  pots — top row strawberry, bottom row calendula
- 5 **hanging baskets** along the top edge
- Watering can in the bottom‑right corner
- Wooden door at south edge

### 7. Pasture
- Radial green gradient + tuft pattern background
- Worn meandering path (`M 8 30 Q 30 28 50 32 Q 70 36 92 30`)
- **Wooden post‑and‑rail fence** all around the perimeter (top/bottom
  posts every 4 m with horizontal rails between them; left/right posts
  every 10 m)
- 14 **sheep** scattered, mostly white wool with a couple of black — each
  is a fluffy gradient‑bumped div with a small dark head
- 2 shade oaks (Canopy components, dark tone)
- Blue **water trough** + small white salt‑lick block

### 8. Grain Plot
- Solid amber background with horizontal wheat‑row pattern stripes
- 360 wheat stalks drawn as tiny SVG `<line>`s with golden‑yellow seed
  heads (`<ellipse>`) — deterministic random scatter
- Brown **threshing path** at y=29 m
- 2 **scarecrows** at y=20 and y=42:
  - Wooden cross pole, burlap‑sack head with eyes + stitched mouth,
    floppy hat, red shirt, straw at sleeve ends
- 3 corner **sheaves** (12 angled wheat stalks tied with twine)

### 9. House
- Grass lawn background
- House footprint (60 × 34 m) with wood‑plank floor pattern
- Interior walls subdividing 5 rooms: Kitchen, Living, Bedroom, Bath,
  Office
- Door gaps drawn by overpainting the wall lines with the floor pattern
- Faint furniture rectangles (`Furn` component) inside each room
- Front porch (wooden) with 4 post dots
- Stone garden path from porch
- 2 front garden beds either side of the porch, planted with
  calendula, rose, sunflower, chamomile icons
- Roof outline as dashed rectangle (overhang)

### 10. Patio
- 5 × 8 grid of slightly‑irregular **flagstones** (each rotated 0–5°,
  with random size jitter); moss tint between stones
- Central **round dining table** (radial gradient + 4 plate dots + green
  centerpiece vase)
- 4 **chairs** around the table at 0/90/180/270°
- 4 **square terracotta planters** at corners with rose / sunflower /
  calendula / chamomile
- 2 **garden lanterns** at the south edge, with a warm yellow glow shadow

---

## Shared Primitives

These appear in `prototype/zone-details.jsx` and should be lifted into
shared components in the implementation:

### `<Pill>`
Cream paper‑tag label.
```js
{
  background: '#f7ecd0',
  border: '1px solid rgba(110,75,30,0.55)',
  borderRadius: 2,
  fontFamily: 'Inter, sans-serif',  // or 'Newsreader' if italic
  fontSize: 11,  fontWeight: 600,
  color: '#3a2810',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '2.4px 7.7px',  // ~ size * 0.22 by size * 0.7
  boxShadow: '0 2px 4px rgba(80,50,20,0.18)',
}
```

### `<CalloutCard>`
Like Pill but with a subtitle line in italic Newsreader.
```js
{
  background: 'rgba(247,236,208,0.95)',
  border: '1.5px solid rgba(110,75,30,0.6)',
  padding: '5px 13px',
  borderRadius: 4,
  boxShadow: '0 2px 6px rgba(80,50,20,0.25)',
}
```

### `<Plant>`
Renders an SVG plant icon at a metre coordinate.
```jsx
<img
  src={icon}
  style={{
    position: 'absolute',
    left: `calc(${(cx/100)*100}% - ${sizeM*pxPerM/2}px)`,
    top:  `calc(${(cy/ 60)*100}% - ${sizeM*pxPerMY/2}px)`,
    width:  sizeM * pxPerM,
    height: sizeM * pxPerMY,
    objectFit: 'contain',
    filter: 'drop-shadow(0 1.5px 2px rgba(50,30,10,0.32))',
    transform: `rotate(${rotate}deg)`,
  }}
/>
```

### `<Canopy>` — leafy tree from above
```js
background: `radial-gradient(circle at 32% 28%, #a8d088 0%, #6f9858 55%, #4d7637 100%)`,
border: '1.5px solid rgba(50,80,30,0.55)',
boxShadow: '0 4px 10px rgba(40,60,30,0.32), inset 0 -3px 5px rgba(50,80,30,0.35)',
borderRadius: '50%',
// Optional fruit icon at 52% of the canopy
```

### `<Layer>` — full‑viewport SVG underlay
```jsx
<svg viewBox="0 0 100 60" preserveAspectRatio="none"
     style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
              pointerEvents: 'none' }}>
  …
</svg>
```

### `seedRand(seed)` — deterministic PRNG
Used so plant scatter, sheep positions, etc. stay stable between renders.
Linear‑congruential generator, returns 0..1.

---

## Design Tokens (exact values)

### Paper / chrome
| Token | Value |
|---|---|
| `--paper` | `#fbf7ea` |
| `--cream` | `#ece2c8` |
| `--ink` | `#1d2a20` |
| `--ink-soft` | `#485547` |
| `--muted` | `#7c857a` |
| `--line` | `#d3cdb8` |
| `--line-soft` | `#e8e2cc` |

### Garden green
| Token | Value |
|---|---|
| `--forest` | `#3d6b34` |
| `--forest-2` | `#5e9050` |
| `--forest-deep` | `#1f3a18` |
| `--sage` | `#d8e3c0` |

### Earth / wood
| Token | Value |
|---|---|
| `--earth` | `#b87348` |
| `--clay` | `#c2613b` |
| `--amber` | `#d49644` |
| `--sun` | `#e3a83f` |
| Pine wood frame | `#c79a64` (base) → `#d8ad72`/`#b18250` gradient |
| Dark wood frame | `#6e3d1e` (base) → `#8a5a30`/`#5e3318` gradient |
| Mulch radial | `#7a5a32` → `#5a3e1d` → `#46301a` |
| Dirt path | `#b18244` stroke, `rgba(255,235,200,0.25)` highlight |

### Pill / sign
| Token | Value |
|---|---|
| Cream tag bg | `#f7ecd0` |
| Cream tag border | `rgba(110,75,30,0.55)` |
| Cream tag text | `#3a2810` |
| Wood plaque (compost label) | `linear-gradient(180deg, #e3c08a 0%, #c19655 100%)`, border `#5e3d1c` |

### Typography
- **Display / italic body**: `'Newsreader', Georgia, serif` (weights 400–600)
- **UI / labels**: `'Inter', system-ui, sans-serif` (400/500/600/700)
- **Mono / measurements**: `'JetBrains Mono', ui-monospace, monospace`
- All three are loaded from Google Fonts in `prototype/index.html`.

### Spacing / radii
- Container border radius: 10 px (outer panel)
- Pill border radius: 2 px
- CalloutCard border radius: 4 px
- Bed inner border radius: 1 px (cells)
- Most other rounded corners: 2–4 px

---

## Behaviour & Interaction

### Zone navigation
- **Top bar tabs**: `<ZoneTabs>` lists all zones; clicking a tab sets
  `activeZone`. The current tab is `forest`‑filled with cream text.
- **Map tile clicks**: every zone tile on the General map is clickable
  (`onClick` calls `onOpenZone(tab)`). Hover state: heavier border + soft
  outer shadow, and a small "Open" badge in the top‑right corner.
- **Active state of the dispatcher**: `GardenCanvas` reads `activeZone`;
  when `'general'`, renders the `<GeneralMap>`; otherwise, looks up the
  matching component in `window.ZoneDetails` and renders it.

### Faded mode
When the planner wizard is open, the canvas content fades to `opacity: 0.5`
so the wizard reads against a soft backdrop. All zone detail views
respect a `faded` prop and reduce internal opacity accordingly.

### Ruler bars
A 22 px ruler bar on top and left, drawn in SVG with minor ticks every
5 m and major ticks (with labels) every 10 m. Ruler bar background uses
`var(--ruler)` (`#1f3a18`).

### Compass
Top‑right of the canvas. Circular cream button with a black "N" letter
and a downward triangle (the arrow points toward the actual north). Static
in the prototype; in the real app it should reflect
`gardenSettings.northDirection`.

### Map legend (general view)
Bottom‑left of the map. Three swatches: Existing (`#bda480`), Proposed
(dashed forest border, sage fill), Enhance (dashed earth border, clay
fill). The Proposed/Enhance items only show when the planner has produced
a plan.

### Scale bar
Bottom‑right. 30 px monochrome bar + "10 m" label, mono font.

---

## How to Implement in the Existing Codebase

### Recommended approach
1. Create `src/components/garden-layout/zoneDetails/` with one file per
   zone (`Orchard.jsx`, `BerryPatch.jsx`, `Apiary.jsx`, `Coop.jsx`,
   `Compost.jsx`, `Greenhouse.jsx`, `Pasture.jsx`, `GrainPlot.jsx`,
   `House.jsx`, `Patio.jsx`).
2. Create `src/components/garden-layout/zoneDetails/primitives.jsx` with
   the shared `<Pill>`, `<CalloutCard>`, `<Plant>`, `<Canopy>`, `<Layer>`,
   `seedRand` exports.
3. Create `src/components/garden-layout/ZoneDetailRegistry.js`:
   ```js
   import Orchard from './zoneDetails/Orchard';
   // …
   export const ZONE_DETAILS = { orchard: Orchard, berry: BerryPatch, … };
   ```
4. In `GardenCanvas.jsx`, after determining `activeZone`, render:
   ```jsx
   const Detail = ZONE_DETAILS[detectZoneType(zone.name)];
   if (Detail) return <Detail faded={faded} pxPerM={pxPerM} pxPerMY={pxPerMY} />;
   ```
5. Reuse the existing plant icons in `src/assets/veg-icons/` — the
   prototype's `assets/veg/*.svg` files are placeholders with the same
   filenames (apple, plum, walnut, hazelnut, calendula, chamomile,
   strawberry, garlic, blueberry, sunflower, rose, raspberry, elderberry,
   corn).

### Tailwind notes
The prototype uses inline `style` objects because it needs dynamic values
(positions in metres, gradients, etc.). When porting:
- **Static chrome** (tabs, header, sidebar): use Tailwind utilities
- **Positioned content** (plant icons, structures, pills, etc.): inline
  styles are correct — these are computed from metre coordinates and
  `pxPerM`. Don't try to convert them to Tailwind arbitrary values, it
  fights the dynamic nature.
- **Colors that recur**: add to `tailwind.config.js` under `theme.extend.colors`
  (`paper: '#fbf7ea'`, `forest: '#3d6b34'`, etc.) so static chrome stays
  consistent.

### State
- `activeZone: string` — id of the current zone tab. Persist in URL
  search params (e.g. `?zone=orchard`) so reload preserves the view.
- `faded: boolean` — set by the planner wizard when it opens.
- `proposedPlan, hoveredName, selectedNames` — already wired in the
  existing planner code; pass through to `GardenCanvas` unchanged.

### Performance
- Each detail view renders 50–400 DOM nodes (the meadow + bees view is
  the heaviest at ~150). This is fine — React 18 + a fixed container
  size handles it easily.
- The `useMemo` with `seedRand` ensures random scatter is computed once.

---

## Assets

### Plant icons (already in codebase)
The prototype references `assets/veg/*.svg`. These match the existing
`fixed-frontend/src/assets/veg-icons/`:
- `apple.svg`, `plum.svg`, `walnut.svg`, `hazelnut.svg`
- `calendula.svg`, `chamomile.svg`, `sunflower.svg`, `rose.svg`
- `strawberry.svg`, `raspberry.svg`, `blueberry.svg`, `elderberry.svg`
- `garlic.svg`, `corn.svg`

### Structure icons (already in codebase)
`fixed-frontend/src/assets/structures-icons/` contains house, coop,
greenhouse, etc. Reuse these for the General view; the zone detail views
draw structures inline in HTML/CSS (no SVG asset needed).

### Fonts (Google Fonts)
Loaded in `prototype/index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,400&family=Inter:wght@400..700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```
Add these to the codebase's `index.html` or import via `index.css`
`@import url(...)` if not already present.

---

## Files

- `prototype/index.html` — entry point; loads Babel + the JSX files
- `prototype/canvas.jsx` — the main `<GardenCanvas>` dispatcher, the
  General view zone definitions, and the older detail views (Vegetable,
  Apple Guild, Herb Garden, Duck Pond) that already existed before this
  iteration
- `prototype/zone-details.jsx` — **THE FILE TO READ FIRST** — contains
  every new zone detail design (Orchard, Berry, Bees, Chickens, Compost,
  Greenhouse, Pasture, Grain, House, Patio)
- `prototype/app.jsx` — page chrome (top bar, zone tabs, plant sidebar)
  and state orchestration
- `prototype/icons.jsx` — small SVG icon set for UI chrome
- `prototype/preview.jsx`, `prototype/wizard.jsx` — planner overlay
  (already exists in the codebase as `PermaculturePlanWizard.jsx` etc.,
  included here for completeness if anything in the canvas refers back to
  the proposed‑plan overlay)
- `prototype/assets/veg/*.svg` — plant icons used in the detail views
- `prototype/assets/structures/*.svg` — structure icons used in the
  General view
- `prototype/tweaks-panel.jsx` — design exploration controls; NOT needed
  in production
