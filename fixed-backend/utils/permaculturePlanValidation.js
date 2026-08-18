/**
 * permaculturePlanValidation.js
 *
 * Validation helpers, normalisation, and overlap detection for permaculture plan
 * proposed elements. Applied after AI / mock generation and before DB persistence.
 *
 * Exports:
 *   validateGeneratedElement(element)                           → { valid, errors, warnings }
 *   normalizeGeneratedElement(element, gardenSetup)             → normalized element
 *   validatePermaculturePlan(plan)                              → { valid, errors, warnings, elementReports }
 *   resolvePlanElementOverlaps(elements, gardenSetup, existing) → { resolved, skipped }
 *   splitDraftSuggestionsForMvp(elements, garden)               → { mapSuggestions, additionalRecommendations, rejectedSuggestions }
 */

import {
    PERMACULTURE_ELEMENT_TYPES,
    CANONICAL_TYPE_DEFAULTS,
    STRUCTURAL_ELEMENT_TYPES,
    OPENABLE_ELEMENT_TYPES,
    DETAIL_PLAN_CAPABLE_TYPES,
    MIN_ELEMENT_SIZES,
    ASPECT_RATIO_RULES,
    elementTypeToCatalogKey,
} from '../config/permaculturePlanSchema.js';

// ── Module-level constants ────────────────────────────────────────────────────

const KNOWN_ELEMENT_TYPES = new Set(PERMACULTURE_ELEMENT_TYPES);

// catalogKey values whose schema `type` must be 'water-feature'
const WATER_FEATURE_CATALOG_KEYS = new Set(['pond', 'swale']);

// catalogKey values that must be 'structure', never 'planting-strip'
const MUST_BE_STRUCTURE = new Set([
    'compost', 'coop', 'shed', 'house', 'path', 'beehive', 'patio', 'windbreak', 'fence',
]);

// ── Internal helpers ──────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh, margin = 0.1) {
    return ax < bx + bw + margin
        && ax + aw > bx - margin
        && ay < by + bh + margin
        && ay + ah > by - margin;
}

// ── validateGeneratedElement ──────────────────────────────────────────────────

