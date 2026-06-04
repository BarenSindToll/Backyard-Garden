/**
 * structureCatalogUtils.js
 *
 * Single source of truth for all placeable garden structures.
 * Mirrors the STRUCTURES array in the frontend's gardenZoneConfig.js, extended
 * with permaculture-planning metadata such as canonicalType, canContainPlants,
 * canBeEnhanced, and the set of allowed actions the AI planner may output.
 *
 * Usage in the backend:
 *   import { STRUCTURE_CATALOG, resolveCanonicalType, getCatalogEntry, getCatalogForAI } from '../utils/structureCatalogUtils.js';
 */

// ── Catalog ───────────────────────────────────────────────────────────────────

export const STRUCTURE_CATALOG = [
    {
        catalogKey:         'raised_bed',
        displayName:        'Raised Bed',
        canonicalType:      'raised_bed',
        category:           'productive',
        defaultWidthM:      3,
        defaultHeightM:     1.2,
        canCreateNew:       true,
        canContainPlants:   true,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'plant_inside_existing'],
    },
    {
        catalogKey:         'greenhouse',
        displayName:        'Greenhouse',
        canonicalType:      'greenhouse',
        category:           'structure',
        defaultWidthM:      5,
        defaultHeightM:     4,
        canCreateNew:       true,
        canContainPlants:   true,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'plant_inside_existing'],
    },
    {
        catalogKey:         'pond',
        displayName:        'Pond',
        canonicalType:      'pond',
        category:           'water',
        defaultWidthM:      5,
        defaultHeightM:     5,
        canCreateNew:       true,
        canContainPlants:   true,   // marginal aquatic plants
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'add_near_existing'],
    },
    {
        catalogKey:         'compost',
        displayName:        'Compost',
        canonicalType:      'compost',
        category:           'productive',
        defaultWidthM:      2,
        defaultHeightM:     2,
        canCreateNew:       true,
        canContainPlants:   false,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'add_near_existing'],
    },
    {
        catalogKey:         'path',
        displayName:        'Path',
        canonicalType:      'path',
        category:           'access',
        defaultWidthM:      10,
        defaultHeightM:     1,
        canCreateNew:       true,
        canContainPlants:   false,
        canBeEnhanced:      false,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'add_near_existing'],
    },
    {
        catalogKey:         'house',
        displayName:        'House',
        canonicalType:      'house',
        category:           'stable',
        defaultWidthM:      10,
        defaultHeightM:     8,
        canCreateNew:       false,  // cannot be created — must already exist
        canContainPlants:   false,
        canBeEnhanced:      false,
        isStableByDefault:  true,
        allowedActions:     ['recommendation_only'],
    },
    {
        catalogKey:         'shed',
        displayName:        'Shed',
        canonicalType:      'shed',
        category:           'stable',
        defaultWidthM:      4,
        defaultHeightM:     3,
        canCreateNew:       true,
        canContainPlants:   false,
        canBeEnhanced:      true,
        isStableByDefault:  true,
        allowedActions:     ['create_new', 'enhance_existing', 'add_near_existing'],
    },
    {
        catalogKey:         'fence',
        displayName:        'Fence',
        canonicalType:      'fence',
        category:           'stable',
        defaultWidthM:      10,
        defaultHeightM:     0.5,
        canCreateNew:       true,
        canContainPlants:   false,
        canBeEnhanced:      true,  // can become a living hedge
        isStableByDefault:  true,
        allowedActions:     ['create_new', 'enhance_existing'],
    },
    {
        catalogKey:         'coop',
        displayName:        'Coop',
        canonicalType:      'coop',
        category:           'livestock',
        defaultWidthM:      3,
        defaultHeightM:     3,
        canCreateNew:       true,
        canContainPlants:   false,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'add_near_existing'],
    },

    // ── Vegetable garden zone portal ─────────────────────────────────────────
    {
        catalogKey:         'vegetable_garden',
        displayName:        'Vegetable Garden',
        canonicalType:      'vegetable_garden',
        category:           'productive',
        defaultWidthM:      14,
        defaultHeightM:     8,
        canCreateNew:       true,
        canContainPlants:   true,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'plant_inside_existing'],
    },

    // ── Permaculture functional areas ─────────────────────────────────────────
    {
        catalogKey:         'orchard',
        displayName:        'Orchard',
        canonicalType:      'orchard',
        category:           'productive',
        defaultWidthM:      14,
        defaultHeightM:     10,
        canCreateNew:       true,
        canContainPlants:   true,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'plant_inside_existing', 'add_near_existing'],
    },
    {
        catalogKey:         'guild',
        displayName:        'Guild',
        canonicalType:      'guild',
        category:           'productive',
        defaultWidthM:      6,
        defaultHeightM:     6,
        canCreateNew:       true,
        canContainPlants:   true,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'plant_inside_existing'],
    },
    {
        catalogKey:         'berry_patch',
        displayName:        'Berry Patch',
        canonicalType:      'berry_patch',
        category:           'productive',
        defaultWidthM:      8,
        defaultHeightM:     4,
        canCreateNew:       true,
        canContainPlants:   true,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'plant_inside_existing'],
    },
    {
        catalogKey:         'herb_garden',
        displayName:        'Herb Garden',
        canonicalType:      'herb_garden',
        category:           'productive',
        defaultWidthM:      5,
        defaultHeightM:     4,
        canCreateNew:       true,
        canContainPlants:   true,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'plant_inside_existing'],
    },
    {
        catalogKey:         'food_forest',
        displayName:        'Food Forest',
        canonicalType:      'food_forest',
        category:           'productive',
        defaultWidthM:      16,
        defaultHeightM:     12,
        canCreateNew:       true,
        canContainPlants:   true,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'plant_inside_existing'],
    },
    {
        catalogKey:         'wild_zone',
        displayName:        'Wild Zone',
        canonicalType:      'wild_zone',
        category:           'ecological',
        defaultWidthM:      12,
        defaultHeightM:     10,
        canCreateNew:       true,
        canContainPlants:   true,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing'],
    },

    // ── Additional structures ─────────────────────────────────────────────────
    {
        catalogKey:         'beehive',
        displayName:        'Beehive',
        canonicalType:      'beehive',
        category:           'livestock',
        defaultWidthM:      1,
        defaultHeightM:     1,
        canCreateNew:       true,
        canContainPlants:   false,
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'add_near_existing'],
    },
    {
        catalogKey:         'patio',
        displayName:        'Patio',
        canonicalType:      'patio',
        category:           'access',
        defaultWidthM:      6,
        defaultHeightM:     5,
        canCreateNew:       true,
        canContainPlants:   true,   // container plants / raised planters on patio
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'add_near_existing'],
    },
    {
        catalogKey:         'windbreak',
        displayName:        'Windbreak',
        canonicalType:      'windbreak',
        category:           'structure',
        defaultWidthM:      15,
        defaultHeightM:     2,
        canCreateNew:       true,
        canContainPlants:   true,   // hedge plants
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'plant_inside_existing'],
    },
    {
        catalogKey:         'swale',
        displayName:        'Swale',
        canonicalType:      'swale',
        category:           'water',
        defaultWidthM:      12,
        defaultHeightM:     1.5,
        canCreateNew:       true,
        canContainPlants:   true,   // swale edge planting
        canBeEnhanced:      true,
        isStableByDefault:  false,
        allowedActions:     ['create_new', 'enhance_existing', 'add_near_existing'],
    },
];

