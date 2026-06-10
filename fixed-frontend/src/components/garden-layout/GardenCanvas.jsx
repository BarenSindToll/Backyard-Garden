import { useEffect, useRef, useState } from 'react';
import { STRUCTURES, ZONE_TYPES, detectZoneType, GENERAL_STRUCTURES_MAP, GENERAL_KEYS_SET } from './gardenZoneConfig';
import { RULER_SIZE, goodInterval, HorizontalRuler, VerticalRuler } from './MapComponents';
import { Home, CookingPot, Sprout, Recycle, Waves, Hammer, Car, Bird, PawPrint, Network, TreePine, Cherry, Carrot, Hexagon, Smile, Wheat, Trees } from 'lucide-react';
const LUCIDE_ICONS_MAP = { Home, CookingPot, Sprout, Recycle, Waves, Hammer, Car, Bird, PawPrint, Network, TreePine, Cherry, Carrot, Hexagon, Smile, Wheat, Trees };
import RaisedBedZoneCanvas from './RaisedBedZoneCanvas';
import OrchardZoneCanvas from './OrchardZoneCanvas';
import PlantingModal from './PlantingModal';
import AddZoneModal from './AddZoneModal';
import ZoneTabs from './ZoneTabs';
import { useLanguage } from '../../utils/languageContext';
import ProposedElementsOverlay from '../permaculture/ProposedElementsOverlay';

const CELL_PX = 36;
const MIN_CELL = 28;
const HEADER_H = 34;
const FOOTER_H = 24;
const GENERAL_PX_PER_M = 10;
// RULER_SIZE, goodInterval, HorizontalRuler, VerticalRuler imported from MapComponents

// Linear structures resize only in length
const LINEAR_STRUCTURES = new Set(['Path', 'Fence', 'carRoad', 'Car Road']);
// Structures that show the rotation handle
const ROTATABLE_STRUCTURES = new Set(['Path', 'Fence', 'Raised Bed', 'carRoad', 'Car Road']);
// Structures rendered as circles (force square + 50% radius)
const CIRCULAR_STRUCTURES = new Set(['Pond', 'pond']);
// Structures that become real zones when dropped on the General map (legacy)
const ZONE_STRUCTURES = new Set(['Greenhouse']);
// Overlay items that open a zone tab when clicked — productive areas only
const ZONE_PORTAL_TYPES = new Set([
    'vegetableGarden', 'greenhouse', 'guild', 'orchard', 'berryPatch', 'pond', 'stapleCrops',
]);
// Structures that open the Bed Editor when clicked
const BED_LIKE_STRUCTURES = new Set(['Raised Bed', 'Greenhouse']);

// Default sizes in metres for each structure when first dropped on General map
const STRUCTURE_DEFAULTS = {
    // Legacy names
    Path: { wM: 20, hM: 1 },
    Fence: { wM: 10, hM: 0.5 },
    Greenhouse: { wM: 5, hM: 4 },
    Compost: { wM: 2, hM: 2 },
    Pond: { wM: 5, hM: 5 },
    House: { wM: 10, hM: 8 },
    Shed: { wM: 4, hM: 3 },
    'Raised Bed': { wM: 3, hM: 1.2 },
    Coop: { wM: 3, hM: 3 },
    // New GENERAL_STRUCTURES keys — auto-derived from config
    ...Object.fromEntries(Object.values(GENERAL_STRUCTURES_MAP).map(s => [s.key, s.defaultSize])),
};
const DEFAULT_PLANT_SIZE = { wM: 1, hM: 1 };

const ZONE_STYLES = {
    raised: { border: '#b09060', bg: '#ede0c4', headerBg: '#7a5c30', gridLine: 'rgba(160,128,72,0.18)', bw: 5 },
    vegetable: { border: '#7a9860', bg: '#d8e49a', headerBg: '#4a6830', gridLine: 'rgba(100,140,72,0.15)', bw: 3 },
    orchard: { border: '#8a9060', bg: '#c8d88a', headerBg: '#5a6830', gridLine: 'rgba(120,140,72,0.15)', bw: 3 },
    herb: { border: '#70a870', bg: '#c4d8b8', headerBg: '#3a7050', gridLine: 'rgba(80,148,80,0.15)', bw: 3 },
    flower: { border: '#c08890', bg: '#e8bcc0', headerBg: '#8a5060', gridLine: 'rgba(180,100,110,0.15)', bw: 3 },
    forest: { border: '#6a9060', bg: '#c4dc9a', headerBg: '#3a5828', gridLine: 'rgba(90,130,70,0.15)', bw: 3 },
    greenhouse: { border: '#80b070', bg: '#cfe6b1', headerBg: '#4a7838', gridLine: 'rgba(100,160,80,0.18)', bw: 4 },
    guild: { border: '#8888a8', bg: '#d0d0e0', headerBg: '#505070', gridLine: 'rgba(100,100,150,0.15)', bw: 3 },
    compost: { border: '#a07050', bg: '#a57151', headerBg: '#7a4830', gridLine: 'rgba(130,90,60,0.15)', bw: 3 },
    pond: { border: '#60a8c8', bg: '#9fd0e4', headerBg: '#3070a0', gridLine: 'rgba(60,140,180,0.18)', bw: 4 },
    kids: { border: '#c8a848', bg: '#edce80', headerBg: '#907030', gridLine: 'rgba(180,148,56,0.15)', bw: 3 },
    seating: { border: '#9898a8', bg: '#d0cdbc', headerBg: '#606070', gridLine: 'rgba(120,120,140,0.15)', bw: 3 },
    building: { border: '#a09068', bg: '#dab884', headerBg: '#6a5838', gridLine: 'rgba(140,120,80,0.15)', bw: 4 },
    path: { border: '#a09068', bg: '#d0cdbc', headerBg: '#807050', gridLine: 'rgba(140,120,80,0.15)', bw: 3 },
    general: { border: '#7a9868', bg: '#c4dc9a', headerBg: '#4a6838', gridLine: 'rgba(100,140,80,0.15)', bw: 3 },
};
const ROLE_BG = {
    'Producer': 'rgba(160,200,100,0.32)',
    'Nitrogen fixer': 'rgba(100,160,210,0.32)',
    'Pollinator attractor': 'rgba(220,195,100,0.32)',
    'Dynamic accumulator': 'rgba(185,155,210,0.32)',
    'Pest repellent': 'rgba(215,150,90,0.32)',
    'Groundcover': 'rgba(100,195,175,0.32)',
};
const ROLE_BORDER = {
    'Producer': 'rgba(110,160,60,0.60)',
    'Nitrogen fixer': 'rgba(60,120,180,0.60)',
    'Pollinator attractor': 'rgba(180,150,40,0.60)',
    'Dynamic accumulator': 'rgba(140,100,180,0.60)',
    'Pest repellent': 'rgba(185,110,50,0.60)',
    'Groundcover': 'rgba(50,150,130,0.60)',
};
const STRUCTURE_MAP = Object.fromEntries(STRUCTURES.map(s => [s.name, s]));

const NON_OPENABLE_STRUCTURES = new Set([
    'House', 'Compost', 'Shed', 'Coop',
    'house', 'outdoorKitchen', 'compost', 'pond', 'workshop', 'carRoad', 'beehives', 'kidsPlayground',
]);
// Per-type visual config for GENERAL_STRUCTURES: border radius and internal SVG pattern
const GENERAL_VISUAL_CONFIG = {
    house:           { radius: 6,     pattern: null  },
    outdoorKitchen:  { radius: 6,     pattern: null  },
    greenhouse:      { radius: 4,     pattern: null  },
    compost:         { radius: 4,     pattern: null  },
    pond:            { radius: '50%', pattern: null  },
    workshop:        { radius: 6,     pattern: null  },
    carRoad:         { radius: 3,     pattern: null  },
    coop:            { radius: 6,     pattern: null  },
    animalRun:       { radius: 8,     pattern: null  },
    guild:           { radius: '50%', pattern: null  },
    orchard:         { radius: 10,    pattern: null  },
    berryPatch:      { radius: 8,     pattern: null  },
    vegetableGarden: { radius: 6,     pattern: 'rows' },
    beehives:        { radius: 4,     pattern: null  },
    kidsPlayground:  { radius: 12,    pattern: null  },
    stapleCrops:     { radius: 4,     pattern: null  },
    woodlot:         { radius: 10,    pattern: null  },
};
const MAP_ACTION_BUTTON_STYLE = { background: '#fff4cf', border: '1px solid #c8a96c', color: '#4b3117', borderRadius: 4, padding: '2px 8px', fontSize: 9, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(75,49,23,0.18)' };

const PAPER_LABEL_STYLE = {
    background: '#fff4cf',
    border: '1px solid #c8a96c',
    boxShadow: '0 2px 4px rgba(80,55,20,0.18)',
    color: '#4b3117',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '3px 10px',
    borderRadius: 2,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
};

// ── Compass rose ──────────────────────────────────────────────────────────────
const NORTH_DIRS = ['top', 'right', 'bottom', 'left'];
const NORTH_DEG = { top: 0, right: 90, bottom: 180, left: 270 };

function CompassRose({ northDirection = 'top', onRotate }) {
    const deg = NORTH_DEG[northDirection] ?? 0;
    const canRotate = typeof onRotate === 'function';
    const [hover, setHover] = useState(false);

    const handleClick = () => {
        if (!canRotate) return;
        const idx = NORTH_DIRS.indexOf(northDirection);
        onRotate(NORTH_DIRS[(idx + 1) % 4]);
    };

    return (
        <div
            title={canRotate ? `North: ${northDirection} — click to rotate` : `North: ${northDirection}`}
            onClick={handleClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                position: 'absolute',
                bottom: 16,
                right: 18,
                zIndex: 90,
                userSelect: 'none',
                cursor: canRotate ? 'pointer' : 'default',
                borderRadius: '50%',
                background: 'rgba(252,247,235,0.93)',
                boxShadow: hover
                    ? '0 3px 12px rgba(0,0,0,0.18), 0 0 0 1.5px rgba(190,155,85,0.5)'
                    : '0 1px 6px rgba(0,0,0,0.13), 0 0 0 1px rgba(190,155,85,0.28)',
                transition: 'box-shadow 0.15s',
                backdropFilter: 'blur(3px)',
            }}
        >
            <svg width="46" height="46" viewBox="0 0 46 46" style={{ display: 'block' }}>
                {/* Background disc */}
                <circle cx="23" cy="23" r="21" fill="rgba(252,247,235,0)" />

                {/* Rotating needle group */}
                <g style={{ transformOrigin: '23px 23px', transform: `rotate(${deg}deg)`, transition: 'transform 0.3s ease' }}>
                    {/* North arm — red */}
                    <polygon points="23,4 19.5,23 23,19.5 26.5,23" fill="#c0442a" opacity="0.92" />
                    {/* South arm — muted */}
                    <polygon points="23,42 19.5,23 23,26.5 26.5,23" fill="#9a8e7e" opacity="0.85" />
                    {/* E/W cross-arms */}
                    <polygon points="42,23 23,19.5 26.5,23 23,26.5" fill="#c0a870" opacity="0.7" />
                    <polygon points="4,23 23,19.5 19.5,23 23,26.5"  fill="#c0a870" opacity="0.7" />
                    {/* Center cap */}
                    <circle cx="23" cy="23" r="3" fill="#faf5e8" stroke="rgba(190,155,85,0.6)" strokeWidth="1" />
                </g>

                {/* Cardinal labels — screen-fixed (don't rotate) */}
                <text x="23" y="3"  textAnchor="middle" dominantBaseline="auto"
                    style={{ font: 'bold 7.5px system-ui, sans-serif', fill: '#b83828' }}>N</text>
                <text x="23" y="46" textAnchor="middle" dominantBaseline="auto"
                    style={{ font: '6.5px system-ui, sans-serif', fill: '#7a6e62' }}>S</text>
                <text x="45" y="26" textAnchor="end" dominantBaseline="middle"
                    style={{ font: '6.5px system-ui, sans-serif', fill: '#7a6e62' }}>E</text>
                <text x="1"  y="26" textAnchor="start" dominantBaseline="middle"
                    style={{ font: '6.5px system-ui, sans-serif', fill: '#7a6e62' }}>W</text>
            </svg>
        </div>
    );
}

// ── Neighbourhood bands ────────────────────────────────────────────────────────
const NB_BAND_STYLES = {
    forest: {
        background: 'linear-gradient(to right, #2d5a27 0%, #3d7035 40%, #4a8040 70%, #3d7035 100%)',
        label: 'Forest', tone: '#b8e8a0',
    },
    river: {
        background: 'linear-gradient(to right, #1a6080 0%, #2077a0 40%, #3090b8 70%, #2077a0 100%)',
        label: 'River', tone: '#a8d8f0',
    },
    road: {
        background: 'repeating-linear-gradient(90deg, #888 0px, #888 8px, #aaa 8px, #aaa 16px)',
        label: 'Road', tone: '#e8e8e8',
    },
    buildings: {
        background: 'linear-gradient(to right, #7a7060 0%, #907e6c 50%, #7a7060 100%)',
        label: 'Buildings', tone: '#ece0c0',
    },
    field: {
        background: 'repeating-linear-gradient(0deg, #c8b840 0px, #c8b840 4px, #d8cc58 4px, #d8cc58 8px)',
        label: 'Field', tone: '#f0e880',
    },
    orchard: {
        background: 'linear-gradient(to right, #5a8830 0%, #6a9e38 50%, #5a8830 100%)',
        label: 'Orchard', tone: '#c0e890',
    },
    pasture: {
        background: 'linear-gradient(to right, #78a840 0%, #90c050 50%, #78a840 100%)',
        label: 'Pasture', tone: '#d0f0a0',
    },
    hedge: {
        background: 'linear-gradient(to right, #486830 0%, #587840 50%, #486830 100%)',
        label: 'Hedge', tone: '#a8d080',
    },
    empty: {
        background: 'linear-gradient(to right, #c8c0a8 0%, #d8d0b8 50%, #c8c0a8 100%)',
        label: 'Empty', tone: '#e8e0c8',
    },
    unknown: null,
    other: {
        background: 'linear-gradient(to right, #a89880 0%, #b8a890 50%, #a89880 100%)',
        label: 'Other', tone: '#e0d0b8',
    },
};

const BAND_THICKNESS = 28;

function NeighbourhoodBands({ neighbourhood, northDirection = 'top', canvasW, canvasH }) {
    if (!neighbourhood) return null;

    // Map cardinal directions to screen edges accounting for northDirection rotation
    const edgeMap = {
        top: { north: 'top', east: 'right', south: 'bottom', west: 'left' },
        right: { north: 'right', east: 'bottom', south: 'left', west: 'top' },
        bottom: { north: 'bottom', east: 'left', south: 'top', west: 'right' },
        left: { north: 'left', east: 'top', south: 'right', west: 'bottom' },
    }[northDirection] || { north: 'top', east: 'right', south: 'bottom', west: 'left' };

    const bands = [];
    for (const [cardinal, screenEdge] of Object.entries(edgeMap)) {
        const side = neighbourhood[cardinal];
        if (!side || side.type === 'unknown') continue;
        const style = NB_BAND_STYLES[side.type];
        if (!style) continue;

        const label = side.type === 'other' && side.label ? side.label : style.label;
        const isHoriz = screenEdge === 'top' || screenEdge === 'bottom';

        const bandStyle = {
            position: 'absolute',
            zIndex: 2,
            pointerEvents: 'none',
            background: style.background,
            boxShadow: screenEdge === 'top' ? 'inset 0 -4px 8px rgba(0,0,0,0.15)' :
                screenEdge === 'bottom' ? 'inset 0 4px 8px rgba(0,0,0,0.15)' :
                    screenEdge === 'left' ? 'inset -4px 0 8px rgba(0,0,0,0.15)' :
                        'inset 4px 0 8px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        };

        if (isHoriz) {
            Object.assign(bandStyle, {
                left: 0, right: 0,
                height: BAND_THICKNESS,
                [screenEdge]: 0,
            });
        } else {
            Object.assign(bandStyle, {
                top: 0, bottom: 0,
                width: BAND_THICKNESS,
                [screenEdge]: 0,
            });
        }

        bands.push(
            <div key={cardinal} style={bandStyle}>
                <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: style.tone, opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    transform: !isHoriz ? 'rotate(-90deg)' : undefined,
                    whiteSpace: 'nowrap',
                }}>
                    {label}
                </span>
            </div>
        );
    }

    return <>{bands}</>;
}