/**
 * Validate a single proposed element against permaculture plan schema rules.
 *
 * @param {object} element
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateGeneratedElement(element) {
    const errors   = [];
    const warnings = [];

    if (!element || typeof element !== 'object') {
        return { valid: false, errors: ['Element is not an object'], warnings };
    }

    const name = element.name || '(unnamed)';

    // ── 1. Reject unsupported element types ───────────────────────────────────
    const rawType    = (element.catalogKey || element.canonicalType || '').replace(/_/g, '-');
    const catalogKey = elementTypeToCatalogKey(rawType);
    const schemaType = element.type || 'structure';

    if (rawType && rawType !== 'unknown' && !KNOWN_ELEMENT_TYPES.has(rawType)) {
        errors.push(
            `"${name}": unknown element type "${rawType}" — not in PERMACULTURE_ELEMENT_TYPES`
        );
    }

    // ── 2. Prevent structural types from being rendered as planting-strip ──────
    if (STRUCTURAL_ELEMENT_TYPES.has(rawType) && schemaType === 'planting-strip') {
        errors.push(
            `"${name}": "${rawType}" cannot be type "planting-strip" — use "structure" or "water-feature"`
        );
    }

    // ── 3. Water features should use the correct schema type ──────────────────
    if (WATER_FEATURE_CATALOG_KEYS.has(catalogKey) && schemaType !== 'water-feature' && schemaType !== 'structure') {
        warnings.push(
            `"${name}": water element should have type "water-feature" or "structure", not "${schemaType}"`
        );
    }

    // ── 4. Pure structures must not be planting-strip ─────────────────────────
    if (MUST_BE_STRUCTURE.has(catalogKey) && schemaType === 'planting-strip') {
        errors.push(`"${name}": "${rawType}" must be type "structure", not "planting-strip"`);
    }

    // ── 5. Validate dimensions ────────────────────────────────────────────────
    const w = Number(element.width);
    const h = Number(element.height);

    if (!Number.isFinite(w) || w <= 0) {
        errors.push(`"${name}": width must be a positive number (got ${element.width})`);
    }
    if (!Number.isFinite(h) || h <= 0) {
        errors.push(`"${name}": height must be a positive number (got ${element.height})`);
    }

    const minSz = MIN_ELEMENT_SIZES[catalogKey];
    if (minSz && Number.isFinite(w) && Number.isFinite(h)) {
        if (w < minSz.w || h < minSz.h) {
            warnings.push(
                `"${name}": ${w}×${h} m is below recommended minimum ${minSz.w}×${minSz.h} m for "${rawType}"`
            );
        }
    }

    if (Number.isFinite(w) && Number.isFinite(h) && w * h < 0.01) {
        errors.push(`"${name}": effectively zero-size (${w}×${h} m)`);
    }

    // ── 6. Aspect-ratio rules ─────────────────────────────────────────────────
    const arRule = ASPECT_RATIO_RULES[catalogKey];
    if (arRule && Number.isFinite(w) && Number.isFinite(h)) {
        const long  = Math.max(w, h);
        const short = Math.min(w, h);
        const ratio = short > 0 ? long / short : Infinity;

        if (arRule.type === 'linear' && ratio < arRule.minRatio) {
            warnings.push(
                `"${name}": "${rawType}" should be linear (long ≥ ${arRule.minRatio}× short). ` +
                `Current ratio: ${ratio.toFixed(1)}.`
            );
        }
        if (arRule.type === 'near-square' && ratio > (arRule.maxRatio || 3)) {
            warnings.push(
                `"${name}": "${rawType}" should be roughly square (ratio ≤ ${arRule.maxRatio}). ` +
                `Current ratio: ${ratio.toFixed(1)}.`
            );
        }
    }

    // ── 7. Coordinates ────────────────────────────────────────────────────────
    if (!Number.isFinite(Number(element.x)) || !Number.isFinite(Number(element.y))) {
        errors.push(`"${name}": x and y must be finite numbers`);
    }

    // ── 8. plants[] must not contain structural type names ────────────────────
    const plants = Array.isArray(element.plants) ? element.plants : [];
    for (const pl of plants) {
        const plKey = (pl || '').toLowerCase().trim().replace(/\s+/g, '-');
        if (STRUCTURAL_ELEMENT_TYPES.has(plKey)) {
            errors.push(
                `"${name}": plants[] contains "${pl}" which is a structural element — ` +
                `remove it from plants[] or create a separate element.`
            );
        }
    }

    // ── 9. Confidence range ───────────────────────────────────────────────────
    const conf = Number(element.confidence);
    if (Number.isFinite(conf) && (conf < 0 || conf > 1)) {
        errors.push(`"${name}": confidence must be 0–1 (got ${conf})`);
    }

    // ── 10. permacultureZone ─────────────────────────────────────────────────
    if (element.permacultureZone != null) {
        const pz = Number(element.permacultureZone);
        if (!Number.isInteger(pz) || pz < 0 || pz > 5) {
            warnings.push(`"${name}": permacultureZone must be 0–5 (got ${element.permacultureZone})`);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

// ── normalizeGeneratedElement ─────────────────────────────────────────────────

/**
 * Normalise a proposed element:
 *  - Clamp position inside garden bounds
 *  - Apply default dimensions when missing or below minimum
 *  - Set permacultureZone integer (null if absent)
 *  - Set isOpenable flag based on type
 *  - Coerce schema type field for water features and pure structures
 *  - Normalize detailPlan shape
 *
 * @param {object} element
 * @param {{ widthM: number, heightM: number }} gardenSetup
 * @returns {object}
 */
