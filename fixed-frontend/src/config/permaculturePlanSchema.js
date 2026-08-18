/**
 * permaculturePlanSchema.js — shared permaculture plan element definitions.
 *
 * Frontend copy — kept in sync with fixed-backend/config/permaculturePlanSchema.js.
 * Do not add framework imports here.
 */

export const PERMACULTURE_ELEMENT_TYPES = [
    'raised-bed',
    'greenhouse',
    'path',
    'compost',
    'coop',
    'beehive',
    'shed',
    'patio',
    'windbreak',
    'pond',
    'swale',
    'orchard',
    'guild',
    'berry-patch',
    'herb-garden',
    'food-forest',
    'wild-zone',
    'vegetable-garden',
    'staple-crops',
    'permaculture-zone',
];

export const ELEMENT_TYPE_TO_MAP_STRUCTURE = {
    'raised-bed':        'Raised Bed',
    'greenhouse':        'Greenhouse',
    'path':              'Path',
    'compost':           'Compost',
    'coop':              'Coop',
    'beehive':           'Beehive',
    'shed':              'Shed',
    'patio':             'Patio',
    'windbreak':         'Windbreak',
    'pond':              'Pond',
    'swale':             'Swale',
    'orchard':           'Orchard',
    'guild':             'Guild',
    'berry-patch':       'Berry Patch',
    'herb-garden':       'Herb Garden',
    'food-forest':       'Food Forest',
    'wild-zone':         'Wild Zone',
    'vegetable-garden':  'Vegetable Garden',
    'staple-crops':      'Staple Crops',
    'permaculture-zone': 'Permaculture Zone',
};

export const CATALOG_KEY_TO_ELEMENT_TYPE = Object.fromEntries(
    Object.entries(ELEMENT_TYPE_TO_MAP_STRUCTURE).map(([et]) => [
        et.replace(/-/g, '_'),
        et,
    ])
);

export const CANONICAL_TYPE_COLORS = {
    raised_bed:     '#b87348',
    greenhouse:     '#5e9858',
    path:           '#a09068',
    compost:        '#8b5e3c',
    coop:           '#c4a270',
    beehive:        '#c09020',
    shed:           '#8a7050',
    patio:          '#7a8888',
    windbreak:      '#405028',
    pond:           '#1a70c0',
    swale:          '#3880b0',
    orchard:        '#6a8a3a',
    guild:          '#6858a8',
    berry_patch:    '#8a3868',
    herb_garden:    '#3a7058',
    food_forest:    '#2a5a28',
    wild_zone:      '#587038',
    vegetable_garden: '#5a9030',
    staple_crops:   '#a8821c',
    'permaculture-zone': '#6040a0',
};

export const CANONICAL_TYPE_DEFAULTS = {
    raised_bed:  { wM: 3,  hM: 1.2 },
    greenhouse:  { wM: 5,  hM: 4   },
    path:        { wM: 10, hM: 1   },
    compost:     { wM: 2,  hM: 2   },
    coop:        { wM: 3,  hM: 3   },
    beehive:     { wM: 1,  hM: 1   },
    shed:        { wM: 4,  hM: 3   },
    patio:       { wM: 6,  hM: 5   },
    windbreak:   { wM: 15, hM: 2   },
    pond:        { wM: 5,  hM: 5   },
    swale:       { wM: 12, hM: 1.5 },
    orchard:     { wM: 14, hM: 10  },
    guild:       { wM: 6,  hM: 6   },
    berry_patch: { wM: 8,  hM: 4   },
    herb_garden: { wM: 5,  hM: 4   },
    food_forest: { wM: 16, hM: 12  },
    wild_zone:   { wM: 12, hM: 10  },
    vegetable_garden: { wM: 12, hM: 8 },
    staple_crops:     { wM: 12, hM: 8 },
};

export const ZONE_AREA_ELEMENT_TYPES = new Set([
    'orchard', 'guild', 'berry-patch', 'herb-garden',
    'food-forest', 'wild-zone', 'vegetable-garden', 'staple-crops',
    'patio', 'permaculture-zone',
]);

