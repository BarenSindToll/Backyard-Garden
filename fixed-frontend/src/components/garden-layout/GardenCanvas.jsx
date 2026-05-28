import { useEffect, useRef, useState } from 'react';
import { STRUCTURES, ZONE_TYPES, detectZoneType } from './gardenZoneConfig';
import ZoneDetailCanvas from './zoneDetails/ZoneDetailCanvas';
import { detectDetailType, DETAIL_REGISTRY } from './zoneDetails/ZoneDetailRegistry';
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
const RULER_SIZE = 30;

// Linear structures resize only in length
const LINEAR_STRUCTURES = new Set(['Path', 'Fence']);
// Structures that show the rotation handle
const ROTATABLE_STRUCTURES = new Set(['Path', 'Fence', 'Raised Bed']);
// Structures rendered as circles (force square + 50% radius)
const CIRCULAR_STRUCTURES = new Set(['Pond']);
// Structures that become real zones when dropped on the General map
const ZONE_STRUCTURES = new Set(['Greenhouse']);
// Structures that open the Bed Editor when clicked
const BED_LIKE_STRUCTURES = new Set(['Raised Bed', 'Greenhouse']);

// Default sizes in metres for each structure when first dropped on General map
const STRUCTURE_DEFAULTS = {
    Path: { wM: 20, hM: 1 },
    Fence: { wM: 10, hM: 0.5 },
    Greenhouse: { wM: 5, hM: 4 },
    Compost: { wM: 2, hM: 2 },
    Pond: { wM: 5, hM: 5 },
    House: { wM: 10, hM: 8 },
    Shed: { wM: 4, hM: 3 },
    'Raised Bed': { wM: 3, hM: 1.2 },
    Coop: { wM: 3, hM: 3 },
};
const DEFAULT_PLANT_SIZE = { wM: 1, hM: 1 };

const ZONE_STYLES = {
    raised:     { border: '#b09060', bg: '#ede0c4', headerBg: '#7a5c30', gridLine: 'rgba(160,128,72,0.18)', bw: 5 },
    vegetable:  { border: '#7a9860', bg: '#d8e49a', headerBg: '#4a6830', gridLine: 'rgba(100,140,72,0.15)', bw: 3 },
    orchard:    { border: '#8a9060', bg: '#c8d88a', headerBg: '#5a6830', gridLine: 'rgba(120,140,72,0.15)', bw: 3 },
    herb:       { border: '#70a870', bg: '#c4d8b8', headerBg: '#3a7050', gridLine: 'rgba(80,148,80,0.15)', bw: 3 },
    flower:     { border: '#c08890', bg: '#e8bcc0', headerBg: '#8a5060', gridLine: 'rgba(180,100,110,0.15)', bw: 3 },
    forest:     { border: '#6a9060', bg: '#c4dc9a', headerBg: '#3a5828', gridLine: 'rgba(90,130,70,0.15)', bw: 3 },
    greenhouse: { border: '#80b070', bg: '#cfe6b1', headerBg: '#4a7838', gridLine: 'rgba(100,160,80,0.18)', bw: 4 },
    guild:      { border: '#8888a8', bg: '#d0d0e0', headerBg: '#505070', gridLine: 'rgba(100,100,150,0.15)', bw: 3 },
    compost:    { border: '#a07050', bg: '#a57151', headerBg: '#7a4830', gridLine: 'rgba(130,90,60,0.15)', bw: 3 },
    pond:       { border: '#60a8c8', bg: '#9fd0e4', headerBg: '#3070a0', gridLine: 'rgba(60,140,180,0.18)', bw: 4 },
    kids:       { border: '#c8a848', bg: '#edce80', headerBg: '#907030', gridLine: 'rgba(180,148,56,0.15)', bw: 3 },
    seating:    { border: '#9898a8', bg: '#d0cdbc', headerBg: '#606070', gridLine: 'rgba(120,120,140,0.15)', bw: 3 },
    building:   { border: '#a09068', bg: '#dab884', headerBg: '#6a5838', gridLine: 'rgba(140,120,80,0.15)', bw: 4 },
    path:       { border: '#a09068', bg: '#d0cdbc', headerBg: '#807050', gridLine: 'rgba(140,120,80,0.15)', bw: 3 },
    general:    { border: '#7a9868', bg: '#c4dc9a', headerBg: '#4a6838', gridLine: 'rgba(100,140,80,0.15)', bw: 3 },
};
const ROLE_BG = {
    'Producer':             'rgba(160,200,100,0.32)',
    'Nitrogen fixer':       'rgba(100,160,210,0.32)',
    'Pollinator attractor': 'rgba(220,195,100,0.32)',
    'Dynamic accumulator':  'rgba(185,155,210,0.32)',
    'Pest repellent':       'rgba(215,150,90,0.32)',
    'Groundcover':          'rgba(100,195,175,0.32)',
};
const ROLE_BORDER = {
    'Producer':             'rgba(110,160,60,0.60)',
    'Nitrogen fixer':       'rgba(60,120,180,0.60)',
    'Pollinator attractor': 'rgba(180,150,40,0.60)',
    'Dynamic accumulator':  'rgba(140,100,180,0.60)',
    'Pest repellent':       'rgba(185,110,50,0.60)',
    'Groundcover':          'rgba(50,150,130,0.60)',
};
const STRUCTURE_MAP = Object.fromEntries(STRUCTURES.map(s => [s.name, s]));

