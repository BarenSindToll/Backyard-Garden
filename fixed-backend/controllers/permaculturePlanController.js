import PermaculturePlan from '../models/permaculturePlanModel.js';
import gardenLayoutModel from '../models/gardenLayoutModel.js';
import { buildPermacultureContext } from '../services/permacultureContextService.js';
import { generatePermaculturePlanWithAI } from '../services/permacultureAiService.js';
import { resolveCanonicalType, getCatalogEntry, validateProposedElements } from '../utils/structureCatalogUtils.js';

// ── Rule-based mock draft (fallback when AI is unavailable) ──────────────────
// sourceContext is the 4th optional argument — contains existingMapStructures and
// availableStructureCatalog so the mock can make catalog-aware decisions.
function buildMockDraft(layoutSnapshot, userRequirements, locationContext, sourceContext = {}) {
    const setup        = layoutSnapshot.setup        || {};
    const zones        = layoutSnapshot.zones        || [];
    const overlayItems = layoutSnapshot.overlayItems || [];

    const widthM       = setup.widthM  || 10;
    const heightM      = setup.heightM || 10;

    // ── Catalog-aware existing structure lookup ───────────────────────────────
    // Prefer sourceContext.existingMapStructures (rich, with ids and canonicalType)
    // but fall back to overlayItems names when context is not yet available.
    const existingMapStructures = sourceContext.existingMapStructures || [];
    const existingNames = overlayItems.map(it => it.name).filter(Boolean);

    const findExisting = (canonicalType) =>
        existingMapStructures.find(s => s.canonicalType === canonicalType) || null;

    const hasByCanon = (canonicalType) =>
        existingMapStructures.some(s => s.canonicalType === canonicalType) ||
        existingNames.some(n => resolveCanonicalType(n) === canonicalType);

    const hasCompost    = hasByCanon('compost');
    const hasPond       = hasByCanon('pond');
    const hasRaisedBed  = hasByCanon('raised_bed');
    const hasGreenhouse = hasByCanon('greenhouse');
    const hasPath       = hasByCanon('path');
    const hasFence      = hasByCanon('fence');

    const existingPond    = findExisting('pond');
    const existingRaisedBed = findExisting('raised_bed');
    const existingCompost = findExisting('compost');

    // Debug log
    console.log(`[buildMockDraft] existing: pond=${hasPond} raisedBed=${hasRaisedBed} compost=${hasCompost} greenhouse=${hasGreenhouse}`);

    // ── Site analysis ─────────────────────────────────────────────────────────
    const siteAnalysis = {
        existingStructures: existingNames,
        stableElements: zones.filter(Boolean),
        slopeNotes: 'No slope data provided; assumed relatively flat site. Add contour information to refine swale placement.',
        sunExposureNotes: 'South-facing orientation assumed for northern hemisphere. Place tall elements (fruit trees, trellises, greenhouse) on the north side to prevent shading of beds.',
        windNotes: 'Consider a mixed native hedgerow on the prevailing wind boundary. Windbreaks reduce wind speed by 50–80% for a distance of 10× their height.',
        waterFlowNotes: 'Design swales or rain gardens to slow, spread, and sink water. A single well-placed swale can reduce irrigation needs by 30–50%.',
        soilNotes: 'Build soil biology through mulching and composting. Sheet-mulch new beds with cardboard + wood chip before planting perennials.',
        constraints: [
            !hasCompost ? 'No composting system detected — nutrient cycling is incomplete and the garden depends on bought-in inputs.' : null,
            !hasPath    ? 'No defined paths — access routes should be designed to minimise soil compaction near beds.' : null,
            widthM < 5  ? 'Limited width constrains zone depth; prioritise vertical growing (trellises, espalier).' : null,
        ].filter(Boolean),
        opportunities: [
            !hasPond       ? 'A small pond would support beneficial insects, amphibians, and birds — the most productive use of 2–4 m².' : null,
            hasPond        ? 'Existing pond can be enhanced with marginal plantings — water mint, marsh marigold, yellow flag iris.' : null,
            !hasGreenhouse ? 'A greenhouse or polytunnel would extend the growing season by 6–8 weeks each end.' : null,
            !hasFence      ? 'A living fence (hedgerow) doubles as windbreak, wildlife corridor, and food source.' : null,
            hasRaisedBed   ? 'Existing raised beds can be planted with companion guilds — Three Sisters, basil+tomato+marigold.' : null,
            zones.length === 0
                ? 'No planting zones defined yet — ideal opportunity to plan the garden from scratch using permaculture zones.'
                : `${zones.length} zone(s) established — focus on succession and guild planting within them.`,
        ].filter(Boolean),
    };

    // ── Proposed elements ─────────────────────────────────────────────────────
    const proposed = [];

    // Permaculture zone overlays (conceptual — action=recommendation_only on map)
    proposed.push({
        action: 'recommendation_only',
        canonicalType: 'permaculture-zone',
        type: 'permaculture-zone',
        name: 'Zone 0 — Home Hub',
        targetZone: '0',
        x: widthM * 0.40, y: heightM * 0.40,
        width: widthM * 0.20, height: heightM * 0.20,
        rotation: 0, plants: [],
        reason: 'Zone 0 is the house or main living space. All other zones radiate outward from here by frequency of visit and intensity of management.',
        confidence: 1.0, warnings: [],
    });

    proposed.push({
        action: 'recommendation_only',
        canonicalType: 'permaculture-zone',
        type: 'permaculture-zone',
        name: 'Zone 1 — Kitchen Garden',
        targetZone: '1',
        x: widthM * 0.20, y: heightM * 0.20,
        width: widthM * 0.60, height: heightM * 0.60,
        rotation: 0,
        plants: ['Tomato', 'Basil', 'Parsley', 'Lettuce', 'Spinach', 'Chives', 'Mint', 'Climbing Bean'],
        reason: 'Zone 1 is visited daily. Locate annual vegetables, salad greens, culinary herbs, and frequently harvested crops here.',
        confidence: 0.93, warnings: [],
    });

    proposed.push({
        action: 'recommendation_only',
        canonicalType: 'permaculture-zone',
        type: 'permaculture-zone',
        name: 'Zone 2 — Orchard & Perennials',
        targetZone: '2',
        x: widthM * 0.05, y: heightM * 0.05,
        width: widthM * 0.35, height: heightM * 0.35,
        rotation: 0,
        plants: ['Apple', 'Pear', 'Comfrey', 'Yarrow', 'Borage', 'Nasturtium', 'Strawberry'],
        reason: 'Zone 2 is visited weekly. Semi-permanent plantings — fruit trees underplanted with dynamic accumulators and insect attractors.',
        confidence: 0.87,
        warnings: ['Fruit trees require 3–5 years before significant yields. Plan for annual crops in the same space during establishment.'],
    });

    // Raised bed — create new or plant inside existing
    if (!hasRaisedBed) {
        console.log('[buildMockDraft] No raised bed → create_new from catalog');
        proposed.push({
            action: 'create_new',
            catalogKey: 'raised_bed',
            canonicalType: 'raised_bed',
            type: 'structure',
            name: 'Raised Bed — Three Sisters Guild',
            targetZone: '1',
            x: widthM * 0.25, y: heightM * 0.65,
            width: 3.0, height: 1.2,
            rotation: 0,
            plants: ['Corn', 'Squash (Butternut)', 'Climbing Bean'],
            reason: 'The Three Sisters guild is a nitrogen-fixing companion system: corn provides a trellis, beans fix nitrogen, squash leaves shade the soil to retain moisture.',
            confidence: 0.91, warnings: [],
        });
    } else {
        console.log(`[buildMockDraft] Raised bed exists (id=${existingRaisedBed?.id}) → plant_inside_existing`);
        proposed.push({
            action: 'plant_inside_existing',
            targetElementId: existingRaisedBed?.id,
            canonicalType: 'raised_bed',
            enhancementType: 'companion_planting_group',
            type: 'planting-strip',
            name: 'Three Sisters Guild Planting',
            targetZone: '1',
            x: existingRaisedBed?.xM ?? widthM * 0.25,
            y: existingRaisedBed?.yM ?? heightM * 0.65,
            width:  existingRaisedBed?.wM  ?? 3.0,
            height: existingRaisedBed?.hM  ?? 1.2,
            rotation: 0,
            plants: ['Corn', 'Squash (Butternut)', 'Climbing Bean'],
            reason: 'Your existing raised bed is an ideal place for the Three Sisters guild — a nitrogen-fixing companion combination that maximises yield per square metre.',
            confidence: 0.93, warnings: [],
        });
    }

    // Compost — create new or enhance existing
    if (!hasCompost) {
        console.log('[buildMockDraft] No compost → create_new from catalog');
        proposed.push({
            action: 'create_new',
            catalogKey: 'compost',
            canonicalType: 'compost',
            type: 'structure',
            name: 'Three-Bin Compost System',
            targetZone: '1',
            x: widthM * 0.75, y: heightM * 0.08,
            width: 2.0, height: 1.5,
            rotation: 0,
            plants: ['Comfrey'],
            reason: 'A three-bin compost system closes the nutrient loop, eliminating dependence on bought-in fertilisers. Plant comfrey nearby to chop and drop as activator.',
            confidence: 0.98, warnings: [],
        });
    } else {
        console.log(`[buildMockDraft] Compost exists (id=${existingCompost?.id}) → enhance_existing`);
        proposed.push({
            action: 'enhance_existing',
            targetElementId: existingCompost?.id,
            canonicalType: 'compost',
            enhancementType: 'dynamic_accumulator_surround',
            type: 'planting-strip',
            name: 'Compost System Enhancement',
            targetZone: '1',
            x: (existingCompost?.xM ?? widthM * 0.75) - 0.5,
            y: (existingCompost?.yM ?? heightM * 0.08) - 0.5,
            width:  (existingCompost?.wM  ?? 2.0) + 1.0,
            height: (existingCompost?.hM  ?? 1.5) + 1.0,
            rotation: 0,
            plants: ['Comfrey', 'Yarrow', 'Nasturtium'],
            reason: 'Surround the existing compost system with dynamic accumulators (comfrey) and activators to speed decomposition and attract beneficial insects.',
            confidence: 0.90, warnings: [],
        });
    }

    // Pond — create new or enhance existing
    if (!hasPond) {
        console.log('[buildMockDraft] No pond → create_new from catalog');
        proposed.push({
            action: 'create_new',
            catalogKey: 'pond',
            canonicalType: 'pond',
            type: 'water-feature',
            name: 'Wildlife Pond',
            targetZone: '2',
            x: widthM * 0.60, y: heightM * 0.55,
            width: 3.0, height: 3.0,
            rotation: 0,
            plants: ['Watercress', 'Yellow Flag Iris', 'Marsh Marigold', 'Water Mint'],
            reason: 'A pond is one of the highest-yield permaculture interventions per m²: it provides water storage, attracts dragonflies, frogs, and birds that consume pest insects.',
            confidence: 0.80,
            warnings: ['Safety consideration if young children use the garden. A shallow (<30 cm) wildlife pond with sloped edges is safer.'],
        });
    } else {
        console.log(`[buildMockDraft] Pond exists (id=${existingPond?.id}) → enhance_existing`);
        proposed.push({
            action: 'enhance_existing',
            targetElementId: existingPond?.id,
            canonicalType: 'pond',
            enhancementType: 'pond_edge_planting',
            type: 'planting-strip',
            name: 'Pond Edge Biodiversity Planting',
            targetZone: '2',
            x: (existingPond?.xM ?? widthM * 0.60) - 0.5,
            y: (existingPond?.yM ?? heightM * 0.55) - 0.5,
            width:  (existingPond?.wM  ?? 3.0) + 1.0,
            height: (existingPond?.hM  ?? 3.0) + 1.0,
            rotation: 0,
            plants: ['Yellow Flag Iris', 'Marsh Marigold', 'Water Mint', 'Purple Loosestrife'],
            reason: 'Planting the pond margin with native aquatics and marginals increases biodiversity and creates habitat for frogs, dragonflies, and beneficial insects.',
            confidence: 0.92, warnings: [],
        });
    }

    // Windbreak hedgerow (fence/living hedge)
    if (!hasFence) {
        proposed.push({
            action: 'create_new',
            catalogKey: 'fence',
            canonicalType: 'fence',
            type: 'planting-strip',
            name: 'Windbreak Hedgerow',
            targetZone: '3',
            x: 0, y: 0,
            width: widthM, height: 1.5,
            rotation: 0,
            plants: ['Hawthorn', 'Hazel', 'Elderflower', 'Rugosa Rose', 'Blackthorn'],
            reason: 'A mixed native hedgerow on the windward boundary reduces crop stress, creates a wildlife corridor, and yields berries, nuts, and flowers.',
            confidence: 0.88,
            warnings: ['Select species appropriate to local native flora. Check planning regulations — hedgerows over 2 m may require permission.'],
        });
    }

    // Swale — recommendation only (requires on-site contour mapping)
    proposed.push({
        action: 'recommendation_only',
        canonicalType: 'unknown',
        type: 'water-feature',
        name: 'Swale on Contour',
        targetZone: '2',
        x: widthM * 0.10, y: heightM * 0.50,
        width: widthM * 0.80, height: 1.0,
        rotation: 0,
        plants: ['Comfrey', 'Yarrow', 'Willow (basket)'],
        reason: 'A shallow swale dug on contour captures rainwater runoff. Requires on-site contour mapping with an A-frame or laser level for accurate placement.',
        confidence: 0.74,
        warnings: ['Accurate placement requires on-site survey — this position is illustrative only. Not added to map; implement manually after site survey.'],
    });

    // ── Plan narrative ────────────────────────────────────────────────────────
    const zoneWord = zones.length === 1 ? 'zone' : 'zones';
    const itemWord = overlayItems.length === 1 ? 'structure' : 'structures';

    const planNarrative = `## Permaculture Plan Draft

**Site Overview**
Your garden covers ${widthM} m × ${heightM} m with ${zones.length} defined planting ${zoneWord} and ${overlayItems.length} existing ${itemWord}.

**Design Philosophy**
This draft applies the twelve permaculture design principles (Holmgren, 2002): observe and interact; catch and store energy; obtain a yield; apply self-regulation; use renewable resources; produce no waste; design from patterns to details; integrate rather than segregate; use slow and small solutions; use and value diversity; use edges and value the marginal; and creatively respond to change.

**Zone Layout**
The design organises the garden into concentric zones of use intensity radiating from the home:
- **Zone 0**: ${(widthM * 0.20).toFixed(1)} m × ${(heightM * 0.20).toFixed(1)} m — home / hub of activity
- **Zone 1** (intensive): Daily-harvest crops, herbs, salad greens, compost
- **Zone 2** (semi-intensive): Fruit trees, berry bushes, large perennials visited weekly
- **Zone 3+** (extensive): Windbreak, meadow areas, water harvesting

**Key Interventions**
${!hasCompost    ? '1. **Composting**: A three-bin system closes the nutrient loop and reduces external inputs to near zero.\n' : ''}${!hasPond      ? '2. **Wildlife Pond**: The highest-yield permaculture intervention per m² — biodiversity hub providing natural pest control.\n' : ''}${!hasRaisedBed ? '3. **Three Sisters Raised Bed**: A nitrogen-fixing companion guild that feeds the soil while it feeds you.\n' : ''}4. **Windbreak Hedgerow**: Mixed native species on the windward boundary protect crops and support wildlife.
5. **Swale on Contour**: Passive water harvesting that reduces irrigation dependency by an estimated 30–50%.

**Guild Planting**
Surround each fruit tree with a guild: comfrey (dynamic accumulator + mulch plant), yarrow (insect attractor), nasturtium (pest distractor), and a ground cover such as strawberry or thyme. Rotate legumes through the annual beds each season to continually fix nitrogen.

**Next Steps**
Review this draft and accept or reject individual elements. The plan is advisory — your direct observation of the site should always take precedence over a generative model's suggestions. Apply only what you have the capacity to maintain.`.trim();

    // ── Bibliography ──────────────────────────────────────────────────────────
    const bibliography = [
        "Mollison, B. (1988). Permaculture: A Designers' Manual. Tagari Publications.",
        "Holmgren, D. (2002). Permaculture: Principles and Pathways Beyond Sustainability. Holmgren Design Services.",
        "Jacke, D. & Toensmeier, E. (2005). Edible Forest Gardens (Vols 1–2). Chelsea Green Publishing.",
        "Whitefield, P. (2004). The Earth Care Manual. Permanent Publications.",
        "Hemenway, T. (2009). Gaia's Garden: A Guide to Home-Scale Permaculture. Chelsea Green Publishing.",
    ];

    return { siteAnalysis, proposedElements: proposed, planNarrative, bibliography };
}