export const PHYSICAL_STRUCTURE_ELEMENT_TYPES = new Set([
    'raised-bed', 'greenhouse', 'path', 'compost', 'coop',
    'beehive', 'shed', 'windbreak', 'pond', 'swale',
]);

export const ELEMENT_ZONE_AFFINITY = {
    'raised-bed':    ['1', '2'],
    'greenhouse':    ['1'],
    'path':          ['0', '1', '2', '3'],
    'compost':       ['1', '2'],
    'coop':          ['2', '3'],
    'beehive':       ['2', '3'],
    'shed':          ['1', '2'],
    'patio':         ['0', '1'],
    'windbreak':     ['3', '4'],
    'pond':          ['2', '3'],
    'swale':         ['2', '3', '4'],
    'orchard':       ['2', '3'],
    'guild':         ['2', '3'],
    'berry-patch':   ['2'],
    'herb-garden':   ['1', '2'],
    'food-forest':   ['3', '4'],
    'wild-zone':     ['4', '5'],
    'vegetable-garden': ['1', '2'],
    'staple-crops':  ['2', '3'],
    'permaculture-zone': [],
};

export const PERMACULTURE_ZONE_RULES = {
    0: {
        name: 'Home / immediate access',
        visitFrequency: 'daily',
        preferredElements: ['house', 'patio', 'water-source'],
        notes: 'Zone 0 is the house and immediate access area.',
    },
    1: {
        name: 'Daily harvest',
        visitFrequency: 'daily',
        preferredElements: ['raised-bed', 'herb-garden', 'greenhouse', 'compost', 'nursery'],
        notes: 'Place frequently harvested crops and daily maintenance elements close to the house.',
    },
    2: {
        name: 'Productive garden',
        visitFrequency: 'frequent',
        preferredElements: ['raised-bed', 'berry-patch', 'beehive', 'main-vegetable-beds'],
        notes: 'Main productive beds and small fruit areas.',
    },
    3: {
        name: 'Orchard / animals / larger systems',
        visitFrequency: 'occasional',
        preferredElements: ['orchard', 'guild', 'coop', 'swale', 'pond', 'food-forest'],
        notes: 'Larger perennial systems, animals, swales, and orchards.',
    },
    4: {
        name: 'Managed woodland / forage',
        visitFrequency: 'infrequent',
        preferredElements: ['food-forest', 'windbreak', 'timber', 'forage'],
        notes: 'Low-maintenance managed woodland and support systems.',
    },
    5: {
        name: 'Wild biodiversity area',
        visitFrequency: 'observe',
        preferredElements: ['wild-zone', 'habitat', 'pollinator-strip'],
        notes: 'Mostly unmanaged area for observation and biodiversity.',
    },
};

export const PLACEMENT_RULES = {
    'near-house':       'Must be within Zone 1 (close to house)',
    'full-sun':         'Requires 6+ hours of direct sun',
    'partial-shade':    'Tolerates or prefers partial shade',
    'near-water':       'Benefits from proximity to water source',
    'sheltered':        'Needs wind protection',
    'well-drained':     'Requires well-drained soil',
    'wet-area':         'Suitable for moist or low-lying areas',
    'zone-1':           'Place in Zone 1 (daily visit area)',
    'zone-2':           'Place in Zone 2 (frequent visit area)',
    'zone-3':           'Place in Zone 3 (occasional visit area)',
    'zone-4':           'Place in Zone 4 (managed woodland)',
    'zone-5':           'Place in Zone 5 (wild area)',
    'edge-of-garden':   'Suitable for garden boundary or edge',
    'linear':           'Element should be long and narrow',
    'windward-side':    'Place on the windward side of the garden',
    'low-point':        'Place at the lowest point for water collection',
    'south-facing':     'Face or tilt towards the south (northern hemisphere)',
    'north-boundary':   'Place near the northern boundary',
};

