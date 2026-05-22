/**
 * permacultureContextService.js
 *
 * Assembles a rich, structured context object from the user's garden data and
 * wizard inputs. This object is stored on the plan as `sourceContext` and is
 * designed to be sent verbatim to an AI model once that integration is added.
 *
 * All functions are pure (no side-effects) except `buildPermacultureContext`,
 * which queries the database for the user profile.
 *
 * ── Example output (abbreviated) ────────────────────────────────────────────
 * {
 *   generatedAt: "2026-05-10T14:30:00.000Z",
 *   userProfile:  { hardinessZone: "7b", favoritePlants: ["Tomato","Comfrey"], ... },
 *   gardenLayout: { widthM: 20, heightM: 15, areaM2: 300, climate: "Temperate", ... },
 *   existingElements: {
 *     stableElements:  ["House","Shed","Fence"],
 *     movableElements: ["Raised Bed","Coop"],
 *     allStructures:   ["House","Shed","Fence","Raised Bed","Coop"],
 *     plantingZones:   [{ name: "Vegetable Guild", plants: ["Tomato","Basil"], ... }],
 *     uniquePlants:    ["Tomato","Basil","Comfrey"],
 *   },
 *   siteCharacteristics: {
 *     constraints:   [{ severity:"high", message:"No composting system..." }],
 *     opportunities: [{ priority:"high", title:"Wildlife Pond", description:"..." }],
 *     inferredPermacultureZones: { 0: { label:"Zone 0 — Home", ... }, 1: {...}, ... },
 *   },
 *   userRequirements: { raw: {...}, normalized: { goals:["Food Production"], ... } },
 *   permacultureContext: {
 *     applicablePrinciples: ["Catch and store energy", ...],
 *     guildOpportunities:   [{ guild:"Three Sisters", plants:["Corn","Bean","Squash"] }],
 *     waterStrategy:        { approach:"swale+pond", notes:"..." },
 *     soilStrategy:         { approach:"sheet-mulch", notes:"..." },
 *     successionPlanning:   { year1:["..."], year2:["..."], year5plus:["..."] },
 *   },
 * }
 * ────────────────────────────────────────────────────────────────────────────
 */

import userModel from '../models/userModel.js';
import {
    STRUCTURE_CATALOG,
    resolveCanonicalType,
    getCatalogEntry,
    getCatalogForAI,
} from '../utils/structureCatalogUtils.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const STABLE_NAMES = new Set([
    'House', 'Shed', 'Fence', 'Tree', 'Well', 'Water Butt', 'Gate', 'Wall',
]);
const SEMI_STABLE_NAMES = new Set([
    'Greenhouse', 'Compost', 'Pond', 'Path',
]);
const WATER_NAMES = new Set([
    'Pond', 'Water Butt', 'Well', 'Swale', 'Rain Garden',
]);
const BED_NAMES = new Set([
    'Raised Bed', 'Wicking Bed', 'Hugelkultur Bed',
]);

// Permaculture companion guilds that can be recommended
const KNOWN_GUILDS = [
    { guild: 'Three Sisters',    plants: ['Corn', 'Climbing Bean', 'Squash'],          benefit: 'Nitrogen fixation, ground shading, structural support' },
    { guild: 'Apple Guild',      plants: ['Apple', 'Comfrey', 'Yarrow', 'Nasturtium'], benefit: 'Dynamic accumulation, pollinator attraction, pest control' },
    { guild: 'Mediterranean Herb', plants: ['Rosemary', 'Lavender', 'Sage', 'Thyme'], benefit: 'Drought tolerance, pollinator support, culinary yield' },
    { guild: 'Nitrogen Fixers',  plants: ['Comfrey', 'Clover', 'Lupin', 'Alder'],     benefit: 'Soil fertility building from atmospheric nitrogen' },
    { guild: 'Pest Deterrent',   plants: ['Basil', 'Marigold', 'Nasturtium', 'Chives'], benefit: 'Confuse pest insects, attract beneficial predators' },
    { guild: 'Groundcover Guild', plants: ['Strawberry', 'Clover', 'Thyme'],           benefit: 'Suppress weeds, retain moisture, provide yield at ground level' },
];

// ── Helper: estimate pixels-per-metre from backend (no canvas available) ─────

function estimateBackendPxPerM(widthM, heightM) {
    // Approximate a typical desktop canvas of 900 × 550 px
    const estW = 900;
    const estH = 550;
    return Math.max(4, Math.min(estW / (widthM || 1), estH / (heightM || 1)));
}

// ── classifyExistingElements ──────────────────────────────────────────────────

/**
 * Separates overlay items into stable vs movable, collects all plants across
 * zone grids and bed layouts, and groups structures by type.
 *
 * @param {object} layout – gardenLayout document (or snapshot)
 * @returns Classification object
 */