// ── Pattern overlays for GENERAL_STRUCTURES ───────────────────────────────────
function PatternOverlay({ pattern, width, height, color, borderColor }) {
    if (!pattern || !width || !height || width < 10 || height < 10) return null;
    const W = Math.round(width);
    const H = Math.round(height);
    const style = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 };
    const bc = borderColor;

    if (pattern === 'rows') {
        const gap = Math.max(6, Math.min(14, H / 6));
        const lines = [];
        for (let y = gap; y < H - 2; y += gap)
            lines.push(<line key={y} x1={8} y1={y} x2={W - 8} y2={y} stroke={bc} strokeWidth={1.5} opacity={0.22} />);
        return <svg style={style} width={W} height={H}>{lines}</svg>;
    }

    if (pattern === 'crop-rows') {
        const gap = Math.max(8, Math.min(16, H / 5));
        const dotGap = Math.max(10, Math.min(18, W / 6));
        const elems = [];
        for (let y = gap; y < H - 2; y += gap) {
            elems.push(<line key={`l${y}`} x1={8} y1={y} x2={W - 8} y2={y} stroke={bc} strokeWidth={1} opacity={0.18} />);
            for (let x = dotGap / 2; x < W - 4; x += dotGap)
                elems.push(<circle key={`d${y}-${Math.round(x)}`} cx={x} cy={y} r={1.5} fill={bc} opacity={0.32} />);
        }
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    if (pattern === 'tree-dots') {
        const r = Math.min(W, H) * 0.09;
        const cols = Math.max(2, Math.floor(W / (r * 2.8)));
        const rows = Math.max(2, Math.floor(H / (r * 2.8)));
        const elems = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const ox = row % 2 === 1 ? (W / cols) * 0.5 : 0;
                const cx = (W / cols) * (col + 0.5) + ox;
                const cy = (H / rows) * (row + 0.5);
                if (cx > 4 && cx < W - 4 && cy > 4 && cy < H - 4) {
                    elems.push(<circle key={`f${row}-${col}`} cx={cx} cy={cy} r={Math.max(3, r)} fill={bc} opacity={0.22} />);
                    elems.push(<circle key={`o${row}-${col}`} cx={cx} cy={cy} r={Math.max(3, r)} fill="none" stroke={bc} strokeWidth={1} opacity={0.32} />);
                }
            }
        }
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    if (pattern === 'forest') {
        const gap = Math.max(12, Math.min(22, Math.min(W, H) / 4));
        const cols = Math.max(2, Math.floor(W / gap));
        const rows = Math.max(2, Math.floor(H / gap));
        const trees = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const ox = row % 2 === 1 ? gap * 0.5 : 0;
                const cx = (W / cols) * (col + 0.5) + ox;
                const cy = (H / rows) * (row + 0.5);
                if (cx > 4 && cx < W - 4 && cy > 4 && cy < H - 4) {
                    const th = gap * 0.7, tw = gap * 0.5;
                    trees.push(<polygon key={`${row}-${col}`}
                        points={`${cx},${cy - th * 0.6} ${cx - tw * 0.5},${cy + th * 0.4} ${cx + tw * 0.5},${cy + th * 0.4}`}
                        fill="#ffffff" opacity={0.28} />);
                }
            }
        }
        return <svg style={style} width={W} height={H}>{trees}</svg>;
    }

    if (pattern === 'greenhouse') {
        const panes = Math.max(3, Math.floor(W / 18));
        const pW = W / panes;
        const roofH = Math.min(20, H * 0.35);
        const elems = [
            <line key="ridg" x1={W * 0.5} y1={2} x2={W * 0.5} y2={roofH} stroke="#fff" strokeWidth={1.5} opacity={0.5} />,
            <line key="rl"   x1={0}       y1={roofH} x2={W * 0.5} y2={2} stroke="#fff" strokeWidth={1} opacity={0.4} />,
            <line key="rr"   x1={W}       y1={roofH} x2={W * 0.5} y2={2} stroke="#fff" strokeWidth={1} opacity={0.4} />,
        ];
        for (let i = 1; i < panes; i++)
            elems.push(<line key={`p${i}`} x1={pW * i} y1={roofH} x2={pW * i} y2={H - 4} stroke="#fff" strokeWidth={1} opacity={0.28} />);
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    if (pattern === 'fence') {
        const postGap = Math.max(12, Math.min(20, Math.min(W, H) / 5));
        const elems = [
            <line key="t" x1={4}     y1={8}     x2={W - 4} y2={8}     stroke="#fff" strokeWidth={1.5} opacity={0.38} />,
            <line key="b" x1={4}     y1={H - 8} x2={W - 4} y2={H - 8} stroke="#fff" strokeWidth={1.5} opacity={0.38} />,
            <line key="l" x1={8}     y1={4}     x2={8}     y2={H - 4} stroke="#fff" strokeWidth={1.5} opacity={0.38} />,
            <line key="r" x1={W - 8} y1={4}     x2={W - 8} y2={H - 4} stroke="#fff" strokeWidth={1.5} opacity={0.38} />,
        ];
        for (let x = 4; x <= W - 4; x += postGap) {
            elems.push(<circle key={`pt${Math.round(x)}`} cx={x} cy={8}     r={2} fill="#fff" opacity={0.42} />);
            elems.push(<circle key={`pb${Math.round(x)}`} cx={x} cy={H - 8} r={2} fill="#fff" opacity={0.42} />);
        }
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    if (pattern === 'road-line') {
        const seg = 12, gp = 8;
        const elems = [];
        if (W >= H) {
            const cy = H / 2;
            for (let x = seg; x < W - seg; x += seg + gp)
                elems.push(<line key={x} x1={x} y1={cy} x2={x + seg} y2={cy} stroke="#fff" strokeWidth={2} opacity={0.55} />);
        } else {
            const cx = W / 2;
            for (let y = seg; y < H - seg; y += seg + gp)
                elems.push(<line key={y} x1={cx} y1={y} x2={cx} y2={y + seg} stroke="#fff" strokeWidth={2} opacity={0.55} />);
        }
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    if (pattern === 'water-rings') {
        const cx = W / 2, cy = H / 2;
        const rings = Math.max(2, Math.min(5, Math.floor(Math.min(W, H) / 14)));
        return (
            <svg style={style} width={W} height={H}>
                {Array.from({ length: rings }, (_, i) => (
                    <ellipse key={i} cx={cx} cy={cy}
                        rx={(W * 0.42) * ((i + 1) / rings)} ry={(H * 0.42) * ((i + 1) / rings)}
                        fill="none" stroke="#fff" strokeWidth={1.2} opacity={0.35} />
                ))}
            </svg>
        );
    }

    if (pattern === 'radial') {
        const cx = W / 2, cy = H / 2;
        const spokes = 8;
        return (
            <svg style={style} width={W} height={H}>
                {Array.from({ length: spokes }, (_, i) => {
                    const a = (i / spokes) * Math.PI * 2;
                    return <line key={i} x1={cx} y1={cy}
                        x2={cx + Math.cos(a) * W * 0.44} y2={cy + Math.sin(a) * H * 0.44}
                        stroke="#fff" strokeWidth={1} opacity={0.28} />;
                })}
                <circle cx={cx} cy={cy} r={Math.min(W, H) * 0.1} fill="#fff" opacity={0.15} />
            </svg>
        );
    }

    if (pattern === 'honeycomb') {
        const hexR = Math.max(5, Math.min(12, Math.min(W, H) / 4));
        const hexH = hexR * Math.sqrt(3);
        const cols = Math.ceil(W / (hexR * 3)) + 1;
        const rows = Math.ceil(H / hexH) + 1;
        const elems = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const ox = row % 2 === 1 ? hexR * 1.5 : 0;
                const cx = hexR * 3 * col + hexR * 1.5 + ox;
                const cy = hexH * row + hexH * 0.5;
                const pts = Array.from({ length: 6 }, (_, i) => {
                    const a = (Math.PI / 3) * i - Math.PI / 6;
                    return `${cx + hexR * Math.cos(a)},${cy + hexR * Math.sin(a)}`;
                }).join(' ');
                elems.push(<polygon key={`${row}-${col}`} points={pts} fill="none" stroke="#fff" strokeWidth={1} opacity={0.28} />);
            }
        }
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    return null;
}

// ── Per-structure SVG visual (replaces background rectangles) ─────────────────
function StructureVisual({ sk, W, H, borderColor, hovered }) {
    const bc = borderColor || '#608040';
    const abs = { position: 'absolute', inset: 0, pointerEvents: 'none' };

    switch (sk) {
        case 'pond': {
            const cx = W / 2, cy = (Math.max(4, H - 20)) / 2, rx = W * 0.42, ry = (Math.max(4, H - 20)) * 0.42;
            const rings = Math.max(1, Math.min(3, Math.floor(Math.min(W, Math.max(4, H - 20)) / 24)));
            return <svg style={abs} width={W} height={H}>
                <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(40,110,200,0.18)" stroke={bc} strokeWidth={1.5} />
                {Array.from({ length: rings }, (_, i) => (
                    <ellipse key={i} cx={cx} cy={cy}
                        rx={rx * (i + 1) / rings * 0.78} ry={ry * (i + 1) / rings * 0.78}
                        fill="none" stroke={bc} strokeWidth={0.8} opacity={0.28} />
                ))}
            </svg>;
        }
        case 'guild': {
            const cx = W / 2, h0 = Math.max(4, H - 20), cy = h0 / 2, r = Math.min(W, h0) * 0.40;
            const compR = r * 0.76, n = 6;
            return <svg style={abs} width={W} height={H}>
                <circle cx={cx} cy={cy} r={r} fill="rgba(100,50,160,0.15)" stroke={bc} strokeWidth={1.5} strokeDasharray="5 3" />
                <circle cx={cx} cy={cy} r={r * 0.54} fill="rgba(100,50,160,0.12)" stroke={bc} strokeWidth={1} />
                <circle cx={cx} cy={cy} r={r * 0.14} fill={bc} opacity={0.42} />
                {Array.from({ length: n }, (_, i) => {
                    const a = (i / n) * Math.PI * 2;
                    return <circle key={i} cx={cx + Math.cos(a) * compR} cy={cy + Math.sin(a) * compR} r={Math.max(2.5, r * 0.08)} fill={bc} opacity={0.38} />;
                })}
            </svg>;
        }
        case 'house': {
            const h0 = Math.max(4, H - 20), bw = W * 0.74, bh = h0 * 0.50, bx = (W - bw) / 2, by = h0 * 0.34, rh = h0 * 0.34;
            return <svg style={abs} width={W} height={H}>
                <rect x={bx + 2} y={by + 2} width={bw} height={bh} rx={2} fill="rgba(0,0,0,0.05)" />
                <rect x={bx} y={by} width={bw} height={bh} rx={2} fill="rgba(195,160,110,0.24)" stroke={bc} strokeWidth={1.5} />
                <polygon points={`${W / 2},${by - rh} ${bx - 3},${by + 2} ${bx + bw + 3},${by + 2}`} fill="rgba(140,85,45,0.26)" stroke={bc} strokeWidth={1.5} />
                <rect x={W / 2 - 6} y={by + bh * 0.35} width={12} height={bh * 0.60} rx={2} fill="rgba(100,55,15,0.28)" stroke={bc} strokeWidth={1} />
                {[bx + bw * 0.18 - 6, bx + bw * 0.82 - 6].map((wx, i) => (
                    <rect key={i} x={wx} y={by + bh * 0.22} width={12} height={9} rx={1} fill="rgba(160,205,235,0.35)" stroke={bc} strokeWidth={0.8} />
                ))}
            </svg>;
        }
        case 'greenhouse': {
            const h0 = Math.max(4, H - 20), gw = W * 0.80, gh = h0 * 0.68, gx = (W - gw) / 2, gy = h0 * 0.16, rh = gh * 0.38, bodyY = gy + rh;
            const panes = Math.max(3, Math.floor(gw / 18));
            return <svg style={abs} width={W} height={H}>
                <rect x={gx} y={bodyY} width={gw} height={gh - rh} fill="rgba(130,205,155,0.18)" stroke={bc} strokeWidth={1.5} />
                <polygon points={`${W / 2},${gy} ${gx - 3},${bodyY} ${gx + gw + 3},${bodyY}`} fill="rgba(90,175,115,0.16)" stroke={bc} strokeWidth={1.5} />
                {Array.from({ length: panes - 1 }, (_, i) => (
                    <line key={i} x1={gx + gw * (i + 1) / panes} y1={bodyY} x2={gx + gw * (i + 1) / panes} y2={gy + gh - 2} stroke={bc} strokeWidth={0.8} opacity={0.28} />
                ))}
                <line x1={gx + 4} y1={bodyY + 4} x2={gx + 4} y2={gy + gh - 4} stroke="white" strokeWidth={2} opacity={0.14} />
            </svg>;
        }
        case 'compost': {
            const h0 = Math.max(4, H - 20), nb = 3, gap = 4, bh = h0 * 0.54, bw2 = Math.min(20, (W * 0.78 - (nb - 1) * gap) / nb);
            const sx = (W - (nb * bw2 + (nb - 1) * gap)) / 2, sy = h0 * 0.18;
            return <svg style={abs} width={W} height={H}>
                {Array.from({ length: nb }, (_, i) => (
                    <g key={i}>
                        <rect x={sx + i * (bw2 + gap)} y={sy + 6} width={bw2} height={bh} rx={2}
                            fill={i === 1 ? 'rgba(110,70,20,0.21)' : 'rgba(90,55,15,0.15)'} stroke={bc} strokeWidth={1.5} />
                        <rect x={sx + i * (bw2 + gap) - 1} y={sy} width={bw2 + 2} height={8} rx={1}
                            fill="rgba(70,35,5,0.22)" stroke={bc} strokeWidth={1} />
                    </g>
                ))}
            </svg>;
        }
        case 'beehives': {
            const h0 = Math.max(4, H - 20), nh = Math.max(2, Math.min(3, Math.floor(W / 28)));
            const bw2 = Math.min(20, (W * 0.78) / nh - 5), bh = Math.min(28, h0 * 0.60);
            const tw = nh * (bw2 + 5) - 5, sx = (W - tw) / 2, sy = h0 * 0.14;
            return <svg style={abs} width={W} height={H}>
                {Array.from({ length: nh }, (_, i) => (
                    <g key={i}>
                        <rect x={sx + i * (bw2 + 5)} y={sy + 8} width={bw2} height={bh} rx={2} fill="rgba(210,165,30,0.20)" stroke={bc} strokeWidth={1.5} />
                        <rect x={sx + i * (bw2 + 5) - 2} y={sy} width={bw2 + 4} height={10} rx={1} fill="rgba(155,105,10,0.24)" stroke={bc} strokeWidth={1} />
                        <rect x={sx + i * (bw2 + 5) + bw2 * 0.28} y={sy + 8 + bh - 4} width={bw2 * 0.44} height={3} rx={1} fill="rgba(70,35,5,0.32)" />
                        {[1, 2].map(j => (
                            <line key={j} x1={sx + i * (bw2 + 5) + 1} y1={sy + 8 + bh * j / 3} x2={sx + i * (bw2 + 5) + bw2 - 1} y2={sy + 8 + bh * j / 3} stroke={bc} strokeWidth={0.8} opacity={0.28} />
                        ))}
                    </g>
                ))}
            </svg>;
        }
        case 'coop': {
            const h0 = Math.max(4, H - 20), bw = W * 0.50, bh = h0 * 0.50, bx = (W - W * 0.74) / 2, by = h0 * 0.30, rh = h0 * 0.26;
            return <svg style={abs} width={W} height={H}>
                <rect x={bx + bw + 2} y={by} width={W * 0.24} height={bh} rx={2} fill="rgba(160,195,100,0.10)" stroke={bc} strokeWidth={1} strokeDasharray="4 3" />
                <rect x={bx + 2} y={by + 2} width={bw} height={bh} rx={2} fill="rgba(0,0,0,0.04)" />
                <rect x={bx} y={by} width={bw} height={bh} rx={2} fill="rgba(195,170,90,0.22)" stroke={bc} strokeWidth={1.5} />
                <polygon points={`${bx - 2},${by} ${bx + bw + 2},${by} ${bx + bw / 2},${by - rh}`} fill="rgba(130,95,30,0.25)" stroke={bc} strokeWidth={1.5} />
                <rect x={bx + bw * 0.20} y={by + bh * 0.40} width={bw * 0.22} height={bh * 0.50} rx={1} fill="rgba(90,55,15,0.28)" stroke={bc} strokeWidth={1} />
            </svg>;
        }
        case 'workshop': {
            const h0 = Math.max(4, H - 20), bw = W * 0.70, bh = h0 * 0.50, bx = (W - bw) / 2, by = h0 * 0.28, rh = h0 * 0.26;
            return <svg style={abs} width={W} height={H}>
                <rect x={bx + 2} y={by + 2} width={bw} height={bh} rx={2} fill="rgba(0,0,0,0.05)" />
                <rect x={bx} y={by} width={bw} height={bh} rx={2} fill="rgba(145,125,95,0.20)" stroke={bc} strokeWidth={1.5} />
                <polygon points={`${W / 2},${by - rh} ${bx - 3},${by + 2} ${bx + bw + 3},${by + 2}`} fill="rgba(95,75,45,0.24)" stroke={bc} strokeWidth={1.5} />
                <rect x={bx + bw * 0.62} y={by + bh * 0.22} width={bw * 0.24} height={bh * 0.52} rx={2} fill="rgba(80,55,15,0.22)" stroke={bc} strokeWidth={1} />
                {[0.45, 0.62].map((fy, i) => (
                    <line key={i} x1={bx + bw * 0.12} y1={by + bh * fy} x2={bx + bw * 0.48} y2={by + bh * fy} stroke={bc} strokeWidth={1} opacity={0.28} />
                ))}
            </svg>;
        }
        case 'outdoorKitchen': {
            const h0 = Math.max(4, H - 20), bw = W * 0.68, bh = h0 * 0.46, bx = (W - bw) / 2, by = h0 * 0.22;
            return <svg style={abs} width={W} height={H}>
                <rect x={bx} y={by} width={bw} height={bh} rx={3} fill="rgba(180,85,55,0.18)" stroke={bc} strokeWidth={1.5} />
                <rect x={bx - 3} y={by - 6} width={bw + 6} height={8} rx={2} fill="rgba(120,45,15,0.22)" stroke={bc} strokeWidth={1} />
                {[0.28, 0.72].map((fx, i) => (
                    <circle key={i} cx={bx + bw * fx} cy={by + bh * 0.52} r={Math.max(4, bw * 0.12)} fill="none" stroke={bc} strokeWidth={1.2} opacity={0.38} />
                ))}
            </svg>;
        }
        case 'orchard': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const cols = Math.max(2, Math.floor(W / 26)), rows = Math.max(2, Math.floor(h0 / 26));
            const tr = Math.max(3.5, Math.min(9, Math.min(W / cols, h0 / rows) * 0.26));
            const trees = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                const ox = r % 2 === 1 ? (W / cols) * 0.5 : 0;
                const tx = pr + (W - 2 * pr) / cols * (c + 0.5) + ox, ty = pr + (h0 - 2 * pr) / rows * (r + 0.5);
                if (tx > pr && tx < W - pr && ty > pr && ty < h0 - pr)
                    trees.push(<g key={`${r}-${c}`}><circle cx={tx} cy={ty} r={tr} fill={bc + '30'} /><circle cx={tx} cy={ty} r={tr * 0.5} fill={bc + '55'} /></g>);
            }
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={10} fill="rgba(70,140,30,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.70} />
                {trees}
            </svg>;
        }
        case 'berryPatch': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const cols = Math.max(3, Math.floor(W / 16)), rows = Math.max(2, Math.floor(h0 / 16));
            const dr = Math.max(2.5, Math.min(W / cols, h0 / rows) * 0.17);
            const dots = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                const dx = pr + (W - 2 * pr) / cols * (c + 0.5), dy = pr + (h0 - 2 * pr) / rows * (r + 0.5);
                if (dx > pr && dx < W - pr && dy > pr && dy < h0 - pr)
                    dots.push(<circle key={`${r}-${c}`} cx={dx} cy={dy} r={dr} fill={bc + '50'} />);
            }
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={14} fill="rgba(150,30,80,0.12)" stroke={bc} strokeWidth={1.5} strokeDasharray="5 3" opacity={0.70} />
                {dots}
            </svg>;
        }
        case 'vegetableGarden': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const bedH = Math.max(5, Math.min(13, (h0 - pr * 2) / Math.max(3, Math.floor(h0 / 16))));
            const nb = Math.max(2, Math.floor((h0 - pr * 2) / (bedH + 5)));
            const totalH = nb * (bedH + 5) - 5;
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={8} fill="rgba(90,150,40,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.70} />
                {Array.from({ length: nb }, (_, i) => {
                    const by = pr + (h0 - pr * 2 - totalH) / 2 + i * (bedH + 5);
                    return <rect key={i} x={pr + 5} y={by} width={W - pr * 2 - 10} height={bedH} rx={2} fill="rgba(45,90,25,0.22)" stroke={bc} strokeWidth={1} opacity={0.70} />;
                })}
            </svg>;
        }
        case 'stapleCrops': {
            const h0 = Math.max(4, H - 20), pr = 5, nl = Math.max(4, Math.floor(h0 / 9));
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={5} fill="rgba(170,130,20,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.70} />
                {Array.from({ length: nl }, (_, i) => {
                    const y = pr + (h0 - 2 * pr) * i / (nl - 1);
                    return <line key={i} x1={pr + 4} y1={y} x2={W - pr - 4} y2={y} stroke={bc} strokeWidth={i % 2 === 0 ? 1.4 : 0.7} opacity={i % 2 === 0 ? 0.42 : 0.22} />;
                })}
            </svg>;
        }
        case 'pasture': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const cols = Math.max(2, Math.floor(W / 22)), rows = Math.max(2, Math.floor(h0 / 22));
            const dots = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                if ((r + c) % 3 !== 0) dots.push(<circle key={`${r}-${c}`} cx={pr + (W - 2 * pr) / cols * (c + 0.5)} cy={pr + (h0 - 2 * pr) / rows * (r + 0.5)} r={1.8} fill={bc} opacity={0.28} />);
            }
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={12} fill="rgba(90,165,40,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.70} />
                {dots}
            </svg>;
        }
        case 'animalRun': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const cols = Math.max(3, Math.floor(W / 20)), rows = Math.max(2, Math.floor(h0 / 20));
            const dots = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                if ((r * cols + c) % 4 !== 0) dots.push(<circle key={`${r}-${c}`} cx={pr + (W - 2 * pr) / cols * (c + 0.5)} cy={pr + (h0 - 2 * pr) / rows * (r + 0.5)} r={1.5} fill={bc} opacity={0.26} />);
            }
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={5} fill="rgba(80,160,40,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.70} />
                {dots}
            </svg>;
        }
        case 'woodlot': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const cols = Math.max(2, Math.floor(W / 22)), rows = Math.max(2, Math.floor(h0 / 22));
            const trees = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                const ox = r % 2 === 1 ? (W / cols) * 0.5 : 0;
                const tx = pr + (W - 2 * pr) / cols * (c + 0.5) + ox, ty = pr + (h0 - 2 * pr) / rows * (r + 0.5);
                const th = Math.min(14, (h0 - 2 * pr) / rows * 0.68), tw = th * 0.65;
                if (tx > pr && tx < W - pr)
                    trees.push(<polygon key={`${r}-${c}`} points={`${tx},${ty - th * 0.55} ${tx - tw / 2},${ty + th * 0.45} ${tx + tw / 2},${ty + th * 0.45}`} fill={bc} opacity={0.28} />);
            }
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={10} fill="rgba(25,70,25,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.70} />
                {trees}
            </svg>;
        }
        case 'carRoad': {
            const isH = W >= H;
            return <svg style={abs} width={W} height={H}>
                <rect x={0} y={0} width={W} height={H} rx={3} fill="rgba(145,135,115,0.16)" stroke={bc} strokeWidth={1.2} opacity={0.65} />
                {isH
                    ? Array.from({ length: Math.floor(W / 20) }, (_, i) => (
                        <line key={i} x1={12 + i * 20} y1={H / 2} x2={12 + i * 20 + 10} y2={H / 2} stroke={bc} strokeWidth={1.2} opacity={0.28} />
                    ))
                    : Array.from({ length: Math.floor(H / 20) }, (_, i) => (
                        <line key={i} x1={W / 2} y1={12 + i * 20} x2={W / 2} y2={12 + i * 20 + 10} stroke={bc} strokeWidth={1.2} opacity={0.28} />
                    ))
                }
            </svg>;
        }
        case 'kidsPlayground': {
            const h0 = Math.max(4, H - 20), y1 = h0 * 0.22, y2 = h0 * 0.70;
            return <svg style={abs} width={W} height={H}>
                <line x1={W * 0.22} y1={y1} x2={W * 0.5} y2={y2} stroke={bc} strokeWidth={2} opacity={0.38} />
                <line x1={W * 0.78} y1={y1} x2={W * 0.5} y2={y2} stroke={bc} strokeWidth={2} opacity={0.38} />
                <line x1={W * 0.22} y1={y1} x2={W * 0.78} y2={y1} stroke={bc} strokeWidth={2} opacity={0.38} />
                <line x1={W * 0.38} y1={y1} x2={W * 0.38} y2={y2 * 0.87} stroke={bc} strokeWidth={1.2} opacity={0.28} />
                <line x1={W * 0.62} y1={y1} x2={W * 0.62} y2={y2 * 0.87} stroke={bc} strokeWidth={1.2} opacity={0.28} />
                <rect x={W * 0.31} y={y2 * 0.83} width={W * 0.14} height={5} rx={1} fill={bc} opacity={0.30} />
                <rect x={W * 0.55} y={y2 * 0.83} width={W * 0.14} height={5} rx={1} fill={bc} opacity={0.30} />
            </svg>;
        }
        default: {
            const h0 = Math.max(4, H - 20);
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={8} fill="rgba(80,120,50,0.12)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.65} />
            </svg>;
        }
    }
}