export function normalizeGeneratedElement(element, gardenSetup) {
    const gardenW = Number(gardenSetup?.widthM)  || 20;
    const gardenH = Number(gardenSetup?.heightM) || 20;

    const rawType    = (element.catalogKey || element.canonicalType || '').replace(/_/g, '-');
    const catalogKey = elementTypeToCatalogKey(rawType);
    const defaults   = CANONICAL_TYPE_DEFAULTS[catalogKey] || { wM: 2, hM: 2 };
    const minSz      = MIN_ELEMENT_SIZES[catalogKey]       || { w: 0.5, h: 0.3 };

    // Dimensions: use element value when ≥ minimum; otherwise use catalog default
    const rawW = Number(element.width)  || 0;
    const rawH = Number(element.height) || 0;
    const w    = rawW >= minSz.w ? rawW : defaults.wM;
    const h    = rawH >= minSz.h ? rawH : defaults.hM;

    // Position: clamp inside garden
    const x = clamp(Number(element.x) || 0, 0, Math.max(0, gardenW - w));
    const y = clamp(Number(element.y) || 0, 0, Math.max(0, gardenH - h));

    // permacultureZone: validate and normalize
    let permacultureZone = element.permacultureZone ?? null;
    if (permacultureZone != null) {
        const pz = Number(permacultureZone);
        permacultureZone = (Number.isInteger(pz) && pz >= 0 && pz <= 5) ? pz : null;
    }
    // Fallback: infer zone from targetZone string ('1' → 1)
    if (permacultureZone == null && element.targetZone != null) {
        const tz = parseInt(String(element.targetZone), 10);
        if (Number.isInteger(tz) && tz >= 0 && tz <= 5) permacultureZone = tz;
    }

    // Coerce schema type
    let schemaType = element.type || 'structure';
    if (WATER_FEATURE_CATALOG_KEYS.has(catalogKey)) schemaType = 'water-feature';
    if (MUST_BE_STRUCTURE.has(catalogKey))           schemaType = 'structure';

    // 'permaculture-zone' is reserved for the conceptual Zone 0-5 overlays,
    // which never have a catalogKey. Any element with a real catalogKey
    // (orchard, vegetable_garden, berry_patch, etc.) that the AI mislabeled
    // as 'permaculture-zone' is a real, applyable garden zone — coerce it
    // back to 'structure' so it isn't excluded from the apply pipeline.
    if (schemaType === 'permaculture-zone' && catalogKey) {
        schemaType = 'structure';
    }

    // Openability
    const isOpenable    = OPENABLE_ELEMENT_TYPES.has(rawType);
    const hasDetailPlan = DETAIL_PLAN_CAPABLE_TYPES.has(rawType);

    // Normalize detailPlan
    let detailPlan = element.detailPlan || null;
    if (detailPlan && typeof detailPlan !== 'object') detailPlan = null;
    if (hasDetailPlan && detailPlan) {
        detailPlan = {
            layoutType:      String(detailPlan.layoutType || 'rows'),
            suggestedPlants: Array.isArray(detailPlan.suggestedPlants) ? detailPlan.suggestedPlants : [],
            notes:           String(detailPlan.notes || '').slice(0, 1000),
            ...(detailPlan.treeLayout ? { treeLayout: detailPlan.treeLayout } : {}),
            ...(detailPlan.layers     ? { layers:     detailPlan.layers     } : {}),
            ...(detailPlan.rows       ? { rows:       detailPlan.rows       } : {}),
            ...(detailPlan.blocks     ? { blocks:     detailPlan.blocks     } : {}),
        };
    } else if (!hasDetailPlan) {
        detailPlan = null;
    }

    // placementRules
    const placementRules = Array.isArray(element.placementRules)
        ? element.placementRules.filter(r => typeof r === 'string').slice(0, 20)
        : [];

    // Spatial strategy fields — preserve as-is if present, otherwise leave undefined
    const variantStrategy = element.variantStrategy ? String(element.variantStrategy).slice(0, 30)  : undefined;
    const strategyReason  = element.strategyReason  ? String(element.strategyReason).slice(0, 200)  : undefined;
    const strategyTags    = Array.isArray(element.strategyTags)
        ? element.strategyTags.filter(t => typeof t === 'string').slice(0, 10) : undefined;

    const result = {
        ...element,
        type:             schemaType,
        width:            parseFloat(w.toFixed(2)),
        height:           parseFloat(h.toFixed(2)),
        x:                parseFloat(x.toFixed(2)),
        y:                parseFloat(y.toFixed(2)),
        permacultureZone,
        placementRules,
        detailPlan,
        isOpenable,
    };
    if (variantStrategy !== undefined) result.variantStrategy = variantStrategy;
    if (strategyReason  !== undefined) result.strategyReason  = strategyReason;
    if (strategyTags    !== undefined) result.strategyTags    = strategyTags;
    return result;
}