export function classifyExistingElements(layout = {}) {
    try {
        const overlayItems = layout.overlayItems || [];
        const zones        = layout.zones        || [];
        const grids        = layout.grids        || [];
        const bedLayouts   = layout.bedLayouts   || {};
        const zoneItems    = layout.zoneItems    || {};
        const setup        = layout.setup        || {};
        const widthM       = setup.widthM  || 10;
        const heightM      = setup.heightM || 10;
        const pxPerM       = estimateBackendPxPerM(widthM, heightM);

        const stable      = [];
        const movable     = [];
        const byType      = {};

        for (const item of overlayItems) {
            const name = (item.name || '').trim();
            if (!name) continue;

            const classified = {
                name,
                wM:       item.wM ?? null,
                hM:       item.hM ?? null,
                xM:       item.x  != null ? +(item.x  / pxPerM).toFixed(2) : null,
                yM:       item.y  != null ? +(item.y  / pxPerM).toFixed(2) : null,
                rotation: item.rotation || 0,
            };

            if (STABLE_NAMES.has(name)) {
                stable.push({ ...classified, stability: 'stable' });
            } else if (SEMI_STABLE_NAMES.has(name)) {
                stable.push({ ...classified, stability: 'semi-stable' });
            } else {
                movable.push({ ...classified, stability: 'movable' });
            }

            if (!byType[name]) byType[name] = [];
            byType[name].push(classified);
        }

        // Plants from zone grids
        const gridPlants = grids
            .flat(3)
            .filter(c => c?.plant)
            .map(c => c.plant);

        // Plants from bed layouts (rows and blocks)
        const bedPlants = [];
        for (const bl of Object.values(bedLayouts)) {
            for (const row of bl?.rows   || []) { if (row?.plant?.name) bedPlants.push(row.plant.name); }
            for (const blk of bl?.blocks || []) { if (blk?.plant?.name) bedPlants.push(blk.plant.name); }
        }

        // Plants from zone-level beds (zoneItems)
        const zoneItemBedPlants = [];
        for (const items of Object.values(zoneItems)) {
            for (const item of (items || [])) {
                const bl = bedLayouts[item.id];
                if (!bl) continue;
                for (const row of bl.rows   || []) { if (row?.plant?.name) zoneItemBedPlants.push(row.plant.name); }
                for (const blk of bl.blocks || []) { if (blk?.plant?.name) zoneItemBedPlants.push(blk.plant.name); }
            }
        }

        const allPlants   = [...new Set([...gridPlants, ...bedPlants, ...zoneItemBedPlants])];
        const plantsByZone = zones.map((name, i) => ({
            name,
            gridRows: grids[i]?.length    || 0,
            gridCols: grids[i]?.[0]?.length || 0,
            plants:   (grids[i] || []).flat().filter(c => c?.plant).map(c => c.plant),
        }));

        return {
            stable,
            movable,
            byType,
            allStructureNames: overlayItems.map(i => i.name).filter(Boolean),
            allPlants,
            plantsByZone,
            hasHouse:      !!byType['House'],
            hasGreenhouse: !!byType['Greenhouse'],
            hasCompost:    !!byType['Compost'],
            hasPond:       !!byType['Pond'],
            hasPath:       !!byType['Path'],
            hasFence:      !!byType['Fence'],
            hasRaisedBed:  Object.keys(byType).some(k => BED_NAMES.has(k)),
            hasWater:      Object.keys(byType).some(k => WATER_NAMES.has(k)),
        };
    } catch (err) {
        console.error('[classifyExistingElements]', err.message);
        return {
            stable: [], movable: [], byType: {}, allStructureNames: [], allPlants: [], plantsByZone: [],
            hasHouse: false, hasGreenhouse: false, hasCompost: false, hasPond: false,
            hasPath: false, hasFence: false, hasRaisedBed: false, hasWater: false,
        };
    }
}

// ── inferPermacultureZones ────────────────────────────────────────────────────

/**
 * Determines which permaculture design zones (0–5) are relevant for this
 * garden size and suggests what should go in each, given existing elements.
 *
 * @param {object} layout
 * @param {object} userRequirements
 * @returns Object keyed by zone number (0..5)
 */
export function inferPermacultureZones(layout = {}, userRequirements = {}) {
    try {
        const setup   = layout.setup || {};
        const widthM  = setup.widthM  || 10;
        const heightM = setup.heightM || 10;
        const areaM2  = widthM * heightM;
        const el      = classifyExistingElements(layout);

        // Scale: only go as far as the garden size can support
        const maxZone = areaM2 > 5000 ? 5 : areaM2 > 1000 ? 4 : areaM2 > 200 ? 3 : 2;

        const zones = {};

        zones[0] = {
            label:          'Zone 0 — Home / Hub',
            radiusM:        '0–2',
            description:    'The house, shelter, and immediate living area. All other zones radiate from here.',
            presentElements: el.hasHouse ? ['House'] : [],
            recommended:    ['Primary tool storage', 'Direct kitchen connection', 'Seed-starting area'],
            relevance:      'always',
        };

        zones[1] = {
            label:          'Zone 1 — Intensive Kitchen Garden',
            radiusM:        '2–10',
            description:    'Visited daily. Annual vegetables, culinary herbs, salad greens, compost, seed raising.',
            presentElements: [
                el.hasRaisedBed  ? 'Raised Bed'  : null,
                el.hasGreenhouse ? 'Greenhouse'  : null,
                el.hasCompost    ? 'Compost'     : null,
            ].filter(Boolean),
            recommended:    ['Annual vegetables', 'Culinary herbs', 'Three-bin compost', 'Water access'],
            relevance:      'critical',
        };

        zones[2] = {
            label:          'Zone 2 — Semi-Intensive',
            radiusM:        '10–30',
            description:    'Visited weekly. Fruit trees, berry bushes, perennial vegetables, larger beds.',
            presentElements: [
                el.hasPond ? 'Wildlife Pond' : null,
            ].filter(Boolean),
            recommended:    ['Fruit trees', 'Berry bushes', 'Comfrey', 'Wildlife pond', 'Perennial herbs'],
            relevance:      maxZone >= 2 ? 'critical' : 'n/a',
        };

        if (maxZone >= 3) {
            zones[3] = {
                label:          'Zone 3 — Extensive Production',
                radiusM:        '30–100',
                description:    'Visited occasionally. Large-scale crops, orchards, livestock pasture.',
                presentElements: [],
                recommended:    ['Nut/fruit trees', 'Larger vegetable plots', 'Windbreak', 'Swale system'],
                relevance:      'secondary',
            };
        }

        if (maxZone >= 4) {
            zones[4] = {
                label:          'Zone 4 — Semi-Wild',
                radiusM:        '100–300',
                description:    'Minimal management. Timber, coppice, fuel, foraging.',
                presentElements: [el.hasFence ? 'Boundary Fence' : null].filter(Boolean),
                recommended:    ['Native trees', 'Coppice', 'Wildlife corridors'],
                relevance:      'tertiary',
            };
        }

        if (maxZone >= 5) {
            zones[5] = {
                label:          'Zone 5 — Wilderness',
                radiusM:        '300+',
                description:    'Observation only. Natural succession, sanctuary.',
                presentElements: [],
                recommended:    ['No intervention', 'Observation and learning'],
                relevance:      'tertiary',
            };
        }

        return zones;
    } catch (err) {
        console.error('[inferPermacultureZones]', err.message);
        return {};
    }
}

