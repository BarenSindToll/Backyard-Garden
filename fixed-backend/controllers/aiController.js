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