const NON_OPENABLE_STRUCTURES = new Set(['House', 'Compost', 'Shed', 'Coop']);
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

// ── Compass labels overlay ────────────────────────────────────────────────────
function resolveCompassPositions(labels, northDirection = 'top') {
    const { north, south, east, west } = labels;
    switch (northDirection) {
        case 'right':   return { top: west,  right: north, bottom: east,  left: south };
        case 'bottom':  return { top: south, right: west,  bottom: north, left: east  };
        case 'left':    return { top: east,  right: south, bottom: west,  left: north };
        default:        return { top: north, right: east,  bottom: south, left: west  };
    }
}

function CompassLabels({ labels, northDirection = 'top' }) {
    const positioned = resolveCompassPositions(labels, northDirection);
    const style = {
        position: 'absolute', zIndex: 90, pointerEvents: 'none',
        background: 'rgba(0,0,0,0.52)', color: '#fff',
        fontWeight: 700, fontSize: 13, fontFamily: 'monospace',
        borderRadius: 5, padding: '2px 7px', lineHeight: 1.4,
        letterSpacing: 1, userSelect: 'none',
        border: '1px solid rgba(255,255,255,0.18)',
    };
    return (
        <>
            <div style={{ ...style, top: 8, left: '50%', transform: 'translateX(-50%)' }}>
                {positioned.top}
            </div>
            <div style={{ ...style, bottom: 8, left: '50%', transform: 'translateX(-50%)' }}>
                {positioned.bottom}
            </div>
            <div style={{ ...style, left: 8, top: '50%', transform: 'translateY(-50%)' }}>
                {positioned.left}
            </div>
            <div style={{ ...style, right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                {positioned.right}
            </div>
        </>
    );
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

// Pick the smallest "nice" interval (m) so ticks are at least targetPx apart
function goodInterval(pxPerM, targetPx) {
    const candidates = [0.5, 1, 2, 5, 10, 20, 25, 50, 100];
    const minM = targetPx / pxPerM;
    return candidates.find(c => c >= minM) ?? 100;
}

// ── Ruler components ──────────────────────────────────────────────────────────
function HorizontalRuler({ widthM, pxPerM }) {
    const totalPx = widthM * pxPerM;
    const minor = goodInterval(pxPerM, 40);
    const major = goodInterval(pxPerM, 90);
    const marks = [];
    for (let m = 0; m <= widthM + 0.001; m = Math.round((m + minor) * 1e6) / 1e6) {
        const isMajor = Math.abs(m % major) < 0.001 || Math.abs(m % major - major) < 0.001;
        const x = m * pxPerM;
        marks.push(
            <g key={m}>
                <line x1={x} y1={RULER_SIZE} x2={x} y2={isMajor ? RULER_SIZE - 12 : RULER_SIZE - 6}
                    stroke={isMajor ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)'} strokeWidth={1} />
                {isMajor && m > 0 && (
                    <text x={x + 2} y={RULER_SIZE - 14} fill="rgba(255,255,255,0.6)" fontSize={9} fontFamily="monospace">
                        {Number.isInteger(m) ? m : m.toFixed(1)}m
                    </text>
                )}
            </g>
        );
    }
    return (
        <svg width={totalPx} height={RULER_SIZE} style={{ display: 'block', flexShrink: 0, background: '#1d3a20' }}>
            <line x1={0} y1={RULER_SIZE - 1} x2={totalPx} y2={RULER_SIZE - 1} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            {marks}
        </svg>
    );
}

function VerticalRuler({ heightM, pxPerM }) {
    const totalPx = heightM * pxPerM;
    const minor = goodInterval(pxPerM, 40);
    const major = goodInterval(pxPerM, 90);
    const marks = [];
    for (let m = 0; m <= heightM + 0.001; m = Math.round((m + minor) * 1e6) / 1e6) {
        const isMajor = Math.abs(m % major) < 0.001 || Math.abs(m % major - major) < 0.001;
        const y = m * pxPerM;
        marks.push(
            <g key={m}>
                <line x1={RULER_SIZE} y1={y} x2={isMajor ? RULER_SIZE - 12 : RULER_SIZE - 6} y2={y}
                    stroke={isMajor ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)'} strokeWidth={1} />
                {isMajor && m > 0 && (
                    <text x={2} y={y - 2} fill="rgba(255,255,255,0.6)" fontSize={9} fontFamily="monospace">
                        {Number.isInteger(m) ? m : m.toFixed(1)}m
                    </text>
                )}
            </g>
        );
    }
    return (
        <svg width={RULER_SIZE} height={totalPx} style={{ display: 'block', flexShrink: 0, background: '#1d3a20' }}>
            <line x1={RULER_SIZE - 1} y1={0} x2={RULER_SIZE - 1} y2={totalPx} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            {marks}
        </svg>
    );
}

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
    const topPct  = `${Math.max(0, Math.min(1, yM / bedHM)) * 100}%`;
    const widPct  = `${Math.max(0.1, Math.min(1 - xM / bedWM, wM / bedWM)) * 100}%`;
    const hgtPct  = `${Math.max(0.1, Math.min(1 - yM / bedHM, hM / bedHM)) * 100}%`;

    const plant = row.plant;
    const companions = row.companions || [];
    const rowPxW = wM * pxPerM;
    const rowPxH = hM * pxPerM;
    const spacingPx = Math.max(8, ((row.spacingCm || 30) / 100) * pxPerM);
    const iconSz = Math.min(spacingPx * 0.72, rowPxH * 0.78, 22);
    const showIcons = plant && iconSz >= 5 && rowPxW >= 10 && rowPxH >= 5;

    const mainPos = showIcons ? getRepeatedPositionsPx(rowPxW, rowPxH, spacingPx, 80) : [];
    const compSp  = spacingPx * 1.6;
    const compSz  = iconSz * 0.62;
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
    const topPct  = `${Math.max(0, Math.min(1, yM / bedHM)) * 100}%`;
    const widPct  = `${Math.max(0.1, Math.min(1 - xM / bedWM, wM / bedWM)) * 100}%`;
    const hgtPct  = `${Math.max(0.1, Math.min(1 - yM / bedHM, hM / bedHM)) * 100}%`;

    const plant = block.plant;
    const companions = block.companions || [];
    const blkPxW = wM * pxPerM;
    const blkPxH = hM * pxPerM;
    const spacingPx = Math.max(8, ((block.spacingCm || 25) / 100) * pxPerM);
    const iconSz = Math.min(spacingPx * 0.72, Math.min(blkPxW, blkPxH) * 0.6, 22);
    const showIcons = plant && iconSz >= 5 && blkPxW >= 10 && blkPxH >= 10;

    const mainPos = showIcons ? getRepeatedPositionsPx(blkPxW, blkPxH, spacingPx, 80) : [];
    const compSp  = spacingPx * 1.6;
    const compSz  = iconSz * 0.62;
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

// ── Free-floating overlay item ────────────────────────────────────────────────
function OverlayItem({ item, pxPerM, zoom = 1, onMouseDown, onRemove, onResizeStart, onRotateStart, onSelectBed, selectedBedId, bedLayout, selectedBedElementId, onSelectBedElement, onUpdateBedLayout }) {
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
    const isLinear = LINEAR_STRUCTURES.has(item.name);
    const isRotatable = ROTATABLE_STRUCTURES.has(item.name);
    const isCircular = CIRCULAR_STRUCTURES.has(item.name);
    const isBedLike = BED_LIKE_STRUCTURES.has(item.name);
    const isSelectedBed = isBedLike && selectedBedId === item.id;

    const rawW = Math.max(pxPerM * 2, (item.wM ?? 4) * pxPerM);
    const rawH = Math.max(isRotatable ? 28 : pxPerM, (item.hM ?? 4) * pxPerM);
    const pxW = isCircular ? Math.max(rawW, rawH) : rawW;
    const pxH = isCircular ? Math.max(rawW, rawH) : rawH;
    const iconSize = Math.min(pxW * 0.45, (pxH - (isRotatable ? 16 : 0)) * 0.7, 32);
    const rotation = item.rotation ?? 0;

    const bedRows = bedLayout?.rows || [];
    const bedBlocks = bedLayout?.blocks || [];
    const hasBedContent = isBedLike && (bedRows.length > 0 || bedBlocks.length > 0);

    return (
        <div
            style={{
                position: 'absolute', left: item.x * zoom, top: item.y * zoom,
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
                if (!isBedLike || !onSelectBed) return;
                if (mouseDownPos.current) {
                    const dx = e.clientX - mouseDownPos.current.x;
                    const dy = e.clientY - mouseDownPos.current.y;
                    if (dx * dx + dy * dy > 25) return;
                }
                onSelectBed(item.id);
            }}
            onDoubleClick={e => { e.stopPropagation(); if (!isBedLike) onRemove(item.id); }}
        >
            {isSelectedBed && (
                <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', background: '#a8d870', color: '#1a3a0a', fontSize: 9, fontWeight: 700, borderRadius: 4, padding: '1px 7px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 25 }}>Editing</div>
            )}

            <div style={{
                position: 'relative', width: '100%', height: '100%',
                borderRadius: isCircular ? '50%' : isLinear ? 4 : 10,
                background: item.color ? item.color + '28' : 'rgba(61,107,52,0.10)',
                border: isSelectedBed ? '2px solid #a8d870' : hovered ? `1.5px dashed ${item.color || '#3d6b34'}aa` : `1.5px dashed ${item.color || '#3d6b34'}60`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: isSelectedBed ? '0 0 0 2px rgba(168,216,112,0.35), 0 4px 14px rgba(0,0,0,0.18)' : hovered ? '0 4px 14px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.10)',
                overflow: 'hidden', transition: 'border-color 0.1s, box-shadow 0.1s', gap: 4,
            }}>
                {isRotatable && (
                    <div title="Drag to rotate" style={{ width: 18, height: 18, flexShrink: 0, borderRadius: '50%', background: hovered ? 'white' : 'rgba(255,255,255,0.4)', border: '1.5px solid rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'crosshair', transition: 'background 0.15s', position: 'relative', zIndex: 2 }}
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRotateStart(e, item.id); }}>↻</div>
                )}
                {!hasBedContent && (
                    iconSrc
                        ? <img src={iconSrc} alt={item.name} style={{ width: iconSize, height: iconSize, flexShrink: 0, position: 'relative', zIndex: 1 }} className="object-contain" draggable={false} />
                        : <span style={{ fontSize: Math.max(10, Math.min(iconSize, 20)), pointerEvents: 'none', position: 'relative', zIndex: 1 }}>🌱</span>
                )}
                {hasBedContent && (
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
                {/* Always-visible paper label */}
                {!hasBedContent && pxH >= 48 && (
                    <div style={{
                        ...PAPER_LABEL_STYLE,
                        fontSize: Math.max(8, Math.min(11, pxW * 0.14)),
                        padding: pxH < 70 ? '2px 7px' : '3px 10px',
                        maxWidth: pxW - 10, overflow: 'hidden', textOverflow: 'ellipsis',
                        position: 'relative', zIndex: 2,
                    }}>{item.name}</div>
                )}
            </div>

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
                        {isBedLike ? (
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

function GeneralCanvas({ zones, positions, currentZone, overlayItems, plantList, setup, onSelectZone, onUpdatePositions, onUpdateOverlayItems, onAddZone, selectedBedId, onSelectBed, selectedBedElementId, onSelectBedElement, bedLayouts, onUpdateBedLayout, proposedItems = [], proposedHoveredName = null, proposedSelectedNames = null }) {
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
        const { itemId, startX, startY, origX, origY } = overlayDragState;
        const onMove = (e) => setLiveOverlayPos({ [itemId]: { x: Math.max(0, origX + (e.clientX - startX) / zoom), y: Math.max(0, origY + (e.clientY - startY) / zoom) } });
        const onUp = (e) => {
            onUpdateOverlayItems(overlayItems.map(it => it.id === itemId ? { ...it, x: Math.max(0, origX + (e.clientX - startX) / zoom), y: Math.max(0, origY + (e.clientY - startY) / zoom) } : it));
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
        setOverlayDragState({ itemId, startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y });
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
        // Screen coordinates of item centre
        const cx = rect.left + RULER_SIZE + item.x + pxW / 2 - scrollX;
        const cy = rect.top + RULER_SIZE + item.y + pxH / 2 - scrollY;
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

            if (dropped.isStructure && ZONE_STRUCTURES.has(dropped.name)) {
                const def = STRUCTURE_DEFAULTS[dropped.name] || { wM: 5, hM: 4 };
                const wBase = def.wM * basePxPerM;   // base px (zoom=1)
                const hBase = def.hM * basePxPerM;
                onAddZone(dropped.name, true, { x: baseX + wBase / 2, y: baseY + hBase / 2, w: wBase, h: hBase });
                return;
            }

            const def = dropped.isStructure ? (STRUCTURE_DEFAULTS[dropped.name] || { wM: 4, hM: 4 }) : DEFAULT_PLANT_SIZE;
            const wBase = def.wM * basePxPerM;
            const hBase = def.hM * basePxPerM;
            onUpdateOverlayItems([...overlayItems, {
                id: Date.now() + Math.random(),
                name: dropped.name,
                iconData: dropped.iconData || dropped.icon || null,
                color: dropped.color || null,
                isStructure: dropped.isStructure || false,
                x: Math.max(0, baseX - wBase / 2),
                y: Math.max(0, baseY - hBase / 2),
                wM: def.wM, hM: def.hM,
                rotation: 0,
            }]);
        } catch { /* ignore */ }
    };

    const generalZones = zones.map((zone, i) => ({ zone, i, pos: positions[i] })).filter(({ pos }) => pos?.inGeneral);
    const isBusy = !!(circleDragState || overlayDragState || overlayResizeState || zoneResizeState || rotateState);

    return (
        <div className="flex-1" style={{ position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <CompassLabels labels={t.canvas} northDirection={setup?.northDirection || 'top'} />

            {/* ── Proposed elements legend — fixed in viewport, shown only while preview is active ── */}
            {proposedItems.length > 0 && (
                <div style={{
                    position:       'absolute',
                    bottom:         14,
                    left:           RULER_SIZE + 8,
                    zIndex:         20,
                    pointerEvents:  'none',
                    background:     'rgba(15,12,40,0.72)',
                    borderRadius:   8,
                    padding:        '5px 11px 5px 9px',
                    display:        'flex',
                    alignItems:     'center',
                    gap:            8,
                    backdropFilter: 'blur(4px)',
                    boxShadow:      '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                    {/* Dashed line sample matching the proposed border style */}
                    <svg width="22" height="10" style={{ flexShrink: 0 }}>
                        <line x1="1" y1="5" x2="21" y2="5"
                            stroke="#5b4ec0" strokeWidth="2" strokeDasharray="4 3"
                            strokeLinecap="round" />
                    </svg>
                    <span style={{
                        color:         'rgba(195,185,255,0.95)',
                        fontSize:      10,
                        fontWeight:    600,
                        letterSpacing: 0.2,
                        whiteSpace:    'nowrap',
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
                                background: '#fbf4df',
                                backgroundImage: 'radial-gradient(circle, rgba(94,80,45,0.10) 1.5px, transparent 1.5px)',
                                backgroundSize: `${smallGrid}px ${smallGrid}px`,
                            }}
                            onClick={() => { onSelectZone(-1); if (onSelectBed) { onSelectBed(null); if (onSelectBedElement) onSelectBedElement(null); } }}
                        >
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
export default function GardenCanvas({ zones, grids, positions, setup, currentZone, onSelectZone, onUpdateGrid, onUpdatePositions, onAddZone, onDeleteZone, onRenameZone, plantList, overlayItems = [], onUpdateOverlayItems, selectedBedId, onSelectBed, selectedBedElementId, onSelectBedElement, bedLayouts, onUpdateBedLayout, zoneItems, onUpdateZoneItems, onAddZoneItem, onResetZone, proposedItems = [], proposedHoveredName = null, proposedSelectedNames = null }) {
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
    const currentZoneName = !isGeneralView ? zones[currentZone] : null;
    const currentZoneItems = currentZoneName ? (zoneItems?.[currentZoneName] || []) : [];
    const currentZoneStyle = currentZoneName ? (ZONE_STYLES[detectZoneType(currentZoneName)] || ZONE_STYLES.general) : ZONE_STYLES.general;
    const zonePxPerM = CELL_PX * detailZoom;

    const currentDetailType = currentZoneName ? detectDetailType(currentZoneName) : null;
    const hasDetailView = !!(currentDetailType && DETAIL_REGISTRY[currentDetailType]);
    const detailMode = detailModeMap[currentZoneName] ?? (hasDetailView ? 'illustrative' : 'grid');
    const setDetMode = (mode) => setDetailModeMap(prev => ({ ...prev, [currentZoneName]: mode }));

    return (
        <div className="flex flex-col h-full overflow-hidden">


            <div style={{ background: '#fbf7ea', borderBottom: '1px solid #e8e2cc', padding: '8px 16px', flexShrink: 0 }}>
                <ZoneTabs zones={zones} currentZone={currentZone} setCurrentZone={onSelectZone} setZones={onRenameZone} onAddZone={() => setAddZoneOpen(true)} onDeleteZone={onDeleteZone} onRenameZone={onRenameZone} onResetZone={onResetZone} />
            </div>

            {isGeneralView ? (
                <GeneralCanvas zones={zones} positions={positions} currentZone={currentZone} overlayItems={overlayItems} plantList={plantList} setup={setup} onSelectZone={onSelectZone} onUpdatePositions={onUpdatePositions} onUpdateOverlayItems={onUpdateOverlayItems} onAddZone={onAddZone} selectedBedId={selectedBedId} onSelectBed={onSelectBed} selectedBedElementId={selectedBedElementId} onSelectBedElement={onSelectBedElement} bedLayouts={bedLayouts} onUpdateBedLayout={onUpdateBedLayout} proposedItems={proposedItems} proposedHoveredName={proposedHoveredName} proposedSelectedNames={proposedSelectedNames} />
            ) : (
                <div className="flex-1" style={{ position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <CompassLabels labels={t.canvas} northDirection={setup?.northDirection || 'top'} />
                    {/* Zone item toolbar */}
                    <div style={{ background: '#1f3a18', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '4px 12px', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, zIndex: 5 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Add to zone:</span>
                        <button onClick={() => onAddZoneItem?.(currentZoneName, 'Raised Bed')} style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer' }}>+ Raised Bed</button>
                        <button onClick={() => onAddZoneItem?.(currentZoneName, 'Path')} style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer' }}>+ Path</button>
                        {hasDetailView && (
                            <button
                                onClick={() => setDetMode(detailMode === 'illustrative' ? 'grid' : 'illustrative')}
                                style={{ marginLeft: 'auto', fontSize: 11, background: detailMode === 'illustrative' ? 'rgba(247,236,208,0.18)' : 'rgba(255,255,255,0.12)', color: detailMode === 'illustrative' ? '#f7ecd0' : 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer' }}
                            >
                                {detailMode === 'illustrative' ? (t.canvas?.editGrid || 'Edit Grid') : (t.canvas?.illustration || 'Illustration')}
                            </button>
                        )}
                    </div>
                    {detailMode === 'illustrative' && hasDetailView ? (
                        <div className="flex-1" style={{ position: 'relative', overflow: 'hidden' }}>
                            <ZoneDetailCanvas
                                zoneName={currentZoneName}
                                language={language}
                                onEditGrid={() => setDetMode('grid')}
                            />
                        </div>
                    ) : (
                        <>
                            {/* Scrollable zone area */}
                            <div
                                ref={detailContainerRef}
                                className="overflow-auto flex-1"
                                style={{
                                    cursor: resizeState || plantResizeState ? 'crosshair' : 'default',
                                    background: '#3d6b34',
                                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                                    backgroundSize: '40px 40px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '28px',
                                }}
                            >
                                {currentZoneName && (
                                    <div style={{ position: 'relative' }}>
                                        <ZoneBlock zone={currentZoneName} grid={grids[currentZone] || []} position={{ x: 0, y: 0 }} zoneIdx={currentZone} selected detailView zoom={detailZoom} cellSizeM={cellSizeM} plantList={plantList} onResizeMouseDown={handleResizeMouseDown} onZoneDrop={handleZoneDrop} onRemovePlant={handleRemovePlant} onPlantResizeStart={handlePlantResizeStart} onDelete={onDeleteZone} onStartRename={(idx, value) => setRenaming({ idx, value })} renameValue={renaming?.value || ''} onRenameChange={e => setRenaming(r => ({ ...r, value: e.target.value }))} onRenameConfirm={handleRenameConfirm} onRenameCancel={() => setRenaming(null)} isRenaming={renaming?.idx === currentZone} resizePreview={resizePreview} plantResizePreview={plantResizePreview} />
                                        <ZoneItemLayer
                                            items={currentZoneItems}
                                            pxPerM={zonePxPerM}
                                            zoneName={currentZoneName}
                                            selectedBedId={selectedBedId}
                                            onSelectBed={onSelectBed}
                                            onUpdateItems={items => onUpdateZoneItems?.(currentZoneName, items)}
                                            onRemoveItem={id => onUpdateZoneItems?.(currentZoneName, currentZoneItems.filter(it => it.id !== id))}
                                            bedLayouts={bedLayouts}
                                            selectedBedElementId={selectedBedElementId}
                                            onSelectBedElement={onSelectBedElement}
                                            onUpdateBedLayout={onUpdateBedLayout}
                                            borderW={currentZoneStyle.bw}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Zoom pill — sibling of scroll container, always stays in corner */}
                            <div style={{
                                position: 'absolute', bottom: 12, right: 12,
                                background: 'rgba(0,0,0,0.55)', borderRadius: 20,
                                display: 'flex', alignItems: 'center', gap: 2,
                                padding: '3px 6px', zIndex: 100, userSelect: 'none',
                            }}>
                                <button onClick={() => setDetailZoom(z => Math.max(0.05, z / 1.25))}
                                    style={{ color: 'white', fontSize: 16, cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1, padding: '0 4px' }}>−</button>
                                <span onClick={() => setDetailZoom(computeFitZoom())} title="Click to fit zone in view"
                                    style={{ color: 'white', fontSize: 11, cursor: 'pointer', minWidth: 38, textAlign: 'center' }}>
                                    {Math.round(detailZoom * 100)}%
                                </span>
                                <button onClick={() => setDetailZoom(z => Math.min(5, z * 1.25))}
                                    style={{ color: 'white', fontSize: 16, cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1, padding: '0 4px' }}>+</button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {addZoneOpen && <AddZoneModal onAdd={name => { onAddZone(name, true); setAddZoneOpen(false); }} onClose={() => setAddZoneOpen(false)} />}
            {pendingDrop && <PlantingModal plant={pendingDrop.plant} suggestedDate={pendingDrop.suggestedDate} onConfirm={handleConfirmDrop} onCancel={() => setPendingDrop(null)} />}
        </div>
    );
}
