// ── AI area visual style table ────────────────────────────────────────────────
const AREA_TYPE_STYLE = {
    vegetable_garden: { bg: 'rgba(50,130,50,0.14)', border: '#3a8a30', label: '#1a4a10' },
    orchard: { bg: 'rgba(100,120,35,0.14)', border: '#7a9020', label: '#3a4a10' },
    food_forest: { bg: 'rgba(70,110,28,0.14)', border: '#608020', label: '#304010' },
    berry_patch: { bg: 'rgba(150,45,125,0.11)', border: '#9c3080', label: '#5a1050' },
    guild: { bg: 'rgba(80,110,40,0.13)', border: '#607830', label: '#304020' },
    herb_garden: { bg: 'rgba(30,150,70,0.12)', border: '#208848', label: '#0a4a20' },
    pond: { bg: 'rgba(30,100,200,0.12)', border: '#2060c8', label: '#0a3878' },
    swale: { bg: 'rgba(50,130,210,0.10)', border: '#4090d0', label: '#183870' },
    compost: { bg: 'rgba(130,70,20,0.15)', border: '#8a5018', label: '#5a2808' },
    path: { bg: 'rgba(150,130,75,0.18)', border: '#a09060', label: '#504020' },
    greenhouse: { bg: 'rgba(50,170,100,0.12)', border: '#309860', label: '#0a4828' },
    coop: { bg: 'rgba(190,120,30,0.14)', border: '#c07820', label: '#603808' },
    beehive: { bg: 'rgba(210,170,20,0.15)', border: '#c8a810', label: '#604008' },
    wild_zone: { bg: 'rgba(70,150,48,0.13)', border: '#509830', label: '#204018' },
    windbreak: { bg: 'rgba(50,100,30,0.12)', border: '#3a6820', label: '#1a3010' },
    default_area: { bg: 'rgba(70,120,50,0.13)', border: '#508830', label: '#204018' },
    default_struct: { bg: 'rgba(160,140,80,0.10)', border: '#a09060', label: '#504020' },
};

export function getOverlayVisualStyle(item) {
    const ck = (item.catalogKey || item.canonicalType || '').toLowerCase();
    const n = (item.name || '').toLowerCase();
    const mode = item.renderMode;
    let key = 'default_area';
    if (mode === 'path' || ck === 'path' || /\bpath\b/.test(n)) key = 'path';
    else if (ck === 'vegetable_garden' || n.includes('vegetable')) key = 'vegetable_garden';
    else if (ck === 'orchard' || n.includes('orchard')) key = 'orchard';
    else if (ck === 'food_forest' || n.includes('food forest')) key = 'food_forest';
    else if (ck === 'berry_patch' || n.includes('berry')) key = 'berry_patch';
    else if (ck === 'guild' || n.includes('guild')) key = 'guild';
    else if (ck === 'herb_garden' || n.includes('herb')) key = 'herb_garden';
    else if (ck === 'pond' || n.includes('pond')) key = 'pond';
    else if (ck === 'swale' || n.includes('swale')) key = 'swale';
    else if (ck === 'compost' || n.includes('compost')) key = 'compost';
    else if (ck === 'greenhouse' || n.includes('greenhouse')) key = 'greenhouse';
    else if (ck === 'coop' || n.includes('coop') || n.includes('chicken')) key = 'coop';
    else if (ck === 'beehive' || n.includes('beehive') || n.includes(' bee')) key = 'beehive';
    else if (ck === 'wild_zone' || n.includes('meadow') || n.includes('wild')) key = 'wild_zone';
    else if (ck === 'windbreak' || n.includes('windbreak') || n.includes('hedge')) key = 'windbreak';
    else if (mode !== 'area') key = 'default_struct';
    return AREA_TYPE_STYLE[key] || AREA_TYPE_STYLE.default_area;
}