export const STRUCTURAL_ELEMENT_TYPES = new Set([
    'pond', 'swale', 'greenhouse', 'compost', 'coop', 'beehive',
    'orchard', 'guild', 'raised-bed', 'herb-garden', 'food-forest',
    'wild-zone', 'shed', 'house', 'patio', 'windbreak', 'path',
    'berry-patch', 'permaculture-zone',
]);

export const OPENABLE_ELEMENT_TYPES = new Set([
    'raised-bed', 'greenhouse', 'orchard', 'guild', 'berry-patch', 'herb-garden', 'food-forest',
    'vegetable-garden', 'staple-crops', 'pond',
]);

export const DETAIL_PLAN_CAPABLE_TYPES = new Set([
    'raised-bed', 'greenhouse', 'orchard', 'guild', 'berry-patch', 'herb-garden',
    'vegetable-garden', 'staple-crops',
]);

export const MIN_ELEMENT_SIZES = {
    raised_bed:  { w: 0.5,  h: 0.3  },
    greenhouse:  { w: 2,    h: 2    },
    pond:        { w: 1,    h: 1    },
    swale:       { w: 2,    h: 0.3  },
    path:        { w: 1,    h: 0.3  },
    beehive:     { w: 0.5,  h: 0.5  },
    shed:        { w: 1.5,  h: 1.5  },
    coop:        { w: 1.5,  h: 1.5  },
    patio:       { w: 2,    h: 2    },
    windbreak:   { w: 3,    h: 0.5  },
    orchard:     { w: 4,    h: 4    },
    guild:       { w: 3,    h: 3    },
    berry_patch: { w: 2,    h: 1    },
    herb_garden: { w: 1,    h: 1    },
    food_forest: { w: 5,    h: 5    },
    wild_zone:   { w: 2,    h: 1    },
    compost:     { w: 0.8,  h: 0.8  },
    vegetable_garden: { w: 3, h: 3  },
    staple_crops: { w: 3,   h: 3    },
};

export const ASPECT_RATIO_RULES = {
    swale:     { type: 'linear',      minRatio: 2.5 },
    path:      { type: 'linear',      minRatio: 2   },
    windbreak: { type: 'linear',      minRatio: 3   },
    pond:      { type: 'near-square', maxRatio: 3   },
};

export function elementTypeToCatalogKey(elementType) {
    return (elementType || '').replace(/-/g, '_');
}

export function catalogKeyToElementType(catalogKey) {
    return (catalogKey || '').replace(/_/g, '-');
}

// ── Apply-pipeline normalization helpers ─────────────────────────────────────
// Single source of truth for: which proposed elements are applyable, which
// create a linked zone tab, and which group they belong to in the side panel.
// Used by both PermaculturePlanSidePreview and GardenLayout so the preview map,
// the selection state, and the apply payload always agree.

// Actions that result in a real change to the map (vs. advice-only notes).
export const APPLY_ACTIONS = new Set([
    'create_new',
    'enhance_existing',
    'plant_inside_existing',
    'add_near_existing',
]);

// Element types whose "create_new" / "add_near_existing" placement also opens
// a linked internal zone tab (General Map parent item + zone detail view).
export const ZONE_PORTAL_ELEMENT_TYPES = new Set([
    'vegetable-garden',
    'herb-garden',
    'orchard',
    'berry-patch',
    'guild',
    'greenhouse',
    'food-forest',
    'staple-crops',
    'pond',
]);

// Group buckets for the side preview panel.
export const PRODUCTIVE_GROUP_TYPES = new Set([
    'vegetable-garden',
    'herb-garden',
    'orchard',
    'berry-patch',
    'guild',
    'food-forest',
    'staple-crops',
    'raised-bed',
    'wild-zone',
]);

export const WATER_ECOLOGY_GROUP_TYPES = new Set([
    'pond',
    'swale',
]);

export const STRUCTURE_GROUP_TYPES = new Set([
    'greenhouse',
    'compost',
    'coop',
    'beehive',
    'shed',
    'patio',
    'windbreak',
    'path',
]);