// ── Alias map: lowercase display name → catalogKey ────────────────────────────
// Covers all names users might place on the map or the AI might generate.

const ALIAS_MAP = new Map([
    // Raised bed variants
    ['raised bed', 'raised_bed'],
    ['raised beds', 'raised_bed'],
    ['wicking bed', 'raised_bed'],
    ['hugelkultur bed', 'raised_bed'],
    ['intensive raised bed', 'raised_bed'],
    ['raised bed — three sisters guild', 'raised_bed'],
    ['three sisters raised bed', 'raised_bed'],

    // Greenhouse
    ['greenhouse', 'greenhouse'],
    ['glass house', 'greenhouse'],
    ['glasshouse', 'greenhouse'],
    ['polytunnel', 'greenhouse'],
    ['poly tunnel', 'greenhouse'],
    ['cold frame', 'greenhouse'],

    // Pond / water
    ['pond', 'pond'],
    ['wildlife pond', 'pond'],
    ['ornamental pond', 'pond'],
    ['fish pond', 'pond'],
    ['water feature', 'pond'],
    ['water butt', 'pond'],
    ['rain tank', 'pond'],
    ['ibc tank', 'pond'],
    ['well', 'pond'],
    ['swale', 'pond'],     // swale ≈ water management
    ['swale on contour', 'pond'],

    // Compost
    ['compost', 'compost'],
    ['compost bin', 'compost'],
    ['compost heap', 'compost'],
    ['compost pile', 'compost'],
    ['three-bin compost system', 'compost'],
    ['compost system', 'compost'],

    // Path
    ['path', 'path'],
    ['pathway', 'path'],
    ['walkway', 'path'],
    ['access path', 'path'],
    ['wood chip path', 'path'],
    ['gravel path', 'path'],

    // House / stable structures
    ['house', 'house'],
    ['main house', 'house'],
    ['home', 'house'],

    // Shed
    ['shed', 'shed'],
    ['barn', 'shed'],
    ['workshop', 'shed'],
    ['storage shed', 'shed'],
    ['tool shed', 'shed'],

    // Fence / hedge
    ['fence', 'fence'],
    ['wall', 'fence'],
    ['gate', 'fence'],
    ['windbreak hedgerow', 'fence'],
    ['windbreak hedge', 'fence'],
    ['living hedge', 'fence'],
    ['native hedgerow', 'fence'],
    ['boundary hedge', 'fence'],

    // Coop
    ['coop', 'coop'],
    ['chicken coop', 'coop'],
    ['hen house', 'coop'],
    ['duck house', 'coop'],

    // Vegetable garden (zone portal)
    ['vegetable garden', 'vegetable_garden'],
    ['vegetable_garden', 'vegetable_garden'],
    ['kitchen garden', 'vegetable_garden'],
    ['potager', 'vegetable_garden'],
    ['main vegetable garden', 'vegetable_garden'],
    ['vegetable production area', 'vegetable_garden'],

    // Orchard
    ['orchard', 'orchard'],
    ['fruit tree area', 'orchard'],
    ['fruit orchard', 'orchard'],
    ['apple orchard', 'orchard'],
    ['orchard zone', 'orchard'],

    // Guild
    ['guild', 'guild'],
    ['plant guild', 'guild'],
    ['fruit tree guild', 'guild'],
    ['apple guild', 'guild'],
    ['plum guild', 'guild'],
    ['companion guild', 'guild'],
    ['permaculture guild', 'guild'],

    // Berry patch
    ['berry patch', 'berry_patch'],
    ['berry garden', 'berry_patch'],
    ['soft fruit area', 'berry_patch'],
    ['berry area', 'berry_patch'],

    // Herb garden
    ['herb garden', 'herb_garden'],
    ['herb bed', 'herb_garden'],
    ['culinary herb garden', 'herb_garden'],
    ['herbal border', 'herb_garden'],
    ['medicinal herb garden', 'herb_garden'],

    // Food forest
    ['food forest', 'food_forest'],
    ['forest garden', 'food_forest'],
    ['edible forest', 'food_forest'],
    ['edible woodland', 'food_forest'],

    // Wild zone
    ['wild zone', 'wild_zone'],
    ['wildlife area', 'wild_zone'],
    ['wildflower meadow', 'wild_zone'],
    ['natural area', 'wild_zone'],
    ['native planting', 'wild_zone'],
    ['meadow strip', 'wild_zone'],

    // Beehive
    ['beehive', 'beehive'],
    ['bee hive', 'beehive'],
    ['apiary', 'beehive'],
    ['hive', 'beehive'],
    ['langstroth hive', 'beehive'],

    // Patio
    ['patio', 'patio'],
    ['terrace', 'patio'],
    ['deck', 'patio'],
    ['seating area', 'patio'],
    ['outdoor living area', 'patio'],

    // Windbreak
    ['windbreak', 'windbreak'],
    ['windbreak hedge', 'windbreak'],
    ['shelter belt', 'windbreak'],
    ['shelterbelt', 'windbreak'],
    ['native hedge windbreak', 'windbreak'],

    // Swale
    ['swale', 'swale'],
    ['swale on contour', 'swale'],
    ['contour swale', 'swale'],
    ['water harvesting swale', 'swale'],
]);