// ── Controllers ───────────────────────────────────────────────────────────────

// POST /api/permaculture-plans/generate-draft
export const generateDraft = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            userRequirements = {},
            locationContext  = {},
        } = req.body;

        // Load the current layout so we can snapshot it
        const layout = await gardenLayoutModel.findOne({ userId });
        const layoutSnapshot = layout
            ? { zones: layout.zones, setup: layout.setup, overlayItems: layout.overlayItems || [], bedLayouts: layout.bedLayouts || {}, zoneItems: layout.zoneItems || {} }
            : {};

        // Merge location context: prefer request body, fall back to layout setup
        const mergedLocation = {
            country:       locationContext.country       || layout?.setup?.country       || '',
            city:          locationContext.city          || '',
            latitude:      locationContext.latitude      ?? null,
            longitude:     locationContext.longitude     ?? null,
            altitude:      locationContext.altitude      ?? null,
            hardinessZone: locationContext.hardinessZone || layout?.setup?.hardinessZone || '',
            climateNotes:  locationContext.climateNotes  || layout?.setup?.climate       || '',
        };

        // Build rich context object (synchronous analysis — no external calls)
        const { context: sourceContext } = await buildPermacultureContext({
            userId,
            layout:          layoutSnapshot,
            userRequirements,
            locationContext: mergedLocation,
        });

        // ── Try AI, fall back to rule-based mock ─────────────────────────────
        let rawPlan    = null;
        let usedFallback = false;
        let aiSource   = 'ai';

        try {
            rawPlan = await generatePermaculturePlanWithAI(sourceContext || {});
        } catch (err) {
            console.error('[generateDraft] AI generation error:', err.message);
        }

        if (rawPlan) {
            console.log('[generateDraft] using AI plan');
        } else {
            console.log('[generateDraft] AI unavailable, using mock');
            rawPlan      = buildMockDraft(layoutSnapshot, userRequirements, mergedLocation, sourceContext);
            usedFallback = true;
            aiSource     = 'mock';
        }

        // ── Strict post-generation validation ─────────────────────────────────
        // Build lookup sets from the already-computed sourceContext so we can
        // validate every proposed element before it reaches the database or frontend.
        {
            const availableCatalogKeys = new Set(
                (sourceContext?.availableStructureCatalog || [])
                    .map(e => e.catalogKey)
                    .filter(Boolean)
            );
            const existingStructureIds = new Set(
                (sourceContext?.existingMapStructures || [])
                    .map(s => String(s.id))
                    .filter(Boolean)
            );

            const { validated, converted, report } = validateProposedElements(
                rawPlan.proposedElements || [],
                availableCatalogKeys,
                existingStructureIds
            );

            if (converted > 0) {
                console.warn(
                    `[generateDraft] ${converted} element(s) downgraded to recommendation_only:\n` +
                    report.map(r => `  • "${r.name}" (was ${r.originalAction}): ${r.reason}`).join('\n')
                );
            } else {
                console.log('[generateDraft] All proposed elements passed validation.');
            }

            rawPlan = { ...rawPlan, proposedElements: validated };
        }

        // ── Normalise siteAnalysis to model schema ────────────────────────────
        const siteAnalysis = usedFallback
            ? {
                ...rawPlan.siteAnalysis,
                stableElements:       (sourceContext?.existingElements?.stableElements) || [],
                climate:              '',
                waterStrategy:        '',
                soilStrategy:         '',
                accessStrategy:       '',
                biodiversityStrategy: '',
            }
            : {
                existingStructures:   rawPlan.siteAnalysis?.existingStructures  || [],
                stableElements:       (sourceContext?.existingElements?.stableElements) || [],
                slopeNotes:           sourceContext?.siteCharacteristics?.constraints?.find(c => c.type === 'terrain')?.message || '',
                sunExposureNotes:     '',
                windNotes:            sourceContext?.siteCharacteristics?.constraints?.find(c => c.type === 'wind')?.message || '',
                waterFlowNotes:       rawPlan.siteAnalysis?.waterStrategy       || '',
                soilNotes:            rawPlan.siteAnalysis?.soilStrategy         || '',
                constraints:          rawPlan.siteAnalysis?.constraints          || [],
                opportunities:        rawPlan.siteAnalysis?.opportunities        || [],
                climate:              rawPlan.siteAnalysis?.climate              || '',
                waterStrategy:        rawPlan.siteAnalysis?.waterStrategy        || '',
                soilStrategy:         rawPlan.siteAnalysis?.soilStrategy         || '',
                accessStrategy:       rawPlan.siteAnalysis?.accessStrategy       || '',
                biodiversityStrategy: rawPlan.siteAnalysis?.biodiversityStrategy || '',
            };

        const planWarnings = usedFallback
            ? ['AI generation is not active yet. This preview uses a temporary rule-based draft plan.', ...(rawPlan.warnings || [])]
            : (rawPlan.warnings || []);

        const plan = await PermaculturePlan.create({
            userId,
            sourceLayoutSnapshot: layoutSnapshot,
            sourceContext:        sourceContext || {},
            userRequirements: {
                freeText:        userRequirements.freeText        || '',
                goals:           userRequirements.goals           || layout?.setup?.goals      || [],
                focusAreas:      userRequirements.focusAreas      || layout?.setup?.focusAreas || [],
                preferredPlants: userRequirements.preferredPlants || [],
                excludedPlants:  userRequirements.excludedPlants  || [],
            },
            locationContext:         mergedLocation,
            siteAnalysis,
            proposedElements:        rawPlan.proposedElements        || [],
            summary:                 rawPlan.summary                 || '',
            planNarrative:           rawPlan.planNarrative || rawPlan.summary || '',
            plantingRecommendations: rawPlan.plantingRecommendations || [],
            maintenancePlan:         rawPlan.maintenancePlan         || [],
            planWarnings,
            bibliography:            rawPlan.bibliography             || [],
            aiSource,
            status: 'draft',
        });

        res.json({ success: true, plan });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/permaculture-plans
