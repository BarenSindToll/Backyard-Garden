import { useEffect, useState } from 'react';
import { STRUCTURES, detectZoneType } from './gardenZoneConfig';
import PlantingModal from './PlantingModal';
import AddZoneModal from './AddZoneModal';

const CELL_PX   = 36;   // px per metre inside zone blocks
const MIN_CELL  = 28;
const HEADER_H  = 34;
const FOOTER_H  = 24;

const ZONE_STYLES = {
    raised:    { border: '#8B5E3C', bg: '#f5ead0', headerBg: '#7a4e2c', gridLine: 'rgba(139,94,60,0.18)',  bw: 5 },
    vegetable: { border: '#4a7c3f', bg: '#eef5e4', headerBg: '#3d6b34', gridLine: 'rgba(74,124,63,0.15)',  bw: 3 },
    orchard:   { border: '#7a5030', bg: '#f5ede0', headerBg: '#6a4020', gridLine: 'rgba(122,80,48,0.15)',  bw: 3 },
    herb:      { border: '#2d7a5a', bg: '#e4f5ec', headerBg: '#226848', gridLine: 'rgba(45,122,90,0.15)',  bw: 3 },
    flower:    { border: '#b05878', bg: '#fdf0f5', headerBg: '#904868', gridLine: 'rgba(176,88,120,0.15)', bw: 3 },
    forest:    { border: '#2d5a30', bg: '#e0f0dc', headerBg: '#245028', gridLine: 'rgba(45,90,48,0.15)',   bw: 3 },
    greenhouse:{ border: '#5aab44', bg: '#f0fae8', headerBg: '#489a34', gridLine: 'rgba(90,171,68,0.18)',  bw: 4 },
    guild:     { border: '#6040a0', bg: '#f0ecf8', headerBg: '#503090', gridLine: 'rgba(96,64,160,0.15)',  bw: 3 },
    compost:   { border: '#7a4020', bg: '#f5e8dc', headerBg: '#6a3010', gridLine: 'rgba(122,64,32,0.15)',  bw: 3 },
    pond:      { border: '#1a70c0', bg: '#dceef8', headerBg: '#1060a8', gridLine: 'rgba(26,112,192,0.18)', bw: 4 },
    kids:      { border: '#b09010', bg: '#fdf8d4', headerBg: '#a08000', gridLine: 'rgba(176,144,16,0.15)', bw: 3 },
    seating:   { border: '#5060b8', bg: '#eceef8', headerBg: '#4050a0', gridLine: 'rgba(80,96,184,0.15)',  bw: 3 },
    building:  { border: '#606060', bg: '#f0f0f0', headerBg: '#484848', gridLine: 'rgba(96,96,96,0.15)',   bw: 4 },
    path:      { border: '#a08050', bg: '#f5f0e4', headerBg: '#887040', gridLine: 'rgba(160,128,80,0.15)', bw: 3 },
    general:   { border: '#4a7050', bg: '#eaf0e4', headerBg: '#3a6040', gridLine: 'rgba(74,112,80,0.15)',  bw: 3 },
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

// ── PlantBlock — single plant or tiled block ──────────────────────────────
function PlantBlock({
    cell, row, col, cellW, cellH, cellSizeM, zoneIdx, plantList,
    onRemove, onPlantResizeStart,
}) {
    const [hovered, setHovered] = useState(false);

    const spanCols  = cell.spanCols || 1;
    const spanRows  = cell.spanRows || 1;
    const isBlock   = spanCols > 1 || spanRows > 1;
    const blockW    = spanCols * cellW;
    const blockH    = spanRows * cellH;
    const iconSize  = Math.min(cellW * 0.68, cellH * 0.68, 26);
    const totalCount = spanCols * spanRows;
    const widthM    = (spanCols * cellSizeM).toFixed(2);
    const heightM   = (spanRows * cellSizeM).toFixed(2);

    const iconSrc = cell.iconData
        ? (cell.iconData.startsWith('data:') ? cell.iconData : `data:image/svg+xml;base64,${cell.iconData}`)
        : null;

    const plantData = plantList.find(p => p.name === cell.plant);
    const role      = plantData?.guildRole?.[0];
    const blockBg   = isBlock ? (ROLE_BG[role] || 'rgba(180,220,140,0.3)') : 'transparent';
    const blockBorder = isBlock ? (ROLE_BORDER[role] || 'rgba(100,160,60,0.5)') : 'transparent';

    // One icon per cell in the span
    const tiles = [];
    for (let dr = 0; dr < spanRows; dr++) {
        for (let dc = 0; dc < spanCols; dc++) {
            tiles.push({ x: dc * cellW + cellW / 2, y: dr * cellH + cellH / 2 });
        }
    }

    // Corner handle positions (shown on hover)
    const HANDLE = 9;
    const corners = [
        { bottom: -HANDLE/2, right:  -HANDLE/2, cursor: 'se-resize' },  // ↘
        { bottom: -HANDLE/2, left:   -HANDLE/2, cursor: 'sw-resize' },  // ↙
        { top:    -HANDLE/2, right:  -HANDLE/2, cursor: 'ne-resize' },  // ↗
        { top:    -HANDLE/2, left:   -HANDLE/2, cursor: 'nw-resize' },  // ↖
    ];

    return (
        <div
            style={{
                position: 'absolute',
                left: col * cellW,
                top:  row * cellH,
                width:  blockW,
                height: blockH,
                cursor: 'grab',
                zIndex: hovered ? 20 : 1,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onDoubleClick={onRemove}
            draggable
            onDragStart={e => {
                e.stopPropagation();
                e.dataTransfer.setData('plant', JSON.stringify({
                    name: cell.plant,
                    iconData: cell.iconData,
                    fromZone: zoneIdx,
                    fromRow: row,
                    fromCol: col,
                    spanCols,
                    spanRows,
                }));
            }}
        >
            {/* Block background tint */}
            {isBlock && (
                <div
                    className="absolute inset-0 rounded-sm"
                    style={{ background: blockBg, border: `1px solid ${blockBorder}` }}
                />
            )}

            {/* Tiled (or single) icons */}
            {(isBlock ? tiles : [{ x: blockW / 2, y: blockH / 2 }]).map(({ x, y }, i) =>
                iconSrc ? (
                    <img
                        key={i}
                        src={iconSrc}
                        alt={cell.plant}
                        draggable={false}
                        style={{
                            position: 'absolute',
                            left: x - iconSize / 2,
                            top:  y - iconSize / 2,
                            width: iconSize,
                            height: iconSize,
                            pointerEvents: 'none',
                        }}
                        className="object-contain"
                    />
                ) : (
                    <span key={i} style={{ position: 'absolute', left: x - 10, top: y - 10, fontSize: 18, pointerEvents: 'none' }}>🌱</span>
                )
            )}

            {/* Hover overlay */}
            {hovered && (
                <>
                    {/* Selection ring */}
                    <div className="absolute inset-0 rounded-sm pointer-events-none"
                        style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.8)' }} />

                    {/* Info label — inside block when large enough, above when small */}
                    {isBlock && blockH >= 56 ? (
                        /* Inside the block */
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                            <div className="bg-white/85 rounded-md px-2 py-1 text-center shadow-sm">
                                <p className="font-bold text-forest text-[11px] leading-tight">Block of {cell.plant}</p>
                                <p className="text-gray-600 text-[10px]">{spanCols} × {spanRows} ({totalCount} plants)</p>
                                <p className="text-gray-500 text-[9px]">{widthM}m × {heightM}m</p>
                            </div>
                        </div>
                    ) : (
                        /* Floating tooltip above */
                        <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[#fefce8] border border-amber-200 rounded-lg shadow-lg px-2.5 py-1.5 text-xs pointer-events-none z-40 whitespace-nowrap"
                            style={{ minWidth: 130 }}
                        >
                            <p className="font-bold text-forest">{isBlock ? `Block of ${cell.plant}` : cell.plant}</p>
                            {isBlock && <p className="text-gray-600">{spanCols} × {spanRows} ({totalCount} plants)</p>}
                            {isBlock && <p className="text-gray-500">{widthM}m × {heightM}m</p>}
                            {cell.plantedDate && <p className="text-gray-500">🗓 {cell.plantedDate}</p>}
                            <p className="text-red-400 text-[9px] mt-0.5">dbl-click to remove</p>
                        </div>
                    )}

                    {/* Corner resize handles */}
                    {corners.map((style, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                width: HANDLE, height: HANDLE,
                                background: 'white',
                                border: '1.5px solid #555',
                                borderRadius: 2,
                                zIndex: 30,
                                ...style,
                            }}
                            onMouseDown={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                onPlantResizeStart(e, zoneIdx, row, col, spanCols, spanRows, i);
                            }}
                        />
                    ))}
                </>
            )}
        </div>
    );
}

