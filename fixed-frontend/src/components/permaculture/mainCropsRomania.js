/**
 * mainCropsRomania.js
 *
 * Curated list of common crops and permaculture plants for Romania.
 * Used by: PermaculturePlanWizard, AI payload, plan generation.
 *
 * preferredStructure: where this crop grows best on the General Map
 *   "greenhouse" | "raised-bed" | "field" | "orchard" | "berry-patch" | "guild"
 * permacultureZone: typical zone placement (0–5)
 */

export const MAIN_CROPS_ROMANIA = [

    // ── Vegetables ────────────────────────────────────────────────────────────
    {
        name: 'Tomato', labelRo: 'Roșii',
        group: 'Vegetables', category: 'fruiting_vegetable',
        priority: 1, commonInRomania: true,
        preferredStructure: 'greenhouse', permacultureZone: 1,
        notes: 'Grows best under glass in Romania; can be field-grown in warm summers.',
    },
    {
        name: 'Pepper', labelRo: 'Ardei',
        group: 'Vegetables', category: 'fruiting_vegetable',
        priority: 1, commonInRomania: true,
        preferredStructure: 'greenhouse', permacultureZone: 1,
        notes: 'Both sweet (kapia) and hot varieties are staples of Romanian cuisine.',
    },
    {
        name: 'Eggplant', labelRo: 'Vinete',
        group: 'Vegetables', category: 'fruiting_vegetable',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Prefers warm, rich, well-drained soil.',
    },
    {
        name: 'Cucumber', labelRo: 'Castraveți',
        group: 'Vegetables', category: 'fruiting_vegetable',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Can be trellised vertically to save space.',
    },
    {
        name: 'Zucchini', labelRo: 'Dovlecel',
        group: 'Vegetables', category: 'fruiting_vegetable',
        priority: 1, commonInRomania: true,
        preferredStructure: 'field', permacultureZone: 2,
        notes: 'Space-hungry but very productive; use large leaves as ground cover.',
    },
    {
        name: 'Pumpkin', labelRo: 'Dovleac',
        group: 'Vegetables', category: 'vine',
        priority: 2, commonInRomania: true,
        preferredStructure: 'field', permacultureZone: 2,
        notes: 'Traditional Three Sisters crop alongside corn and beans.',
    },
    {
        name: 'Bean', labelRo: 'Fasole',
        group: 'Vegetables', category: 'legume',
        priority: 1, commonInRomania: true,
        preferredStructure: 'field', permacultureZone: 2,
        notes: 'Nitrogen fixer; companions with corn and pumpkin.',
    },
    {
        name: 'Pea', labelRo: 'Mazăre',
        group: 'Vegetables', category: 'legume',
        priority: 2, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Spring crop; fixes nitrogen and matures before summer heat.',
    },
    {
        name: 'Corn', labelRo: 'Porumb',
        group: 'Vegetables', category: 'grain',
        priority: 2, commonInRomania: true,
        preferredStructure: 'field', permacultureZone: 2,
        notes: 'Trellis for beans in Three Sisters; needs space.',
    },
    {
        name: 'Potato', labelRo: 'Cartofi',
        group: 'Vegetables', category: 'root_crop',
        priority: 1, commonInRomania: true,
        preferredStructure: 'field', permacultureZone: 2,
        notes: 'Avoid planting near tomatoes or eggplants due to shared disease risk.',
    },

    // ── Roots & Bulbs ─────────────────────────────────────────────────────────
    {
        name: 'Carrot', labelRo: 'Morcovi',
        group: 'Roots & Bulbs', category: 'root_crop',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: '',
    },
    {
        name: 'Parsley Root', labelRo: 'Pătrunjel rădăcină',
        group: 'Roots & Bulbs', category: 'root_crop',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Essential Romanian soup vegetable.',
    },
    {
        name: 'Celery Root', labelRo: 'Țelină',
        group: 'Roots & Bulbs', category: 'root_crop',
        priority: 2, commonInRomania: true,
        preferredStructure: 'field', permacultureZone: 2,
        notes: 'Slow-growing; needs rich, moist soil.',
    },
    {
        name: 'Beetroot', labelRo: 'Sfeclă roșie',
        group: 'Roots & Bulbs', category: 'root_crop',
        priority: 2, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: '',
    },
    {
        name: 'Radish', labelRo: 'Ridichi',
        group: 'Roots & Bulbs', category: 'root_crop',
        priority: 2, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Fast-growing gap filler; good between slower crops.',
    },
    {
        name: 'Onion', labelRo: 'Ceapă',
        group: 'Roots & Bulbs', category: 'bulb',
        priority: 1, commonInRomania: true,
        preferredStructure: 'field', permacultureZone: 2,
        notes: 'Good companion near carrots.',
    },
    {
        name: 'Garlic', labelRo: 'Usturoi',
        group: 'Roots & Bulbs', category: 'bulb',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Pest repellent near roses and fruit trees; plant autumn through spring.',
    },

    // ── Leafy Greens ──────────────────────────────────────────────────────────
    {
        name: 'Lettuce', labelRo: 'Salată verde',
        group: 'Leafy Greens', category: 'leafy_green',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Good under taller crops in partial shade.',
    },
    {
        name: 'Spinach', labelRo: 'Spanac',
        group: 'Leafy Greens', category: 'leafy_green',
        priority: 2, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Spring and autumn crop; bolts in summer heat.',
    },
    {
        name: 'Cabbage', labelRo: 'Varză',
        group: 'Leafy Greens', category: 'leafy_green',
        priority: 1, commonInRomania: true,
        preferredStructure: 'field', permacultureZone: 2,
        notes: '',
    },
    {
        name: 'Kale', labelRo: 'Kale',
        group: 'Leafy Greens', category: 'leafy_green',
        priority: 3, commonInRomania: false,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Very hardy; harvest through winter in mild zones.',
    },
    {
        name: 'Swiss Chard', labelRo: 'Mangold',
        group: 'Leafy Greens', category: 'leafy_green',
        priority: 2, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Long harvest season from spring to first frost.',
    },

    // ── Herbs ─────────────────────────────────────────────────────────────────
    {
        name: 'Parsley', labelRo: 'Pătrunjel',
        group: 'Herbs', category: 'herb',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: '',
    },
    {
        name: 'Dill', labelRo: 'Mărar',
        group: 'Herbs', category: 'herb',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Self-seeds readily; companion for cabbage family.',
    },
    {
        name: 'Lovage', labelRo: 'Leuștean',
        group: 'Herbs', category: 'herb',
        priority: 1, commonInRomania: true,
        preferredStructure: 'guild', permacultureZone: 1,
        notes: 'Perennial; very common in Romanian gardens as a soup herb.',
    },
    {
        name: 'Basil', labelRo: 'Busuioc',
        group: 'Herbs', category: 'herb',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Classic companion for tomatoes; needs warmth.',
    },
    {
        name: 'Thyme', labelRo: 'Cimbru',
        group: 'Herbs', category: 'herb',
        priority: 2, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Perennial; good dry-edge plant.',
    },
    {
        name: 'Summer Savory', labelRo: 'Cimbru de grădină',
        group: 'Herbs', category: 'herb',
        priority: 2, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Traditional companion for beans.',
    },
    {
        name: 'Mint', labelRo: 'Mentă',
        group: 'Herbs', category: 'herb',
        priority: 2, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 1,
        notes: 'Grow in a container to prevent invasive spreading.',
    },
    {
        name: 'Sage', labelRo: 'Salvie',
        group: 'Herbs', category: 'herb',
        priority: 3, commonInRomania: true,
        preferredStructure: 'guild', permacultureZone: 1,
        notes: 'Perennial medicinal and culinary herb; drought-tolerant.',
    },

    // ── Fruit Trees & Shrubs ──────────────────────────────────────────────────
    {
        name: 'Apple', labelRo: 'Măr',
        group: 'Fruit Trees & Shrubs', category: 'tree',
        priority: 1, commonInRomania: true,
        preferredStructure: 'orchard', permacultureZone: 3,
        notes: '',
    },
    {
        name: 'Pear', labelRo: 'Păr',
        group: 'Fruit Trees & Shrubs', category: 'tree',
        priority: 1, commonInRomania: true,
        preferredStructure: 'orchard', permacultureZone: 3,
        notes: '',
    },
    {
        name: 'Plum', labelRo: 'Prun',
        group: 'Fruit Trees & Shrubs', category: 'tree',
        priority: 1, commonInRomania: true,
        preferredStructure: 'orchard', permacultureZone: 3,
        notes: 'Very common Romanian fruit tree; many traditional varieties.',
    },
    {
        name: 'Cherry', labelRo: 'Cireș',
        group: 'Fruit Trees & Shrubs', category: 'tree',
        priority: 1, commonInRomania: true,
        preferredStructure: 'orchard', permacultureZone: 3,
        notes: '',
    },
    {
        name: 'Sour Cherry', labelRo: 'Vișin',
        group: 'Fruit Trees & Shrubs', category: 'tree',
        priority: 2, commonInRomania: true,
        preferredStructure: 'orchard', permacultureZone: 3,
        notes: 'Traditional Romanian fruit tree; used for juice and preserves.',
    },
    {
        name: 'Walnut', labelRo: 'Nuc',
        group: 'Fruit Trees & Shrubs', category: 'tree',
        priority: 2, commonInRomania: true,
        preferredStructure: 'orchard', permacultureZone: 3,
        notes: 'Allelopathic — keep at least 10 m from vegetable beds.',
    },
    {
        name: 'Hazelnut', labelRo: 'Alun',
        group: 'Fruit Trees & Shrubs', category: 'shrub',
        priority: 2, commonInRomania: true,
        preferredStructure: 'guild', permacultureZone: 3,
        notes: 'Excellent edible hedge plant; provides shrub layer in guilds.',
    },
    {
        name: 'Fig', labelRo: 'Smochin',
        group: 'Fruit Trees & Shrubs', category: 'tree',
        priority: 3, commonInRomania: true,
        preferredStructure: 'orchard', permacultureZone: 3,
        notes: 'Best in warm or south-facing protected microclimates.',
    },
    {
        name: 'Grape', labelRo: 'Viță de vie',
        group: 'Fruit Trees & Shrubs', category: 'vine',
        priority: 1, commonInRomania: true,
        preferredStructure: 'guild', permacultureZone: 2,
        notes: 'Needs trellis and good airflow; very traditional in Romania.',
    },
    {
        name: 'Strawberry', labelRo: 'Căpșuni',
        group: 'Fruit Trees & Shrubs', category: 'groundcover',
        priority: 1, commonInRomania: true,
        preferredStructure: 'berry-patch', permacultureZone: 2,
        notes: 'Good living groundcover under taller crops.',
    },
    {
        name: 'Raspberry', labelRo: 'Zmeur',
        group: 'Fruit Trees & Shrubs', category: 'shrub',
        priority: 1, commonInRomania: true,
        preferredStructure: 'berry-patch', permacultureZone: 2,
        notes: '',
    },
    {
        name: 'Blackberry', labelRo: 'Mur',
        group: 'Fruit Trees & Shrubs', category: 'shrub',
        priority: 2, commonInRomania: true,
        preferredStructure: 'berry-patch', permacultureZone: 3,
        notes: 'Productive edge plant; manage spread.',
    },
    {
        name: 'Currant', labelRo: 'Coacăz',
        group: 'Fruit Trees & Shrubs', category: 'shrub',
        priority: 2, commonInRomania: true,
        preferredStructure: 'berry-patch', permacultureZone: 2,
        notes: 'Tolerates partial shade; good under orchard trees.',
    },

    // ── Permaculture Support ──────────────────────────────────────────────────
    {
        name: 'Comfrey', labelRo: 'Tătăneasă',
        group: 'Permaculture Support', category: 'dynamic_accumulator',
        priority: 2, commonInRomania: true,
        preferredStructure: 'guild', permacultureZone: 3,
        notes: 'Plant near fruit trees; chop-and-drop for free fertiliser.',
    },
    {
        name: 'Clover', labelRo: 'Trifoi',
        group: 'Permaculture Support', category: 'cover_crop',
        priority: 2, commonInRomania: true,
        preferredStructure: 'guild', permacultureZone: 3,
        notes: 'Nitrogen fixer; use as living mulch in orchards.',
    },
    {
        name: 'Calendula', labelRo: 'Gălbenele',
        group: 'Permaculture Support', category: 'flower',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 2,
        notes: 'Excellent companion flower; medicinal; self-seeds.',
    },
    {
        name: 'Marigold', labelRo: 'Crăițe',
        group: 'Permaculture Support', category: 'flower',
        priority: 1, commonInRomania: true,
        preferredStructure: 'raised-bed', permacultureZone: 2,
        notes: 'Strong pest deterrent near tomatoes, peppers, and cabbage.',
    },
    {
        name: 'Lavender', labelRo: 'Lavandă',
        group: 'Permaculture Support', category: 'herb',
        priority: 2, commonInRomania: true,
        preferredStructure: 'guild', permacultureZone: 2,
        notes: 'Drought-tolerant border plant; attracts pollinators.',
    },
    {
        name: 'Borage', labelRo: 'Limba mielului',
        group: 'Permaculture Support', category: 'flower',
        priority: 3, commonInRomania: false,
        preferredStructure: 'guild', permacultureZone: 2,
        notes: 'Strong pollinator attractor; dynamic accumulator; self-seeds prolifically.',
    },
    {
        name: 'Yarrow', labelRo: 'Coada șoricelului',
        group: 'Permaculture Support', category: 'dynamic_accumulator',
        priority: 2, commonInRomania: true,
        preferredStructure: 'guild', permacultureZone: 3,
        notes: 'Dynamic accumulator; attracts beneficial insects; medicinal.',
    },
    {
        name: 'Phacelia', labelRo: 'Facelia',
        group: 'Permaculture Support', category: 'cover_crop',
        priority: 3, commonInRomania: false,
        preferredStructure: 'field', permacultureZone: 2,
        notes: 'Exceptional bee forage; fast-growing green manure.',
    },
];

export const MAIN_CROP_NAMES_ROMANIA = MAIN_CROPS_ROMANIA.map(p => p.name);

export const MAIN_CROP_GROUPS_ROMANIA = [
    'Vegetables',
    'Roots & Bulbs',
    'Leafy Greens',
    'Herbs',
    'Fruit Trees & Shrubs',
    'Permaculture Support',
];

export const STRUCTURE_ICON = {
    'greenhouse':  '🏡',
    'raised-bed':  '🪴',
    'field':       '🌾',
    'orchard':     '🍎',
    'berry-patch': '🫐',
    'guild':       '🌀',
};

export function getMainCropsByGroup(group) {
    return MAIN_CROPS_ROMANIA.filter(p => p.group === group);
}

export function getPriorityMainCrops(limit = 20) {
    return [...MAIN_CROPS_ROMANIA]
        .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
        .slice(0, limit);
}