export const getPlans = async (req, res) => {
    try {
        const plans = await PermaculturePlan
            .find({ userId: req.user.id })
            .select('-sourceLayoutSnapshot')  // omit the large snapshot from list view
            .sort({ createdAt: -1 });
        res.json({ success: true, plans });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/permaculture-plans/:id
export const getPlan = async (req, res) => {
    try {
        const plan = await PermaculturePlan.findOne({ _id: req.params.id, userId: req.user.id });
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        res.json({ success: true, plan });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PATCH /api/permaculture-plans/:id/status
export const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['draft', 'applied', 'rejected'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
        }

        const plan = await PermaculturePlan.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { status },
            { new: true }
        );
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        res.json({ success: true, plan });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Apply helpers ─────────────────────────────────────────────────────────────

const STABLE_STRUCTURE_NAMES = new Set([
    'House', 'Shed', 'Fence', 'Tree', 'Well', 'Water Butt', 'Gate', 'Wall',
    'Greenhouse',  // treat as stable if already on map
]);

const ELEMENT_TYPE_COLORS = {
    'permaculture-zone': '#6040a0',
    'structure':         '#8B5E3C',
    'planting-strip':    '#4a7c3f',
    'water-feature':     '#1a70c0',
};

// Approximate base-pixels-per-metre for backend layout storage
// (mirrors GardenCanvas.jsx: basePxPerM = min(availW/widthM, availH/heightM))
function estimatePxPerM(widthM, heightM) {
    return Math.max(4, Math.min(900 / (widthM || 1), 550 / (heightM || 1)));
}

// Describe what changed between current layout and snapshot
function diffLayouts(current, snapshot) {
    const curItems  = (current?.overlayItems  || []).map(i => i.name).sort();
    const snapItems = (snapshot?.overlayItems || []).map(i => i.name).sort();
    const curZones  = (current?.zones  || []).slice().sort();
    const snapZones = (snapshot?.zones || []).slice().sort();

    const addedItems   = curItems.filter(n => !snapItems.includes(n));
    const removedItems = snapItems.filter(n => !curItems.includes(n));
    const addedZones   = curZones.filter(z => !snapZones.includes(z));
    const removedZones = snapZones.filter(z => !curZones.includes(z));

    const changed = addedItems.length + removedItems.length + addedZones.length + removedZones.length > 0;
    const parts = [
        addedItems.length   ? `${addedItems.length} structure(s) added`   : '',
        removedItems.length ? `${removedItems.length} structure(s) removed` : '',
        addedZones.length   ? `${addedZones.length} zone(s) added`         : '',
        removedZones.length ? `${removedZones.length} zone(s) removed`     : '',
    ].filter(Boolean);

    return {
        changed,
        summary: parts.join(', '),
        details: { addedItems, removedItems, addedZones, removedZones },
    };
}

// Resolve stable structure positions from current overlay items (metres)
function resolveStableStructures(overlayItems, pxPerM) {
    return (overlayItems || [])
        .filter(i => STABLE_STRUCTURE_NAMES.has(i.name))
        .map(i => ({
            name: i.name,
            xM:   (i.x || 0) / pxPerM,
            yM:   (i.y || 0) / pxPerM,
            wM:   i.wM || 2,
            hM:   i.hM || 2,
        }));
}

function rectsOverlapM(ax, ay, aw, ah, bx, by, bw, bh, margin = 0.25) {
    if (bx == null || by == null) return false;
    return ax < bx + bw + margin &&
           ax + aw > bx - margin &&
           ay < by + bh + margin &&
           ay + ah > by - margin;
}

// POST /api/permaculture-plans/:id/apply
// Safe-merge: adds proposed elements to the real layout without touching existing data.
// ?force=true skips the "layout changed" guard.
export const applyPlan = async (req, res) => {
    try {
        const force = req.query.force === 'true';

        const plan = await PermaculturePlan.findOne({ _id: req.params.id, userId: req.user.id });
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        if (plan.status === 'rejected') {
            return res.status(400).json({ success: false, message: 'Cannot apply a rejected plan.' });
        }

        // Load current garden layout
        const layout = await gardenLayoutModel.findOne({ userId: req.user.id });
        if (!layout) {
            return res.status(404).json({ success: false, message: 'Garden layout not found. Create a layout first.' });
        }

        // ── Diff guard ────────────────────────────────────────────────────────
        const snapshot    = plan.sourceLayoutSnapshot || {};
        const changeReport = diffLayouts(layout, snapshot);

        if (changeReport.changed && !force) {
            return res.json({
                success:      false,
                requiresForce: true,
                warning:      `Your map changed since this plan was generated (${changeReport.summary}). Apply anyway?`,
                changeReport,
            });
        }

        // ── Coordinate system ─────────────────────────────────────────────────
        const widthM  = layout.setup?.widthM  || 10;
        const heightM = layout.setup?.heightM || 10;
        const pxPerM  = estimatePxPerM(widthM, heightM);
        const stables = resolveStableStructures(layout.overlayItems, pxPerM);

        // Optional per-element selection from the preview checkboxes
        const { selectedElementNames } = req.body || {};
        const selectedSet = Array.isArray(selectedElementNames) && selectedElementNames.length > 0
            ? new Set(selectedElementNames) : null;

        const applied = [];
        const skipped = [];
        const newOverlayItems = [...(layout.overlayItems || [])];

        for (const el of (plan.proposedElements || [])) {
            const elName = el.name || 'Unnamed';
            const action = el.action || 'create_new';

            // Honour the user's checkbox selection from the preview
            if (selectedSet && !selectedSet.has(elName)) {
                skipped.push({ element: elName, reason: 'Not selected for apply.' });
                continue;
            }

            // ── recommendation_only: save as note, never add to map ──────────
            if (action === 'recommendation_only' || el.type === 'permaculture-zone') {
                skipped.push({
                    element: elName,
                    reason:  action === 'recommendation_only'
                        ? 'Recommendation only — see plan notes for details.'
                        : 'Permaculture zone overlay — conceptual only, not added to map.',
                });
                continue;
            }

            // ── enhance_existing / plant_inside_existing: record, don't place ─
            if (action === 'enhance_existing' || action === 'plant_inside_existing') {
                applied.push({
                    element:         elName,
                    action,
                    targetElementId: el.targetElementId || null,
                    canonicalType:   el.canonicalType   || null,
                    plants:          el.plants          || [],
                    reason:          el.reason          || '',
                });
                console.log(`[applyPlan] ${action} "${elName}" targeting id=${el.targetElementId}`);
                continue;
            }

            // ── create_new / add_near_existing: add as new overlay item ─────
            const wM = Math.max(0.5, el.width  || 2);
            const hM = Math.max(0.3, el.height || 2);
            const xM = el.x || 0;
            const yM = el.y || 0;

            // Boundary check
            if (xM < 0 || yM < 0 || xM + wM > widthM || yM + hM > heightM) {
                skipped.push({
                    element: elName,
                    reason:  `Outside garden bounds: (${xM.toFixed(1)}, ${yM.toFixed(1)})→(${(xM + wM).toFixed(1)}, ${(yM + hM).toFixed(1)}) m but garden is ${widthM}×${heightM} m.`,
                });
                continue;
            }

            // Stable-structure overlap check
            const overlapping = stables.find(s => rectsOverlapM(xM, yM, wM, hM, s.xM, s.yM, s.wM, s.hM));
            if (overlapping) {
                skipped.push({
                    element: elName,
                    reason:  `Overlaps the stable structure "${overlapping.name}" — move it manually after applying.`,
                });
                continue;
            }

            // Derive display color — prefer the catalog entry color or fall back to type colors
            const catalogEntry = el.catalogKey ? getCatalogEntry(el.catalogKey) : null;
            const item = {
                id:                 Date.now() + Math.random(),
                name:               elName,
                x:                  Math.round(xM * pxPerM),
                y:                  Math.round(yM * pxPerM),
                wM,
                hM,
                isStructure:        el.type !== 'planting-strip',
                rotation:           Number.isFinite(el.rotation) ? Math.round(el.rotation) : 0,
                iconData:           null,
                color:              ELEMENT_TYPE_COLORS[el.type] || '#8B5E3C',
                generatedBy:        'permaculture-plan',
                planId:             String(plan._id),
                action:             action,
                catalogKey:         el.catalogKey         || null,
                targetElementId:    el.targetElementId    || null,
                createdFromPreview: true,
            };

            newOverlayItems.push(item);
            applied.push({ element: elName, id: item.id, action, type: el.type, catalogKey: el.catalogKey || null });
            console.log(`[applyPlan] ${action} "${elName}" placed at (${xM.toFixed(1)},${yM.toFixed(1)}) m`);
        }

        // ── Persist updated layout ─────────────────────────────────────────
        // Use $set to avoid Mongoose path-marking issues with Mixed arrays
        const updatedLayout = await gardenLayoutModel.findOneAndUpdate(
            { userId: req.user.id },
            { $set: { overlayItems: newOverlayItems } },
            { new: true }
        );

        // ── Mark plan as applied ───────────────────────────────────────────
        plan.status = 'applied';
        await plan.save();

        res.json({
            success: true,
            plan,
            layout: {
                zones:        updatedLayout.zones,
                grids:        updatedLayout.grids,
                setup:        updatedLayout.setup,
                positions:    updatedLayout.positions,
                overlayItems: updatedLayout.overlayItems,
                bedLayouts:   updatedLayout.bedLayouts   || {},
                zoneItems:    updatedLayout.zoneItems    || {},
            },
            applied,
            skipped,
            appliedCount: applied.length,
            skippedCount: skipped.length,
            warning: changeReport.changed ? changeReport.summary : null,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
