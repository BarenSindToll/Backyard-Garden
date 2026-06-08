import Plant from '../models/plantModel.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Score a plant for a given zone type and priority
function scorePlant(plant, zoneType, priority, focusAreas, opts = {}) {
    let score = 0;
    const roles  = plant.guildRole || [];
    const funcs  = plant.ecologicalFunctions || [];
    const allRoles = [...roles, ...funcs];
    const cat = plant.category || '';

    // Guild role bonuses
    if (allRoles.includes('Producer'))             score += 2;
    if (allRoles.includes('Nitrogen fixer'))       score += 2;
    if (allRoles.includes('Pollinator attractor')) score += 1.5;
    if (allRoles.includes('Dynamic accumulator'))  score += 1.5;
    if (allRoles.includes('Pest repellent'))       score += 1;
    if (allRoles.includes('Groundcover'))          score += 1;

    // Category / zone match
    if (zoneType === 'vegetable' && (cat === 'vegetable' || cat === 'legume')) score += 3;
    if (zoneType === 'herb'      && cat === 'herb')                            score += 3;
    if (zoneType === 'orchard'   && (cat === 'fruit' || cat === 'tree'))       score += 3;
    if (zoneType === 'flower'    && cat === 'flower')                          score += 3;
    if (zoneType === 'forest'    && (cat === 'tree' || cat === 'shrub'))       score += 3;
    if (zoneType === 'guild')                                                  score += (allRoles.length * 0.5);

    // Priority boosts
    if (priority === 'Mostly Food'          && roles.includes('Producer'))     score += 2;
    if (priority === 'Healing / Medicinal'  && allRoles.includes('Medicinal')) score += 3;
    if (priority === 'Mostly Ornamental'    && cat === 'flower')               score += 2;

    // Focus area match
    for (const fa of focusAreas) {
        if (allRoles.includes(fa)) score += 1.5;
    }

    // Sun exposure adjustments
    if (opts.sunExposure === 'Full Shade') {
        if (zoneType === 'vegetable') score -= 2;
        if (zoneType === 'forest')    score += 2;
    }
    if (opts.sunExposure === 'Partial Shade' && zoneType === 'herb') score += 1;

    // Soil adjustments
    if (opts.soilType === 'Sandy' && cat === 'herb')               score += 1;
    if (opts.soilType === 'Clay'  && (cat === 'tree' || cat === 'shrub')) score += 1;

    // Wildlife friendly
    if (opts.wildlifeFriendly && allRoles.includes('Pollinator attractor')) score += 2;

    return score;
}

function hasAntagonistConflict(plant, chosenPlants) {
    const antagonists = new Set(plant.antagonists || []);
    for (const chosen of chosenPlants) {
        if (antagonists.has(chosen.name)) return true;
        if ((chosen.antagonists || []).includes(plant.name)) return true;
    }
    return false;
}

function countRoleCoverage(plants) {
    const roles = new Set();
    for (const p of plants) {
        for (const r of (p.guildRole || []))            roles.add(r);
        for (const r of (p.ecologicalFunctions || []))  roles.add(r);
    }
    return roles;
}

function pickPlantsForZone(candidates, zoneType, priority, focusAreas, favSet, targetCount, opts) {
    const chosen = [];
    const desiredRoles = ['Producer', 'Nitrogen fixer', 'Pollinator attractor', 'Dynamic accumulator'];

    // 1. Favourites that fit (max 2)
    const favs = shuffle(candidates.filter(p => favSet.has(p.name) && !hasAntagonistConflict(p, chosen)));
    for (const p of favs.slice(0, 2)) {
        if (chosen.length >= targetCount) break;
        chosen.push(p);
    }

    // 2. Fill missing guild roles
    for (const role of desiredRoles) {
        if (chosen.length >= targetCount) break;
        if (countRoleCoverage(chosen).has(role)) continue;
        const roleMatch = candidates
            .filter(p => !chosen.includes(p) &&
                ((p.guildRole || []).includes(role) || (p.ecologicalFunctions || []).includes(role)) &&
                !hasAntagonistConflict(p, chosen));
        if (roleMatch.length > 0) {
            roleMatch.sort((a, b) => scorePlant(b, zoneType, priority, focusAreas, opts) - scorePlant(a, zoneType, priority, focusAreas, opts));
            chosen.push(roleMatch[0]);
        }
    }

    // 3. Fill remaining with highest-scoring
    const remaining = candidates
        .filter(p => !chosen.includes(p) && !hasAntagonistConflict(p, chosen))
        .sort((a, b) => scorePlant(b, zoneType, priority, focusAreas, opts) - scorePlant(a, zoneType, priority, focusAreas, opts));
    for (const p of remaining) {
        if (chosen.length >= targetCount) break;
        chosen.push(p);
    }

    return chosen;
}

