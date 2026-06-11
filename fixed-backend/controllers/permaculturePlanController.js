import PermaculturePlan from '../models/permaculturePlanModel.js';
import gardenLayoutModel from '../models/gardenLayoutModel.js';
import { buildPermacultureContext, deriveHouseholdFoodStrategy } from '../services/permacultureContextService.js';
import { generatePermaculturePlanWithAI } from '../services/permacultureAiService.js';
import { resolveCanonicalType, getCatalogEntry, validateProposedElements, normalizeGeneralStructure, deduplicateProposedElements, MULTI_ALLOWED_CANONICAL_KEYS, CANONICAL_DISPLAY_NAMES } from '../utils/structureCatalogUtils.js';
import { resolveElementColor } from '../config/permaculturePlanSchema.js';
import {
    validatePermaculturePlan,
    normalizeGeneratedElement,
    resolvePlanElementOverlaps,
} from '../utils/permaculturePlanValidation.js';

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
        id: `gen-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        x: 0.05,
        y: 0.05 + idx * (rowH + 0.05),
        widthM: Math.max(0.3, bedW - 0.10),
        heightM: rowH,
        spacingCm: 25,
        rowSpacingCm: 30,
        notes: 'Generated from permaculture plan',
        plant: { name: plantName },
    }));
    return { rows, blocks: [], layoutMode: 'rows' };
}

// ── Orientation helpers ───────────────────────────────────────────────────────

function getCompassMapping(northDirection = 'top') {
    switch (northDirection) {
        case 'right': return { top: 'W', right: 'N', bottom: 'E', left: 'S' };
        case 'bottom': return { top: 'S', right: 'W', bottom: 'N', left: 'E' };
        case 'left': return { top: 'E', right: 'S', bottom: 'W', left: 'N' };
        default: return { top: 'N', right: 'E', bottom: 'S', left: 'W' };
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
        case 'top': return { xFrac: 0.45, yFrac: 0.15 };
        case 'right': return { xFrac: 0.65, yFrac: 0.45 };
        case 'left': return { xFrac: 0.15, yFrac: 0.45 };
        default: return { xFrac: 0.45, yFrac: 0.65 };
    }
}

// ── Placement helpers ─────────────────────────────────────────────────────────
// Clamp a proposed element so it stays within garden bounds.
function clampToGarden(xM, yM, wM, hM, widthM, heightM) {
    const x = Math.max(0, Math.min(xM, widthM - wM));
    const y = Math.max(0, Math.min(yM, heightM - hM));
    return { x, y };
}

// Minimum distance (m) to keep sun-hungry zones (Vegetable Garden, Greenhouse)
// away from a forest boundary, which casts shade along that edge.
const FOREST_SHADE_BUFFER_M = 12;

// Returns the garden edges ('top'|'right'|'bottom'|'left') that border a forest,
// based on the saved site analysis neighbourhood data.
function getForestEdges(neighbourhood, northDirection) {
    if (!neighbourhood) return [];
    const edges = [];
    [['north', 'N'], ['east', 'E'], ['south', 'S'], ['west', 'W']].forEach(([dir, compass]) => {
        if (neighbourhood[dir]?.type === 'forest') {
            const edge = getEdgeForDirection(compass, northDirection);
            if (edge) edges.push(edge);
        }
    });
    return edges;
}

// Shift a placement rect away from forest-bordered edges if there's room to do
// so elsewhere in the garden — keeps sun-hungry zones out of forest shade.
function avoidForestShadeBuffer(xM, yM, wM, hM, widthM, heightM, forestEdges, bufferM = FOREST_SHADE_BUFFER_M) {
    let x = xM, y = yM;
    forestEdges.forEach(edge => {
        if (edge === 'left' && x < bufferM && widthM - bufferM - wM > bufferM) {
            x = bufferM;
        } else if (edge === 'right' && x + wM > widthM - bufferM && widthM - bufferM - wM > bufferM) {
            x = Math.max(0, widthM - bufferM - wM);
        } else if (edge === 'top' && y < bufferM && heightM - bufferM - hM > bufferM) {
            y = bufferM;
        } else if (edge === 'bottom' && y + hM > heightM - bufferM && heightM - bufferM - hM > bufferM) {
            y = Math.max(0, heightM - bufferM - hM);
        }
    });
    return clampToGarden(x, y, wM, hM, widthM, heightM);
}

// Find the approximate centre of existing house/shed structures in metres.
// Falls back to (widthM/2, heightM/2) if no stable structure is found.
function findAnchorM(existingMapStructures, widthM, heightM) {
    const anchor = existingMapStructures.find(s => s.canonicalType === 'house' || s.canonicalType === 'shed');
    if (anchor?.xM != null && anchor?.yM != null) return { xM: anchor.xM, yM: anchor.yM };
    return { xM: widthM / 2, yM: heightM / 2 };
}

// ── Site analysis summary builder ────────────────────────────────────────────
function buildSiteAnalysisSummary(sa, existingElements) {
    if (!sa) return null;

    const usedFacts = [];
    const missingFacts = [];
    const confidenceImpact = [];
    const placementImplications = [];

    // Terrain
    if (sa.topography?.slopeType) {
        const parts = [sa.topography.slopeType, sa.topography.slopeDirection ? `facing ${sa.topography.slopeDirection}` : ''].filter(Boolean);
        usedFacts.push(`Terrain: ${parts.join(', ')}`);
        if (sa.topography.slopeType !== 'flat') {
            placementImplications.push('Place swales on contour; site low point is best for pond');
        }
    } else {
        missingFacts.push('Slope type and direction not provided');
        confidenceImpact.push('Swale placement estimated — add slope data for accurate contour placement');
    }

    // Drainage / pooling
    if (sa.topography?.poolingAreas) {
        usedFacts.push(`Pooling areas: ${sa.topography.poolingAreas}`);
        placementImplications.push('Avoid planting tree roots in pooling areas; consider bioswale or pond');
    }
    if (sa.topography?.drainageNotes) {
        usedFacts.push(`Drainage: ${sa.topography.drainageNotes}`);
    }

    // Wind
    if (sa.sectors?.dominantWind) {
        usedFacts.push(`Dominant wind: ${sa.sectors.dominantWind}`);
        placementImplications.push(`Place windbreak on the ${sa.sectors.dominantWind} boundary`);
    } else {
        missingFacts.push('Wind direction not provided');
        confidenceImpact.push('Windbreak placement is a best guess — add wind sector data for accurate positioning');
    }

    // Sun / shade sectors
    if (sa.sectors?.sunnyAreas || sa.sectors?.shadedAreas) {
        const parts = [
            sa.sectors.sunnyAreas && `sunny areas: ${sa.sectors.sunnyAreas}`,
            sa.sectors.shadedAreas && `shaded areas: ${sa.sectors.shadedAreas}`,
        ].filter(Boolean);
        usedFacts.push(`Sun/shade: ${parts.join('; ')}`);
        placementImplications.push('Vegetable beds positioned toward sunniest side');
    } else {
        missingFacts.push('No summer shade map provided');
        confidenceImpact.push('Orchard and vegetable bed placement based on north direction only — shade sectors would improve accuracy');
    }

    // Frost pockets
    if (sa.sectors?.frostPockets) {
        usedFacts.push(`Frost pockets: ${sa.sectors.frostPockets}`);
        placementImplications.push('Avoid frost-sensitive crops in frost pocket areas');
    }

    // Soil
    if (sa.soil?.soilType) {
        const soilDesc = [
            sa.soil.soilType,
            sa.soil.soilDrainage && `${sa.soil.soilDrainage} drainage`,
            sa.soil.soilFertility && `fertility: ${sa.soil.soilFertility}`,
        ].filter(Boolean).join(', ');
        usedFacts.push(`Soil: ${soilDesc}`);
        if (sa.soil.soilType === 'clay') placementImplications.push('Clay soil: raise beds for drainage; pond requires minimal lining');
        if (sa.soil.soilType === 'sandy') placementImplications.push('Sandy soil: heavy mulching and compost essential; water harvesting critical');
    } else {
        missingFacts.push('Soil type not specified');
        confidenceImpact.push('Raised-bed depth and water feature placement estimated without soil data');
    }
    if (!sa.soil?.soilPH) {
        missingFacts.push('Soil pH not provided');
        confidenceImpact.push('Fruit-tree variety and lime/sulphur amendment recommendations cannot be precise without pH');
    }
    if (sa.soil?.soilCompaction) {
        usedFacts.push('Soil compaction noted');
        placementImplications.push('Prioritise no-dig beds and deep-rooted dynamic accumulators to break compaction');
    }

    // Water
    if (sa.topography?.waterSources?.length > 0) {
        usedFacts.push(`Water sources: ${sa.topography.waterSources.join(', ')}`);
        if (sa.topography.rainwaterHarvesting) {
            usedFacts.push('Rainwater harvesting present');
            placementImplications.push('Plan overflow from rainwater tank to swale or pond');
        }
    } else {
        missingFacts.push('No water sources described');
        confidenceImpact.push('Irrigation and pond placement are default — describe existing water sources for better placement');
    }

    // Climate
    if (sa.climate?.climateZone) usedFacts.push(`Hardiness zone: ${sa.climate.climateZone}`);
    if (sa.climate?.firstFrostDate || sa.climate?.lastFrostDate) {
        usedFacts.push(`Frost window: ${sa.climate.lastFrostDate || '?'} → ${sa.climate.firstFrostDate || '?'}`);
    } else {
        missingFacts.push('Frost dates not provided');
        confidenceImpact.push('Greenhouse and cold-frame timing recommendations are approximate without frost dates');
    }

    // Animals from goals
    if (sa.goals?.animals) {
        usedFacts.push(`Animals noted in site analysis: ${sa.goals.animals}`);
    }

    // Children / pets
    if (sa.goals?.childrenPets) {
        usedFacts.push('Children or pets on site');
        placementImplications.push('Avoid toxic plants; plan safe play areas away from compost and ponds');
    }

    // Constraints
    if (sa.constraints?.pests) {
        usedFacts.push(`Known pests: ${sa.constraints.pests}`);
        placementImplications.push(`Plan companion planting and physical barriers for: ${sa.constraints.pests}`);
    }
    if (sa.constraints?.irrigationLimits) {
        usedFacts.push(`Irrigation limit: ${sa.constraints.irrigationLimits}`);
        placementImplications.push('Prioritise drought-tolerant perennials and water-harvesting systems');
    }

    // Neighbourhood context
    if (sa.neighbourhood) {
        const nb = sa.neighbourhood;
        const DIRECTION_LABELS = { north: 'North', east: 'East', south: 'South', west: 'West' };
        const TYPE_IMPLICATIONS = {
            forest: (dir) => `${dir} side bordered by forest — wind protection, shade, wildlife edge, leaf litter; keep sun-sensitive crops away from ${dir} shadow`,
            river: (dir) => `${dir} side has river/stream — water access, humidity, biodiversity; watch flood risk; good for pond, wetland, water-hungry plants on ${dir} edge`,
            road: (dir) => `${dir} side faces road — buffer with hedge or fence; avoid food crops near pollution; good for access path, parking, storage`,
            buildings: (dir) => `${dir} side has buildings — potential shade/wind tunnel; use as heat island or windbreak; avoid shade-sensitive crops`,
            field: (dir) => `${dir} side borders crop field — possible pesticide drift; use hedgerow buffer on ${dir} boundary`,
            orchard: (dir) => `${dir} side borders orchard — beneficial pollinator corridor; consider guild/hedge connections`,
            pasture: (dir) => `${dir} side borders pasture — manure/compost opportunity; animal pressure; plan fencing`,
            hedge: (dir) => `${dir} side has windbreak/hedge — microclimate benefit; integrate with guild planting`,
            empty: (_) => null,
            unknown: (_) => null,
        };
        const parts = [];
        for (const [dir, data] of Object.entries(nb)) {
            if (!data || !data.type || data.type === 'unknown' || data.type === 'empty') continue;
            const dirLabel = DIRECTION_LABELS[dir] || dir;
            const typeLabel = data.label || data.type;
            const custom = data.type === 'other' && data.notes ? data.notes : null;
            const desc = custom || typeLabel;
            parts.push(`${dirLabel}: ${desc}`);
            const impl = TYPE_IMPLICATIONS[data.type]?.(dirLabel);
            if (impl) placementImplications.push(impl);
            if (data.notes && data.type !== 'other') usedFacts.push(`${dirLabel} neighbourhood note: ${data.notes}`);
        }
        if (parts.length > 0) {
            usedFacts.push(`Neighbourhood: ${parts.join(' | ')}`);
        }
    }

    // Existing structures
    const structNames = (existingElements?.stableElements || []);
    if (structNames.length > 0) {
        usedFacts.push(`Existing stable structures: ${structNames.join(', ')}`);
    }

    return { usedFacts, missingFacts, confidenceImpact, placementImplications };
}

// ── Element count target helper ───────────────────────────────────────────────
function getTargetElementCount(areaM2, householdNeeds = {}, generationRequest = {}) {
    const householdSize = Number(householdNeeds?.householdSize || 0);
    const coverage = householdNeeds?.foodCoverageGoal || 'supplement';
    let min = 5, max = 8;
    if (areaM2 >= 1000) { min = 12; max = 20; }
    else if (areaM2 >= 200) { min = 8; max = 14; }
    // else < 200              { min = 5; max = 8 }
    if (householdSize >= 4 && ['partial', 'high', 'maximum'].includes(coverage)) { min += 2; max += 3; }
    return { min, max };
}

// ── Rule-based mock draft (fallback when AI is unavailable) ──────────────────
// variantType 'A' = Solar Priority, 'B' = Flow & Access
// sourceContext contains existingMapStructures, availableStructureCatalog, and generationRequest.
function buildMockDraft(layoutSnapshot, userRequirements, locationContext, sourceContext = {}, variantType = 'A', variantStrategy = 'solar-priority') {
    const setup = layoutSnapshot.setup || {};
    const zones = layoutSnapshot.zones || [];
    const overlayItems = layoutSnapshot.overlayItems || [];

    const widthM = setup.widthM || 10;
    const heightM = setup.heightM || 10;
    const areaM2 = widthM * heightM;

    const northDirection = setup.northDirection || locationContext?.northDirection || 'top';
    const sunEdge = getSunniestEdge(northDirection);
    const compassMap = getCompassMapping(northDirection);
    const sunnyPos = sunnyBiasPosition(northDirection);

    // ── Catalog-aware existing structure lookup ───────────────────────────────
    const existingMapStructures = sourceContext.existingMapStructures || [];
    const existingNames = overlayItems.map(it => it.name).filter(Boolean);

    const findExisting = (canon) => existingMapStructures.find(s => s.canonicalType === canon) || null;
    const allOfCanon = (canon) => existingMapStructures.filter(s => s.canonicalType === canon);

    const hasByCanon = (canon) =>
        existingMapStructures.some(s => s.canonicalType === canon) ||
        existingNames.some(n => resolveCanonicalType(n) === canon);

    // ── Generation request — read crop prefs, household needs, animals ────────
    const genReq = sourceContext.generationRequest || {};
    const allowed = genReq.allowedAdditions || {};
    // Part 1 fix: accept both cropPreferences and plantPreferences
    const cropPrefs = genReq.cropPreferences || genReq.plantPreferences || {};
    const cropAreas = cropPrefs.cropAreas || {};
    const householdNeeds = genReq.householdNeeds || {};
    const animalPrefs = genReq.animalPreferences || {};
    const animals = (animalPrefs.animals || []);

    // Convenience: which animals were selected?
    const hasChickens = animals.some(a => a.type === 'chickens' && a.status !== null);
    const hasDucks = animals.some(a => a.type === 'ducks' && a.status !== null);
    const hasBees = animals.some(a => a.type === 'bees' && a.status !== null);
    const hasGoats = animals.some(a => a.type === 'goats' && a.status !== null);

    // Derive "want" flags — combine explicit allowedAdditions with selected crop areas
    const wantGreenhouse = allowed.greenhouse === true || !!cropAreas.tomatoesInGreenhouse;
    const wantBerryPatch = allowed.berryPatch === true || !!cropAreas.berryPatch;
    const wantOrchard = allowed.orchard === true || !!cropAreas.orchard;
    const wantHerbGarden = allowed.herbGarden === true || !!cropAreas.herbs;
    const wantPotatoes = !!cropAreas.potatoes;
    const wantCabbage = !!cropAreas.cabbage;
    const wantRoots = !!cropAreas.carrots;
    const wantAlliums = !!cropAreas.onionsGarlic;
    const wantLegumes = !!cropAreas.beansPeas;
    const wantThreeSisters = !!cropAreas.cornPumpkin;
    const wantSaladGreens = !!cropAreas.saladGreens;
    const wantVineyard = !!cropAreas.vineyard;
    const wantMedicinal = !!cropAreas.medicinalFlowers;

    // Scale-aware target
    const target = getTargetElementCount(areaM2, householdNeeds, genReq);
    const canAddRaisedBed = allowed.raisedBeds !== false;
    const canAddGreenhouse = allowed.greenhouse === true;
    const canAddPond = allowed.pond === true;
    const canAddCompost = allowed.compost !== false;
    const canAddPaths = allowed.paths !== false;
    const canAddGuilds = allowed.guilds !== false;
    const canAddOrchard = allowed.orchard === true;
    const canAddBerryPatch = allowed.berryPatch === true;
    const canAddHerbGarden = allowed.herbGarden === true;
    const canAddWindbreak = allowed.windbreak === true;
    const canAddCoop = allowed.coop === true;
    const canAddBeehives = allowed.beehives === true;
    const canAddSwales = allowed.swales === true;
    const canAddFoodForest = allowed.foodForest === true;

    const hasCompost = hasByCanon('compost');
    const hasPond = hasByCanon('pond');
    const hasRaisedBed = hasByCanon('raised_bed');
    const hasGreenhouse = hasByCanon('greenhouse');
    const hasPath = hasByCanon('path');
    const hasFence = hasByCanon('fence');
    const hasCoop = hasByCanon('coop');

    const existingPond = findExisting('pond');
    const existingCompost = findExisting('compost');
    const existingGreenhouse = findExisting('greenhouse');
    const existingBeds = allOfCanon('raised_bed');
    const existingRaisedBed = existingBeds[0] || null;

    // Anchor point — used to position kitchen/food elements close to house
    const anchor = findAnchorM(existingMapStructures, widthM, heightM);

    // Element count target (now from getTargetElementCount)
    const elementTarget = target.min;

    // ── Site analysis (must be declared before any use of saved) ─────────────
    const isVariantB = variantType === 'B';
    const saved = sourceContext.savedSiteAnalysis || null;

    // ── Detect Water & Gravity strategy availability ───────────────────────────
    const hasSlopeData = !!(saved?.topography?.slopeType && saved?.topography?.slopeDirection);
    const hasWaterFlow = !!(saved?.topography?.poolingAreas || (saved?.topography?.waterSources?.length > 0));
    const waterGravityAvailable = hasSlopeData || hasWaterFlow;

    console.log(`[buildMockDraft] variant=${variantType} area=${areaM2}m² target=${elementTarget} waterGravity=${waterGravityAvailable} pond=${hasPond} beds=${existingBeds.length}`);

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
            !hasPath ? 'No defined access paths — design paths to all productive areas to prevent soil compaction in beds.' : null,
            widthM < 5 ? 'Limited width constrains zone depth; prioritise vertical growing (trellises, espalier).' : null,
            saved?.constraints?.localRules ? `Local rules: ${saved.constraints.localRules}` : null,
            saved?.constraints?.irrigationLimits ? `Irrigation limits: ${saved.constraints.irrigationLimits}` : null,
            saved?.constraints?.pests ? `Known pests/diseases: ${saved.constraints.pests}` : null,
            saved?.goals?.childrenPets ? 'Avoid toxic plants — children or pets present on site.' : null,
        ].filter(Boolean),
        opportunities: [
            !hasPond ? 'A wildlife pond is the single highest-yield permaculture feature per m² — supports frogs, dragonflies, and birds that provide natural pest control.' : null,
            hasPond ? 'Existing pond can be enhanced with marginal plantings — water mint, marsh marigold, yellow flag iris.' : null,
            !hasGreenhouse && areaM2 > 50 ? 'A greenhouse or polytunnel extends the growing season by 6–8 weeks at each end.' : null,
            !hasFence ? 'A living hedge doubles as windbreak, wildlife corridor, and productive food source.' : null,
            existingBeds.length > 0 ? `${existingBeds.length} existing raised bed(s) can be planted with companion guilds for maximum yield.` : null,
            hasGreenhouse ? 'Existing greenhouse should be planned with heat-loving crops (tomatoes, peppers, cucumbers).' : null,
            hasCoop ? 'Existing animal area can integrate rotational grazing and direct composting from chicken manure.' : null,
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

    // Forest-bordered edges — Vegetable Garden / Greenhouse get pushed away from
    // these (forest shade reduces yield) when there's room to do so elsewhere.
    const forestEdges = getForestEdges(saved?.neighbourhood, northDirection);

    // ──────────────────────────────────────────────────────────────────────────
    // VARIANT A — SOLAR PRIORITY
    // Spatial strategy: place elements according to sun exposure.
    // Sunniest areas → demanding crops (tomatoes, peppers, greenhouse).
    // Partial shade → root crops, leafy greens, herbs, currants.
    // Tall structures must not shade productive sun-sensitive beds.
    // Uses sunEdge / sunnyPos from North direction analysis.
    // ──────────────────────────────────────────────────────────────────────────
    if (!isVariantB) {
        // ── Vegetable Garden zone portal (replaces multiple scattered raised beds) ──
        // One large area with all veg beds inside, placed toward sunniest edge.
        if (existingBeds.length > 0) {
            // Existing raised beds: enhance each with companion plantings
            existingBeds.slice(0, 2).forEach((bed, idx) => {
                const plants = idx === 0
                    ? ['Tomato', 'Basil', 'Marigold', 'Parsley']
                    : ['Lettuce', 'Spinach', 'Radish', 'Chives'];
                proposed.push({
                    action: 'plant_inside_existing', targetElementId: bed.id,
                    canonicalType: 'raised_bed', enhancementType: 'companion_planting_group',
                    type: 'planting-strip', name: idx === 0 ? 'Tomato & Herb Companions' : 'Salad & Leaf Mix',
                    targetZone: '1',
                    x: bed.xM ?? anchor.xM * 0.5, y: bed.yM ?? heightM * 0.55,
                    width: bed.wM ?? 3.0, height: bed.hM ?? 1.2, rotation: 0, plants,
                    reason: idx === 0
                        ? 'Tomato + basil + marigold companion guild — marigold deters aphids, basil improves flavour.'
                        : 'Succession salad bed for cut-and-come-again harvest spring through autumn.',
                    confidence: 0.93, warnings: [],
                    bedLayoutSuggestion: makeBedLayoutFromPlants(plants, bed),
                });
            });
        } else if (canAddRaisedBed) {
            // Create ONE Vegetable Garden zone portal (not multiple scattered raised beds)
            const vgW = areaM2 < 200 ? 8 : areaM2 < 1000 ? 12 : 14;
            const vgH = areaM2 < 200 ? 5 : areaM2 < 1000 ? 7 : 8;
            const bedX = Math.max(1, Math.min(widthM * sunnyPos.xFrac, widthM - vgW - 1));
            const bedY = Math.max(1, Math.min(heightM * sunnyPos.yFrac, heightM - vgH - 1));
            let vgPos = clampToGarden(bedX, bedY, vgW, vgH, widthM, heightM);
            const vgShifted = avoidForestShadeBuffer(vgPos.x, vgPos.y, vgW, vgH, widthM, heightM, forestEdges);
            const vgForestShadeAvoided = vgShifted.x !== vgPos.x || vgShifted.y !== vgPos.y;
            vgPos = vgShifted;

            const sunFact = saved?.sectors?.sunnyAreas
                ? `Sunniest area per site analysis: ${saved.sectors.sunnyAreas}`
                : `${sunEdge}-facing edge estimated as sunniest`;
            const soilFact = saved?.soil?.soilType
                ? `Site analysis: ${saved.soil.soilType} soil`
                : null;
            const forestFact = vgForestShadeAvoided
                ? ` Shifted away from the forest-bordered edge to avoid shade on this sun-hungry zone.`
                : '';

            // Determine which internal beds to include based on crop preferences
            const inclTomato = !wantGreenhouse;   // if greenhouse selected, tomatoes go there
            const inclLeafy = wantSaladGreens || true;
            const inclRoots = wantRoots || true;
            const inclLegumes = wantLegumes || areaM2 >= 200;
            const inclCucurb = wantThreeSisters || areaM2 >= 400;
            const inclCompan = true;

            const beds = [];
            let bedY0 = 0;
            const addBed = (label, plants, heightM_, spacingCm) => {
                if (bedY0 + heightM_ > vgH) return; // no space
                beds.push({ id: `bed-${beds.length + 1}`, label, x: 0, y: parseFloat(bedY0.toFixed(2)), widthM: vgW, heightM: heightM_, plants, spacingCm });
                bedY0 += heightM_ + 0.15;
            };
            if (inclTomato) addBed('Tomatoes, Peppers & Herbs', ['Tomato (Roma)', 'Pepper (Kapia)', 'Basil', 'Marigold'], 1.3, 45);
            if (inclLeafy) addBed('Leafy Greens', ['Lettuce', 'Spinach', 'Swiss Chard', 'Kale', 'Radish'], 1.0, 25);
            if (inclRoots) addBed('Root Crops', ['Carrot', 'Parsley Root', 'Beetroot', 'Onion'], 1.0, 15);
            if (inclLegumes) addBed('Legumes', ['Bean (Fasole)', 'Pea (Mazăre)', 'Dill'], 1.0, 30);
            if (inclCucurb) addBed('Cucurbits', ['Zucchini (Dovlecel)', 'Cucumber', 'Pumpkin'], 1.2, 60);
            if (inclCompan) addBed('Companion Flowers', ['Calendula (Gălbenele)', 'Marigold (Crăițe)', 'Nasturtium', 'Borage'], 0.8, 30);

            console.log(`[buildMockDraft] Variant A: creating Vegetable Garden portal (${vgW}×${vgH}m, ${beds.length} beds)`);
            proposed.push({
                action: 'create_new', catalogKey: 'vegetable_garden', canonicalType: 'vegetable_garden',
                type: 'structure', name: 'Vegetable Garden', targetZone: '1',
                variantStrategy: 'solar-priority',
                strategyReason: 'Sunniest area reserved for heat-loving vegetables.',
                strategyTags: ['full-sun', 'zone-1', 'daily-harvest'],
                x: vgPos.x, y: vgPos.y, width: vgW, height: vgH, rotation: 0,
                plants: ['Marigold', 'Nasturtium'],
                reason: `Solar Priority: ${sunFact}. All vegetable production grouped in one area facing the sun.${forestFact} ${soilFact ? soilFact + ' — raised bed rows improve drainage.' : ''}`,
                confidence: 0.93, warnings: [],
                internalBeds: beds,
                detailPlan: {
                    layoutType: 'rows',
                    suggestedPlants: beds.flatMap(b => b.plants).slice(0, 10),
                    notes: 'Vegetable garden with companion-planted rows. Rotate crops annually.',
                },
            });
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
            const ghPosRaw = clampToGarden(widthM * sunnyPos.xFrac, heightM * sunnyPos.yFrac, 5.0, 4.0, widthM, heightM);
            const ghPos = avoidForestShadeBuffer(ghPosRaw.x, ghPosRaw.y, 5.0, 4.0, widthM, heightM, forestEdges);
            const ghForestShadeAvoided = ghPos.x !== ghPosRaw.x || ghPos.y !== ghPosRaw.y;
            proposed.push({
                action: 'create_new', catalogKey: 'greenhouse', canonicalType: 'greenhouse',
                type: 'structure', name: 'Greenhouse', targetZone: '1',
                x: ghPos.x, y: ghPos.y, width: 5.0, height: 4.0, rotation: 0,
                plants: ['Tomato (Greenhouse)', 'Pepper', 'Cucumber'],
                reason: `Placed toward the ${sunEdge}-facing (sunniest) side of the garden.${ghForestShadeAvoided ? ' Shifted away from the forest-bordered edge to avoid shade.' : ''} A greenhouse here extends the productive season significantly and allows heat-loving crops that cannot succeed outdoors.`,
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

        // Herb & pollinator border alongside beds (Variant A)
        const polPos = clampToGarden(Math.max(0, anchor.xM - 5), Math.max(0, anchor.yM + 1), widthM * 0.25, 1.0, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'herb_garden', canonicalType: 'herb_garden',
            type: 'structure', name: 'Herb & Pollinator Border', targetZone: '1',
            x: polPos.x, y: polPos.y, width: Math.max(2, widthM * 0.25), height: 1.5, rotation: 0,
            plants: ['Borage', 'Marigold', 'Nasturtium', 'Chives', 'Lavender'],
            reason: 'A companion flower and herb border alongside vegetable beds attracts pollinators and beneficial predators, reducing pest pressure by 20–40% compared to monoculture blocks.',
            confidence: 0.87, warnings: [],
        });

        // Berry patch (Variant A — if selected in crop preferences)
        if (canAddBerryPatch && areaM2 > 60) {
            const bPos = clampToGarden(widthM * 0.60, heightM * 0.30, Math.min(8, widthM * 0.35), 4.0, widthM, heightM);
            proposed.push({
                action: 'create_new', catalogKey: 'berry_patch', canonicalType: 'berry_patch',
                type: 'structure', name: 'Berry Patch', targetZone: '2',
                x: bPos.x, y: bPos.y, width: bPos.width, height: 4.0, rotation: 0,
                plants: ['Raspberry', 'Strawberry', 'Currant', 'Gooseberry'],
                reason: 'Berry fruits provide high-yield, low-effort harvests from Zone 2. Raspberries and currants are particularly productive in Romanian climates.',
                confidence: 0.88, warnings: [],
            });
        }

        // Orchard / guild (Variant A — if selected in crop preferences)
        if (canAddOrchard && areaM2 > 100) {
            const oPos = clampToGarden(widthM * 0.58, heightM * 0.55, 10.0, 8.0, widthM, heightM);
            proposed.push({
                action: 'create_new', catalogKey: 'orchard', canonicalType: 'orchard',
                type: 'structure', name: 'Fruit Tree Orchard', targetZone: '3',
                x: oPos.x, y: oPos.y, width: 10.0, height: 8.0, rotation: 0,
                plants: ['Apple', 'Pear', 'Plum', 'Cherry', 'Comfrey', 'Clover'],
                reason: 'A small orchard in Zone 3 provides long-term perennial harvests. Romanian varieties (Ionatan apple, Italian prune plum) are well-adapted to the local climate.',
                confidence: 0.86, warnings: ['Allow 5–7 m spacing between trees. Underplant with comfrey and clover as living mulch.'],
            });
        }

        // Beehive (Variant A — if animal preferences include bees)
        if (canAddBeehives && !hasByCanon('beehive')) {
            const bhPos = clampToGarden(widthM * 0.75, heightM * 0.20, 1.0, 1.0, widthM, heightM);
            proposed.push({
                action: 'create_new', catalogKey: 'beehive', canonicalType: 'beehive',
                type: 'structure', name: 'Beehive (Langstroth)', targetZone: '2',
                x: bhPos.x, y: bhPos.y, width: 1.0, height: 1.0, rotation: 0,
                plants: [],
                reason: 'Beehives placed in Zone 2 near flowering food plants increase crop pollination by 20–30% and provide honey. Face the entrance south-east.',
                confidence: 0.90,
                warnings: ['Keep 5 m from paths and sitting areas. Ensure a water source within 50 m.'],
            });
        }

        // Chicken coop (Variant A — if animal preferences include chickens/ducks)
        if (canAddCoop && !hasCoop) {
            const coopPos = clampToGarden(widthM * 0.78, heightM * 0.68, 3.0, 3.0, widthM, heightM);
            proposed.push({
                action: 'create_new', catalogKey: 'coop', canonicalType: 'coop',
                type: 'structure', name: 'Chicken Coop & Run', targetZone: '2',
                x: coopPos.x, y: coopPos.y, width: 3.0, height: 3.0, rotation: 0,
                plants: [],
                reason: 'A chicken coop in Zone 2 integrates poultry into the food-production system. Chickens provide eggs, manure for composting, and pest control in rotation with vegetable beds.',
                confidence: 0.88,
                warnings: ['Plan a rotational run system to prevent overgrazing. Direct the coop door away from prevailing wind.'],
            });
        }

        // ──────────────────────────────────────────────────────────────────────────
        // VARIANT B — FLOW & ACCESS (rich, zone-based placement)
        // Zone 1 (daily use, ≤10m from house): herbs, salads, compost, daily beds, greenhouse.
        // Zone 2 (weekly, 10–30m): main veg, roots, berries, beehives.
        // Zone 3 (occasional, 30m+): orchard, guilds, potatoes, coop, pond, meadow.
        // Paths connect every productive zone back to the house.
        // ──────────────────────────────────────────────────────────────────────────
    } else {
        // Position helpers for Flow & Access
        const near = (dx, dy, w, h) => clampToGarden(anchor.xM + dx, anchor.yM + dy, w, h, widthM, heightM);
        const pos = (fx, fy, w, h) => clampToGarden(widthM * fx, heightM * fy, w, h, widthM, heightM);

        // ── Zone 1 — daily-use elements, close to house ───────────────────────

        // 1. Main Harvest Path
        if (!hasPath && canAddPaths) {
            const p = near(-1, 1, Math.min(widthM * 0.30, 20), 1.0);
            proposed.push({
                action: 'create_new', catalogKey: 'path', canonicalType: 'path',
                type: 'structure', name: 'Main Harvest Path', targetZone: '1',
                variantStrategy: 'flow-access', strategyReason: 'Main path connects house to all productive zones.',
                strategyTags: ['path-access', 'zone-1'],
                x: p.x, y: p.y, width: p.width, height: 1.0, rotation: 0, plants: [],
                reason: 'FLOW & ACCESS: Main harvest path runs from the house to all productive areas. A defined all-weather path prevents soil compaction and makes daily harvesting efficient in any weather.',
                confidence: 0.95, warnings: [],
            });
        }

        // Z1-2. Vegetable Garden zone portal (Flow & Access: close to house, zone 1)
        if (existingBeds.length === 0 && canAddRaisedBed) {
            const vgW = areaM2 < 200 ? 8 : areaM2 < 1000 ? 11 : 14;
            const vgH = areaM2 < 200 ? 5 : areaM2 < 1000 ? 6 : 7;
            const vgPos = near(2, 2, vgW, vgH);

            const bBeds = [];
            let yOff = 0;
            const addB = (label, plants, h, sp) => {
                if (yOff + h > vgH) return;
                bBeds.push({ id: `bed-${bBeds.length + 1}`, label, x: 0, y: parseFloat(yOff.toFixed(2)), widthM: vgW, heightM: h, plants, spacingCm: sp });
                yOff += h + 0.15;
            };
            addB('Daily Salads & Herbs', ['Lettuce', 'Spinach', 'Radish', 'Chives', 'Parsley'], 1.0, 25);
            addB('Tomatoes & Companions', ['Tomato (Roma)', 'Basil', 'Marigold'], 1.2, 45);
            addB('Root Crops', ['Carrot', 'Beetroot', 'Onion', 'Garlic'], 1.0, 15);
            if (wantLegumes || areaM2 >= 200) addB('Legumes', ['Bean', 'Pea', 'Dill'], 1.0, 30);
            addB('Companion Flowers', ['Calendula', 'Marigold', 'Nasturtium'], 0.8, 30);

            proposed.push({
                action: 'create_new', catalogKey: 'vegetable_garden', canonicalType: 'vegetable_garden',
                type: 'structure', name: 'Vegetable Garden', targetZone: '1',
                variantStrategy: 'flow-access', strategyReason: 'Zone 1 — all daily-harvest veg within arm\'s reach of the house.',
                strategyTags: ['daily-harvest', 'near-house', 'zone-1'],
                x: vgPos.x, y: vgPos.y, width: vgW, height: vgH, rotation: 0,
                plants: ['Marigold', 'Nasturtium'],
                reason: 'ZONE 1 (Flow & Access): one Vegetable Garden area groups all daily-harvest crops near the house. Salads, herbs, tomatoes and root crops in adjacent rows — no unnecessary walking.',
                confidence: 0.93, warnings: [],
                internalBeds: bBeds,
                detailPlan: { layoutType: 'rows', suggestedPlants: bBeds.flatMap(b => b.plants).slice(0, 10), notes: 'Zone 1 veg garden. Rotate crop groups annually.' },
            });
        } else if (existingBeds.length > 0) {
            existingBeds.slice(0, 1).forEach(bed => {
                proposed.push({
                    action: 'plant_inside_existing', targetElementId: bed.id,
                    canonicalType: 'raised_bed', enhancementType: 'daily_harvest_zone1',
                    type: 'planting-strip', name: 'Daily-Harvest Salad & Herb Mix', targetZone: '1',
                    variantStrategy: 'flow-access', strategyReason: 'Existing bed enhanced for daily harvest in Zone 1.',
                    strategyTags: ['daily-harvest', 'near-house', 'zone-1'],
                    x: bed.xM ?? anchor.xM + 2, y: bed.yM ?? anchor.yM + 2,
                    width: bed.wM ?? 3.5, height: bed.hM ?? 1.2, rotation: 0,
                    plants: ['Lettuce', 'Spinach', 'Radish', 'Chives', 'Parsley'],
                    reason: 'ZONE 1 (Flow & Access): existing raised bed enhanced with daily-harvest crops. Cut-and-come-again salads and herbs within arm\'s reach of the kitchen reduce the steps needed every day.',
                    confidence: 0.94, warnings: [],
                    bedLayoutSuggestion: makeBedLayoutFromPlants(['Lettuce', 'Spinach', 'Chives', 'Parsley', 'Radish'], bed),
                });
            });
        }

        // Z1-3. Kitchen herb garden (Zone 1)
        if (!proposed.some(p => p.canonicalType === 'herb_garden')) {
            const hg = near(6, 2, Math.min(5, widthM * 0.10), 3.5);
            proposed.push({
                action: 'create_new', catalogKey: 'herb_garden', canonicalType: 'herb_garden',
                type: 'structure', name: 'Kitchen Herb Garden', targetZone: '1',
                variantStrategy: 'flow-access', strategyReason: 'Near the kitchen door — herbs are used every day in cooking.',
                strategyTags: ['daily-harvest', 'near-house', 'zone-1'],
                x: hg.x, y: hg.y, width: hg.width, height: 3.5, rotation: 0,
                plants: ['Lovage', 'Dill', 'Parsley', 'Chives'],
                reason: 'ZONE 1 (Flow & Access): herb garden next to the kitchen for daily culinary use. Lovage, dill, parsley and basil are used every day in Romanian cooking — placing them close eliminates a dedicated trip to the far garden.',
                confidence: 0.93, warnings: [],
                detailPlan: {
                    layoutType: 'blocks',
                    suggestedPlants: ['Lovage', 'Dill', 'Parsley', 'Basil', 'Thyme', 'Summer Savory', 'Chives', 'Mint (contained)'],
                    notes: 'Lovage at back (tall perennial). Dill and parsley as main annuals. Mint in sunken pot. Basil near kitchen door.',
                },
            });
        }

        // Z1-4. Compost hub (Zone 1, near beds — short carrying distance)
        if (!hasCompost && canAddCompost) {
            const c = near(2, 6, 2.0, 2.0);
            proposed.push({
                action: 'create_new', catalogKey: 'compost', canonicalType: 'compost',
                type: 'structure', name: 'Compost Hub', targetZone: '1',
                variantStrategy: 'flow-access', strategyReason: 'Compost close to kitchen beds — short scraps-to-compost distance.',
                strategyTags: ['near-house', 'zone-1', 'path-access'],
                x: c.x, y: c.y, width: 2.0, height: 2.0, rotation: 0,
                plants: ['Comfrey'],
                reason: 'ZONE 1 (Flow & Access): compost hub placed within easy reach of kitchen beds. The shorter the distance between kitchen scraps, compost bin and raised beds, the more reliably composting becomes a daily habit.',
                confidence: 0.97, warnings: [],
            });
        } else if (existingCompost) {
            proposed.push({
                action: 'enhance_existing', targetElementId: existingCompost.id,
                canonicalType: 'compost', enhancementType: 'zone1_activator',
                type: 'planting-strip', name: 'Compost Hub Enhancement', targetZone: '1',
                variantStrategy: 'flow-access', strategyReason: 'Existing compost enhanced for easy Zone 1 access.',
                strategyTags: ['zone-1', 'path-access'],
                x: Math.max(0, existingCompost.xM - 0.5), y: Math.max(0, existingCompost.yM - 0.5),
                width: (existingCompost.wM ?? 2) + 1, height: (existingCompost.hM ?? 2) + 1,
                rotation: 0, plants: ['Comfrey', 'Yarrow'],
                reason: 'ZONE 1 (Flow & Access): existing compost enhanced with comfrey for free activator. Close access makes daily scraps deposit and finished compost collection easy.',
                confidence: 0.91, warnings: [],
            });
        }

        // Z1-5. Greenhouse (Zone 1, if existing → plant inside; else create if allowed/selected)
        if (existingGreenhouse) {
            const gh = existingGreenhouse;
            proposed.push({
                action: 'plant_inside_existing', targetElementId: gh.id,
                canonicalType: 'greenhouse', enhancementType: 'zone1_heat_lovers',
                type: 'planting-strip', name: 'Greenhouse Tomato & Pepper Plan', targetZone: '1',
                variantStrategy: 'flow-access', strategyReason: 'Greenhouse in Zone 1 — tomatoes need daily watering and harvesting.',
                strategyTags: ['daily-harvest', 'zone-1', 'near-house'],
                x: gh.xM ?? anchor.xM + 4, y: gh.yM ?? anchor.yM + 1,
                width: gh.wM ?? 5.0, height: gh.hM ?? 4.0, rotation: 0,
                plants: ['Tomato', 'Pepper', 'Cucumber', 'Basil'],
                reason: 'ZONE 1 (Flow & Access): existing greenhouse gets a tomato, pepper and cucumber plan. These crops need daily watering and harvest — the greenhouse must be reachable without extra effort.',
                confidence: 0.95, warnings: [],
                bedLayoutSuggestion: makeBedLayoutFromPlants(['Tomato (Greenhouse)', 'Pepper', 'Cucumber', 'Aubergine'], gh),
            });
        } else if ((wantGreenhouse || wantOrchard) && areaM2 > 80) {
            // Only create greenhouse if explicitly selected or a large-production garden
            if (wantGreenhouse) {
                const ghPos = near(5, -1, 5.0, 4.0);
                proposed.push({
                    action: 'create_new', catalogKey: 'greenhouse', canonicalType: 'greenhouse',
                    type: 'structure', name: 'Greenhouse', targetZone: '1',
                    variantStrategy: 'flow-access', strategyReason: 'Greenhouse in Zone 1 — daily watering and harvesting needed.',
                    strategyTags: ['daily-harvest', 'near-house', 'zone-1'],
                    x: ghPos.x, y: ghPos.y, width: 5.0, height: 4.0, rotation: 0,
                    plants: ['Tomato', 'Pepper', 'Cucumber'],
                    reason: 'ZONE 1 (Flow & Access): greenhouse near the house for daily harvest. Tomatoes and peppers need daily attention in season — placement close to the house makes routine care easy.',
                    confidence: 0.82, warnings: ['Orient for maximum light. Ensure good ventilation.'],
                    detailPlan: {
                        layoutType: 'rows',
                        suggestedPlants: ['Tomato (Roma)', 'Pepper (Kapia)', 'Cucumber', 'Aubergine', 'Basil'],
                        notes: 'Tomatoes along back, peppers centre, cucumbers on trellis. Basil at tomato base.',
                    },
                });
            }
        }

        // ── ZONE 2: regular access, weekly or bi-weekly harvests ─────────────

        // Z2-1. Second raised bed or existing bed enhancement for Zone 2
        if (existingBeds.length > 1) {
            const bed = existingBeds[1];
            proposed.push({
                action: 'plant_inside_existing', targetElementId: bed.id,
                canonicalType: 'raised_bed', enhancementType: 'zone2_regular_harvest',
                type: 'planting-strip', name: 'Brassica & Root Crop Bed', targetZone: '2',
                variantStrategy: 'flow-access', strategyReason: 'Zone 2 — cabbages, carrots and roots checked every few days.',
                strategyTags: ['weekly-harvest', 'zone-2', 'path-access'],
                x: bed.xM ?? anchor.xM + 4, y: bed.yM ?? anchor.yM + 5,
                width: bed.wM ?? 3.5, height: bed.hM ?? 1.2, rotation: 0,
                plants: ['Cabbage', 'Carrot', 'Dill'],
                reason: 'ZONE 2 (Flow & Access): brassica and root crop bed at medium distance from house — visited every 2–3 days. Kept close enough to compost and water but not occupying the most accessible Zone 1 space.',
                confidence: 0.90, warnings: [],
                bedLayoutSuggestion: makeBedLayoutFromPlants(['Cabbage', 'Carrot', 'Beetroot', 'Onion', 'Dill'], bed),
            });
        }
        // Note: no standalone Zone 2 raised bed — all veg rows are inside the Zone 1 Vegetable Garden portal above.

        // Z2-2. Berry patch (Zone 2, along main path)
        if ((wantBerryPatch || areaM2 >= 300) && !hasByCanon('berry_patch')) {
            const bPos = near(widthM * 0.18, heightM * 0.10, Math.min(8, widthM * 0.18), 4.0);
            proposed.push({
                action: 'create_new', catalogKey: 'berry_patch', canonicalType: 'berry_patch',
                type: 'structure', name: 'Berry Patch', targetZone: '2',
                variantStrategy: 'flow-access', strategyReason: 'Zone 2 — berries picked 2–3× per week in season along the main path.',
                strategyTags: ['weekly-harvest', 'zone-2', 'path-access'],
                x: bPos.x, y: bPos.y, width: bPos.width, height: 4.0, rotation: 0,
                plants: ['Raspberry', 'Strawberry', 'Currant'],
                reason: 'ZONE 2 (Flow & Access): berry patch along the main harvest path. Berries are picked every 2–3 days during fruiting season — placing them on a natural route makes picking effortless rather than a dedicated trip.',
                confidence: 0.88, warnings: [],
                detailPlan: { layoutType: 'berry-rows', suggestedPlants: ['Raspberry', 'Strawberry', 'Currant', 'Gooseberry'], notes: 'Harvest 2–3× per week in season.' },
            });
        }

        // Z2-3. Secondary path (if several productive elements)
        if (canAddPaths && areaM2 >= 500) {
            const sp = near(widthM * 0.15, -1, Math.min(widthM * 0.3, 25), 1.0);
            proposed.push({
                action: 'create_new', catalogKey: 'path', canonicalType: 'path',
                type: 'structure', name: 'Zone 2 Access Path', targetZone: '2',
                variantStrategy: 'flow-access', strategyReason: 'Connects Zone 2 productive areas to main harvest path.',
                strategyTags: ['path-access', 'zone-2'],
                x: sp.x, y: sp.y, width: sp.width, height: 1.0, rotation: 0, plants: [],
                reason: 'FLOW & ACCESS: secondary path connecting berry patch, raised beds and Zone 2 areas to the main harvest route. No productive area should require walking across dug ground to reach.',
                confidence: 0.87, warnings: [],
            });
        }

        // ── ZONE 3: farther areas, occasional visits ─────────────────────────

        // Z3-1. Orchard (Zone 3, if selected or large garden)
        if ((wantOrchard || areaM2 >= 1000) && !hasByCanon('orchard')) {
            const oPos = pos(0.50, 0.50, Math.min(14, widthM * 0.25), Math.min(10, heightM * 0.22));
            proposed.push({
                action: 'create_new', catalogKey: 'orchard', canonicalType: 'orchard',
                type: 'structure', name: 'Fruit Tree Orchard', targetZone: '3',
                variantStrategy: 'flow-access', strategyReason: 'Zone 3 — trees visited weekly, not daily; well-placed for seasonal harvests.',
                strategyTags: ['zone-3', 'outer-zone', 'weekly-harvest', 'low-maintenance'],
                x: oPos.x, y: oPos.y, width: oPos.width, height: oPos.height, rotation: 0,
                plants: ['Comfrey', 'Clover', 'Yarrow'],
                reason: 'ZONE 3 (Flow & Access): orchard placed in the outer zone — visited weekly for maintenance and harvesting. Fruit trees need less daily attention than annual beds, making Zone 3 placement efficient.',
                confidence: 0.86, warnings: ['Allow 5 m spacing between standard trees.'],
                detailPlan: {
                    layoutType: 'trees',
                    suggestedPlants: ['Apple (Ionatan)', 'Plum (Italian prune)', 'Pear (Williams)', 'Cherry (Morello)', 'Comfrey (Bocking 14)', 'Clover', 'Yarrow'],
                    notes: 'Underplant with comfrey and clover. Clear path from house. Marigolds at orchard edge.',
                },
            });
        }

        // Z3-2. Fruit tree guild (Zone 3, if guilds allowed)
        if (canAddGuilds && !hasByCanon('guild') && areaM2 >= 300) {
            const gPos = pos(0.62, 0.28, 6.0, 6.0);
            proposed.push({
                action: 'create_new', catalogKey: 'guild', canonicalType: 'guild',
                type: 'structure', name: 'Apple Guild', targetZone: '3',
                variantStrategy: 'flow-access', strategyReason: 'Zone 3 perennial guild — low-maintenance once established.',
                strategyTags: ['zone-3', 'low-maintenance', 'outer-zone'],
                x: gPos.x, y: gPos.y, width: 6.0, height: 6.0, rotation: 0,
                plants: ['Comfrey', 'Yarrow', 'Nasturtium', 'Clover'],
                reason: 'ZONE 3 (Flow & Access): perennial fruit tree guild — needs light maintenance only a few times a year. Once established it is self-mulching, self-fertilising and provides harvest with minimal labour.',
                confidence: 0.87, warnings: [],
                detailPlan: {
                    layoutType: 'guild-layers',
                    suggestedPlants: ['Apple (Ionatan)', 'Hazel', 'Comfrey (Bocking 14)', 'Yarrow', 'Nasturtium', 'Clover', 'Strawberry'],
                    notes: 'Apple canopy, hazel understory, comfrey herb layer, clover groundcover.',
                },
            });
        }

        // Z3-3. Pond (Zone 3)
        if (!hasPond && canAddPond) {
            const pondPos = pos(0.65, 0.62, 4.0, 4.0);
            proposed.push({
                action: 'create_new', catalogKey: 'pond', canonicalType: 'pond',
                type: 'water-feature', name: 'Garden Pond', targetZone: '3',
                variantStrategy: 'flow-access', strategyReason: 'Zone 3 — pond visited weekly, not daily.',
                strategyTags: ['zone-3', 'low-maintenance'],
                x: pondPos.x, y: pondPos.y, width: 4.0, height: 4.0, rotation: 0,
                plants: ['Yellow Flag Iris', 'Water Mint', 'Marsh Marigold'],
                reason: 'ZONE 3 (Flow & Access): pond placed in the outer zone where it is visited weekly for maintenance. Provides irrigation water and wildlife habitat without occupying the most accessible growing space.',
                confidence: 0.87,
                warnings: [waterGravityAvailable ? 'Slope data available — confirm at lowest point.' : 'Slope data missing — position estimated.'],
            });
        } else if (existingPond) {
            const ep = existingPond;
            const cp = clampToGarden(Math.max(0, ep.xM - 1), Math.max(0, ep.yM - 1), (ep.wM ?? 4) + 2, (ep.hM ?? 4) + 2, widthM, heightM);
            proposed.push({
                action: 'enhance_existing', targetElementId: ep.id,
                canonicalType: 'pond', enhancementType: 'pond_edge_access',
                type: 'planting-strip', name: 'Pond Margin Planting', targetZone: '3',
                variantStrategy: 'flow-access', strategyReason: 'Existing pond enhanced — Zone 3, weekly visits.',
                strategyTags: ['zone-3', 'low-maintenance'],
                x: cp.x, y: cp.y, width: cp.width, height: cp.height, rotation: 0,
                plants: ['Water Mint', 'Yellow Flag Iris', 'Marsh Marigold'],
                reason: 'ZONE 3 (Flow & Access): existing pond enhanced with marginal plants. Pond maintenance is weekly or monthly — in Zone 3 it does not impede daily Zone 1/2 work.',
                confidence: 0.92, warnings: [],
            });
        }

        // Z3-4. Meadow / low-mow strip (Zone 3 outer edge)
        if (areaM2 >= 500) {
            const meadowW = Math.max(4, widthM * 0.20);
            const mPos = pos(0.05, 0.30, meadowW, 3.0);
            proposed.push({
                action: 'create_new', catalogKey: 'wild_zone', canonicalType: 'wild_zone',
                type: 'structure', name: 'Low-Mow Meadow Strip', targetZone: '3',
                variantStrategy: 'flow-access', strategyReason: 'Zone 3 outer edge — one cut per year, no daily work.',
                strategyTags: ['zone-3', 'low-maintenance', 'outer-zone'],
                x: mPos.x, y: mPos.y, width: meadowW, height: 3.0, rotation: 0,
                plants: ['Red Clover', 'Yarrow', 'Cornflower', 'Field Poppy'],
                reason: 'ZONE 3 (Flow & Access): low-mow meadow on the outer edge — requires one cut per year, zero daily work. Clover fixes nitrogen; yarrow accumulates minerals.',
                confidence: 0.87, warnings: ['Mow in late August/September after seeds set.'],
            });
        }

        // Z3-5. Windbreak (outer boundary if wind issue or wind data)
        if (!hasByCanon('windbreak') && (canAddWindbreak || saved?.sectors?.dominantWind)) {
            const shadeEdge = northDirection;
            const hedgePos = shadeEdge === 'bottom'
                ? { x: 0, y: heightM - 2.0, width: widthM, height: 2.0 }
                : shadeEdge === 'right' ? { x: widthM - 2.0, y: 0, width: 2.0, height: heightM }
                    : shadeEdge === 'left' ? { x: 0, y: 0, width: 2.0, height: heightM }
                        : { x: 0, y: 0, width: widthM, height: 2.0 };
            proposed.push({
                action: 'create_new', catalogKey: 'windbreak', canonicalType: 'windbreak',
                type: 'structure', name: 'Boundary Windbreak Hedge', targetZone: '3',
                variantStrategy: 'flow-access', strategyReason: 'Zone 3 boundary — visited only for annual trimming.',
                strategyTags: ['zone-3', 'low-maintenance', 'outer-zone'],
                x: hedgePos.x, y: hedgePos.y, width: hedgePos.width, height: hedgePos.height, rotation: 0,
                plants: ['Hawthorn', 'Blackthorn', 'Hazel', 'Elderflower'],
                reason: `ZONE 3 (Flow & Access): windbreak hedge on the ${shadeEdge} boundary — outer zone, visited for fruit and trimming once or twice a year. Reduces wind speed without impeding access to productive zones.`,
                confidence: 0.91, warnings: ['Trim in late winter. Minimum 2 m wide for windbreak effect.'],
            });
        }
    }

    // ── SHARED: swale (both variants, if slope data or canAddSwales) ──────────
    if (canAddSwales || saved?.topography?.slopeType === 'gentle' || saved?.topography?.slopeType === 'steep') {
        const slopeFact = saved?.topography?.slopeType
            ? `Site analysis: ${saved.topography.slopeType} terrain${saved.topography.slopeDirection ? ` facing ${saved.topography.slopeDirection}` : ''} — swale on contour will intercept runoff`
            : null;
        const swalePos = clampToGarden(widthM * 0.08, heightM * 0.48, widthM * 0.80, 1.5, widthM, heightM);
        proposed.push({
            action: canAddSwales ? 'create_new' : 'recommendation_only',
            catalogKey: canAddSwales ? 'swale' : undefined,
            canonicalType: 'swale', type: 'water-feature',
            name: 'Contour Swale', targetZone: isVariantB ? '2' : '3',
            x: swalePos.x, y: swalePos.y, width: swalePos.width, height: 1.5, rotation: 0,
            plants: ['Comfrey', 'Yarrow'],
            reason: slopeFact
                ? `${slopeFact}. Reduces irrigation need by 30–50%.`
                : 'Contour swale captures rainwater runoff. Verify placement with on-site survey.',
            confidence: slopeFact ? 0.78 : 0.62,
            warnings: ['Verify exact contour line with A-frame or laser level before digging.'],
        });
    } else {
        proposed.push({
            action: 'recommendation_only', canonicalType: 'swale', type: 'water-feature',
            name: 'Contour Swale (recommended)', targetZone: '2',
            x: widthM * 0.10, y: heightM * 0.50, width: widthM * 0.80, height: 1.5,
            rotation: 0, plants: ['Comfrey', 'Yarrow'],
            reason: 'A contour swale would reduce irrigation need by 30–50%. Slope data missing — position illustrative.',
            confidence: 0.62, warnings: ['Add slope data to Site Analysis for accurate placement.'],
        });
    }

    // ── SHARED: food forest / orchard for large Variant A gardens ────────────
    if (!isVariantB && areaM2 >= 500) {
        const ffPos = clampToGarden(widthM * 0.50, heightM * 0.60, Math.min(12, widthM * 0.25), Math.min(10, heightM * 0.22), widthM, heightM);
        if ((wantOrchard || canAddOrchard) && !hasByCanon('orchard') && !proposed.some(p => p.canonicalType === 'orchard')) {
            proposed.push({
                action: 'create_new', catalogKey: 'orchard', canonicalType: 'orchard',
                type: 'structure', name: 'Mixed Fruit Orchard', targetZone: '3',
                variantStrategy: 'solar-priority', strategyReason: 'Solar Priority: placed accounting for sun and mature tree shade.',
                strategyTags: ['zone-3', 'outer-zone', 'low-maintenance'],
                x: ffPos.x, y: ffPos.y, width: ffPos.width, height: ffPos.height, rotation: 0,
                plants: ['Comfrey', 'Clover', 'Yarrow'],
                reason: `Solar Priority: orchard placed in Zone 3 with space for mature trees. Romanian varieties (Ionatan apple, Italian prune plum) are well adapted. Underplanted with comfrey and clover. ${saved?.sectors?.sunnyAreas ? 'Sunniest areas reserved for annual beds.' : 'Confirm mature tree shadow does not fall on annual beds.'}`,
                confidence: 0.84, warnings: ['Allow 5 m spacing. Consider semi-dwarf rootstocks.'],
                detailPlan: {
                    layoutType: 'trees',
                    suggestedPlants: ['Apple (Ionatan)', 'Plum (Italian prune)', 'Pear (Williams)', 'Cherry (Morello)', 'Comfrey (Bocking 14)', 'Clover', 'Yarrow'],
                    notes: 'Underplant with comfrey and clover. Marigolds at orchard edge for pest deterrence.',
                },
            });
        }
    }

    // ── SHARED: Herb garden for Variant A (if not already added by B) ─────────
    if (!isVariantB && (wantHerbGarden || canAddHerbGarden) && areaM2 >= 100 && !proposed.some(p => p.canonicalType === 'herb_garden')) {
        const hgPos = clampToGarden(Math.max(0, anchor.xM - 6), Math.max(0, anchor.yM - 2), Math.min(5, widthM * 0.10), 4.0, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'herb_garden', canonicalType: 'herb_garden',
            type: 'structure', name: 'Perennial Herb Garden', targetZone: '1',
            variantStrategy: 'solar-priority', strategyReason: 'Zone 1, partial shade is acceptable for perennial herbs.',
            strategyTags: ['zone-1', 'near-house', 'partial-shade'],
            x: hgPos.x, y: hgPos.y, width: hgPos.width, height: 4.0, rotation: 0,
            plants: ['Lovage', 'Dill', 'Parsley', 'Chives'],
            reason: 'Solar Priority: herb garden in Zone 1. Perennial herbs (lovage, thyme) tolerate partial shade; annual herbs (basil, dill) need good light. Placed so it does not shade sun-hungry beds.',
            confidence: 0.91, warnings: [],
            detailPlan: {
                layoutType: 'blocks',
                suggestedPlants: ['Lovage', 'Dill', 'Parsley', 'Basil', 'Thyme', 'Summer Savory', 'Chives', 'Mint (contained)'],
                notes: 'Lovage at back. Annual herbs in front. Mint in sunken pot.',
            },
        });
    }

    // ── SHARED: Crop-area-driven elements (both variants, based on cropAreas) ──
    // These generate named structural areas — NOT random individual plant placements.

    const alreadyHas = (key) => proposed.some(p => p.canonicalType === key || p.name?.toLowerCase().includes(key));

    if (wantPotatoes && !alreadyHas('potato') && areaM2 >= 200) {
        const pPos = isVariantB
            ? clampToGarden(anchor.xM + widthM * 0.25, heightM * 0.55, Math.min(8, widthM * 0.15), 6.0, widthM, heightM)
            : clampToGarden(widthM * 0.35, heightM * 0.60, Math.min(8, widthM * 0.15), 6.0, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'raised_bed', canonicalType: 'raised_bed',
            type: 'structure', name: 'Potato & Staple Crop Patch', targetZone: '3',
            variantStrategy: isVariantB ? 'flow-access' : 'solar-priority',
            strategyReason: isVariantB ? 'Zone 3 — potatoes visited weekly for hilling and harvest.' : 'Full sun required for maximum potato yield.',
            strategyTags: isVariantB ? ['zone-3', 'outer-zone', 'weekly-harvest'] : ['full-sun', 'zone-3'],
            x: pPos.x, y: pPos.y, width: pPos.width, height: 6.0, rotation: 0, plants: [],
            reason: `${isVariantB ? 'ZONE 3 (Flow & Access)' : 'Solar Priority'}: potato and staple crop patch. Potatoes are planted once and harvested in bulk — does not need to be close to the house. ${isVariantB ? 'Placed in Zone 3 to free up accessible Zone 1/2 space for daily-harvest crops.' : 'Placed in open sun for maximum yield.'}`,
            confidence: 0.86, warnings: [],
            detailPlan: { layoutType: 'rows', suggestedPlants: ['Potato (Désirée)', 'Potato (Red Emmalie)', 'Comfrey', 'Nasturtium'], notes: 'Plant in spring, harvest in autumn. Use comfrey leaves as mulch around plants.' },
        });
    }

    // Skip standalone crop beds when a Vegetable Garden portal already covers them
    const hasVegGarden = proposed.some(p => p.catalogKey === 'vegetable_garden');
    if (!hasVegGarden && wantCabbage && !alreadyHas('brassica') && !alreadyHas('cabbage') && areaM2 >= 100) {
        const cbPos = isVariantB ? near(widthM * 0.12, 5, 3.5, 1.2) : clampToGarden(widthM * sunnyPos.xFrac + 4, heightM * sunnyPos.yFrac + 2.5, 3.5, 1.2, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'raised_bed', canonicalType: 'raised_bed',
            type: 'structure', name: 'Brassica Bed', targetZone: isVariantB ? '2' : '1',
            variantStrategy: isVariantB ? 'flow-access' : 'solar-priority',
            strategyReason: isVariantB ? 'Zone 2 — cabbages checked every few days.' : 'Full sun placement for brassica yield.',
            strategyTags: isVariantB ? ['zone-2', 'weekly-harvest'] : ['full-sun', 'zone-1'],
            x: cbPos.x, y: cbPos.y, width: 3.5, height: 1.2, rotation: 0, plants: ['Dill', 'Marigold'],
            reason: `${isVariantB ? 'ZONE 2 (Flow & Access): brassica bed at medium distance' : 'Solar Priority: brassica bed in full-sun area'}. Cabbage, kale and kohlrabi for fresh eating, sauerkraut and winter storage.`,
            confidence: 0.85, warnings: [],
            detailPlan: { layoutType: 'rows', suggestedPlants: ['Cabbage (Varză)', 'Kale', 'Kohlrabi', 'Dill', 'Marigold'], notes: 'Plant dill between rows as companion. Marigold at edges deters pests.' },
        });
    }

    if (!hasVegGarden && wantRoots && !alreadyHas('root crop') && areaM2 >= 100) {
        const rcPos = isVariantB ? near(widthM * 0.08, 8, 3.5, 1.2) : clampToGarden(widthM * sunnyPos.xFrac, heightM * sunnyPos.yFrac + 3, 3.5, 1.2, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'raised_bed', canonicalType: 'raised_bed',
            type: 'structure', name: 'Root Crop Bed', targetZone: isVariantB ? '2' : '1',
            variantStrategy: isVariantB ? 'flow-access' : 'solar-priority',
            strategyReason: isVariantB ? 'Zone 2 — root crops pulled when needed, not daily.' : 'Partial shade acceptable for root crops.',
            strategyTags: isVariantB ? ['zone-2', 'weekly-harvest'] : ['partial-shade', 'zone-1'],
            x: rcPos.x, y: rcPos.y, width: 3.5, height: 1.2, rotation: 0, plants: ['Parsley Root'],
            reason: `${isVariantB ? 'ZONE 2 (Flow & Access): root crop bed at medium distance from house' : 'Solar Priority: root crops tolerate partial shade'}. Carrots, parsley root, beetroot and celery root — Romanian soup staples.`,
            confidence: 0.85, warnings: [],
            detailPlan: { layoutType: 'rows', suggestedPlants: ['Carrot', 'Parsley Root', 'Beetroot', 'Celery Root', 'Radish'], notes: 'Succession sow carrots every 3 weeks. Parsley root at back (taller). Radish as quick catch crop.' },
        });
    }

    if (wantVineyard && !alreadyHas('vineyard') && !alreadyHas('grape') && areaM2 >= 100) {
        const vPos = isVariantB ? pos(0.70, 0.20, 8.0, 2.0) : clampToGarden(widthM * sunnyPos.xFrac, heightM * 0.05, 8.0, 2.0, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'guild', canonicalType: 'guild',
            type: 'structure', name: 'Grape Vine Trellis', targetZone: isVariantB ? '3' : '2',
            variantStrategy: isVariantB ? 'flow-access' : 'solar-priority',
            strategyReason: isVariantB ? 'Zone 3 — grapes harvested in autumn bulk, not daily.' : 'Full sun essential for grape sugar development.',
            strategyTags: isVariantB ? ['zone-3', 'outer-zone'] : ['full-sun', 'shade-avoidance'],
            x: vPos.x, y: vPos.y, width: 8.0, height: 2.0, rotation: 0, plants: ['Clover', 'Nasturtium'],
            reason: `${isVariantB ? 'ZONE 3 (Flow & Access): grape trellis in outer zone' : 'Solar Priority: grape vine on sunniest boundary wall or fence'}. Grapes need maximum sun for fruit ripening and good airflow to prevent disease.`,
            confidence: 0.84, warnings: ['Ensure good airflow to prevent mildew. Prune in late winter.'],
            detailPlan: { layoutType: 'rows', suggestedPlants: ['Grape (Viță de vie)', 'Clover (underplant)', 'Nasturtium'], notes: 'Train along wire trellis. Prune to 2 buds per spur in February.' },
        });
    }

    if (wantMedicinal && !alreadyHas('medicinal') && !alreadyHas('pollinator') && areaM2 >= 100) {
        const mpPos = isVariantB ? pos(0.55, 0.18, Math.max(4, widthM * 0.15), 2.5) : clampToGarden(anchor.xM - 5, anchor.yM + 1, Math.max(4, widthM * 0.12), 2.0, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'herb_garden', canonicalType: 'herb_garden',
            type: 'structure', name: 'Medicinal & Pollinator Strip', targetZone: '2',
            variantStrategy: isVariantB ? 'flow-access' : 'solar-priority',
            strategyReason: isVariantB ? 'Zone 2 — along path for easy access when harvesting flowers.' : 'Full sun for medicinal flower potency.',
            strategyTags: isVariantB ? ['zone-2', 'path-access'] : ['full-sun', 'zone-2'],
            x: mpPos.x, y: mpPos.y, width: mpPos.width, height: 2.5, rotation: 0,
            plants: ['Calendula', 'Yarrow', 'Chamomile', 'Lavender'],
            reason: `${isVariantB ? 'ZONE 2 (Flow & Access): medicinal and pollinator strip along the path' : 'Solar Priority: medicinal flowers need full sun for potency'}. Calendula, yarrow, chamomile and lavender for teas, tinctures and pollinator support.`,
            confidence: 0.87, warnings: [],
            detailPlan: { layoutType: 'blocks', suggestedPlants: ['Calendula (Gălbenele)', 'Yarrow (Coada șoricelului)', 'Chamomile', 'Lavender', 'Borage'], notes: 'Harvest flowers in the morning. Dry for teas. Lavender at edge for border structure.' },
        });
    }

    // ── SHARED: Animal-driven elements ────────────────────────────────────────

    if ((hasChickens || hasDucks) && !hasCoop && canAddCoop) {
        const coopPos = isVariantB
            ? pos(0.75, 0.65, 3.0, 3.0)  // Zone 3 for Flow & Access
            : clampToGarden(widthM * 0.78, heightM * 0.68, 3.0, 3.0, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'coop', canonicalType: 'coop',
            type: 'structure', name: hasChickens ? 'Chicken Coop & Run' : 'Duck House & Pond Area', targetZone: isVariantB ? '3' : '2',
            variantStrategy: isVariantB ? 'flow-access' : 'solar-priority',
            strategyReason: isVariantB ? 'Zone 3 — coop visited once or twice daily for feeding and egg collection.' : 'Placed away from main sun-sensitive beds.',
            strategyTags: isVariantB ? ['zone-3', 'weekly-harvest'] : ['zone-3', 'outer-zone'],
            x: coopPos.x, y: coopPos.y, width: 3.0, height: 3.0, rotation: 0, plants: [],
            reason: `${isVariantB ? 'ZONE 3 (Flow & Access)' : 'Outer zone'}: ${hasChickens ? 'chicken' : 'duck'} coop placed in Zone 3. ${hasChickens ? 'Chickens' : 'Ducks'} need feeding and egg collection once or twice a day — a short, defined path to the coop makes this a quick routine. Placed near orchard for integrated pest control.`,
            confidence: 0.88, warnings: ['Plan rotational run system. Direct coop door away from prevailing wind.'],
        });
    }

    if (hasBees && !hasByCanon('beehive')) {
        const bhPos = isVariantB ? pos(0.70, 0.15, 1.0, 1.0) : clampToGarden(widthM * 0.75, heightM * 0.20, 1.0, 1.0, widthM, heightM);
        proposed.push({
            action: 'create_new', catalogKey: 'beehive', canonicalType: 'beehive',
            type: 'structure', name: 'Beehive (Langstroth)', targetZone: '2',
            variantStrategy: isVariantB ? 'flow-access' : 'solar-priority',
            strategyReason: isVariantB ? 'Zone 2 — near pollinator-rich areas but clear of daily harvest path.' : 'Sun-facing entrance for winter cluster warmth.',
            strategyTags: isVariantB ? ['zone-2', 'weekly-harvest'] : ['full-sun', 'zone-2'],
            x: bhPos.x, y: bhPos.y, width: 1.0, height: 1.0, rotation: 0, plants: [],
            reason: `${isVariantB ? 'ZONE 2 (Flow & Access)' : 'Solar Priority'}: beehive near flowering crops. Bees increase pollination 20–30% and provide honey. Face entrance south-east. Place 5+ m from main daily paths for safety.`,
            confidence: 0.90, warnings: ['Keep 5 m from daily paths. Ensure water source within 50 m.'],
        });
        // Add pollinator strip near beehive
        if (!alreadyHas('pollinator') && !alreadyHas('medicinal')) {
            const psPos = isVariantB ? pos(0.60, 0.12, Math.max(3, widthM * 0.12), 2.0) : clampToGarden(widthM * 0.65, heightM * 0.18, Math.max(3, widthM * 0.12), 2.0, widthM, heightM);
            proposed.push({
                action: 'create_new', catalogKey: 'herb_garden', canonicalType: 'herb_garden',
                type: 'structure', name: 'Bee Forage & Pollinator Strip', targetZone: '2',
                variantStrategy: isVariantB ? 'flow-access' : 'solar-priority',
                strategyReason: isVariantB ? 'Near beehive in Zone 2 — bee forage close to hive reduces flight distance.' : 'Full sun for nectar-rich flowers.',
                strategyTags: isVariantB ? ['zone-2', 'path-access'] : ['full-sun', 'zone-2'],
                x: psPos.x, y: psPos.y, width: psPos.width, height: 2.0, rotation: 0,
                plants: ['Phacelia', 'Borage', 'Lavender', 'Clover'],
                reason: `Bee forage strip near the hive. Phacelia, borage, lavender and clover provide nectar across the whole season. Reduces foraging distance from the hive.`,
                confidence: 0.88, warnings: [],
                detailPlan: { layoutType: 'blocks', suggestedPlants: ['Phacelia (Facelia)', 'Borage (Limba mielului)', 'Lavender (Lavandă)', 'Clover (Trifoi)', 'Calendula'], notes: 'Stagger planting for continuous bloom April–October.' },
            });
        }
    }

    if (hasDucks && !hasPond && canAddPond && !proposed.some(p => p.canonicalType === 'pond')) {
        const dpPos = pos(0.60, 0.60, 3.0, 3.0);
        proposed.push({
            action: 'create_new', catalogKey: 'pond', canonicalType: 'pond',
            type: 'water-feature', name: 'Duck Pond', targetZone: '3',
            variantStrategy: isVariantB ? 'flow-access' : 'solar-priority',
            strategyReason: isVariantB ? 'Zone 3 — duck pond visited daily for duck welfare but placed away from kitchen beds.' : 'Placed at lower point away from sun-sensitive beds.',
            strategyTags: isVariantB ? ['zone-3', 'daily-harvest'] : ['zone-3', 'low-point'],
            x: dpPos.x, y: dpPos.y, width: 3.0, height: 3.0, rotation: 0,
            plants: ['Water Mint', 'Yellow Flag Iris'],
            reason: 'Duck pond integrated with the duck house. Ducks need water for swimming and bathing — a small pond reduces duck stress, keeps feathers healthy and drains provide fertility for nearby plants.',
            confidence: 0.87, warnings: ['Slope edges gently. Drain occasionally for pond-muck fertiliser.'],
        });
    }

    // ── SHARED: Target count enforcement ─────────────────────────────────────
    // After all variant-specific and crop/animal elements, ensure the minimum
    // actionable element count is met with sensible fallback elements.

    const actionable = () => proposed.filter(p => p.action !== 'recommendation_only');
    const usedNames = () => new Set(proposed.map(p => p.name));
    const usedKeys = () => new Set(proposed.map(p => p.catalogKey).filter(Boolean));

    const fallbackCandidates = [
        {
            name: 'Main Harvest Path', catalogKey: 'path', canonicalType: 'path',
            cond: () => canAddPaths && !usedKeys().has('path'),
            make: () => {
                const p = clampToGarden(Math.max(0, anchor.xM - 1), anchor.yM + 1, Math.min(widthM * 0.30, 20), 1.0, widthM, heightM);
                return { action: 'create_new', catalogKey: 'path', canonicalType: 'path', type: 'structure', name: 'Main Harvest Path', targetZone: '1', variantStrategy: isVariantB ? 'flow-access' : 'solar-priority', strategyTags: ['path-access', 'zone-1'], x: p.x, y: p.y, width: p.width, height: 1.0, rotation: 0, plants: [], reason: 'Main harvest path from house to all productive areas — prevents soil compaction and allows all-weather access.', confidence: 0.93, warnings: [] };
            },
        },
        {
            name: 'Daily Salad Bed', catalogKey: 'raised_bed', canonicalType: 'raised_bed',
            cond: () => canAddRaisedBed && !usedKeys().has('raised_bed'),
            make: () => {
                const b = clampToGarden(anchor.xM + 2, anchor.yM + 2, 3.5, 1.2, widthM, heightM);
                return { action: 'create_new', catalogKey: 'raised_bed', canonicalType: 'raised_bed', type: 'structure', name: 'Daily Salad Bed', targetZone: '1', variantStrategy: isVariantB ? 'flow-access' : 'solar-priority', strategyTags: isVariantB ? ['zone-1', 'daily-harvest'] : ['full-sun', 'zone-1'], x: b.x, y: b.y, width: 3.5, height: 1.2, rotation: 0, plants: ['Marigold'], reason: 'Zone 1 raised bed for daily salad and herb harvest. Cut-and-come-again crops within arm\'s reach of the kitchen.', confidence: 0.92, warnings: [], detailPlan: { layoutType: 'rows', suggestedPlants: ['Lettuce', 'Spinach', 'Radish', 'Chives', 'Parsley'], notes: 'Daily harvest salad mix.' } };
            },
        },
        {
            name: 'Compost Hub', catalogKey: 'compost', canonicalType: 'compost',
            cond: () => canAddCompost && !hasCompost,
            make: () => {
                const c = clampToGarden(anchor.xM + 2, anchor.yM + 6, 2.0, 2.0, widthM, heightM);
                return { action: 'create_new', catalogKey: 'compost', canonicalType: 'compost', type: 'structure', name: 'Compost Hub', targetZone: '1', variantStrategy: isVariantB ? 'flow-access' : 'solar-priority', strategyTags: ['zone-1', 'near-house'], x: c.x, y: c.y, width: 2.0, height: 2.0, rotation: 0, plants: ['Comfrey'], reason: 'Zone 1 compost hub near kitchen beds. Short carrying distance for scraps and finished compost.', confidence: 0.96, warnings: [] };
            },
        },
        {
            name: 'Kitchen Herb Garden', catalogKey: 'herb_garden', canonicalType: 'herb_garden',
            cond: () => !proposed.some(p => p.canonicalType === 'herb_garden'),
            make: () => {
                const h = clampToGarden(Math.max(0, anchor.xM - 6), Math.max(0, anchor.yM - 2), Math.min(4, widthM * 0.08), 3.0, widthM, heightM);
                return { action: 'create_new', catalogKey: 'herb_garden', canonicalType: 'herb_garden', type: 'structure', name: 'Kitchen Herb Garden', targetZone: '1', variantStrategy: isVariantB ? 'flow-access' : 'solar-priority', strategyTags: ['zone-1', 'daily-harvest', 'near-house'], x: h.x, y: h.y, width: h.width, height: 3.0, rotation: 0, plants: ['Lovage', 'Dill', 'Parsley'], reason: 'Zone 1 herb garden next to kitchen. Daily culinary herbs within arm\'s reach.', confidence: 0.91, warnings: [], detailPlan: { layoutType: 'blocks', suggestedPlants: ['Lovage', 'Dill', 'Parsley', 'Basil', 'Chives'], notes: 'Perennial herbs at back, annuals in front.' } };
            },
        },
        {
            name: 'Berry Patch', catalogKey: 'berry_patch', canonicalType: 'berry_patch',
            cond: () => !hasByCanon('berry_patch') && areaM2 >= 200,
            make: () => {
                const bp = clampToGarden(anchor.xM + widthM * 0.15, anchor.yM + heightM * 0.10, Math.min(8, widthM * 0.15), 4.0, widthM, heightM);
                return { action: 'create_new', catalogKey: 'berry_patch', canonicalType: 'berry_patch', type: 'structure', name: 'Berry Patch', targetZone: '2', variantStrategy: isVariantB ? 'flow-access' : 'solar-priority', strategyTags: isVariantB ? ['zone-2', 'path-access'] : ['full-sun', 'zone-2'], x: bp.x, y: bp.y, width: bp.width, height: 4.0, rotation: 0, plants: ['Raspberry', 'Strawberry', 'Currant'], reason: 'Zone 2 berry patch — raspberries, strawberries and currants for fresh eating, jam and winter freezing.', confidence: 0.87, warnings: [], detailPlan: { layoutType: 'berry-rows', suggestedPlants: ['Raspberry', 'Strawberry', 'Currant', 'Gooseberry'], notes: 'Harvest 2–3× per week in season.' } };
            },
        },
        {
            name: 'Fruit Tree Orchard', catalogKey: 'orchard', canonicalType: 'orchard',
            cond: () => !hasByCanon('orchard') && areaM2 >= 400 && !proposed.some(p => p.canonicalType === 'orchard'),
            make: () => {
                const op = clampToGarden(widthM * 0.50, heightM * 0.50, Math.min(14, widthM * 0.25), Math.min(10, heightM * 0.22), widthM, heightM);
                return { action: 'create_new', catalogKey: 'orchard', canonicalType: 'orchard', type: 'structure', name: 'Fruit Tree Orchard', targetZone: '3', variantStrategy: isVariantB ? 'flow-access' : 'solar-priority', strategyTags: isVariantB ? ['zone-3', 'low-maintenance'] : ['zone-3', 'outer-zone'], x: op.x, y: op.y, width: op.width, height: op.height, rotation: 0, plants: ['Comfrey', 'Clover'], reason: 'Zone 3 orchard — apple, pear, plum and cherry. Long-term perennial harvest needing weekly not daily attention.', confidence: 0.84, warnings: ['Allow 5 m spacing.'], detailPlan: { layoutType: 'trees', suggestedPlants: ['Apple (Ionatan)', 'Plum (Italian prune)', 'Pear (Williams)', 'Cherry (Morello)', 'Comfrey (Bocking 14)', 'Clover'], notes: 'Underplant with comfrey and clover.' } };
            },
        },
        {
            name: 'Zone 2 Access Path', catalogKey: 'path', canonicalType: 'path',
            cond: () => canAddPaths && isVariantB && areaM2 >= 400,
            make: () => {
                const sp = clampToGarden(anchor.xM + widthM * 0.15, Math.max(0, anchor.yM - 1), Math.min(widthM * 0.25, 20), 1.0, widthM, heightM);
                return { action: 'create_new', catalogKey: 'path', canonicalType: 'path', type: 'structure', name: 'Zone 2 Access Path', targetZone: '2', variantStrategy: 'flow-access', strategyTags: ['path-access', 'zone-2'], x: sp.x, y: sp.y, width: sp.width, height: 1.0, rotation: 0, plants: [], reason: 'Flow & Access: Zone 2 path connecting berry patch, raised beds and medium-distance productive areas to the main harvest route.', confidence: 0.86, warnings: [] };
            },
        },
        {
            name: 'Perennial Food Forest', catalogKey: 'food_forest', canonicalType: 'food_forest',
            cond: () => canAddFoodForest && !proposed.some(p => p.canonicalType === 'food_forest') && areaM2 >= 800,
            make: () => {
                const fp = clampToGarden(isVariantB ? widthM * 0.35 : widthM * 0.50, isVariantB ? heightM * 0.55 : heightM * 0.60, Math.min(16, widthM * 0.30), Math.min(12, heightM * 0.25), widthM, heightM);
                return { action: 'create_new', catalogKey: 'food_forest', canonicalType: 'food_forest', type: 'structure', name: 'Perennial Food Forest', targetZone: '3', variantStrategy: isVariantB ? 'flow-access' : 'solar-priority', strategyTags: ['zone-3', 'low-maintenance', 'outer-zone'], x: fp.x, y: fp.y, width: fp.width, height: fp.height, rotation: 0, plants: ['Comfrey', 'Yarrow', 'Clover'], reason: 'Zone 3–4 food forest — perennial layers requiring minimal maintenance once established. Visits weekly or less.', confidence: 0.84, warnings: ['Allow 3–5 years for establishment.'], detailPlan: { layoutType: 'guild-layers', suggestedPlants: ['Apple (Ionatan)', 'Pear (Williams)', 'Hazel', 'Elderflower', 'Raspberry', 'Comfrey (Bocking 14)', 'Yarrow', 'Clover', 'Strawberry'], notes: 'Canopy: apple, pear. Understory: hazel, elder. Shrub: raspberry. Herb: comfrey, yarrow. Groundcover: clover, strawberry.' } };
            },
        },
        {
            name: 'Pollinator Strip', catalogKey: 'herb_garden', canonicalType: 'herb_garden',
            cond: () => !alreadyHas('pollinator') && !alreadyHas('medicinal') && !alreadyHas('bee forage'),
            make: () => {
                const psPos = clampToGarden(anchor.xM - 5, anchor.yM + 2, Math.max(3, widthM * 0.10), 1.5, widthM, heightM);
                return { action: 'create_new', catalogKey: 'herb_garden', canonicalType: 'herb_garden', type: 'structure', name: 'Pollinator Strip', targetZone: '2', variantStrategy: isVariantB ? 'flow-access' : 'solar-priority', strategyTags: isVariantB ? ['zone-2', 'path-access'] : ['full-sun', 'zone-2'], x: psPos.x, y: psPos.y, width: psPos.width, height: 1.5, rotation: 0, plants: ['Calendula', 'Borage', 'Lavender', 'Marigold'], reason: 'Pollinator strip alongside vegetable beds. Calendula, borage and marigold attract beneficial insects and improve crop pollination.', confidence: 0.87, warnings: [], detailPlan: { layoutType: 'blocks', suggestedPlants: ['Calendula', 'Borage', 'Marigold', 'Lavender', 'Phacelia'], notes: 'Self-seeding border. Deadhead regularly to extend bloom.' } };
            },
        },
    ];

    // Enforce minimum actionable element count
    for (const fb of fallbackCandidates) {
        if (actionable().length >= target.max) break;
        if (!fb.cond()) continue;
        if (usedNames().has(fb.name)) continue;
        const el = fb.make();
        if (el) proposed.push(el);
    }

    // ── Household food strategy (for plan narrative) ─────────────────────────
    const hhStrategy = deriveHouseholdFoodStrategy(layoutSnapshot, genReq);

    // ── Plan narrative ────────────────────────────────────────────────────────
    const variantLabel = isVariantB ? 'Flow & Access' : 'Solar Priority';
    const zoneWord = zones.length === 1 ? 'zone' : 'zones';
    const itemWord = overlayItems.length === 1 ? 'structure' : 'structures';
    const bedCount = existingBeds.length;

    const planNarrative = `## Permaculture Plan — Variant ${variantType}: ${variantLabel}

