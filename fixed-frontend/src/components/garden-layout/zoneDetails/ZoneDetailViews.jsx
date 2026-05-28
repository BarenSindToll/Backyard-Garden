import { useMemo } from 'react';
import { GW, GH, rng, Pill, CalloutCard, Plant, Canopy, Layer, ICONS } from './primitives.jsx';

// ─── Shared primitives for canvas.jsx-style views ────────────────────────────

function ZoneLabel({ text, size = 'normal' }) {
    const fontMap = { small: 10, normal: 11.5, large: 13 };
    return (
        <div style={{
            display: 'inline-block', background: '#f7ecd0',
            border: '1px solid rgba(110,75,30,0.55)', padding: '3px 11px', borderRadius: 2,
            fontFamily: 'Newsreader, Georgia, serif', fontSize: fontMap[size], fontWeight: 600,
            color: '#3a2810', letterSpacing: '0.12em', textTransform: 'uppercase',
            textAlign: 'center', boxShadow: '0 2px 4px rgba(80,50,20,0.18)',
            whiteSpace: 'nowrap', pointerEvents: 'none', lineHeight: 1.2,
        }}>{text}</div>
    );
}

function LeaderLine({ x1, y1, x2, y2, color = '#5a3a18' }) {
    return (
        <g opacity="0.7">
            <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color} strokeWidth="0.18" strokeDasharray="0.6 0.4" strokeLinecap="round" />
            <circle cx={x2} cy={y2} r="0.4" fill={color} />
        </g>
    );
}

function PlantTile({ cx, cy, sizeM, icon, pxPerM, pxPerMY }) {
    const wPx = sizeM * pxPerM, hPx = sizeM * pxPerMY;
    return (
        <div style={{
            position: 'absolute',
            left: `calc(${(cx / GW) * 100}% - ${wPx / 2}px)`,
            top: `calc(${(cy / GH) * 100}% - ${hPx / 2}px)`,
            width: wPx, height: hPx, pointerEvents: 'none',
        }}>
            <img src={icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(50,30,10,0.3))' }} draggable={false} />
        </div>
    );
}