// Resolve the normalized catalog key (snake_case) for a proposed element,
// falling back from catalogKey -> canonicalType.
export function normalizedCatalogKey(el) {
    return (el?.catalogKey || el?.canonicalType || '').replace(/-/g, '_');
}

// MVP SCOPE (bachelor thesis stabilization): only these catalog keys have full
// add/move/resize/save/load/delete support in the General Map UI (see
// GENERAL_STRUCTURES in gardenZoneConfig.js). AI-proposed elements of any other
// type (berry patch, herb garden, vegetable garden, staple crops, guild, food
// forest, wild zone, beehive, shed, patio, windbreak, swale) are downgraded to
// recommendation-only below so Apply never places them on the map.
// 'raised_bed' is deliberately excluded too: it is not a General Map structure
// at all — GENERAL_STRUCTURES in gardenZoneConfig.js explicitly places raised
// beds only inside a zone via the bed editor, never on the General Map palette.
const MVP_APPLYABLE_CATALOG_KEYS = new Set([
    'greenhouse', 'pond', 'compost', 'coop', 'orchard',
]);

/**
 * Classify how a proposed element should be treated by the apply pipeline:
 *  - 'mapElement'         — a real, applyable map element (a simple overlay
 *                           item — apply never creates a zone tab, MVP Option A)
 *  - 'recommendationOnly' — advice/notes only, never placed on the map
 *
 * Crucially this does NOT trust the raw `type` field alone (AI output may
 * mislabel real garden zones as 'permaculture-zone'). It is derived from
 * `action` + `catalogKey`/`canonicalType`.
 */
export function getApplyMode(el) {
    if (!el) return 'recommendationOnly';
    const action = el.action || 'create_new';
    if (!APPLY_ACTIONS.has(action)) return 'recommendationOnly';

    // MVP stability: only brand-new placements are ever map-visible/applyable.
    // enhance_existing / plant_inside_existing / add_near_existing all target
    // something already on the map — the UI cannot yet represent that as a
    // distinct dashed box without confusion (e.g. "Greenhouse Planting" next
    // to an existing greenhouse reads as a second greenhouse). These stay
    // sidebar advice only.
    if (action !== 'create_new') {
        return 'recommendationOnly';
    }

    const catalogKey = normalizedCatalogKey(el);
    // Conceptual Zone 0-5 overlays have no catalogKey and are never applyable.
    if (!catalogKey && (el.type === 'permaculture-zone' || el.canonicalType === 'permaculture-zone')) {
        return 'recommendationOnly';
    }

    // Path elements are always rejected by the apply pipeline (users add paths
    // manually) — treat as recommendation-only so they never inflate the
    // "Apply N elements" count or get sent to the apply endpoint.
    if (catalogKey === 'path') {
        return 'recommendationOnly';
    }

    // MVP stability: everything outside the trimmed General Map structure set
    // stays advice-only (see MVP_APPLYABLE_CATALOG_KEYS above).
    if (!MVP_APPLYABLE_CATALOG_KEYS.has(catalogKey)) {
        return 'recommendationOnly';
    }

    return 'mapElement';
}

export function isApplyableElement(el) {
    return getApplyMode(el) !== 'recommendationOnly';
}

// ── Map suggestion cap (MVP thesis-demo simplification) ────────────────────────
// The General Map overlay is capped to a handful of the best proposed elements
// so a draft reads as "a few clear suggestions" rather than a wall of dashed
// boxes. Anything beyond the cap — or anything not MVP-applyable at all — is
// sidebar-only ("Additional recommendation" text), never drawn on the map.
export const MAX_MAP_SUGGESTIONS = 2;

// Extra clearance required around certain fixed structures — mirrors
// FIXED_OBSTACLE_BUFFERS_M in fixed-backend/controllers/permaculturePlanController.js's
// applyPlan. Without this, a suggestion can look clear of the house/road here
// (0-margin check) but still get rejected by applyPlan's fitsAtPreviewPosition
// check (which enforces these buffers) — previews fine, then silently fails
// to apply. Keeping the same buffers here closes that gap.
const FIXED_OBSTACLE_BUFFERS_M = { House: 1.5, 'Car Road': 1.0 };
const DEFAULT_OBSTACLE_MARGIN_M = 0.25;