**Site Overview**
Your garden covers ${widthM} m × ${heightM} m (${areaM2} m²) with ${zones.length} defined planting ${zoneWord} and ${overlayItems.length} existing ${itemWord}${bedCount > 0 ? ` including ${bedCount} raised bed(s)` : ''}. North is set to the **${northDirection}** of the map; the sunniest side is the **${sunEdge}** edge.

**Variant Focus**
${isVariantB
            ? `This plan uses a **Flow & Access** spatial strategy. Elements are positioned by visit frequency: daily-use crops, herbs and compost are in Zone 1 (close to the house), main vegetable beds and berries in Zone 2, and orchard, guilds and low-maintenance systems in Zone 3. Paths connect all productive areas. The goal is to minimise daily walking effort and make every element easy to reach and use.`
            : `This plan uses a **Solar Priority** spatial strategy. The ${sunEdge}-facing side of the garden (highest direct sun) is reserved for demanding crops — tomatoes, peppers, greenhouse production and summer annuals. Partial-shade areas are used for root crops, leafy greens, herbs and currants. Tall structures are placed so they do not cast shade on sun-sensitive beds.${saved?.sectors?.sunnyAreas ? ` Site Analysis confirms sunny areas: ${saved.sectors.sunnyAreas}.` : ' Sun-based placement estimated from North direction — add sun sector data to Site Analysis for higher accuracy.'}`}
