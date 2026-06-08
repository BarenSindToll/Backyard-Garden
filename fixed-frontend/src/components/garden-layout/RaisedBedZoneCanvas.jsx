import { useState, useRef, useEffect, useCallback } from 'react';
import { apiUrl } from '../../utils/api';
import { RULER_SIZE, HorizontalRuler, VerticalRuler, mapCanvasBg } from './MapComponents';

const PX_PER_M = 80;

function genId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function resolveIcon(iconData) {
    if (!iconData) return null;
    if (iconData.startsWith('data:')) return iconData;
    return `data:image/svg+xml;base64,${iconData}`;
}

// ── Plant lookup helpers ───────────────────────────────────────────────────────
const PLANT_ALIASES = {
    tomatoes: 'Tomato',     tomato: 'Tomato',
    cucumbers: 'Cucumber',  cucumber: 'Cucumber',  cukes: 'Cucumber',
    basil: 'Basil',
    marigolds: 'Marigold',  marigold: 'Marigold',
    nasturtiums: 'Nasturtium', nasturtium: 'Nasturtium',
    calendulas: 'Calendula', calendula: 'Calendula',
    dill: 'Dill',
    lettuces: 'Lettuce',    lettuce: 'Lettuce',     salad: 'Lettuce',
    carrots: 'Carrot',      carrot: 'Carrot',
    onions: 'Onion',        onion: 'Onion',         'spring onion': 'Onion',
    garlic: 'Garlic',
    parsleyplant: 'Parsley', parsley: 'Parsley',
    chives: 'Chives',       chive: 'Chives',
    beans: 'Bean',          bean: 'Bean',           'green bean': 'Bean',
    peas: 'Pea',            pea: 'Pea',             'snow pea': 'Pea',
    radishes: 'Radish',     radish: 'Radish',
    spinach: 'Spinach',
    peppers: 'Pepper',      pepper: 'Pepper',       'bell pepper': 'Pepper',
    potatoes: 'Potato',     potato: 'Potato',
    zucchini: 'Zucchini',   courgette: 'Zucchini',
    cabbages: 'Cabbage',    cabbage: 'Cabbage',
    broccoli: 'Broccoli',
    celery: 'Celery',
    thyme: 'Thyme',
    sage: 'Sage',
    rosemary: 'Rosemary',
    mint: 'Mint',
    oregano: 'Oregano',
    borage: 'Borage',
    chamomile: 'Chamomile',
    leeks: 'Leek',          leek: 'Leek',
    fennel: 'Fennel',
    tarragon: 'Tarragon',
};

function normalizePlantName(name = '') {
    return name.toLowerCase().trim().replace(/s$/, '').replace(/[^a-z0-9]/g, '');
}

function lookupPlantByName(name, plantList = []) {
    if (!name || !plantList.length) return null;
    const lower = name.toLowerCase().trim();
    // 1. Alias map
    const aliasTarget = PLANT_ALIASES[lower];
    if (aliasTarget) {
        const found = plantList.find(p => p.name === aliasTarget);
        if (found) return found;
    }
    // 2. Exact match (case-insensitive)
    const exact = plantList.find(p => p.name.toLowerCase() === lower);
    if (exact) return exact;
    // 3. Normalised (strip trailing s, punctuation)
    const norm = normalizePlantName(name);
    const normalised = plantList.find(p => normalizePlantName(p.name) === norm);
    if (normalised) return normalised;
    // 4. Partial: input starts with plant name or vice-versa
    return plantList.find(p => {
        const pn = p.name.toLowerCase();
        return pn.startsWith(lower) || lower.startsWith(pn);
    }) ?? null;
}

// Small icon chip used in suggestion cards
function PlantChip({ name, plantList = [], role = 'companion' }) {
    const plantData = lookupPlantByName(name, plantList);
    const src       = resolveIcon(plantData?.iconData);
    const isMain    = role === 'main';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: isMain ? 'rgba(80,180,60,0.25)' : 'rgba(180,150,60,0.18)',
            border: `1px solid ${isMain ? 'rgba(80,180,60,0.45)' : 'rgba(180,150,60,0.3)'}`,
            color: isMain ? '#b5e8a0' : 'rgba(247,220,120,0.85)',
            fontSize: 10, padding: '2px 7px', borderRadius: 10,
            fontWeight: isMain ? 600 : 400,
        }}>
            {src ? (
                <img src={src} alt="" style={{ width: 14, height: 14, objectFit: 'contain', borderRadius: 2, flexShrink: 0 }} />
            ) : (
                <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: isMain ? 'rgba(80,180,60,0.5)' : 'rgba(180,150,60,0.4)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>{(name || '?').slice(0, 2).toUpperCase()}</span>
            )}
            {name}
        </span>
    );
}

// ── Section-based bed layout ───────────────────────────────────────────────────
// AI-generated beds are stored as "section" objects (xPct/yPct/wPct/hPct).
// The renderer tiles each section with repeated plant icons.
// Manually dropped plants keep the existing point format (xPct/yPct only).

function makeSec(plant, xPct, yPct, wPct, hPct) {
    return {
        id:        genId('sec'),
        type:      'section',
        plantName: plant.name || plant.plantName || '?',
        iconData:  plant.iconData ?? null,
        role:      plant.role || 'companion',
        spacingCm: plant.spacingCm || 25,
        xPct, yPct, wPct, hPct,
    };
}