// ── detectConstraints ─────────────────────────────────────────────────────────

/**
 * Analyses the layout and user requirements to identify limiting factors.
 *
 * @param {object} layout
 * @param {object} userRequirements
 * @returns Array of constraint objects
 */
export function detectConstraints(layout = {}, userRequirements = {}) {
    try {
        const constraints = [];
        const setup       = layout.setup || {};
        const widthM      = setup.widthM  || 10;
        const heightM     = setup.heightM || 10;
        const areaM2      = widthM * heightM;
        const el          = classifyExistingElements(layout);
        const freeText    = (userRequirements.freeText || '').toLowerCase();

        // ── Missing critical systems ───────────────────────────────────────────
        if (!el.hasCompost) {
            constraints.push({
                type:           'missing-system',
                severity:       'high',
                message:        'No composting system detected. Nutrient cycling is incomplete; the garden depends on bought-in inputs.',
                recommendation: 'Install a three-bin compost system in Zone 1, close to the kitchen garden.',
            });
        }

        if (!el.hasPath) {
            constraints.push({
                type:           'access',
                severity:       'medium',
                message:        'No permanent paths defined. Uncontrolled foot traffic compacts soil in bed areas.',
                recommendation: 'Design 60 cm wood-chip, gravel, or paved paths to all productive areas before establishing beds.',
            });
        }

        if (!el.hasWater) {
            constraints.push({
                type:           'water-storage',
                severity:       'medium',
                message:        'No water storage elements present (pond, water butt, well). The garden is dependent on mains or unpredictable rainfall.',
                recommendation: 'Add rainwater collection (IBC tanks) or a small pond. Even 500 litres of storage improves drought resilience significantly.',
            });
        }

        // ── Scale constraints ─────────────────────────────────────────────────
        if (areaM2 < 20) {
            constraints.push({
                type:           'scale',
                severity:       'high',
                message:        `Very small garden (${areaM2} m²). Only Zones 0–1 are practical; full zone design is not applicable.`,
                recommendation: 'Focus on intensive vertical growing, containers, and very high-value crops (salad, herbs, chillies).',
            });
        } else if (areaM2 < 80) {
            constraints.push({
                type:           'scale',
                severity:       'low',
                message:        `Small garden (${areaM2} m²). Zones 0–2 are realistic; Zone 3+ elements should use dwarf/compact varieties.`,
                recommendation: 'Choose columnar or dwarf fruit trees. Use espaliered forms against walls to maximise space.',
            });
        }

        // ── User-reported problems ─────────────────────────────────────────────
        const PROBLEM_PATTERNS = [
            {
                keywords:       ['flood', 'waterlog', 'boggy', 'wet ground', 'standing water'],
                type:           'drainage',
                severity:       'high',
                message:        'Flooding or waterlogging reported — indicates high water table or impermeable subsoil.',
                recommendation: 'Raise all beds above the water table. Install a French drain or reed-bed biofilter. A pond at the lowest point converts the problem into an asset.',
            },
            {
                keywords:       ['drought', 'dry soil', 'water stress', 'no rain'],
                type:           'water-scarcity',
                severity:       'high',
                message:        'Drought conditions reported. Water availability is a primary design constraint.',
                recommendation: 'Prioritise swales on contour, deep mulching (15 cm wood chip), and drought-tolerant species. Install IBC rain-water tanks.',
            },
            {
                keywords:       ['shade', 'shadow', 'dark', 'no sun', 'low light'],
                type:           'light',
                severity:       'medium',
                message:        'Shade is a limiting factor. Annual vegetable yields will be significantly reduced.',
                recommendation: 'Position sun-demanding crops in the brightest spot. Use shade for forest-garden species, leafy greens, and shade-tolerant herbs (mint, sorrel, lovage).',
            },
            {
                keywords:       ['wind', 'exposed', 'gusts', 'gale', 'blustery'],
                type:           'wind',
                severity:       'medium',
                message:        'Wind exposure reported. Wind stress desiccates plants and reduces yields.',
                recommendation: 'Plant a windbreak hedge (hawthorn, hazel, elder, rugosa rose) on the windward boundary as the first priority before other planting.',
            },
            {
                keywords:       ['poor soil', 'clay', 'sandy soil', 'compacted', 'chalk'],
                type:           'soil-quality',
                severity:       'medium',
                message:        'Challenging soil conditions reported.',
                recommendation: 'Sheet-mulch with cardboard + 15 cm compost + 10 cm wood chip. Plant nitrogen-fixing green manures immediately. Do not dig — feed the soil surface and let biology do the work.',
            },
            {
                keywords:       ['slope', 'steep', 'hillside', 'terraced', 'gradient'],
                type:           'terrain',
                severity:       'medium',
                message:        'Sloped terrain reported. Erosion and uneven water distribution are significant risks.',
                recommendation: 'Design swales on contour (A-frame or laser level) and terraced raised beds. Plant deep-rooted perennials (comfrey, vetiver) on slopes to stabilise soil immediately.',
            },
            {
                keywords:       ['rabbit', 'deer', 'pest', 'slug', 'rodent'],
                type:           'wildlife-pressure',
                severity:       'medium',
                message:        'Wildlife or pest pressure reported.',
                recommendation: 'Install appropriate exclusion fencing. Use companion planting (alliums, aromatic herbs) as deterrents. Encourage natural predators via habitat features.',
            },
        ];

        for (const pattern of PROBLEM_PATTERNS) {
            if (pattern.keywords.some(kw => freeText.includes(kw))) {
                constraints.push({
                    type:           pattern.type,
                    severity:       pattern.severity,
                    message:        pattern.message,
                    recommendation: pattern.recommendation,
                });
            }
        }

        return constraints;
    } catch (err) {
        console.error('[detectConstraints]', err.message);
        return [];
    }
}