function boxesOverlap(a, b, margin = 0) {
    return a.x < b.x + b.w + margin && a.x + a.w > b.x - margin
        && a.y < b.y + b.h + margin && a.y + a.h > b.y - margin;
}

/**
 * Ranks applyable elements best-first for map display:
 *   1. (pre-filtered by caller) MVP-supported / applyable at all
 *   2. Higher confidence first
 *   3. Elements with explicit width+height (clear placement) before vague ones
 *   4. Elements that don't overlap existing map structures before ones that do
 * Ties keep their original relative order (stable sort).
 *
 * @param {object[]} elements — already-applyable proposed elements
 * @param {{x:number,y:number,w:number,h:number}[]} obstacles — existing map structures' bounding boxes
 */
export function rankMapCandidates(elements, obstacles = []) {
    return elements
        .map((el, idx) => {
            const hasDims    = el.width != null && el.height != null;
            const confidence = el.confidence != null ? el.confidence : 0.5;
            const box        = { x: el.x || 0, y: el.y || 0, w: el.width || 2, h: el.height || 2 };
            const overlaps   = obstacles.some(o => boxesOverlap(box, o));
            const score      = confidence * 100 + (hasDims ? 20 : 0) - (overlaps ? 25 : 0);
            return { el, idx, score };
        })
        .sort((a, b) => b.score - a.score || a.idx - b.idx)
        .map(x => x.el);
}

/**
 * THE single source of truth for splitting a draft's proposedElements into
 * what's map-visible/applyable vs sidebar-only advice. Used identically by:
 *   - the General Map overlay (which elements to draw, at which coordinates)
 *   - the side preview panel (Map suggestions vs Additional recommendations)
 *   - the apply payload (exactly the elements the user was shown — no re-derivation)
 *
 * Positions returned for mapSuggestions are FINAL — nothing downstream may
 * reposition, re-rank, or reinterpret them. An element either fits safely
 * where the AI put it, or it is demoted to advice-only. This is what
 * guarantees preview and apply always agree.
 *
 * @param {object[]} proposedElements — plan.proposedElements, unmodified
 * @param {{widthM:number, heightM:number, overlayItems:object[]}} garden — current saved layout
 * @returns {{ mapSuggestions: object[], additionalRecommendations: object[], rejectedSuggestions: object[] }}
 */
// Structure types that may only ever exist once — a second AI suggestion of
// the same type is always a duplicate, never a distinct new map element
// (e.g. a second Greenhouse suggestion when one already exists). Raised Bed
// is deliberately excluded: multiple raised beds are normal.
const SINGULAR_DEDUPE_CATALOG_KEYS = new Set(['greenhouse', 'pond', 'compost', 'coop', 'orchard']);