// Determine zone type sequence from priority / experience / environment
function planZoneLayout(numZones, priority, experience, goals, sunExposure, soilType) {
    const foodZones      = ['vegetable', 'herb', 'orchard'];
    const ornamentalZones = ['flower', 'guild', 'herb'];
    const balancedZones  = ['vegetable', 'herb', 'orchard', 'flower', 'guild'];
    const healingZones   = ['herb', 'flower', 'vegetable', 'guild'];

    let typePool;
    if (priority === 'Mostly Food')         typePool = foodZones;
    else if (priority === 'Mostly Ornamental') typePool = ornamentalZones;
    else if (priority === 'Healing / Medicinal') typePool = healingZones;
    else                                    typePool = balancedZones;

    if (experience === 'Advanced') typePool = [...typePool, 'forest', 'guild'];

    // Sun adjustments
    if (sunExposure === 'Full Shade') {
        typePool = typePool.filter(t => t !== 'vegetable');
        typePool.unshift('forest', 'herb');
    } else if (sunExposure === 'Partial Shade') {
        typePool = typePool.map(t => t === 'vegetable' ? 'herb' : t);
    }

    // Soil adjustments
    if (soilType === 'Clay')  typePool = [...typePool, 'orchard'];
    if (soilType === 'Sandy') typePool = [...typePool, 'herb'];

    const specs = [];
    for (let i = 0; i < numZones; i++) specs.push(typePool[i % typePool.length]);
    return specs;
}

const ZONE_NAMES = {
    vegetable: ['Main Vegetable Bed', 'Kitchen Garden', 'Vegetable Guild', 'Salad Garden', 'Root & Leaf Zone'],
    herb:      ['Herb Spiral', 'Culinary Herb Garden', 'Aromatic Border', 'Medicinal Herb Patch'],
    orchard:   ['Fruit Tree Guild', 'Orchard Guild', 'Productive Canopy Zone'],
    flower:    ['Pollinator Meadow', 'Flower Guild', 'Beneficial Insect Border', 'Bloom Garden'],
    guild:     ['Permaculture Guild', 'Central Guild Zone', 'Companion Planting Guild', 'Integrated Guild'],
    forest:    ['Food Forest Edge', 'Woodland Guild', 'Perennial Forest Zone'],
};

function getZoneName(type, usedNames) {
    const options   = ZONE_NAMES[type] || ['Garden Zone'];
    const available = options.filter(n => !usedNames.has(n));
    const pool      = available.length > 0 ? available : options;
    const name      = shuffle(pool)[0];
    usedNames.add(name);
    return name;
}

const ZONE_DESCRIPTIONS = {
    vegetable: 'A productive annual bed combining food crops with supporting guild plants for pest control and fertility.',
    herb:      'A diverse herb zone providing culinary, medicinal, and ecological functions including pollinator support.',
    orchard:   'A tree and shrub guild with understory plants to maximise yield, fix nitrogen, and attract beneficial insects.',
    flower:    'A flowering zone designed to attract pollinators, repel pests, and add beauty to the garden ecosystem.',
    guild:     'An integrated permaculture guild blending multiple ecological roles for a self-sustaining productive system.',
    forest:    'A multi-layer food forest edge combining trees, shrubs, and groundcover for year-round abundance.',
};