// Choose layout template and return section objects.
function expandPlantsForBed(specs, bedWM, bedHM) {
    if (!specs.length) return [];

    const mains = specs.filter(p => p.role === 'main');
    const comps  = specs.filter(p => p.role === 'companion');
    if (!mains.length && !comps.length) {
        if (specs[0]) mains.push(specs[0]);
        comps.push(...specs.slice(1));
    }

    const all  = [...mains, ...comps];
    const n    = all.length;
    const mn   = (mains[0]?.name || '').toLowerCase();
    const has  = (...keys) => keys.some(k => mn.includes(k));
    const isTrellis = has('cucumber', 'bean', 'pea', 'climbing');
    const isRoot    = has('carrot', 'radish', 'beet', 'parsnip', 'turnip', 'potato');
    const isAllium  = has('onion', 'garlic', 'leek', 'chive');

    // ── Single plant: fill the whole bed ──────────────────────────────────────
    if (n === 1) return [makeSec(all[0], 5, 5, 90, 90)];

    // ── Root / allium + companion: alternating horizontal rows ────────────────
    if ((isRoot || isAllium) && n === 2) {
        return [0, 1, 2, 3].map(i => makeSec(all[i % 2], 5, 5 + i * 22, 90, 21));
    }

    // ── Trellis crop: back strip + companion sections ─────────────────────────
    if (isTrellis) {
        const secs = [makeSec(all[0], 5, 5, 90, 27)]; // back/top trellis row
        const rem  = all.slice(1);
        if (!rem.length) return secs;
        const cw = 90 / rem.length;
        rem.forEach((p, i) => secs.push(makeSec(p, 5 + i * cw, 35, cw - 2, 60)));
        return secs;
    }

    // ── Two plants: left / right split ────────────────────────────────────────
    if (n === 2) return [
        makeSec(all[0], 5,  5, 56, 90),
        makeSec(all[1], 63, 5, 32, 90),
    ];

    // ── Three plants: three vertical blocks ──────────────────────────────────
    if (n === 3) return [
        makeSec(all[0], 5,  5, 40, 90),
        makeSec(all[1], 48, 5, 24, 90),
        makeSec(all[2], 75, 5, 20, 90),
    ];

    // ── Four+ plants: 2-row grid ──────────────────────────────────────────────
    const cols = Math.ceil(n / 2);
    const bw   = Math.floor(90 / cols);
    return all.map((p, i) => makeSec(
        p,
        5 + (i % cols) * bw,
        5 + Math.floor(i / cols) * 47,
        bw - 2,
        45,
    ));
}

// ── Section renderer (draggable, resizable, density-adjustable) ──────────────
const SEC_HANDLES = [
    { id:'nw', xPct:0,   yPct:0,   cursor:'nw-resize', al:true,  at:true  },
    { id:'n',  xPct:50,  yPct:0,   cursor:'n-resize',  al:false, at:true  },
    { id:'ne', xPct:100, yPct:0,   cursor:'ne-resize', ar:true,  at:true  },
    { id:'e',  xPct:100, yPct:50,  cursor:'e-resize',  ar:true,  at:false },
    { id:'se', xPct:100, yPct:100, cursor:'se-resize', ar:true,  ab:true  },
    { id:'s',  xPct:50,  yPct:100, cursor:'s-resize',  al:false, ab:true  },
    { id:'sw', xPct:0,   yPct:100, cursor:'sw-resize', al:true,  ab:true  },
    { id:'w',  xPct:0,   yPct:50,  cursor:'w-resize',  al:true,  at:false },
];