export function buildDraftPreview(proposedElements = [], garden = {}) {
    const widthM  = garden.widthM  || 20;
    const heightM = garden.heightM || 20;
    const overlayItems = garden.overlayItems || [];
    const obstacles = overlayItems.map(it => ({
        x: it.xM ?? 0, y: it.yM ?? 0, w: it.wM || 2, h: it.hM || 2,
        marginM: FIXED_OBSTACLE_BUFFERS_M[it.name] ?? DEFAULT_OBSTACLE_MARGIN_M,
    }));
    const existingCatalogKeys = new Set(
        overlayItems.map(it => it.structureKey || it.canonicalKey).filter(Boolean)
    );

    const mapSuggestions = [];
    const additionalRecommendations = [];
    const rejectedSuggestions = [];
    const candidates = [];

    for (const el of proposedElements) {
        if (!el || !el.name) { rejectedSuggestions.push(el); continue; }
        if (!isApplyableElement(el)) { additionalRecommendations.push(el); continue; }

        // Duplicate guard: a Greenhouse/Pond/Compost/Coop/Orchard suggestion
        // is advice-only once one already exists on the map — never a second
        // dashed box. Matches the generator's own dedup logic; this is the
        // defense-in-depth layer in case that ever slips.
        const catalogKey = normalizedCatalogKey(el);
        if (SINGULAR_DEDUPE_CATALOG_KEYS.has(catalogKey) && existingCatalogKeys.has(catalogKey)) {
            additionalRecommendations.push({ ...el, adviceReason: `a ${el.name} already exists on the map` });
            continue;
        }

        candidates.push(el);
    }

    const ranked = rankMapCandidates(candidates, obstacles);
    const placed = [...obstacles];

    for (const el of ranked) {
        if (mapSuggestions.length >= MAX_MAP_SUGGESTIONS) {
            additionalRecommendations.push(el);
            continue;
        }

        const { x, y, width: w, height: h } = el;
        const hasValidDims = [x, y, w, h].every(n => typeof n === 'number' && Number.isFinite(n)) && w > 0 && h > 0;
        if (!hasValidDims) {
            additionalRecommendations.push({ ...el, adviceReason: 'placement uncertain' });
            continue;
        }

        const inBounds = x >= 0 && y >= 0 && (x + w) <= widthM + 0.01 && (y + h) <= heightM + 0.01;
        if (!inBounds) {
            additionalRecommendations.push({ ...el, adviceReason: 'placement uncertain — outside garden bounds' });
            continue;
        }

        const box = { x, y, w, h };
        if (placed.some(o => boxesOverlap(box, o, o.marginM ?? DEFAULT_OBSTACLE_MARGIN_M))) {
            additionalRecommendations.push({ ...el, adviceReason: 'placement uncertain — overlaps an existing structure' });
            continue;
        }

        mapSuggestions.push(el);
        placed.push({ ...box, marginM: DEFAULT_OBSTACLE_MARGIN_M });
    }

    return { mapSuggestions, additionalRecommendations, rejectedSuggestions };
}

/**
 * Single source of truth for "which elements does Apply act on".
 * Used by the side preview (selection count + Apply button label),
 * the map preview overlay, and GardenLayout's apply payload — so all
 * three always agree on the same set of elements.
 *
 * @param {object[]} elements — proposedElements (or a re-laid-out copy of them)
 * @param {Set<string>|null} selectedNames — null means "all applyable elements selected"
 * @returns {object[]} the elements that will actually be sent to the apply endpoint
 */
export function getSelectedApplyableElements(elements, selectedNames) {
    const applyable = (elements || []).filter(isApplyableElement);
    if (selectedNames === null || selectedNames === undefined) return applyable;
    return applyable.filter(el => selectedNames.has(el.name));
}

/**
 * Classify a proposed element into one of the side-panel group buckets:
 * 'structures' | 'productive' | 'water_ecology' | 'recommendations'
 */
export function classifyApplyGroup(el) {
    if (getApplyMode(el) === 'recommendationOnly') return 'recommendations';

    const elementType = catalogKeyToElementType(normalizedCatalogKey(el));
    if (WATER_ECOLOGY_GROUP_TYPES.has(elementType)) return 'water_ecology';
    if (STRUCTURE_GROUP_TYPES.has(elementType)) return 'structures';
    if (PRODUCTIVE_GROUP_TYPES.has(elementType)) return 'productive';

    if (el.type === 'water-feature') return 'water_ecology';
    return 'structures';
}

const SCHEMA_TYPE_FALLBACK_COLORS = {
    'permaculture-zone': '#6040a0',
    'structure':         '#8B5E3C',
    'planting-strip':    '#4a7c3f',
    'water-feature':     '#1a70c0',
};

export function resolveElementColor(catalogKey, schemaType) {
    return CANONICAL_TYPE_COLORS[catalogKey]
        || SCHEMA_TYPE_FALLBACK_COLORS[schemaType]
        || '#8B5E3C';
}