// ── detectOpportunities ───────────────────────────────────────────────────────

/**
 * Identifies high-leverage permaculture interventions that are not yet present.
 *
 * @param {object} layout
 * @param {object} userRequirements
 * @returns Array of opportunity objects
 */
export function detectOpportunities(layout = {}, userRequirements = {}) {
    try {
        const opportunities = [];
        const setup         = layout.setup || {};
        const widthM        = setup.widthM  || 10;
        const heightM       = setup.heightM || 10;
        const areaM2        = widthM * heightM;
        const el            = classifyExistingElements(layout);
        const zones         = layout.zones || [];

        if (!el.hasPond) {
            opportunities.push({
                type:        'biodiversity',
                priority:    'high',
                title:       'Wildlife Pond',
                description: 'A pond is statistically the single highest-yield permaculture element per m². Even 2–4 m² attracts frogs, dragonflies, and birds that provide natural pest control. Also acts as a thermal mass and local humidity regulator.',
                effort:      'medium',
                returns:     'high',
            });
        }

        if (!el.hasGreenhouse && areaM2 > 25) {
            opportunities.push({
                type:        'production',
                priority:    'high',
                title:       'Greenhouse or Polytunnel',
                description: 'Extends the effective growing season by 6–8 weeks at each end. Enables year-round salad crops and early starts for heat-lovers (tomatoes, peppers, aubergines) without a heated greenhouse.',
                effort:      'medium',
                returns:     'very high',
            });
        }

        if (!el.hasCompost) {
            opportunities.push({
                type:        'soil-health',
                priority:    'critical',
                title:       'Composting System',
                description: 'Converts all kitchen scraps and garden waste into rich soil amendment. Within one season, eliminates the need for bought-in fertiliser and reduces landfill waste to near zero. A three-bin system allows continuous turning.',
                effort:      'low',
                returns:     'very high',
            });
        }

        if (!el.hasFence) {
            opportunities.push({
                type:        'microclimate',
                priority:    'medium',
                title:       'Living Hedge / Windbreak',
                description: 'A mixed native hedgerow (hawthorn, hazel, elderflower, dog rose) on the boundary provides wind protection, wildlife habitat, and a productive yield of berries, flowers, and cuttings. Increases in value every year.',
                effort:      'low',
                returns:     'high',
            });
        }

        if (!el.hasRaisedBed) {
            opportunities.push({
                type:        'production',
                priority:    'medium',
                title:       'Raised Beds for Zone 1',
                description: 'Raised beds warm faster in spring, drain freely, and allow intensive cultivation. A 1.2 m × 3 m bed can supply a household with salad and herbs through the season from a small footprint.',
                effort:      'low',
                returns:     'high',
            });
        }

        if (zones.length === 0) {
            opportunities.push({
                type:        'planning',
                priority:    'high',
                title:       'Fresh Zone Design',
                description: 'No planting zones are defined yet — this is the ideal moment to design the garden using permaculture zones from scratch, without needing to work around established plantings.',
                effort:      'low',
                returns:     'high',
            });
        } else {
            opportunities.push({
                type:        'diversity',
                priority:    'medium',
                title:       `Guild Planting in ${zones.length} Existing Zone${zones.length > 1 ? 's' : ''}`,
                description: `Existing zones can be immediately upgraded with companion guild plants. Surround any productive zone with comfrey (dynamic accumulator), yarrow (insect attractor), and nasturtium (pest distractor).`,
                effort:      'low',
                returns:     'medium',
            });
        }

        if (areaM2 >= 400) {
            opportunities.push({
                type:        'food-forest',
                priority:    'medium',
                title:       'Food Forest Layer System',
                description: `With ${areaM2} m² available, a multi-layer food forest with 3–5 fruit trees, berry shrubs, perennial vegetables, and groundcover plants could produce diverse food with minimal annual labour after establishment.`,
                effort:      'high',
                returns:     'very high (long term)',
            });
        }

        return opportunities;
    } catch (err) {
        console.error('[detectOpportunities]', err.message);
        return [];
    }
}

