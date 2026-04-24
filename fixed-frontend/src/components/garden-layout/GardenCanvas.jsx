import { useEffect, useRef, useState } from 'react';
import { STRUCTURES, ZONE_TYPES, detectZoneType } from './gardenZoneConfig';
import PlantingModal from './PlantingModal';
import AddZoneModal from './AddZoneModal';
import ZoneTabs from './ZoneTabs';

const CELL_PX = 36;
const MIN_CELL = 28;
const HEADER_H = 34;
const FOOTER_H = 24;
const GENERAL_PX_PER_M = 10;
const RULER_SIZE = 30;

// Linear structures resize only in length; all others resize by area
const LINEAR_STRUCTURES = new Set(['Path', 'Fence']);

// Default sizes in metres for each structure when first dropped on General map
const STRUCTURE_DEFAULTS = {
    Path:       { wM: 20,  hM: 1   },
    Fence:      { wM: 10,  hM: 0.5 },
    Greenhouse: { wM: 5,   hM: 4   },
    Compost:    { wM: 2,   hM: 2   },
    Pond:       { wM: 5,   hM: 4   },
    House:      { wM: 10,  hM: 8   },
    Shed:       { wM: 4,   hM: 3   },
    'Raised Bed': { wM: 3, hM: 1.2 },
};
const DEFAULT_PLANT_SIZE = { wM: 1, hM: 1 };

const ZONE_STYLES = {
    raised:     { border: '#8B5E3C', bg: '#f5ead0', headerBg: '#7a4e2c', gridLine: 'rgba(139,94,60,0.18)',  bw: 5 },
    vegetable:  { border: '#4a7c3f', bg: '#eef5e4', headerBg: '#3d6b34', gridLine: 'rgba(74,124,63,0.15)',  bw: 3 },
    orchard:    { border: '#7a5030', bg: '#f5ede0', headerBg: '#6a4020', gridLine: 'rgba(122,80,48,0.15)',  bw: 3 },
    herb:       { border: '#2d7a5a', bg: '#e4f5ec', headerBg: '#226848', gridLine: 'rgba(45,122,90,0.15)',  bw: 3 },
    flower:     { border: '#b05878', bg: '#fdf0f5', headerBg: '#904868', gridLine: 'rgba(176,88,120,0.15)', bw: 3 },
    forest:     { border: '#2d5a30', bg: '#e0f0dc', headerBg: '#245028', gridLine: 'rgba(45,90,48,0.15)',   bw: 3 },
    greenhouse: { border: '#5aab44', bg: '#f0fae8', headerBg: '#489a34', gridLine: 'rgba(90,171,68,0.18)',  bw: 4 },
    guild:      { border: '#6040a0', bg: '#f0ecf8', headerBg: '#503090', gridLine: 'rgba(96,64,160,0.15)', bw: 3 },
    compost:    { border: '#7a4020', bg: '#f5e8dc', headerBg: '#6a3010', gridLine: 'rgba(122,64,32,0.15)',  bw: 3 },
    pond:       { border: '#1a70c0', bg: '#dceef8', headerBg: '#1060a8', gridLine: 'rgba(26,112,192,0.18)', bw: 4 },
    kids:       { border: '#b09010', bg: '#fdf8d4', headerBg: '#a08000', gridLine: 'rgba(176,144,16,0.15)', bw: 3 },
    seating:    { border: '#5060b8', bg: '#eceef8', headerBg: '#4050a0', gridLine: 'rgba(80,96,184,0.15)',  bw: 3 },
    building:   { border: '#606060', bg: '#f0f0f0', headerBg: '#484848', gridLine: 'rgba(96,96,96,0.15)',   bw: 4 },
    path:       { border: '#a08050', bg: '#f5f0e4', headerBg: '#887040', gridLine: 'rgba(160,128,80,0.15)', bw: 3 },
    general:    { border: '#4a7050', bg: '#eaf0e4', headerBg: '#3a6040', gridLine: 'rgba(74,112,80,0.15)',  bw: 3 },
};
const ROLE_BG = {
    'Producer':             'rgba(144,220,80,0.35)',
    'Nitrogen fixer':       'rgba(80,160,240,0.35)',
    'Pollinator attractor': 'rgba(248,220,80,0.35)',
    'Dynamic accumulator':  'rgba(200,140,240,0.35)',
    'Pest repellent':       'rgba(248,160,80,0.35)',
    'Groundcover':          'rgba(80,220,200,0.35)',
};
const ROLE_BORDER = {
    'Producer':             'rgba(100,180,40,0.7)',
    'Nitrogen fixer':       'rgba(40,120,200,0.7)',
    'Pollinator attractor': 'rgba(200,160,20,0.7)',
    'Dynamic accumulator':  'rgba(140,80,200,0.7)',
    'Pest repellent':       'rgba(200,100,20,0.7)',
    'Groundcover':          'rgba(20,160,140,0.7)',
};
const STRUCTURE_MAP = Object.fromEntries(STRUCTURES.map(s => [s.name, s]));

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
        <svg width={totalPx} height={RULER_SIZE} style={{ display: 'block', flexShrink: 0, background: '#1e3320' }}>
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
        <svg width={RULER_SIZE} height={totalPx} style={{ display: 'block', flexShrink: 0, background: '#1e3320' }}>
            <line x1={RULER_SIZE - 1} y1={0} x2={RULER_SIZE - 1} y2={totalPx} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            {marks}
        </svg>
    );
}