function generateOverview(zones, priority, experience, setup, opts) {
    const zoneCount  = zones.length;
    const totalPlants = zones.reduce((sum, z) => sum + z.plants.length, 0);
    const typeList   = [...new Set(zones.map(z => z._type))].join(', ');

    const expNote = experience === 'Beginner'
        ? 'designed to be low-complexity and easy to establish'
        : experience === 'Advanced'
            ? 'featuring multi-layer guilds and perennial systems for an experienced gardener'
            : 'balanced for a gardener building permaculture skills';

    const condNote = [
        opts.soilType !== 'Loam' ? `${opts.soilType.toLowerCase()} soil` : null,
        opts.sunExposure !== 'Full Sun' ? opts.sunExposure.toLowerCase() : null,
        opts.waterSource === 'Rain Only' ? 'rain-fed conditions' : null,
        opts.slope !== 'Flat' ? `${opts.slope.toLowerCase()} terrain` : null,
    ].filter(Boolean).join(', ');

    const extras = [
        opts.wildlifeFriendly ? 'wildlife-friendly plantings' : null,
        opts.childrenPets     ? 'avoiding toxic plants' : null,
        opts.seasonFocus?.length && opts.seasonFocus.length < 4
            ? `focused on ${opts.seasonFocus.join(' & ')} harvests` : null,
    ].filter(Boolean).join(', ');

    return `A ${zoneCount}-zone permaculture garden ${expNote}, covering ${setup.widthM}m × ${setup.heightM}m in hardiness zone ${setup.hardinessZone}. The ${typeList} zones include ${totalPlants} plants chosen for guild synergy${condNote ? `, adapted for ${condNote}` : ''}, and your ${priority.toLowerCase()} priority${extras ? ` — ${extras}` : ''}.`;
}

// ── Structure placement ───────────────────────────────────────────────────────

function clampM(v, size, margin = 0) {
    return Math.max(margin, Math.min(v, size - margin));
}

function overlapsExisting(xM, yM, wM, hM, existingMetres) {
    for (const e of existingMetres) {
        const ox = e.xM, oy = e.yM, ow = e.wM || 4, oh = e.hM || 4;
        if (xM < ox + ow && xM + wM > ox && yM < oy + oh && yM + hM > oy) return true;
    }
    return false;
}

function findFreeSpot(desiredXM, desiredYM, wM, hM, widthM, heightM, existing) {
    const offsets = [
        [0, 0], [wM + 2, 0], [0, hM + 2], [-(wM + 2), 0], [0, -(hM + 2)],
        [wM + 2, hM + 2], [-(wM + 2), hM + 2],
    ];
    for (const [dx, dy] of offsets) {
        const tx = clampM(desiredXM + dx, widthM, wM);
        const ty = clampM(desiredYM + dy, heightM, hM);
        if (!overlapsExisting(tx, ty, wM, hM, existing)) return { xM: tx, yM: ty };
    }
    return { xM: clampM(desiredXM, widthM, wM), yM: clampM(desiredYM, heightM, hM) };
}