// ── normalizeUserRequirements ─────────────────────────────────────────────────

/**
 * Cleans and enriches the raw user requirements from the wizard.
 *
 * @param {object} input – raw userRequirements from the wizard
 * @returns { raw, normalized }
 */
export function normalizeUserRequirements(input = {}) {
    try {
        const raw = {
            freeText:        String(input.freeText        || '').trim().slice(0, 1000),
            goals:           (Array.isArray(input.goals)           ? input.goals           : []).filter(Boolean),
            focusAreas:      (Array.isArray(input.focusAreas)      ? input.focusAreas      : []).filter(Boolean),
            preferredPlants: (Array.isArray(input.preferredPlants) ? input.preferredPlants : []).filter(Boolean),
            excludedPlants:  (Array.isArray(input.excludedPlants)  ? input.excludedPlants  : []).filter(Boolean),
        };

        const lower = raw.freeText.toLowerCase();

        // Infer extra goals from free-text
        const inferredGoals = [];
        if (/food|veg|harvest|crop|fruit|grow/.test(lower) &&
            !raw.goals.some(g => /food/i.test(g))) {
            inferredGoals.push('Food Production');
        }
        if (/wildlife|biodiv|insect|bee|butterfly|frog/.test(lower)) inferredGoals.push('Wildlife Habitat');
        if (/low.?maint|easy|minimal|simple/.test(lower))            inferredGoals.push('Low Maintenance');
        if (/flower|ornament|beautiful|aesthetic/.test(lower))        inferredGoals.push('Flowers & Beauty');
        if (/child|kid|family|safe/.test(lower))                      inferredGoals.push('Family Friendly');

        // Infer site problems from free-text
        const inferredProblems = [];
        const PROBLEM_MAP = {
            flooding:      /flood|waterlog|boggy|wet ground|standing water/,
            drought:       /drought|dry soil|water.?stress/,
            shade:         /shade|shadow|dark|no sun|low.?light/,
            wind:          /wind|exposed|gust|blustery/,
            'poor-soil':   /poor soil|clay|sand(y soil)?|compacted|chalk/,
            slope:         /slope|steep|hillside|gradient|terraced/,
            pests:         /rabbit|deer|slug|pest|rodent/,
        };
        for (const [problem, rx] of Object.entries(PROBLEM_MAP)) {
            if (rx.test(lower)) inferredProblems.push(problem);
        }

        // Infer time commitment from free-text
        let timeCommitment = null;
        if (/< ?1 hour|minimal time|very.?little/.test(lower))          timeCommitment = 'very-low';
        else if (/1.?3 hours?|few hours?|couple of hours?/.test(lower)) timeCommitment = 'low';
        else if (/3.?7 hours?|several hours?|half.?day/.test(lower))    timeCommitment = 'medium';
        else if (/7\+? hours?|full.?day|plenty of time/.test(lower))    timeCommitment = 'high';

        // Infer design style from focus areas / free text
        let inferredStyle = null;
        if (/food.?forest|forest.?garden|perennial/.test(lower))        inferredStyle = 'food-forest';
        else if (/intensive|raised bed|veg.?plot/.test(lower))          inferredStyle = 'intensive-beds';
        else if (/greenhouse|polytunnel|covered/.test(lower))           inferredStyle = 'greenhouse-focused';
        else if (raw.focusAreas.some(f => /mixed/i.test(f)))            inferredStyle = 'mixed';

        return {
            raw,
            normalized: {
                goals:           [...new Set([...raw.goals, ...inferredGoals])],
                focusAreas:      raw.focusAreas,
                preferredPlants: raw.preferredPlants,
                excludedPlants:  raw.excludedPlants,
                inferredProblems,
                inferredStyle,
                timeCommitment,
                freeTextSummary: raw.freeText.slice(0, 300),
            },
        };
    } catch (err) {
        console.error('[normalizeUserRequirements]', err.message);
        return { raw: {}, normalized: { goals: [], focusAreas: [], preferredPlants: [], excludedPlants: [], inferredProblems: [], inferredStyle: null, timeCommitment: null, freeTextSummary: '' } };
    }
}

// ── Internal helpers for permacultureContext sub-section ──────────────────────