// ── Public helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve any map structure name (from overlayItems or AI output) to a catalogKey.
 * Returns 'unknown' if no match is found.
 *
 * @param {string} name  – e.g. "Wildlife Pond", "Raised Bed — Three Sisters Guild"
 * @returns {string}     – catalogKey or 'unknown'
 */
export function resolveCanonicalType(name = '') {
    const lower = (name || '').toLowerCase().trim();

    // Exact alias match
    if (ALIAS_MAP.has(lower)) return ALIAS_MAP.get(lower);

    // Substring match — check if any alias key appears anywhere in the name
    for (const [alias, key] of ALIAS_MAP) {
        if (lower.includes(alias)) return key;
    }

    // Reverse substring — check if the name appears inside any alias
    for (const [alias, key] of ALIAS_MAP) {
        if (alias.includes(lower) && lower.length >= 4) return key;
    }

    return 'unknown';
}

/**
 * Get the full catalog entry for a given catalogKey or canonicalType.
 * @param {string} keyOrType
 * @returns {object|null}
 */
export function getCatalogEntry(keyOrType) {
    return STRUCTURE_CATALOG.find(
        e => e.catalogKey === keyOrType || e.canonicalType === keyOrType
    ) || null;
}

/**
 * Returns the subset of the catalog suitable for embedding in the AI prompt.
 * Only creatable structures are included; stable-only entries are excluded.
 *
 * @returns {object[]}
 */