// ── validatePermaculturePlan ─────────────────────────────────────────────────

/**
 * Validate a full plan object against the element schema rules.
 *
 * @param {object} plan
 * @returns {{ valid: boolean, errors: string[], warnings: string[], elementReports: object[] }}
 */
export function validatePermaculturePlan(plan) {
    const errors         = [];
    const warnings       = [];
    const elementReports = [];

    if (!plan || typeof plan !== 'object') {
        return { valid: false, errors: ['Plan is not an object'], warnings, elementReports };
    }

    if (!plan.summary && !plan.planNarrative) {
        warnings.push('Plan is missing both summary and planNarrative');
    }

    const elements = Array.isArray(plan.proposedElements) ? plan.proposedElements : [];
    if (elements.length === 0) {
        warnings.push('Plan has no proposed elements');
    }

    // Duplicate name check
    const seenNames = new Map();
    for (const el of elements) {
        const n = el.name || '';
        seenNames.set(n, (seenNames.get(n) || 0) + 1);
    }
    for (const [n, count] of seenNames) {
        if (count > 1) warnings.push(`Duplicate element name "${n}" appears ${count} times`);
    }

    // Per-element validation
    for (const el of elements) {
        const report = validateGeneratedElement(el);
        elementReports.push({ name: el.name || '?', valid: report.valid, errors: report.errors, warnings: report.warnings });
        if (!report.valid) errors.push(...report.errors);
        warnings.push(...report.warnings);
    }

    return { valid: errors.length === 0, errors, warnings, elementReports };
}

// ── resolvePlanElementOverlaps ────────────────────────────────────────────────

/**
 * Detect and resolve overlaps among proposed elements and existing overlay items.
 *
 * Strategy:
 *  1. recommendation_only / enhance / plant_inside elements pass through unchanged.
 *  2. Each create_new / add_near_existing element is checked against:
 *     a. Existing overlay items — obstacles, never moved.
 *     b. Already-resolved proposed elements.
 *  3. If overlap found, try shifts in 8 directions × 3 distances.
 *  4. If no valid position found, element is downgraded to recommendation_only.
 *
 * @param {object[]} elements
 * @param {{ widthM: number, heightM: number }} gardenSetup
 * @param {object[]} existingOverlayItems  – layout overlayItems (used as obstacles)
 * @returns {{ resolved: object[], skipped: object[] }}
 */