function suggestStructures(setup, zoneTypes, existingItems, wantedSet, opts = {}) {
    const { widthM = 50, heightM = 30, goals = [] } = setup;
    const existingNames = new Set(existingItems.map(i => i.name));
    const suggestions   = [];

    const existingM = existingItems.map(i => ({
        xM: i.xM ?? 0, yM: i.yM ?? 0, wM: i.wM ?? 4, hM: i.hM ?? 4,
    }));

    const house = existingItems.find(i => i.name === 'House');
    const hx = house ? (house.xM ?? widthM * 0.5) : widthM * 0.5;
    const hy = house ? (house.yM ?? heightM * 0.1) : heightM * 0.1;

    const foodFocus  = goals.includes('Food Production') || zoneTypes.includes('vegetable') || zoneTypes.includes('orchard');
    const waterFocus = goals.includes('Water Retention') || goals.includes('Biodiversity') || opts.wildlifeFriendly;
    const steepSlope = opts.slope === 'Steep';
    const gentleSlope = opts.slope === 'Gentle Slope';

    const want = (name) => wantedSet.has(name) && !existingNames.has(name);

    // ── Greenhouse ──────────────────────────────────────────────────────────
    if (want('Greenhouse') && foodFocus && opts.sunExposure !== 'Full Shade') {
        const wM = 5, hM = 4;
        const desired = { xM: hx + widthM * 0.08, yM: hy + heightM * 0.15 };
        const pos = findFreeSpot(desired.xM, desired.yM, wM, hM, widthM, heightM, existingM);
        existingM.push({ ...pos, wM, hM });
        suggestions.push({ name: 'Greenhouse', ...pos, wM, hM, reason: 'Zone 1 placement — close to the house for daily access and maximum sun exposure.' });
    }

    // ── Raised Bed ──────────────────────────────────────────────────────────
    if (want('Raised Bed') && (steepSlope || opts.soilType === 'Clay' || opts.soilType === 'Sandy')) {
        const wM = 3, hM = 1.2;
        const desired = { xM: hx + widthM * 0.05, yM: hy + heightM * 0.2 };
        const pos = findFreeSpot(desired.xM, desired.yM, wM, hM, widthM, heightM, existingM);
        existingM.push({ ...pos, wM, hM });
        const soilNote = steepSlope ? 'Terraced raised beds suit the slope and prevent soil erosion.'
            : `Raised beds improve drainage and bypass ${opts.soilType.toLowerCase()} soil challenges.`;
        suggestions.push({ name: 'Raised Bed', ...pos, wM, hM, reason: soilNote });
    }

    // ── Compost ─────────────────────────────────────────────────────────────
    if (want('Compost') && (foodFocus || zoneTypes.includes('herb'))) {
        const wM = 2, hM = 2;
        const desired = { xM: widthM * 0.75, yM: heightM * 0.25 };
        const pos = findFreeSpot(desired.xM, desired.yM, wM, hM, widthM, heightM, existingM);
        existingM.push({ ...pos, wM, hM });
        suggestions.push({ name: 'Compost', ...pos, wM, hM, reason: 'Positioned near vegetable zones to close the nutrient loop with minimal effort.' });
    }

    // ── Pond ─────────────────────────────────────────────────────────────────
    if (want('Pond') && (waterFocus || zoneTypes.includes('guild')) && !steepSlope) {
        const wM = 5, hM = 5;
        // On a gentle slope, place pond at the lowest point (bottom third)
        const yFactor = gentleSlope ? 0.72 : 0.62;
        const desired = { xM: widthM * 0.55, yM: heightM * yFactor };
        const pos = findFreeSpot(desired.xM, desired.yM, wM, hM, widthM, heightM, existingM);
        existingM.push({ ...pos, wM, hM });
        const pondNote = gentleSlope
            ? 'Sited at the lowest point on the slope to collect natural runoff — doubles as a wildlife habitat.'
            : 'Central-low position to collect runoff, support biodiversity, and humidify surrounding zones.';
        suggestions.push({ name: 'Pond', ...pos, wM, hM, reason: pondNote });
    }

    // ── Coop ─────────────────────────────────────────────────────────────────
    if (want('Coop') && foodFocus) {
        const wM = 3, hM = 3;
        const desired = { xM: widthM * 0.18, yM: heightM * 0.65 };
        const pos = findFreeSpot(desired.xM, desired.yM, wM, hM, widthM, heightM, existingM);
        existingM.push({ ...pos, wM, hM });
        suggestions.push({ name: 'Coop', ...pos, wM, hM, reason: 'Sited for easy rotation into vegetable beds — chickens fertilise and clear beds between seasons.' });
    }

    // ── Path ─────────────────────────────────────────────────────────────────
    if (want('Path')) {
        const wM = widthM * 0.4, hM = 1.2;
        const px = clampM(hx - wM / 2, widthM, 0);
        const py = clampM(hy + heightM * 0.12, heightM, hM);
        existingM.push({ xM: px, yM: py, wM, hM });
        suggestions.push({ name: 'Path', xM: px, yM: py, wM, hM, reason: 'Central spine path connecting the house to the main growing areas.' });
    }

    return suggestions;
}

// ── Main controller ───────────────────────────────────────────────────────────

