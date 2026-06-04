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
};

export const ZONE_AREA_ELEMENT_TYPES = new Set([
    'orchard', 'guild', 'berry-patch', 'herb-garden',
    'food-forest', 'wild-zone', 'patio', 'permaculture-zone',
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
]);

export const DETAIL_PLAN_CAPABLE_TYPES = new Set([
    'raised-bed', 'greenhouse', 'orchard', 'guild', 'berry-patch', 'herb-garden',
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