const ROTATE_HANDLE_H = 34; // px above item content reserved for the rotation handle

// ── Free-floating overlay item ────────────────────────────────────────────────
function OverlayItem({ item, pxPerM, onMouseDown, onRemove, onResizeStart, onRotateStart }) {
    const [hovered, setHovered] = useState(false);
    const iconSrc = resolveIconSrc(item.iconData);
    const pxW = Math.max(pxPerM, (item.wM ?? 4) * pxPerM);
    const pxH = Math.max(pxPerM * 0.5, (item.hM ?? 4) * pxPerM);
    const iconSize = Math.min(pxW * 0.55, pxH * 0.55, 36);
    const isLinear = LINEAR_STRUCTURES.has(item.name);
    const rotation = item.rotation ?? 0;
    // For linear items, extend the wrapper upward so the rotation handle stays
    // inside the hover area and the mouse doesn't leave before reaching it.
    const topPad = isLinear ? ROTATE_HANDLE_H : 0;

    return (
        // Outer wrapper — covers item content + handle area above it
        <div
            style={{
                position: 'absolute',
                left: item.x,
                top: item.y - topPad,
                width: pxW,
                height: pxH + topPad,
                // Rotate around the item content centre, not the wrapper centre
                transform: `rotate(${rotation}deg)`,
                transformOrigin: `50% ${topPad + pxH / 2}px`,
                zIndex: hovered ? 50 : 5,
                userSelect: 'none',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Rotation handle — sits in the top pad area, always in DOM */}
            {isLinear && (
                <div
                    style={{
                        position: 'absolute', top: 0, left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        opacity: hovered ? 1 : 0,
                        transition: 'opacity 0.15s',
                        zIndex: 40, cursor: 'crosshair',
                    }}
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRotateStart(e, item.id); }}
                >
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', border: '1.5px solid #555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>↻</div>
                    <div style={{ width: 1, height: topPad - 20, background: 'rgba(255,255,255,0.45)' }} />
                </div>
            )}

            {/* Item content box */}
            <div
                style={{ position: 'absolute', top: topPad, left: 0, width: pxW, height: pxH, cursor: 'grab' }}
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onMouseDown(e, item.id); }}
                onDoubleClick={e => { e.stopPropagation(); onRemove(item.id); }}
            >
                <div style={{
                    width: '100%', height: '100%',
                    borderRadius: isLinear ? 4 : 8,
                    background: item.color ? item.color + '66' : 'rgba(255,255,255,0.88)',
                    border: hovered ? '2px solid white' : '1.5px solid rgba(255,255,255,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: hovered ? '0 4px 14px rgba(0,0,0,0.35)' : '0 2px 7px rgba(0,0,0,0.22)',
                    overflow: 'hidden', transition: 'border-color 0.1s, box-shadow 0.1s',
                }}>
                    {iconSrc
                        ? <img src={iconSrc} alt={item.name} style={{ width: iconSize, height: iconSize }} className="object-contain" draggable={false} />
                        : <span style={{ fontSize: Math.max(10, Math.min(iconSize, 20)), pointerEvents: 'none' }}>🌱</span>
                    }
                </div>

                {/* Tooltip */}
                {hovered && (
                    <div style={{
                        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        marginBottom: 6, background: '#fefce8', border: '1px solid #fde68a',
                        borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#92400e',
                        whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 60,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                        <p style={{ fontWeight: 700 }}>{item.name}</p>
                        <p style={{ fontSize: 9, opacity: 0.7 }}>
                            {isLinear
                                ? `${(item.wM ?? 4).toFixed(1)} m · ${Math.round(rotation)}°`
                                : `${(item.wM ?? 4).toFixed(1)} m × ${(item.hM ?? 4).toFixed(1)} m`}
                        </p>
                        <p style={{ fontSize: 9, color: '#ef4444' }}>dbl-click to remove</p>
                    </div>
                )}

                {/* Resize handle */}
                <div
                    title="Drag to resize"
                    style={{
                        position: 'absolute', bottom: -4, right: -4,
                        width: hovered ? 12 : 8, height: hovered ? 12 : 8,
                        background: 'white', border: '1.5px solid #555',
                        borderRadius: 2, cursor: 'se-resize',
                        zIndex: 30, transition: 'width 0.1s, height 0.1s, opacity 0.1s',
                        opacity: hovered ? 1 : 0.4,
                    }}
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeStart(e, item.id); }}
                />
            </div>
        </div>
    );
}