function deriveApplicablePrinciples(elements, normalizedReqs, constraints) {
    const applicable = [];
    const constraintTypes = new Set(constraints.map(c => c.type));
    const goals = new Set(normalizedReqs.normalized?.goals || []);

    if (constraintTypes.has('drainage') || constraintTypes.has('water-scarcity')) {
        applicable.push('Catch and store energy — water is the primary energy to capture on this site');
    }
    if (!elements.hasCompost) {
        applicable.push('Produce no waste — establish composting to close the nutrient loop');
    }
    if (constraintTypes.has('scale')) {
        applicable.push('Use slow and small solutions — intensive Zone 1 management suits this garden size');
    }
    if (goals.has('Wildlife Habitat')) {
        applicable.push('Use and value diversity — maximise species and structural diversity for ecosystem resilience');
    }
    if (goals.has('Food Production') && (elements.plantsByZone?.length > 0 || elements.hasRaisedBed)) {
        applicable.push('Obtain a yield — every element placed should produce food, habitat, or another measurable benefit');
    }
    if (constraintTypes.has('wind') || constraintTypes.has('terrain')) {
        applicable.push('Design from patterns to details — establish windbreaks and swales (patterns) before individual plantings (details)');
    }
    applicable.push('Observe and interact — spend time on site before finalising layout; note sun, water, and wind paths through the seasons');
    applicable.push('Integrate rather than segregate — guild planting rather than monoculture blocks');

    return [...new Set(applicable)];
}

function deriveGuildOpportunities(existingPlants, setup) {
    const present  = new Set(existingPlants.map(p => String(p).toLowerCase()));
    const suitable = [];

    for (const guild of KNOWN_GUILDS) {
        const overlap = guild.plants.filter(p => present.has(p.toLowerCase()));
        const missing = guild.plants.filter(p => !present.has(p.toLowerCase()));
        suitable.push({
            guild:        guild.guild,
            allPlants:    guild.plants,
            alreadyHave:  overlap,
            toAdd:        missing,
            benefit:      guild.benefit,
            readiness:    overlap.length === 0 ? 'no-overlap' : overlap.length >= guild.plants.length - 1 ? 'nearly-complete' : 'partial',
        });
    }
    // Sort by how close the user is to having the guild complete
    suitable.sort((a, b) => b.alreadyHave.length - a.alreadyHave.length);
    return suitable;
}

function deriveWaterStrategy(layout, constraints) {
    const constraintTypes = new Set(constraints.map(c => c.type));
    const el   = classifyExistingElements(layout);
    const setup = layout.setup || {};

    const approaches = [];
    if (constraintTypes.has('drainage')) {
        approaches.push('reed-bed or bog garden to absorb excess water');
        approaches.push('raised beds above water table');
    }
    if (constraintTypes.has('water-scarcity') || !el.hasWater) {
        approaches.push('swales on contour to harvest rainwater');
        approaches.push('rainwater collection tanks (IBC or dedicated butt)');
        approaches.push('deep mulching (15 cm wood chip) to reduce evaporation by 60–70%');
    }
    if (!el.hasPond) {
        approaches.push('wildlife pond for water storage, humidity, and biodiversity');
    }

    return {
        primary:    constraintTypes.has('drainage') ? 'drainage-management' : constraintTypes.has('water-scarcity') ? 'water-harvesting' : 'balanced',
        approaches: approaches.length ? approaches : ['maintain current water management; add a pond if space allows'],
        irrigation: setup.climate?.toLowerCase().includes('dry') || setup.climate?.toLowerCase().includes('arid')
            ? 'drip irrigation recommended for Zone 1 crops'
            : 'rainwater sufficient in most years; supplemental irrigation for Zone 1 in dry spells',
    };
}

function deriveSoilStrategy(layout, constraints) {
    const constraintTypes = new Set(constraints.map(c => c.type));

    const steps = ['Stop digging — switch to no-dig method to preserve soil biology'];
    if (constraintTypes.has('soil-quality')) {
        steps.push('Sheet-mulch problem areas with cardboard + 15 cm compost + 10 cm wood chip');
        steps.push('Sow nitrogen-fixing green manures (clover, vetch, phacelia) in empty areas immediately');
    }
    steps.push('Plant dynamic accumulators (comfrey, yarrow) and chop-and-drop regularly');
    steps.push('Add compost annually as a 3 cm top-dressing; never leave soil bare');
    steps.push('Inoculate with mycorrhizal fungi when transplanting perennials');

    return {
        approach: constraintTypes.has('soil-quality') ? 'remediation-then-build' : 'build-and-maintain',
        steps,
        timeline: '6–12 months for initial improvement; 3 years for significant soil life recovery',
    };
}

function deriveSuccession(setup, elements) {
    const hasWater = elements.hasWater;
    const hasCompost = elements.hasCompost;

    return {
        year1: [
            'Establish composting system (critical first step)',
            'Define and mulch main paths to prevent compaction',
            !hasWater ? 'Install rainwater collection or dig wildlife pond' : 'Maintain existing water features',
            'Plant perennial groundcovers and dynamic accumulators (comfrey, clover) across all zones',
            'Sow annual vegetables and herbs in Zone 1 for immediate yield',
        ].filter(Boolean),
        year2: [
            'Plant fruit trees and berry bushes in Zone 2',
            'Establish windbreak hedge if site is exposed',
            'Begin guild planting around any established perennials',
            'Introduce annual crop rotation system in Zone 1',
            'Build soil in Zone 3 areas using deep mulch and green manures',
        ],
        year3to5: [
            'Fruit trees begin to produce — implement companion guilds beneath each',
            'Windbreak reaches functional height — install final layout for protected areas',
            'Zone 1 soil should be rich and biologically active — reduce external inputs to zero',
            'Assess water flow and refine swale positions based on observation',
        ],
        yearFivePlus: [
            'Garden becomes largely self-regulating — maintenance focus shifts from establishment to harvest',
            'Coppice any established wood for fuel, stakes, and mulch material',
            'Consider adding Zone 4 elements if space allows — timber trees, extensive foraging areas',
            'Share propagated plants and seed with community to complete the "produce no waste" principle',
        ],
    };
}

