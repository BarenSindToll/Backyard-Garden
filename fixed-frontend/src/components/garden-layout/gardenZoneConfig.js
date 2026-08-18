// ─── Zone type definitions ───────────────────────────────────────────────────

export const ZONE_TYPES = {
    general:    { label: 'General',              emoji: '🌱', color: 'bg-gray-100 border-gray-300 text-gray-800' },
    vegetable:  { label: 'Vegetable Garden',     emoji: '🥕', color: 'bg-orange-50 border-orange-300 text-orange-900' },
    orchard:    { label: 'Orchard',              emoji: '🍎', color: 'bg-red-50 border-red-200 text-red-800' },
    herb:       { label: 'Herb Garden',          emoji: '🌿', color: 'bg-teal-50 border-teal-300 text-teal-900' },
    flower:     { label: 'Flower Bed',           emoji: '🌸', color: 'bg-pink-50 border-pink-200 text-pink-800' },
    forest:     { label: 'Food Forest',          emoji: '🌳', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    greenhouse: { label: 'Greenhouse',           emoji: '🏡', color: 'bg-lime-50 border-lime-300 text-lime-900' },
    raised:     { label: 'Raised Bed Area',      emoji: '🪴', color: 'bg-yellow-50 border-yellow-300 text-yellow-900' },
    guild:      { label: 'Permaculture Guild',   emoji: '🌀', color: 'bg-purple-50 border-purple-200 text-purple-800' },
    compost:    { label: 'Compost Area',         emoji: '♻️', color: 'bg-amber-50 border-amber-300 text-amber-900' },
    pond:       { label: 'Pond / Water',         emoji: '💧', color: 'bg-sky-50 border-sky-200 text-sky-800' },
    kids:       { label: 'Kids Area',            emoji: '🛝', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
    seating:    { label: 'Seating / Patio',      emoji: '🪑', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
    building:   { label: 'Building / Shed',      emoji: '🏠', color: 'bg-slate-100 border-slate-300 text-slate-800' },
    path:       { label: 'Pathway',              emoji: '🛤️', color: 'bg-stone-50 border-stone-300 text-stone-800' },
};

export function detectZoneType(name = '') {
    const n = name.toLowerCase();
    // Orchard — EN + RO (livadă, pomi)
    if (n.includes('orchard') || n.includes('fruit tree') || n.includes('livad') || n.includes('pomi')) return 'orchard';
    // Greenhouse — EN + RO (seră)
    if (n.includes('greenhouse') || n.includes('glass house') || n.includes('ser')) return 'greenhouse';
    // Food forest / forest garden — check before 'forest' generic
    if (n.includes('food forest') || n.includes('forest garden') || n.includes('edible forest') || n.includes('pădure de alimente')) return 'forest';
    // Vegetable — EN + RO (legume, bucătărie, potager)
    if (n.includes('veg') || n.includes('kitchen garden') || n.includes('potager') || n.includes('legume')) return 'vegetable';
    // Herb / herb garden — EN + RO (ierburi, condimente)
    if (n.includes('herb') || n.includes('spice') || n.includes('ierb') || n.includes('condiment')) return 'herb';
    // Flower — EN + RO (flori, trandafiri)
    if (n.includes('flower') || n.includes('bloom') || n.includes('rose') || n.includes('flori') || n.includes('trandafir')) return 'flower';
    // Forest / woodland — EN + RO (pădure)
    if (n.includes('forest') || n.includes('woodland') || n.includes('pădure')) return 'forest';
    // Berry patch — EN + RO (zmeur, fructe de pădure, coacăz)
    if (n.includes('berry') || n.includes('zmeur') || n.includes('coacăz') || n.includes('fructe de pădure') || n.includes('soft fruit')) return 'orchard';
    // Compost — same word
    if (n.includes('compost')) return 'compost';
    // Swale / water harvesting — before generic pond/water
    if (n.includes('swale') || n.includes('contour') || n.includes('water harvest')) return 'pond';
    // Pond — EN + RO (iaz, apă, lac)
    if (n.includes('pond') || n.includes('water') || n.includes('lake') || n.includes('stream') || n.includes('iaz') || n.includes('apă') || n.includes('lac')) return 'pond';
    // Kids — EN + RO (copii, joacă)
    if (n.includes('kids') || n.includes('play') || n.includes('children') || n.includes('playground') || n.includes('copii') || n.includes('joac')) return 'kids';
    // Path / windbreak — EN + RO (cărare, alee, potecă)
    if (n.includes('path') || n.includes('walk') || n.includes('trail') || n.includes('cărare') || n.includes('alee') || n.includes('potec')) return 'path';
    if (n.includes('windbreak') || n.includes('shelterbelt') || n.includes('shelter belt')) return 'path';
    // Raised bed — EN + RO (strat înălțat)
    if (n.includes('raised') || n.includes('raised bed') || n.includes('strat înăl')) return 'raised';
    // Wild zone / meadow — ecological area
    if (n.includes('wild') || n.includes('meadow') || n.includes('wildlife') || n.includes('biodiversity') || n.includes('native')) return 'flower';
    // Beehive / apiary
    if (n.includes('beehive') || n.includes('bee hive') || n.includes('apiary') || n.includes('hive') || n.includes('albine')) return 'guild';
    // Building — EN + RO (magazie, clădire, depozit)
    if (n.includes('shed') || n.includes('building') || n.includes('house') || n.includes('barn') || n.includes('storage') || n.includes('magazie') || n.includes('clădire') || n.includes('depozit')) return 'building';
    // Guild — EN + RO (breaslă)
    if (n.includes('guild') || n.includes('breasl')) return 'guild';
    // Seating / patio — EN + RO (odihn, patio, terasă)
    if (n.includes('seat') || n.includes('relax') || n.includes('patio') || n.includes('deck') || n.includes('odihn') || n.includes('teras')) return 'seating';
    return 'general';
}

// MVP NOTE: the old `STRUCTURES` array (a separate, unstyled icon set dragged from
// the "Structures" tab while editing a zone) has been removed. It predated the
// GENERAL_STRUCTURES system below and its drop target was never wired up in the
// zone-detail canvases (RaisedBedZoneCanvas / OrchardZoneCanvas both ignored
// isStructure drops) — dragging any of its items did nothing. See git history if
// it's ever needed again.

// ─── General Map structures ────────────────────────────────────────────────────
// MVP SCOPE (bachelor thesis stabilization): only these 7 structures are exposed
// in the UI. Each has full add / move / resize / save / load / delete support.
// textColor = icon color on canvas. labelBg = label pill background.
export const GENERAL_STRUCTURES = [
    { key: 'house',           name: 'House',            category: 'building',       color: '#EDE0C4', borderColor: '#9A6840', textColor: '#5A3810', labelBg: '#FFF4DF', iconKey: 'Home',       defaultSize: { wM: 10, hM: 8  }, canOpenZone: false, description: 'Main dwelling'                    },
    { key: 'greenhouse',      name: 'Greenhouse',       category: 'building',       color: '#B8EAC0', borderColor: '#308050', textColor: '#1A5030', labelBg: '#E8FAF0', iconKey: 'Sprout',     defaultSize: { wM: 6,  hM: 4  }, canOpenZone: true,  description: 'Protected growing space'          },
    { key: 'compost',         name: 'Compost',          category: 'utility',        color: '#7A5038', borderColor: '#3A1C0A', textColor: '#FFFFFF', labelBg: '#E8D8C8', iconKey: 'Recycle',    defaultSize: { wM: 3,  hM: 2  }, canOpenZone: false, description: 'Composting area'                  },
    { key: 'pond',            name: 'Pond',             category: 'water',          color: '#4A90D0', borderColor: '#1050A0', textColor: '#FFFFFF', labelBg: '#DCF0FF', iconKey: 'Waves',      defaultSize: { wM: 6,  hM: 5  }, canOpenZone: true,  description: 'Water feature'                    },
    // NOTE — this is the app's "Path" structure: a linear walkway/access route,
    // resized by length only. Its internal name stays 'Car Road' (not 'Path')
    // because the backend AI-planning services (permacultureContextService.js,
    // permaculturePlanController.js) match that exact display name for
    // fixed-obstacle / no-overlap-buffer logic — renaming it would silently
    // weaken road-avoidance in AI-generated plans. Purely a naming detail; the
    // structure itself is fully add/move/resize/save/load/delete supported.
    { key: 'carRoad',         name: 'Car Road',         category: 'infrastructure', color: '#B0A898', borderColor: '#605850', textColor: '#2A2018', labelBg: '#ECEAE4', iconKey: 'Car',        defaultSize: { wM: 20, hM: 3  }, canOpenZone: false, description: 'Path / walkway or vehicle access route', linear: true },
    { key: 'coop',            name: 'Coop',             category: 'animal',         color: '#D8C880', borderColor: '#806020', textColor: '#50380A', labelBg: '#FFF4D0', iconKey: 'Bird',       defaultSize: { wM: 4,  hM: 4  }, canOpenZone: false, description: 'Chicken / bird housing'           },
    { key: 'orchard',         name: 'Orchard',          category: 'planting',       color: '#60B840', borderColor: '#286018', textColor: '#FFFFFF', labelBg: '#E0F8D0', iconKey: 'TreePine',   defaultSize: { wM: 18, hM: 10 }, canOpenZone: true,  description: 'Fruit tree area'                  },
    // NOTE — Raised Bed is intentionally NOT listed here: it is placed via the
    // "+ Bed" control inside a zone (RaisedBedZoneCanvas), not dragged from this
    // General Map palette. See LEGACY_NAME_TO_KEY below.

    // ─── MVP: hidden for thesis stabilization ───────────────────────────────────
    // The following were previously offered on the General Map palette. They are
    // technically fully wired (add/move/resize/save/load/delete all work), but are
    // out of scope for the MVP demo and have been removed from the add-palette to
    // keep the presentation focused: Outdoor Kitchen, Workshop, Animal Run, Guild,
    // Berry Patch, Vegetable Garden, Beehives, Kids Playground, Staple Crops,
    // Woodlot, Herb Garden, Food Forest.
    // Any structure of these types already saved in existing garden data will still
    // render (as a plain/legacy-style item) and can still be removed — it simply
    // can no longer be added new from the sidebar. Restore by moving the entry back
    // here from git history if a future scope expansion needs it.
];

export const GENERAL_STRUCTURES_MAP = Object.fromEntries(GENERAL_STRUCTURES.map(s => [s.key, s]));
export const GENERAL_KEYS_SET = new Set(GENERAL_STRUCTURES.map(s => s.key));

// Zone tabs are auto-created when one of these is placed on the General Map
export const OPENABLE_ZONE_KEYS = new Set([
    'greenhouse', 'pond', 'orchard',
]);

// Maps legacy overlay item names → new GENERAL_STRUCTURES key
export const LEGACY_NAME_TO_KEY = {
    'House':              'house',
    'Shed':               'workshop',
    'Workshop':           'workshop',
    'Greenhouse':         'greenhouse',
    'Compost':            'compost',
    'Pond':               'pond',
    'Coop':               'coop',
    'Path':               'carRoad',
    'Car Road':           'carRoad',
    'Raised Bed':         null,      // keep as-is (zone editor item)
    'Fence':              null,      // keep as-is
    'Animal Run':         'animalRun',
    'Guild':              'guild',
    'Orchard':            'orchard',
    'Berry Patch':        'berryPatch',
    'Vegetable Garden':   'vegetableGarden',
    'Beehives':           'beehives',
    'Kids Playground':    'kidsPlayground',
    'Staple Crops':       'stapleCrops',
    'Woodlot':            'woodlot',
    'Herb Garden':        'herbGarden',
    'Food Forest':        'foodForest',
};