function Bush({ cx, cy, pxPerM, pxPerMY, color = '#a8c490', r = 1.3 }) {
    const wPx = r * 2 * pxPerM, hPx = r * 2 * pxPerMY;
    return (
        <div style={{
            position: 'absolute',
            left: `calc(${(cx / GW) * 100}% - ${wPx / 2}px)`,
            top: `calc(${(cy / GH) * 100}% - ${hPx / 2}px)`,
            width: wPx, height: hPx, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.4), ${color} 55%, rgba(0,0,0,0.15))`,
            border: `1px solid ${color}99`, boxShadow: '0 1.5px 3px rgba(40,40,20,0.2)', pointerEvents: 'none',
        }} />
    );
}

function SimpleTree({ cx, cy, r = 2, pxPerM, pxPerMY, icon }) {
    const wPx = r * 2 * pxPerM, hPx = r * 2 * pxPerMY;
    return (
        <div style={{
            position: 'absolute',
            left: `calc(${(cx / GW) * 100}% - ${wPx / 2}px)`,
            top: `calc(${(cy / GH) * 100}% - ${hPx / 2}px)`,
            width: wPx, height: hPx, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 28%, #a8d088 0%, #6f9858 55%, #4d7637 100%)',
            border: '1px solid rgba(60,90,40,0.55)', boxShadow: '0 2px 4px rgba(40,60,30,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
            {wPx > 20 && icon && (
                <img src={icon} alt="" style={{ width: '55%', height: '55%', objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
            )}
        </div>
    );
}

// ─── GUILD DETAIL ─────────────────────────────────────────────────────────────

const GUILD_COMPANIONS = [
    { angle: -90, role: 'Pollinator',           plant: 'Calendula',  icon: ICONS.calendula },
    { angle: -30, role: 'Nitrogen Fixer',        plant: 'Clover',     icon: ICONS.blueberry },
    { angle:  30, role: 'Nutrient Accumulator',  plant: 'Sunflower',  icon: ICONS.sunflower },
    { angle:  90, role: 'Weed Suppressor',       plant: 'Strawberry', icon: ICONS.strawberry },
    { angle: 150, role: 'Pest Repeller',         plant: 'Garlic',     icon: ICONS.garlic },
    { angle: 210, role: 'Soil Insulator',        plant: 'Chamomile',  icon: ICONS.chamomile },
];

export function GuildDetail({ faded, pxPerM, pxPerMY }) {
    const cx = 50, cy = 28, ringR = 18, treeR = 8, plantR = 3.5;
    return (
        <>
            <Layer opacity={faded ? 0.5 : 1}>
                <circle cx={cx} cy={cy} r={ringR + 6} fill="#d4e0b8" opacity="0.45" />
                <circle cx={cx} cy={cy} r={ringR + 1} fill="#bcd9a4" opacity="0.4" />
                <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="#5a3a18" strokeWidth="0.18" strokeDasharray="0.8 0.6" opacity={faded ? 0.3 : 0.5} />
                {GUILD_COMPANIONS.map((c, i) => {
                    const a = (c.angle * Math.PI) / 180;
                    const px = cx + Math.cos(a) * ringR, py = cy + Math.sin(a) * ringR;
                    const lx = cx + Math.cos(a) * (ringR + 7), ly = cy + Math.sin(a) * (ringR + 7);
                    return <LeaderLine key={i} x1={lx} y1={ly} x2={px} y2={py} />;
                })}
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1 }}>
                <SimpleTree cx={cx} cy={cy} r={treeR} pxPerM={pxPerM} pxPerMY={pxPerMY} icon={ICONS.apple} />
                <div style={{ position: 'absolute', left: `${(cx / GW) * 100}%`, top: `${((cy + 11) / GH) * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                    <ZoneLabel text="Apple Tree" size="normal" />
                </div>
                {GUILD_COMPANIONS.map((c, i) => {
                    const a = (c.angle * Math.PI) / 180;
                    const px = cx + Math.cos(a) * ringR, py = cy + Math.sin(a) * ringR;
                    const lx = cx + Math.cos(a) * (ringR + 7), ly = cy + Math.sin(a) * (ringR + 7);
                    return (
                        <div key={i}>
                            <Bush cx={px} cy={py} pxPerM={pxPerM} pxPerMY={pxPerMY} color="#9bbb88" r={plantR} />
                            <PlantTile cx={px} cy={py} sizeM={plantR * 1.4} icon={c.icon} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                            <div style={{ position: 'absolute', left: `${(lx / GW) * 100}%`, top: `${(ly / GH) * 100}%`, transform: 'translate(-50%, -50%)', textAlign: 'center', fontFamily: 'Inter, sans-serif', pointerEvents: 'none', zIndex: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#3a2810', letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 0 6px rgba(247,236,208,0.95)', lineHeight: 1.15 }}>{c.role}</div>
                                <div style={{ fontSize: 10, color: '#5a4528', fontStyle: 'italic', textShadow: '0 0 6px rgba(247,236,208,0.95)', marginTop: 2 }}>{c.plant}</div>
                            </div>
                        </div>
                    );
                })}
                <CalloutCard x={50} y={4} text="APPLE GUILD" subtitle="companion planting ring" />
            </div>
        </>
    );
}

// ─── POND DETAIL ──────────────────────────────────────────────────────────────

const POND_PLANTS = [
    { angle: -135, role: 'Marginal',       plant: 'Iris',      icon: ICONS.sunflower },
    { angle:  -75, role: 'Floating',       plant: 'Water Lily',icon: ICONS.rose },
    { angle:  -15, role: 'Marginal',       plant: 'Cattail',   icon: ICONS.sunflower },
    { angle:   45, role: 'Edge Cover',     plant: 'Calendula', icon: ICONS.calendula },
    { angle:  105, role: 'Insect Habitat', plant: 'Chamomile', icon: ICONS.chamomile },
    { angle:  165, role: 'Bog Plant',      plant: 'Borage',    icon: ICONS.blueberry },
];

export function PondDetail({ faded, pxPerM, pxPerMY }) {
    const cx = 50, cy = 28, pondRx = 18, pondRy = 12, ringR = 22;
    return (
        <>
            <Layer opacity={faded ? 0.5 : 1}>
                <defs>
                    <radialGradient id="pond-grad-d" cx="0.4" cy="0.35" r="0.7">
                        <stop offset="0" stopColor="#86bdda" />
                        <stop offset="0.6" stopColor="#4690b8" />
                        <stop offset="1" stopColor="#2a6a8c" />
                    </radialGradient>
                </defs>
                <ellipse cx={cx} cy={cy} rx={pondRx + 2} ry={pondRy + 2} fill="#c9a76a" opacity={faded ? 0.4 : 0.7} />
                <ellipse cx={cx} cy={cy} rx={pondRx} ry={pondRy} fill="url(#pond-grad-d)" opacity={faded ? 0.6 : 1} />
                <ellipse cx={cx - 4} cy={cy - 3} rx={pondRx * 0.55} ry={pondRy * 0.35} fill="rgba(255,255,255,0.32)" />
                {Array.from({ length: 22 }).map((_, i) => {
                    const a = (i / 22) * Math.PI * 2;
                    const rand = (((i * 71) | 0) % 100) / 100;
                    const r = 0.9 + rand * 0.5;
                    const sx = cx + Math.cos(a) * (pondRx + 1.5), sy = cy + Math.sin(a) * (pondRy + 1.5);
                    return <ellipse key={i} cx={sx} cy={sy} rx={r * 0.55} ry={r * 0.45} fill="#aeaaa0" stroke="rgba(60,60,55,0.5)" strokeWidth="0.05" />;
                })}
                {POND_PLANTS.map((p, i) => {
                    const a = (p.angle * Math.PI) / 180;
                    const px = cx + Math.cos(a) * ringR, py = cy + Math.sin(a) * (ringR * 0.75);
                    const lx = cx + Math.cos(a) * (ringR + 6), ly = cy + Math.sin(a) * (ringR * 0.75 + 6);
                    return <LeaderLine key={i} x1={lx} y1={ly} x2={px} y2={py} />;
                })}
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1 }}>
                <div style={{ position: 'absolute', left: `${(cx / GW) * 100}%`, top: `${(cy / GH) * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 4 }}>
                    <ZoneLabel text="Duck Pond" size="large" />
                </div>
                {POND_PLANTS.map((p, i) => {
                    const a = (p.angle * Math.PI) / 180;
                    const px = cx + Math.cos(a) * ringR, py = cy + Math.sin(a) * (ringR * 0.75);
                    const lx = cx + Math.cos(a) * (ringR + 6), ly = cy + Math.sin(a) * (ringR * 0.75 + 6);
                    return (
                        <div key={i}>
                            <Bush cx={px} cy={py} pxPerM={pxPerM} pxPerMY={pxPerMY} color="#9cc28e" r={2} />
                            <PlantTile cx={px} cy={py} sizeM={2.8} icon={p.icon} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                            <div style={{ position: 'absolute', left: `${(lx / GW) * 100}%`, top: `${(ly / GH) * 100}%`, transform: 'translate(-50%, -50%)', textAlign: 'center', fontFamily: 'Inter, sans-serif', pointerEvents: 'none', zIndex: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#3a2810', letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 0 6px rgba(247,236,208,0.95)', lineHeight: 1.15 }}>{p.plant}</div>
                                <div style={{ fontSize: 9.5, color: '#5a4528', fontStyle: 'italic', textShadow: '0 0 6px rgba(247,236,208,0.95)', marginTop: 2 }}>{p.role}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

// ─── HERB GARDEN DETAIL ───────────────────────────────────────────────────────

const HERB_CLUSTERS = [
    { cx: 16, cy: 12, r: 5, name: 'Chamomile',  icon: ICONS.chamomile,  tint: '#f0f1d2' },
    { cx: 36, cy: 12, r: 5, name: 'Calendula',  icon: ICONS.calendula,  tint: '#fcecb8' },
    { cx: 56, cy: 12, r: 5, name: 'Garlic',     icon: ICONS.garlic,     tint: '#f6ecd6' },
    { cx: 76, cy: 12, r: 5, name: 'Rose',       icon: ICONS.rose,       tint: '#f9d4dc' },
    { cx: 16, cy: 30, r: 5, name: 'Strawberry', icon: ICONS.strawberry, tint: '#fde0e4' },
    { cx: 36, cy: 30, r: 5, name: 'Borage',     icon: ICONS.blueberry,  tint: '#dce5f0' },
    { cx: 56, cy: 30, r: 5, name: 'Calendula',  icon: ICONS.calendula,  tint: '#fcecb8' },
    { cx: 76, cy: 30, r: 5, name: 'Sunflower',  icon: ICONS.sunflower,  tint: '#fde9a4' },
    { cx: 16, cy: 48, r: 5, name: 'Chamomile',  icon: ICONS.chamomile,  tint: '#f0f1d2' },
    { cx: 36, cy: 48, r: 5, name: 'Garlic',     icon: ICONS.garlic,     tint: '#f6ecd6' },
    { cx: 56, cy: 48, r: 5, name: 'Rose',       icon: ICONS.rose,       tint: '#f9d4dc' },
    { cx: 76, cy: 48, r: 5, name: 'Calendula',  icon: ICONS.calendula,  tint: '#fcecb8' },
];

function HerbCluster({ c, pxPerM, pxPerMY }) {
    const grid = useMemo(() => {
        const arr = [], step = 1.4;
        for (let dx = -c.r; dx <= c.r; dx += step)
            for (let dy = -c.r; dy <= c.r; dy += step)
                if (dx * dx + dy * dy < c.r * c.r * 0.85)
                    arr.push({ x: c.cx + dx, y: c.cy + dy });
        return arr;
    }, [c.cx, c.cy, c.r]);
    return (
        <>
            <div style={{ position: 'absolute', left: `calc(${(c.cx / GW) * 100}% - ${c.r * pxPerM}px)`, top: `calc(${(c.cy / GH) * 100}% - ${c.r * pxPerMY}px)`, width: c.r * 2 * pxPerM, height: c.r * 2 * pxPerMY, borderRadius: '50%', background: c.tint, opacity: 0.55, boxShadow: '0 3px 8px rgba(60,40,20,0.18)', pointerEvents: 'none' }} />
            {grid.map((p, i) => <PlantTile key={i} cx={p.x} cy={p.y} sizeM={1.1} icon={c.icon} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
            <div style={{ position: 'absolute', left: `${(c.cx / GW) * 100}%`, top: `${(c.cy / GH) * 100}%`, transform: 'translate(-50%, -50%)', zIndex: 5, pointerEvents: 'none' }}>
                <ZoneLabel text={c.name} size="normal" />
            </div>
        </>
    );
}

export function HerbGardenDetail({ faded, pxPerM, pxPerMY }) {
    return (
        <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1 }}>
            {HERB_CLUSTERS.map((c, i) => <HerbCluster key={i} c={c} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
            <CalloutCard x={50} y={4} text="HERB GARDEN" subtitle="12 herb clusters" />
        </div>
    );
}

// ─── VEGETABLE GARDEN DETAIL ──────────────────────────────────────────────────

const DENSITY_GRID = { wide: { plantsPerM2: 0.6 }, medium: { plantsPerM2: 1.2 }, tight: { plantsPerM2: 2.5 } };

const VEG_BEDS = [
    {
        id: 'bed-companion', x: 14, y: 8, w: 36, h: 22, style: 'pine', cols: 3, rows: 3,
        cells: [
            { pair: { a: 'Strawberry', iconA: ICONS.strawberry, colorA: '#f08a70', b: 'Calendula',  iconB: ICONS.calendula,  colorB: '#f0c45a' }, density: 'medium' },
            { pair: { a: 'Garlic',     iconA: ICONS.garlic,     colorA: '#e8d8b0', b: 'Chamomile',  iconB: ICONS.chamomile,  colorB: '#dde4b0' }, density: 'tight' },
            { pair: { a: 'Raspberry',  iconA: ICONS.raspberry,  colorA: '#d870a0', b: 'Garlic',     iconB: ICONS.garlic,     colorB: '#e8d8b0' }, density: 'medium' },
            { pair: { a: 'Blueberry',  iconA: ICONS.blueberry,  colorA: '#7eb0d4', b: 'Chamomile',  iconB: ICONS.chamomile,  colorB: '#dde4b0' }, density: 'medium' },
            { pair: { a: 'Calendula',  iconA: ICONS.calendula,  colorA: '#f5d65a', b: 'Sunflower',  iconB: ICONS.sunflower,  colorB: '#f0c45a' }, density: 'wide' },
            { pair: { a: 'Rose',       iconA: ICONS.rose,       colorA: '#e890a8', b: 'Garlic',     iconB: ICONS.garlic,     colorB: '#e8d8b0' }, density: 'medium' },
            { pair: { a: 'Apple',      iconA: ICONS.apple,      colorA: '#e8806a', b: 'Calendula',  iconB: ICONS.calendula,  colorB: '#f0c45a' }, density: 'wide' },
            { pair: { a: 'Plum',       iconA: ICONS.plum,       colorA: '#a07cb8', b: 'Chamomile',  iconB: ICONS.chamomile,  colorB: '#dde4b0' }, density: 'wide' },
            { pair: { a: 'Strawberry', iconA: ICONS.strawberry, colorA: '#f08a70', b: 'Rose',       iconB: ICONS.rose,       colorB: '#e890a8' }, density: 'medium' },
        ],
    },
    {
        id: 'bed-2', x: 55, y: 8, w: 30, h: 10, style: 'dark', cols: 3, rows: 1,
        cells: [
            { plant: 'Sunflower', icon: ICONS.sunflower, density: 'wide' },
            { plant: 'Calendula', icon: ICONS.calendula, density: 'medium' },
            { plant: 'Rose',      icon: ICONS.rose,      density: 'wide' },
        ],
    },
    {
        id: 'bed-3', x: 55, y: 22, w: 30, h: 8, style: 'dark', cols: 4, rows: 1,
        cells: [
            { plant: 'Garlic',     icon: ICONS.garlic,     density: 'tight' },
            { plant: 'Chamomile',  icon: ICONS.chamomile,  density: 'tight' },
            { plant: 'Strawberry', icon: ICONS.strawberry, density: 'medium' },
            { plant: 'Calendula',  icon: ICONS.calendula,  density: 'medium' },
        ],
    },
];

function CompanionPill({ a, b, colorA, colorB, fontSize, maxWidth }) {
    const charPx = fontSize * 0.6;
    const halfPx = (maxWidth || 200) / 2 - fontSize * 1.4;
    const maxChars = Math.max(2, Math.floor(halfPx / charPx));
    const fit = (s) => s.length <= maxChars ? s : s.slice(0, Math.max(2, maxChars - 1)) + '.';
    const aT = fit(a), bT = fit(b);
    const pad = `${Math.max(1.5, fontSize * 0.22)}px ${Math.max(3, fontSize * 0.45)}px`;
    return (
        <div style={{ display: 'inline-flex', alignItems: 'stretch', borderRadius: 999, overflow: 'hidden', border: '1px solid #2a1a08', boxShadow: '0 1.5px 4px rgba(0,0,0,0.45)', fontFamily: 'Inter, sans-serif', fontSize, fontWeight: 800, letterSpacing: '0.01em', textTransform: 'uppercase', whiteSpace: 'nowrap', pointerEvents: 'none', maxWidth }}>
            <span style={{ padding: pad, background: colorA, color: '#231a08', textShadow: '0 1px 0 rgba(255,255,255,0.35)' }}>{aT}</span>
            <span style={{ padding: `${Math.max(1.5, fontSize * 0.22)}px ${Math.max(2, fontSize * 0.25)}px`, background: '#2a1a08', color: '#f5e6c4', display: 'flex', alignItems: 'center', fontWeight: 600 }}>+</span>
            <span style={{ padding: pad, background: colorB, color: '#231a08', textShadow: '0 1px 0 rgba(255,255,255,0.35)' }}>{bT}</span>
        </div>
    );
}

function WoodSign({ text, fontSize }) {
    return (
        <div style={{ display: 'inline-block', padding: `${Math.max(2, fontSize * 0.25)}px ${Math.max(6, fontSize * 0.7)}px`, background: 'linear-gradient(180deg, #e3c08a 0%, #d4ad6c 35%, #c19655 65%, #a87a44 100%)', border: '1.5px solid #5e3d1c', borderRadius: 4, fontSize, fontWeight: 700, color: '#3a2510', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 1px 0 rgba(255,236,200,0.45)', boxShadow: '0 2px 4px rgba(0,0,0,0.45)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{text}</div>
    );
}

function CompanionCell({ cell, cellWM, cellHM, pxPerM, pxPerMY }) {
    const cellWPx = cellWM * pxPerM, cellHPx = cellHM * pxPerMY;
    const p = cell.pair;
    const halfArea = (cellWM / 2) * cellHM;
    const target = Math.max(2, Math.round(halfArea * DENSITY_GRID[cell.density].plantsPerM2));
    const aspect = (cellWM / 2) / Math.max(0.1, cellHM);
    const cols = Math.max(1, Math.round(Math.sqrt(target * aspect)));
    const rows = Math.max(1, Math.ceil(target / cols));
    const halfWPx = cellWPx / 2;
    const dx = halfWPx / cols, dy = cellHPx / rows;
    const tileSize = Math.min(dx, dy) * 0.95;
    const make = (ox, icon) => {
        const out = [];
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++)
                out.push({ x: ox + dx * (c + 0.5), y: dy * (r + 0.5), icon });
        return out;
    };
    const all = [...make(0, p.iconA), ...make(halfWPx, p.iconB)];
    const pillFont = Math.max(6.5, Math.min(11, cellWPx * 0.075, cellHPx * 0.16));
    const pillMaxW = Math.max(40, cellWPx - 4);
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: 'radial-gradient(ellipse at 30% 30%, #5a3a1f 0%, #3e2612 60%, #2a190a 100%)', overflow: 'hidden' }}>
            {all.map((t, i) => <img key={i} src={t.icon} alt="" style={{ position: 'absolute', left: t.x - tileSize / 2, top: t.y - tileSize / 2, width: tileSize, height: tileSize, objectFit: 'contain', pointerEvents: 'none', filter: 'drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.45))' }} draggable={false} />)}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                <CompanionPill a={p.a} b={p.b} colorA={p.colorA} colorB={p.colorB} fontSize={pillFont} maxWidth={pillMaxW} />
            </div>
        </div>
    );
}

function BedCell({ cell, cellWM, cellHM, pxPerM, pxPerMY }) {
    if (cell.pair) return <CompanionCell cell={cell} cellWM={cellWM} cellHM={cellHM} pxPerM={pxPerM} pxPerMY={pxPerMY} />;
    const cellWPx = cellWM * pxPerM, cellHPx = cellHM * pxPerMY;
    const area = cellWM * cellHM;
    const target = Math.max(2, Math.round(area * DENSITY_GRID[cell.density].plantsPerM2));
    const aspect = cellWM / Math.max(0.1, cellHM);
    const cols = Math.max(1, Math.round(Math.sqrt(target * aspect)));
    const rows = Math.max(1, Math.ceil(target / cols));
    const dx = cellWPx / cols, dy = cellHPx / rows;
    const tileSize = Math.min(dx, dy) * 0.92;
    const positions = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            positions.push({ x: dx * (c + 0.5), y: dy * (r + 0.5) });
    const signFont = Math.max(7, Math.min(13, cellWPx * 0.075, cellHPx * 0.22));
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: 'radial-gradient(ellipse at 30% 30%, #5a3a1f 0%, #3e2612 60%, #2a190a 100%)', overflow: 'hidden' }}>
            {positions.map((p, i) => <img key={i} src={cell.icon} alt="" style={{ position: 'absolute', left: p.x - tileSize / 2, top: p.y - tileSize / 2, width: tileSize, height: tileSize, objectFit: 'contain', pointerEvents: 'none', filter: 'drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.45))' }} draggable={false} />)}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                <WoodSign text={cell.plant} fontSize={signFont} />
            </div>
        </div>
    );
}

function RaisedBed({ bed, pxPerM, pxPerMY }) {
    const cellWM = bed.w / bed.cols, cellHM = bed.h / bed.rows;
    const widthPx = bed.w * pxPerM;
    const frame = Math.max(5, Math.min(11, widthPx * 0.022));
    const isPine = bed.style === 'pine';
    const wood = isPine
        ? { base: '#c79a64', gradient: 'linear-gradient(90deg, #b88858 0%, #d5a86e 25%, #c79a64 55%, #d8ad72 80%, #b18250 100%)', nail: 'radial-gradient(circle at 30% 30%, #e8d8b0, #8a6e40 60%, #4a3015 100%)' }
        : { base: '#6e3d1e', gradient: 'linear-gradient(90deg, #5e3318 0%, #8a5a30 30%, #6e3d1e 55%, #7a4a25 80%, #5e3318 100%)', nail: 'radial-gradient(circle at 30% 30%, #d8c8a0, #6e5028 60%, #2a1808 100%)' };
    const nailSz = Math.max(2.5, frame * 0.4);
    return (
        <div style={{ position: 'absolute', left: `${(bed.x / GW) * 100}%`, top: `${(bed.y / GH) * 100}%`, width: `${(bed.w / GW) * 100}%`, height: `${(bed.h / GH) * 100}%`, background: wood.base, padding: frame, borderRadius: 4, boxShadow: '0 5px 18px rgba(40,25,10,0.4)', boxSizing: 'border-box', backgroundImage: wood.gradient }}>
            {[{ top: frame * 0.35, left: frame * 0.35 }, { top: frame * 0.35, right: frame * 0.35 }, { bottom: frame * 0.35, left: frame * 0.35 }, { bottom: frame * 0.35, right: frame * 0.35 }].map((pos, i) => (
                <span key={i} style={{ position: 'absolute', ...pos, width: nailSz, height: nailSz, borderRadius: '50%', background: wood.nail, boxShadow: '0 1px 1px rgba(0,0,0,0.45)', pointerEvents: 'none', zIndex: 3 }} />
            ))}
            <div style={{ position: 'relative', width: '100%', height: '100%', background: '#2e1a0c', display: 'grid', gridTemplateColumns: `repeat(${bed.cols}, 1fr)`, gridTemplateRows: `repeat(${bed.rows}, 1fr)`, gap: Math.max(1, frame * 0.18), boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.6)', overflow: 'hidden', borderRadius: 1, zIndex: 2 }}>
                {bed.cells.map((c, i) => <BedCell key={i} cell={c} cellWM={cellWM} cellHM={cellHM} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
            </div>
        </div>
    );
}

export function VegetableGardenDetail({ faded, pxPerM, pxPerMY }) {
    return (
        <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1 }}>
            {VEG_BEDS.map(b => <RaisedBed key={b.id} bed={b} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
            <CalloutCard x={50} y={4} text="VEGETABLE GARDEN" subtitle="companion-planted raised beds" />
        </div>
    );
}

// ─── ORCHARD (elaborate) ──────────────────────────────────────────────────────

const ORCHARD_TREES = [
    { cx: 20, cy: 17, rTree: 4.5, rRing: 8, name: 'Apple',    fruit: ICONS.apple },
    { cx: 50, cy: 17, rTree: 4.5, rRing: 8, name: 'Apple',    fruit: ICONS.apple },
    { cx: 80, cy: 17, rTree: 4.5, rRing: 8, name: 'Plum',     fruit: ICONS.plum },
    { cx: 20, cy: 43, rTree: 4.0, rRing: 7, name: 'Hazelnut', fruit: ICONS.hazelnut },
    { cx: 50, cy: 43, rTree: 4.5, rRing: 8, name: 'Apple',    fruit: ICONS.apple },
    { cx: 80, cy: 43, rTree: 4.0, rRing: 7, name: 'Walnut',   fruit: ICONS.walnut },
];
const ORCHARD_COMPANIONS = [ICONS.calendula, ICONS.chamomile, ICONS.strawberry, ICONS.garlic, ICONS.blueberry, ICONS.sunflower];

function BirdBox({ cx, cy, pxPerM, pxPerMY }) {
    const w = 1.6 * pxPerM, h = 2.4 * pxPerMY;
    return (
        <div style={{ position: 'absolute', left: `calc(${(cx / GW) * 100}% - ${w / 2}px)`, top: `calc(${(cy / GH) * 100}% - ${h / 2}px)`, width: w, height: h, pointerEvents: 'none' }}>
            <div style={{ width: '40%', height: '55%', margin: '0 auto', background: 'linear-gradient(180deg,#a06840,#6e4225)', borderRadius: '3px 3px 1px 1px', position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                <div style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)', width: 4, height: 4, borderRadius: '50%', background: '#1a0e04' }} />
            </div>
            <div style={{ width: 1.5, height: '45%', margin: '0 auto', background: '#5a3c1c' }} />
        </div>
    );
}

export function Orchard({ faded, pxPerM, pxPerMY }) {
    return (
        <>
            <Layer opacity={faded ? 0.55 : 1}>
                <defs>
                    <pattern id="grass-stripes-o" width="100" height="6" patternUnits="userSpaceOnUse">
                        <rect width="100" height="6" fill="#bfd397" />
                        <rect y="3" width="100" height="3" fill="#aac783" />
                    </pattern>
                    <radialGradient id="mulch-grad-o" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor="#7a5a32" />
                        <stop offset="0.7" stopColor="#5a3e1d" />
                        <stop offset="1" stopColor="#46301a" />
                    </radialGradient>
                </defs>
                <rect width={GW} height={GH} fill="url(#grass-stripes-o)" />
                {Array.from({ length: 120 }).map((_, i) => { const r = rng(i + 13); const x = r() * GW, y = r() * GH; return <circle key={i} cx={x} cy={y} r={0.4 + r() * 0.4} fill="#8eb56e" opacity={0.5} />; })}
                <path d="M 6 30 L 94 30" stroke="#b18244" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />
                {ORCHARD_TREES.map((t, i) => <circle key={i} cx={t.cx} cy={t.cy} r={t.rRing} fill="url(#mulch-grad-o)" opacity="0.85" />)}
                {ORCHARD_TREES.map((t, i) => { const r = rng(i * 37 + 5); return Array.from({ length: 18 }).map((_, k) => { const a = r() * Math.PI * 2, dist = r() * (t.rRing - 1); return <circle key={`${i}-${k}`} cx={t.cx + Math.cos(a) * dist} cy={t.cy + Math.sin(a) * dist} r={0.15 + r() * 0.2} fill={r() > 0.5 ? '#3a2510' : '#8a6038'} opacity="0.6" />; }); })}
                {ORCHARD_TREES.map((t, i) => <circle key={`r-${i}`} cx={t.cx} cy={t.cy} r={t.rRing + 0.15} fill="none" stroke="rgba(60,40,15,0.4)" strokeWidth="0.15" strokeDasharray="0.7 0.5" />)}
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1, pointerEvents: 'none' }}>
                {ORCHARD_TREES.map((t, i) => (
                    <div key={`comp-${i}`}>
                        {ORCHARD_COMPANIONS.map((icon, k) => {
                            const angle = (k / ORCHARD_COMPANIONS.length) * Math.PI * 2 - Math.PI / 2;
                            const ringR = t.rRing - 0.8;
                            const cx = t.cx + Math.cos(angle) * ringR, cy = t.cy + Math.sin(angle) * ringR;
                            return (
                                <div key={k}>
                                    <div style={{ position: 'absolute', left: `calc(${(cx / GW) * 100}% - ${1.7 * pxPerM}px)`, top: `calc(${(cy / GH) * 100}% - ${1.7 * pxPerMY}px)`, width: 3.4 * pxPerM, height: 3.4 * pxPerMY, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #b4d68a, #6a9050 75%, #4a7028)', border: '1.2px solid rgba(50,80,30,0.5)', pointerEvents: 'none' }} />
                                    <Plant cx={cx} cy={cy} sizeM={2.6} icon={icon} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                                </div>
                            );
                        })}
                    </div>
                ))}
                {ORCHARD_TREES.map((t, i) => <Canopy key={`tree-${i}`} cx={t.cx} cy={t.cy} rM={t.rTree} pxPerM={pxPerM} pxPerMY={pxPerMY} fruit={t.fruit} />)}
                {ORCHARD_TREES.map((t, i) => <Pill key={`lbl-${i}`} x={t.cx} y={t.cy + t.rRing + 1.8} text={t.name} size={11} />)}
                <Plant cx={26} cy={29} sizeM={1.0} icon={ICONS.apple} pxPerM={pxPerM} pxPerMY={pxPerMY} rotate={-12} />
                <Plant cx={72} cy={31} sizeM={1.0} icon={ICONS.plum}  pxPerM={pxPerM} pxPerMY={pxPerMY} rotate={8} />
                <BirdBox cx={94} cy={6}  pxPerM={pxPerM} pxPerMY={pxPerMY} />
                <BirdBox cx={6}  cy={54} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                <CalloutCard x={50} y={3.5} text="ORCHARD" subtitle="6 fruit trees · companion guilds" />
            </div>
        </>
    );
}

// ─── BERRY PATCH ──────────────────────────────────────────────────────────────

const BERRY_ROWS = [
    { y: 14, name: 'Raspberry',  icon: ICONS.raspberry,  color: '#d870a0' },
    { y: 28, name: 'Blueberry',  icon: ICONS.blueberry,  color: '#7eb0d4' },
    { y: 42, name: 'Strawberry', icon: ICONS.strawberry, color: '#f08a70' },
];

export function BerryPatch({ faded, pxPerM, pxPerMY }) {
    return (
        <>
            <Layer opacity={faded ? 0.5 : 1}>
                <defs>
                    <pattern id="berry-grass-b" width="20" height="20" patternUnits="userSpaceOnUse">
                        <rect width="20" height="20" fill="#c4d4a0" />
                        <circle cx="3" cy="5" r="0.3" fill="#94b070" opacity="0.6" />
                        <circle cx="12" cy="9" r="0.25" fill="#94b070" opacity="0.5" />
                    </pattern>
                    <pattern id="straw-mulch-b" width="2" height="2" patternUnits="userSpaceOnUse">
                        <rect width="2" height="2" fill="#d6b070" />
                        <line x1="0" y1="0.5" x2="2" y2="0.7" stroke="#a8814a" strokeWidth="0.12" />
                    </pattern>
                </defs>
                <rect width={GW} height={GH} fill="url(#berry-grass-b)" />
                {BERRY_ROWS.map((row, i) => (
                    <g key={i}>
                        <rect x="10" y={row.y - 4} width="80" height="8" rx="0.5" fill="#7a5230" opacity="0.95" />
                        <rect x="10.4" y={row.y - 3.6} width="79.2" height="7.2" fill="url(#straw-mulch-b)" />
                        <line x1="10" y1={row.y - 4} x2="90" y2={row.y - 4} stroke="#3a230c" strokeWidth="0.3" />
                        <line x1="10" y1={row.y + 4} x2="90" y2={row.y + 4} stroke="#3a230c" strokeWidth="0.3" />
                        {row.name === 'Raspberry' && Array.from({ length: 9 }).map((_, k) => (
                            <line key={k} x1={14 + k * 9} y1={row.y - 3.5} x2={14 + k * 9} y2={row.y + 3.5} stroke="#5a3a1c" strokeWidth="0.18" />
                        ))}
                        {row.name === 'Raspberry' && [-2, 0, 2].map((off, k) => (
                            <line key={k} x1="14" y1={row.y + off} x2="86" y2={row.y + off} stroke="#888a85" strokeWidth="0.08" />
                        ))}
                    </g>
                ))}
                <g opacity="0.35">
                    {Array.from({ length: 50 }).map((_, i) => <line key={`v-${i}`} x1={10 + i * 1.6} y1="8" x2={10 + i * 1.6} y2="48" stroke="#5a5a5a" strokeWidth="0.05" />)}
                    {Array.from({ length: 27 }).map((_, i) => <line key={`h-${i}`} x1="10" y1={8 + i * 1.5} x2="90" y2={8 + i * 1.5} stroke="#5a5a5a" strokeWidth="0.05" />)}
                </g>
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1, pointerEvents: 'none' }}>
                {BERRY_ROWS.map((row, i) => {
                    const count = row.name === 'Strawberry' ? 30 : 16;
                    return Array.from({ length: count }).map((_, k) => (
                        <Plant key={`${i}-${k}`} cx={12 + k * (76 / (count - 1))} cy={row.y + (row.name === 'Strawberry' ? ((k % 2) ? 2 : -2) : 0)} sizeM={row.name === 'Strawberry' ? 1.8 : 2.5} icon={row.icon} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                    ));
                })}
                {BERRY_ROWS.map((row, i) => <Pill key={`lbl-${i}`} x={6} y={row.y} text={row.name} size={10} rotation={-90} />)}
                {[{ x: 95, y: 14, text: '~6kg/yr' }, { x: 95, y: 28, text: '~4kg/yr' }, { x: 95, y: 42, text: '~3kg/yr' }].map((t, i) => <Pill key={i} x={t.x} y={t.y} text={t.text} size={9} italic bg="#fef6e0" rotation={90} />)}
                <CalloutCard x={50} y={4} text="BERRY PATCH" subtitle="netted · straw-mulched · 3 species" />
            </div>
        </>
    );
}

// ─── BEE HIVES ────────────────────────────────────────────────────────────────

const BEE_HIVE_POSITIONS = [
    { x: 20, y: 30, color: '#d49858' }, { x: 35, y: 30, color: '#c08648' },
    { x: 50, y: 30, color: '#d49858' }, { x: 65, y: 30, color: '#b88040' },
    { x: 80, y: 30, color: '#d49858' },
];

function Langstroth({ h, pxPerM, pxPerMY }) {
    const w = 5 * pxPerM, hpx = 6 * pxPerMY;
    return (
        <div style={{ position: 'absolute', left: `calc(${(h.x / GW) * 100}% - ${w / 2}px)`, top: `calc(${(h.y / GH) * 100}% - ${hpx / 2}px)`, width: w, height: hpx, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 0, left: '-8%', right: '-8%', height: '15%', background: 'linear-gradient(180deg, #6e4520 0%, #4a2c10 100%)', borderRadius: '2px 2px 0 0', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />
            {[0, 1, 2, 3].map(k => <div key={k} style={{ position: 'absolute', top: `${15 + k * 18}%`, left: 0, right: 0, height: '17%', background: `linear-gradient(180deg, ${h.color} 0%, ${h.color}cc 100%)`, border: '1px solid #5a3a1c', boxShadow: 'inset 0 1px 0 rgba(255,240,210,0.3)' }} />)}
            <div style={{ position: 'absolute', bottom: '4%', left: '40%', width: '20%', height: '3%', background: '#1a0e04', borderRadius: 1 }} />
        </div>
    );
}

function Bee({ b, pxPerM, pxPerMY }) {
    const w = b.size * pxPerM, h = b.size * pxPerMY;
    return <div style={{ position: 'absolute', left: `calc(${(b.x / GW) * 100}% - ${w / 2}px)`, top: `calc(${(b.y / GH) * 100}% - ${h / 2}px)`, width: w, height: h, background: 'repeating-linear-gradient(90deg, #f2c43a 0 25%, #2a1a08 25% 50%)', borderRadius: '50%', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />;
}

export function BeeHives({ faded, pxPerM, pxPerMY }) {
    const flowers = useMemo(() => {
        const r = rng(42);
        const icons = [ICONS.calendula, ICONS.sunflower, ICONS.chamomile, ICONS.rose];
        const out = [];
        for (let i = 0; i < 80; i++) {
            const y = r() * GH;
            if (y > 26 && y < 36) continue;
            out.push({ x: 4 + r() * 92, y, size: 1.4 + r() * 1.2, icon: icons[Math.floor(r() * icons.length)] });
        }
        return out;
    }, []);
    const bees = useMemo(() => {
        const r = rng(7), out = [];
        for (let i = 0; i < 40; i++) out.push({ x: 4 + r() * 92, y: 4 + r() * 52, size: 0.8 + r() * 0.4 });
        return out;
    }, []);
    return (
        <>
            <Layer opacity={faded ? 0.5 : 1}>
                <defs>
                    <pattern id="meadow-b" width="30" height="30" patternUnits="userSpaceOnUse">
                        <rect width="30" height="30" fill="#d7e5b3" />
                        <circle cx="5" cy="8" r="0.4" fill="#b4c887" opacity="0.6" />
                        <circle cx="20" cy="15" r="0.3" fill="#b4c887" opacity="0.6" />
                    </pattern>
                </defs>
                <rect width={GW} height={GH} fill="url(#meadow-b)" />
                <rect x="6" y="33.5" width="88" height="3" fill="#b48650" opacity="0.7" />
                <g opacity={faded ? 0.25 : 0.4} fill="none" stroke="#7a5a18" strokeWidth="0.1" strokeDasharray="0.3 0.4">
                    <path d="M 20 30 Q 12 18 8 10" /><path d="M 35 30 Q 32 18 28 9" /><path d="M 50 30 Q 56 18 60 12" />
                    <path d="M 65 30 Q 70 20 75 10" /><path d="M 80 30 Q 85 18 90 8" />
                    <path d="M 20 30 Q 14 44 10 52" /><path d="M 50 30 Q 50 44 50 52" />
                </g>
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1, pointerEvents: 'none' }}>
                {flowers.map((f, i) => <Plant key={i} cx={f.x} cy={f.y} sizeM={f.size} icon={f.icon} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                {BEE_HIVE_POSITIONS.map((h, i) => <Langstroth key={i} h={h} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                {BEE_HIVE_POSITIONS.map((h, i) => <Pill key={`tag-${i}`} x={h.x} y={h.y + 5} text={`#${i + 1}`} size={9} bg="#fef6e0" />)}
                {bees.map((b, i) => <Bee key={i} b={b} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                <CalloutCard x={50} y={6} text="APIARY" subtitle="5 hives · pollinator meadow" />
            </div>
        </>
    );
}

// ─── CHICKEN COOP ─────────────────────────────────────────────────────────────

function CoopBuilding({ coop, pxPerM, pxPerMY }) {
    const w = coop.w * pxPerM, h = coop.h * pxPerMY;
    return (
        <div style={{ position: 'absolute', left: `${(coop.x / GW) * 100}%`, top: `${(coop.y / GH) * 100}%`, width: w, height: h, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '-12%', left: '-8%', right: '-8%', height: '36%', background: 'linear-gradient(180deg, #7a4a20 0%, #5a3a18 100%)', clipPath: 'polygon(0 100%, 50% 0, 100% 100%)', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
            <div style={{ position: 'absolute', top: '20%', left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, #c79866 0%, #b88350 50%, #c79866 100%)', border: '1.5px solid #5a3a18', borderRadius: 2, boxShadow: '0 2px 5px rgba(40,20,5,0.35)' }}>
                <div style={{ position: 'absolute', top: '18%', left: '15%', width: '25%', height: '28%', background: '#3a5070', border: '1.5px solid #4a2c10' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1.5px', background: '#4a2c10' }} />
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1.5px', background: '#4a2c10' }} />
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: '15%', width: '32%', height: '60%', background: 'linear-gradient(180deg, #6e4220 0%, #4a2c10 100%)', border: '1.5px solid #2a1808', borderRadius: '4px 4px 0 0' }}>
                    <div style={{ position: 'absolute', top: '40%', right: '15%', width: 3, height: 3, borderRadius: '50%', background: '#e8c08a' }} />
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: '12%', width: '15%', height: '22%', background: '#1a0e04', borderRadius: '50% 50% 0 0', border: '1.5px solid #2a1808' }} />
            </div>
        </div>
    );
}

function Chicken({ c, pxPerM, pxPerMY }) {
    const w = 1.8 * pxPerM, h = 1.4 * pxPerMY;
    const colors = { brown: { body: '#9c5a2a', wing: '#7a4220', comb: '#c0282c' }, white: { body: '#f0ebde', wing: '#d4cdb8', comb: '#c0282c' }, speckled: { body: '#5a4a3a', wing: '#3a2c1c', comb: '#c0282c' } }[c.kind];
    return (
        <div style={{ position: 'absolute', left: `calc(${(c.x / GW) * 100}% - ${w / 2}px)`, top: `calc(${(c.y / GH) * 100}% - ${h / 2}px)`, width: w, height: h, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 35%, ${colors.body} 0%, ${colors.wing} 80%)`, borderRadius: '60% 50% 50% 50%', boxShadow: '0 1px 2px rgba(0,0,0,0.35)' }} />
            <div style={{ position: 'absolute', top: '-15%', left: '60%', width: '35%', height: '50%', background: colors.body, borderRadius: '50%' }}>
                <div style={{ position: 'absolute', top: '-30%', left: '20%', width: '70%', height: '50%', background: colors.comb, borderRadius: '60% 60% 0 0' }} />
                <div style={{ position: 'absolute', top: '55%', right: '-20%', width: '30%', height: '20%', background: '#e8a440', clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
                <div style={{ position: 'absolute', top: '40%', right: '20%', width: 1.5, height: 1.5, borderRadius: '50%', background: '#1a0e04' }} />
            </div>
        </div>
    );
}

export function ChickenCoop({ faded, pxPerM, pxPerMY }) {
    const coop = { x: 14, y: 18, w: 24, h: 22 };
    const run = { x: 40, y: 14, w: 50, h: 32 };
    const chickens = useMemo(() => {
        const r = rng(99), out = [];
        for (let i = 0; i < 2; i++) out.push({ x: coop.x + 5 + r() * (coop.w - 10), y: coop.y + 5 + r() * (coop.h - 10), kind: r() > 0.5 ? 'brown' : 'white' });
        for (let i = 0; i < 9; i++) out.push({ x: run.x + 3 + r() * (run.w - 6), y: run.y + 3 + r() * (run.h - 6), kind: ['brown', 'white', 'speckled'][Math.floor(r() * 3)] });
        return out;
    }, []);
    return (
        <>
            <Layer opacity={faded ? 0.5 : 1}>
                <defs>
                    <pattern id="dirt-yard-c" width="20" height="20" patternUnits="userSpaceOnUse">
                        <rect width="20" height="20" fill="#c9a468" />
                        <circle cx="4" cy="5" r="0.4" fill="#8a6840" opacity="0.6" />
                        <circle cx="9" cy="12" r="0.5" fill="#8a6840" opacity="0.55" />
                    </pattern>
                    <pattern id="grass-bg-c" width="20" height="20" patternUnits="userSpaceOnUse">
                        <rect width="20" height="20" fill="#bcd089" />
                        <circle cx="5" cy="5" r="0.4" fill="#94b06a" opacity="0.5" />
                    </pattern>
                </defs>
                <rect width={GW} height={GH} fill="url(#grass-bg-c)" />
                <rect x={run.x} y={run.y} width={run.w} height={run.h} fill="url(#dirt-yard-c)" rx="0.5" />
                {[{ x: 50, y: 22 }, { x: 65, y: 32 }, { x: 78, y: 22 }, { x: 55, y: 40 }].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#a87a40" opacity="0.5" />)}
                <g opacity="0.45">
                    {Array.from({ length: 25 }).map((_, i) => Array.from({ length: 16 }).map((_, j) => {
                        const x = run.x + i * 2, y = run.y + j * 2, offset = j % 2 ? 1 : 0;
                        return <polygon key={`${i}-${j}`} points={`${x + offset},${y} ${x + 1 + offset},${y + 0.5} ${x + 1 + offset},${y + 1.5} ${x + offset},${y + 2} ${x - 1 + offset},${y + 1.5} ${x - 1 + offset},${y + 0.5}`} fill="none" stroke="#888" strokeWidth="0.07" />;
                    }))}
                </g>
                <circle cx="50" cy="34" r="1.5" fill="#b87040" stroke="#5a3a18" strokeWidth="0.2" />
                <circle cx="58" cy="36" r="1.5" fill="#5a8db8" stroke="#3a5a78" strokeWidth="0.2" />
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1, pointerEvents: 'none' }}>
                <CoopBuilding coop={coop} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                {chickens.map((c, i) => <Chicken key={i} c={c} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                <Pill x={coop.x + coop.w / 2} y={coop.y - 2} text="Henhouse" size={10} />
                <Pill x={run.x + run.w / 2} y={run.y - 2} text="Outdoor Run" size={10} />
                <CalloutCard x={50} y={6} text="POULTRY" subtitle="raised coop · predator-safe run" />
            </div>
        </>
    );
}

// ─── COMPOST ──────────────────────────────────────────────────────────────────

function CompostBin({ bin, pxPerM, pxPerMY }) {
    const w = 24 * pxPerM, h = 24 * pxPerMY;
    return (
        <div style={{ position: 'absolute', left: `${(bin.x / GW) * 100}%`, top: `${(22 / GH) * 100}%`, width: w, height: h, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, #6e4520 0 18%, transparent 18% 22%)' }} />
            {[0, 1].map(i => <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i ? 'auto' : 0, right: i ? 0 : 'auto', width: '6%', background: 'linear-gradient(180deg, #4a2c10 0%, #6e4520 100%)' }} />)}
            <div style={{ position: 'absolute', left: '6%', right: '6%', bottom: 0, height: `${bin.pile * 100}%`, background: `radial-gradient(ellipse at 50% 30%, ${bin.fill}ee 0%, ${bin.fill} 70%)`, borderRadius: '40% 40% 0 0 / 20% 20% 0 0', boxShadow: 'inset 0 -4px 6px rgba(0,0,0,0.4)' }}>
                {Array.from({ length: 12 }).map((_, i) => { const r = rng(bin.x * 31 + i); return <span key={i} style={{ position: 'absolute', left: `${r() * 90 + 5}%`, top: `${r() * 80 + 10}%`, width: 4, height: 3, borderRadius: '50%', background: r() > 0.5 ? 'rgba(255,240,200,0.4)' : 'rgba(40,20,5,0.5)' }} />; })}
            </div>
            <div style={{ position: 'absolute', top: '-12%', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(180deg, #e3c08a 0%, #c19655 100%)', border: '1.5px solid #5e3d1c', padding: '2px 10px', borderRadius: 3, fontSize: 11, fontWeight: 700, color: '#3a2510', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', boxShadow: '0 2px 4px rgba(0,0,0,0.35)' }}>{bin.label}</div>
            <div style={{ position: 'absolute', bottom: '-12%', left: '50%', transform: 'translateX(-50%)', fontSize: 9.5, color: '#3a2810', fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', whiteSpace: 'nowrap', textShadow: '0 0 4px rgba(247,236,208,0.95)' }}>{bin.contents}</div>
        </div>
    );
}

export function Compost({ faded, pxPerM, pxPerMY }) {
    const bins = [
        { x: 14, label: 'Fresh',    fill: '#7a8d3a', pile: 0.85, contents: 'kitchen scraps · green' },
        { x: 42, label: 'Cooking',  fill: '#6a5028', pile: 0.65, contents: 'turning · hot stage' },
        { x: 70, label: 'Finished', fill: '#3a2810', pile: 0.45, contents: 'crumbly · ready to use' },
    ];
    return (
        <>
            <Layer opacity={faded ? 0.5 : 1}>
                <defs>
                    <pattern id="dirt-comp-c" width="20" height="20" patternUnits="userSpaceOnUse">
                        <rect width="20" height="20" fill="#b8a070" />
                        <circle cx="4" cy="6" r="0.4" fill="#8a7048" opacity="0.5" />
                    </pattern>
                </defs>
                <rect width={GW} height={GH} fill="url(#dirt-comp-c)" />
                <rect x="8" y="22" width="84" height="28" fill="#aaa49a" opacity="0.55" stroke="#7a7568" strokeWidth="0.25" />
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1, pointerEvents: 'none' }}>
                {bins.map((bin, i) => <CompostBin key={i} bin={bin} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                <CalloutCard x={50} y={5} text="COMPOST YARD" subtitle="3-bin rotation · kitchen + garden scraps" />
                <Pill x={50} y={56} text="produces ~2m³ finished compost/yr" size={9} italic bg="#fef6e0" />
            </div>
        </>
    );
}

// ─── GREENHOUSE ───────────────────────────────────────────────────────────────

function PlantingTable({ x, y, w, h, icon, count, pxPerM, pxPerMY }) {
    return (
        <>
            <div style={{ position: 'absolute', left: `${(x / GW) * 100}%`, top: `${(y / GH) * 100}%`, width: w * pxPerM, height: h * pxPerMY, background: 'linear-gradient(180deg, #a87a44 0%, #7a5028 100%)', border: '1.5px solid #3a2510', borderRadius: 2, boxShadow: '0 3px 6px rgba(0,0,0,0.35)', pointerEvents: 'none' }} />
            {Array.from({ length: count }).map((_, k) => {
                const cx = x + 2 + k * ((w - 4) / (count - 1)), cy = y + h / 2;
                return (
                    <div key={k}>
                        <div style={{ position: 'absolute', left: `calc(${(cx / GW) * 100}% - ${1.8 * pxPerM}px)`, top: `calc(${(cy / GH) * 100}% - ${1.8 * pxPerMY}px)`, width: 3.6 * pxPerM, height: 3.6 * pxPerMY, background: 'radial-gradient(circle at 30% 30%, #d68a58, #a85a30 80%)', borderRadius: '50%', boxShadow: '0 1.5px 3px rgba(0,0,0,0.4)', pointerEvents: 'none' }} />
                        <Plant cx={cx} cy={cy} sizeM={2.4} icon={icon} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                    </div>
                );
            })}
        </>
    );
}

function HangingBasket({ x, y, pxPerM, pxPerMY }) {
    return (
        <div style={{ position: 'absolute', left: `calc(${(x / GW) * 100}% - ${2 * pxPerM}px)`, top: `calc(${(y / GH) * 100}% - ${1 * pxPerMY}px)`, width: 4 * pxPerM, height: 4 * pxPerMY, pointerEvents: 'none' }}>
            <div style={{ width: '40%', margin: '0 auto', height: '20%', background: 'linear-gradient(180deg, #5a3a18, #3a2510)', borderRadius: '50% 50% 0 0' }} />
            <div style={{ width: '90%', margin: '0 auto', height: '60%', background: 'radial-gradient(circle at 40% 30%, #88b066, #4a7028)', borderRadius: '0 0 60% 60%', border: '0.5px solid rgba(40,60,20,0.5)' }} />
        </div>
    );
}

export function Greenhouse({ faded, pxPerM, pxPerMY }) {
    return (
        <>
            <Layer opacity={faded ? 0.5 : 1}>
                <defs>
                    <pattern id="gravel-g" width="6" height="6" patternUnits="userSpaceOnUse">
                        <rect width="6" height="6" fill="#b8ab94" />
                        <circle cx="1.2" cy="2" r="0.35" fill="#8a7c64" opacity="0.6" />
                        <circle cx="4" cy="4.5" r="0.3" fill="#8a7c64" opacity="0.55" />
                    </pattern>
                </defs>
                <rect width={GW} height={GH} fill="#d5e3a8" />
                <rect x="12" y="10" width="76" height="40" fill="url(#gravel-g)" stroke="#3a2810" strokeWidth="0.5" />
                <rect x="12" y="28" width="76" height="4" fill="#9c8a6a" opacity="0.7" />
                <g opacity="0.35">
                    {Array.from({ length: 9 }).map((_, i) => <line key={`v-${i}`} x1={12 + i * 9.5} y1="10" x2={12 + i * 9.5} y2="50" stroke="#5a7a8a" strokeWidth="0.2" />)}
                    {Array.from({ length: 5 }).map((_, i) => <line key={`h-${i}`} x1="12" y1={10 + i * 10} x2="88" y2={10 + i * 10} stroke="#5a7a8a" strokeWidth="0.2" />)}
                    <rect x="12" y="10" width="76" height="40" fill="rgba(180,210,225,0.35)" stroke="#3a4858" strokeWidth="0.4" />
                </g>
                <g opacity="0.18">
                    <polygon points="20,10 28,10 38,50 30,50" fill="#fae07a" />
                    <polygon points="60,10 68,10 78,50 70,50" fill="#fae07a" />
                </g>
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1, pointerEvents: 'none' }}>
                <PlantingTable x={14} y={15} w={72} h={10} icon={ICONS.strawberry} count={18} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                <PlantingTable x={14} y={35} w={72} h={10} icon={ICONS.calendula}  count={18} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                {[22, 36, 50, 64, 78].map((x, i) => <HangingBasket key={i} x={x} y={11} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                <Pill x={14} y={20} text="Seed Tray" size={9} italic bg="#fef6e0" />
                <Pill x={14} y={40} text="Flowers"   size={9} italic bg="#fef6e0" />
                <CalloutCard x={50} y={5} text="GREENHOUSE" subtitle="76 m² · year-round growing" />
            </div>
        </>
    );
}

// ─── PASTURE ──────────────────────────────────────────────────────────────────

function Sheep({ s, pxPerM, pxPerMY }) {
    const w = 2.8 * pxPerM, h = 2 * pxPerMY;
    const body = s.kind === 'black' ? '#2a2520' : '#f4ede0';
    const head = s.kind === 'black' ? '#1a1510' : '#3a2820';
    return (
        <div style={{ position: 'absolute', left: `calc(${(s.x / GW) * 100}% - ${w / 2}px)`, top: `calc(${(s.y / GH) * 100}% - ${h / 2}px)`, width: w, height: h, transform: `rotate(${s.rotate}deg)`, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '60% 70% 60% 70%', backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.5) 8%, transparent 12%), radial-gradient(circle at 55% 30%, rgba(255,255,255,0.4) 8%, transparent 12%), radial-gradient(circle at 50% 50%, ${body} 0%, ${body} 100%)`, boxShadow: '0 1.5px 3px rgba(0,0,0,0.3)', border: '0.5px solid rgba(40,25,10,0.4)' }} />
            <div style={{ position: 'absolute', top: '20%', left: '-20%', width: '32%', height: '60%', background: head, borderRadius: '50% 40% 40% 50%' }} />
        </div>
    );
}

export function Pasture({ faded, pxPerM, pxPerMY }) {
    const sheep = useMemo(() => {
        const r = rng(31), out = [];
        for (let i = 0; i < 14; i++) out.push({ x: 12 + r() * 76, y: 12 + r() * 36, rotate: r() * 60 - 30, kind: r() > 0.85 ? 'black' : 'white' });
        return out;
    }, []);
    return (
        <>
            <Layer opacity={faded ? 0.55 : 1}>
                <defs>
                    <radialGradient id="pasture-grad-p" cx="0.5" cy="0.5" r="0.6">
                        <stop offset="0" stopColor="#c8de9a" />
                        <stop offset="1" stopColor="#a8c478" />
                    </radialGradient>
                </defs>
                <rect width={GW} height={GH} fill="url(#pasture-grad-p)" />
                <path d="M 8 30 Q 30 28 50 32 Q 70 36 92 30" stroke="#a8884a" strokeWidth="1.6" fill="none" opacity="0.45" strokeLinecap="round" />
                <rect x="65" y="48" width="14" height="3.5" fill="#5a8db8" stroke="#2a3a48" strokeWidth="0.3" rx="0.5" />
                {Array.from({ length: 24 }).map((_, i) => <rect key={`tp-${i}`} x={6 + i * 4 - 0.4} y="6" width="0.8" height="3" fill="#6e4520" />)}
                {Array.from({ length: 24 }).map((_, i) => <rect key={`bp-${i}`} x={6 + i * 4 - 0.4} y="53" width="0.8" height="3" fill="#6e4520" />)}
                <line x1="6" y1="7.5" x2="98" y2="7.5" stroke="#7a5028" strokeWidth="0.4" />
                <line x1="6" y1="54.5" x2="98" y2="54.5" stroke="#7a5028" strokeWidth="0.4" />
                <line x1="3.4" y1="12" x2="3.4" y2="52" stroke="#7a5028" strokeWidth="0.4" />
                <line x1="96.4" y1="12" x2="96.4" y2="52" stroke="#7a5028" strokeWidth="0.4" />
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1, pointerEvents: 'none' }}>
                <Canopy cx={20} cy={42} rM={5} pxPerM={pxPerM} pxPerMY={pxPerMY} tone="dark" />
                <Canopy cx={86} cy={18} rM={4} pxPerM={pxPerM} pxPerMY={pxPerMY} tone="dark" />
                {sheep.map((s, i) => <Sheep key={i} s={s} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                <CalloutCard x={50} y={4} text="PASTURE" subtitle="14 sheep · rotational grazing" />
                <Pill x={72} y={52} text="Trough"    size={9} italic bg="#fef6e0" />
                <Pill x={20} y={48} text="Shade Oak" size={9} italic bg="#fef6e0" />
            </div>
        </>
    );
}

// ─── GRAIN ────────────────────────────────────────────────────────────────────

function Sheaf({ cx, cy }) {
    return (
        <g transform={`translate(${cx} ${cy})`}>
            {Array.from({ length: 12 }).map((_, i) => {
                const a = (i - 6) * 0.12;
                return (
                    <g key={i} transform={`rotate(${a * 30})`}>
                        <line x1="0" y1="0" x2="0" y2="-3" stroke="#c89848" strokeWidth="0.2" strokeLinecap="round" />
                        <ellipse cx="0" cy="-3.2" rx="0.3" ry="0.6" fill="#f0d680" stroke="#a87838" strokeWidth="0.05" />
                    </g>
                );
            })}
            <ellipse cx="0" cy="-0.5" rx="1.2" ry="0.4" fill="none" stroke="#7a4a20" strokeWidth="0.2" />
        </g>
    );
}

function Scarecrow({ x, y, pxPerM, pxPerMY }) {
    const w = 3.5 * pxPerM, h = 6 * pxPerMY;
    return (
        <div style={{ position: 'absolute', left: `calc(${(x / GW) * 100}% - ${w / 2}px)`, top: `calc(${(y / GH) * 100}% - ${h / 2}px)`, width: w, height: h, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '50%', top: '15%', width: 2, height: '85%', marginLeft: -1, background: 'linear-gradient(90deg, #5a3a18, #7a5028, #5a3a18)' }} />
            <div style={{ position: 'absolute', top: '32%', left: '5%', right: '5%', height: 2, background: 'linear-gradient(180deg, #7a5028, #5a3a18)' }} />
            <div style={{ position: 'absolute', top: 0, left: '50%', width: '50%', height: '25%', marginLeft: '-25%', background: 'radial-gradient(circle at 35% 35%, #d4a868, #a8784a)', borderRadius: '40%', border: '1px solid #5a3a18' }}>
                <div style={{ position: 'absolute', top: '40%', left: '25%', width: 2, height: 2, background: '#1a0e04', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', top: '40%', right: '25%', width: 2, height: 2, background: '#1a0e04', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', top: '65%', left: '30%', right: '30%', height: 1, borderTop: '1.5px dashed #1a0e04' }} />
            </div>
            <div style={{ position: 'absolute', top: '-2%', left: '20%', right: '20%', height: '10%', background: 'linear-gradient(180deg, #6e4520, #4a2c10)', borderRadius: '50% 50% 5% 5% / 90% 90% 5% 5%' }} />
            <div style={{ position: 'absolute', top: '30%', left: '15%', right: '15%', height: '40%', background: 'linear-gradient(180deg, #b85e3e, #8a4628)', border: '1px solid #5a2c18', borderRadius: '20% 20% 50% 50%' }} />
        </div>
    );
}

export function Grain({ faded, pxPerM, pxPerMY }) {
    return (
        <>
            <Layer opacity={faded ? 0.55 : 1}>
                <defs>
                    <pattern id="wheat-rows-g" width="100" height="4" patternUnits="userSpaceOnUse">
                        <rect width="100" height="4" fill="#e4be5e" />
                        <rect y="1.8" width="100" height="0.3" fill="#a87838" />
                    </pattern>
                </defs>
                <rect width={GW} height={GH} fill="#d4a850" />
                <rect width={GW} height={GH} fill="url(#wheat-rows-g)" />
                <g opacity="0.85">
                    {Array.from({ length: 360 }).map((_, i) => { const r = rng(i); const x = 4 + r() * 92, y = 4 + r() * 52; return <line key={i} x1={x} y1={y} x2={x + (r() - 0.5) * 0.4} y2={y - 1.4 - r() * 0.6} stroke="#a87838" strokeWidth="0.1" strokeLinecap="round" />; })}
                    {Array.from({ length: 360 }).map((_, i) => { const r = rng(i + 500); const x = 4 + r() * 92, y = 4 + r() * 52; return <ellipse key={i} cx={x + (r() - 0.5) * 0.4} cy={y - 1.6} rx="0.25" ry="0.5" fill="#f0d680" stroke="#a87838" strokeWidth="0.04" />; })}
                </g>
                <rect x="0" y="29" width="100" height="2" fill="#a08050" opacity="0.7" />
                <Sheaf cx={10} cy={50} />
                <Sheaf cx={88} cy={50} />
                <Sheaf cx={10} cy={10} />
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1, pointerEvents: 'none' }}>
                <Scarecrow x={50} y={20} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                <Scarecrow x={50} y={42} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                <CalloutCard x={50} y={5} text="GRAIN PLOT" subtitle="winter wheat · 600 m²" />
                <Pill x={50} y={30} text="threshing path" size={9} italic bg="#fef6e0" />
            </div>
        </>
    );
}

// ─── HOUSE ────────────────────────────────────────────────────────────────────

function Furn({ x, y, w, h }) {
    return <div style={{ position: 'absolute', left: `${(x / GW) * 100}%`, top: `${(y / GH) * 100}%`, width: `${(w / GW) * 100}%`, height: `${(h / GH) * 100}%`, background: 'rgba(110,75,30,0.45)', border: '1px solid rgba(60,40,15,0.6)', borderRadius: 1, pointerEvents: 'none' }} />;
}

export function House({ faded, pxPerM, pxPerMY }) {
    return (
        <>
            <Layer opacity={faded ? 0.5 : 1}>
                <defs>
                    <pattern id="lawn-h" width="20" height="20" patternUnits="userSpaceOnUse">
                        <rect width="20" height="20" fill="#bcd089" />
                        <circle cx="5" cy="6" r="0.3" fill="#94b06a" opacity="0.55" />
                    </pattern>
                    <pattern id="floor-h" width="6" height="6" patternUnits="userSpaceOnUse">
                        <rect width="6" height="6" fill="#dac0a0" />
                        <rect width="6" height="0.3" fill="#a8845a" />
                        <rect width="0.3" height="6" fill="#a8845a" />
                    </pattern>
                </defs>
                <rect width={GW} height={GH} fill="url(#lawn-h)" />
                <rect x="20" y="14" width="60" height="34" fill="url(#floor-h)" stroke="#3a2510" strokeWidth="0.6" />
                <line x1="50" y1="14" x2="50" y2="34" stroke="#3a2510" strokeWidth="0.4" />
                <line x1="20" y1="34" x2="80" y2="34" stroke="#3a2510" strokeWidth="0.4" />
                <line x1="65" y1="34" x2="65" y2="48" stroke="#3a2510" strokeWidth="0.4" />
                <rect x="18" y="12" width="64" height="38" fill="none" stroke="#3a2510" strokeWidth="0.3" strokeDasharray="0.5 0.4" />
                <rect x="34" y="48" width="20" height="6" fill="#a8835a" stroke="#3a2510" strokeWidth="0.4" />
                <rect x="20" y="48" width="14" height="6" fill="#5a3a1c" stroke="#3a2510" strokeWidth="0.3" />
                <rect x="54" y="48" width="26" height="6" fill="#5a3a1c" stroke="#3a2510" strokeWidth="0.3" />
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1, pointerEvents: 'none' }}>
                <Pill x={35} y={24} text="Kitchen" size={11} italic bg="#fef6e0" />
                <Pill x={65} y={24} text="Living"  size={11} italic bg="#fef6e0" />
                <Pill x={35} y={41} text="Bedroom" size={11} italic bg="#fef6e0" />
                <Pill x={57} y={41} text="Bath"    size={10} italic bg="#fef6e0" />
                <Pill x={72} y={41} text="Office"  size={11} italic bg="#fef6e0" />
                <Furn x={28} y={20} w={6} h={3} /><Furn x={42} y={20} w={5} h={2} />
                <Furn x={56} y={20} w={12} h={5} /><Furn x={56} y={28} w={5} h={3} />
                <Furn x={26} y={42} w={10} h={5} /><Furn x={70} y={42} w={6} h={3} />
                {[22, 26, 30].map((x, i) => <Plant key={i} cx={x} cy={51} sizeM={2.5} icon={ICONS.calendula} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                {[58, 62, 66, 70, 74, 78].map((x, i) => <Plant key={i} cx={x} cy={51} sizeM={2.5} icon={[ICONS.rose, ICONS.sunflower, ICONS.chamomile][i % 3]} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                <CalloutCard x={50} y={4} text="HOUSE" subtitle="3 rooms · porch · front beds" />
            </div>
        </>
    );
}

// ─── PATIO ────────────────────────────────────────────────────────────────────

function RoundTable({ cx, cy, rM, pxPerM, pxPerMY }) {
    const w = rM * 2 * pxPerM, h = rM * 2 * pxPerMY;
    return (
        <div style={{ position: 'absolute', left: `calc(${(cx / GW) * 100}% - ${w / 2}px)`, top: `calc(${(cy / GH) * 100}% - ${h / 2}px)`, width: w, height: h, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #c79866, #8a5430 70%)', border: '2px solid #3a2510', boxShadow: '0 4px 10px rgba(0,0,0,0.35)', pointerEvents: 'none' }}>
            {[0, 90, 180, 270].map((a, i) => { const rad = (a * Math.PI) / 180; return <div key={i} style={{ position: 'absolute', left: `calc(50% + ${Math.cos(rad) * 40}% - 6px)`, top: `calc(50% + ${Math.sin(rad) * 40}% - 6px)`, width: 12, height: 12, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #fff, #d8d0c0)' }} />; })}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '16%', height: '16%', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #7a8a3a, #4a5a18)' }} />
        </div>
    );
}

function Chair({ cx, cy, rotate, pxPerM, pxPerMY }) {
    const w = 3 * pxPerM, h = 3 * pxPerMY;
    return (
        <div style={{ position: 'absolute', left: `calc(${(cx / GW) * 100}% - ${w / 2}px)`, top: `calc(${(cy / GH) * 100}% - ${h / 2}px)`, width: w, height: h, transform: `rotate(${rotate}deg)`, pointerEvents: 'none' }}>
            <div style={{ width: '100%', height: '70%', background: 'linear-gradient(180deg, #6e4520 0%, #4a2c10 100%)', border: '1.5px solid #2a1808', borderRadius: 2 }} />
            <div style={{ width: '100%', height: '30%', background: 'linear-gradient(180deg, #8a5028 0%, #5a3018 100%)', border: '1.5px solid #2a1808', borderRadius: '4px 4px 1px 1px', marginTop: -2 }} />
        </div>
    );
}

function Planter({ cx, cy, icon, pxPerM, pxPerMY }) {
    const w = 4 * pxPerM, h = 4 * pxPerMY;
    return (
        <div style={{ position: 'absolute', left: `calc(${(cx / GW) * 100}% - ${w / 2}px)`, top: `calc(${(cy / GH) * 100}% - ${h / 2}px)`, width: w, height: h, pointerEvents: 'none' }}>
            <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 30% 30%, #d68a58, #a85a30 80%)', border: '1.5px solid #6a3a18', borderRadius: 4 }} />
            <img src={icon} alt="" draggable={false} style={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: '120%', height: '80%', objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
        </div>
    );
}

function Lantern({ cx, cy, pxPerM, pxPerMY }) {
    const w = 2 * pxPerM, h = 3 * pxPerMY;
    return (
        <div style={{ position: 'absolute', left: `calc(${(cx / GW) * 100}% - ${w / 2}px)`, top: `calc(${(cy / GH) * 100}% - ${h / 2}px)`, width: w, height: h, pointerEvents: 'none' }}>
            <div style={{ width: 1.5, height: '60%', margin: '0 auto', background: '#3a2510' }} />
            <div style={{ width: '100%', height: '40%', background: 'radial-gradient(circle at 50% 30%, #fae07a, #c08828)', borderRadius: '50% 50% 30% 30%', border: '1px solid #5a3a18', boxShadow: '0 0 12px rgba(250,224,122,0.7)' }} />
        </div>
    );
}

export function Patio({ faded, pxPerM, pxPerMY }) {
    const stones = useMemo(() => {
        const out = [], r = rng(11);
        for (let row = 0; row < 5; row++)
            for (let col = 0; col < 8; col++)
                out.push({ cx: 15 + col * 9 + (r() - 0.5) * 1.5, cy: 16 + row * 7 + (r() - 0.5) * 1, w: 7.5 + (r() - 0.5) * 1, h: 5.5 + (r() - 0.5) * 0.7, shade: 195 + Math.floor(r() * 25), rot: (r() - 0.5) * 5 });
        return out;
    }, []);
    return (
        <>
            <Layer opacity={faded ? 0.5 : 1}>
                <defs>
                    <pattern id="patio-grass-p" width="20" height="20" patternUnits="userSpaceOnUse">
                        <rect width="20" height="20" fill="#bcd089" />
                        <circle cx="5" cy="5" r="0.3" fill="#94b06a" opacity="0.5" />
                    </pattern>
                </defs>
                <rect width={GW} height={GH} fill="url(#patio-grass-p)" />
                {stones.map((s, i) => (
                    <g key={i} transform={`translate(${s.cx} ${s.cy}) rotate(${s.rot})`}>
                        <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} rx="0.4" fill={`rgb(${s.shade}, ${s.shade - 5}, ${s.shade - 12})`} stroke="#6a6258" strokeWidth="0.2" />
                        <line x1={-s.w / 2} y1={-s.h / 2} x2={s.w / 2} y2={-s.h / 2} stroke="#7c9560" strokeWidth="0.15" opacity="0.5" />
                    </g>
                ))}
            </Layer>
            <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1, pointerEvents: 'none' }}>
                <RoundTable cx={50} cy={32} rM={6} pxPerM={pxPerM} pxPerMY={pxPerMY} />
                {[0, 90, 180, 270].map((a, i) => { const rad = (a * Math.PI) / 180; return <Chair key={i} cx={50 + Math.cos(rad) * 9.5} cy={32 + Math.sin(rad) * 9.5} rotate={a + 90} pxPerM={pxPerM} pxPerMY={pxPerMY} />; })}
                {[{ cx: 18, cy: 14, icon: ICONS.rose }, { cx: 82, cy: 14, icon: ICONS.sunflower }, { cx: 18, cy: 50, icon: ICONS.calendula }, { cx: 82, cy: 50, icon: ICONS.chamomile }].map((p, i) => <Planter key={i} cx={p.cx} cy={p.cy} icon={p.icon} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                {[28, 72].map((x, i) => <Lantern key={i} cx={x} cy={50} pxPerM={pxPerM} pxPerMY={pxPerMY} />)}
                <CalloutCard x={50} y={5} text="PATIO" subtitle="dining for 4 · flagstone" />
                <Pill x={50} y={56} text="overhead string lights" size={9} italic bg="#fef6e0" />
            </div>
        </>
    );
}