// ── buildExistingMapStructures ────────────────────────────────────────────────

/**
 * Builds a rich, catalog-aware list of all structures currently on the map
 * (General Map overlay items + zone-level bed items).
 * Each entry is self-contained — includes canonicalType, allowed actions, and
 * metre coordinates — so the AI can reference them by id without further lookups.
 *
 * @param {object} layout  – gardenLayout snapshot
 * @returns {object[]}
 */
function buildExistingMapStructures(layout = {}) {
    const setup   = layout.setup || {};
    const widthM  = setup.widthM  || 10;
    const heightM = setup.heightM || 10;
    const pxPerM  = estimateBackendPxPerM(widthM, heightM);

    // General Map overlay items
    const fromOverlay = (layout.overlayItems || []).map(item => {
        const canonicalType = resolveCanonicalType(item.name || '');
        const entry         = getCatalogEntry(canonicalType);
        return {
            id:               String(item.id ?? ''),
            name:             (item.name || 'Unknown').trim(),
            canonicalType,
            source:           'general_map',
            isStable:         STABLE_NAMES.has(item.name) || SEMI_STABLE_NAMES.has(item.name),
            canContainPlants: entry?.canContainPlants  ?? false,
            canBeEnhanced:    entry?.canBeEnhanced     ?? false,
            allowedActions:   entry?.allowedActions    ?? ['recommendation_only'],
            xM:               item.x  != null ? +(item.x  / pxPerM).toFixed(2) : null,
            yM:               item.y  != null ? +(item.y  / pxPerM).toFixed(2) : null,
            wM:               item.wM ?? null,
            hM:               item.hM ?? null,
            rotation:         item.rotation || 0,
        };
    });

    // Zone-level raised beds / items
    const fromZones = Object.entries(layout.zoneItems || {}).flatMap(([zoneName, items]) =>
        (items || []).map(item => {
            const canonicalType = resolveCanonicalType(item.name || '');
            const entry         = getCatalogEntry(canonicalType);
            return {
                id:               String(item.id ?? ''),
                name:             (item.name || 'Unknown').trim(),
                canonicalType,
                source:           'zone_item',
                zoneName,
                isStable:         false,
                canContainPlants: entry?.canContainPlants ?? true,  // zone beds can hold plants
                canBeEnhanced:    entry?.canBeEnhanced    ?? true,
                allowedActions:   entry?.allowedActions   ?? ['plant_inside_existing', 'enhance_existing'],
                xM:               item.xM  ?? null,
                yM:               item.yM  ?? null,
                wM:               item.wM  ?? null,
                hM:               item.hM  ?? null,
                rotation:         0,
            };
        })
    );

    return [...fromOverlay, ...fromZones];
}

// ── buildPermacultureContext — main export ─────────────────────────────────────

/**
 * Assembles the complete site context object from all available data sources.
 * This is the only async function; all helpers above are synchronous.
 *
 * @param {object} params
 * @param {string|ObjectId} params.userId
 * @param {object}          params.layout           – gardenLayout snapshot
 * @param {object}          params.userRequirements – raw wizard input
 * @param {object}          params.locationContext  – merged location data
 * @returns { success: boolean, context: object|null, error?: string }
 */