function resizeGridLocal(grid, newRows, newCols) {
    return Array.from({ length: newRows }, (_, r) =>
        Array.from({ length: newCols }, (_, c) => grid[r]?.[c] ?? null)
    );
}
function resolveIconSrc(iconData) {
    if (!iconData) return null;
    return iconData.startsWith('data:') ? iconData : `data:image/svg+xml;base64,${iconData}`;
}

// ── Bed icon helpers ── (rulers imported from MapComponents)

// ── Bed icon helpers ──────────────────────────────────────────────────────────
function getRepeatedPositionsPx(widthPx, heightPx, spacingPx, maxIcons = 80) {
    if (widthPx <= 0 || heightPx <= 0 || spacingPx < 2) return [];
    let sp = spacingPx;
    let cols = Math.max(1, Math.floor(widthPx / sp));
    let rows = Math.max(1, Math.floor(heightPx / sp));
    while (cols * rows > maxIcons && sp < Math.max(widthPx, heightPx)) {
        sp *= 1.4; cols = Math.max(1, Math.floor(widthPx / sp)); rows = Math.max(1, Math.floor(heightPx / sp));
    }
    const offX = (widthPx - (cols - 1) * sp) / 2;
    const offY = (heightPx - (rows - 1) * sp) / 2;
    const out = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            out.push({ x: offX + c * sp, y: offY + r * sp });
    return out;
}

function mkSrc(iconData) {
    if (!iconData) return null;
    return iconData.startsWith('data:') ? iconData : `data:image/svg+xml;base64,${iconData}`;
}

function BedIcon({ iconData, name, size, bg = '#4a7c3f' }) {
    const src = mkSrc(iconData);
    if (src) return <img src={src} alt="" style={{ width: size, height: size, objectFit: 'contain' }} draggable={false} />;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', fontSize: Math.max(4, size * 0.36), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>
            {(name || '?').slice(0, 2).toUpperCase()}
        </div>
    );
}

// ── Bed row/block previews rendered inside a bed on the General Map ───────────
function BedRowPreview({ row, bedWM, bedHM, pxPerM, selected, onDragStart, onClick, onResizeStart }) {
    if (!bedWM || !bedHM) return null;
    const xM = row.x || 0; const yM = row.y || 0;
    const wM = row.widthM || 1; const hM = row.heightM || 0.3;
    const leftPct = `${Math.max(0, Math.min(1, xM / bedWM)) * 100}%`;
    const topPct = `${Math.max(0, Math.min(1, yM / bedHM)) * 100}%`;
    const widPct = `${Math.max(0.1, Math.min(1 - xM / bedWM, wM / bedWM)) * 100}%`;
    const hgtPct = `${Math.max(0.1, Math.min(1 - yM / bedHM, hM / bedHM)) * 100}%`;

    const plant = row.plant;
    const companions = row.companions || [];
    const rowPxW = wM * pxPerM;
    const rowPxH = hM * pxPerM;
    const spacingPx = Math.max(8, ((row.spacingCm || 30) / 100) * pxPerM);
    const iconSz = Math.min(spacingPx * 0.72, rowPxH * 0.78, 22);
    const showIcons = plant && iconSz >= 5 && rowPxW >= 10 && rowPxH >= 5;

    const mainPos = showIcons ? getRepeatedPositionsPx(rowPxW, rowPxH, spacingPx, 80) : [];
    const compSp = spacingPx * 1.6;
    const compSz = iconSz * 0.62;
    const compPos = companions.length > 0 && showIcons ? getRepeatedPositionsPx(rowPxW, rowPxH, compSp, 30) : [];

    return (
        <div style={{
            position: 'absolute', left: leftPct, top: topPct, width: widPct, height: hgtPct,
            background: selected ? 'rgba(140,205,80,0.82)' : 'rgba(140,205,80,0.50)',
            border: selected ? '2px solid #5a9a28' : '1px solid rgba(255,255,255,0.55)',
            borderRadius: 2, cursor: 'grab', boxSizing: 'border-box', overflow: 'hidden',
            transition: 'background 0.08s',
        }}
            onMouseDown={e => { e.stopPropagation(); onDragStart?.(e); }}
            onClick={e => { e.stopPropagation(); onClick?.(); }}
        >
            {mainPos.map((pos, i) => (
                <div key={i} style={{ position: 'absolute', left: pos.x - iconSz / 2, top: pos.y - iconSz / 2, width: iconSz, height: iconSz, pointerEvents: 'none' }}>
                    <BedIcon iconData={plant?.iconData} name={plant?.name} size={iconSz} />
                </div>
            ))}
            {companions.map((comp, ci) =>
                compPos.filter((_, pi) => pi % companions.length === ci).map((pos, pi) => (
                    <div key={`c${ci}${pi}`} style={{ position: 'absolute', left: pos.x - compSz / 2, top: pos.y - compSz / 2, width: compSz, height: compSz, pointerEvents: 'none', opacity: 0.85 }}>
                        <BedIcon iconData={comp?.iconData} name={comp?.name} size={compSz} bg="#8a4a8f" />
                    </div>
                ))
            )}
            {!showIcons && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: Math.max(6, rowPxH * 0.38), color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
                        {plant?.name || 'Row'}
                    </span>
                </div>
            )}
            {selected && rowPxH >= 10 && (
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 7, height: 7, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(90,154,40,0.8)', borderRadius: 1, cursor: 'se-resize' }}
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeStart?.(e); }} />
            )}
        </div>
    );
}