function BedSection({ section, innerW, innerH, bedWM, bedHM, onMove, onResize, onRemove, onSetSpacing, onReplacePlant }) {
    const [hovered, setHovered]     = useState(false);
    const [dragging, setDragging]   = useState(false);
    const [resizing, setResizing]   = useState(false);
    const [dropOver, setDropOver]   = useState(false);
    const [liveX, setLiveX]         = useState(section.xPct ?? 0);
    const [liveY, setLiveY]         = useState(section.yPct ?? 0);
    const [liveW, setLiveW]         = useState(section.wPct ?? 30);
    const [liveH, setLiveH]         = useState(section.hPct ?? 90);
    const startRef                  = useRef(null);

    useEffect(() => setLiveX(section.xPct ?? 0),  [section.xPct]);
    useEffect(() => setLiveY(section.yPct ?? 0),  [section.yPct]);
    useEffect(() => setLiveW(section.wPct ?? 30), [section.wPct]);
    useEffect(() => setLiveH(section.hPct ?? 90), [section.hPct]);

    const xPx = (liveX / 100) * innerW;
    const yPx = (liveY / 100) * innerH;
    const wPx = (liveW / 100) * innerW;
    const hPx = (liveH / 100) * innerH;

    if (wPx < 6 || hPx < 6) return null;

    const secWM    = (liveW / 100) * (bedWM || 2.4);
    const secHM    = (liveH / 100) * (bedHM || 1.2);
    const spacingM = Math.max(0.1, (section.spacingCm || 25) / 100);
    const cols     = Math.max(1, Math.min(10, Math.round(secWM / spacingM)));
    const rows     = Math.max(1, Math.min(10, Math.round(secHM / spacingM)));
    const roleScale = section.role === 'main' ? 1.0 : section.role === 'companion' ? 0.82 : 0.72;
    const iconSize  = Math.max(9, Math.min(22, Math.min(wPx / cols, hPx / rows) * 0.80 * roleScale));
    const src       = resolveIcon(section.iconData);
    const initials  = (section.plantName || '?').slice(0, 2).toUpperCase();
    const bgColor   = section.role === 'main' ? '#3a6e30' : '#7a5c22';

    // ── Move ──────────────────────────────────────────────────────────────────
    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setDragging(true);
        startRef.current = { mouseX: e.clientX, mouseY: e.clientY, origX: liveX, origY: liveY };
        const onMM = (me) => {
            const { mouseX, mouseY, origX, origY } = startRef.current;
            setLiveX(Math.max(0, Math.min(100 - liveW, origX + ((me.clientX - mouseX) / innerW) * 100)));
            setLiveY(Math.max(0, Math.min(100 - liveH, origY + ((me.clientY - mouseY) / innerH) * 100)));
        };
        const onMU = (me) => {
            window.removeEventListener('mousemove', onMM);
            window.removeEventListener('mouseup', onMU);
            setDragging(false);
            const { mouseX, mouseY, origX, origY } = startRef.current;
            onMove?.(
                Math.round(Math.max(0, Math.min(100 - liveW, origX + ((me.clientX - mouseX) / innerW) * 100))),
                Math.round(Math.max(0, Math.min(100 - liveH, origY + ((me.clientY - mouseY) / innerH) * 100))),
            );
        };
        window.addEventListener('mousemove', onMM);
        window.addEventListener('mouseup', onMU);
    };

    // ── Resize ────────────────────────────────────────────────────────────────
    const handleResizeDown = (e, h) => {
        e.stopPropagation(); e.preventDefault();
        setResizing(true);
        startRef.current = { mouseX: e.clientX, mouseY: e.clientY, origX: liveX, origY: liveY, origW: liveW, origH: liveH, h };
        const onMM = (me) => {
            const { mouseX, mouseY, origX, origY, origW, origH, h } = startRef.current;
            const dpx = ((me.clientX - mouseX) / innerW) * 100;
            const dpy = ((me.clientY - mouseY) / innerH) * 100;
            let nx = origX, ny = origY, nw = origW, nh = origH;
            if (h.al) { nx = origX + dpx; nw = origW - dpx; }
            if (h.ar) { nw = origW + dpx; }
            if (h.at) { ny = origY + dpy; nh = origH - dpy; }
            if (h.ab) { nh = origH + dpy; }
            nw = Math.max(10, nw); nh = Math.max(10, nh);
            nx = Math.max(0, nx);  ny = Math.max(0, ny);
            setLiveX(nx); setLiveY(ny); setLiveW(nw); setLiveH(nh);
        };
        const onMU = (me) => {
            window.removeEventListener('mousemove', onMM);
            window.removeEventListener('mouseup', onMU);
            setResizing(false);
            const { mouseX, mouseY, origX, origY, origW, origH, h } = startRef.current;
            const dpx = ((me.clientX - mouseX) / innerW) * 100;
            const dpy = ((me.clientY - mouseY) / innerH) * 100;
            let nx = origX, ny = origY, nw = origW, nh = origH;
            if (h.al) { nx = origX + dpx; nw = origW - dpx; }
            if (h.ar) { nw = origW + dpx; }
            if (h.at) { ny = origY + dpy; nh = origH - dpy; }
            if (h.ab) { nh = origH + dpy; }
            onResize?.({
                xPct: Math.round(Math.max(0, nx)),
                yPct: Math.round(Math.max(0, ny)),
                wPct: Math.round(Math.max(10, nw)),
                hPct: Math.round(Math.max(10, nh)),
            });
        };
        window.addEventListener('mousemove', onMM);
        window.addEventListener('mouseup', onMU);
    };

    const active = hovered || dragging || resizing;

    return (
        <div
            style={{
                position: 'absolute', left: xPx, top: yPx, width: wPx, height: hPx,
                cursor: resizing ? 'auto' : dragging ? 'grabbing' : 'grab',
                zIndex: dragging || resizing ? 25 : 2,
                userSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onDragOver={(e) => {
                if ([...e.dataTransfer.types].includes('plant')) {
                    e.preventDefault(); e.stopPropagation();
                    setDropOver(true);
                }
            }}
            onDragLeave={() => setDropOver(false)}
            onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                setDropOver(false);
                const raw = e.dataTransfer.getData('plant');
                if (!raw) return;
                try { onReplacePlant?.(JSON.parse(raw)); } catch {}
            }}
        >
            {/* Border */}
            <div style={{
                position: 'absolute', inset: 0, borderRadius: 2, pointerEvents: 'none',
                border: dropOver
                    ? '2px solid #4a9eff'
                    : `1px ${active ? 'solid rgba(255,255,255,0.3)' : 'dashed rgba(255,255,255,0.1)'}`,
                background: dropOver ? 'rgba(74,158,255,0.12)' : dragging ? 'rgba(255,255,255,0.03)' : 'transparent',
                transition: 'border 0.1s, background 0.1s',
            }} />

            {/* Plant icon grid */}
            {Array.from({ length: rows }, (_, r) =>
                Array.from({ length: cols }, (_, c) => {
                    const colStep = wPx / cols;
                    const rowStep = hPx / rows;
                    const ix = (c + 0.5) * colStep - iconSize / 2;
                    const iy = (r + 0.5) * rowStep - iconSize / 2;
                    return (
                        <div key={`${r}-${c}`} style={{ position: 'absolute', left: ix, top: iy, width: iconSize, height: iconSize, pointerEvents: 'none' }}>
                            {src
                                ? <img src={src} alt="" draggable={false} style={{ width: iconSize, height: iconSize, objectFit: 'contain', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.65))' }} />
                                : <div style={{ width: iconSize, height: iconSize, borderRadius: '50%', background: bgColor, color: '#fff', fontSize: Math.max(5, iconSize * 0.38), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials}</div>
                            }
                        </div>
                    );
                })
            )}

            {/* Drop-replace label */}
            {dropOver && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ background: 'rgba(74,158,255,0.85)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700 }}>Replace plant</div>
                </div>
            )}

            {/* Hover toolbar: name + density controls */}
            {active && !dragging && !dropOver && (
                <div
                    style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '1px 3px',
                        borderRadius: '0 0 2px 2px', pointerEvents: 'auto',
                    }}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>
                        {section.plantName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <button
                            onMouseDown={e => { e.stopPropagation(); onSetSpacing?.(Math.min(60, (section.spacingCm || 25) + 5)); }}
                            style={{ width: 14, height: 14, border: 'none', borderRadius: 2, background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 11, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            title="Fewer plants"
                        >−</button>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 8, minWidth: 22, textAlign: 'center' }}>{cols}×{rows}</span>
                        <button
                            onMouseDown={e => { e.stopPropagation(); onSetSpacing?.(Math.max(8, (section.spacingCm || 25) - 5)); }}
                            style={{ width: 14, height: 14, border: 'none', borderRadius: 2, background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 11, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            title="More plants"
                        >+</button>
                    </div>
                    <div
                        onMouseDown={e => { e.stopPropagation(); onRemove?.(); }}
                        style={{ width: 12, height: 12, borderRadius: '50%', background: '#c0392b', color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        title={`Remove ${section.plantName}`}
                    >✕</div>
                </div>
            )}

            {/* Resize handles */}
            {active && !dragging && SEC_HANDLES.map(h => (
                <div
                    key={h.id}
                    onMouseDown={e => handleResizeDown(e, h)}
                    style={{
                        position: 'absolute',
                        left: (h.xPct / 100) * wPx - 4,
                        top:  (h.yPct / 100) * hPx - 4,
                        width: 8, height: 8,
                        background: '#f5c842', border: '1px solid rgba(0,0,0,0.4)',
                        borderRadius: 1, cursor: h.cursor, zIndex: 40,
                    }}
                />
            ))}
        </div>
    );
}

// ── Draggable plant inside a bed ──────────────────────────────────────────────
function BedPlant({ plant, wPx, hPx, onRemove, onMove }) {
    const [hovered, setHovered] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [liveXPct, setLiveXPct] = useState(plant.xPct ?? 50);
    const [liveYPct, setLiveYPct] = useState(plant.yPct ?? 50);
    const startRef = useRef(null);

    // Sync live position when plant prop changes externally
    useEffect(() => {
        setLiveXPct(plant.xPct ?? 50);
        setLiveYPct(plant.yPct ?? 50);
    }, [plant.xPct, plant.yPct]);

    // Smaller icons for dense planted beds; main crops slightly larger
    const roleScale = plant.role === 'main' ? 1.0 : plant.role === 'companion' ? 0.78 : 0.65;
    const size = Math.max(13, Math.min(24, Math.min(wPx * 0.12, hPx * 0.22) * roleScale));
    const src  = resolveIcon(plant.iconData);

    const xPx = (liveXPct / 100) * wPx;
    const yPx = (liveYPct / 100) * hPx;

    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setDragging(true);
        startRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            origX: liveXPct,
            origY: liveYPct,
        };

        const onMove = (me) => {
            const { mouseX, mouseY, origX, origY } = startRef.current;
            const dxPct = ((me.clientX - mouseX) / wPx) * 100;
            const dyPct = ((me.clientY - mouseY) / hPx) * 100;
            setLiveXPct(Math.max(3, Math.min(97, origX + dxPct)));
            setLiveYPct(Math.max(3, Math.min(97, origY + dyPct)));
        };
        const onUp = (me) => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            setDragging(false);
            const { mouseX, mouseY, origX, origY } = startRef.current;
            const dxPct = ((me.clientX - mouseX) / wPx) * 100;
            const dyPct = ((me.clientY - mouseY) / hPx) * 100;
            const nx = Math.round(Math.max(3, Math.min(97, origX + dxPct)));
            const ny = Math.round(Math.max(3, Math.min(97, origY + dyPct)));
            onMove(nx, ny);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: xPx - size / 2,
                top:  yPx - size / 2,
                width: size, height: size,
                zIndex: dragging ? 30 : 5,
                cursor: dragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                transition: dragging ? 'none' : 'left 0.06s, top 0.06s',
            }}
            title={plant.plantName}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {src ? (
                <img src={src} alt={plant.plantName} draggable={false}
                    style={{
                        width: size, height: size, objectFit: 'contain',
                        filter: dragging
                            ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.9))'
                            : 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))',
                        transform: dragging ? 'scale(1.2)' : 'scale(1)',
                        transition: 'transform 0.1s, filter 0.1s',
                    }} />
            ) : (
                <div style={{
                    width: size, height: size, borderRadius: '50%',
                    background: '#4a7c3f', color: '#fff',
                    fontSize: Math.max(7, size * 0.35), fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: dragging ? '0 2px 8px rgba(0,0,0,0.7)' : '0 1px 4px rgba(0,0,0,0.6)',
                    transform: dragging ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.1s',
                }}>
                    {(plant.plantName || '?').slice(0, 2).toUpperCase()}
                </div>
            )}
            {hovered && !dragging && (
                <div
                    style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#c0392b', color: '#fff',
                        border: '2px solid #fff',
                        fontSize: 11, cursor: 'pointer', zIndex: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onRemove(); }}
                    title="Remove plant"
                >×</div>
            )}
        </div>
    );
}