export async function buildPermacultureContext({ userId, layout = {}, userRequirements = {}, locationContext = {} } = {}) {
    try {
        // ── Fetch user profile ─────────────────────────────────────────────────
        let user = null;
        if (userId) {
            try { user = await userModel.findById(userId).lean(); }
            catch (e) { console.error('[buildPermacultureContext] user fetch failed:', e.message); }
        }

        const setup   = layout.setup || {};
        const widthM  = setup.widthM  || 10;
        const heightM = setup.heightM || 10;

        // ── Core analysis ──────────────────────────────────────────────────────
        const elements               = classifyExistingElements(layout);
        const normalizedRequirements = normalizeUserRequirements(userRequirements);
        const constraints            = detectConstraints(layout, userRequirements);
        const opportunities          = detectOpportunities(layout, userRequirements);
        const permZones              = inferPermacultureZones(layout, userRequirements);
        const existingMapStructures  = buildExistingMapStructures(layout);

        // ── Assemble context ───────────────────────────────────────────────────
        const context = {
            generatedAt: new Date().toISOString(),
            schemaVersion: '1.0',

            userProfile: {
                hardinessZone:  user?.zone              || setup.hardinessZone || locationContext.hardinessZone || '7b',
                favoritePlants: user?.favoritePlants    || [],
                location:       user?.location          || '',
                language:       user?.language          || 'en',
            },

            gardenLayout: {
                gardenName:    setup.gardenName   || 'My Garden',
                widthM,
                heightM,
                areaM2:        widthM * heightM,
                cellSizeM:     setup.cellSizeM    || 1,
                hardinessZone: setup.hardinessZone || locationContext.hardinessZone || '7b',
                climate:       setup.climate       || locationContext.climateNotes  || 'Temperate',
                country:       setup.country       || locationContext.country        || '',
                goals:         setup.goals         || [],
                focusAreas:    setup.focusAreas    || [],
                zoneCount:     (layout.zones || []).length,
                zoneNames:     layout.zones || [],
            },

            locationContext: {
                country:       locationContext.country       || setup.country        || '',
                city:          locationContext.city          || '',
                latitude:      locationContext.latitude      ?? null,
                longitude:     locationContext.longitude     ?? null,
                altitude:      locationContext.altitude      ?? null,
                hardinessZone: locationContext.hardinessZone || setup.hardinessZone  || '7b',
                climateNotes:  locationContext.climateNotes  || setup.climate        || '',
            },

            existingElements: {
                stableElements:  elements.stable.map(e => e.name),
                movableElements: elements.movable.map(e => e.name),
                allStructures:   elements.allStructureNames,
                structuresByType: elements.byType,
                plantingZones:   elements.plantsByZone,
                bedsInsideZones: Object.entries(layout.zoneItems || {}).map(([zoneName, items]) => ({
                    zoneName,
                    beds: (items || []).map(it => ({
                        name:      it.name,
                        wM:        it.wM,
                        hM:        it.hM,
                        hasPlants: !!(
                            layout.bedLayouts?.[it.id]?.rows?.length ||
                            layout.bedLayouts?.[it.id]?.blocks?.length
                        ),
                    })),
                })),
                uniquePlants:    elements.allPlants,
                plantCount:      elements.allPlants.length,
                flags: {
                    hasHouse:      elements.hasHouse,
                    hasGreenhouse: elements.hasGreenhouse,
                    hasCompost:    elements.hasCompost,
                    hasPond:       elements.hasPond,
                    hasPath:       elements.hasPath,
                    hasFence:      elements.hasFence,
                    hasRaisedBed:  elements.hasRaisedBed,
                    hasWater:      elements.hasWater,
                },
            },

            siteCharacteristics: {
                constraints:   constraints.map(({ type, severity, message, recommendation }) =>
                    ({ type, severity, message, recommendation })),
                opportunities: opportunities.map(({ type, priority, title, description, effort, returns }) =>
                    ({ type, priority, title, description, effort, returns })),
                inferredPermacultureZones: permZones,
                highestSeverityConstraint: constraints.length
                    ? constraints.sort((a, b) =>
                        ['high','medium','low'].indexOf(a.severity) - ['high','medium','low'].indexOf(b.severity)
                    )[0]?.severity || null
                    : null,
            },

            userRequirements: normalizedRequirements,

            permacultureContext: {
                designPrinciples: [
                    'Observe and interact',
                    'Catch and store energy',
                    'Obtain a yield',
                    'Apply self-regulation and accept feedback',
                    'Use and value renewable resources and services',
                    'Produce no waste',
                    'Design from patterns to details',
                    'Integrate rather than segregate',
                    'Use slow and small solutions',
                    'Use and value diversity',
                    'Use edges and value the marginal',
                    'Creatively use and respond to change',
                ],
                applicablePrinciples: deriveApplicablePrinciples(elements, normalizedRequirements, constraints),
                guildOpportunities:   deriveGuildOpportunities(elements.allPlants, setup),
                waterStrategy:        deriveWaterStrategy(layout, constraints),
                soilStrategy:         deriveSoilStrategy(layout, constraints),
                successionPlanning:   deriveSuccession(setup, elements),
            },

            // ── Catalog-aware structure intelligence ───────────────────────────
            // These three sections teach the AI planner what already exists on
            // the map and what it is permitted to create from the catalog.

            existingMapStructures,

            availableStructureCatalog: getCatalogForAI(),

            structureAvailabilitySummary: {
                hasExistingPond:       existingMapStructures.some(s => s.canonicalType === 'pond'),
                hasCatalogPond:        STRUCTURE_CATALOG.some(s => s.canonicalType === 'pond' && s.canCreateNew),
                hasExistingRaisedBed:  existingMapStructures.some(s => s.canonicalType === 'raised_bed'),
                hasCatalogRaisedBed:   STRUCTURE_CATALOG.some(s => s.canonicalType === 'raised_bed' && s.canCreateNew),
                hasExistingCompost:    existingMapStructures.some(s => s.canonicalType === 'compost'),
                hasCatalogCompost:     STRUCTURE_CATALOG.some(s => s.canonicalType === 'compost' && s.canCreateNew),
                hasExistingGreenhouse: existingMapStructures.some(s => s.canonicalType === 'greenhouse'),
                hasCatalogGreenhouse:  STRUCTURE_CATALOG.some(s => s.canonicalType === 'greenhouse' && s.canCreateNew),
                hasExistingCoop:       existingMapStructures.some(s => s.canonicalType === 'coop'),
                hasCatalogCoop:        STRUCTURE_CATALOG.some(s => s.canonicalType === 'coop' && s.canCreateNew),
            },

            plannerPolicy: {
                preferExistingStructures:          true,
                doNotDuplicateExistingStructures:  true,
                createOnlyFromCatalog:             true,
                enhanceExistingBeforeCreatingNew:  true,
                plantInsideExistingBedsFirst:      true,
                doNotInventUnknownStructureTypes:  true,
            },
        };

        return { success: true, context };
    } catch (err) {
        console.error('[buildPermacultureContext] Unexpected error:', err.message);
        return { success: false, error: err.message, context: null };
    }
}