export function resolvePlanElementOverlaps(elements, gardenSetup, existingOverlayItems = []) {
    const gardenW = Number(gardenSetup?.widthM)  || 20;
    const gardenH = Number(gardenSetup?.heightM) || 20;

    // Build static obstacle list (existing items with metre positions)
    const obstacles = (existingOverlayItems || [])
        .filter(it => (it.wM || 0) > 0 && (it.hM || 0) > 0)
        .map(it => ({
            x:    Number(it.xM ?? 0),
            y:    Number(it.yM ?? 0),
            w:    Number(it.wM),
            h:    Number(it.hM),
            name: it.name || '?',
        }));

    function makeShifts(w, h) {
        const shifts = [];
        for (const gap of [0.5, 1.5, 3.0]) {
            shifts.push(
                [0,       h + gap], [0,       -(h + gap)],
                [w + gap, 0      ], [-(w + gap), 0      ],
                [w + gap, h + gap], [-(w + gap), h + gap],
                [w + gap,-(h+gap)], [-(w+gap), -(h+gap)],
            );
        }
        return shifts;
    }

    const placed   = [];  // { x, y, w, h } of already-resolved proposed elements
    const resolved = [];
    const skipped  = [];

    for (const el of (elements || [])) {
        // Non-map elements pass through unchanged
        if (
            el.action === 'recommendation_only' ||
            el.action === 'enhance_existing' ||
            el.action === 'plant_inside_existing' ||
            el.type   === 'permaculture-zone'
        ) {
            resolved.push(el);
            continue;
        }

        const w = Math.max(0.1, el.width  || 2);
        const h = Math.max(0.1, el.height || 2);
        let   x = clamp(el.x || 0, 0, Math.max(0, gardenW - w));
        let   y = clamp(el.y || 0, 0, Math.max(0, gardenH - h));

        function tryPlace(tx, ty) {
            const cx = clamp(tx, 0, Math.max(0, gardenW - w));
            const cy = clamp(ty, 0, Math.max(0, gardenH - h));
            if (cx + w > gardenW || cy + h > gardenH) return false;
            if (obstacles.some(o => rectsOverlap(cx, cy, w, h, o.x, o.y, o.w, o.h))) return false;
            if (placed.some(p  => rectsOverlap(cx, cy, w, h, p.x, p.y, p.w, p.h))) return false;
            x = cx; y = cy;
            return true;
        }

        if (tryPlace(x, y)) {
            placed.push({ x, y, w, h });
            resolved.push({ ...el, x, y });
            continue;
        }

        let found = false;
        for (const [dx, dy] of makeShifts(w, h)) {
            if (tryPlace((el.x || 0) + dx, (el.y || 0) + dy)) {
                found = true;
                placed.push({ x, y, w, h });
                resolved.push({
                    ...el, x, y,
                    warnings: [...(el.warnings || []),
                        `Position shifted by (${dx > 0 ? '+' : ''}${dx}, ${dy > 0 ? '+' : ''}${dy}) m to avoid overlap.`],
                });
                break;
            }
        }

        if (!found) {
            const reason = 'Could not be placed without overlap — shown as recommendation only.';
            skipped.push({ element: el.name || '?', reason });
            resolved.push({
                ...el,
                action:   'recommendation_only',
                warnings: [...(el.warnings || []), reason],
            });
        }
    }

    if (skipped.length > 0) {
        console.log(
            `[resolvePlanElementOverlaps] ${skipped.length} element(s) could not be placed:\n` +
            skipped.map(s => `  • "${s.element}": ${s.reason}`).join('\n')
        );
    }

    return { resolved, skipped };
}

// ── splitDraftSuggestionsForMvp ───────────────────────────────────────────────
// THE single source of truth (backend copy) for splitting a draft's
// proposedElements into what's map-visible/applyable vs sidebar-only advice.
// Mirrors buildDraftPreview() in fixed-frontend/src/config/permaculturePlanSchema.js
// — keep both in sync. Used by applyPlan so the backend independently re-derives
// exactly the same ≤2 map suggestions the user saw in preview, rather than
// trusting the client's selection at face value.

// MVP-supported catalog keys — only these may ever be newly created on the map.
// 'raised_bed' is deliberately excluded: it is not a General Map structure at
// all (see gardenZoneConfig.js GENERAL_STRUCTURES) — raised beds are placed
// only inside a zone via the bed editor. A raised_bed create_new suggestion
// has no real General Map identity, so the backend used to fall back to
// mislabeling it as "Vegetable Garden" (a catalog key hidden from the MVP
// palette) — exactly the phantom map suggestion this exclusion prevents.
export const MVP_APPLYABLE_CATALOG_KEYS = new Set([
    'greenhouse', 'pond', 'compost', 'coop', 'orchard',
]);

// Structure types that may only ever exist once — a second suggestion of the
// same type is always a duplicate. Raised Bed is excluded: multiple are normal.
const SINGULAR_DEDUPE_CATALOG_KEYS = new Set(['greenhouse', 'pond', 'compost', 'coop', 'orchard']);

export const MAX_MAP_SUGGESTIONS = 2;

// Extra clearance required around certain fixed structures — mirrors
// FIXED_OBSTACLE_BUFFERS_M in permaculturePlanController.js's applyPlan.
// Without this, a suggestion can look clear of the house/road here (0-margin
// check) but still get rejected by applyPlan's fitsAtPreviewPosition check
// (which enforces these buffers), producing a suggestion that previews fine
// and then silently fails to apply. Keeping the same buffers here closes
// that gap — an unsafe suggestion is demoted to advice before the user ever
// sees it as a map suggestion.
const FIXED_OBSTACLE_BUFFERS_M = { House: 1.5, 'Car Road': 1.0 };
const DEFAULT_OBSTACLE_MARGIN_M = 0.25;