function BedBlockPreview({ block, bedWM, bedHM, pxPerM, selected, onDragStart, onClick, onResizeStart }) {
    if (!bedWM || !bedHM) return null;
    const xM = block.x || 0; const yM = block.y || 0;
    const wM = block.widthM || 0.8; const hM = block.heightM || 0.8;
    const leftPct = `${Math.max(0, Math.min(1, xM / bedWM)) * 100}%`;
    const topPct = `${Math.max(0, Math.min(1, yM / bedHM)) * 100}%`;
    const widPct = `${Math.max(0.1, Math.min(1 - xM / bedWM, wM / bedWM)) * 100}%`;
    const hgtPct = `${Math.max(0.1, Math.min(1 - yM / bedHM, hM / bedHM)) * 100}%`;

    const plant = block.plant;
    const companions = block.companions || [];
    const blkPxW = wM * pxPerM;
    const blkPxH = hM * pxPerM;
    const spacingPx = Math.max(8, ((block.spacingCm || 25) / 100) * pxPerM);
    const iconSz = Math.min(spacingPx * 0.72, Math.min(blkPxW, blkPxH) * 0.6, 22);
    const showIcons = plant && iconSz >= 5 && blkPxW >= 10 && blkPxH >= 10;

    const mainPos = showIcons ? getRepeatedPositionsPx(blkPxW, blkPxH, spacingPx, 80) : [];
    const compSp = spacingPx * 1.6;
    const compSz = iconSz * 0.62;
    const compPos = companions.length > 0 && showIcons ? getRepeatedPositionsPx(blkPxW, blkPxH, compSp, 30) : [];

    return (
        <div style={{
            position: 'absolute', left: leftPct, top: topPct, width: widPct, height: hgtPct,
            background: selected ? 'rgba(80,140,210,0.82)' : 'rgba(80,140,210,0.50)',
            border: selected ? '2px solid #3a8abf' : '1px solid rgba(255,255,255,0.55)',
            borderRadius: 3, cursor: 'grab', boxSizing: 'border-box', overflow: 'hidden',
            transition: 'background 0.08s',
        }}
            onMouseDown={e => { e.stopPropagation(); onDragStart?.(e); }}
            onClick={e => { e.stopPropagation(); onClick?.(); }}
        >
            {mainPos.map((pos, i) => (
                <div key={i} style={{ position: 'absolute', left: pos.x - iconSz / 2, top: pos.y - iconSz / 2, width: iconSz, height: iconSz, pointerEvents: 'none' }}>
                    <BedIcon iconData={plant?.iconData} name={plant?.name} size={iconSz} />
                </div>
            ))}
            {companions.map((comp, ci) =>
                compPos.filter((_, pi) => pi % companions.length === ci).map((pos, pi) => (
                    <div key={`c${ci}${pi}`} style={{ position: 'absolute', left: pos.x - compSz / 2, top: pos.y - compSz / 2, width: compSz, height: compSz, pointerEvents: 'none', opacity: 0.85 }}>
                        <BedIcon iconData={comp?.iconData} name={comp?.name} size={compSz} bg="#8a4a8f" />
                    </div>
                ))
            )}
            {!showIcons && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: Math.max(6, Math.min(blkPxW, blkPxH) * 0.3), color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
                        {plant?.name || 'Block'}
                    </span>
                </div>
            )}
            {selected && blkPxH >= 10 && blkPxW >= 10 && (
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 7, height: 7, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(58,138,191,0.8)', borderRadius: 1, cursor: 'se-resize' }}
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeStart?.(e); }} />
            )}
        </div>
    );
}

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