// ── Zone circle / rectangle ───────────────────────────────────────────────────
function ZoneCircle({ zone, zoneIdx, position, selected, onMouseDown, onClick, onShapeToggle, onRectResizeStart, onRemoveFromGeneral }) {
    const [hovered, setHovered] = useState(false);
    const mouseDownPos = useRef(null);
    const zoneType = detectZoneType(zone);
    const style = ZONE_STYLES[zoneType] || ZONE_STYLES.general;
    const typeConfig = ZONE_TYPES[zoneType] || ZONE_TYPES.general;

    const isRect = position.shape === 'rect';
    const r = 58;
    const rw = position.w || 120;
    const rh = position.h || 80;
    const w = isRect ? rw : r * 2;
    const h = isRect ? rh : r * 2;

    return (
        <div
            style={{
                position: 'absolute',
                left: position.x - w / 2,
                top: position.y - h / 2,
                width: w, height: h,
                borderRadius: isRect ? 10 : '50%',
                background: style.bg,
                border: `4px solid ${selected ? '#a8d870' : style.border}`,
                boxShadow: selected
                    ? '0 0 0 3px #a8d870, 0 6px 20px rgba(0,0,0,0.3)'
                    : hovered ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
                cursor: 'grab',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
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
            <span style={{ fontSize: 22, pointerEvents: 'none' }}>{typeConfig.emoji}</span>
            <span style={{
                fontSize: 11, fontWeight: 700, color: style.headerBg,
                textAlign: 'center', padding: '0 8px',
                maxWidth: w - 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                pointerEvents: 'none',
            }}>{zone}</span>

            {hovered && (
                <>
                    <div style={{
                        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        marginBottom: 8, background: '#fefce8', border: '1px solid #fde68a',
                        borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#92400e',
                        whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 60,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                        {isRect ? `${Math.round(rw / GENERAL_PX_PER_M)}m × ${Math.round(rh / GENERAL_PX_PER_M)}m · ` : ''}
                        Click to edit · Drag to move
                    </div>

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
        { bottom: -HANDLE/2, right: -HANDLE/2, cursor: 'se-resize' },
        { bottom: -HANDLE/2, left:  -HANDLE/2, cursor: 'sw-resize' },
        { top:    -HANDLE/2, right: -HANDLE/2, cursor: 'ne-resize' },
        { top:    -HANDLE/2, left:  -HANDLE/2, cursor: 'nw-resize' },
    ];
    return (
        <div
            style={{ position: 'absolute', left: col*cellW, top: row*cellH, width: blockW, height: blockH, cursor: 'grab', zIndex: hovered ? 20 : 1 }}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            onDoubleClick={onRemove} draggable
            onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('plant', JSON.stringify({ name: cell.plant, iconData: cell.iconData, fromZone: zoneIdx, fromRow: row, fromCol: col, spanCols, spanRows })); }}
        >
            {isBlock && <div className="absolute inset-0 rounded-sm" style={{ background: blockBg, border: `1px solid ${blockBorder}` }} />}
            {(isBlock ? tiles : [{ x: blockW/2, y: blockH/2 }]).map(({ x, y }, i) =>
                iconSrc
                    ? <img key={i} src={iconSrc} alt={cell.plant} draggable={false} style={{ position: 'absolute', left: x-iconSize/2, top: y-iconSize/2, width: iconSize, height: iconSize, pointerEvents: 'none' }} className="object-contain" />
                    : <span key={i} style={{ position: 'absolute', left: x-10, top: y-10, fontSize: 18, pointerEvents: 'none' }}>🌱</span>
            )}
            {hovered && (
                <>
                    <div className="absolute inset-0 rounded-sm pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.8)' }} />
                    {isBlock && blockH >= 56 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                            <div className="bg-white/85 rounded-md px-2 py-1 text-center shadow-sm">
                                <p className="font-bold text-forest text-[11px] leading-tight">Block of {cell.plant}</p>
                                <p className="text-gray-600 text-[10px]">{spanCols} × {spanRows} ({totalCount})</p>
                                <p className="text-gray-500 text-[9px]">{(spanCols*cellSizeM).toFixed(1)}m × {(spanRows*cellSizeM).toFixed(1)}m</p>
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
function ZoneBlock({ zone, grid, position, zoneIdx, selected, cellSizeM, plantList, onResizeMouseDown, onZoneDrop, onRemovePlant, onPlantResizeStart, onDelete, onStartRename, renameValue, onRenameChange, onRenameConfirm, onRenameCancel, isRenaming, resizePreview, plantResizePreview }) {
    const zoneType = detectZoneType(zone);
    const style = ZONE_STYLES[zoneType] || ZONE_STYLES.general;
    const cellW = Math.max(MIN_CELL, cellSizeM * CELL_PX);
    const cellH = Math.max(MIN_CELL, cellSizeM * CELL_PX);
    const liveCols = resizePreview?.zoneIdx === zoneIdx ? resizePreview.cols : (grid[0]?.length || 1);
    const liveRows = resizePreview?.zoneIdx === zoneIdx ? resizePreview.rows : grid.length;
    const bodyW = liveCols * cellW;
    const bodyH = liveRows * cellH;
    const coveredSet = new Set();
    grid.forEach((row, r) => row.forEach((cell, c) => {
        if (!cell?.plant) return;
        const sc = cell.spanCols || 1; const sr = cell.spanRows || 1;
        for (let dr = 0; dr < sr; dr++) for (let dc = 0; dc < sc; dc++)
            if (dr !== 0 || dc !== 0) coveredSet.add(`${r+dr},${c+dc}`);
    }));
    return (
        <div style={{ position: 'absolute', left: position.x, top: position.y, width: bodyW, border: `${style.bw}px solid ${style.border}`, borderRadius: 8, overflow: 'hidden', boxShadow: selected ? '0 0 0 3px #a8d870, 0 4px 18px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.28)', zIndex: 2, userSelect: 'none' }}
            onClick={e => e.stopPropagation()} onDragStart={e => e.preventDefault()}>
            <div style={{ background: style.headerBg, height: HEADER_H, cursor: 'default' }} className="flex items-center px-2 gap-1.5 select-none">
                {isRenaming ? (
                    <input autoFocus value={renameValue} onChange={onRenameChange} onBlur={onRenameConfirm}
                        onKeyDown={e => { if (e.key==='Enter') onRenameConfirm(); if (e.key==='Escape') onRenameCancel(); }}
                        onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-white/25 text-white text-xs font-bold px-1.5 py-0.5 rounded outline-none" />
                ) : (
                    <span className="text-white text-xs font-bold flex-1 truncate pointer-events-none">{zone}</span>
                )}
                <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onStartRename(zoneIdx, zone); }} className="text-white/50 hover:text-white text-xs">✏</button>
                <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete(zoneIdx); }} className="text-white/50 hover:text-white text-sm leading-none">×</button>
            </div>
            <div style={{ position: 'relative', width: bodyW, height: bodyH, backgroundColor: style.bg, backgroundImage: [`linear-gradient(${style.gridLine.replace(/[\d.]+\)$/, '0.28)')} 1px, transparent 1px)`,`linear-gradient(90deg, ${style.gridLine.replace(/[\d.]+\)$/, '0.28)')} 1px, transparent 1px)`,`linear-gradient(${style.gridLine} 1px, transparent 1px)`,`linear-gradient(90deg, ${style.gridLine} 1px, transparent 1px)`].join(', '), backgroundSize: [`${cellW*5}px ${cellH*5}px`,`${cellW*5}px ${cellH*5}px`,`${cellW}px ${cellH}px`,`${cellW}px ${cellH}px`].join(', '), overflow: 'visible' }}
                onDragOver={e => e.preventDefault()} onDrop={e => { e.stopPropagation(); onZoneDrop(e, zoneIdx, cellH, cellW); }}>
                {resizePreview?.zoneIdx === zoneIdx && <div className="absolute inset-0 border-2 border-dashed border-white/40 pointer-events-none z-10 rounded-sm" />}
                {grid.flatMap((row, r) => row.map((cell, c) => {
                    if (!cell?.plant || coveredSet.has(`${r},${c}`)) return null;
                    const preview = plantResizePreview?.zoneIdx === zoneIdx && plantResizePreview.row === r && plantResizePreview.col === c ? plantResizePreview : null;
                    return <PlantBlock key={`${r}-${c}`} cell={preview ? { ...cell, spanCols: preview.spanCols, spanRows: preview.spanRows } : cell} row={r} col={c} cellW={cellW} cellH={cellH} cellSizeM={cellSizeM} zoneIdx={zoneIdx} plantList={plantList} onRemove={() => onRemovePlant(zoneIdx, r, c, cell.spanRows||1, cell.spanCols||1)} onPlantResizeStart={onPlantResizeStart} />;
                }))}
            </div>
            <div style={{ height: FOOTER_H, background: style.headerBg+'12', borderTop: `1px solid ${style.border}30`, position: 'relative' }} className="flex items-center px-2">
                <span className="flex-1 text-center text-[10px]" style={{ color: style.headerBg, opacity: 0.55 }}>
                    {resizePreview?.zoneIdx === zoneIdx ? `${resizePreview.rows} × ${resizePreview.cols} cells` : `${grid.length} × ${grid[0]?.length||1} cells`}
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
function GeneralCanvas({ zones, positions, currentZone, overlayItems, plantList, setup, onSelectZone, onUpdatePositions, onUpdateOverlayItems }) {
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

    // Fill the container while keeping proportions; clamp so it's always usable
    const availW = Math.max(200, containerSize.w - RULER_SIZE - 2);
    const availH = Math.max(150, containerSize.h - RULER_SIZE - 2);
    const pxPerM = Math.max(4, Math.min(availW / widthM, availH / heightM));

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
        const onMove = (e) => setLiveCirclePos({ [zoneIdx]: { x: Math.max(58, origX + (e.clientX - startX)), y: Math.max(58, origY + (e.clientY - startY)) } });
        const onUp = (e) => {
            onUpdatePositions(positions.map((p, i) => i === zoneIdx ? { ...p, x: Math.max(58, origX + (e.clientX - startX)), y: Math.max(58, origY + (e.clientY - startY)) } : p));
            setLiveCirclePos({}); setCircleDragState(null);
        };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [circleDragState, positions]);

    // Overlay drag
    useEffect(() => {
        if (!overlayDragState) return;
        const { itemId, startX, startY, origX, origY } = overlayDragState;
        const onMove = (e) => setLiveOverlayPos({ [itemId]: { x: Math.max(0, origX + (e.clientX - startX)), y: Math.max(0, origY + (e.clientY - startY)) } });
        const onUp = (e) => {
            onUpdateOverlayItems(overlayItems.map(it => it.id === itemId ? { ...it, x: Math.max(0, origX + (e.clientX - startX)), y: Math.max(0, origY + (e.clientY - startY)) } : it));
            setLiveOverlayPos({}); setOverlayDragState(null);
        };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [overlayDragState, overlayItems]);

    // Overlay resize
    useEffect(() => {
        if (!overlayResizeState) return;
        const { itemId, startX, startY, origW, origH, isLinear } = overlayResizeState;
        const onMove = (e) => {
            const newW = Math.max(pxPerM, origW + (e.clientX - startX));
            const newH = isLinear ? origH : Math.max(pxPerM * 0.5, origH + (e.clientY - startY));
            setLiveOverlaySize({ [itemId]: { wM: newW / pxPerM, hM: newH / pxPerM } });
        };
        const onUp = (e) => {
            const newW = Math.max(pxPerM, origW + (e.clientX - startX));
            const newH = isLinear ? origH : Math.max(pxPerM * 0.5, origH + (e.clientY - startY));
            onUpdateOverlayItems(overlayItems.map(it => it.id === itemId ? { ...it, wM: newW / pxPerM, hM: newH / pxPerM } : it));
            setLiveOverlaySize({}); setOverlayResizeState(null);
        };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [overlayResizeState, overlayItems]);

    // Zone rect resize
    useEffect(() => {
        if (!zoneResizeState) return;
        const { zoneIdx, startX, startY, origW, origH } = zoneResizeState;
        const onMove = (e) => setLiveZoneSize({ [zoneIdx]: { w: Math.max(60, origW + (e.clientX - startX)), h: Math.max(40, origH + (e.clientY - startY)) } });
        const onUp = (e) => {
            onUpdatePositions(positions.map((p, i) => i === zoneIdx ? { ...p, w: Math.max(60, origW + (e.clientX - startX)), h: Math.max(40, origH + (e.clientY - startY)) } : p));
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
            const def = dropped.isStructure ? (STRUCTURE_DEFAULTS[dropped.name] || { wM: 4, hM: 4 }) : DEFAULT_PLANT_SIZE;
            const pxW = def.wM * pxPerM;
            const pxH = def.hM * pxPerM;
            onUpdateOverlayItems([...overlayItems, {
                id: Date.now() + Math.random(),
                name: dropped.name,
                iconData: dropped.iconData || dropped.icon || null,
                color: dropped.color || null,
                isStructure: dropped.isStructure || false,
                x: Math.max(0, rawX - pxW / 2),
                y: Math.max(0, rawY - pxH / 2),
                wM: def.wM, hM: def.hM,
                rotation: 0,
            }]);
        } catch { /* ignore */ }
    };

    const generalZones = zones.map((zone, i) => ({ zone, i, pos: positions[i] })).filter(({ pos }) => pos?.inGeneral);
    const isBusy = !!(circleDragState || overlayDragState || overlayResizeState || zoneResizeState || rotateState);

    return (
        <div
            ref={containerRef}
            className="relative overflow-auto flex-1"
            style={{ cursor: isBusy ? 'grabbing' : 'default' }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleCanvasDrop}
        >
            {/* Content wrapper — creates the scroll area */}
            <div style={{ display: 'inline-flex', flexDirection: 'column', minWidth: canvasW + RULER_SIZE, minHeight: canvasH + RULER_SIZE }}>

                {/* Row 1: corner + horizontal ruler (sticky top) */}
                <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 25 }}>
                    <div style={{ width: RULER_SIZE, height: RULER_SIZE, flexShrink: 0, background: '#1e3320', position: 'sticky', left: 0, zIndex: 30 }} />
                    <HorizontalRuler widthM={widthM} pxPerM={pxPerM} />
                </div>

                {/* Row 2: vertical ruler (sticky left) + canvas content */}
                <div style={{ display: 'flex' }}>
                    <div style={{ position: 'sticky', left: 0, zIndex: 25, flexShrink: 0 }}>
                        <VerticalRuler heightM={heightM} pxPerM={pxPerM} />
                    </div>

                    {/* Canvas */}
                    <div
                        style={{
                            position: 'relative', width: canvasW, height: canvasH,
                            background: '#3a6632',
                            backgroundImage: [
                                'linear-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)',
                                'linear-gradient(90deg, rgba(255,255,255,0.13) 1px, transparent 1px)',
                                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                                'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                            ].join(', '),
                            backgroundSize: `${largeGrid}px ${largeGrid}px, ${largeGrid}px ${largeGrid}px, ${smallGrid}px ${smallGrid}px, ${smallGrid}px ${smallGrid}px`,
                        }}
                        onClick={() => onSelectZone(-1)}
                    >
                        {generalZones.length === 0 && overlayItems.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                                <p className="text-white/50 text-sm">No zones on the map yet.</p>
                                <p className="text-white/30 text-xs text-center px-8">
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
                                    onMouseDown={handleCircleMouseDown}
                                    onClick={onSelectZone}
                                    onShapeToggle={handleShapeToggle}
                                    onRectResizeStart={handleZoneRectResizeStart}
                                    onRemoveFromGeneral={handleRemoveFromGeneral}
                                />
                            );
                        })}

                        {overlayItems.map(item => {
                            const lp = liveOverlayPos[item.id] || {};
                            const ls = liveOverlaySize[item.id] || {};
                            const lr = liveRotation[item.id];
                            return (
                                <OverlayItem
                                    key={item.id}
                                    item={{ ...item, ...lp, ...ls, ...(lr !== undefined ? { rotation: lr } : {}) }}
                                    pxPerM={pxPerM}
                                    onMouseDown={handleOverlayMouseDown}
                                    onRemove={id => onUpdateOverlayItems(overlayItems.filter(it => it.id !== id))}
                                    onResizeStart={handleOverlayResizeStart}
                                    onRotateStart={handleRotateStart}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main canvas ───────────────────────────────────────────────────────────────
export default function GardenCanvas({ zones, grids, positions, setup, currentZone, onSelectZone, onUpdateGrid, onUpdatePositions, onAddZone, onDeleteZone, onRenameZone, plantList, overlayItems = [], onUpdateOverlayItems }) {
    const [resizeState, setResizeState] = useState(null);
    const [plantResizeState, setPlantResizeState] = useState(null);
    const [resizePreview, setResizePreview] = useState(null);
    const [plantResizePreview, setPlantResizePreview] = useState(null);
    const [pendingDrop, setPendingDrop] = useState(null);
    const [addZoneOpen, setAddZoneOpen] = useState(false);
    const [renaming, setRenaming] = useState(null);

    const cellSizeM = setup.cellSizeM || 1;
    const cellW = Math.max(MIN_CELL, cellSizeM * CELL_PX);
    const cellH = Math.max(MIN_CELL, cellSizeM * CELL_PX);

    useEffect(() => {
        if (!resizeState) return;
        const { zoneIdx, startX, startY, origCols, origRows, cw, ch, grid } = resizeState;
        const onMove = (e) => setResizePreview({ zoneIdx, cols: Math.max(1, origCols + Math.round((e.clientX-startX)/cw)), rows: Math.max(1, origRows + Math.round((e.clientY-startY)/ch)) });
        const onUp = (e) => { onUpdateGrid(zoneIdx, resizeGridLocal(grid, Math.max(1, origRows+Math.round((e.clientY-startY)/ch)), Math.max(1, origCols+Math.round((e.clientX-startX)/cw)))); setResizePreview(null); setResizeState(null); };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [resizeState]);

    useEffect(() => {
        if (!plantResizeState) return;
        const { zoneIdx, row, col, startX, startY, origSC, origSR, cw, ch, gridCols, gridRows, cornerIdx, grid } = plantResizeState;
        const calc = (e) => {
            const dx = e.clientX-startX; const dy = e.clientY-startY;
            const signX = cornerIdx===0||cornerIdx===2 ? 1 : -1;
            const signY = cornerIdx===0||cornerIdx===1 ? 1 : -1;
            return { newSC: Math.max(1, Math.min(origSC+signX*Math.round(dx/cw), gridCols-col)), newSR: Math.max(1, Math.min(origSR+signY*Math.round(dy/ch), gridRows-row)) };
        };
        const onMove = (e) => { const { newSC, newSR } = calc(e); setPlantResizePreview({ zoneIdx, row, col, spanCols: newSC, spanRows: newSR }); };
        const onUp = (e) => { const { newSC, newSR } = calc(e); onUpdateGrid(zoneIdx, grid.map((r,ri) => r.map((c,ci) => { if (ri===row&&ci===col) return {...c,spanCols:newSC,spanRows:newSR}; if (ri>=row&&ri<row+newSR&&ci>=col&&ci<col+newSC) return null; return c; }))); setPlantResizePreview(null); setPlantResizeState(null); };
        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [plantResizeState]);

    const handleResizeMouseDown = (e, zoneIdx) => { e.preventDefault(); const grid = grids[zoneIdx]; setResizeState({ zoneIdx, startX: e.clientX, startY: e.clientY, origCols: grid[0]?.length||1, origRows: grid.length, cw: cellW, ch: cellH, grid }); };
    const handlePlantResizeStart = (e, zoneIdx, row, col, origSC, origSR, cornerIdx) => { const grid = grids[zoneIdx]; setPlantResizeState({ zoneIdx, row, col, startX: e.clientX, startY: e.clientY, origSC, origSR, cornerIdx, cw: cellW, ch: cellH, gridCols: grid[0]?.length||1, gridRows: grid.length, grid }); };

    const handleZoneDrop = (e, zoneIdx, dropCH, dropCW) => {
        e.preventDefault(); e.stopPropagation();
        const raw = e.dataTransfer.getData('plant'); if (!raw) return;
        try {
            const dropped = JSON.parse(raw);
            const rect = e.currentTarget.getBoundingClientRect();
            const colIndex = Math.max(0, Math.min(Math.floor((e.clientX-rect.left)/dropCW), (grids[zoneIdx][0]?.length||1)-1));
            const rowIndex = Math.max(0, Math.min(Math.floor((e.clientY-rect.top)/dropCH), (grids[zoneIdx]?.length||1)-1));
            if (dropped.fromZone !== undefined) {
                const { fromZone, fromRow, fromCol, spanCols:dSC=1, spanRows:dSR=1 } = dropped;
                const cell = grids[fromZone]?.[fromRow]?.[fromCol];
                if (!cell || (fromZone===zoneIdx&&fromRow===rowIndex&&fromCol===colIndex)) return;
                const clearSrc = (g) => g.map((row,r) => row.map((c,col) => r>=fromRow&&r<fromRow+dSR&&col>=fromCol&&col<fromCol+dSC ? null : c));
                const placeAt = (g) => g.map((row,r) => row.map((c,co) => { if (r===rowIndex&&co===colIndex) return cell; if (r>=rowIndex&&r<rowIndex+dSR&&co>=colIndex&&co<colIndex+dSC) return null; return c; }));
                if (fromZone===zoneIdx) { onUpdateGrid(zoneIdx, placeAt(clearSrc(grids[zoneIdx]))); } else { onUpdateGrid(fromZone, clearSrc(grids[fromZone])); onUpdateGrid(zoneIdx, placeAt(grids[zoneIdx])); }
                return;
            }
            if (dropped.isStructure) { const def = STRUCTURE_MAP[dropped.name]; onUpdateGrid(zoneIdx, grids[zoneIdx].map((row,r) => row.map((c,col) => r===rowIndex&&col===colIndex ? { plant:dropped.name,isStructure:true,iconData:dropped.icon||def?.icon,structureColor:dropped.color||def?.color,notes:'',spanCols:1,spanRows:1 } : c))); return; }
            const fullPlant = plantList.find(p => p.name===dropped.name);
            const zt = fullPlant?.planting?.zoneTimes?.[setup.hardinessZone||'7b'];
            const suggestedDate = zt?.directSow||zt?.transplant||new Date().toISOString().split('T')[0];
            setPendingDrop({ zoneIdx, rowIndex, colIndex, plant: dropped, fullPlant, suggestedDate });
        } catch (err) { console.error('Drop error', err); }
    };

    const handleConfirmDrop = ({ date, notes }) => {
        const { zoneIdx, rowIndex, colIndex, plant, fullPlant } = pendingDrop;
        const plantedDate = new Date(date);
        let expectedHarvest = null;
        if (fullPlant?.planting?.daysToMaturity) { const h = new Date(plantedDate); h.setDate(h.getDate()+fullPlant.planting.daysToMaturity); expectedHarvest = h.toISOString().split('T')[0]; }
        onUpdateGrid(zoneIdx, grids[zoneIdx].map((row,r) => row.map((c,co) => r===rowIndex&&co===colIndex ? { plant:plant.name,plantedDate:plantedDate.toISOString().split('T')[0],expectedHarvest,notes,iconData:plant.iconData,spanCols:1,spanRows:1 } : c)));
        setPendingDrop(null);
    };

    const handleRemovePlant = (zoneIdx, row, col, spanRows=1, spanCols=1) => onUpdateGrid(zoneIdx, grids[zoneIdx].map((r,ri) => r.map((c,ci) => ri>=row&&ri<row+spanRows&&ci>=col&&ci<col+spanCols ? null : c)));

    const handleRenameConfirm = () => { if (!renaming) return; const updated=[...zones]; updated[renaming.idx]=renaming.value.trim()||zones[renaming.idx]; onRenameZone(updated); setRenaming(null); };

    const isGeneralView = currentZone === -1;
    const detailCanvasW = zones[currentZone] ? Math.max(800, 20+(grids[currentZone]?.[0]?.length||1)*cellW+80) : 800;
    const detailCanvasH = zones[currentZone] ? Math.max(600, 20+HEADER_H+(grids[currentZone]?.length||1)*cellH+FOOTER_H+60) : 600;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2 bg-[#2d4a2a] flex-shrink-0">
                <span className="text-white font-semibold text-sm">{setup.gardenName || 'My Garden'}</span>
                <span className="text-green-300/50 text-xs">· {setup.widthM}m × {setup.heightM}m</span>
                <div className="flex-1" />
                <span className="text-green-300/40 text-xs hidden lg:inline">
                    {isGeneralView
                        ? 'Drag circles to arrange · ▭ toggles shape · corner handle resizes · drop plants/structures from sidebar'
                        : 'Hover plant → drag corners to multiply · Drag ⠿ corner to resize area'}
                </span>
                <button onClick={() => setAddZoneOpen(true)} className="bg-white/15 hover:bg-white/25 text-white text-xs px-3 py-1.5 rounded-lg font-medium border border-white/20 transition-colors">
                    + Add Area
                </button>
            </div>

            <div className="bg-white border-b border-gray-200 px-3 py-2 flex-shrink-0">
                <ZoneTabs zones={zones} currentZone={currentZone} setCurrentZone={onSelectZone} setZones={onRenameZone} onAddZone={() => setAddZoneOpen(true)} onDeleteZone={onDeleteZone} onRenameZone={onRenameZone} />
            </div>

            {isGeneralView ? (
                <GeneralCanvas zones={zones} positions={positions} currentZone={currentZone} overlayItems={overlayItems} plantList={plantList} setup={setup} onSelectZone={onSelectZone} onUpdatePositions={onUpdatePositions} onUpdateOverlayItems={onUpdateOverlayItems} />
            ) : (
                <div className="relative overflow-auto flex-1" style={{ cursor: resizeState||plantResizeState ? 'crosshair' : 'default', background: '#3d6b34', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                    <div style={{ width: detailCanvasW, height: detailCanvasH, position: 'absolute', pointerEvents: 'none' }} />
                    {zones[currentZone] && (
                        <ZoneBlock zone={zones[currentZone]} grid={grids[currentZone]||[]} position={{ x:20, y:20 }} zoneIdx={currentZone} selected cellSizeM={cellSizeM} plantList={plantList} onResizeMouseDown={handleResizeMouseDown} onZoneDrop={handleZoneDrop} onRemovePlant={handleRemovePlant} onPlantResizeStart={handlePlantResizeStart} onDelete={onDeleteZone} onStartRename={(idx,value) => setRenaming({ idx, value })} renameValue={renaming?.value||''} onRenameChange={e => setRenaming(r => ({ ...r, value: e.target.value }))} onRenameConfirm={handleRenameConfirm} onRenameCancel={() => setRenaming(null)} isRenaming={renaming?.idx===currentZone} resizePreview={resizePreview} plantResizePreview={plantResizePreview} />
                    )}
                </div>
            )}

            {addZoneOpen && <AddZoneModal onAdd={name => { onAddZone(name, true); setAddZoneOpen(false); }} onClose={() => setAddZoneOpen(false)} />}
            {pendingDrop && <PlantingModal plant={pendingDrop.plant} suggestedDate={pendingDrop.suggestedDate} onConfirm={handleConfirmDrop} onCancel={() => setPendingDrop(null)} />}
        </div>
    );
}
