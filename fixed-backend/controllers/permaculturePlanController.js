import PermaculturePlan from '../models/permaculturePlanModel.js';
import gardenLayoutModel from '../models/gardenLayoutModel.js';
import { buildPermacultureContext } from '../services/permacultureContextService.js';
import { generatePermaculturePlanWithAI } from '../services/permacultureAiService.js';
import { resolveCanonicalType, getCatalogEntry, validateProposedElements } from '../utils/structureCatalogUtils.js';

// ── Bed-layout generator ──────────────────────────────────────────────────────
// Creates a minimal BedSidebar-compatible bedLayout from a list of plant names.
// Each plant becomes a row, spaced evenly within the bed's dimensions.
function makeBedLayoutFromPlants(plants, bedItem) {
    const bedW = bedItem?.wM || 3;
    const bedH = bedItem?.hM || 1.2;
    const count = Math.min(plants.length, Math.floor(bedH / 0.20));  // max rows that fit
    if (count === 0) return { rows: [], blocks: [], layoutMode: 'rows' };

    const rowH = Math.max(0.15, (bedH - 0.10) / count - 0.05);
    const rows = plants.slice(0, count).map((plantName, idx) => ({
        id:           `gen-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        x:            0.05,
        y:            0.05 + idx * (rowH + 0.05),
        widthM:       Math.max(0.3, bedW - 0.10),
        heightM:      rowH,
        spacingCm:    25,
        rowSpacingCm: 30,
        notes:        'Generated from permaculture plan',
        plant:        { name: plantName },
    }));
    return { rows, blocks: [], layoutMode: 'rows' };
}

// ── Orientation helpers ───────────────────────────────────────────────────────

function getCompassMapping(northDirection = 'top') {
    switch (northDirection) {
        case 'right':  return { top: 'W', right: 'N', bottom: 'E', left: 'S' };
        case 'bottom': return { top: 'S', right: 'W', bottom: 'N', left: 'E' };
        case 'left':   return { top: 'E', right: 'S', bottom: 'W', left: 'N' };
        default:       return { top: 'N', right: 'E', bottom: 'S', left: 'W' };
    }
}

function getEdgeForDirection(compassDir, northDirection = 'top') {
    const m = getCompassMapping(northDirection);
    return Object.keys(m).find(edge => m[edge] === compassDir) || null;
}

function getSunniestEdge(northDirection = 'top', hemisphere = 'northern') {
    return getEdgeForDirection(hemisphere === 'northern' ? 'S' : 'N', northDirection);
}

// Returns a {x, y} fractional position (0–1) biased toward the sunniest edge.
function sunnyBiasPosition(northDirection = 'top') {
    const edge = getSunniestEdge(northDirection);
    switch (edge) {
        case 'bottom': return { xFrac: 0.45, yFrac: 0.65 };
        case 'top':    return { xFrac: 0.45, yFrac: 0.15 };
        case 'right':  return { xFrac: 0.65, yFrac: 0.45 };
        case 'left':   return { xFrac: 0.15, yFrac: 0.45 };
        default:       return { xFrac: 0.45, yFrac: 0.65 };
    }
}

// ── Placement helpers ─────────────────────────────────────────────────────────
// Clamp a proposed element so it stays within garden bounds.
function clampToGarden(xM, yM, wM, hM, widthM, heightM) {
    const x = Math.max(0, Math.min(xM, widthM  - wM));
    const y = Math.max(0, Math.min(yM, heightM - hM));
    return { x, y };
}

// Find the approximate centre of existing house/shed structures in metres.
// Falls back to (widthM/2, heightM/2) if no stable structure is found.
function findAnchorM(existingMapStructures, widthM, heightM) {
    const anchor = existingMapStructures.find(s => s.canonicalType === 'house' || s.canonicalType === 'shed');
    if (anchor?.xM != null && anchor?.yM != null) return { xM: anchor.xM, yM: anchor.yM };
    return { xM: widthM / 2, yM: heightM / 2 };
}

// ── Rule-based mock draft (fallback when AI is unavailable) ──────────────────
// variantType 'A' = food-production focus, 'B' = biodiversity focus.
// sourceContext contains existingMapStructures and availableStructureCatalog.
function buildMockDraft(layoutSnapshot, userRequirements, locationContext, sourceContext = {}, variantType = 'A') {
    const setup        = layoutSnapshot.setup        || {};
    const zones        = layoutSnapshot.zones        || [];
    const overlayItems = layoutSnapshot.overlayItems || [];

    const widthM  = setup.widthM  || 10;
    const heightM = setup.heightM || 10;
    const areaM2  = widthM * heightM;

    const northDirection = setup.northDirection || locationContext?.northDirection || 'top';
    const sunEdge        = getSunniestEdge(northDirection);
    const compassMap     = getCompassMapping(northDirection);
    const sunnyPos       = sunnyBiasPosition(northDirection);

    // ── Catalog-aware existing structure lookup ───────────────────────────────
    const existingMapStructures = sourceContext.existingMapStructures || [];
    const existingNames = overlayItems.map(it => it.name).filter(Boolean);

    const findExisting = (canon) => existingMapStructures.find(s => s.canonicalType === canon) || null;
    const allOfCanon  = (canon) => existingMapStructures.filter(s => s.canonicalType === canon);

    const hasByCanon = (canon) =>
        existingMapStructures.some(s => s.canonicalType === canon) ||
        existingNames.some(n => resolveCanonicalType(n) === canon);

    // Generation-request constraints — what the user allows to be added
    const genReq  = sourceContext.generationRequest || {};
    const allowed = genReq.allowedAdditions || {};
    const canAddRaisedBed  = allowed.raisedBeds  !== false;
    const canAddGreenhouse = allowed.greenhouse  === true;
    const canAddPond       = allowed.pond        === true;
    const canAddCompost    = allowed.compost     !== false;
    const canAddPaths      = allowed.paths       !== false;
    const canAddGuilds     = allowed.guilds      !== false;

    const hasCompost    = hasByCanon('compost');
    const hasPond       = hasByCanon('pond');
    const hasRaisedBed  = hasByCanon('raised_bed');
    const hasGreenhouse = hasByCanon('greenhouse');
    const hasPath       = hasByCanon('path');
    const hasFence      = hasByCanon('fence');
    const hasCoop       = hasByCanon('coop');

    const existingPond       = findExisting('pond');
    const existingCompost    = findExisting('compost');
    const existingGreenhouse = findExisting('greenhouse');
    const existingBeds       = allOfCanon('raised_bed');
    const existingRaisedBed  = existingBeds[0] || null;

    // Anchor point — used to position kitchen/food elements close to house
    const anchor = findAnchorM(existingMapStructures, widthM, heightM);

    console.log(`[buildMockDraft] variant=${variantType} area=${areaM2}m² pond=${hasPond} beds=${existingBeds.length} compost=${hasCompost} greenhouse=${hasGreenhouse}`);

    // ── Site analysis ─────────────────────────────────────────────────────────
    const isVariantB = variantType === 'B';
    const saved = sourceContext.savedSiteAnalysis || null;

    // Pull richer context from the saved site analysis form if available
    const slopeNote = saved?.topography?.slopeType
        ? `Terrain is ${saved.topography.slopeType}${saved.topography.slopeDirection ? `, facing ${saved.topography.slopeDirection}` : ''}. ${saved.topography.drainageNotes || ''}`.trim()
        : 'No slope data provided; assumed relatively flat site. Add contour information to refine swale placement.';
    const soilNote = saved?.soil?.soilType
        ? `Soil type: ${saved.soil.soilType}. pH: ${saved.soil.soilPH || 'unknown'}. Drainage: ${saved.soil.soilDrainage || 'unknown'}. Fertility: ${saved.soil.soilFertility || 'unknown'}. ${saved.soil.notes || ''}`.trim()
        : 'Build soil biology through mulching and composting. Sheet-mulch new beds with cardboard + 15 cm wood chip before planting perennials.';
    const windNote = saved?.sectors?.dominantWind
        ? `Dominant wind from ${saved.sectors.dominantWind}. ${saved.sectors.notes || ''} A mixed native hedgerow on the windward boundary reduces wind speed by 50–80% for a downwind distance of 10× its height.`.trim()
        : 'A mixed native hedgerow on the windward boundary reduces wind speed by 50–80% for a downwind distance of 10× its height.';
    const waterNote = saved?.topography?.waterSources?.length
        ? `Water sources: ${saved.topography.waterSources.join(', ')}. ${saved.topography.rainwaterHarvesting ? 'Rainwater harvesting system in place.' : 'No rainwater harvesting installed.'} ${saved.topography.drainageNotes || ''}`.trim()
        : 'Design swales or rain gardens to slow, spread, and sink water. A single contour swale can reduce irrigation needs by 30–50%.';

    const siteAnalysis = {
        existingStructures: existingNames,
        stableElements: zones.filter(Boolean),
        slopeNotes: slopeNote,
        sunExposureNotes: `North is set to the ${northDirection} of the map. The ${sunEdge}-facing side (compass ${compassMap[sunEdge]}) receives the most sun in the northern hemisphere — food beds are positioned toward this side. Keep tall elements (trees, trellises) away from the ${sunEdge} side to avoid shading productive areas.`,
        windNotes: windNote,
        waterFlowNotes: waterNote,
        soilNotes: soilNote,
        constraints: [
            !hasCompost ? 'No composting system detected — nutrient cycling is incomplete and the garden depends on bought-in inputs.' : null,
            !hasPath    ? 'No defined access paths — design paths to all productive areas to prevent soil compaction in beds.' : null,
            widthM < 5  ? 'Limited width constrains zone depth; prioritise vertical growing (trellises, espalier).' : null,
            saved?.constraints?.localRules     ? `Local rules: ${saved.constraints.localRules}` : null,
            saved?.constraints?.irrigationLimits ? `Irrigation limits: ${saved.constraints.irrigationLimits}` : null,
            saved?.constraints?.pests          ? `Known pests/diseases: ${saved.constraints.pests}` : null,
            saved?.goals?.childrenPets         ? 'Avoid toxic plants — children or pets present on site.' : null,
        ].filter(Boolean),
        opportunities: [
            !hasPond       ? 'A wildlife pond is the single highest-yield permaculture feature per m² — supports frogs, dragonflies, and birds that provide natural pest control.' : null,
            hasPond        ? 'Existing pond can be enhanced with marginal plantings — water mint, marsh marigold, yellow flag iris.' : null,
            !hasGreenhouse && areaM2 > 50 ? 'A greenhouse or polytunnel extends the growing season by 6–8 weeks at each end.' : null,
            !hasFence      ? 'A living hedge doubles as windbreak, wildlife corridor, and productive food source.' : null,
            existingBeds.length > 0 ? `${existingBeds.length} existing raised bed(s) can be planted with companion guilds for maximum yield.` : null,
            hasGreenhouse  ? 'Existing greenhouse should be planned with heat-loving crops (tomatoes, peppers, cucumbers).' : null,
            hasCoop        ? 'Existing animal area can integrate rotational grazing and direct composting from chicken manure.' : null,
        ].filter(Boolean),
    };

    // ── Proposed elements ─────────────────────────────────────────────────────
    const proposed = [];

    // Zone overlays are conceptual guidance only — not rendered on the map
    proposed.push({
        action: 'recommendation_only',
        canonicalType: 'permaculture-zone', type: 'permaculture-zone',
        name: 'Zone 0 — Home Hub', targetZone: '0',
        x: Math.max(0, anchor.xM - widthM * 0.10), y: Math.max(0, anchor.yM - heightM * 0.10),
        width: widthM * 0.20, height: heightM * 0.20,
        rotation: 0, plants: [],
        reason: 'Zone 0 is the house or main living space. All other zones radiate outward from here by frequency of visit and intensity of management.',
        confidence: 1.0, warnings: [],
    });

    // ──────────────────────────────────────────────────────────────────────────
    // VARIANT A — Food Production
    // Emphasis: raised beds, vegetables, herbs, access paths, compost
    // ──────────────────────────────────────────────────────────────────────────
    if (!isVariantB) {
        // Raised beds: fill existing or create new (up to 2 for larger gardens)
        if (existingBeds.length > 0) {
            existingBeds.slice(0, 2).forEach((bed, idx) => {
                const plantSets = [
                    ['Tomato', 'Basil', 'Marigold', 'Parsley'],
                    ['Lettuce', 'Spinach', 'Radish', 'Chives'],
                ];
                const plants = plantSets[idx % 2];
                console.log(`[buildMockDraft] Variant A: bed exists (id=${bed.id}) → plant_inside_existing`);
                proposed.push({
                    action: 'plant_inside_existing',
                    targetElementId: bed.id,
                    canonicalType: 'raised_bed',
                    enhancementType: 'companion_planting_group',
                    type: 'planting-strip',
                    name: idx === 0 ? 'Tomato & Herb Companions' : 'Salad & Leaf Mix',
                    targetZone: '1',
                    x: bed.xM ?? anchor.xM * 0.5, y: bed.yM ?? heightM * 0.55,
                    width: bed.wM ?? 3.0, height: bed.hM ?? 1.2,
                    rotation: 0, plants,
                    reason: idx === 0
                        ? 'Tomato + basil + marigold is a classic companion trio: marigold deters aphids and whitefly, basil improves tomato flavour and repels pests.'
                        : 'A succession salad bed with cut-and-come-again varieties provides continuous harvest over 4–6 months.',
                    confidence: 0.93, warnings: [],
                    bedLayoutSuggestion: makeBedLayoutFromPlants(plants, bed),
                });
            });
        } else if (canAddRaisedBed) {
            // No raised beds — create one (or two for larger gardens), biased toward the sunniest edge.
            const bedX = Math.max(1, Math.min(widthM * sunnyPos.xFrac, widthM - 4));
            const bedY = Math.max(1, Math.min(heightM * sunnyPos.yFrac, heightM - 2.5));
            const pos1 = clampToGarden(bedX, bedY, 3.0, 1.2, widthM, heightM);
            console.log('[buildMockDraft] Variant A: no raised bed → create_new');
            proposed.push({
                action: 'create_new', catalogKey: 'raised_bed', canonicalType: 'raised_bed',
                type: 'structure', name: 'Tomato & Herb Bed', targetZone: '1',
                x: pos1.x, y: pos1.y, width: 3.0, height: 1.2, rotation: 0,
                plants: ['Tomato', 'Basil', 'Marigold', 'Parsley'],
                reason: `Placed toward the ${sunEdge}-facing side of the garden for maximum sun exposure. Tomato + basil + marigold guild maximises space and deters pests.`,
                confidence: 0.92, warnings: [],
                bedLayoutSuggestion: makeBedLayoutFromPlants(['Tomato', 'Basil', 'Marigold', 'Parsley'], { wM: 3.0, hM: 1.2 }),
            });

            if (areaM2 > 80) {
                // Second raised bed offset from the first
                const pos2 = clampToGarden(pos1.x, Math.min(pos1.y + 2.5, heightM - 2.5), 3.0, 1.2, widthM, heightM);
                proposed.push({
                    action: 'create_new', catalogKey: 'raised_bed', canonicalType: 'raised_bed',
                    type: 'structure', name: 'Salad & Leaf Bed', targetZone: '1',
                    x: pos2.x, y: pos2.y, width: 3.0, height: 1.2, rotation: 0,
                    plants: ['Lettuce', 'Spinach', 'Radish', 'Chives'],
                    reason: `A second bed toward the sunniest (${sunEdge}) side for cut-and-come-again salads — continuous supply from spring through autumn with minimal effort.`,
                    confidence: 0.89, warnings: [],
                    bedLayoutSuggestion: makeBedLayoutFromPlants(['Lettuce', 'Spinach', 'Radish', 'Chives'], { wM: 3.0, hM: 1.2 }),
                });
            }
        }

        // Greenhouse — suggest internal planting if exists, or create new if large garden
        if (existingGreenhouse) {
            const gh = existingGreenhouse;
            console.log(`[buildMockDraft] Variant A: greenhouse exists (id=${gh.id}) → plant_inside_existing`);
            proposed.push({
                action: 'plant_inside_existing', targetElementId: gh.id,
                canonicalType: 'greenhouse', enhancementType: 'greenhouse_heat_lovers',
                type: 'planting-strip', name: 'Greenhouse Heat-Lovers', targetZone: '1',
                x: gh.xM ?? widthM * 0.5, y: gh.yM ?? heightM * 0.4,
                width: gh.wM ?? 5.0, height: gh.hM ?? 4.0, rotation: 0,
                plants: ['Tomato (Greenhouse)', 'Pepper', 'Cucumber', 'Aubergine'],
                reason: 'Heat-loving crops (tomatoes, peppers, cucumbers) thrive in the protected environment of an existing greenhouse, extending the season by 8–10 weeks.',
                confidence: 0.94, warnings: [],
                bedLayoutSuggestion: makeBedLayoutFromPlants(['Tomato (Greenhouse)', 'Pepper', 'Cucumber'], gh),
            });
        } else if (areaM2 > 120 && canAddGreenhouse) {
            const ghPos = clampToGarden(widthM * sunnyPos.xFrac, heightM * sunnyPos.yFrac, 5.0, 4.0, widthM, heightM);
            proposed.push({
                action: 'create_new', catalogKey: 'greenhouse', canonicalType: 'greenhouse',
                type: 'structure', name: 'Productive Greenhouse', targetZone: '1',
                x: ghPos.x, y: ghPos.y, width: 5.0, height: 4.0, rotation: 0,
                plants: ['Tomato (Greenhouse)', 'Pepper', 'Cucumber'],
                reason: `Placed toward the ${sunEdge}-facing (sunniest) side of the garden. A greenhouse here extends the productive season significantly and allows heat-loving crops that cannot succeed outdoors.`,
                confidence: 0.78,
                warnings: [`Requires adequate water supply. Orient the long axis toward the sunniest (${sunEdge}) side for maximum light. Secure planning permission if required.`],
            });
        }

        // Compost — close to raised beds for easy access
        if (!hasCompost && canAddCompost) {
            const cPos = clampToGarden(Math.min(widthM - 3, anchor.xM + 3), Math.max(0, anchor.yM - 3), 2.0, 1.5, widthM, heightM);
            proposed.push({
                action: 'create_new', catalogKey: 'compost', canonicalType: 'compost',
                type: 'structure', name: 'Three-Bin Compost System', targetZone: '1',
                x: cPos.x, y: cPos.y, width: 2.0, height: 1.5, rotation: 0,
                plants: ['Comfrey'],
                reason: 'A three-bin compost system near the kitchen beds allows easy transfer of scraps and quick retrieval of finished compost. Comfrey planted alongside acts as a free activator.',
                confidence: 0.97, warnings: [],
            });
        } else {
            proposed.push({
                action: 'enhance_existing', targetElementId: existingCompost?.id,
                canonicalType: 'compost', enhancementType: 'activator_plants',
                type: 'planting-strip', name: 'Compost Activator Planting',
                targetZone: '1',
                x: Math.max(0, (existingCompost?.xM ?? widthM * 0.75) - 0.5),
                y: Math.max(0, (existingCompost?.yM ?? heightM * 0.08) - 0.5),
                width: (existingCompost?.wM ?? 2.0) + 1.0, height: (existingCompost?.hM ?? 1.5) + 1.0,
                rotation: 0, plants: ['Comfrey', 'Yarrow'],
                reason: 'Planting comfrey and yarrow beside the existing compost system provides a free source of nitrogen-rich activator material — simply chop and drop into the heap.',
                confidence: 0.90, warnings: [],
            });
        }

        // Access path connecting raised beds to house (Variant A specific)
        if (!hasPath && canAddPaths) {
            const pathPos = clampToGarden(Math.max(0, anchor.xM - 0.5), Math.max(0, anchor.yM + 0.5), 8.0, 1.0, widthM, heightM);
            proposed.push({
                action: 'create_new', catalogKey: 'path', canonicalType: 'path',
                type: 'structure', name: 'Kitchen Garden Access Path', targetZone: '1',
                x: pathPos.x, y: pathPos.y, width: 8.0, height: 1.0, rotation: 0, plants: [],
                reason: 'A defined path from the house to the kitchen beds prevents soil compaction and makes daily harvesting and watering easy in all weather.',
                confidence: 0.88, warnings: [],
            });
        }

        // Pollinator strip alongside beds (small, practical, Variant A compatible)
        const polPos = clampToGarden(Math.max(0, anchor.xM - 5), Math.max(0, anchor.yM + 1), widthM * 0.25, 1.0, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'fence', canonicalType: 'fence',
            type: 'planting-strip', name: 'Herb & Pollinator Border', targetZone: '1',
            x: polPos.x, y: polPos.y, width: widthM * 0.25, height: 1.0, rotation: 0,
            plants: ['Borage', 'Marigold', 'Nasturtium', 'Chives', 'Lavender'],
            reason: 'A companion flower border alongside vegetable beds attracts pollinators and beneficial predators, reducing pest pressure by 20–40% compared to monoculture blocks.',
            confidence: 0.87, warnings: [],
        });

    // ──────────────────────────────────────────────────────────────────────────
    // VARIANT B — Biodiversity / Low Maintenance
    // Emphasis: wildlife pond, native planting, perennial guilds, hedgerow, low effort
    // ──────────────────────────────────────────────────────────────────────────
    } else {
        // Wildlife pond — top priority for Variant B
        if (!hasPond && canAddPond) {
            const pondPos = clampToGarden(widthM * 0.62, heightM * 0.58, 4.0, 4.0, widthM, heightM);
            console.log('[buildMockDraft] Variant B: no pond → create_new');
            proposed.push({
                action: 'create_new', catalogKey: 'pond', canonicalType: 'pond',
                type: 'water-feature', name: 'Wildlife Pond', targetZone: '2',
                x: pondPos.x, y: pondPos.y, width: 4.0, height: 4.0, rotation: 0,
                plants: ['Yellow Flag Iris', 'Marsh Marigold', 'Water Mint', 'Watercress', 'Frogbit'],
                reason: 'A wildlife pond is the single most productive biodiversity investment per m². Even a 4 m² pond supports frogs, dragonflies, water beetles, and visiting birds within one season.',
                confidence: 0.92,
                warnings: ['Slope edges gently (<30 cm depth at margins) so amphibians can enter and exit safely. Keep away from overhanging deciduous trees to reduce leaf fall.'],
            });
        } else {
            const pondEdgePos = {
                x: Math.max(0, (existingPond?.xM ?? widthM * 0.60) - 1.0),
                y: Math.max(0, (existingPond?.yM ?? heightM * 0.55) - 1.0),
                width:  (existingPond?.wM ?? 4.0) + 2.0,
                height: (existingPond?.hM ?? 4.0) + 2.0,
            };
            const cp = clampToGarden(pondEdgePos.x, pondEdgePos.y, pondEdgePos.width, pondEdgePos.height, widthM, heightM);
            proposed.push({
                action: 'enhance_existing', targetElementId: existingPond?.id,
                canonicalType: 'pond', enhancementType: 'wildlife_margin',
                type: 'planting-strip', name: 'Wildlife Pond Margin Planting', targetZone: '2',
                x: cp.x, y: cp.y, width: pondEdgePos.width, height: pondEdgePos.height, rotation: 0,
                plants: ['Yellow Flag Iris', 'Marsh Marigold', 'Purple Loosestrife', 'Water Mint', 'Ragged Robin'],
                reason: 'Planting a 1 m wide marginal zone around the existing pond with native wetland plants creates habitat for breeding frogs, dragonfly larvae, and water beetles.',
                confidence: 0.94, warnings: [],
            });
        }

        // Native wildflower meadow strip — low maintenance, high wildlife value
        const meadowPos = clampToGarden(widthM * 0.05, heightM * 0.30, widthM * 0.35, 3.0, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'fence', canonicalType: 'fence',
            type: 'planting-strip', name: 'Native Wildflower Meadow Strip', targetZone: '3',
            x: meadowPos.x, y: meadowPos.y, width: widthM * 0.35, height: 3.0, rotation: 0,
            plants: ['Oxeye Daisy', 'Red Clover', 'Cornflower', 'Field Poppy', 'Yarrow', 'Knapweed'],
            reason: 'A native meadow strip requires mowing only once or twice a year (late summer), supports 30+ pollinator species, and improves soil structure through diverse root systems.',
            confidence: 0.91, warnings: ['Cut in late August/September after seeds set. Leave some stems standing through winter for invertebrate shelter.'],
        });

        // Fruit tree guild (perennial, low effort once established)
        if (canAddGuilds) {
            const guildPos = clampToGarden(widthM * 0.55, heightM * 0.20, 6.0, 6.0, widthM, heightM);
            proposed.push({
            action: 'recommendation_only', canonicalType: 'unknown',
            type: 'planting-strip', name: 'Apple Guild — Perennial Layer', targetZone: '2',
            x: guildPos.x, y: guildPos.y, width: 6.0, height: 6.0, rotation: 0,
            plants: ['Apple (M106 rootstock)', 'Comfrey', 'Yarrow', 'Nasturtium', 'Clover', 'Strawberry'],
            reason: 'A permaculture fruit tree guild combines a central apple with dynamic accumulators (comfrey), insect attractors (yarrow), pest deterrents (nasturtium), and living mulch (clover, strawberry). After establishment, this system is largely self-maintaining.',
            confidence: 0.88,
            warnings: ['This is a design recommendation requiring manual implementation. Choose a disease-resistant apple variety appropriate to your hardiness zone.'],
            });
        }

        // Existing raised beds — suggest perennial herbs/edibles for Variant B
        if (existingBeds.length > 0) {
            const bed = existingBeds[0];
            const herbs = ['Comfrey', 'Yarrow', 'Chives', 'Mint (contained)', 'Sorrel', 'Lovage'];
            proposed.push({
                action: 'plant_inside_existing', targetElementId: bed.id,
                canonicalType: 'raised_bed', enhancementType: 'perennial_herb_guild',
                type: 'planting-strip', name: 'Perennial Herb & Dynamic Accumulator Guild',
                targetZone: '1',
                x: bed.xM ?? anchor.xM * 0.5, y: bed.yM ?? heightM * 0.55,
                width: bed.wM ?? 3.0, height: bed.hM ?? 1.2, rotation: 0,
                plants: herbs,
                reason: 'Converting one raised bed to perennial herbs and dynamic accumulators reduces annual workload, builds soil fertility, and provides year-round harvests of culinary and medicinal herbs.',
                confidence: 0.89, warnings: ['Contain mint in a buried pot or separate section to prevent it from taking over.'],
                bedLayoutSuggestion: makeBedLayoutFromPlants(herbs, bed),
            });
        }

        // Compost — enhance or create
        if (!hasCompost && canAddCompost) {
            const cPos = clampToGarden(widthM * 0.82, heightM * 0.68, 2.0, 2.0, widthM, heightM);
            proposed.push({
                action: 'create_new', catalogKey: 'compost', canonicalType: 'compost',
                type: 'structure', name: 'Biodiversity Compost Hub', targetZone: '2',
                x: cPos.x, y: cPos.y, width: 2.0, height: 2.0, rotation: 0,
                plants: ['Comfrey'],
                reason: 'A compost system in the quieter zone 2 area creates a nutrient hub, supports invertebrates, and provides habitat for hedgehogs and beetles under the heap.',
                confidence: 0.95, warnings: [],
            });
        } else {
            proposed.push({
                action: 'enhance_existing', targetElementId: existingCompost?.id,
                canonicalType: 'compost', enhancementType: 'wildlife_surround',
                type: 'planting-strip', name: 'Compost Biodiversity Buffer', targetZone: '2',
                x: Math.max(0, (existingCompost?.xM ?? widthM * 0.75) - 1.0),
                y: Math.max(0, (existingCompost?.yM ?? heightM * 0.08) - 1.0),
                width: (existingCompost?.wM ?? 2.0) + 2.0, height: (existingCompost?.hM ?? 2.0) + 2.0,
                rotation: 0, plants: ['Comfrey', 'Teasel', 'Borage', 'Red Clover'],
                reason: 'A buffer of comfrey, teasel, and borage around the compost system creates a mini-ecosystem hub: teasel provides winter finch food, borage attracts bumblebees, comfrey activates the heap.',
                confidence: 0.90, warnings: [],
            });
        }

        // Native hedgerow (Variant B priority — wildlife corridor, placed on north/shadiest edge)
        if (!hasFence) {
            // northDirection is exactly the canvas edge where North is, so it is the shadiest side
            const shadeEdge = northDirection;
            const hedgePos = shadeEdge === 'bottom'
                ? { x: 0, y: heightM - 2.0, width: widthM, height: 2.0 }
                : shadeEdge === 'right'
                    ? { x: widthM - 2.0, y: 0, width: 2.0, height: heightM }
                    : shadeEdge === 'left'
                        ? { x: 0, y: 0, width: 2.0, height: heightM }
                        : { x: 0, y: 0, width: widthM, height: 2.0 };
            proposed.push({
                action: 'create_new', catalogKey: 'fence', canonicalType: 'fence',
                type: 'planting-strip', name: 'Native Wildlife Hedgerow', targetZone: '3',
                x: hedgePos.x, y: hedgePos.y, width: hedgePos.width, height: hedgePos.height, rotation: 0,
                plants: ['Hawthorn', 'Blackthorn', 'Hazel', 'Dog Rose', 'Elderflower', 'Spindle'],
                reason: `Placed along the ${shadeEdge} (north-facing/shadier) boundary. A mixed native hedgerow acts as windbreak and wildlife corridor without shading the garden's sunniest (${sunEdge}) side. Supports 600+ invertebrate species.`,
                confidence: 0.93,
                warnings: ['Choose native provenance species. Trim only in late winter (Feb–March) to protect nesting birds. Minimum 2 m wide for full wildlife benefit.'],
            });
        }
    }

    // ── Swale — recommendation only for both variants ─────────────────────────
    proposed.push({
        action: 'recommendation_only', canonicalType: 'unknown', type: 'water-feature',
        name: 'Swale on Contour', targetZone: '2',
        x: widthM * 0.10, y: heightM * 0.50, width: widthM * 0.80, height: 1.0,
        rotation: 0, plants: ['Comfrey', 'Yarrow', 'Willow (basket)'],
        reason: 'A shallow swale dug precisely on contour captures rainwater runoff and allows it to infiltrate slowly. This reduces irrigation dependency by 30–50%. Accurate placement requires on-site surveying.',
        confidence: 0.74,
        warnings: ['Placement requires on-site contour mapping with an A-frame or laser level — this position is illustrative only. Implement manually after surveying.'],
    });

    // ── Plan narrative ────────────────────────────────────────────────────────
    const variantLabel = isVariantB ? 'Biodiversity & Resilience' : 'Food Production';
    const zoneWord     = zones.length === 1 ? 'zone' : 'zones';
    const itemWord     = overlayItems.length === 1 ? 'structure' : 'structures';
    const bedCount     = existingBeds.length;

    const planNarrative = `## Permaculture Plan — Variant ${variantType}: ${variantLabel}

**Site Overview**
Your garden covers ${widthM} m × ${heightM} m (${areaM2} m²) with ${zones.length} defined planting ${zoneWord} and ${overlayItems.length} existing ${itemWord}${bedCount > 0 ? ` including ${bedCount} raised bed(s)` : ''}. North is set to the **${northDirection}** of the map; the sunniest side is the **${sunEdge}** edge.

**Variant Focus**
${isVariantB
    ? 'This plan prioritises biodiversity, wildlife habitat, and long-term resilience. Elements are chosen for perennial yields, low annual maintenance, and ecological function. A wildlife pond is the centrepiece — statistically the highest-yield permaculture intervention per square metre.'
    : `This plan prioritises immediate food production: raised beds, kitchen herbs, and access paths for daily harvest. Food beds are positioned toward the ${sunEdge}-facing (sunniest) side of the garden. Every element is chosen for practical daily-use functionality and rapid yield.`}

**Design Principles Applied**
This draft applies key Holmgren (2002) permaculture principles: observe and interact; catch and store energy; obtain a yield; use and value diversity; integrate rather than segregate; use edges and value the marginal.

**Existing Structures**
${existingNames.length > 0
    ? `Detected on map: ${existingNames.join(', ')}. These have been used as the foundation for this plan — new elements work with, not against, existing investments.`
    : 'No structures detected on the map. All proposed elements are new placements.'}

${saved ? `**Site Analysis Inputs**
${saved.goals?.mainGoal ? `Primary goal: ${saved.goals.mainGoal}.` : ''}${saved.goals?.maintenanceTime ? ` Available maintenance time: ${saved.goals.maintenanceTime}.` : ''}${saved.goals?.experienceLevel ? ` Experience level: ${saved.goals.experienceLevel}.` : ''}
${saved.soil?.soilType ? `Soil: ${saved.soil.soilType}` : ''}${saved.soil?.soilDrainage ? `, drainage: ${saved.soil.soilDrainage}` : ''}${saved.topography?.slopeType ? `. Terrain: ${saved.topography.slopeType}` : ''}.
${saved.goals?.preferredPlants ? `Plants you want to include: ${saved.goals.preferredPlants}.` : ''}${saved.goals?.avoidedPlants ? ` Plants to avoid: ${saved.goals.avoidedPlants}.` : ''}
` : ''}**Next Steps**
Review and select individual elements before applying. The plan is advisory — your direct observation of the site should always take precedence. Apply only what you have the capacity to implement and maintain this season.`.trim();

    // ── Bibliography ──────────────────────────────────────────────────────────
    const bibliography = [
        "Mollison, B. (1988). Permaculture: A Designers' Manual. Tagari Publications.",
        "Holmgren, D. (2002). Permaculture: Principles and Pathways Beyond Sustainability. Holmgren Design Services.",
        "Jacke, D. & Toensmeier, E. (2005). Edible Forest Gardens (Vols 1–2). Chelsea Green Publishing.",
        "Whitefield, P. (2004). The Earth Care Manual. Permanent Publications.",
        "Hemenway, T. (2009). Gaia's Garden: A Guide to Home-Scale Permaculture. Chelsea Green Publishing.",
    ];

    return {
        siteAnalysis,
        proposedElements: proposed,
        planNarrative,
        bibliography,
        variantType,
        summary: `Variant ${variantType}: ${variantLabel} — ${proposed.filter(p => p.action !== 'recommendation_only').length} actionable elements proposed based on your existing garden layout.`,
    };
}