${waterGravityAvailable ? `\n**Water & Gravity note:** Slope or water flow data detected in Site Analysis. A Water & Gravity strategy can be applied as a future refinement — swales on contour, pond at low point, drought-tolerant crops higher up.` : ''}

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
` : ''}${hhStrategy ? `**Food Needs Strategy**
${hhStrategy.householdSize ? `Supporting ${hhStrategy.householdSize} people — coverage goal: ${hhStrategy.coverageGoal}. Realism: ${hhStrategy.realism}. Estimated intensity: ${hhStrategy.estimatedIntensity}. Bed target: ${hhStrategy.bedCountTarget}.` : `Coverage goal: ${hhStrategy.coverageGoal}.`}
${hhStrategy.recommendations.map(r => `• ${r}`).join('\n')}
${hhStrategy.warnings.length ? hhStrategy.warnings.map(w => `⚠ ${w}`).join('\n') : ''}
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
            generationRequest = {},
            variantType = 'A',
            variantStrategy = variantType === 'B' ? 'flow-access' : 'solar-priority',
        } = req.body;

        // Load the current layout so we can snapshot it
        const layout = await gardenLayoutModel.findOne({ userId });
        const layoutSnapshot = layout
            ? { zones: layout.zones, setup: layout.setup, overlayItems: layout.overlayItems || [], bedLayouts: layout.bedLayouts || {}, zoneItems: layout.zoneItems || {} }
            : {};

        // All location / site data comes from saved layout — never from the request body
        const savedSiteAnalysis = layout?.siteAnalysis || null;
        const mergedLocation = {
            country: layout?.setup?.country || '',
            city: '',
            latitude: null,
            longitude: null,
            altitude: savedSiteAnalysis?.climate?.altitude
                ? parseFloat(savedSiteAnalysis.climate.altitude) || null
                : null,
            hardinessZone: savedSiteAnalysis?.climate?.climateZone || layout?.setup?.hardinessZone || '',
            climateNotes: layout?.setup?.climate || '',
            northDirection: savedSiteAnalysis?.sectors?.northDirection || layout?.setup?.northDirection || 'top',
        };

        // Map generationRequest into userRequirements for buildPermacultureContext.
        // Backward-compatible: accepts both new cropPreferences and old plantPreferences.
        const cropPrefs = generationRequest.cropPreferences || {};
        const plantPrefs = generationRequest.plantPreferences || {};
        const animalPrefs = generationRequest.animalPreferences || {};
        const allowed = generationRequest.allowedAdditions || {};
        const householdNeeds = generationRequest.householdNeeds || { foodCoverageGoal: 'supplement' };

        // Merge preferred plants from all sources, deduped (Part 1 fix)
        const mainCrops = cropPrefs.selectedMainCrops || [];
        const prioritized = cropPrefs.prioritizePlants || plantPrefs.prioritizePlants || [];
        // Derive crop names from active cropAreas (so Romania crop selections always reach AI)
        const cropAreaNames = (() => {
            const ca = cropPrefs.cropAreas || {};
            const map = { potatoes: 'Potato', tomatoesInGreenhouse: 'Tomato', cabbage: 'Cabbage', carrots: 'Carrot', onionsGarlic: 'Onion,Garlic', beansPeas: 'Bean,Pea', cornPumpkin: 'Corn,Pumpkin', saladGreens: 'Lettuce,Spinach', herbs: 'Parsley,Dill,Lovage,Basil', berryPatch: 'Raspberry,Strawberry,Currant', orchard: 'Apple,Pear,Plum,Cherry', vineyard: 'Grape', medicinalFlowers: 'Calendula,Marigold,Lavender' };
            return Object.entries(ca).filter(([, v]) => v).flatMap(([k]) => (map[k] || '').split(',').filter(Boolean));
        })();
        const preferredPlants = [...new Set([...mainCrops, ...prioritized, ...cropAreaNames])];
        const excludedPlants = cropPrefs.avoidPlants || plantPrefs.avoidPlants || generationRequest.excludedPlants || [];

        // Build an animal context note for the AI
        const animalNote = (() => {
            const animals = animalPrefs.animals || [];
            if (!animals.length) return '';
            const having = animals.filter(a => a.status === 'have').map(a => a.type);
            const wanting = animals.filter(a => a.status === 'want' || a.status === 'maybe').map(a => a.type);
            const parts = [];
            if (having.length) parts.push(`User currently has: ${having.join(', ')}`);
            if (wanting.length) parts.push(`User wants to add: ${wanting.join(', ')}`);
            if (animalPrefs.manureManagement) parts.push('manure composting required');
            if (animalPrefs.rotationalGrazing) parts.push('rotational grazing planned');
            return parts.join('; ');
        })();

        // Crop areas summary for context (only active areas listed)
        const cropAreaNote = (() => {
            const areas = cropPrefs.cropAreas || {};
            const active = Object.entries(areas).filter(([, v]) => v).map(([k]) => k);
            return active.length ? `Crop areas requested: ${active.join(', ')}` : '';
        })();

        // Household food needs note
        const householdNote = (() => {
            if (!householdNeeds.householdSize) return '';
            const parts = [`Food needs: garden should support ${householdNeeds.householdSize} people`];
            if (householdNeeds.adults || householdNeeds.children)
                parts.push(`(${householdNeeds.adults || '?'} adults, ${householdNeeds.children || '?'} children)`);
            parts.push(`Coverage goal: ${householdNeeds.foodCoverageGoal}`);
            const presActive = Object.entries(householdNeeds.preservationGoals || {}).filter(([, v]) => v).map(([k]) => k);
            if (presActive.length) parts.push(`Preservation goals: ${presActive.join(', ')}`);
            const catActive = Object.entries(householdNeeds.foodCategories || {}).filter(([, v]) => v).map(([k]) => k);
            if (catActive.length) parts.push(`Food categories: ${catActive.join(', ')}`);
            if (householdNeeds.dietNotes?.trim()) parts.push(`Diet notes: ${householdNeeds.dietNotes.trim()}`);
            return parts.join('. ');
        })();

        const userRequirements = {
            freeText: [
                generationRequest.taskType ? `Task: ${generationRequest.taskType}` : '',
                generationRequest.changeLevel ? `Change level: ${generationRequest.changeLevel}` : '',
                householdNote,
                animalNote,
                cropAreaNote,
                generationRequest.notes || '',
            ].filter(Boolean).join('. '),
            goals: [generationRequest.designFocus].filter(Boolean),
            focusAreas: [generationRequest.taskType].filter(Boolean),
            preferredPlants,
            excludedPlants,
        };

        // Build rich context object (synchronous analysis — no external calls)
        const { context: sourceContext } = await buildPermacultureContext({
            userId,
            layout: layoutSnapshot,
            userRequirements,
            locationContext: mergedLocation,
            generationRequest,
            variantType,
            variantStrategy,
        });

        // Attach saved site analysis — also set generationRequest explicitly in case
        // buildPermacultureContext did not yet propagate it to the returned context.
        if (savedSiteAnalysis) sourceContext.savedSiteAnalysis = savedSiteAnalysis;
        if (!sourceContext.generationRequest) sourceContext.generationRequest = generationRequest;
        if (!sourceContext.variantType) sourceContext.variantType = variantType;
        if (!sourceContext.variantStrategy) sourceContext.variantStrategy = variantStrategy;

        // Build and attach the structured site analysis summary
        const siteAnalysisSummary = buildSiteAnalysisSummary(
            savedSiteAnalysis,
            sourceContext.existingElements
        );
        if (siteAnalysisSummary) sourceContext.siteAnalysisSummary = siteAnalysisSummary;

        // Derive and attach household food strategy
        const householdFoodStrategy = deriveHouseholdFoodStrategy(layoutSnapshot, generationRequest);
        if (householdFoodStrategy) sourceContext.householdFoodStrategy = householdFoodStrategy;

        // ── Try AI, fall back to rule-based mock ─────────────────────────────
        // Inject variant type + strategy into sourceContext for AI prompt.
        const sourceContextWithVariant = { ...(sourceContext || {}), variantType, variantStrategy };

        let rawPlan = null;
        let usedFallback = false;
        let aiSource = 'ai';
        let aiResult = null;

        try {
            aiResult = await generatePermaculturePlanWithAI(sourceContextWithVariant);
        } catch (err) {
            console.error('[generateDraft] AI generation error:', err.message);
            aiResult = { plan: null, error: err.message, aiWasCalled: true };
        }

        rawPlan = aiResult?.plan || null;

        if (rawPlan) {
            console.log('[generateDraft] using AI plan');
        } else if (aiResult?.error && aiResult?.aiWasCalled && !aiResult?.plan) {
            // AI was called and charged but returned unusable output — do NOT silently mock.
            console.error(`[generateDraft] AI was called but failed: ${aiResult.error}`);
            return res.status(502).json({
                success: false,
                message: aiResult.error,
                aiWasCalled: true,
                chargedLikely: true,
                truncated: aiResult.truncated || false,
                hint: 'Retry generation, or set ALLOW_AI_MOCK_FALLBACK=true to use a rule-based draft when AI fails.',
            });
        } else {
            // AI was disabled / key missing / provider not called — mock fallback is safe
            console.log(`[generateDraft] AI unavailable, using mock (variant=${variantType})`);
            rawPlan = buildMockDraft(layoutSnapshot, userRequirements, mergedLocation, sourceContextWithVariant, variantType, variantStrategy);
            usedFallback = true;
            aiSource = 'mock';
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

        // ── Normalise elements + schema validation ────────────────────────────
        {
            const gardenSetup = layoutSnapshot?.setup || {};

            // 1. Normalise each element (clamp, defaults, type coercion, detailPlan)
            rawPlan = {
                ...rawPlan,
                proposedElements: rawPlan.proposedElements.map(
                    el => normalizeGeneratedElement(el, gardenSetup)
                ),
            };

            // 2. Schema-level validation (type checks, dimension rules, structural-not-plant)
            const planValidation = validatePermaculturePlan(rawPlan);
            if (!planValidation.valid) {
                console.warn(
                    `[generateDraft] Schema validation warnings (${planValidation.errors.length} errors):\n` +
                    planValidation.errors.slice(0, 10).map(e => `  • ${e}`).join('\n')
                );
            }
            if (planValidation.warnings.length > 0) {
                console.log(
                    `[generateDraft] Schema warnings (${planValidation.warnings.length}):\n` +
                    planValidation.warnings.slice(0, 5).map(w => `  – ${w}`).join('\n')
                );
            }

            // 3. Overlap resolution (shift or downgrade to recommendation_only)
            const existingItems = layoutSnapshot?.overlayItems || [];
            const { resolved, skipped } = resolvePlanElementOverlaps(
                rawPlan.proposedElements,
                gardenSetup,
                existingItems
            );
            if (skipped.length > 0) {
                console.log(`[generateDraft] Overlap resolution: ${skipped.length} element(s) converted to recommendation_only`);
            }
            rawPlan = { ...rawPlan, proposedElements: resolved };
        }

        // ── Canonical-type normalization + deduplication ──────────────────────
        {
            // Apply canonical normalization to each create_new element:
            // • forces clean display names ("Compost" not "Strategic Compost Hub")
            // • maps variants to canonical keys (kitchen_garden → vegetableGarden)
            const normalizedElements = rawPlan.proposedElements.map(el => {
                if (el.action === 'recommendation_only' || el.type === 'permaculture-zone') return el;
                const norm = normalizeGeneralStructure(el);
                if (!norm) return el;  // unmappable — keep as-is, getRenderMode will filter
                return { ...el, name: norm.displayName };
            });

            // Remove functional duplicates (e.g. Compost + Compost Hub → keep one Compost)
            const { deduplicated, mergeReport } = deduplicateProposedElements(normalizedElements);

            if (mergeReport.length > 0) {
                console.log(
                    `[generateDraft] Canonical dedup merged ${mergeReport.length} element(s):\n` +
                    mergeReport.map(r => `  • ${r.canonicalKey}: kept "${r.kept}", dropped "${r.dropped}"`).join('\n')
                );
            }

            rawPlan = { ...rawPlan, proposedElements: deduplicated };
        }

        // ── Normalise siteAnalysis to model schema ────────────────────────────
        const ctx = sourceContextWithVariant || {};
        const siteAnalysis = usedFallback
            ? {
                ...rawPlan.siteAnalysis,
                stableElements: (ctx.existingElements?.stableElements) || [],
                climate: '',
                waterStrategy: '',
                soilStrategy: '',
                accessStrategy: '',
                biodiversityStrategy: '',
                siteAnalysisSummary: siteAnalysisSummary || null,
            }
            : {
                existingStructures: rawPlan.siteAnalysis?.existingStructures || [],
                stableElements: (ctx.existingElements?.stableElements) || [],
                slopeNotes: ctx.siteCharacteristics?.constraints?.find(c => c.type === 'terrain')?.message || '',
                sunExposureNotes: '',
                windNotes: ctx.siteCharacteristics?.constraints?.find(c => c.type === 'wind')?.message || '',
                waterFlowNotes: rawPlan.siteAnalysis?.waterStrategy || '',
                soilNotes: rawPlan.siteAnalysis?.soilStrategy || '',
                constraints: rawPlan.siteAnalysis?.constraints || [],
                opportunities: rawPlan.siteAnalysis?.opportunities || [],
                climate: rawPlan.siteAnalysis?.climate || '',
                waterStrategy: rawPlan.siteAnalysis?.waterStrategy || '',
                soilStrategy: rawPlan.siteAnalysis?.soilStrategy || '',
                accessStrategy: rawPlan.siteAnalysis?.accessStrategy || '',
                biodiversityStrategy: rawPlan.siteAnalysis?.biodiversityStrategy || '',
                siteAnalysisSummary: siteAnalysisSummary || null,
            };

        const planWarnings = usedFallback
            ? [`Rule-based draft plan (AI generation unavailable). This draft follows your Site Analysis, crop selections, animals and household food needs — but it is not AI-generated. Enable AI_ENABLED=true with a valid API key for a fully adaptive plan.`, ...(rawPlan.warnings || [])]
            : (rawPlan.warnings || []);

        const plan = await PermaculturePlan.create({
            userId,
            sourceLayoutSnapshot: layoutSnapshot,
            sourceContext: ctx,
            userRequirements: {
                freeText: userRequirements.freeText || '',
                goals: userRequirements.goals || layout?.setup?.goals || [],
                focusAreas: userRequirements.focusAreas || layout?.setup?.focusAreas || [],
                preferredPlants: userRequirements.preferredPlants || [],
                excludedPlants: userRequirements.excludedPlants || [],
            },
            locationContext: mergedLocation,
            siteAnalysis,
            proposedElements: rawPlan.proposedElements || [],
            summary: rawPlan.summary || '',
            planNarrative: rawPlan.planNarrative || rawPlan.summary || '',
            plantingRecommendations: rawPlan.plantingRecommendations || [],
            maintenancePlan: rawPlan.maintenancePlan || [],
            planWarnings,
            bibliography: rawPlan.bibliography || [],
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
    'House', 'Shed', 'Fence', 'Tree', 'Well', 'Water Butt', 'Gate', 'Wall', 'Car Road',
    'Greenhouse',  // treat as stable if already on map
]);

// Legacy type-level colors kept for backward-compat; resolveElementColor() is preferred.
const ELEMENT_TYPE_COLORS = {
    'permaculture-zone': '#6040a0',
    'structure': '#8B5E3C',
    'planting-strip': '#4a7c3f',
    'water-feature': '#1a70c0',
};

// Approximate base-pixels-per-metre for backend layout storage
// (mirrors GardenCanvas.jsx: basePxPerM = min(availW/widthM, availH/heightM))
function estimatePxPerM(widthM, heightM) {
    return Math.max(4, Math.min(900 / (widthM || 1), 550 / (heightM || 1)));
}

// Describe what changed between current layout and snapshot
function diffLayouts(current, snapshot) {
    const curItems = (current?.overlayItems || []).map(i => i.name).sort();
    const snapItems = (snapshot?.overlayItems || []).map(i => i.name).sort();
    const curZones = (current?.zones || []).slice().sort();
    const snapZones = (snapshot?.zones || []).slice().sort();

    const addedItems = curItems.filter(n => !snapItems.includes(n));
    const removedItems = snapItems.filter(n => !curItems.includes(n));
    const addedZones = curZones.filter(z => !snapZones.includes(z));
    const removedZones = snapZones.filter(z => !curZones.includes(z));

    const changed = addedItems.length + removedItems.length + addedZones.length + removedZones.length > 0;
    const parts = [
        addedItems.length ? `${addedItems.length} structure(s) added` : '',
        removedItems.length ? `${removedItems.length} structure(s) removed` : '',
        addedZones.length ? `${addedZones.length} zone(s) added` : '',
        removedZones.length ? `${removedZones.length} zone(s) removed` : '',
    ].filter(Boolean);

    return {
        changed,
        summary: parts.join(', '),
        details: { addedItems, removedItems, addedZones, removedZones },
    };
}

// Map AI catalogKey/name → GENERAL_STRUCTURES key for structureKey + iconKey on applied items
const AI_TO_GENERAL_KEY = {
    vegetable_garden: 'vegetableGarden', kitchen_garden: 'vegetableGarden', potager: 'vegetableGarden',
    intensive_beds: 'vegetableGarden', raised_beds: 'vegetableGarden',
    orchard: 'orchard', fruit_trees: 'orchard',
    berry_patch: 'berryPatch', berry_strip: 'berryPatch',
    guild: 'guild', food_forest: 'woodlot', forest_garden: 'woodlot', coppice: 'woodlot',
    wild_zone: 'woodlot', windbreak: 'woodlot',
    compost: 'compost',
    pond: 'pond', swale: 'pond', duck_pond: 'pond',
    greenhouse: 'greenhouse',
    herb_garden: 'vegetableGarden',
    coop: 'coop', chicken_coop: 'coop',
    beehive: 'beehives', apiary: 'beehives',
    path: 'carRoad',
    shed: 'workshop',
    staple_crops: 'stapleCrops', grain_plot: 'stapleCrops',
    animal_run: 'animalRun', pasture: 'animalRun',
    kids_playground: 'kidsPlayground',
};
const GENERAL_ICON_KEYS = {
    vegetableGarden: 'Carrot', orchard: 'TreePine', berryPatch: 'Cherry', guild: 'Network',
    woodlot: 'Trees', compost: 'Recycle', pond: 'Waves', greenhouse: 'Sprout',
    coop: 'Bird', beehives: 'Hexagon', carRoad: 'Car', workshop: 'Hammer',
    stapleCrops: 'Wheat', animalRun: 'PawPrint', kidsPlayground: 'Smile',
    house: 'Home', outdoorKitchen: 'CookingPot',
};
const GENERAL_COLORS = {
    vegetableGarden: '#D8E8B0', orchard: '#B8DCA0', berryPatch: '#F0A8C0', guild: '#D8B8E8',
    woodlot: '#5A8840', compost: '#A0785A', pond: '#82C4E0', greenhouse: '#C8E6C9',
    coop: '#D8C898', beehives: '#FFE082', carRoad: '#C8C0B0', workshop: '#B0A898',
    stapleCrops: '#EEE098', animalRun: '#C8E0B8', kidsPlayground: '#FFF08A',
    house: '#E8D5B0', outdoorKitchen: '#D4907A',
};
const GENERAL_BORDER_COLORS = {
    vegetableGarden: '#5A8028', orchard: '#3A8038', berryPatch: '#B03060', guild: '#7040A0',
    woodlot: '#2A5818', compost: '#5D4037', pond: '#1976D2', greenhouse: '#4A8F50',
    coop: '#8A7040', beehives: '#C8880A', carRoad: '#7A7060', workshop: '#6B5E52',
    stapleCrops: '#A08010', animalRun: '#5A8840', kidsPlayground: '#C07010',
    house: '#A87840', outdoorKitchen: '#8F5A3A',
};

// AI catalogKeys that create a dedicated zone tab after apply.
// Restricted to productive planting areas only — buildings/utilities/animals are General Map only.
const ZONE_PORTAL_CATALOG_KEYS = new Set([
    'vegetable_garden', 'kitchen_garden', 'potager', 'intensive_beds', 'raised_beds',
    'herb_garden',
    'orchard', 'fruit_trees',
    'berry_patch', 'berry_strip',
    'guild',
    'greenhouse',
]);

// Map a zone-portal catalogKey to the overlay item's type + structureKey
function resolvePortalTypeInfo(ck) {
    if (ck === 'orchard' || ck === 'fruit_trees') return { type: 'orchard', structureKey: 'orchard' };
    if (ck === 'berry_patch' || ck === 'berry_strip') return { type: 'berryPatch', structureKey: 'berryPatch' };
    if (ck === 'guild') return { type: 'guild', structureKey: 'guild' };
    if (ck === 'greenhouse') return { type: 'greenhouse', structureKey: 'greenhouse' };
    if (ck === 'pond') return { type: 'pond', structureKey: 'pond' };
    if (ck === 'staple_crops') return { type: 'stapleCrops', structureKey: 'stapleCrops' };
    return { type: 'vegetableGarden', structureKey: 'vegetableGarden' };
}

function resolveGeneralStructureKey(catalogKey, name) {
    const ck = (catalogKey || '').toLowerCase().replace(/ /g, '_');
    const n = (name || '').toLowerCase();
    if (AI_TO_GENERAL_KEY[ck]) return AI_TO_GENERAL_KEY[ck];
    for (const [k, v] of Object.entries(AI_TO_GENERAL_KEY)) {
        if (n.includes(k.replace(/_/g, ' '))) return v;
    }
    return null;
}

// Determine how an AI element should be visually rendered on the General Map
function getRenderMode(catalogKey, name) {
    const n = (name || '').toLowerCase();
    const ck = (catalogKey || '').toLowerCase();
    if (ck === 'path' || n.includes('path') || n.includes('walkway') || n.includes('trail'))
        return 'path';
    if (
        ck === 'vegetable_garden' || ck === 'orchard' || ck === 'food_forest' || ck === 'berry_patch' ||
        ck === 'pond' || ck === 'swale' || ck === 'guild' || ck === 'herb_garden' || ck === 'wild_zone' ||
        ck === 'windbreak' || ck === 'coop' || ck === 'beehive' ||
        n.includes('vegetable') || n.includes('orchard') || n.includes('food forest') || n.includes('berry') ||
        n.includes('pond') || n.includes('meadow') || n.includes('swale') || n.includes('guild') ||
        n.includes('herb') || n.includes('windbreak') || n.includes('hedge') || n.includes('patch') ||
        n.includes('wild') || n.includes(' run') || n.includes('coop') || n.includes('pasture') ||
        n.includes('pollinator') || n.includes('planting') || n.includes('meadow')
    ) return 'area';
    return 'structure';
}

// Type-aware default dimensions (metres) when width/height are absent from the AI element
function getAiDefaultDimensions(catalogKey, name) {
    const n = (name || '').toLowerCase();
    const ck = (catalogKey || '').toLowerCase();
    if (ck === 'vegetable_garden' || n.includes('vegetable garden') || n.includes('kitchen garden')) return { w: 18, h: 10 };
    if (ck === 'orchard' || n.includes('orchard')) return { w: 16, h: 12 };
    if (ck === 'berry_patch' || n.includes('berry')) return { w: 7, h: 4 };
    if (n.includes('coop') || n.includes('chicken') || n.includes(' run')) return { w: 8, h: 5 };
    if (ck === 'compost' || n.includes('compost')) return { w: 3, h: 2 };
    if (ck === 'path' || n.includes('path')) return { w: 20, h: 1 };
    if (ck === 'pond' || n.includes('pond')) return { w: 5, h: 5 };
    if (ck === 'greenhouse' || n.includes('greenhouse')) return { w: 5, h: 4 };
    if (ck === 'food_forest' || n.includes('food forest')) return { w: 14, h: 10 };
    if (ck === 'guild' || n.includes('guild')) return { w: 8, h: 6 };
    if (ck === 'herb_garden' || n.includes('herb')) return { w: 6, h: 4 };
    if (ck === 'wild_zone' || n.includes('meadow') || n.includes('wild')) return { w: 12, h: 4 };
    if (ck === 'windbreak' || n.includes('windbreak') || n.includes('hedge')) return { w: 20, h: 2 };
    if (ck === 'swale' || n.includes('swale')) return { w: 20, h: 1.5 };
    return { w: 6, h: 4 };
}

// Fixed obstacles get a larger no-overlap buffer than ordinary stable
// structures — House anchors Zone 0/1, Car Road is the access axis.
const FIXED_OBSTACLE_BUFFERS_M = { House: 1.5, 'Car Road': 1.0 };

// Resolve stable structure positions from current overlay items (metres).
// Supports both legacy pixel-based x/y and new xM/yM metre fields.
function resolveStableStructures(overlayItems, pxPerM) {
    return (overlayItems || [])
        .filter(i => STABLE_STRUCTURE_NAMES.has(i.name))
        .map(i => ({
            name: i.name,
            xM: i.xM != null ? i.xM : (i.x || 0) / pxPerM,
            yM: i.yM != null ? i.yM : (i.y || 0) / pxPerM,
            wM: i.wM || 2,
            hM: i.hM || 2,
            marginM: FIXED_OBSTACLE_BUFFERS_M[i.name] ?? 0.25,
            fixed: !!FIXED_OBSTACLE_BUFFERS_M[i.name],
        }));
}

function rectsOverlapM(ax, ay, aw, ah, bx, by, bw, bh, margin = 0.25) {
    if (bx == null || by == null) return false;
    return ax < bx + bw + margin &&
        ax + aw > bx - margin &&
        ay < by + bh + margin &&
        ay + ah > by - margin;
}

// Try to find a nearby free position for (wM × hM) that doesn't overlap any
// obstacle (each with its own margin) and stays within the garden bounds.
// Returns { x, y, repaired } or null if no free spot could be found.
function repairPlacement(xM, yM, wM, hM, widthM, heightM, obstacles) {
    const fits = (x, y) => {
        if (x < 0 || y < 0 || x + wM > widthM || y + hM > heightM) return false;
        return !obstacles.some(o => rectsOverlapM(x, y, wM, hM, o.xM, o.yM, o.wM, o.hM, o.marginM ?? 0.25));
    };

    if (fits(xM, yM)) return { x: xM, y: yM, repaired: false };

    const step = 0.5;
    const maxRadius = Math.max(widthM, heightM);
    for (let r = step; r <= maxRadius; r += step) {
        const candidates = [
            [xM + r, yM], [xM - r, yM], [xM, yM + r], [xM, yM - r],
            [xM + r, yM + r], [xM - r, yM - r], [xM + r, yM - r], [xM - r, yM + r],
        ];
        for (const [cx, cy] of candidates) {
            const nx = Math.max(0, Math.min(widthM - wM, cx));
            const ny = Math.max(0, Math.min(heightM - hM, cy));
            if (fits(nx, ny)) return { x: nx, y: ny, repaired: true };
        }
    }
    return null;
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
        const snapshot = plan.sourceLayoutSnapshot || {};
        const changeReport = diffLayouts(layout, snapshot);

        if (changeReport.changed && !force) {
            return res.json({
                success: false,
                requiresForce: true,
                warning: `Your map changed since this plan was generated (${changeReport.summary}). Apply anyway?`,
                changeReport,
            });
        }

        // ── Coordinate system ─────────────────────────────────────────────────
        const widthM = layout.setup?.widthM || 10;
        const heightM = layout.setup?.heightM || 10;
        const pxPerM = estimatePxPerM(widthM, heightM);
        const stables = resolveStableStructures(layout.overlayItems, pxPerM);

        // Read selection + full preview element data from frontend
        const { selectedElementNames, selectedPreviewElements } = req.body || {};
        const selectedSet = Array.isArray(selectedElementNames) && selectedElementNames.length > 0
            ? new Set(selectedElementNames) : null;

        // Build a lookup by element name so we can use EXACT preview positions (metres)
        // instead of re-computing or re-normalizing placement on the backend.
        const preservePreviewPlacement = Array.isArray(selectedPreviewElements) && selectedPreviewElements.length > 0;
        const previewByName = new Map(
            (selectedPreviewElements || []).map(el => [String(el.name), el])
        );

        console.log(`[applyPlan] preservePreviewPlacement=${preservePreviewPlacement} selectedCount=${selectedPreviewElements?.length ?? 0}`);
        if (preservePreviewPlacement) {
            console.table(selectedPreviewElements.map(e => ({
                name: e.name, x: e.x?.toFixed(1), y: e.y?.toFixed(1),
                w: e.width?.toFixed(1), h: e.height?.toFixed(1),
            })));
        }

        const applied = [];
        const skipped = [];
        const newOverlayItems = [...(layout.overlayItems || [])];
        // bedLayouts: start from existing; we'll add/update entries for bed suggestions
        const newBedLayouts = { ...(layout.bedLayouts || {}) };
        // Zone tab tracking — keep zones/grids/positions in sync when portals are applied
        const newZones = [...(layout.zones || ['Zone 1'])];
        const newGrids = [...(layout.grids || [Array.from({ length: 10 }, () => Array(10).fill(null))])];
        const newPositions = [...(layout.positions || [])];
        // Zone items (new raised-bed format) — persist alongside other zone data
        const newZoneItemsMap = { ...(layout.zoneItems || {}) };
        // Pad positions to match the current zones length
        while (newPositions.length < newZones.length) {
            const i = newPositions.length;
            newPositions.push({ x: 200 + (i % 4) * 180, y: 120 + Math.floor(i / 4) * 160, inGeneral: false, shape: 'circle' });
        }

        for (const el of (plan.proposedElements || [])) {
            const elName = el.name || 'Unnamed';
            const action = el.action || 'create_new';

            // Honour the user's checkbox selection from the preview
            if (selectedSet && !selectedSet.has(elName)) {
                skipped.push({ element: elName, reason: 'Not selected for apply.' });
                continue;
            }

            // ── Block path elements — users add paths manually ────────────────
            if (getRenderMode(el.catalogKey || '', elName) === 'path') {
                skipped.push({ element: elName, reason: 'Path placement is disabled — add paths manually.' });
                continue;
            }

            // ── recommendation_only: save as note, never add to map ──────────
            // 'permaculture-zone' is reserved for the conceptual Zone 0-5 overlay
            // (no catalogKey/canonicalType). Any element with a real catalogKey is
            // a real garden zone and must be applied, even if mislabeled by the AI.
            const hasCatalogKey = !!(el.catalogKey || el.canonicalType);
            if (action === 'recommendation_only' || (el.type === 'permaculture-zone' && !hasCatalogKey)) {
                skipped.push({
                    element: elName,
                    reason: action === 'recommendation_only'
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
                            blocks: existing.blocks || [],
                            rows: [...(existing.rows || []), ...suggestion.rows],
                        };
                        bedLayoutCreated = true;
                        console.log(`[applyPlan] ${action} "${elName}" → bedLayout updated for id=${targetId} (${suggestion.rows.length} row(s) added)`);
                    }
                }

                applied.push({
                    element: elName,
                    action,
                    targetElementId: el.targetElementId || null,
                    canonicalType: el.canonicalType || null,
                    plants: el.plants || [],
                    reason: el.reason || '',
                    bedLayoutCreated,
                });
                if (!bedLayoutCreated) {
                    console.log(`[applyPlan] ${action} "${elName}" targeting id=${el.targetElementId} (no bed layout — not a bed-like target)`);
                }
                continue;
            }

            // ── create_new / add_near_existing: add as new overlay item ─────

            // sourceEl is the preview element (with exact user-visible coordinates) if
            // the frontend sent selectedPreviewElements; falls back to stored plan element.
            const sourceEl = previewByName.get(elName) || el;

            const dims = getAiDefaultDimensions(sourceEl.catalogKey || el.catalogKey || '', elName);
            const wM = Math.max(0.5, sourceEl.width ?? el.width ?? dims.w);
            const hM = Math.max(0.3, sourceEl.height ?? el.height ?? dims.h);
            // Start from the EXACT preview position (metres), clamped to bounds.
            const previewXM = Math.max(0, Math.min(widthM - wM, sourceEl.x ?? el.x ?? 0));
            const previewYM = Math.max(0, Math.min(heightM - hM, sourceEl.y ?? el.y ?? 0));

            if (wM > widthM + 0.01 || hM > heightM + 0.01) {
                skipped.push({
                    element: elName,
                    reason: `Element is ${wM.toFixed(1)}×${hM.toFixed(1)}m, larger than the ${widthM}×${heightM}m garden — cannot place.`,
                });
                continue;
            }

            // ── Placement repair ─────────────────────────────────────────────
            // Never overlap House/Car Road (or other stable structures) or items
            // already placed in this batch. If the preview position collides,
            // nudge to the nearest free spot rather than silently dropping the
            // element. Only skip if no free spot exists at all.
            const placedObstacles = newOverlayItems
                .filter(it => !STABLE_STRUCTURE_NAMES.has(it.name) && it.xM != null && it.yM != null && it.wM != null && it.hM != null)
                .map(it => ({ xM: it.xM, yM: it.yM, wM: it.wM, hM: it.hM, marginM: 0.25 }));
            const obstacles = [...stables, ...placedObstacles];

            const placement = repairPlacement(previewXM, previewYM, wM, hM, widthM, heightM, obstacles);
            if (!placement) {
                skipped.push({
                    element: elName,
                    reason: `No free space found for "${elName}" (${wM.toFixed(1)}×${hM.toFixed(1)}m) without overlapping House, Car Road, or other elements.`,
                });
                console.warn(`[applyPlan] Skipped "${elName}" — no free placement found near (${previewXM.toFixed(1)},${previewYM.toFixed(1)})`);
                continue;
            }
            const xM = placement.x;
            const yM = placement.y;
            const wasRepositioned = placement.repaired;
            if (wasRepositioned) {
                console.log(`[applyPlan] Repositioned "${elName}" from (${previewXM.toFixed(1)},${previewYM.toFixed(1)}) to (${xM.toFixed(1)},${yM.toFixed(1)}) to avoid overlap`);
            }

            // ── Canonical-type duplicate guard ───────────────────────────────
            // Normalize the incoming element and skip if the same singular canonical type
            // already exists on the map (either from before apply or added in this batch).
            // Only applies to types where multiple instances genuinely don't make sense
            // (e.g. Greenhouse, Compost) — productive zones (vegetableGarden, orchard,
            // berryPatch, pond, guild) are MULTI_ALLOWED and never hit this guard.
            {
                const normCheck = normalizeGeneralStructure({ catalogKey: sourceEl.catalogKey || el.catalogKey || '', name: elName });
                if (normCheck) {
                    const { canonicalKey } = normCheck;
                    const isSingular = !MULTI_ALLOWED_CANONICAL_KEYS.has(canonicalKey);
                    if (isSingular) {
                        const alreadyOnMap = newOverlayItems.some(
                            it => it.structureKey === canonicalKey || it.canonicalKey === canonicalKey
                        );
                        if (alreadyOnMap) {
                            skipped.push({
                                element: elName,
                                reason: `A ${CANONICAL_DISPLAY_NAMES[canonicalKey] || canonicalKey} already exists on the map — skipped to prevent duplicate.`,
                            });
                            console.log(`[applyPlan] Skipped duplicate ${canonicalKey}: "${elName}" (catalogKey="${sourceEl.catalogKey || el.catalogKey || ''}") — already on map`);
                            continue;
                        }
                    }
                }
            }

            // Determine if this element becomes a dedicated zone portal (openable tab).
            // Productive planting areas only: vegetable garden, herb garden, orchard,
            // berry patch, guild, greenhouse. Buildings/utilities/animals stay on General Map.
            const ck = sourceEl.catalogKey || el.catalogKey || '';
            const detailPlants = (sourceEl.detailPlan?.suggestedPlants || el.detailPlan?.suggestedPlants || []).filter(Boolean);
            const internalBeds = (sourceEl.internalBeds || el.internalBeds || []);
            const isNewZonePortal =
                ZONE_PORTAL_CATALOG_KEYS.has(ck) ||
                (ck === 'raised_bed' && (detailPlants.length >= 2 || internalBeds.length > 0));
            const portalTypeInfo = isNewZonePortal ? resolvePortalTypeInfo(ck) : null;

            // Zone portals get a larger minimum area so the visual reads as a garden zone
            const portalWM = isNewZonePortal ? Math.max(wM, 8.0) : wM;
            const portalHM = isNewZonePortal ? Math.max(hM, 5.0) : hM;

            // Use the AI-supplied element name as the zone tab name; strip only raised-bed suffixes
            const cleanZoneName = isNewZonePortal
                ? (elName.replace(/\s*(Raised\s*)?Bed\b/i, '').trim() || portalTypeInfo.type)
                : elName;

            // Generate internal bed layout — prefer AI-provided internalBeds, fall back to detailPlan
            let internalBedLayout = null;
            if (isNewZonePortal && internalBeds.length > 0) {
                // AI returned a proper internalBeds array — use it directly
                internalBedLayout = {
                    layoutMode: 'rows',
                    rows: internalBeds.map((bed, i) => ({
                        id: bed.id || `row-${Date.now()}-${i}`,
                        x: bed.x ?? 0,
                        y: bed.y ?? (i * 1.3),
                        widthM: bed.widthM || portalWM,
                        heightM: bed.heightM || 1.0,
                        plant: { name: (bed.plants || [])[0] || '' },
                        companions: (bed.plants || []).slice(1).map(p => ({ name: p })),
                        spacingCm: bed.spacingCm || 40,
                        label: bed.label || (bed.plants || [])[0] || `Bed ${i + 1}`,
                    })),
                    blocks: [],
                };
            } else if (isNewZonePortal && detailPlants.length > 0) {
                // Fall back to detailPlan.suggestedPlants (legacy)
                const maxRows = Math.max(1, Math.floor(portalHM / 1.3));
                const rowCount = Math.min(detailPlants.length, maxRows);
                const rowHM = parseFloat((portalHM / rowCount).toFixed(2));
                internalBedLayout = {
                    layoutMode: 'rows',
                    rows: detailPlants.slice(0, rowCount).map((plantName, i) => ({
                        id: `row-${Date.now()}-${i}`,
                        x: 0,
                        y: parseFloat((i * rowHM).toFixed(2)),
                        widthM: portalWM,
                        heightM: parseFloat((rowHM - 0.15).toFixed(2)),
                        plant: { name: plantName },
                        companions: [],
                        spacingCm: 40,
                        label: plantName,
                    })),
                    blocks: [],
                };
            }

            const itemRenderMode = getRenderMode(ck, cleanZoneName);
            const gsKey = resolveGeneralStructureKey(ck, cleanZoneName);
            console.log(`[applyPlan] debug "${elName}" orig x=${sourceEl.x?.toFixed(1)} y=${sourceEl.y?.toFixed(1)} w=${sourceEl.width?.toFixed(1)} h=${sourceEl.height?.toFixed(1)} → applied xM=${xM.toFixed(1)} yM=${yM.toFixed(1)} wM=${portalWM.toFixed(1)} hM=${portalHM.toFixed(1)} renderMode=${itemRenderMode} gsKey=${gsKey}`);
            const item = {
                id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: cleanZoneName,
                // Legacy pixel coords kept for backward compat with existing drag/resize logic.
                x: Math.round(xM * pxPerM),
                y: Math.round(yM * pxPerM),
                // Metre-based coords — frontend uses these for accurate pixel-perfect placement.
                xM: parseFloat(xM.toFixed(3)),
                yM: parseFloat(yM.toFixed(3)),
                wM: portalWM,
                hM: portalHM,
                isStructure: true,
                structureKey: gsKey || null,
                iconKey: gsKey ? (GENERAL_ICON_KEYS[gsKey] || null) : null,
                borderColor: gsKey ? (GENERAL_BORDER_COLORS[gsKey] || null) : null,
                rotation: Number.isFinite(sourceEl.rotation ?? el.rotation) ? Math.round(sourceEl.rotation ?? el.rotation) : 0,
                iconData: null,
                color: (gsKey && GENERAL_COLORS[gsKey]) ? GENERAL_COLORS[gsKey] : resolveElementColor(
                    sourceEl.catalogKey || el.catalogKey || sourceEl.canonicalType || el.canonicalType,
                    sourceEl.type || el.type
                ),
                renderMode: itemRenderMode,
                aiGenerated: true,
                confidence: (sourceEl.confidence ?? el.confidence) ?? null,
                reason: ((sourceEl.reason || el.reason || '').slice(0, 250)) || null,
                plants: (sourceEl.plants || el.plants || []).slice(0, 8),
                generatedBy: 'permaculture-plan',
                planId: String(plan._id),
                action: action,
                catalogKey: ck || null,
                canonicalType: sourceEl.canonicalType || el.canonicalType || null,
                targetElementId: sourceEl.targetElementId || el.targetElementId || null,
                variantStrategy: sourceEl.variantStrategy || el.variantStrategy || null,
                createdFromPreview: true,
                previewPositionUsed: preservePreviewPlacement && !wasRepositioned,
                repositionedFromPreview: wasRepositioned,
                ...(isNewZonePortal ? {
                    type: portalTypeInfo.type,
                    isZonePortal: true,
                    zoneRef: cleanZoneName,
                } : {}),
            };

            // Store internal bed layout for this portal
            if (internalBedLayout) {
                newBedLayouts[String(item.id)] = internalBedLayout;
            }

            // Create a zone tab for productive portals that don't already have one
            if (isNewZonePortal && !newZones.includes(cleanZoneName)) {
                newZones.push(cleanZoneName);
                newGrids.push(Array.from({ length: 10 }, () => Array(10).fill(null)));
                const pi = newPositions.length;
                newPositions.push({ x: 200 + (pi % 4) * 180, y: 120 + Math.floor(pi / 4) * 160, inGeneral: false, shape: 'circle' });
                console.log(`[applyPlan] created zone tab "${cleanZoneName}" (total tabs: ${newZones.length})`);

                // Populate zone with raised beds in the new format so the zone canvas is pre-filled
                const allBeds = internalBeds.length > 0 ? internalBeds : (detailPlants.length > 0
                    ? [{ plants: detailPlants, widthM: Math.min(portalWM - 0.4, 4), heightM: 1.1, label: null }]
                    : []);
                if (allBeds.length > 0) {
                    let yOffset = 0.3;
                    const raisedBedItems = allBeds.map((bed, i) => {
                        const bH = bed.heightM || 1.1;
                        const item = {
                            id: `ai-bed-${Date.now()}-${i}`,
                            type: 'raisedBed',
                            name: bed.label || `Raised Bed ${i + 1}`,
                            xM: 0.3,
                            yM: yOffset,
                            wM: Math.min(bed.widthM || (portalWM - 0.4), portalWM - 0.4),
                            hM: bH,
                            plants: (bed.plants || []).map((plantName, pi) => ({
                                id: `ai-plant-${Date.now()}-${i}-${pi}`,
                                plantName,
                                iconData: null,
                                xPct: 12 + (pi % 5) * 19,
                                yPct: 30 + Math.floor(pi / 5) * 40,
                            })),
                        };
                        yOffset += bH + 0.3;
                        return item;
                    });
                    newZoneItemsMap[cleanZoneName] = raisedBedItems;
                    console.log(`[applyPlan] pre-filled zone "${cleanZoneName}" with ${raisedBedItems.length} raised bed(s)`);
                }
            }

            newOverlayItems.push(item);
            applied.push({
                element: elName,
                id: item.id,
                action,
                type: sourceEl.type || el.type,
                catalogKey: item.catalogKey,
                x: xM, y: yM, wM, hM,
                repositioned: wasRepositioned,
            });
            console.log(`[applyPlan] ${action} "${elName}" placed at (${xM.toFixed(1)},${yM.toFixed(1)}) m${wasRepositioned ? ' [repositioned to avoid overlap]' : preservePreviewPlacement ? ' [preview position]' : ''} size=${wM.toFixed(1)}×${hM.toFixed(1)}`);
        }

        // ── Post-apply validation: catch elements selected by the frontend that
        // were never matched against plan.proposedElements (e.g. a name mismatch),
        // so nothing disappears without a visible reason.
        if (selectedSet) {
            const accountedNames = new Set([...applied.map(a => a.element), ...skipped.map(s => s.element)]);
            for (const name of selectedSet) {
                if (!accountedNames.has(name)) {
                    skipped.push({ element: name, reason: 'Selected element not found in plan — could not be applied.' });
                    console.warn(`[applyPlan] Selected element "${name}" not found in plan.proposedElements`);
                }
            }
        }

        // ── Persist updated layout ─────────────────────────────────────────
        // Use $set to avoid Mongoose path-marking issues with Mixed fields.
        // Include bedLayouts so plant_inside_existing actions are reflected immediately
        // in the Bed Editor without the user needing to re-save.
        const updatedLayout = await gardenLayoutModel.findOneAndUpdate(
            { userId: req.user.id },
            { $set: { overlayItems: newOverlayItems, bedLayouts: newBedLayouts, zones: newZones, grids: newGrids, positions: newPositions, zoneItems: newZoneItemsMap } },
            { new: true }
        );

        // ── Mark plan as applied ───────────────────────────────────────────
        plan.status = 'applied';
        await plan.save();

        res.json({
            success: true,
            plan,
            layout: {
                zones: updatedLayout.zones,
                grids: updatedLayout.grids,
                setup: updatedLayout.setup,
                positions: updatedLayout.positions,
                overlayItems: updatedLayout.overlayItems,
                bedLayouts: updatedLayout.bedLayouts || {},
                zoneItems: updatedLayout.zoneItems || {},
            },
            applied,
            // Part 8: return final applied positions so frontend can verify vs preview
            appliedElements: applied.map(a => ({
                name: a.element,
                id: a.id,
                action: a.action,
                x: a.x,
                y: a.y,
                wM: a.wM,
                hM: a.hM,
                repositioned: a.repositioned || false,
            })),
            skipped,
            appliedCount: applied.length,
            skippedCount: skipped.length,
            summaryMessage: skipped.length === 0
                ? `Applied ${applied.length} of ${applied.length} elements.`
                : `Applied ${applied.length} of ${applied.length + skipped.length} elements. ${skipped.length} skipped: ${skipped.map(s => s.element).join(', ')}.`,
            previewPlacementUsed: preservePreviewPlacement,
            warning: changeReport.changed ? changeReport.summary : null,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