function getOverlayVisualStyle(item) {
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

// ── Free-floating overlay item ────────────────────────────────────────────────
// ── Vegetable Garden zone-portal mini-bed preview ─────────────────────────────
function VegGardenPreview({ item, pxPerM, bedLayout, zoneBeds }) {
    const totalHM = item.hM || 5;

    // Prefer new raisedBed data from zoneItems — most accurate
    if (zoneBeds && zoneBeds.length > 0) {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 5px 22px', overflow: 'hidden' }}>
                {zoneBeds.slice(0, 10).map((bed, i) => {
                    const bedHFrac = ((bed.hM || 1.2) / totalHM);
                    const plants = (bed.plants || []).map(p => p.plantName).filter(Boolean);
                    return (
                        <div key={bed.id || i} style={{
                            flex: `0 0 ${Math.max(10, bedHFrac * 100)}%`,
                            borderRadius: 2,
                            background: 'rgba(80,130,40,0.10)',
                            border: '1px solid rgba(80,130,40,0.28)',
                            display: 'flex', alignItems: 'center', paddingLeft: 5,
                            overflow: 'hidden', minHeight: 9, boxSizing: 'border-box',
                        }}>
                            {plants.length > 0 && (
                                <span style={{
                                    fontSize: 7.5, color: 'rgba(30,70,10,0.82)',
                                    fontWeight: 600, whiteSpace: 'nowrap',
                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {plants.slice(0, 4).join(' · ')}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Fall back to old bedLayout.rows format
    const rows = bedLayout?.rows || [];
    if (rows.length > 0) {
        return (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '3px 4px 22px', overflow: 'hidden' }}>
                {rows.map((row, i) => {
                    const rowHFrac = (row.heightM || 1) / totalHM;
                    const companions = (row.companions || []).slice(0, 2).map(c => c.name).filter(Boolean);
                    return (
                        <div key={row.id || i} style={{
                            flex: `0 0 ${Math.max(12, rowHFrac * 100)}%`,
                            borderRadius: 2,
                            background: 'rgba(80,130,40,0.10)',
                            border: '1px solid rgba(80,130,40,0.28)',
                            display: 'flex', alignItems: 'center', paddingLeft: 4,
                            overflow: 'hidden', minHeight: 10,
                        }}>
                            {row.plant?.name && (
                                <span style={{ fontSize: 8, color: 'rgba(30,70,10,0.82)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {[row.plant.name, ...companions].join(' · ')}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Generic placeholder strips — only shown for non-isNewStyle portals with no data
    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 4px 22px', overflow: 'hidden' }}>
            {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ flex: 1, borderRadius: 2, background: 'rgba(80,130,40,0.08)', border: '1px solid rgba(80,130,40,0.22)', minHeight: 8 }} />
            ))}
        </div>
    );
}

function OverlayItem({ item, pxPerM, zoom = 1, onMouseDown, onRemove, onResizeStart, onRotateStart, onSelectBed, selectedBedId, bedLayout, selectedBedElementId, onSelectBedElement, onUpdateBedLayout, onOpenZonePortal, zoneBeds = [] }) {
    const [hovered, setHovered] = useState(false);
    const mouseDownPos = useRef(null);
    const [bedElemDrag, setBedElemDrag] = useState(null);
    const [bedElemResize, setBedElemResize] = useState(null);

    // Refs for non-stale access in window-level effects
    const bedLayoutRef = useRef(bedLayout);
    useEffect(() => { bedLayoutRef.current = bedLayout; }, [bedLayout]);
    const onUpdateRef = useRef(onUpdateBedLayout);
    useEffect(() => { onUpdateRef.current = onUpdateBedLayout; }, [onUpdateBedLayout]);
    const pxPerMRef = useRef(pxPerM);
    useEffect(() => { pxPerMRef.current = pxPerM; }, [pxPerM]);

    // Bed-element drag
    useEffect(() => {
        if (!bedElemDrag) return;
        const { elemId, isRow, startX, startY, origX, origY } = bedElemDrag;
        const bedWM = item.wM || 3; const bedHM = item.hM || 1.2;
        const onMove = (e) => {
            const layout = bedLayoutRef.current; if (!layout) return;
            const dxM = (e.clientX - startX) / pxPerMRef.current;
            const dyM = (e.clientY - startY) / pxPerMRef.current;
            const upd = (el) => ({ ...el, x: Math.max(0, Math.min(bedWM - (el.widthM || 1), origX + dxM)), y: Math.max(0, Math.min(bedHM - (el.heightM || 0.3), origY + dyM)) });
            const newLayout = isRow
                ? { ...layout, rows: layout.rows.map(r => r.id === elemId ? upd(r) : r) }
                : { ...layout, blocks: layout.blocks.map(b => b.id === elemId ? upd(b) : b) };
            onUpdateRef.current?.(item.id, newLayout);
        };
        const onUp = () => setBedElemDrag(null);
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [bedElemDrag, item.id, item.wM, item.hM]);

    // Bed-element resize
    useEffect(() => {
        if (!bedElemResize) return;
        const { elemId, isRow, startX, startY, origW, origH, origX, origY } = bedElemResize;
        const bedWM = item.wM || 3; const bedHM = item.hM || 1.2;
        const onMove = (e) => {
            const layout = bedLayoutRef.current; if (!layout) return;
            const dwM = (e.clientX - startX) / pxPerMRef.current;
            const dhM = (e.clientY - startY) / pxPerMRef.current;
            const upd = (el) => ({ ...el, widthM: Math.max(0.2, Math.min(bedWM - origX, origW + dwM)), heightM: Math.max(0.15, Math.min(bedHM - origY, origH + dhM)) });
            const newLayout = isRow
                ? { ...layout, rows: layout.rows.map(r => r.id === elemId ? upd(r) : r) }
                : { ...layout, blocks: layout.blocks.map(b => b.id === elemId ? upd(b) : b) };
            onUpdateRef.current?.(item.id, newLayout);
        };
        const onUp = () => setBedElemResize(null);
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [bedElemResize, item.id, item.wM, item.hM]);

    const startElemDrag = (e, elemId, isRow) => {
        const layout = bedLayoutRef.current;
        const elem = isRow ? layout?.rows?.find(r => r.id === elemId) : layout?.blocks?.find(b => b.id === elemId);
        if (!elem) return;
        onSelectBedElement?.(elemId);
        setBedElemDrag({ elemId, isRow, startX: e.clientX, startY: e.clientY, origX: elem.x || 0, origY: elem.y || 0 });
    };
    const startElemResize = (e, elemId, isRow) => {
        const layout = bedLayoutRef.current;
        const elem = isRow ? layout?.rows?.find(r => r.id === elemId) : layout?.blocks?.find(b => b.id === elemId);
        if (!elem) return;
        setBedElemResize({ elemId, isRow, startX: e.clientX, startY: e.clientY, origW: elem.widthM || 1, origH: elem.heightM || 0.3, origX: elem.x || 0, origY: elem.y || 0 });
    };

    const iconSrc = resolveIconSrc(item.iconData);
    const isLinear = LINEAR_STRUCTURES.has(item.name) || LINEAR_STRUCTURES.has(item.structureKey);
    const isPathLike = isLinear || item.renderMode === 'path' || /\bpath\b/i.test(item.name || '');
    const isRotatable = ROTATABLE_STRUCTURES.has(item.name) || ROTATABLE_STRUCTURES.has(item.structureKey) || (isPathLike && !!item.aiGenerated);
    const isCircular = CIRCULAR_STRUCTURES.has(item.name) || CIRCULAR_STRUCTURES.has(item.structureKey);
    const isZonePortal = !!(item.isZonePortal || ZONE_PORTAL_TYPES.has(item.type) || ZONE_PORTAL_TYPES.has(item.structureKey));
    const isBedLike = BED_LIKE_STRUCTURES.has(item.name) && !isZonePortal;
    const isAreaBlock = item.renderMode === 'area' && !!item.aiGenerated && !isZonePortal && !isBedLike && !isPathLike;
    const isSelectedBed = isBedLike && selectedBedId === item.id;

    const posLeft = item.xM != null ? item.xM * pxPerM : item.x * zoom;
    const posTop = item.yM != null ? item.yM * pxPerM : item.y * zoom;

    const rawW = Math.max(pxPerM * 2, (item.wM ?? 4) * pxPerM);
    const rawH = Math.max(isRotatable ? 28 : pxPerM, (item.hM ?? 4) * pxPerM);
    const pxW = isCircular ? Math.max(rawW, rawH) : rawW;
    const pxH = isCircular ? Math.max(rawW, rawH) : rawH;
    const isNewStyle = !!(item.structureKey && GENERAL_KEYS_SET.has(item.structureKey));
    const gsVis = isNewStyle ? (GENERAL_VISUAL_CONFIG[item.structureKey] || { radius: 8, pattern: null }) : null;
    const iconSize = isNewStyle
        ? Math.max(18, Math.min(pxW * 0.38, (pxH - (isRotatable ? 22 : 8)) * 0.55, 52))
        : Math.min(pxW * 0.45, (pxH - (isRotatable ? 16 : 0)) * 0.7, 32);
    const rotation = item.rotation ?? 0;

    const bedRows = bedLayout?.rows || [];
    const bedBlocks = bedLayout?.blocks || [];
    const hasBedContent = isBedLike && (bedRows.length > 0 || bedBlocks.length > 0);

    return (
        <div
            style={{
                position: 'absolute', left: posLeft, top: posTop,
                width: pxW, height: pxH,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: '50% 50%',
                cursor: 'grab', zIndex: isSelectedBed ? 20 : hovered ? 10 : 5, userSelect: 'none',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseDown={e => {
                e.preventDefault(); e.stopPropagation();
                mouseDownPos.current = { x: e.clientX, y: e.clientY };
                onMouseDown(e, item.id);
            }}
            onClick={e => {
                e.stopPropagation();
                if (mouseDownPos.current) {
                    const dx = e.clientX - mouseDownPos.current.x;
                    const dy = e.clientY - mouseDownPos.current.y;
                    if (dx * dx + dy * dy > 25) return;
                }
                if (isZonePortal && onOpenZonePortal) { onOpenZonePortal(item); return; }
                if (isBedLike && onSelectBed) onSelectBed(item.id);
            }}
            onDoubleClick={e => { e.stopPropagation(); if (!isBedLike && !isZonePortal) onRemove(item.id); }}
        >
            {isSelectedBed && (
                <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', background: '#a8d870', color: '#1a3a0a', fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '1px 7px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 25 }}>Editing</div>
            )}

            {(() => {
                if (isAreaBlock) {
                    const vs = getOverlayVisualStyle(item);
                    const borderW = hovered ? 2.5 : 2;
                    const conf = item.confidence;
                    const plants = item.plants || [];
                    return (
                        <div style={{
                            position: 'relative', width: '100%', height: '100%',
                            borderRadius: isPathLike ? 4 : 10,
                            background: hovered ? vs.bg.replace(/[\d.]+\)$/, v => String(Math.min(1, parseFloat(v) * 2.2) + ')')) : vs.bg,
                            border: `${borderW}px dashed ${vs.border}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            boxShadow: hovered ? `0 4px 16px ${vs.border}30, 0 0 0 1px ${vs.border}20` : `0 2px 8px rgba(0,0,0,0.10)`,
                            overflow: 'hidden',
                            transition: 'border-color 0.1s, box-shadow 0.1s, background 0.1s',
                        }}>
                            {isRotatable && (
                                <div title="Drag to rotate" style={{ position: 'absolute', top: 4, left: 4, width: 18, height: 18, borderRadius: '50%', background: hovered ? 'white' : 'rgba(255,255,255,0.55)', border: `1.5px solid ${vs.border}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'crosshair', zIndex: 2 }}
                                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRotateStart(e, item.id); }}>↻</div>
                            )}
                            {conf != null && (
                                <div style={{ position: 'absolute', top: 5, right: 5, background: conf >= 0.85 ? 'rgba(60,110,40,0.82)' : conf >= 0.65 ? 'rgba(150,100,40,0.82)' : 'rgba(160,50,50,0.82)', color: '#fff', fontSize: 8, borderRadius: 3, padding: '1px 4px', fontWeight: 700, zIndex: 2 }}>
                                    {Math.round(conf * 100)}%
                                </div>
                            )}
                            <div style={{ color: vs.label, fontWeight: 700, fontSize: Math.max(9, Math.min(14, pxW * 0.09)), textAlign: 'center', padding: '0 8px', lineHeight: 1.25, zIndex: 1, pointerEvents: 'none' }}>
                                {item.name}
                            </div>
                            {item.wM && item.hM && (
                                <div style={{ color: vs.label, fontSize: 8, opacity: 0.7, marginTop: 2, pointerEvents: 'none' }}>
                                    {item.wM.toFixed(1)} × {item.hM.toFixed(1)} m
                                </div>
                            )}
                            {plants.length > 0 && pxH > 60 && (
                                <div style={{ position: 'absolute', bottom: 5, left: 6, right: 6, fontSize: 8, color: vs.label, opacity: hovered ? 0.9 : 0.65, fontStyle: 'italic', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
                                    {plants.slice(0, 4).join(' · ')}
                                </div>
                            )}
                        </div>
                    );
                }

                const borderCol = item.borderColor || item.color || '#3d6b34';
                const gsRadius = isNewStyle
                    ? (typeof gsVis.radius === 'string' ? gsVis.radius : `${gsVis.radius}px`)
                    : isCircular ? '50%' : isPathLike ? '4px' : isZonePortal ? '8px' : '10px';
                const cBg = isNewStyle
                    ? 'transparent'
                    : isZonePortal
                        ? (hovered ? 'rgba(90,130,60,0.18)' : 'rgba(90,130,60,0.12)')
                        : (item.color ? item.color + '28' : 'rgba(61,107,52,0.10)');
                const cBorder = isNewStyle
                    ? 'none'
                    : isZonePortal ? `${hovered ? '2px' : '1.5px'} solid rgba(90,130,60,${hovered ? '0.75' : '0.45'})`
                    : isSelectedBed ? '2px solid #a8d870'
                    : hovered ? `1.5px dashed ${borderCol}aa` : `1.5px dashed ${borderCol}60`;
                const cShadow = isNewStyle
                    ? 'none'
                    : isZonePortal ? (hovered ? '0 4px 16px rgba(60,100,40,0.22)' : '0 2px 8px rgba(60,100,40,0.14)')
                    : isSelectedBed ? '0 0 0 2px rgba(168,216,112,0.35), 0 4px 14px rgba(0,0,0,0.18)'
                    : hovered ? '0 4px 14px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.10)';
                return (
                    <div style={{
                        position: 'relative', width: '100%', height: '100%',
                        borderRadius: isNewStyle ? 0 : gsRadius,
                        background: cBg,
                        border: cBorder,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: cShadow,
                        overflow: isNewStyle ? 'visible' : 'hidden',
                        transition: 'border-color 0.1s, box-shadow 0.1s, background 0.1s', gap: 4,
                    }}>
                        {/* Structure visual SVG — replaces background rectangle */}
                        {isNewStyle && (
                            <StructureVisual sk={item.structureKey} W={pxW} H={pxH} borderColor={item.borderColor || borderCol} hovered={hovered} />
                        )}
                        {isRotatable && (
                            <div title="Drag to rotate" style={{ width: 18, height: 18, flexShrink: 0, borderRadius: '50%', background: hovered ? 'white' : 'rgba(255,255,255,0.4)', border: '1.5px solid rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'crosshair', transition: 'background 0.15s', position: 'relative', zIndex: 2 }}
                                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRotateStart(e, item.id); }}>↻</div>
                        )}
                        {/* ── GENERAL_STRUCTURES: icon + label always shown ── */}
                        {isNewStyle && (() => {
                            const LIcon = item.iconKey ? LUCIDE_ICONS_MAP[item.iconKey] : null;
                            const gsConf = GENERAL_STRUCTURES_MAP[item.structureKey];
                            const iconColor = gsConf?.textColor || item.borderColor || '#4a5a40';
                            const labelSize = Math.max(8, Math.min(11, pxW * 0.12));
                            const showLabel = pxH >= 36;
                            const showIcon = pxH >= 24 && pxW >= 24;
                            return (
                                <>
                                    {/* Bed content for zone portals with layout */}
                                    {hasBedContent && (
                                        <div style={{ position: 'absolute', inset: isRotatable ? '22px 0 24px 0' : '4px 0 24px 0', overflow: 'hidden' }}>
                                            {bedRows.map(row => (
                                                <BedRowPreview key={row.id}
                                                    row={row} bedWM={item.wM || 3} bedHM={item.hM || 1.2} pxPerM={pxPerM}
                                                    selected={row.id === selectedBedElementId}
                                                    onDragStart={e => startElemDrag(e, row.id, true)}
                                                    onClick={() => onSelectBedElement?.(row.id === selectedBedElementId ? null : row.id)}
                                                    onResizeStart={e => startElemResize(e, row.id, true)}
                                                />
                                            ))}
                                            {bedBlocks.map(block => (
                                                <BedBlockPreview key={block.id}
                                                    block={block} bedWM={item.wM || 3} bedHM={item.hM || 1.2} pxPerM={pxPerM}
                                                    selected={block.id === selectedBedElementId}
                                                    onDragStart={e => startElemDrag(e, block.id, false)}
                                                    onClick={() => onSelectBedElement?.(block.id === selectedBedElementId ? null : block.id)}
                                                    onResizeStart={e => startElemResize(e, block.id, false)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {/* StructureVisual handles all visual rendering for isNewStyle items */}
                                    {/* Name label pinned to bottom */}
                                    {showLabel && (
                                        <div style={{
                                            position: 'absolute', bottom: 4, left: 4, right: 4,
                                            display: 'flex', justifyContent: 'center', zIndex: 2, pointerEvents: 'none',
                                        }}>
                                            <div style={{
                                                background: gsConf?.labelBg || '#fff4cf',
                                                border: `1px solid ${borderCol}88`,
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                                color: '#3a2808',
                                                fontFamily: 'Georgia, "Times New Roman", serif',
                                                fontSize: Math.max(7, Math.min(10, pxW / 14)),
                                                fontWeight: 700,
                                                letterSpacing: pxW > 80 ? '0.04em' : '0.08em',
                                                textTransform: 'uppercase',
                                                padding: '1px 6px',
                                                borderRadius: 2,
                                                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                pointerEvents: 'none',
                                            }}>{item.name}</div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {/* ── Legacy / non-GENERAL_STRUCTURES items ── */}
                        {!isNewStyle && (
                            <>
                                {isZonePortal && (
                                    <VegGardenPreview item={item} pxPerM={pxPerM} bedLayout={bedLayout} zoneBeds={zoneBeds} />
                                )}
                                {!isZonePortal && !hasBedContent && (() => {
                                    const LIcon = item.iconKey ? LUCIDE_ICONS_MAP[item.iconKey] : null;
                                    if (LIcon) {
                                        const iconColor = item.borderColor || '#4a5a40';
                                        return <LIcon size={Math.round(iconSize)} color={iconColor} strokeWidth={1.8} style={{ flexShrink: 0, position: 'relative', zIndex: 1 }} />;
                                    }
                                    return iconSrc
                                        ? <img src={iconSrc} alt={item.name} style={{ width: iconSize, height: iconSize, flexShrink: 0, position: 'relative', zIndex: 1 }} className="object-contain" draggable={false} />
                                        : <span style={{ fontSize: Math.max(10, Math.min(iconSize, 20)), pointerEvents: 'none', position: 'relative', zIndex: 1 }}>🌱</span>;
                                })()}
                                {!isZonePortal && hasBedContent && (
                                    <div style={{ position: 'absolute', inset: isRotatable ? '22px 0 0 0' : 0, overflow: 'hidden' }}>
                                        {bedRows.map(row => (
                                            <BedRowPreview key={row.id}
                                                row={row} bedWM={item.wM || 3} bedHM={item.hM || 1.2} pxPerM={pxPerM}
                                                selected={row.id === selectedBedElementId}
                                                onDragStart={e => startElemDrag(e, row.id, true)}
                                                onClick={() => onSelectBedElement?.(row.id === selectedBedElementId ? null : row.id)}
                                                onResizeStart={e => startElemResize(e, row.id, true)}
                                            />
                                        ))}
                                        {bedBlocks.map(block => (
                                            <BedBlockPreview key={block.id}
                                                block={block} bedWM={item.wM || 3} bedHM={item.hM || 1.2} pxPerM={pxPerM}
                                                selected={block.id === selectedBedElementId}
                                                onDragStart={e => startElemDrag(e, block.id, false)}
                                                onClick={() => onSelectBedElement?.(block.id === selectedBedElementId ? null : block.id)}
                                                onResizeStart={e => startElemResize(e, block.id, false)}
                                            />
                                        ))}
                                    </div>
                                )}
                                {!hasBedContent && pxH >= 48 && (
                                    <div style={{
                                        ...PAPER_LABEL_STYLE,
                                        fontSize: Math.max(8, Math.min(11, pxW * 0.14)),
                                        padding: pxH < 70 ? '2px 7px' : '3px 10px',
                                        maxWidth: pxW - 10, overflow: 'hidden', textOverflow: 'ellipsis',
                                        position: 'relative', zIndex: 2,
                                    }}>{item.name}</div>
                                )}
                            </>
                        )}
                    </div>
                );
            })()}

            {(hovered || isSelectedBed) && (
                /* paddingBottom bridges the gap so the cursor stays inside a descendant
                   and onMouseLeave on the parent OverlayItem does not fire mid-transit */
                <div
                    style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', paddingBottom: 4, pointerEvents: 'auto', zIndex: 60 }}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                >
                    <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#92400e', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        <p style={{ fontWeight: 700 }}>{item.name}</p>
                        <p style={{ fontSize: 9, opacity: 0.7 }}>
                            {isLinear ? `${(item.wM ?? 4).toFixed(1)} m · ${Math.round(rotation)}°` : isCircular ? `⌀ ${(item.wM ?? 4).toFixed(1)} m` : `${(item.wM ?? 4).toFixed(1)} m × ${(item.hM ?? 4).toFixed(1)} m`}
                            {isBedLike && (bedRows.length + bedBlocks.length) > 0 && ` · ${bedRows.length + bedBlocks.length} areas`}
                        </p>
                        {isZonePortal ? (
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }} onClick={e => { e.stopPropagation(); onOpenZonePortal?.(item); }} style={{ ...MAP_ACTION_BUTTON_STYLE }}>Open zone</button>
                                <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }} onClick={e => { e.stopPropagation(); onRemove(item.id); }} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 9, cursor: 'pointer' }}>Remove</button>
                            </div>
                        ) : isBedLike ? (
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }} onClick={e => { e.stopPropagation(); onSelectBed?.(item.id); }} style={{ ...MAP_ACTION_BUTTON_STYLE }}>{isSelectedBed ? '✓ Editing' : 'Open'}</button>
                                <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }} onClick={e => { e.stopPropagation(); onRemove(item.id); onSelectBed?.(null); }} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 9, cursor: 'pointer' }}>Remove</button>
                            </div>
                        ) : NON_OPENABLE_STRUCTURES.has(item.name) ? (
                            <p style={{ fontSize: 9, color: '#ef4444' }}>dbl-click to remove</p>
                        ) : (
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }} onClick={e => { e.stopPropagation(); onSelectBed?.(item.id); }} style={{ ...MAP_ACTION_BUTTON_STYLE }}>Open</button>
                                <button onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }} onClick={e => { e.stopPropagation(); onRemove(item.id); }} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 9, cursor: 'pointer' }}>Remove</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div title="Drag to resize" style={{ position: 'absolute', bottom: -4, right: -4, width: hovered ? 12 : 8, height: hovered ? 12 : 8, background: 'white', border: '1.5px solid #555', borderRadius: 2, cursor: 'se-resize', zIndex: 30, transition: 'width 0.1s, height 0.1s, opacity 0.1s', opacity: hovered ? 1 : 0.4 }}
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeStart(e, item.id); }} />
        </div>
    );
}

// ── Zone item overlay (raised beds / paths inside a zone) ────────────────────
function ZoneItemLayer({ items = [], pxPerM, zoneName, selectedBedId, onSelectBed, onUpdateItems, onRemoveItem, bedLayouts, selectedBedElementId, onSelectBedElement, onUpdateBedLayout, borderW = 3 }) {
    const [dragState, setDragState] = useState(null);
    const [resizeState, setResizeState] = useState(null);
    const [livePos, setLivePos] = useState({});
    const [liveSize, setLiveSize] = useState({});
    const pxPerMRef = useRef(pxPerM);
    useEffect(() => { pxPerMRef.current = pxPerM; }, [pxPerM]);
    const itemsRef = useRef(items);
    useEffect(() => { itemsRef.current = items; }, [items]);
    const onUpdateRef = useRef(onUpdateItems);
    useEffect(() => { onUpdateRef.current = onUpdateItems; }, [onUpdateItems]);

    useEffect(() => {
        if (!dragState) return;
        const { itemId, startX, startY, origXM, origYM } = dragState;
        const onMove = (e) => {
            const dxM = (e.clientX - startX) / pxPerMRef.current;
            const dyM = (e.clientY - startY) / pxPerMRef.current;
            setLivePos({ [itemId]: { xM: Math.max(0, origXM + dxM), yM: Math.max(0, origYM + dyM) } });
        };
        const onUp = (e) => {
            const dxM = (e.clientX - startX) / pxPerMRef.current;
            const dyM = (e.clientY - startY) / pxPerMRef.current;
            onUpdateRef.current?.(itemsRef.current.map(it => it.id === itemId
                ? { ...it, xM: Math.max(0, origXM + dxM), yM: Math.max(0, origYM + dyM) }
                : it
            ));
            setLivePos({}); setDragState(null);
        };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragState]);

    useEffect(() => {
        if (!resizeState) return;
        const { itemId, startX, startY, origWM, origHM } = resizeState;
        const onMove = (e) => {
            const dwM = (e.clientX - startX) / pxPerMRef.current;
            const dhM = (e.clientY - startY) / pxPerMRef.current;
            setLiveSize({ [itemId]: { wM: Math.max(0.5, origWM + dwM), hM: Math.max(0.3, origHM + dhM) } });
        };
        const onUp = (e) => {
            const dwM = (e.clientX - startX) / pxPerMRef.current;
            const dhM = (e.clientY - startY) / pxPerMRef.current;
            onUpdateRef.current?.(itemsRef.current.map(it => it.id === itemId
                ? { ...it, wM: Math.max(0.5, origWM + dwM), hM: Math.max(0.3, origHM + dhM) }
                : it
            ));
            setLiveSize({}); setResizeState(null);
        };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [resizeState]);

    if (items.length === 0) return null;

    return (
        <div style={{ position: 'absolute', top: HEADER_H + borderW, left: borderW, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10 }}>
            {items.map(item => {
                const lp = livePos[item.id] || {};
                const ls = liveSize[item.id] || {};
                const xM = lp.xM ?? item.xM ?? 0;
                const yM = lp.yM ?? item.yM ?? 0;
                const wM = ls.wM ?? item.wM ?? 3;
                const hM = ls.hM ?? item.hM ?? 1.2;
                const xPx = xM * pxPerM;
                const yPx = yM * pxPerM;
                const wPx = Math.max(24, wM * pxPerM);
                const hPx = Math.max(16, hM * pxPerM);
                const isBedLike = BED_LIKE_STRUCTURES.has(item.name);
                const isSelected = selectedBedId === item.id;
                const bedLayout = bedLayouts?.[item.id];
                const bedRows = bedLayout?.rows || [];
                const bedBlocks = bedLayout?.blocks || [];
                const hasBedContent = isBedLike && (bedRows.length > 0 || bedBlocks.length > 0);
                return (
                    <div key={item.id} style={{
                        position: 'absolute', left: xPx, top: yPx, width: wPx, height: hPx,
                        pointerEvents: 'auto', zIndex: isSelected ? 20 : 5, cursor: 'grab', userSelect: 'none',
                    }}
                        onMouseDown={e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); setDragState({ itemId: item.id, startX: e.clientX, startY: e.clientY, origXM: item.xM || 0, origYM: item.yM || 0 }); }}
                        onClick={e => { e.stopPropagation(); if (isBedLike) onSelectBed?.(item.id, zoneName); }}
                        onDoubleClick={e => { e.stopPropagation(); if (!isBedLike) onRemoveItem?.(item.id); }}
                    >
                        {isSelected && (
                            <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', background: '#a8d870', color: '#1a3a0a', fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '1px 7px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 25 }}>Editing</div>
                        )}
                        <div style={{
                            position: 'relative', width: '100%', height: '100%',
                            background: item.color ? item.color + '28' : 'rgba(139,94,60,0.15)',
                            border: isSelected ? '2px solid #a8d870' : `1.5px dashed ${item.color || '#8B5E3C'}70`,
                            borderRadius: 8,
                            boxShadow: isSelected ? '0 0 0 2px rgba(168,216,112,0.35), 0 4px 14px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.10)',
                            overflow: 'hidden',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}>
                            {!hasBedContent && (
                                <div style={{
                                    ...PAPER_LABEL_STYLE,
                                    fontSize: Math.max(8, Math.min(11, Math.min(wPx, hPx) * 0.18)),
                                    padding: hPx < 50 ? '2px 6px' : '3px 10px',
                                    maxWidth: wPx - 8, overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>{item.name}</div>
                            )}
                            {hasBedContent && (
                                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                                    {bedRows.map(row => (
                                        <BedRowPreview key={row.id} row={row} bedWM={wM} bedHM={hM} pxPerM={pxPerM}
                                            selected={row.id === selectedBedElementId}
                                            onDragStart={e => e.stopPropagation()}
                                            onClick={() => onSelectBedElement?.(row.id === selectedBedElementId ? null : row.id)}
                                            onResizeStart={e => e.stopPropagation()}
                                        />
                                    ))}
                                    {bedBlocks.map(block => (
                                        <BedBlockPreview key={block.id} block={block} bedWM={wM} bedHM={hM} pxPerM={pxPerM}
                                            selected={block.id === selectedBedElementId}
                                            onDragStart={e => e.stopPropagation()}
                                            onClick={() => onSelectBedElement?.(block.id === selectedBedElementId ? null : block.id)}
                                            onResizeStart={e => e.stopPropagation()}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div title="Drag to resize" style={{ position: 'absolute', bottom: -4, right: -4, width: 10, height: 10, background: 'white', border: '1.5px solid #555', borderRadius: 2, cursor: 'se-resize', zIndex: 30 }}
                            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setResizeState({ itemId: item.id, startX: e.clientX, startY: e.clientY, origWM: item.wM || 3, origHM: item.hM || 1.2 }); }} />
                        <button title="Remove" style={{ position: 'absolute', top: -8, right: -8, width: 16, height: 16, background: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, lineHeight: 1, padding: 0 }}
                            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={e => { e.stopPropagation(); onRemoveItem?.(item.id); }}>×</button>
                    </div>
                );
            })}
        </div>
    );
}

// ── Zone circle / rectangle ───────────────────────────────────────────────────
function ZoneCircle({ zone, zoneIdx, position, selected, pxPerM, zoom = 1, onMouseDown, onClick, onShapeToggle, onRectResizeStart, onRemoveFromGeneral }) {
    const [hovered, setHovered] = useState(false);
    const mouseDownPos = useRef(null);
    const zoneType = detectZoneType(zone);
    const style = ZONE_STYLES[zoneType] || ZONE_STYLES.general;
    const typeConfig = ZONE_TYPES[zoneType] || ZONE_TYPES.general;

    const isRect = position.shape === 'rect';
    // positions stored in base pixels (zoom=1); scale by zoom for rendering
    const r = 58 * zoom;
    const rw = (position.w || 120) * zoom;
    const rh = (position.h || 80) * zoom;
    const w = isRect ? rw : r * 2;
    const h = isRect ? rh : r * 2;

    return (
        <div
            style={{
                position: 'absolute',
                left: position.x * zoom - w / 2,
                top: position.y * zoom - h / 2,
                width: w, height: h,
                borderRadius: isRect ? 12 : '50%',
                background: style.bg + 'cc',
                border: selected ? `2px solid #a8d870` : `1.5px dashed ${style.border}88`,
                boxShadow: selected
                    ? '0 0 0 2px rgba(168,216,112,0.35), 0 4px 16px rgba(0,0,0,0.18)'
                    : hovered ? '0 4px 14px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.10)',
                cursor: 'grab',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                userSelect: 'none', zIndex: selected ? 10 : hovered ? 8 : 5,
                transition: 'box-shadow 0.12s',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseDown={e => {
                e.preventDefault(); e.stopPropagation();
                mouseDownPos.current = { x: e.clientX, y: e.clientY };
                onMouseDown(e, zoneIdx, position);
            }}
            onClick={e => {
                e.stopPropagation();
                if (mouseDownPos.current) {
                    const dx = e.clientX - mouseDownPos.current.x;
                    const dy = e.clientY - mouseDownPos.current.y;
                    if (dx * dx + dy * dy > 25) return;
                }
                onClick(zoneIdx);
            }}
        >
            <div style={{
                ...PAPER_LABEL_STYLE,
                maxWidth: w - 20, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{zone}</div>

            {hovered && (
                <>
                    <div style={{
                        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        marginBottom: 8, background: '#fefce8', border: '1px solid #fde68a',
                        borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#92400e',
                        whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 60,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                        {isRect ? `${Math.round(rw / pxPerM)}m × ${Math.round(rh / pxPerM)}m · ` : ''}
                        Drag to move · click to edit
                    </div>

                    {/* Open zone detail */}
                    <button
                        title="Open zone"
                        style={{ ...MAP_ACTION_BUTTON_STYLE, position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', zIndex: 20, whiteSpace: 'nowrap' }}
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={e => { e.stopPropagation(); onClick(zoneIdx); }}
                    >Open</button>

                    {/* Remove from General map (keeps zone tab) */}
                    <button
                        title="Remove from General map (zone tab stays)"
                        style={{
                            position: 'absolute', top: 4, left: 4,
                            width: 20, height: 20,
                            background: 'rgba(255,255,255,0.9)', border: `1px solid ${style.border}`,
                            borderRadius: 4, fontSize: 15, lineHeight: 1, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#888', zIndex: 20,
                        }}
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={e => { e.stopPropagation(); onRemoveFromGeneral(zoneIdx); }}
                    >−</button>

                    {/* Shape toggle */}
                    <button
                        title={isRect ? 'Switch to circle' : 'Switch to rectangle'}
                        style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 20, height: 20,
                            background: 'rgba(255,255,255,0.9)', border: `1px solid ${style.border}`,
                            borderRadius: 4, fontSize: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20,
                        }}
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={e => { e.stopPropagation(); onShapeToggle(zoneIdx); }}
                    >
                        {isRect ? '○' : '▭'}
                    </button>

                    {/* Resize handle (rect only) */}
                    {isRect && (
                        <div
                            title="Drag to resize"
                            style={{
                                position: 'absolute', bottom: -5, right: -5,
                                width: 12, height: 12,
                                background: 'white', border: '1.5px solid #555',
                                borderRadius: 2, cursor: 'se-resize', zIndex: 20,
                            }}
                            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRectResizeStart(e, zoneIdx); }}
                        />
                    )}
                </>
            )}
        </div>
    );
}

// ── PlantBlock ────────────────────────────────────────────────────────────────
function PlantBlock({ cell, row, col, cellW, cellH, cellSizeM, zoneIdx, plantList, onRemove, onPlantResizeStart }) {
    const [hovered, setHovered] = useState(false);
    const spanCols = cell.spanCols || 1;
    const spanRows = cell.spanRows || 1;
    const isBlock = spanCols > 1 || spanRows > 1;
    const blockW = spanCols * cellW;
    const blockH = spanRows * cellH;
    const iconSize = Math.min(cellW * 0.68, cellH * 0.68, 26);
    const totalCount = spanCols * spanRows;
    const iconSrc = resolveIconSrc(cell.iconData);
    const plantData = plantList.find(p => p.name === cell.plant);
    const role = plantData?.guildRole?.[0];
    const blockBg = isBlock ? (ROLE_BG[role] || 'rgba(180,220,140,0.3)') : 'transparent';
    const blockBorder = isBlock ? (ROLE_BORDER[role] || 'rgba(100,160,60,0.5)') : 'transparent';
    const tiles = [];
    for (let dr = 0; dr < spanRows; dr++)
        for (let dc = 0; dc < spanCols; dc++)
            tiles.push({ x: dc * cellW + cellW / 2, y: dr * cellH + cellH / 2 });
    const HANDLE = 9;
    const corners = [
        { bottom: -HANDLE / 2, right: -HANDLE / 2, cursor: 'se-resize' },
        { bottom: -HANDLE / 2, left: -HANDLE / 2, cursor: 'sw-resize' },
        { top: -HANDLE / 2, right: -HANDLE / 2, cursor: 'ne-resize' },
        { top: -HANDLE / 2, left: -HANDLE / 2, cursor: 'nw-resize' },
    ];
    return (
        <div
            style={{ position: 'absolute', left: col * cellW, top: row * cellH, width: blockW, height: blockH, cursor: 'grab', zIndex: hovered ? 20 : 1 }}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            onDoubleClick={onRemove} draggable
            onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('plant', JSON.stringify({ name: cell.plant, iconData: cell.iconData, fromZone: zoneIdx, fromRow: row, fromCol: col, spanCols, spanRows })); }}
        >
            {isBlock && <div className="absolute inset-0 rounded-sm" style={{ background: blockBg, border: `1px solid ${blockBorder}` }} />}
            {(isBlock ? tiles : [{ x: blockW / 2, y: blockH / 2 }]).map(({ x, y }, i) =>
                iconSrc
                    ? <img key={i} src={iconSrc} alt={cell.plant} draggable={false} style={{ position: 'absolute', left: x - iconSize / 2, top: y - iconSize / 2, width: iconSize, height: iconSize, pointerEvents: 'none' }} className="object-contain" />
                    : <span key={i} style={{ position: 'absolute', left: x - 10, top: y - 10, fontSize: 18, pointerEvents: 'none' }}>🌱</span>
            )}
            {hovered && (
                <>
                    <div className="absolute inset-0 rounded-sm pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.8)' }} />
                    {isBlock && blockH >= 56 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                            <div className="bg-white/85 rounded-md px-2 py-1 text-center shadow-sm">
                                <p className="font-bold text-forest text-[11px] leading-tight">Block of {cell.plant}</p>
                                <p className="text-gray-600 text-[10px]">{spanCols} × {spanRows} ({totalCount})</p>
                                <p className="text-gray-500 text-[9px]">{(spanCols * cellSizeM).toFixed(1)}m × {(spanRows * cellSizeM).toFixed(1)}m</p>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[#fefce8] border border-amber-200 rounded-lg shadow-lg px-2.5 py-1.5 text-xs pointer-events-none z-40 whitespace-nowrap" style={{ minWidth: 130 }}>
                            <p className="font-bold text-forest">{isBlock ? `Block of ${cell.plant}` : cell.plant}</p>
                            {isBlock && <p className="text-gray-600">{spanCols} × {spanRows} ({totalCount} plants)</p>}
                            {cell.plantedDate && <p className="text-gray-500">🗓 {cell.plantedDate}</p>}
                            <p className="text-red-400 text-[9px] mt-0.5">dbl-click to remove</p>
                        </div>
                    )}
                    {corners.map((s, i) => (
                        <div key={i} style={{ position: 'absolute', width: HANDLE, height: HANDLE, background: 'white', border: '1.5px solid #555', borderRadius: 2, zIndex: 30, ...s }}
                            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onPlantResizeStart(e, zoneIdx, row, col, spanCols, spanRows, i); }} />
                    ))}
                </>
            )}
        </div>
    );
}

// ── Zone block (detail view) ──────────────────────────────────────────────────
function ZoneBlock({ zone, grid, position, zoneIdx, selected, cellSizeM, plantList, onResizeMouseDown, onZoneDrop, onRemovePlant, onPlantResizeStart, onDelete, onStartRename, renameValue, onRenameChange, onRenameConfirm, onRenameCancel, isRenaming, resizePreview, plantResizePreview, detailView, zoom = 1 }) {
    const zoneType = detectZoneType(zone);
    const style = ZONE_STYLES[zoneType] || ZONE_STYLES.general;
    // zoom changes actual pixel size so scroll area updates correctly
    const cellW = Math.max(4, cellSizeM * CELL_PX * zoom);
    const cellH = Math.max(4, cellSizeM * CELL_PX * zoom);
    const liveCols = resizePreview?.zoneIdx === zoneIdx ? resizePreview.cols : (grid[0]?.length || 1);
    const liveRows = resizePreview?.zoneIdx === zoneIdx ? resizePreview.rows : grid.length;
    const bodyW = liveCols * cellW;
    const bodyH = liveRows * cellH;
    const coveredSet = new Set();
    grid.forEach((row, r) => row.forEach((cell, c) => {
        if (!cell?.plant) return;
        const sc = cell.spanCols || 1; const sr = cell.spanRows || 1;
        for (let dr = 0; dr < sr; dr++) for (let dc = 0; dc < sc; dc++)
            if (dr !== 0 || dc !== 0) coveredSet.add(`${r + dr},${c + dc}`);
    }));
    return (
        <div style={{ position: detailView ? 'relative' : 'absolute', left: detailView ? undefined : position.x, top: detailView ? undefined : position.y, width: bodyW, border: `${style.bw}px solid ${style.border}`, borderRadius: 8, overflow: 'hidden', boxShadow: selected ? '0 0 0 3px #a8d870, 0 4px 18px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.28)', zIndex: 2, userSelect: 'none' }}
            onClick={e => e.stopPropagation()} onDragStart={e => e.preventDefault()}>
            <div style={{ background: style.headerBg, height: HEADER_H, cursor: 'default' }} className="flex items-center px-2 gap-1.5 select-none">
                {isRenaming ? (
                    <input autoFocus value={renameValue} onChange={onRenameChange} onBlur={onRenameConfirm}
                        onKeyDown={e => { if (e.key === 'Enter') onRenameConfirm(); if (e.key === 'Escape') onRenameCancel(); }}
                        onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-white/25 text-white text-xs font-bold px-1.5 py-0.5 rounded outline-none" />
                ) : (
                    <span className="text-white text-xs font-bold flex-1 truncate pointer-events-none">{zone}</span>
                )}
                <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onStartRename(zoneIdx, zone); }} className="text-white/50 hover:text-white text-xs">✏</button>
                <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete(zoneIdx); }} className="text-white/50 hover:text-white text-sm leading-none">×</button>
            </div>
            <div style={{ position: 'relative', width: bodyW, height: bodyH, backgroundColor: style.bg, backgroundImage: [`linear-gradient(${style.gridLine.replace(/[\d.]+\)$/, '0.28)')} 1px, transparent 1px)`, `linear-gradient(90deg, ${style.gridLine.replace(/[\d.]+\)$/, '0.28)')} 1px, transparent 1px)`, `linear-gradient(${style.gridLine} 1px, transparent 1px)`, `linear-gradient(90deg, ${style.gridLine} 1px, transparent 1px)`].join(', '), backgroundSize: [`${cellW * 5}px ${cellH * 5}px`, `${cellW * 5}px ${cellH * 5}px`, `${cellW}px ${cellH}px`, `${cellW}px ${cellH}px`].join(', '), overflow: 'visible' }}
                onDragOver={e => e.preventDefault()} onDrop={e => { e.stopPropagation(); onZoneDrop(e, zoneIdx, cellH, cellW); }}>
                {resizePreview?.zoneIdx === zoneIdx && <div className="absolute inset-0 border-2 border-dashed border-white/40 pointer-events-none z-10 rounded-sm" />}
                {grid.flatMap((row, r) => row.map((cell, c) => {
                    if (!cell?.plant || coveredSet.has(`${r},${c}`)) return null;
                    const preview = plantResizePreview?.zoneIdx === zoneIdx && plantResizePreview.row === r && plantResizePreview.col === c ? plantResizePreview : null;
                    return <PlantBlock key={`${r}-${c}`} cell={preview ? { ...cell, spanCols: preview.spanCols, spanRows: preview.spanRows } : cell} row={r} col={c} cellW={cellW} cellH={cellH} cellSizeM={cellSizeM} zoneIdx={zoneIdx} plantList={plantList} onRemove={() => onRemovePlant(zoneIdx, r, c, cell.spanRows || 1, cell.spanCols || 1)} onPlantResizeStart={onPlantResizeStart} />;
                }))}
            </div>
            <div style={{ height: FOOTER_H, background: style.headerBg + '12', borderTop: `1px solid ${style.border}30`, position: 'relative' }} className="flex items-center px-2">
                <span className="flex-1 text-center text-[10px]" style={{ color: style.headerBg, opacity: 0.55 }}>
                    {resizePreview?.zoneIdx === zoneIdx ? `${resizePreview.rows} × ${resizePreview.cols} cells` : `${grid.length} × ${grid[0]?.length || 1} cells`}
                </span>
                <div className="absolute bottom-0 right-0 w-5 h-5 flex items-end justify-end pb-0.5 pr-0.5" style={{ cursor: 'se-resize' }}
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeMouseDown(e, zoneIdx); }} title="Drag to resize area">
                    <svg width="10" height="10" viewBox="0 0 10 10">
                        <circle cx="8" cy="8" r="1.5" fill={style.headerBg} opacity="0.6" />
                        <circle cx="4.5" cy="8" r="1.5" fill={style.headerBg} opacity="0.35" />
                        <circle cx="8" cy="4.5" r="1.5" fill={style.headerBg} opacity="0.35" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

// ── General overview canvas ───────────────────────────────────────────────────

function GeneralCanvas({ zones, positions, currentZone, overlayItems, plantList, setup, onSelectZone, onUpdatePositions, onUpdateOverlayItems, onAddZone, selectedBedId, onSelectBed, selectedBedElementId, onSelectBedElement, bedLayouts, onUpdateBedLayout, proposedItems = [], proposedHoveredName = null, proposedSelectedNames = null, onOpenZonePortal, neighbourhood = null, onRotateNorth, hideCompass = false, zoneItems = {} }) {
    const { t } = useLanguage();
    const widthM = setup.widthM || 100;
    const heightM = setup.heightM || 60;

    // Measure container to compute adaptive scale
    const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });
    const containerRef = useRef(null);
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
        update();
        const obs = new ResizeObserver(update);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // zoom=1 means "fit garden in container" (basePxPerM already handles that)
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            setZoom(z => Math.min(5, Math.max(0.05, z * (e.deltaY < 0 ? 1.1 : 0.9))));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // Fill the container while keeping proportions; zoom multiplies from that fit
    const availW = Math.max(200, containerSize.w - RULER_SIZE - 2);
    const availH = Math.max(150, containerSize.h - RULER_SIZE - 2);
    const basePxPerM = Math.max(4, Math.min(availW / widthM, availH / heightM));
    const pxPerM = basePxPerM * zoom;

    const canvasW = widthM * pxPerM;
    const canvasH = heightM * pxPerM;
    const smallGrid = goodInterval(pxPerM, 30) * pxPerM;
    const largeGrid = goodInterval(pxPerM, 80) * pxPerM;

    const [circleDragState, setCircleDragState] = useState(null);
    const [liveCirclePos, setLiveCirclePos] = useState({});
    const [overlayDragState, setOverlayDragState] = useState(null);
    const [liveOverlayPos, setLiveOverlayPos] = useState({});
    const [overlayResizeState, setOverlayResizeState] = useState(null);
    const [liveOverlaySize, setLiveOverlaySize] = useState({});
    const [zoneResizeState, setZoneResizeState] = useState(null);
    const [liveZoneSize, setLiveZoneSize] = useState({});
    const [rotateState, setRotateState] = useState(null);
    const [liveRotation, setLiveRotation] = useState({});

    // Zone circle drag
    useEffect(() => {
        if (!circleDragState) return;
        const { zoneIdx, startX, startY, origX, origY } = circleDragState;
        const onMove = (e) => setLiveCirclePos({ [zoneIdx]: { x: Math.max(0, origX + (e.clientX - startX) / zoom), y: Math.max(0, origY + (e.clientY - startY) / zoom) } });
        const onUp = (e) => {
            onUpdatePositions(positions.map((p, i) => i === zoneIdx ? { ...p, x: Math.max(0, origX + (e.clientX - startX) / zoom), y: Math.max(0, origY + (e.clientY - startY) / zoom) } : p));
            setLiveCirclePos({}); setCircleDragState(null);
        };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [circleDragState, positions]);

    // Overlay drag
    useEffect(() => {
        if (!overlayDragState) return;
        const { itemId, startX, startY, origX, origY, origXM, origYM } = overlayDragState;
        const onMove = (e) => {
            const newX = Math.max(0, origX + (e.clientX - startX) / zoom);
            const newY = Math.max(0, origY + (e.clientY - startY) / zoom);
            const pos = { x: newX, y: newY };
            if (origXM != null) { pos.xM = Math.max(0, origXM + (e.clientX - startX) / pxPerM); pos.yM = Math.max(0, origYM + (e.clientY - startY) / pxPerM); }
            setLiveOverlayPos({ [itemId]: pos });
        };
        const onUp = (e) => {
            const newX = Math.max(0, origX + (e.clientX - startX) / zoom);
            const newY = Math.max(0, origY + (e.clientY - startY) / zoom);
            onUpdateOverlayItems(overlayItems.map(it => {
                if (it.id !== itemId) return it;
                const upd = { ...it, x: newX, y: newY };
                if (origXM != null) { upd.xM = Math.max(0, origXM + (e.clientX - startX) / pxPerM); upd.yM = Math.max(0, origYM + (e.clientY - startY) / pxPerM); }
                return upd;
            }));
            setLiveOverlayPos({}); setOverlayDragState(null);
        };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [overlayDragState, overlayItems]);

    // Overlay resize
    useEffect(() => {
        if (!overlayResizeState) return;
        const { itemId, startX, startY, origW, origH, isLinear } = overlayResizeState;
        const isCirc = CIRCULAR_STRUCTURES.has(overlayItems.find(it => it.id === itemId)?.name);
        const onMove = (e) => {
            const newW = Math.max(pxPerM, origW + (e.clientX - startX));
            const newH = isLinear ? origH : Math.max(pxPerM * 0.5, origH + (e.clientY - startY));
            const sq = Math.max(newW, newH);
            setLiveOverlaySize({ [itemId]: { wM: (isCirc ? sq : newW) / pxPerM, hM: (isCirc ? sq : newH) / pxPerM } });
        };
        const onUp = (e) => {
            const newW = Math.max(pxPerM, origW + (e.clientX - startX));
            const newH = isLinear ? origH : Math.max(pxPerM * 0.5, origH + (e.clientY - startY));
            const sq = Math.max(newW, newH);
            onUpdateOverlayItems(overlayItems.map(it => it.id === itemId ? { ...it, wM: (isCirc ? sq : newW) / pxPerM, hM: (isCirc ? sq : newH) / pxPerM } : it));
            setLiveOverlaySize({}); setOverlayResizeState(null);
        };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [overlayResizeState, overlayItems]);

    // Zone rect resize
    useEffect(() => {
        if (!zoneResizeState) return;
        const { zoneIdx, startX, startY, origW, origH } = zoneResizeState;
        const onMove = (e) => setLiveZoneSize({ [zoneIdx]: { w: Math.max(60 / zoom, origW + (e.clientX - startX) / zoom), h: Math.max(40 / zoom, origH + (e.clientY - startY) / zoom) } });
        const onUp = (e) => {
            onUpdatePositions(positions.map((p, i) => i === zoneIdx ? { ...p, w: Math.max(60 / zoom, origW + (e.clientX - startX) / zoom), h: Math.max(40 / zoom, origH + (e.clientY - startY) / zoom) } : p));
            setLiveZoneSize({}); setZoneResizeState(null);
        };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [zoneResizeState, positions]);

    // Rotation drag
    useEffect(() => {
        if (!rotateState) return;
        const { itemId, cx, cy, offset } = rotateState;
        const angle = (e) => Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
        const onMove = (e) => setLiveRotation({ [itemId]: angle(e) + offset });
        const onUp = (e) => {
            onUpdateOverlayItems(overlayItems.map(it => it.id === itemId ? { ...it, rotation: angle(e) + offset } : it));
            setLiveRotation({});
            setRotateState(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [rotateState, overlayItems]);

    const handleCircleMouseDown = (e, zoneIdx, pos) =>
        setCircleDragState({ zoneIdx, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y });

    const handleOverlayMouseDown = (e, itemId) => {
        const item = overlayItems.find(it => it.id === itemId);
        if (!item) return;
        setOverlayDragState({
            itemId, startX: e.clientX, startY: e.clientY,
            origX: item.x, origY: item.y,
            origXM: item.xM ?? null, origYM: item.yM ?? null,
        });
    };

    const handleOverlayResizeStart = (e, itemId) => {
        const item = overlayItems.find(it => it.id === itemId);
        if (!item) return;
        setOverlayResizeState({ itemId, startX: e.clientX, startY: e.clientY, origW: (item.wM ?? 4) * pxPerM, origH: (item.hM ?? 4) * pxPerM, isLinear: LINEAR_STRUCTURES.has(item.name) });
    };

    const handleRotateStart = (e, itemId) => {
        const item = overlayItems.find(it => it.id === itemId);
        if (!item) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scrollX = containerRef.current.scrollLeft;
        const scrollY = containerRef.current.scrollTop;
        const pxW = (item.wM ?? 4) * pxPerM;
        const pxH = (item.hM ?? 4) * pxPerM;
        const itemLeft = item.xM != null ? item.xM * pxPerM : item.x * zoom;
        const itemTop = item.yM != null ? item.yM * pxPerM : item.y * zoom;
        // Screen coordinates of item centre
        const cx = rect.left + RULER_SIZE + itemLeft + pxW / 2 - scrollX;
        const cy = rect.top + RULER_SIZE + itemTop + pxH / 2 - scrollY;
        const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
        const offset = (item.rotation ?? 0) - startAngle;
        setRotateState({ itemId, cx, cy, offset });
    };

    const handleShapeToggle = (zoneIdx) =>
        onUpdatePositions(positions.map((p, i) => i !== zoneIdx ? p : { ...p, shape: p.shape === 'rect' ? 'circle' : 'rect', w: p.w || 120, h: p.h || 80 }));

    const handleRemoveFromGeneral = (zoneIdx) =>
        onUpdatePositions(positions.map((p, i) => i !== zoneIdx ? p : { ...p, inGeneral: false }));

    const handleZoneRectResizeStart = (e, zoneIdx) => {
        const pos = positions[zoneIdx];
        setZoneResizeState({ zoneIdx, startX: e.clientX, startY: e.clientY, origW: pos.w || 120, origH: pos.h || 80 });
    };

    const handleCanvasDrop = (e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('plant');
        if (!raw) return;
        try {
            const dropped = JSON.parse(raw);
            if (dropped.fromZone !== undefined) return;
            const rect = containerRef.current.getBoundingClientRect();
            const rawX = e.clientX - rect.left + containerRef.current.scrollLeft - RULER_SIZE;
            const rawY = e.clientY - rect.top + containerRef.current.scrollTop - RULER_SIZE;
            if (rawX < 0 || rawY < 0) return;
            // Greenhouse → create a real zone at the drop position
            // rawX/rawY are in current (zoomed) canvas pixels; divide by zoom to get base units
            const baseX = rawX / zoom;
            const baseY = rawY / zoom;

            // Block individual plants from the General map
            if (!dropped.isStructure) return;

            // Legacy: Greenhouse creates a real zone
            if (ZONE_STRUCTURES.has(dropped.name) && !dropped.structureKey) {
                const def = STRUCTURE_DEFAULTS[dropped.name] || { wM: 5, hM: 4 };
                const wBase = def.wM * basePxPerM;
                const hBase = def.hM * basePxPerM;
                onAddZone(dropped.name, true, { x: baseX + wBase / 2, y: baseY + hBase / 2, w: wBase, h: hBase });
                return;
            }

            // Resolve config from GENERAL_STRUCTURES if structureKey is provided
            const gsConfig = dropped.structureKey ? GENERAL_STRUCTURES_MAP[dropped.structureKey] : null;
            const def = gsConfig?.defaultSize || STRUCTURE_DEFAULTS[dropped.name] || { wM: 4, hM: 4 };
            const wBase = def.wM * basePxPerM;
            const hBase = def.hM * basePxPerM;

            const newItem = {
                id: Date.now() + Math.random(),
                name: gsConfig?.name || dropped.name,
                type: dropped.structureKey || null,
                structureKey: dropped.structureKey || null,
                iconKey: dropped.iconKey || gsConfig?.iconKey || null,
                iconData: dropped.iconData || dropped.icon || null,
                color: dropped.color || gsConfig?.color || null,
                borderColor: dropped.borderColor || gsConfig?.borderColor || null,
                isStructure: true,
                isZonePortal: gsConfig ? gsConfig.canOpenZone : false,
                x: Math.max(0, baseX - wBase / 2),
                y: Math.max(0, baseY - hBase / 2),
                wM: def.wM, hM: def.hM,
                rotation: 0,
            };
            onUpdateOverlayItems([...overlayItems, newItem]);
        } catch { /* ignore */ }
    };

    const generalZones = zones.map((zone, i) => ({ zone, i, pos: positions[i] })).filter(({ pos }) => pos?.inGeneral);
    const isBusy = !!(circleDragState || overlayDragState || overlayResizeState || zoneResizeState || rotateState);

    return (
        <div className="flex-1" style={{ position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!hideCompass && (
                <CompassRose northDirection={setup?.northDirection || 'top'} onRotate={onRotateNorth} />
            )}

            {/* ── Proposed elements legend — fixed in viewport, shown only while preview is active ── */}
            {proposedItems.length > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: 14,
                    left: RULER_SIZE + 8,
                    zIndex: 20,
                    pointerEvents: 'none',
                    background: 'rgba(15,12,40,0.72)',
                    borderRadius: 8,
                    padding: '5px 11px 5px 9px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backdropFilter: 'blur(4px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                    {/* Dashed line sample matching the proposed border style */}
                    <svg width="22" height="10" style={{ flexShrink: 0 }}>
                        <line x1="1" y1="5" x2="21" y2="5"
                            stroke="#5b4ec0" strokeWidth="2" strokeDasharray="4 3"
                            strokeLinecap="round" />
                    </svg>
                    <span style={{
                        color: 'rgba(195,185,255,0.95)',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 0.2,
                        whiteSpace: 'nowrap',
                    }}>
                        Proposed — not yet saved
                    </span>
                </div>
            )}

            {/* Scrollable map area */}
            <div
                ref={containerRef}
                className="overflow-auto flex-1"
                style={{ cursor: isBusy ? 'grabbing' : 'default', display: 'flex' }}
                onDragOver={e => e.preventDefault()}
                onDrop={handleCanvasDrop}
            >
                <div style={{ display: 'inline-flex', flexDirection: 'column', margin: 'auto' }}>
                    {/* Row 1: corner + horizontal ruler (sticky top) */}
                    <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 25 }}>
                        <div style={{ width: RULER_SIZE, height: RULER_SIZE, flexShrink: 0, background: '#1d3a20', position: 'sticky', left: 0, zIndex: 30 }} />
                        <HorizontalRuler widthM={widthM} pxPerM={pxPerM} />
                    </div>

                    {/* Row 2: vertical ruler (sticky left) + canvas */}
                    <div style={{ display: 'flex' }}>
                        <div style={{ position: 'sticky', left: 0, zIndex: 25, flexShrink: 0 }}>
                            <VerticalRuler heightM={heightM} pxPerM={pxPerM} />
                        </div>
                        <div
                            style={{
                                position: 'relative', width: canvasW, height: canvasH,
                                background: 'radial-gradient(circle at 50% 40%, #f3ecd8 0%, #eadfc4 70%, #e3d6b6 100%)',
                                backgroundImage: 'radial-gradient(circle, rgba(94,80,45,0.10) 1.5px, transparent 1.5px)',
                                backgroundSize: `${smallGrid}px ${smallGrid}px`,
                            }}
                            onClick={() => { onSelectZone(-1); if (onSelectBed) { onSelectBed(null); if (onSelectBedElement) onSelectBedElement(null); } }}
                        >
                            <NeighbourhoodBands
                                neighbourhood={neighbourhood}
                                northDirection={setup?.northDirection || 'top'}
                                canvasW={canvasW}
                                canvasH={canvasH}
                            />
                            {generalZones.length === 0 && overlayItems.length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                                    <p style={{ color: 'rgba(72,85,71,0.45)', fontSize: 13 }}>No zones on the map yet.</p>
                                    <p style={{ color: 'rgba(72,85,71,0.3)', fontSize: 11, textAlign: 'center', padding: '0 32px' }}>
                                        When adding a new area, toggle "Add to General" to place it here as a circle.<br />
                                        Drop any plant or structure from the sidebar to place it freely.
                                    </p>
                                </div>
                            )}
                            {generalZones.map(({ zone, i, pos }) => {
                                const livePos = liveCirclePos[i] || {};
                                const liveSize = liveZoneSize[i] || {};
                                return (
                                    <ZoneCircle
                                        key={i} zone={zone} zoneIdx={i}
                                        position={{ ...pos, ...livePos, ...liveSize }}
                                        selected={i === currentZone}
                                        pxPerM={pxPerM}
                                        zoom={zoom}
                                        onMouseDown={handleCircleMouseDown}
                                        onClick={onSelectZone}
                                        onShapeToggle={handleShapeToggle}
                                        onRectResizeStart={handleZoneRectResizeStart}
                                        onRemoveFromGeneral={handleRemoveFromGeneral}
                                    />
                                );
                            })}
                            {/* Proposed permaculture elements — dashed, hover-aware, non-interactive */}
                            <ProposedElementsOverlay
                                items={proposedItems}
                                pxPerM={pxPerM}
                                hoveredName={proposedHoveredName}
                                selectedNames={proposedSelectedNames}
                            />

                            {overlayItems.map(item => {
                                const lp = liveOverlayPos[item.id] || {};
                                const ls = liveOverlaySize[item.id] || {};
                                const lr = liveRotation[item.id];
                                // Collect raisedBed items for this zone portal so VegGardenPreview can show real beds
                                const zoneRef = item.zoneRef || null;
                                const zoneBeds = (item.isZonePortal && zoneRef)
                                    ? (zoneItems[zoneRef] || []).filter(it => it.type === 'raisedBed' || it.name === 'Raised Bed')
                                    : [];
                                return (
                                    <OverlayItem
                                        key={item.id}
                                        item={{ ...item, ...lp, ...ls, ...(lr !== undefined ? { rotation: lr } : {}) }}
                                        pxPerM={pxPerM}
                                        zoom={zoom}
                                        onMouseDown={handleOverlayMouseDown}
                                        onRemove={id => onUpdateOverlayItems(overlayItems.filter(it => it.id !== id))}
                                        onResizeStart={handleOverlayResizeStart}
                                        onRotateStart={handleRotateStart}
                                        onSelectBed={onSelectBed}
                                        selectedBedId={selectedBedId}
                                        bedLayout={bedLayouts?.[item.id]}
                                        selectedBedElementId={selectedBedElementId}
                                        onSelectBedElement={onSelectBedElement}
                                        onUpdateBedLayout={onUpdateBedLayout}
                                        onOpenZonePortal={onOpenZonePortal}
                                        zoneBeds={zoneBeds}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Zoom pill — sibling of scroll container, stays fixed in corner */}
            <div style={{
                position: 'absolute', bottom: 12, right: 12,
                background: 'rgba(0,0,0,0.55)', borderRadius: 20,
                display: 'flex', alignItems: 'center', gap: 2,
                padding: '3px 6px', zIndex: 100, userSelect: 'none',
            }}>
                <button onClick={() => setZoom(z => Math.max(0.05, z / 1.25))}
                    style={{ color: 'white', fontSize: 16, cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1, padding: '0 4px' }}>−</button>
                <span onClick={() => setZoom(1)} title="Click to fit map in view"
                    style={{ color: 'white', fontSize: 11, cursor: 'pointer', minWidth: 38, textAlign: 'center' }}>
                    {Math.round(zoom * 100)}%
                </span>
                <button onClick={() => setZoom(z => Math.min(5, z * 1.25))}
                    style={{ color: 'white', fontSize: 16, cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1, padding: '0 4px' }}>+</button>
            </div>
        </div>
    );
}

// ── Main canvas ───────────────────────────────────────────────────────────────
export default function GardenCanvas({ zones, grids, positions, setup, currentZone, onSelectZone, onUpdateGrid, onUpdatePositions, onAddZone, onDeleteZone, onRenameZone, plantList, overlayItems = [], onUpdateOverlayItems, selectedBedId, onSelectBed, selectedBedElementId, onSelectBedElement, bedLayouts, onUpdateBedLayout, zoneItems, onUpdateZoneItems, onAddZoneItem, onResetZone, proposedItems = [], proposedHoveredName = null, proposedSelectedNames = null, onOpenZonePortal, neighbourhood = null, onRotateNorth, hideCompass = false }) {
    const { t, language } = useLanguage();
    const [resizeState, setResizeState] = useState(null);
    const [plantResizeState, setPlantResizeState] = useState(null);
    const [resizePreview, setResizePreview] = useState(null);
    const [generalZoom, setGeneralZoom] = useState(1);
    const [zoomMap, setZoomMap] = useState({});
    const [detailModeMap, setDetailModeMap] = useState({});
    const detailContainerRef = useRef(null);
    const detailZoom = zoomMap[currentZone] ?? 1;
    const setDetailZoom = (val) => setZoomMap(prev => ({ ...prev, [currentZone]: typeof val === 'function' ? val(prev[currentZone] ?? 1) : val }));

    // Compute zoom that fits the current zone in the container
    const computeFitZoom = () => {
        if (currentZone < 0 || !zones[currentZone]) return 1;
        const el = detailContainerRef.current;
        const cw = el ? el.clientWidth : 800;
        const ch = el ? el.clientHeight : 600;
        const grid = grids[currentZone] || [];
        const cols = grid[0]?.length || 1;
        const rows = grid.length || 1;
        const baseCell = (setup.cellSizeM || 1) * CELL_PX;
        const zoneW = cols * baseCell;
        const zoneH = HEADER_H + rows * baseCell + FOOTER_H;
        const pad = 56;
        return Math.max(0.05, Math.min(1, Math.min((cw - pad) / zoneW, (ch - pad) / zoneH)));
    };

    // Auto-fit only on first visit to a zone (zoom persists on subsequent tab switches)
    const visitedZones = useRef(new Set());
    useEffect(() => {
        if (currentZone < 0) return;
        if (!visitedZones.current.has(currentZone)) {
            visitedZones.current.add(currentZone);
            setDetailZoom(computeFitZoom());
        }
    }, [currentZone]);

    // Ctrl+scroll zoom on the detail canvas
    useEffect(() => {
        const el = detailContainerRef.current;
        if (!el) return;
        const onWheel = (e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            setDetailZoom(z => Math.min(5, Math.max(0.05, z * (e.deltaY < 0 ? 1.1 : 0.9))));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [currentZone]);
    const [plantResizePreview, setPlantResizePreview] = useState(null);
    const [pendingDrop, setPendingDrop] = useState(null);
    const [addZoneOpen, setAddZoneOpen] = useState(false);
    const [renaming, setRenaming] = useState(null);

    const cellSizeM = setup.cellSizeM || 1;
    const cellW = Math.max(4, cellSizeM * CELL_PX * detailZoom);
    const cellH = Math.max(4, cellSizeM * CELL_PX * detailZoom);

    useEffect(() => {
        if (!resizeState) return;
        const { zoneIdx, startX, startY, origCols, origRows, cw, ch, grid } = resizeState;
        const onMove = (e) => setResizePreview({ zoneIdx, cols: Math.max(1, origCols + Math.round((e.clientX - startX) / cw)), rows: Math.max(1, origRows + Math.round((e.clientY - startY) / ch)) });
        const onUp = (e) => { onUpdateGrid(zoneIdx, resizeGridLocal(grid, Math.max(1, origRows + Math.round((e.clientY - startY) / ch)), Math.max(1, origCols + Math.round((e.clientX - startX) / cw)))); setResizePreview(null); setResizeState(null); };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [resizeState]);

    useEffect(() => {
        if (!plantResizeState) return;
        const { zoneIdx, row, col, startX, startY, origSC, origSR, cw, ch, gridCols, gridRows, cornerIdx, grid } = plantResizeState;
        const calc = (e) => {
            const dx = e.clientX - startX; const dy = e.clientY - startY;
            const signX = cornerIdx === 0 || cornerIdx === 2 ? 1 : -1;
            const signY = cornerIdx === 0 || cornerIdx === 1 ? 1 : -1;
            return { newSC: Math.max(1, Math.min(origSC + signX * Math.round(dx / cw), gridCols - col)), newSR: Math.max(1, Math.min(origSR + signY * Math.round(dy / ch), gridRows - row)) };
        };
        const onMove = (e) => { const { newSC, newSR } = calc(e); setPlantResizePreview({ zoneIdx, row, col, spanCols: newSC, spanRows: newSR }); };
        const onUp = (e) => { const { newSC, newSR } = calc(e); onUpdateGrid(zoneIdx, grid.map((r, ri) => r.map((c, ci) => { if (ri === row && ci === col) return { ...c, spanCols: newSC, spanRows: newSR }; if (ri >= row && ri < row + newSR && ci >= col && ci < col + newSC) return null; return c; }))); setPlantResizePreview(null); setPlantResizeState(null); };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [plantResizeState]);

    const handleResizeMouseDown = (e, zoneIdx) => { e.preventDefault(); const grid = grids[zoneIdx]; setResizeState({ zoneIdx, startX: e.clientX, startY: e.clientY, origCols: grid[0]?.length || 1, origRows: grid.length, cw: cellW, ch: cellH, grid }); };
    const handlePlantResizeStart = (e, zoneIdx, row, col, origSC, origSR, cornerIdx) => { const grid = grids[zoneIdx]; setPlantResizeState({ zoneIdx, row, col, startX: e.clientX, startY: e.clientY, origSC, origSR, cornerIdx, cw: cellW, ch: cellH, gridCols: grid[0]?.length || 1, gridRows: grid.length, grid }); };

    const handleZoneDrop = (e, zoneIdx, dropCH, dropCW) => {
        e.preventDefault(); e.stopPropagation();
        const raw = e.dataTransfer.getData('plant'); if (!raw) return;
        try {
            const dropped = JSON.parse(raw);
            const rect = e.currentTarget.getBoundingClientRect();
            const colIndex = Math.max(0, Math.min(Math.floor((e.clientX - rect.left) / dropCW), (grids[zoneIdx][0]?.length || 1) - 1));
            const rowIndex = Math.max(0, Math.min(Math.floor((e.clientY - rect.top) / dropCH), (grids[zoneIdx]?.length || 1) - 1));
            if (dropped.fromZone !== undefined) {
                const { fromZone, fromRow, fromCol, spanCols: dSC = 1, spanRows: dSR = 1 } = dropped;
                const cell = grids[fromZone]?.[fromRow]?.[fromCol];
                if (!cell || (fromZone === zoneIdx && fromRow === rowIndex && fromCol === colIndex)) return;
                const clearSrc = (g) => g.map((row, r) => row.map((c, col) => r >= fromRow && r < fromRow + dSR && col >= fromCol && col < fromCol + dSC ? null : c));
                const placeAt = (g) => g.map((row, r) => row.map((c, co) => { if (r === rowIndex && co === colIndex) return cell; if (r >= rowIndex && r < rowIndex + dSR && co >= colIndex && co < colIndex + dSC) return null; return c; }));
                if (fromZone === zoneIdx) { onUpdateGrid(zoneIdx, placeAt(clearSrc(grids[zoneIdx]))); } else { onUpdateGrid(fromZone, clearSrc(grids[fromZone])); onUpdateGrid(zoneIdx, placeAt(grids[zoneIdx])); }
                return;
            }
            if (dropped.isStructure) { const def = STRUCTURE_MAP[dropped.name]; onUpdateGrid(zoneIdx, grids[zoneIdx].map((row, r) => row.map((c, col) => r === rowIndex && col === colIndex ? { plant: dropped.name, isStructure: true, iconData: dropped.icon || def?.icon, structureColor: dropped.color || def?.color, notes: '', spanCols: 1, spanRows: 1 } : c))); return; }
            const fullPlant = plantList.find(p => p.name === dropped.name);
            const zt = fullPlant?.planting?.zoneTimes?.[setup.hardinessZone || '7b'];
            const suggestedDate = zt?.directSow || zt?.transplant || new Date().toISOString().split('T')[0];
            setPendingDrop({ zoneIdx, rowIndex, colIndex, plant: dropped, fullPlant, suggestedDate });
        } catch (err) { console.error('Drop error', err); }
    };

    const handleConfirmDrop = ({ date, notes }) => {
        const { zoneIdx, rowIndex, colIndex, plant, fullPlant } = pendingDrop;
        const plantedDate = new Date(date);
        let expectedHarvest = null;
        if (fullPlant?.planting?.daysToMaturity) { const h = new Date(plantedDate); h.setDate(h.getDate() + fullPlant.planting.daysToMaturity); expectedHarvest = h.toISOString().split('T')[0]; }
        onUpdateGrid(zoneIdx, grids[zoneIdx].map((row, r) => row.map((c, co) => r === rowIndex && co === colIndex ? { plant: plant.name, plantedDate: plantedDate.toISOString().split('T')[0], expectedHarvest, notes, iconData: plant.iconData, spanCols: 1, spanRows: 1 } : c)));
        setPendingDrop(null);
    };

    const handleRemovePlant = (zoneIdx, row, col, spanRows = 1, spanCols = 1) => onUpdateGrid(zoneIdx, grids[zoneIdx].map((r, ri) => r.map((c, ci) => ri >= row && ri < row + spanRows && ci >= col && ci < col + spanCols ? null : c)));

    const handleRenameConfirm = () => { if (!renaming) return; const updated = [...zones]; updated[renaming.idx] = renaming.value.trim() || zones[renaming.idx]; onRenameZone(updated); setRenaming(null); };

    const isGeneralView = currentZone === -1;
    const isValidZone = currentZone >= 0 && currentZone < zones.length;
    const currentZoneName = isValidZone ? zones[currentZone] : null;
    const currentZoneItems = currentZoneName ? (zoneItems?.[currentZoneName] || []) : [];

    return (
        <div className="flex flex-col h-full overflow-hidden">


            <div style={{ background: '#fbf7ea', borderBottom: '1px solid #e8e2cc', padding: '8px 16px', flexShrink: 0 }}>
                <ZoneTabs zones={zones} currentZone={currentZone} setCurrentZone={onSelectZone} setZones={onRenameZone} onAddZone={() => setAddZoneOpen(true)} onDeleteZone={onDeleteZone} onRenameZone={onRenameZone} onResetZone={onResetZone} />
            </div>

            {isGeneralView ? (
                <GeneralCanvas zones={zones} positions={positions} currentZone={currentZone} overlayItems={overlayItems} plantList={plantList} setup={setup} onSelectZone={onSelectZone} onUpdatePositions={onUpdatePositions} onUpdateOverlayItems={onUpdateOverlayItems} onAddZone={onAddZone} selectedBedId={selectedBedId} onSelectBed={onSelectBed} selectedBedElementId={selectedBedElementId} onSelectBedElement={onSelectBedElement} bedLayouts={bedLayouts} onUpdateBedLayout={onUpdateBedLayout} proposedItems={proposedItems} proposedHoveredName={proposedHoveredName} proposedSelectedNames={proposedSelectedNames} onOpenZonePortal={onOpenZonePortal} neighbourhood={neighbourhood} onRotateNorth={onRotateNorth} hideCompass={hideCompass || addZoneOpen || !!pendingDrop} zoneItems={zoneItems} />
            ) : (
                <div className="flex-1" style={{ position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!hideCompass && !addZoneOpen && !pendingDrop && (
                        <CompassRose northDirection={setup?.northDirection || 'top'} onRotate={onRotateNorth} />
                    )}
                    {currentZoneName ? (() => {
                        const _zPortal = overlayItems.find(it => it.isZonePortal && it.zoneRef === currentZoneName);
                        const _zWM = _zPortal?.wM ?? null;
                        const _zHM = _zPortal?.hM ?? null;
                        const _zType = detectZoneType(currentZoneName);
                        const _zProps = {
                            zoneName: currentZoneName,
                            items: currentZoneItems,
                            onUpdateItems: newItems => onUpdateZoneItems?.(currentZoneName, newItems),
                            plantList,
                            setup,
                            zoneWidthM: _zWM,
                            zoneHeightM: _zHM,
                        };
                        if (_zType === 'orchard') return <OrchardZoneCanvas {..._zProps} />;
                        return <RaisedBedZoneCanvas {..._zProps} />;
                    })() : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c857a', fontSize: 13 }}>
                            No zone selected.
                        </div>
                    )}
                </div>
            )}

            {addZoneOpen && <AddZoneModal onAdd={name => { onAddZone(name, true); setAddZoneOpen(false); }} onClose={() => setAddZoneOpen(false)} />}
            {pendingDrop && <PlantingModal plant={pendingDrop.plant} suggestedDate={pendingDrop.suggestedDate} onConfirm={handleConfirmDrop} onCancel={() => setPendingDrop(null)} />}
        </div>
    );
}