// ── One raised bed ─────────────────────────────────────────────────────────────
function RaisedBed({ bed, pxPerM, selected, onSelect, onUpdate, onRemove, onPlantDrop }) {
    const [dragOffset, setDragOffset]     = useState(null);
    const [resizeOffset, setResizeOffset] = useState(null);
    const [dropHighlight, setDropHighlight] = useState(false);
    const isDraggingRef = useRef(false);

    const xM = bed.xM ?? 0;
    const yM = bed.yM ?? 0;
    const wM = bed.wM ?? 2.4;
    const hM = bed.hM ?? 1.2;

    const displayXM = xM + (dragOffset?.dx ?? 0);
    const displayYM = yM + (dragOffset?.dy ?? 0);
    const displayWM = Math.max(0.5, wM + (resizeOffset?.dw ?? 0));
    const displayHM = Math.max(0.3, hM + (resizeOffset?.dh ?? 0));

    const xPx  = displayXM * pxPerM;
    const yPx  = displayYM * pxPerM;
    const wPx  = displayWM * pxPerM;
    const hPx  = displayHM * pxPerM;
    const FRAME = Math.max(5, Math.min(12, pxPerM * 0.09));
    const innerW = Math.max(0, wPx - FRAME * 2);
    const innerH = Math.max(0, hPx - FRAME * 2);

    // Drag bed
    const handleBedMouseDown = (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('[data-resize-handle]') || e.target.closest('[data-delete-btn]')) return;
        e.stopPropagation();
        onSelect();
        const startX = e.clientX;
        const startY = e.clientY;
        isDraggingRef.current = false;

        const onMove = (me) => {
            const dx = (me.clientX - startX) / pxPerM;
            const dy = (me.clientY - startY) / pxPerM;
            if (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) isDraggingRef.current = true;
            setDragOffset({ dx, dy });
        };
        const onUp = (me) => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            const dx = (me.clientX - startX) / pxPerM;
            const dy = (me.clientY - startY) / pxPerM;
            setDragOffset(null);
            if (isDraggingRef.current) {
                onUpdate({ xM: Math.max(0, xM + dx), yM: Math.max(0, yM + dy) });
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // Resize
    const handleResizeMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const onMove = (me) => setResizeOffset({ dw: (me.clientX - startX) / pxPerM, dh: (me.clientY - startY) / pxPerM });
        const onUp = (me) => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            setResizeOffset(null);
            onUpdate({ wM: Math.max(0.5, wM + (me.clientX - startX) / pxPerM), hM: Math.max(0.3, hM + (me.clientY - startY) / pxPerM) });
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // Plant drop
    const handleDragOver = (e) => {
        if ([...e.dataTransfer.types].includes('plant')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setDropHighlight(true);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDropHighlight(false);
        const raw = e.dataTransfer.getData('plant');
        if (!raw) return;
        try {
            const dropped = JSON.parse(raw);
            if (dropped.isStructure) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const iX = e.clientX - rect.left - FRAME;
            const iY = e.clientY - rect.top  - FRAME;
            const iW = rect.width  - FRAME * 2;
            const iH = rect.height - FRAME * 2;
            const xPct = Math.round(Math.max(5, Math.min(95, (iX / iW) * 100)));
            const yPct = Math.round(Math.max(5, Math.min(95, (iY / iH) * 100)));
            onPlantDrop(bed.id, dropped, xPct, yPct);
        } catch (err) {
            console.error('[RaisedBed] drop error', err);
        }
    };

    const movePlant = useCallback((plantId, newXPct, newYPct) => {
        onUpdate({ plants: (bed.plants || []).map(p => p.id === plantId ? { ...p, xPct: newXPct, yPct: newYPct } : p) });
    }, [bed.plants, onUpdate]);

    return (
        <div
            style={{
                position: 'absolute',
                left: xPx, top: yPx, width: wPx, height: hPx,
                cursor: 'grab',
                userSelect: 'none',
                zIndex: selected ? 20 : 10,
            }}
            onMouseDown={handleBedMouseDown}
            onDragOver={handleDragOver}
            onDragLeave={() => setDropHighlight(false)}
            onDrop={handleDrop}
        >
            {/* Wood frame */}
            <div style={{
                position: 'absolute', inset: 0, borderRadius: 5,
                background: selected ? '#9e6c38' : dropHighlight ? '#c8924a' : '#8B5E3C',
                boxShadow: selected
                    ? '0 0 0 2px #f5c842, 0 4px 16px rgba(0,0,0,0.4)'
                    : '0 2px 10px rgba(0,0,0,0.3)',
                transition: 'background 0.12s, box-shadow 0.12s',
            }} />

            {/* Soil */}
            <div style={{
                position: 'absolute',
                top: FRAME, left: FRAME, width: innerW, height: innerH,
                borderRadius: 2,
                background: '#1a0e08',
                backgroundImage: [
                    'radial-gradient(circle, rgba(65,38,15,0.5) 1.5px, transparent 1.5px)',
                    'radial-gradient(circle, rgba(85,52,20,0.22) 3px, transparent 3px)',
                ].join(', '),
                backgroundSize: '9px 9px, 22px 22px',
                backgroundPosition: '0 0, 4px 4px',
                overflow: 'hidden',
            }}>
                {/* AI sections (draggable, resizable tiled areas) */}
                {(bed.plants || []).filter(p => p.type === 'section').map(s => (
                    <BedSection
                        key={s.id}
                        section={s}
                        innerW={innerW}
                        innerH={innerH}
                        bedWM={bed.wM ?? 2.4}
                        bedHM={bed.hM ?? 1.2}
                        onMove={(nx, ny) => onUpdate({ plants: (bed.plants||[]).map(p => p.id===s.id ? {...p, xPct:nx, yPct:ny} : p) })}
                        onResize={({xPct,yPct,wPct,hPct}) => onUpdate({ plants: (bed.plants||[]).map(p => p.id===s.id ? {...p,xPct,yPct,wPct,hPct} : p) })}
                        onRemove={() => onUpdate({ plants: (bed.plants||[]).filter(p => p.id!==s.id) })}
                        onSetSpacing={(sp) => onUpdate({ plants: (bed.plants||[]).map(p => p.id===s.id ? {...p, spacingCm:sp} : p) })}
                        onReplacePlant={(dropped) => onUpdate({ plants: (bed.plants||[]).map(p => p.id===s.id ? {...p, plantName:dropped.name, iconData:dropped.iconData||dropped.icon||null} : p) })}
                    />
                ))}

                {/* Manually dropped point plants (draggable) */}
                {(bed.plants || []).filter(p => !p.type || p.type !== 'section').map(plant => (
                    <BedPlant
                        key={plant.id}
                        plant={plant}
                        wPx={innerW}
                        hPx={innerH}
                        onRemove={() => onUpdate({ plants: (bed.plants || []).filter(p => p.id !== plant.id) })}
                        onMove={(nx, ny) => movePlant(plant.id, nx, ny)}
                    />
                ))}

                {(bed.plants || []).length === 0 && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(180,130,80,0.4)', fontSize: Math.max(8, Math.min(11, innerH * 0.18)),
                        fontFamily: 'Inter, system-ui, sans-serif',
                        pointerEvents: 'none', textAlign: 'center', padding: 6,
                    }}>Drop plants here</div>
                )}
            </div>

            {/* Bed name */}
            {bed.name && bed.name !== 'Raised Bed' && (
                <div style={{
                    position: 'absolute', top: -20, left: 0,
                    color: '#5a3a1a', fontSize: 10, whiteSpace: 'nowrap',
                    fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600,
                    pointerEvents: 'none',
                }}>{bed.name}</div>
            )}

            {/* Dimensions */}
            {selected && (
                <div style={{
                    position: 'absolute', bottom: -20, left: 0,
                    color: '#5a3a1a', fontSize: 10, whiteSpace: 'nowrap',
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'rgba(240,232,208,0.9)',
                    padding: '1px 6px', borderRadius: 3,
                    pointerEvents: 'none',
                }}>{displayWM.toFixed(1)} m × {displayHM.toFixed(1)} m</div>
            )}

            {/* Delete */}
            {selected && (
                <button data-delete-btn onClick={e => { e.stopPropagation(); onRemove(); }}
                    style={{
                        position: 'absolute', top: -11, right: -11,
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#c0392b', color: '#fff', border: '2px solid #fff',
                        fontSize: 14, cursor: 'pointer', zIndex: 30,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}>×</button>
            )}

            {/* Resize handle */}
            {selected && (
                <div data-resize-handle onMouseDown={handleResizeMouseDown}
                    style={{
                        position: 'absolute', bottom: 3, right: 3,
                        width: 14, height: 14, background: '#f5c842',
                        borderRadius: 2, cursor: 'se-resize', zIndex: 25,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                    }} />
            )}
        </div>
    );
}