function boxesOverlap(a, b, margin = 0) {
    return a.x < b.x + b.w + margin && a.x + a.w > b.x - margin
        && a.y < b.y + b.h + margin && a.y + a.h > b.y - margin;
}

function normalizedKey(el) {
    return ((el?.catalogKey || el?.canonicalType || '') + '').replace(/-/g, '_');
}

/**
 * Classify a single proposed element as applyable or advice-only. MVP rule:
 * only action="create_new" elements of an MVP-supported, not-already-existing
 * catalog key are ever applyable. Everything else — enhance_existing,
 * plant_inside_existing, add_near_existing, recommendation_only, non-MVP
 * types, and duplicates of an existing structure — is advice-only.
 *
 * @param {object} el
 * @param {Set<string>} existingCatalogKeys — structureKey/canonicalKey values already on the map
 * @returns {{ applyable: boolean, adviceReason: string|null }}
 */
function classifyForMvp(el, existingCatalogKeys) {
    if (!el || !el.name) return { applyable: false, adviceReason: null };
    const action = el.action || 'create_new';
    if (action !== 'create_new') return { applyable: false, adviceReason: null };

    const catalogKey = normalizedKey(el);
    if (catalogKey === 'path') return { applyable: false, adviceReason: null };
    if (!catalogKey && (el.type === 'permaculture-zone' || el.canonicalType === 'permaculture-zone')) {
        return { applyable: false, adviceReason: null };
    }
    if (!MVP_APPLYABLE_CATALOG_KEYS.has(catalogKey)) return { applyable: false, adviceReason: null };
    if (SINGULAR_DEDUPE_CATALOG_KEYS.has(catalogKey) && existingCatalogKeys.has(catalogKey)) {
        return { applyable: false, adviceReason: `a ${el.name} already exists on the map` };
    }
    return { applyable: true, adviceReason: null };
}

/**
 * Split proposedElements into the ≤2 validated map suggestions and everything
 * else (sidebar advice). Positions returned for mapSuggestions are the
 * element's own x/y/width/height, unmodified — this function never
 * repositions, only accepts-as-is or demotes to advice.
 *
 * @param {object[]} proposedElements — plan.proposedElements, unmodified
 * @param {{ widthM: number, heightM: number, overlayItems: object[] }} garden — CURRENT saved layout (not a stale generation-time snapshot)
 * @returns {{ mapSuggestions: object[], additionalRecommendations: object[], rejectedSuggestions: object[] }}
 */
export function splitDraftSuggestionsForMvp(proposedElements = [], garden = {}) {
    const widthM  = Number(garden.widthM)  || 20;
    const heightM = Number(garden.heightM) || 20;
    const overlayItems = garden.overlayItems || [];
    const obstacles = overlayItems.map(it => ({
        x: Number(it.xM ?? 0), y: Number(it.yM ?? 0), w: Number(it.wM) || 2, h: Number(it.hM) || 2,
        marginM: FIXED_OBSTACLE_BUFFERS_M[it.name] ?? DEFAULT_OBSTACLE_MARGIN_M,
    }));
    const existingCatalogKeys = new Set(
        overlayItems.map(it => it.structureKey || it.canonicalKey).filter(Boolean)
    );

    const mapSuggestions = [];
    const additionalRecommendations = [];
    const rejectedSuggestions = [];
    const candidates = [];

    for (const el of (proposedElements || [])) {
        if (!el || !el.name) { rejectedSuggestions.push(el); continue; }
        const { applyable, adviceReason } = classifyForMvp(el, existingCatalogKeys);
        if (!applyable) {
            additionalRecommendations.push(adviceReason ? { ...el, adviceReason } : el);
            continue;
        }
        candidates.push(el);
    }

    // Rank best-first: higher confidence, then original order (stable).
    const ranked = candidates
        .map((el, idx) => ({ el, idx, score: el.confidence != null ? el.confidence : 0.5 }))
        .sort((a, b) => b.score - a.score || a.idx - b.idx)
        .map(x => x.el);

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