export function getCatalogForAI() {
    return STRUCTURE_CATALOG
        .filter(e => e.canCreateNew)
        .map(({ catalogKey, displayName, canonicalType, category, defaultWidthM, defaultHeightM,
                 canContainPlants, canBeEnhanced, allowedActions }) =>
            ({ catalogKey, displayName, canonicalType, category, defaultWidthM, defaultHeightM,
               canContainPlants, canBeEnhanced, allowedActions })
        );
}

/** Set of all valid catalog keys (for fast validation). */
export const CATALOG_KEY_SET = new Set(STRUCTURE_CATALOG.map(e => e.catalogKey));

/** Set of valid action values the AI may output. */
export const VALID_ACTIONS = new Set([
    'create_new',
    'enhance_existing',
    'plant_inside_existing',
    'add_near_existing',
    'recommendation_only',
]);

// ── Strict post-generation validation ─────────────────────────────────────────

const CANNOT_RENDER_WARNING =
    'This item could not be rendered on the map because it does not match an existing structure or available catalog structure.';

/**
 * Validates every proposed element against two sources of truth:
 *   1. availableCatalogKeys — Set of catalogKey values the user can create new
 *   2. existingStructureIds — Set of id strings already on the garden map
 *
 * Elements that fail their action-specific rules are converted to
 * action="recommendation_only" and get a standard warning appended.
 *
 * Call this in the controller AFTER generating the raw plan (AI or mock)
 * and BEFORE persisting to the database.
 *
 * @param {object[]} elements             – rawPlan.proposedElements
 * @param {Set<string>} availableCatalogKeys – catalogKey values with canCreateNew=true
 * @param {Set<string>} existingStructureIds – id values from existingMapStructures
 * @returns {{ validated: object[], converted: number, report: object[] }}
 */
export function validateProposedElements(elements, availableCatalogKeys, existingStructureIds) {
    const validated = [];
    const report    = [];

    for (const el of (elements || [])) {
        const action  = el.action || 'create_new';
        let   pass    = true;
        let   reason  = null;

        switch (action) {
            case 'create_new':
                if (!el.catalogKey || !availableCatalogKeys.has(el.catalogKey)) {
                    pass   = false;
                    reason = `create_new requires a catalogKey present in availableStructureCatalog. Got: "${el.catalogKey || 'none'}"`;
                }
                break;

            case 'enhance_existing':
                if (!el.targetElementId || !existingStructureIds.has(String(el.targetElementId))) {
                    pass   = false;
                    reason = `enhance_existing requires a targetElementId present in existingMapStructures. Got: "${el.targetElementId || 'none'}"`;
                }
                break;

            case 'plant_inside_existing':
                if (!el.targetElementId || !existingStructureIds.has(String(el.targetElementId))) {
                    pass   = false;
                    reason = `plant_inside_existing requires a targetElementId present in existingMapStructures. Got: "${el.targetElementId || 'none'}"`;
                }
                break;

            case 'add_near_existing': {
                const badTarget  = !el.targetElementId || !existingStructureIds.has(String(el.targetElementId));
                const badCatalog = !el.catalogKey      || !availableCatalogKeys.has(el.catalogKey);
                if (badTarget || badCatalog) {
                    pass   = false;
                    reason = 'add_near_existing requires both a valid targetElementId and a valid catalogKey. ' +
                        `targetElementId="${el.targetElementId || 'none'}" catalogKey="${el.catalogKey || 'none'}"`;
                }
                break;
            }

            case 'recommendation_only':
                pass = true;   // always valid — no map rendering needed
                break;

            default:
                // Unknown action — safer to downgrade
                pass   = false;
                reason = `Unknown action "${action}"`;
        }

        if (!pass) {
            const downgraded = {
                ...el,
                action:   'recommendation_only',
                warnings: [...(el.warnings || []), CANNOT_RENDER_WARNING],
            };
            validated.push(downgraded);
            report.push({ name: el.name || '?', originalAction: action, reason });
        } else {
            validated.push(el);
        }
    }

    return { validated, converted: report.length, report };
}