// ── Generate panel ─────────────────────────────────────────────────────────────
function GeneratePanel({ zoneName, zoneWidthM, zoneHeightM, setup, plantList = [], onApplyBeds, onClose }) {
    const [focusNote, setFocusNote]           = useState('');
    const [preferredBedCount, setPreferred]   = useState(0); // 0 = Auto
    const [loading, setLoading]               = useState(false);
    const [error, setError]                   = useState(null);
    const [bedPlan, setBedPlan]               = useState(null);

    const hardinessZone = setup?.hardinessZone || '7b';
    const effectiveW    = zoneWidthM  ?? setup?.widthM  ?? 8;
    const effectiveH    = zoneHeightM ?? setup?.heightM ?? 5;

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setBedPlan(null);
        const requestedCrops = focusNote.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        try {
            const res = await fetch(apiUrl('/api/ai/generate-zone-beds'), {
                method:      'POST',
                credentials: 'include',
                headers:     { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    zoneName, requestedCrops, focusNote,
                    preferredBedCount,
                    hardinessZone,
                    zoneWidthM:  effectiveW,
                    zoneHeightM: effectiveH,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Generation failed');
            setBedPlan(data.bedPlan);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyAll = () => { if (bedPlan) { onApplyBeds(bedPlan.beds); onClose(); } };
    const handleApplyOne = (bed) => onApplyBeds([bed]);

    return (
        <div style={{
            position: 'absolute', top: 0, right: 0,
            width: 320, height: '100%',
            background: '#1a2e18',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', flexDirection: 'column',
            zIndex: 50, boxShadow: '-4px 0 20px rgba(0,0,0,0.4)',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            {/* Header */}
            <div style={{
                padding: '14px 16px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <div>
                    <div style={{ color: '#f7ecd0', fontSize: 13, fontWeight: 700 }}>Generate Raised Beds</div>
                    <div style={{ color: 'rgba(247,236,208,0.45)', fontSize: 10, marginTop: 2 }}>
                        {zoneName} · {Number(effectiveW).toFixed(1)}m × {Number(effectiveH).toFixed(1)}m
                    </div>
                </div>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', color: 'rgba(247,236,208,0.5)',
                    fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '2px 4px',
                }}>×</button>
            </div>

            {/* Form */}
            <div style={{ padding: '14px 16px', flexShrink: 0 }}>
                <label style={{ display: 'block', marginBottom: 12 }}>
                    <span style={{ color: 'rgba(247,236,208,0.7)', fontSize: 11, display: 'block', marginBottom: 5 }}>
                        What do you want to grow?
                    </span>
                    <textarea
                        value={focusNote}
                        onChange={e => setFocusNote(e.target.value)}
                        placeholder="e.g. tomatoes, cucumbers, herbs, salad greens…"
                        rows={3}
                        style={{
                            width: '100%', background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(247,236,208,0.2)',
                            borderRadius: 6, color: '#f7ecd0',
                            fontSize: 12, padding: '8px 10px',
                            resize: 'vertical', outline: 'none',
                            fontFamily: 'inherit', boxSizing: 'border-box',
                        }}
                        onFocus={e => { e.target.style.borderColor = 'rgba(245,200,66,0.6)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(247,236,208,0.2)'; }}
                    />
                </label>

                {/* Bed count: Auto (default) or optional override */}
                <div style={{ marginBottom: 14 }}>
                    <span style={{ color: 'rgba(247,236,208,0.7)', fontSize: 11, display: 'block', marginBottom: 6 }}>
                        Number of beds
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {[0, 2, 3, 4, 5, 6].map(n => (
                            <button key={n} onClick={() => setPreferred(n)} style={{
                                flex: n === 0 ? 2 : 1, padding: '5px 4px', borderRadius: 5,
                                background: preferredBedCount === n ? '#f5c842' : 'rgba(255,255,255,0.07)',
                                color: preferredBedCount === n ? '#1a2e18' : 'rgba(247,236,208,0.65)',
                                border: preferredBedCount === n ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                transition: 'background 0.12s, color 0.12s',
                            }}>{n === 0 ? 'Auto' : n}</button>
                        ))}
                    </div>
                    {preferredBedCount === 0 && (
                        <div style={{ color: 'rgba(247,236,208,0.3)', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                            Bed count chosen automatically from your crops &amp; zone size
                        </div>
                    )}
                </div>

                <button onClick={handleGenerate} disabled={loading} style={{
                    width: '100%', padding: '9px',
                    background: loading ? 'rgba(245,200,66,0.4)' : '#f5c842',
                    color: '#1a2e18', border: 'none', borderRadius: 7,
                    fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                    transition: 'background 0.15s',
                }}>
                    {loading ? 'Generating…' : '✦ Generate Beds'}
                </button>

                {error && (
                    <div style={{
                        marginTop: 8, padding: '7px 10px',
                        background: 'rgba(192,57,43,0.25)', border: '1px solid rgba(192,57,43,0.4)',
                        borderRadius: 5, color: '#ff8a7a', fontSize: 11,
                    }}>{error}</div>
                )}
            </div>

            {/* Suggestions */}
            {bedPlan && (
                <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
                    {/* AI result banner */}
                    <div style={{
                        background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.25)',
                        borderRadius: 7, padding: '8px 12px', marginBottom: 10,
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
                    }}>
                        <div>
                            <div style={{ color: '#f5c842', fontSize: 12, fontWeight: 700 }}>
                                {bedPlan.recommendedBedCount} bed{bedPlan.recommendedBedCount !== 1 ? 's' : ''} suggested
                            </div>
                            <div style={{ color: 'rgba(247,236,208,0.5)', fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>
                                {bedPlan.reason}
                            </div>
                        </div>
                        <button onClick={handleApplyAll} style={{
                            background: 'rgba(80,160,80,0.3)', color: '#9fdc8f',
                            border: '1px solid rgba(80,160,80,0.4)',
                            borderRadius: 5, fontSize: 11, fontWeight: 600,
                            padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>Apply All</button>
                    </div>

                    {(bedPlan.beds || []).map((bed, i) => {
                        const mainPlants  = (bed.plants || []).filter(p => p.role === 'main');
                        const companions  = (bed.plants || []).filter(p => p.role === 'companion');
                        return (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 7, padding: '10px 12px', marginBottom: 8,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 7 }}>
                                    <div>
                                        <div style={{ color: '#f7ecd0', fontSize: 12, fontWeight: 600 }}>{bed.name}</div>
                                        <div style={{ color: 'rgba(247,236,208,0.4)', fontSize: 10, marginTop: 1 }}>
                                            {bed.widthM ?? bed.wM}m × {bed.heightM ?? bed.hM}m
                                        </div>
                                    </div>
                                    <button onClick={() => handleApplyOne(bed)} style={{
                                        background: 'rgba(80,160,80,0.2)', color: '#9fdc8f',
                                        border: '1px solid rgba(80,160,80,0.35)',
                                        borderRadius: 4, fontSize: 10, padding: '3px 8px',
                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                    }}>+ Add</button>
                                </div>

                                {mainPlants.length > 0 && (
                                    <div style={{ marginBottom: companions.length > 0 ? 5 : 6 }}>
                                        <div style={{ color: 'rgba(247,236,208,0.38)', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
                                            Main crops
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                            {mainPlants.map((p, pi) => (
                                                <PlantChip key={pi} name={p.name} plantList={plantList} role="main" />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {companions.length > 0 && (
                                    <div style={{ marginBottom: bed.notes ? 5 : 0 }}>
                                        <div style={{ color: 'rgba(247,236,208,0.38)', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
                                            Companions
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                            {companions.map((p, pi) => (
                                                <PlantChip key={pi} name={p.name} plantList={plantList} role="companion" />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {bed.notes && (
                                    <div style={{
                                        marginTop: 6, color: 'rgba(247,236,208,0.35)', fontSize: 10,
                                        fontStyle: 'italic', lineHeight: 1.4,
                                    }}>{bed.notes}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!bedPlan && !loading && (
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(247,236,208,0.2)', fontSize: 11, textAlign: 'center', padding: '0 24px',
                }}>
                    Type the crops you want to grow, then click Generate.
                </div>
            )}
        </div>
    );
}

// ── Main canvas ────────────────────────────────────────────────────────────────
export default function RaisedBedZoneCanvas({ zoneName, items = [], onUpdateItems, plantList = [], setup, zoneWidthM, zoneHeightM }) {
    const [selectedBedId, setSelectedBedId] = useState(null);
    const [zoom, setZoom]                   = useState(1);
    const [generateOpen, setGenerateOpen]   = useState(false);
    const containerRef = useRef(null);

    const pxPerM = PX_PER_M * zoom;

    useEffect(() => { setSelectedBedId(null); }, [zoneName]);

    // Ctrl+scroll zoom
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            setZoom(z => Math.min(3, Math.max(0.2, z * (e.deltaY < 0 ? 1.1 : 0.9))));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    // Delete key
    useEffect(() => {
        const onKey = (e) => {
            if (!selectedBedId) return;
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            const tag = document.activeElement?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;
            onUpdateItems(items.filter(it => it.id !== selectedBedId));
            setSelectedBedId(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedBedId, items, onUpdateItems]);

    const addBed = () => {
        const beds = items.filter(it => it.type === 'raisedBed' || it.name === 'Raised Bed');
        const newBed = {
            id: genId('bed'), type: 'raisedBed', name: 'Raised Bed',
            xM: 0.4, yM: 0.4 + beds.length * 1.8, wM: 2.4, hM: 1.2, plants: [],
        };
        onUpdateItems([...items, newBed]);
        setSelectedBedId(newBed.id);
    };

    const updateBed = useCallback((id, changes) => {
        onUpdateItems(items.map(it => it.id === id ? { ...it, ...changes } : it));
    }, [items, onUpdateItems]);

    const removeBed = useCallback((id) => {
        onUpdateItems(items.filter(it => it.id !== id));
        setSelectedBedId(null);
    }, [items, onUpdateItems]);

    const handlePlantDrop = useCallback((bedId, dropped, dropXPct) => {
        const bed = items.find(it => it.id === bedId);
        if (!bed) return;

        const existingSecs = (bed.plants || []).filter(p => p.type === 'section');
        const occupied = existingSecs
            .map(s => ({ x0: s.xPct, x1: s.xPct + s.wPct }))
            .sort((a, b) => a.x0 - b.x0);

        // Build free horizontal gaps
        const gaps = [];
        let cursor = 5;
        for (const r of occupied) {
            if (r.x0 > cursor + 4) gaps.push({ x0: cursor, x1: r.x0 - 1, w: r.x0 - 1 - cursor });
            cursor = Math.max(cursor, r.x1 + 1);
        }
        if (cursor < 93) gaps.push({ x0: cursor, x1: 95, w: 95 - cursor });

        let secX = 5, secW = 90;
        if (gaps.length > 0) {
            // Use the largest gap (or closest to drop point)
            const best = gaps.sort((a, b) => b.w - a.w)[0];
            secX = best.x0;
            secW = Math.max(15, best.w);
        } else {
            // Overlap at drop position if bed is full
            secX = Math.max(5, dropXPct - 20);
            secW = 40;
        }

        const spec = {
            name: dropped.name,
            iconData: dropped.iconData || dropped.icon || null,
            role: dropped.role || 'main',
            spacingCm: dropped.planting?.spacingCm || dropped.spacingCm || 30,
        };
        const sec = makeSec(spec, secX, 5, secW, 90);
        updateBed(bedId, { plants: [...(bed.plants || []), sec] });
    }, [items, updateBed]);

    // Apply beds from Generate panel — handles both new {role} format and legacy string arrays
    const handleApplyBeds = useCallback((suggestedBeds) => {
        const existing = items.filter(it => it.type === 'raisedBed' || it.name === 'Raised Bed');
        let yOffset = existing.reduce((m, b) => Math.max(m, (b.yM ?? 0) + (b.hM ?? 1.2) + 0.3), 0.4);

        const newBeds = suggestedBeds.map((b, i) => {
            const bedH = b.heightM ?? b.hM ?? 1.2;
            const bedW = b.widthM  ?? b.wM  ?? 2.4;

            // Normalise specs and look up iconData for each plant
            const plantsSpec = (b.plants || []).map((p, pi) => {
                const raw = typeof p === 'string'
                    ? { name: p, role: pi === 0 ? 'main' : 'companion', spacingCm: 30 }
                    : { name: p.name || '?', role: p.role || (pi === 0 ? 'main' : 'companion'), spacingCm: p.spacingCm || 30 };
                const db = lookupPlantByName(raw.name, plantList);
                return {
                    ...raw,
                    name: db?.name ?? raw.name,
                    iconData:  db?.iconData ?? null,
                    spacingCm: raw.spacingCm || db?.planting?.spacingCm || 30,
                };
            });

            // Expand into many positioned plant instances using role-aware layout
            const positioned = expandPlantsForBed(plantsSpec, bedW, bedH);

            const bed = {
                id: genId('bed'), type: 'raisedBed',
                name: b.name || `Raised Bed ${i + 1}`,
                xM: 0.4, yM: yOffset, wM: bedW, hM: bedH,
                plants: positioned,
            };
            yOffset += bedH + 0.3;
            return bed;
        });

        onUpdateItems([...items, ...newBeds]);
    }, [items, onUpdateItems, plantList]);

    const beds = items.filter(it => it.type === 'raisedBed' || it.name === 'Raised Bed');

    const maxX = beds.reduce((m, b) => Math.max(m, (b.xM ?? 0) + (b.wM ?? 2.4)), 8);
    const maxY = beds.reduce((m, b) => Math.max(m, (b.yM ?? 0) + (b.hM ?? 1.2)), 5);
    const canvasW = Math.max(500, (maxX + 2.5) * pxPerM);
    const canvasH = Math.max(360, (maxY + 2.5) * pxPerM);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
            {/* Toolbar */}
            <div style={{
                background: '#1f3a18',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '6px 14px',
                display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, zIndex: 10,
            }}>
                <button onClick={addBed}
                    style={{
                        fontSize: 12, fontWeight: 600,
                        background: 'rgba(247,236,208,0.15)', color: '#f7ecd0',
                        border: '1px solid rgba(247,236,208,0.3)',
                        borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(247,236,208,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(247,236,208,0.15)'; }}
                >+ Add Raised Bed</button>

                <button onClick={() => setGenerateOpen(o => !o)}
                    style={{
                        fontSize: 12, fontWeight: 600,
                        background: generateOpen ? '#f5c842' : 'rgba(245,200,66,0.15)',
                        color: generateOpen ? '#1a2e18' : '#f5c842',
                        border: '1px solid rgba(245,200,66,0.4)',
                        borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { if (!generateOpen) e.currentTarget.style.background = 'rgba(245,200,66,0.25)'; }}
                    onMouseLeave={e => { if (!generateOpen) e.currentTarget.style.background = 'rgba(245,200,66,0.15)'; }}
                >✦ Generate Raised Beds</button>

                {selectedBedId && (
                    <span style={{ fontSize: 10, color: 'rgba(247,236,208,0.45)', fontFamily: 'Inter, sans-serif' }}>
                        Drag plants to reposition · corner to resize bed
                    </span>
                )}

                {/* Zoom */}
                <div style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2,
                    background: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: '2px 6px',
                }}>
                    <button onClick={() => setZoom(z => Math.max(0.2, z / 1.25))}
                        style={{ color: '#f7ecd0', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px', lineHeight: 1 }}>−</button>
                    <span onClick={() => setZoom(1)} title="Click to reset zoom"
                        style={{ color: '#f7ecd0', fontSize: 10, minWidth: 38, textAlign: 'center', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                        {Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z * 1.25))}
                        style={{ color: '#f7ecd0', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px', lineHeight: 1 }}>+</button>
                </div>
            </div>

            {/* Canvas + panel row — same ruler layout as General map */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex' }}>
                <div
                    ref={containerRef}
                    className="overflow-auto flex-1"
                    style={{ display: 'flex' }}
                    onClick={e => { if (e.target === e.currentTarget) setSelectedBedId(null); }}
                >
                    <div style={{ display: 'inline-flex', flexDirection: 'column', margin: 'auto' }}>
                        {/* Ruler row */}
                        <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 25 }}>
                            <div style={{ width: RULER_SIZE, height: RULER_SIZE, flexShrink: 0, background: '#1d3a20', position: 'sticky', left: 0, zIndex: 30 }} />
                            <HorizontalRuler widthM={zoneWidthM || Math.max(8, Math.ceil(canvasW / pxPerM))} pxPerM={pxPerM} />
                        </div>
                        {/* Canvas row */}
                        <div style={{ display: 'flex' }}>
                            <div style={{ position: 'sticky', left: 0, zIndex: 25, flexShrink: 0 }}>
                                <VerticalRuler heightM={zoneHeightM || Math.max(5, Math.ceil(canvasH / pxPerM))} pxPerM={pxPerM} />
                            </div>
                    <div
                        style={{ position: 'relative', width: canvasW, height: canvasH, flexShrink: 0, ...mapCanvasBg(pxPerM) }}
                        onClick={e => { if (e.target === e.currentTarget) setSelectedBedId(null); }}
                    >
                        {beds.length === 0 && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none', gap: 6,
                            }}>
                                <p style={{ color: 'rgba(90,58,26,0.4)', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', margin: 0 }}>
                                    No raised beds yet.
                                </p>
                                <p style={{ color: 'rgba(90,58,26,0.28)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', margin: 0 }}>
                                    Use "+ Add Raised Bed" or "✦ Generate Raised Beds".
                                </p>
                            </div>
                        )}

                        {beds.map(bed => (
                            <RaisedBed
                                key={bed.id}
                                bed={bed}
                                pxPerM={pxPerM}
                                selected={selectedBedId === bed.id}
                                onSelect={() => setSelectedBedId(bed.id)}
                                onUpdate={changes => updateBed(bed.id, changes)}
                                onRemove={() => removeBed(bed.id)}
                                onPlantDrop={handlePlantDrop}
                            />
                        ))}
                    </div>{/* canvas div */}
                        </div>{/* canvas row flex */}
                    </div>{/* inline-flex col */}
                </div>{/* containerRef scroll */}

                {/* Generate panel (overlay on right) */}
                {generateOpen && (
                    <GeneratePanel
                        zoneName={zoneName}
                        zoneWidthM={zoneWidthM}
                        zoneHeightM={zoneHeightM}
                        setup={setup}
                        plantList={plantList}
                        onApplyBeds={handleApplyBeds}
                        onClose={() => setGenerateOpen(false)}
                    />
                )}
            </div>{/* canvas + panel row */}
        </div>
    );
}