export const generateGardenPlan = async (req, res) => {
    try {
        const {
            setup              = {},
            numZones           = 3,
            experience         = 'Beginner',
            maintenance        = 'Medium',
            priority           = 'Balanced',
            soilType           = 'Loam',
            sunExposure        = 'Full Sun',
            waterSource        = 'Manual',
            slope              = 'Flat',
            wantedStructures   = ['Path', 'Greenhouse', 'Pond', 'Compost', 'Raised Bed', 'Coop'],
            seasonFocus        = ['Spring', 'Summer', 'Autumn', 'Winter'],
            avoidPlants        = [],
            wildlifeFriendly   = false,
            childrenPets       = false,
            specialNotes       = '',
            includeFavorites   = false,
            favoritePlants     = [],
            existingOverlayItems = [],
        } = req.body;

        const hardinessZone = setup.hardinessZone || '7b';
        const focusAreas    = setup.focusAreas || [];
        const goals         = setup.goals || [];

        const opts = { soilType, sunExposure, waterSource, slope, wildlifeFriendly, childrenPets, seasonFocus };

        const allPlants = await Plant.find(
            {},
            'name category guildRole ecologicalFunctions companions antagonists planting.zoneTimes'
        ).lean();

        // Filter by hardiness zone
        let zonePlants = allPlants.filter(p => {
            const zt = p.planting?.zoneTimes;
            if (!zt || Object.keys(zt).length === 0) return true;
            return zt[hardinessZone] != null;
        });
        if (zonePlants.length < 5) zonePlants = allPlants;

        // Exclude user-specified avoidance list (case-insensitive)
        const avoidSet = new Set(avoidPlants.map(n => n.toLowerCase()));
        if (avoidSet.size > 0) {
            zonePlants = zonePlants.filter(p => !avoidSet.has(p.name.toLowerCase()));
        }

        const favSet = new Set(includeFavorites ? favoritePlants : []);

        const zoneTypes = planZoneLayout(numZones, priority, experience, goals, sunExposure, soilType);

        // Target plants per zone — adjusted by maintenance and water
        let targetCount = maintenance === 'Low' ? 3 : maintenance === 'High' ? 6 : 5;
        if (waterSource === 'Rain Only') targetCount = Math.max(3, targetCount - 1);

        const usedNames = new Set();
        const zones = zoneTypes.map((type) => {
            const candidates = shuffle(zonePlants).sort((a, b) =>
                scorePlant(b, type, priority, focusAreas, opts) -
                scorePlant(a, type, priority, focusAreas, opts)
            );
            const chosenPlants = pickPlantsForZone(candidates, type, priority, focusAreas, favSet, targetCount, opts);
            const zoneName = getZoneName(type, usedNames);
            return {
                name: zoneName,
                plants: chosenPlants.map(p => p.name),
                description: ZONE_DESCRIPTIONS[type] || 'A productive permaculture zone.',
                _type: type,
            };
        });

        const overview    = generateOverview(zones, priority, experience, setup, opts);
        const wantedSet   = new Set(wantedStructures);
        const structures  = suggestStructures(setup, zoneTypes, existingOverlayItems, wantedSet, opts);

        const cleanZones  = zones.map(({ _type, ...rest }) => rest);

        res.json({ success: true, plan: { overview, zones: cleanZones, structures } });
    } catch (err) {
        console.error('Garden generation error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Crop companion knowledge base ─────────────────────────────────────────────
const CROP_KNOWLEDGE = {
    tomato:     { aliases: ['tomato','tomatoes','tomate','cherry tomato','roma tomato','tomato (roma)'], bedLabel: 'Tomato Companion Bed',   companions: ['Basil','Marigold','Parsley','Calendula'], antagonists: ['Potato','Fennel'], notes: 'Provide stakes or cages. Plant basil nearby to improve flavour and deter aphids.', spacingCm: 50 },
    cucumber:   { aliases: ['cucumber','cucumbers','castravete','castraveți','castravetele'],            bedLabel: 'Cucumber Trellis Bed',    companions: ['Dill','Nasturtium','Bean','Radish'],      antagonists: ['Potato','Sage'],   notes: 'Install trellis on north side. Dill attracts pest predators.',               spacingCm: 40 },
    pepper:     { aliases: ['pepper','peppers','bell pepper','ardei','capsicum','chili','chilli'],       bedLabel: 'Pepper & Herb Bed',       companions: ['Basil','Carrot','Parsley','Marigold'],    antagonists: ['Fennel'],         notes: 'Peppers benefit from basil neighbours. Avoid brassicas.',                   spacingCm: 45 },
    eggplant:   { aliases: ['eggplant','aubergine','vânătă','vanata','brinjal'],                        bedLabel: 'Eggplant Companion Bed',  companions: ['Basil','Marigold','Tarragon'],            antagonists: ['Fennel'],         notes: 'Needs warm spot. Companion marigolds deter nematodes.',                      spacingCm: 50 },
    lettuce:    { aliases: ['lettuce','salad','salad greens','mixed greens','salata','leafy greens','greens','leaf lettuce'], bedLabel: 'Salad Greens Bed', companions: ['Radish','Spring Onion','Chive','Carrot'], antagonists: [], notes: 'Interplant with radish to deter leaf miners. Shade-tolerant.', spacingCm: 25 },
    carrot:     { aliases: ['carrot','carrots','morcov','morcovi'],                                     bedLabel: 'Root Crops Bed',          companions: ['Leek','Onion','Rosemary','Chive'],        antagonists: ['Dill'],           notes: 'Deep loose soil for straight roots. Companion leeks repel carrot fly.',      spacingCm: 8  },
    onion:      { aliases: ['onion','onions','ceapă','ceapa','shallot','scallion','spring onion'],       bedLabel: 'Allium Bed',              companions: ['Carrot','Lettuce','Tomato','Chamomile'],  antagonists: ['Bean','Pea'],     notes: 'Onions deter many pests. Great companion for most vegetables.',              spacingCm: 10 },
    garlic:     { aliases: ['garlic','usturoi','ustoroi'],                                              bedLabel: 'Garlic & Allium Bed',     companions: ['Tomato','Carrot','Chamomile'],            antagonists: ['Bean','Pea'],     notes: 'Plant garlic in autumn for summer harvest. Natural pest deterrent.',         spacingCm: 10 },
    bean:       { aliases: ['bean','beans','fasole','french bean','pole bean','runner bean','climbing bean','green bean'], bedLabel: 'Legume Trellis Bed', companions: ['Carrot','Cucumber','Nasturtium','Marigold'], antagonists: ['Onion','Garlic','Fennel'], notes: 'Beans fix nitrogen. Rotate where brassicas will grow next year.', spacingCm: 20 },
    pea:        { aliases: ['pea','peas','mazăre','mazare','snow pea','sugar snap','garden pea'],        bedLabel: 'Pea & Legume Bed',        companions: ['Carrot','Radish','Lettuce','Spinach'],    antagonists: ['Onion','Garlic'], notes: 'Install support netting early. Nitrogen fixer — great before brassicas.',   spacingCm: 8  },
    zucchini:   { aliases: ['zucchini','courgette','dovlecel','squash','summer squash','marrow'],        bedLabel: 'Zucchini Companion Bed',  companions: ['Nasturtium','Marigold','Dill','Bean'],    antagonists: [],                 notes: 'Give ample space (1-2m per plant). Nasturtiums distract aphids.',            spacingCm: 80 },
    pumpkin:    { aliases: ['pumpkin','dovleac','butternut','winter squash','acorn squash'],             bedLabel: 'Cucurbit Bed',            companions: ['Nasturtium','Bean','Corn','Marigold'],    antagonists: [],                 notes: 'Large space needed. Three Sisters with corn and beans is a classic guild.',  spacingCm: 100},
    cabbage:    { aliases: ['cabbage','varza','kale','broccoli','kohlrabi','brassica','cauliflower'],    bedLabel: 'Brassica Companion Bed',  companions: ['Dill','Thyme','Sage','Nasturtium','Onion'],antagonists: ['Tomato','Fennel'],notes: 'Dill attracts pest-predator wasps. Rotate with legumes each year.',          spacingCm: 45 },
    spinach:    { aliases: ['spinach','spanac','chard','swiss chard','mangold','beet greens'],           bedLabel: 'Leafy Greens Bed',        companions: ['Radish','Strawberry','Pea','Lettuce'],    antagonists: [],                 notes: 'Fast-growing cool-season crop. Interplant with radish.',                     spacingCm: 15 },
    radish:     { aliases: ['radish','ridiche','raphanus','daikon'],                                    bedLabel: 'Quick Crops Bed',         companions: ['Lettuce','Tomato','Carrot','Spinach'],    antagonists: [],                 notes: 'Ready in 3-4 weeks. Trap crop for flea beetles.',                            spacingCm: 5  },
    potato:     { aliases: ['potato','potatoes','cartofi','cartof'],                                    bedLabel: 'Potato Companion Bed',    companions: ['Bean','Marigold','Chamomile'],            antagonists: ['Tomato','Cucumber','Fennel'], notes: 'Hill up soil around stems. Keep well away from tomatoes (shared blight risk).', spacingCm: 35 },
    herb:       { aliases: ['herb','herbs','basil','dill','parsley','thyme','chive','mint','oregano','rosemary','sage','lovage'], bedLabel: 'Kitchen Herb Bed', companions: ['Tomato','Pepper','Carrot'], antagonists: [], notes: 'Mixed culinary herb bed near kitchen. Herbs deter pests and attract pollinators.', spacingCm: 20 },
    beetroot:   { aliases: ['beetroot','beet','sfeclă','sfecla','red beet','beets'],                    bedLabel: 'Root & Leaf Bed',         companions: ['Onion','Lettuce','Kohlrabi'],             antagonists: ['Bean'],           notes: 'Tolerates partial shade. Harvest young leaves as salad greens.',             spacingCm: 12 },
    strawberry: { aliases: ['strawberry','strawberries','căpșuni','capsuni'],                           bedLabel: 'Strawberry Bed',          companions: ['Borage','Lettuce','Spinach','Marigold'], antagonists: ['Cabbage','Fennel'],notes: 'Mulch with straw to keep fruit clean. Borage improves yield.',               spacingCm: 30 },
    corn:       { aliases: ['corn','sweet corn','porumb','maize'],                                      bedLabel: 'Three Sisters Bed',       companions: ['Bean','Pumpkin','Nasturtium'],            antagonists: [],                 notes: 'Classic Three Sisters guild — corn provides trellis for beans, pumpkin shades soil.', spacingCm: 35 },
    flower:     { aliases: ['flower','flowers','marigold','calendula','nasturtium','borage','chamomile','companion flower'], bedLabel: 'Companion Flower Border', companions: ['Tomato','Cabbage','Bean','Cucumber'], antagonists: [], notes: 'Companion flowers attract pollinators, repel pests, and improve yield throughout.', spacingCm: 20 },
};

// Supplementary beds added when more beds are requested than crops provided
const SUPPLEMENT_ORDER = ['herb','lettuce','radish','beetroot','spinach','bean','pea','flower'];

// ── Zone bed helpers ──────────────────────────────────────────────────────────

function parseCropList(requestedCrops = [], focusNote = '') {
    const all = new Set();
    requestedCrops.forEach(c => { if (c && typeof c === 'string') all.add(c.trim().toLowerCase()); });
    if (focusNote) focusNote.split(/[,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean).forEach(c => all.add(c));
    return [...all];
}

function matchCropKey(term) {
    const lower = (term || '').toLowerCase().trim();
    if (!lower) return null;
    for (const [key, entry] of Object.entries(CROP_KNOWLEDGE)) {
        if (entry.aliases.some(a => lower === a || lower.includes(a) || a.includes(lower))) return key;
    }
    return null;
}

function properCase(str) { return str.replace(/\b\w/g, c => c.toUpperCase()); }

function buildBedsFromCrops(cropKeys, zonePlants, bedW, bedH, hasGreenhouse) {
    const GREENHOUSE_CROPS = new Set(['pepper', 'eggplant']);
    const usedCompanionNames = new Set();
    const beds = [];

    for (const key of cropKeys) {
        if (hasGreenhouse && GREENHOUSE_CROPS.has(key)) continue;
        const entry = CROP_KNOWLEDGE[key];
        if (!entry) continue;

        // Find proper-cased name from DB, fall back to properCase of first alias
        const dbPlant = zonePlants.find(p => entry.aliases.some(a => p.name.toLowerCase() === a || p.name.toLowerCase().startsWith(a.split(' ')[0])));
        const leadName = dbPlant ? dbPlant.name : properCase(entry.aliases[0]);

        // Companions: prefer DB companions, fall back to static list
        const companionPool = (dbPlant?.companions?.length > 0) ? dbPlant.companions : entry.companions;
        const companionPlants = [];
        for (const compName of companionPool) {
            if (companionPlants.length >= 3) break;
            const compLower = compName.toLowerCase();
            if (compLower === leadName.toLowerCase()) continue;
            // Skip companions that conflict with any requested lead crop
            const conflict = cropKeys.some(k => CROP_KNOWLEDGE[k]?.antagonists?.some(ant => ant.toLowerCase() === compLower));
            if (conflict || usedCompanionNames.has(compLower)) continue;
            const dbComp = zonePlants.find(p => p.name.toLowerCase() === compLower || p.name.toLowerCase().startsWith(compLower.split(' ')[0]));
            companionPlants.push(dbComp ? dbComp.name : compName);
            usedCompanionNames.add(compLower);
        }

        beds.push({
            name: entry.bedLabel,
            widthM: parseFloat(bedW.toFixed(1)),
            heightM: parseFloat(bedH.toFixed(1)),
            plants: [
                { name: leadName, role: 'main', spacingCm: dbPlant?.planting?.spacingCm || entry.spacingCm || 30 },
                ...companionPlants.map(c => ({ name: c, role: 'companion', spacingCm: 25 })),
            ],
            notes: entry.notes || null,
            rationale: companionPlants.length > 0
                ? `${leadName} (requested) grows well with ${companionPlants.slice(0, 2).join(', ')}.`
                : `A dedicated ${leadName} bed as requested.`,
        });
    }
    return beds;
}

function buildSupplementaryBeds(count, existingKeys, zonePlants, bedW, bedH) {
    const beds = [];
    for (const key of SUPPLEMENT_ORDER) {
        if (beds.length >= count) break;
        if (existingKeys.includes(key)) continue;
        const entry = CROP_KNOWLEDGE[key];
        if (!entry) continue;
        const dbPlant = zonePlants.find(p => entry.aliases.some(a => p.name.toLowerCase() === a));
        const leadName = dbPlant ? dbPlant.name : properCase(entry.aliases[0]);
        beds.push({
            name: entry.bedLabel,
            widthM: parseFloat(bedW.toFixed(1)),
            heightM: parseFloat(bedH.toFixed(1)),
            plants: [
                { name: leadName, role: 'main', spacingCm: entry.spacingCm || 25 },
                ...entry.companions.slice(0, 2).map(c => ({ name: c, role: 'companion', spacingCm: 20 })),
            ],
            notes: entry.notes || null,
            rationale: 'Supplementary bed — pairs well with your selected crops.',
        });
    }
    return beds;
}

// ── Zone bed generator ────────────────────────────────────────────────────────
export const generateZoneBeds = async (req, res) => {
    try {
        const {
            zoneName          = 'Vegetable Garden',
            requestedCrops    = [],
            focusNote         = '',
            preferredBedCount = 0,
            hardinessZone     = '7b',
            zoneWidthM        = 8,
            zoneHeightM       = 5,
            existingStructures = [],
        } = req.body;

        // 1. Parse and match requested crops
        const cropTerms = parseCropList(requestedCrops, focusNote);
        const cropKeys  = [...new Set(cropTerms.map(matchCropKey).filter(Boolean))];

        // 2. Load plants from DB for proper names and companion data
        let allPlants = await Plant.find({},
            'name category guildRole ecologicalFunctions companions antagonists planting.zoneTimes planting.spacingCm'
        ).lean();
        let zonePlants = allPlants.filter(p => {
            const zt = p.planting?.zoneTimes;
            if (!zt || Object.keys(zt).length === 0) return true;
            return zt[hardinessZone] != null;
        });
        if (zonePlants.length < 5) zonePlants = allPlants;

        // 3. Greenhouse check
        const hasGreenhouse = existingStructures.some(s => {
            const n = ((s.name || '') + (s.type || '')).toLowerCase();
            return n.includes('greenhouse') || n.includes('polytunnel');
        });

        // 4. Bed sizing from actual zone area
        const BED_H   = 1.2;
        const BED_PATH = 0.5;
        const maxBedsH = Math.max(2, Math.floor((Number(zoneHeightM) + BED_PATH) / (BED_H + BED_PATH)));
        const BED_W   = parseFloat(Math.min(Math.max(1.5, Number(zoneWidthM) - 1.0), 3.0).toFixed(1));

        // 5. Build beds from matched crops
        const primaryBeds = buildBedsFromCrops(cropKeys, zonePlants, BED_W, BED_H, hasGreenhouse);

        // 6. Determine final bed count
        const autoBedCount   = Math.min(Math.max(primaryBeds.length || 2, 2), maxBedsH, 8);
        const finalBedCount  = Number(preferredBedCount) > 0
            ? Math.min(Number(preferredBedCount), maxBedsH, 8)
            : autoBedCount;

        // 7. Trim or pad with supplementary beds
        let beds = primaryBeds.slice(0, finalBedCount);
        if (beds.length < finalBedCount) {
            beds = [...beds, ...buildSupplementaryBeds(finalBedCount - beds.length, cropKeys, zonePlants, BED_W, BED_H)];
        }

        // 8. Build reason string
        const namedCrops = cropKeys.map(k => CROP_KNOWLEDGE[k].bedLabel.replace(/ Companion| Trellis| & .*/, '').replace(' Bed', ''));
        const reason = cropKeys.length > 0
            ? `${beds.length} bed${beds.length !== 1 ? 's' : ''} planned for ${namedCrops.slice(0, 3).join(', ')}${cropKeys.length > 3 ? ` and ${cropKeys.length - 3} more` : ''}, sized for a ${Number(zoneWidthM).toFixed(1)}m × ${Number(zoneHeightM).toFixed(1)}m zone.`
            : `${beds.length} general vegetable beds for a ${Number(zoneWidthM).toFixed(1)}m × ${Number(zoneHeightM).toFixed(1)}m zone.`;

        res.json({ success: true, bedPlan: { recommendedBedCount: beds.length, reason, beds } });
    } catch (err) {
        console.error('[generateZoneBeds]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