// ── Zone block ─────────────────────────────────────────────────────────────
function ZoneBlock({
    zone, grid, position, zoneIdx, selected, cellSizeM, plantList,
    onHeaderMouseDown, onResizeMouseDown, onZoneDrop, onRemovePlant, onPlantResizeStart,
    onDelete, onStartRename, renameValue, onRenameChange, onRenameConfirm, onRenameCancel,
    isRenaming, resizePreview, plantResizePreview,
}) {
    const zoneType = detectZoneType(zone);
    const style    = ZONE_STYLES[zoneType] || ZONE_STYLES.general;
    const cellW    = Math.max(MIN_CELL, cellSizeM * CELL_PX);
    const cellH    = Math.max(MIN_CELL, cellSizeM * CELL_PX);

    const liveCols = resizePreview?.zoneIdx === zoneIdx ? resizePreview.cols : (grid[0]?.length || 1);
    const liveRows = resizePreview?.zoneIdx === zoneIdx ? resizePreview.rows : grid.length;
    const bodyW = liveCols * cellW;
    const bodyH = liveRows * cellH;

    // Compute which cells are covered by a multi-span block origin
    const coveredSet = new Set();
    grid.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (!cell?.plant) return;
            const sc = cell.spanCols || 1;
            const sr = cell.spanRows || 1;
            for (let dr = 0; dr < sr; dr++) {
                for (let dc = 0; dc < sc; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    coveredSet.add(`${r + dr},${c + dc}`);
                }
            }
        });
    });

    return (
        <div
            style={{
                position: 'absolute',
                left: position.x,
                top:  position.y,
                width: bodyW,
                border: `${style.bw}px solid ${style.border}`,
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: selected
                    ? `0 0 0 3px #a8d870, 0 4px 18px rgba(0,0,0,0.35)`
                    : '0 2px 10px rgba(0,0,0,0.28)',
                zIndex: selected ? 10 : 2,
                transition: 'box-shadow 0.12s',
                userSelect: 'none',
            }}
            onClick={e => e.stopPropagation()}
            onDragStart={e => e.preventDefault()}
        >
            {/* Header */}
            <div
                style={{ background: style.headerBg, height: HEADER_H, cursor: 'grab' }}
                className="flex items-center px-2 gap-1.5 select-none"
                onMouseDown={e => { e.preventDefault(); onHeaderMouseDown(e, zoneIdx, position); }}
            >
                <span className="text-white/40 text-sm pointer-events-none">⠿</span>
                {isRenaming ? (
                    <input autoFocus value={renameValue} onChange={onRenameChange}
                        onBlur={onRenameConfirm}
                        onKeyDown={e => { if (e.key === 'Enter') onRenameConfirm(); if (e.key === 'Escape') onRenameCancel(); }}
                        onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-white/25 text-white text-xs font-bold px-1.5 py-0.5 rounded outline-none"
                    />
                ) : (
                    <span className="text-white text-xs font-bold flex-1 truncate pointer-events-none">{zone}</span>
                )}
                <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onStartRename(zoneIdx, zone); }} className="text-white/50 hover:text-white text-xs">✏</button>
                <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete(zoneIdx); }} className="text-white/50 hover:text-white text-sm leading-none">×</button>
            </div>

            {/* Graph-paper canvas body */}
            <div
                style={{
                    position: 'relative',
                    width: bodyW,
                    height: bodyH,
                    backgroundColor: style.bg,
                    backgroundImage: [
                        `linear-gradient(${style.gridLine.replace(/[\d.]+\)$/, '0.28)')} 1px, transparent 1px)`,
                        `linear-gradient(90deg, ${style.gridLine.replace(/[\d.]+\)$/, '0.28)')} 1px, transparent 1px)`,
                        `linear-gradient(${style.gridLine} 1px, transparent 1px)`,
                        `linear-gradient(90deg, ${style.gridLine} 1px, transparent 1px)`,
                    ].join(', '),
                    backgroundSize: [
                        `${cellW * 5}px ${cellH * 5}px`, `${cellW * 5}px ${cellH * 5}px`,
                        `${cellW}px ${cellH}px`,          `${cellW}px ${cellH}px`,
                    ].join(', '),
                    overflow: 'visible',   // allow tooltips to escape zone body
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onZoneDrop(e, zoneIdx, cellH, cellW)}
            >
                {resizePreview?.zoneIdx === zoneIdx && (
                    <div className="absolute inset-0 border-2 border-dashed border-white/40 pointer-events-none z-10 rounded-sm" />
                )}

                {grid.flatMap((row, r) =>
                    row.map((cell, c) => {
                        if (!cell?.plant) return null;
                        if (coveredSet.has(`${r},${c}`)) return null;

                        // Apply live resize preview for this specific plant
                        const preview = plantResizePreview?.zoneIdx === zoneIdx
                            && plantResizePreview.row === r
                            && plantResizePreview.col === c
                            ? plantResizePreview : null;

                        const displayCell = preview
                            ? { ...cell, spanCols: preview.spanCols, spanRows: preview.spanRows }
                            : cell;

                        return (
                            <PlantBlock
                                key={`${r}-${c}`}
                                cell={displayCell}
                                row={r} col={c}
                                cellW={cellW} cellH={cellH}
                                cellSizeM={cellSizeM}
                                zoneIdx={zoneIdx}
                                plantList={plantList}
                                onRemove={() => onRemovePlant(zoneIdx, r, c, cell.spanRows || 1, cell.spanCols || 1)}
                                onPlantResizeStart={onPlantResizeStart}
                            />
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div
                style={{ height: FOOTER_H, background: style.headerBg + '12', borderTop: `1px solid ${style.border}30`, position: 'relative' }}
                className="flex items-center px-2"
            >
                <span className="flex-1 text-center text-[10px]" style={{ color: style.headerBg, opacity: 0.55 }}>
                    {resizePreview?.zoneIdx === zoneIdx
                        ? `${resizePreview.rows} × ${resizePreview.cols} cells`
                        : `${grid.length} × ${grid[0]?.length || 1} cells`}
                </span>
                <div className="absolute bottom-0 right-0 w-5 h-5 flex items-end justify-end pb-0.5 pr-0.5"
                    style={{ cursor: 'se-resize' }}
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeMouseDown(e, zoneIdx); }}
                    title="Drag to resize area">
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

// ── Main canvas ─────────────────────────────────────────────────────────────
export default function GardenCanvas({
    zones, grids, positions, setup, currentZone,
    onSelectZone, onUpdateGrid, onUpdatePositions,
    onAddZone, onDeleteZone, onRenameZone,
    plantList,
}) {
    const [dragState,          setDragState]          = useState(null);
    const [resizeState,        setResizeState]        = useState(null);
    const [plantResizeState,   setPlantResizeState]   = useState(null);
    const [livePos,            setLivePos]            = useState({});
    const [resizePreview,      setResizePreview]      = useState(null);
    const [plantResizePreview, setPlantResizePreview] = useState(null);
    const [pendingDrop,        setPendingDrop]        = useState(null);
    const [addZoneOpen,        setAddZoneOpen]        = useState(false);
    const [renaming,           setRenaming]           = useState(null);

    const cellSizeM = setup.cellSizeM || 1;
    const cellW = Math.max(MIN_CELL, cellSizeM * CELL_PX);
    const cellH = Math.max(MIN_CELL, cellSizeM * CELL_PX);

    // ── Zone drag ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!dragState) return;
        const { zoneIdx, startX, startY, origX, origY, basePositions } = dragState;
        const onMove = (e) => setLivePos(prev => ({
            ...prev,
            [zoneIdx]: { x: Math.max(0, origX + (e.clientX - startX)), y: Math.max(0, origY + (e.clientY - startY)) },
        }));
        const onUp = (e) => {
            const updated = [...basePositions];
            updated[zoneIdx] = { x: Math.max(0, origX + (e.clientX - startX)), y: Math.max(0, origY + (e.clientY - startY)) };
            onUpdatePositions(updated);
            setLivePos({});
            setDragState(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragState]);

    // ── Zone resize ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!resizeState) return;
        const { zoneIdx, startX, startY, origCols, origRows, cw, ch, grid } = resizeState;
        const onMove = (e) => setResizePreview({
            zoneIdx,
            cols: Math.max(1, origCols + Math.round((e.clientX - startX) / cw)),
            rows: Math.max(1, origRows + Math.round((e.clientY - startY) / ch)),
        });
        const onUp = (e) => {
            const newCols = Math.max(1, origCols + Math.round((e.clientX - startX) / cw));
            const newRows = Math.max(1, origRows + Math.round((e.clientY - startY) / ch));
            onUpdateGrid(zoneIdx, resizeGridLocal(grid, newRows, newCols));
            setResizePreview(null);
            setResizeState(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [resizeState]);

    // ── Plant block resize ────────────────────────────────────────────────
    useEffect(() => {
        if (!plantResizeState) return;
        const { zoneIdx, row, col, startX, startY, origSC, origSR, cw, ch, gridCols, gridRows, cornerIdx, grid } = plantResizeState;

        const calc = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            // Corner 0 = ↘, 1 = ↙, 2 = ↗, 3 = ↖
            const signX = cornerIdx === 0 || cornerIdx === 2 ? 1 : -1;
            const signY = cornerIdx === 0 || cornerIdx === 1 ? 1 : -1;
            const newSC = Math.max(1, Math.min(origSC + signX * Math.round(dx / cw), gridCols - col));
            const newSR = Math.max(1, Math.min(origSR + signY * Math.round(dy / ch), gridRows - row));
            return { newSC, newSR };
        };

        const onMove = (e) => {
            const { newSC, newSR } = calc(e);
            setPlantResizePreview({ zoneIdx, row, col, spanCols: newSC, spanRows: newSR });
        };

        const onUp = (e) => {
            const { newSC, newSR } = calc(e);
            // Update origin cell span; zero out newly covered cells
            const newGrid = grid.map((r, ri) => r.map((c, ci) => {
                if (ri === row && ci === col) return { ...c, spanCols: newSC, spanRows: newSR };
                if (ri >= row && ri < row + newSR && ci >= col && ci < col + newSC) return null; // zero covered
                return c;
            }));
            onUpdateGrid(zoneIdx, newGrid);
            setPlantResizePreview(null);
            setPlantResizeState(null);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [plantResizeState]);

    // ── Interaction starters ──────────────────────────────────────────────
    const handleHeaderMouseDown = (e, zoneIdx, pos) => {
        e.preventDefault();
        onSelectZone(zoneIdx);
        setDragState({ zoneIdx, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, basePositions: positions });
    };

    const handleResizeMouseDown = (e, zoneIdx) => {
        e.preventDefault();
        onSelectZone(zoneIdx);
        const grid = grids[zoneIdx];
        setResizeState({ zoneIdx, startX: e.clientX, startY: e.clientY, origCols: grid[0]?.length || 1, origRows: grid.length, cw: cellW, ch: cellH, grid });
    };

    const handlePlantResizeStart = (e, zoneIdx, row, col, origSC, origSR, cornerIdx) => {
        const grid = grids[zoneIdx];
        setPlantResizeState({
            zoneIdx, row, col,
            startX: e.clientX, startY: e.clientY,
            origSC, origSR, cornerIdx,
            cw: cellW, ch: cellH,
            gridCols: grid[0]?.length || 1,
            gridRows: grid.length,
            grid,
        });
    };

    // ── Drop handler ──────────────────────────────────────────────────────
    const handleZoneDrop = (e, zoneIdx, dropCH, dropCW) => {
        e.preventDefault();
        e.stopPropagation();
        const raw = e.dataTransfer.getData('plant');
        if (!raw) return;
        try {
            const dropped = JSON.parse(raw);
            const rect = e.currentTarget.getBoundingClientRect();
            const colIndex = Math.max(0, Math.min(Math.floor((e.clientX - rect.left) / dropCW), (grids[zoneIdx][0]?.length || 1) - 1));
            const rowIndex = Math.max(0, Math.min(Math.floor((e.clientY - rect.top)  / dropCH), (grids[zoneIdx]?.length || 1) - 1));

            // ── Move existing plant block ──
            if (dropped.fromZone !== undefined) {
                const { fromZone, fromRow, fromCol, spanCols: dSC = 1, spanRows: dSR = 1 } = dropped;
                const cell = grids[fromZone]?.[fromRow]?.[fromCol];
                if (!cell || (fromZone === zoneIdx && fromRow === rowIndex && fromCol === colIndex)) return;

                const clearSrc = (g, fz) => g.map((row, r) => row.map((c, col) =>
                    r >= fromRow && r < fromRow + dSR && col >= fromCol && col < fromCol + dSC ? null : c
                ));
                const placeAt = (g) => g.map((row, r) => row.map((c, co) => {
                    if (r === rowIndex && co === colIndex) return cell;
                    if (r >= rowIndex && r < rowIndex + dSR && co >= colIndex && co < colIndex + dSC) return null;
                    return c;
                }));

                if (fromZone === zoneIdx) {
                    onUpdateGrid(zoneIdx, placeAt(clearSrc(grids[zoneIdx])));
                } else {
                    onUpdateGrid(fromZone, clearSrc(grids[fromZone]));
                    onUpdateGrid(zoneIdx, placeAt(grids[zoneIdx]));
                }
                return;
            }

            // ── Structure ──
            if (dropped.isStructure) {
                const def = STRUCTURE_MAP[dropped.name];
                const newCell = { plant: dropped.name, isStructure: true, iconData: dropped.icon || def?.icon, structureColor: dropped.color || def?.color, notes: '', spanCols: 1, spanRows: 1 };
                onUpdateGrid(zoneIdx, grids[zoneIdx].map((row, r) => row.map((c, col) => r === rowIndex && col === colIndex ? newCell : c)));
                return;
            }

            // ── New plant from sidebar ──
            const fullPlant = plantList.find(p => p.name === dropped.name);
            const zt = fullPlant?.planting?.zoneTimes?.[setup.hardinessZone || '7b'];
            const suggestedDate = zt?.directSow || zt?.transplant || new Date().toISOString().split('T')[0];
            setPendingDrop({ zoneIdx, rowIndex, colIndex, plant: dropped, fullPlant, suggestedDate });
        } catch (err) {
            console.error('Drop error', err);
        }
    };

    const handleConfirmDrop = ({ date, notes }) => {
        const { zoneIdx, rowIndex, colIndex, plant, fullPlant } = pendingDrop;
        const plantedDate = new Date(date);
        let expectedHarvest = null;
        if (fullPlant?.planting?.daysToMaturity) {
            const h = new Date(plantedDate);
            h.setDate(h.getDate() + fullPlant.planting.daysToMaturity);
            expectedHarvest = h.toISOString().split('T')[0];
        }
        const newCell = { plant: plant.name, plantedDate: plantedDate.toISOString().split('T')[0], expectedHarvest, notes, iconData: plant.iconData, spanCols: 1, spanRows: 1 };
        onUpdateGrid(zoneIdx, grids[zoneIdx].map((row, r) => row.map((c, co) => r === rowIndex && co === colIndex ? newCell : c)));
        setPendingDrop(null);
    };

    const handleRemovePlant = (zoneIdx, row, col, spanRows = 1, spanCols = 1) => {
        // Clear origin + all covered cells
        onUpdateGrid(zoneIdx, grids[zoneIdx].map((r, ri) =>
            r.map((c, ci) => ri >= row && ri < row + spanRows && ci >= col && ci < col + spanCols ? null : c)
        ));
    };

    const handleRenameConfirm = () => {
        if (!renaming) return;
        const updated = [...zones];
        updated[renaming.idx] = renaming.value.trim() || zones[renaming.idx];
        onRenameZone(updated);
        setRenaming(null);
    };

    const activePos = zones.map((_, i) => ({
        ...(positions[i] || { x: (i % 3) * 340 + 20, y: Math.floor(i / 3) * 300 + 20 }),
        ...(livePos[i] || {}),
    }));

    const canvasW = Math.max(1400, ...activePos.map((p, i) => p.x + (grids[i]?.[0]?.length || 1) * cellW + 100));
    const canvasH = Math.max(800,  ...activePos.map((p, i) => p.y + HEADER_H + (grids[i]?.length || 1) * cellH + FOOTER_H + 80));

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2 bg-[#2d4a2a] flex-shrink-0">
                <span className="text-white font-semibold text-sm">{setup.gardenName || 'My Garden'}</span>
                <span className="text-green-300/50 text-xs">· {setup.widthM}m × {setup.heightM}m</span>
                <div className="flex-1" />
                <span className="text-green-300/40 text-xs hidden lg:inline">
                    Drag header to move area · Drag corner ⠿ to resize area · Hover plant → drag corners to multiply
                </span>
                <button onClick={() => setAddZoneOpen(true)}
                    className="bg-white/15 hover:bg-white/25 text-white text-xs px-3 py-1.5 rounded-lg font-medium border border-white/20 transition-colors">
                    + Add Area
                </button>
            </div>

            <div
                className="relative overflow-auto flex-1"
                style={{
                    cursor: dragState ? 'grabbing' : resizeState || plantResizeState ? 'crosshair' : 'default',
                    background: '#3d6b34',
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
                onClick={() => onSelectZone(-1)}
            >
                <div style={{ width: canvasW, height: canvasH, position: 'absolute', pointerEvents: 'none' }} />

                {zones.map((zone, zoneIdx) => (
                    <ZoneBlock
                        key={zoneIdx}
                        zone={zone}
                        grid={grids[zoneIdx] || []}
                        position={activePos[zoneIdx]}
                        zoneIdx={zoneIdx}
                        selected={currentZone === zoneIdx}
                        cellSizeM={cellSizeM}
                        plantList={plantList}
                        onHeaderMouseDown={handleHeaderMouseDown}
                        onResizeMouseDown={handleResizeMouseDown}
                        onZoneDrop={handleZoneDrop}
                        onRemovePlant={handleRemovePlant}
                        onPlantResizeStart={handlePlantResizeStart}
                        onDelete={onDeleteZone}
                        onStartRename={(idx, name) => setRenaming({ idx, value: name })}
                        isRenaming={renaming?.idx === zoneIdx}
                        renameValue={renaming?.value ?? ''}
                        onRenameChange={e => setRenaming(s => ({ ...s, value: e.target.value }))}
                        onRenameConfirm={handleRenameConfirm}
                        onRenameCancel={() => setRenaming(null)}
                        resizePreview={resizePreview}
                        plantResizePreview={plantResizePreview}
                    />
                ))}
            </div>

            {addZoneOpen && (
                <AddZoneModal onAdd={name => { onAddZone(name); setAddZoneOpen(false); }} onClose={() => setAddZoneOpen(false)} />
            )}
            {pendingDrop && (
                <PlantingModal plant={pendingDrop.plant} suggestedDate={pendingDrop.suggestedDate} onConfirm={handleConfirmDrop} onCancel={() => setPendingDrop(null)} />
            )}
        </div>
    );
}