// ── Controllers ───────────────────────────────────────────────────────────────

// POST /api/permaculture-plans/generate-draft
export const generateDraft = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            generationRequest = {},           // new — generation intent from the wizard
            variantType       = 'A',          // 'A' = food production, 'B' = biodiversity
        } = req.body;

        // Load the current layout so we can snapshot it
        const layout = await gardenLayoutModel.findOne({ userId });
        const layoutSnapshot = layout
            ? { zones: layout.zones, setup: layout.setup, overlayItems: layout.overlayItems || [], bedLayouts: layout.bedLayouts || {}, zoneItems: layout.zoneItems || {} }
            : {};

        // All location / site data comes from saved layout — never from the request body
        const savedSiteAnalysis = layout?.siteAnalysis || null;
        const mergedLocation = {
            country:        layout?.setup?.country        || '',
            city:           '',
            latitude:       null,
            longitude:      null,
            altitude:       savedSiteAnalysis?.climate?.altitude
                                ? parseFloat(savedSiteAnalysis.climate.altitude) || null
                                : null,
            hardinessZone:  savedSiteAnalysis?.climate?.climateZone || layout?.setup?.hardinessZone || '',
            climateNotes:   layout?.setup?.climate || '',
            northDirection: savedSiteAnalysis?.sectors?.northDirection || layout?.setup?.northDirection || 'top',
        };

        // Map generationRequest into userRequirements for buildPermacultureContext
        const plantPrefs     = generationRequest.plantPreferences || {};
        const userRequirements = {
            freeText: [
                generationRequest.taskType    ? `Task: ${generationRequest.taskType}`           : '',
                generationRequest.changeLevel ? `Change level: ${generationRequest.changeLevel}` : '',
                generationRequest.notes       || '',
            ].filter(Boolean).join('. '),
            goals:           [generationRequest.designFocus].filter(Boolean),
            focusAreas:      [generationRequest.taskType].filter(Boolean),
            preferredPlants: plantPrefs.prioritizePlants || [],
            excludedPlants:  plantPrefs.avoidPlants      || [],
        };

        // Build rich context object (synchronous analysis — no external calls)
        const { context: sourceContext } = await buildPermacultureContext({
            userId,
            layout:          layoutSnapshot,
            userRequirements,
            locationContext: mergedLocation,
        });

        // Attach saved site analysis and generation request so downstream generators can use them
        if (savedSiteAnalysis) sourceContext.savedSiteAnalysis = savedSiteAnalysis;
        sourceContext.generationRequest = generationRequest;

        // ── Try AI, fall back to rule-based mock ─────────────────────────────
        // Inject variantType into sourceContext so the AI prompt includes the variant hint.
        const sourceContextWithVariant = { ...(sourceContext || {}), variantType };

        let rawPlan    = null;
        let usedFallback = false;
        let aiSource   = 'ai';

        try {
            rawPlan = await generatePermaculturePlanWithAI(sourceContextWithVariant);
        } catch (err) {
            console.error('[generateDraft] AI generation error:', err.message);
        }

        if (rawPlan) {
            console.log('[generateDraft] using AI plan');
        } else {
            console.log(`[generateDraft] AI unavailable, using mock (variant=${variantType})`);
            rawPlan      = buildMockDraft(layoutSnapshot, userRequirements, mergedLocation, sourceContext, variantType);
            usedFallback = true;
            aiSource     = 'mock';
        }

        // ── Strict post-generation validation ─────────────────────────────────
        {
            const availableCatalogKeys = new Set(
                (sourceContextWithVariant?.availableStructureCatalog || [])
                    .map(e => e.catalogKey)
                    .filter(Boolean)
            );
            const existingStructureIds = new Set(
                (sourceContextWithVariant?.existingMapStructures || [])
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
        const ctx = sourceContextWithVariant || {};
        const siteAnalysis = usedFallback
            ? {
                ...rawPlan.siteAnalysis,
                stableElements:       (ctx.existingElements?.stableElements) || [],
                climate:              '',
                waterStrategy:        '',
                soilStrategy:         '',
                accessStrategy:       '',
                biodiversityStrategy: '',
            }
            : {
                existingStructures:   rawPlan.siteAnalysis?.existingStructures  || [],
                stableElements:       (ctx.existingElements?.stableElements) || [],
                slopeNotes:           ctx.siteCharacteristics?.constraints?.find(c => c.type === 'terrain')?.message || '',
                sunExposureNotes:     '',
                windNotes:            ctx.siteCharacteristics?.constraints?.find(c => c.type === 'wind')?.message || '',
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
            sourceContext:        ctx,
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
            // variantType is stored as a plan warning annotation so the frontend can read it
            // without requiring a schema migration (planWarnings is already an array field).
        });

        // Inject variantType into the returned plan object for the frontend
        const planWithVariant = { ...plan.toObject(), variantType };

        res.json({ success: true, plan: planWithVariant });
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
        // bedLayouts: start from existing; we'll add/update entries for bed suggestions
        const newBedLayouts = { ...(layout.bedLayouts || {}) };

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

            // ── enhance_existing / plant_inside_existing ─────────────────────
            // For bed-like targets: generate and save a real bedLayout so the user
            // sees plants immediately in the Bed Editor without manual entry.
            if (action === 'enhance_existing' || action === 'plant_inside_existing') {
                let bedLayoutCreated = false;

                if (el.targetElementId) {
                    const targetId = String(el.targetElementId);
                    // Find the target item among overlay items (General map) or zone items
                    const allZoneItems = Object.values(layout.zoneItems || {}).flat();
                    const targetItem =
                        (layout.overlayItems || []).find(it => String(it.id) === targetId) ||
                        allZoneItems.find(it => String(it.id) === targetId);

                    const isBedLike = targetItem && ['Raised Bed', 'Greenhouse'].includes(targetItem.name);

                    if (isBedLike && (el.bedLayoutSuggestion || (el.plants || []).length > 0)) {
                        // Prefer an explicit bedLayoutSuggestion; fall back to generating from plants list
                        const suggestion = el.bedLayoutSuggestion || makeBedLayoutFromPlants(el.plants || [], targetItem);
                        // Merge with any existing bedLayout (don't overwrite existing rows)
                        const existing = newBedLayouts[targetId] || { rows: [], blocks: [], layoutMode: 'rows' };
                        newBedLayouts[targetId] = {
                            layoutMode: existing.layoutMode || 'rows',
                            blocks:     existing.blocks || [],
                            rows:       [...(existing.rows || []), ...suggestion.rows],
                        };
                        bedLayoutCreated = true;
                        console.log(`[applyPlan] ${action} "${elName}" → bedLayout updated for id=${targetId} (${suggestion.rows.length} row(s) added)`);
                    }
                }

                applied.push({
                    element:         elName,
                    action,
                    targetElementId: el.targetElementId || null,
                    canonicalType:   el.canonicalType   || null,
                    plants:          el.plants          || [],
                    reason:          el.reason          || '',
                    bedLayoutCreated,
                });
                if (!bedLayoutCreated) {
                    console.log(`[applyPlan] ${action} "${elName}" targeting id=${el.targetElementId} (no bed layout — not a bed-like target)`);
                }
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
        // Use $set to avoid Mongoose path-marking issues with Mixed fields.
        // Include bedLayouts so plant_inside_existing actions are reflected immediately
        // in the Bed Editor without the user needing to re-save.
        const updatedLayout = await gardenLayoutModel.findOneAndUpdate(
            { userId: req.user.id },
            { $set: { overlayItems: newOverlayItems, bedLayouts: newBedLayouts } },
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
