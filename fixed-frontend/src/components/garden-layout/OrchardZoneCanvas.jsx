import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { RULER_SIZE, HorizontalRuler, VerticalRuler, mapCanvasBg } from './MapComponents';

// ── Helpers ───────────────────────────────────────────────────────────────────
function genId(p = 'id') { return `${p}-${Math.random().toString(36).slice(2, 9)}`; }

function resolveIcon(iconData) {
    if (!iconData) return null;
    if (iconData.startsWith('data:') || iconData.startsWith('http')) return iconData;
    if (iconData.startsWith('<svg')) return `data:image/svg+xml;utf8,${encodeURIComponent(iconData)}`;
    return `data:image/svg+xml;base64,${iconData}`;
}

function lookupPlant(name, plantList = []) {
    if (!name || !plantList.length) return null;
    const n = name.toLowerCase().trim();
    return (
        plantList.find(p => p.name?.toLowerCase() === n) ||
        plantList.find(p => p.name?.toLowerCase().startsWith(n)) ||
        plantList.find(p => n.startsWith(p.name?.toLowerCase().split(' ')[0] || '___'))
    ) ?? null;
}

// ── Default data ──────────────────────────────────────────────────────────────
const TREE_VARIANTS = ['Apple', 'Pear', 'Plum', 'Cherry', 'Peach', 'Apricot', 'Walnut', 'Quince', 'Fig', 'Mulberry'];
const DEFAULT_COMPANIONS = [
    { name: 'Comfrey',    role: 'dynamicAccumulator' },
    { name: 'Garlic',     role: 'pestRepellent'      },
    { name: 'Strawberry', role: 'groundCover'         },
    { name: 'Nasturtium', role: 'companion'           },
    { name: 'Yarrow',     role: 'pollinator'          },
];

// ── Layout ────────────────────────────────────────────────────────────────────
function calcGrid(count, wM, hM) {
    const a = wM / Math.max(hM, 0.1);
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count === 2) return a >= 1.2 ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 };
    if (count === 3) return a >= 1.5 ? { cols: 3, rows: 1 } : { cols: 2, rows: 2 };
    if (count === 4) return { cols: 2, rows: 2 };
    if (count <= 6)  return { cols: 3, rows: 2 };
    if (count <= 9)  return { cols: 3, rows: 3 };
    const cols = Math.ceil(Math.sqrt(count * a));
    return { cols, rows: Math.ceil(count / cols) };
}

function computeGrid(count, wM, hM) {
    const zW = Math.max(wM, 10), zH = Math.max(hM, 8);
    const { cols, rows } = calcGrid(count, zW, zH);
    const padM  = Math.max(1.5, Math.min(zW * 0.10, zH * 0.10));
    const cellW = (zW - 2 * padM) / cols;
    const cellH = (zH - 2 * padM - 1.2) / rows;
    const guildR = Math.min(3.5, Math.max(0.8, Math.min(cellW * 0.42, cellH * 0.42)));
    return { cols, rows, padM, cellW, cellH, guildR };
}

function buildDefaultOrchard(wM, hM) {
    const count = 4;
    const { cols, padM, cellW, cellH, guildR } = computeGrid(count, wM, hM);
    return Array.from({ length: count }, (_, idx) => ({
        id: genId('tree'),
        type: 'orchardTree',
        treeName: TREE_VARIANTS[idx % TREE_VARIANTS.length],
        xM: padM + (idx % cols + 0.5) * cellW,
        yM: padM + (Math.floor(idx / cols) + 0.5) * cellH,
        guildRadiusM: guildR,
        companions: DEFAULT_COMPANIONS.map(c => ({ ...c, id: genId('comp') })),
    }));
}

function applyLayout(trees, wM, hM) {
    const { cols, padM, cellW, cellH, guildR } = computeGrid(trees.length, wM, hM);
    return trees.map((tree, idx) => ({
        ...tree,
        xM: padM + (idx % cols + 0.5) * cellW,
        yM: padM + (Math.floor(idx / cols) + 0.5) * cellH,
        guildRadiusM: tree.guildRadiusM ?? guildR,
    }));
}

const COMP_BG = {
    pollinator:         '#4a6a28',
    groundCover:        '#3a5c22',
    dynamicAccumulator: '#3a4e28',
    pestRepellent:      '#4a3810',
    nitrogen:           '#2e4a3a',
    companion:          '#3e2810',
};

// ── OrchardGuild ──────────────────────────────────────────────────────────────
function OrchardGuild({
    tree, pxM, plantList, selected, isGuildDragging,
    draggingCompIdx, onGuildPointerDown, onCompPointerDown, onSelect,
    dropZone,            // null | 'tree' | 'companion'
    onCompDblClick,      // (compIdx) => remove companion
}) {
    const cx = tree.xM * pxM;
    const cy = tree.yM * pxM;
    const gR     = (tree.guildRadiusM || 2.0) * pxM;
    const mulchR = gR * 0.87;
    const innerR = gR * 0.54;
    const compR  = gR * 0.76;
    const compSz = Math.max(10, Math.min(20, gR * 0.22));
    const treeSz = Math.max(16, Math.min(30, innerR * 0.85));

    const treePlant = lookupPlant(tree.treeName, plantList);
    const treeIcon  = treePlant?.iconData ? resolveIcon(treePlant.iconData) : null;

    const isDropTree = dropZone === 'tree';
    const isDropComp = dropZone === 'companion';

    return (
        <g>
            {/* Hit area for guild drag */}
            <circle cx={cx} cy={cy} r={gR}
                fill="transparent"
                style={{ cursor: isGuildDragging ? 'grabbing' : 'grab' }}
                onPointerDown={e => { e.stopPropagation(); onGuildPointerDown(e); }}
                onClick={e => { e.stopPropagation(); onSelect(); }}
            />

            {/* Shadow */}
            <circle cx={cx} cy={cy + gR * 0.06} r={gR * 0.87}
                fill="rgba(0,0,0,0.07)" style={{ pointerEvents: 'none' }} />

            {/* Outer halo — highlights when a plant is dragged over companion ring */}
            <circle cx={cx} cy={cy} r={gR}
                fill={isDropComp ? 'rgba(100,180,80,0.22)' : isGuildDragging ? 'rgba(148,174,108,0.32)' : 'rgba(148,174,108,0.18)'}
                stroke={isDropComp ? 'rgba(60,140,40,0.80)' : selected || isGuildDragging ? 'rgba(80,115,40,0.65)' : 'rgba(100,130,60,0.18)'}
                strokeWidth={isDropComp ? 2.5 : selected || isGuildDragging ? 2 : 1}
                strokeDasharray={isDropComp || selected || isGuildDragging ? undefined : '5 3'}
                style={{ pointerEvents: 'none' }}
            />
            {isDropComp && (
                <circle cx={cx} cy={cy} r={gR - 2}
                    fill="none" stroke="rgba(100,200,70,0.35)" strokeWidth={4}
                    style={{ pointerEvents: 'none' }}
                />
            )}

            {/* Mulch ring */}
            <circle cx={cx} cy={cy} r={mulchR} fill="#6b3a1c" style={{ pointerEvents: 'none' }} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
                const a = deg * Math.PI / 180;
                return (
                    <circle key={deg}
                        cx={cx + Math.cos(a) * mulchR * 0.70}
                        cy={cy + Math.sin(a) * mulchR * 0.70}
                        r={Math.max(1.5, gR * 0.024)}
                        fill="rgba(40,18,6,0.28)"
                        style={{ pointerEvents: 'none' }}
                    />
                );
            })}

            {/* Green basin — highlights when a tree is dragged over center */}
            <circle cx={cx} cy={cy} r={innerR}
                fill={isDropTree ? '#78c040' : '#5c8a3a'}
                style={{ pointerEvents: 'none' }}
            />
            <circle cx={cx} cy={cy} r={innerR * 0.78}
                fill={isDropTree ? '#88cc4a' : '#6a9a46'}
                style={{ pointerEvents: 'none' }}
            />
            <circle cx={cx} cy={cy} r={innerR * 0.48}
                fill={isDropTree ? '#96d456' : '#74a850'}
                opacity={0.7} style={{ pointerEvents: 'none' }}
            />
            {isDropTree && (
                <circle cx={cx} cy={cy} r={innerR + 3}
                    fill="none" stroke="rgba(90,200,50,0.70)" strokeWidth={2.5}
                    style={{ pointerEvents: 'none' }}
                />
            )}

            {/* Companions */}
            {(tree.companions || []).map((comp, i) => {
                const total = tree.companions.length;
                const angle = comp.angle ?? (-Math.PI / 2 + (i / total) * 2 * Math.PI);
                const px = cx + Math.cos(angle) * compR;
                const py = cy + Math.sin(angle) * compR;
                const compPlant = lookupPlant(comp.name, plantList);
                const compIcon  = compPlant?.iconData ? resolveIcon(compPlant.iconData) : null;
                const initials  = (comp.name || '?').slice(0, 2).toUpperCase();
                const isThis    = draggingCompIdx === i;
                const bgColor   = COMP_BG[comp.role] ?? COMP_BG.companion;
                return (
                    <g key={comp.id || i}
                        style={{ cursor: selected ? (isThis ? 'grabbing' : 'grab') : 'default' }}
                        onPointerDown={e => { e.stopPropagation(); if (selected) onCompPointerDown(e, i); }}
                        onDoubleClick={e => { e.stopPropagation(); if (selected) onCompDblClick(i); }}
                    >
                        <title>{comp.name}{selected ? ' · double-click to remove' : ''}</title>
                        <circle cx={px} cy={py} r={compSz + 4} fill="transparent" />
                        <circle cx={px} cy={py} r={compSz * 0.72} fill="#4e2a10" />
                        <circle cx={px} cy={py} r={compSz * 0.62}
                            fill={bgColor}
                            stroke={selected ? 'rgba(255,255,255,0.30)' : 'none'}
                            strokeWidth={1}
                        />
                        {compIcon ? (
                            <image href={compIcon}
                                x={px - compSz / 2} y={py - compSz / 2}
                                width={compSz} height={compSz}
                                style={{ imageRendering: 'crisp-edges', pointerEvents: 'none' }}
                            />
                        ) : (
                            <text x={px} y={py + compSz * 0.18}
                                textAnchor="middle"
                                fontSize={Math.max(5, compSz * 0.42)}
                                fill="#e8dcc0" fontWeight="700"
                                fontFamily="Inter, system-ui, sans-serif"
                                style={{ pointerEvents: 'none' }}
                            >{initials}</text>
                        )}
                    </g>
                );
            })}

            {/* Tree icon / initials */}
            <g style={{ pointerEvents: 'none' }}>
                {treeIcon ? (
                    <image href={treeIcon}
                        x={cx - treeSz / 2} y={cy - treeSz / 2}
                        width={treeSz} height={treeSz}
                        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.40))' }}
                    />
                ) : (
                    <text x={cx} y={cy + treeSz * 0.18}
                        textAnchor="middle"
                        fontSize={treeSz * 0.52}
                        fill="#f0e8c8" fontWeight="700"
                        fontFamily="Inter, system-ui, sans-serif"
                    >{(tree.treeName || '??').slice(0, 2).toUpperCase()}</text>
                )}
            </g>

            {/* Name label */}
            <text x={cx} y={cy + gR + 14}
                textAnchor="middle"
                fontSize={Math.max(9, Math.min(12, gR * 0.12 + 8))}
                fill="rgba(70,40,10,0.80)" fontWeight={600}
                fontFamily="Inter, system-ui, sans-serif"
                style={{ pointerEvents: 'none' }}
            >{tree.treeName}</text>

            {selected && !isGuildDragging && (
                <text x={cx} y={cy + gR + 25}
                    textAnchor="middle" fontSize={8}
                    fill="rgba(90,60,20,0.42)"
                    fontFamily="Inter, system-ui, sans-serif"
                    style={{ pointerEvents: 'none' }}
                >drag · dbl-click companion to remove</text>
            )}
        </g>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OrchardZoneCanvas({
    zoneName, items = [], onUpdateItems, plantList = [], setup, zoneWidthM, zoneHeightM,
}) {
    const wM  = Math.max(zoneWidthM  || 20, 10);
    const hM  = Math.max(zoneHeightM || 15, 8);
    const pxM = Math.min(70, Math.max(30, Math.floor(850 / Math.max(wM, hM))));
    const svgW = wM * pxM;
    const svgH = hM * pxM;

    const svgRef = useRef(null);

    const [trees, setTrees] = useState(() => {
        const saved = items.filter(it => it.type === 'orchardTree');
        return saved.length > 0 ? applyLayout(saved, wM, hM) : buildDefaultOrchard(wM, hM);
    });
    const [selectedId, setSelectedId] = useState(null);
    const [drag,       setDrag]       = useState(null);
    // dropOver: null | { guildId, zone: 'tree'|'companion' }
    const [dropOver,   setDropOver]   = useState(null);

    // Persist defaults on first load
    useEffect(() => {
        if (!items.some(it => it.type === 'orchardTree')) {
            onUpdateItems?.(trees);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Stable refs
    const treesRef = useRef(trees);
    const dragRef  = useRef(drag);
    const pxMRef   = useRef(pxM);
    const wMRef    = useRef(wM);
    const hMRef    = useRef(hM);
    const cbRef    = useRef(onUpdateItems);
    useEffect(() => { treesRef.current = trees;         }, [trees]);
    useEffect(() => { dragRef.current  = drag;          }, [drag]);
    useEffect(() => { pxMRef.current   = pxM;           }, [pxM]);
    useEffect(() => { wMRef.current    = wM;            }, [wM]);
    useEffect(() => { hMRef.current    = hM;            }, [hM]);
    useEffect(() => { cbRef.current    = onUpdateItems; }, [onUpdateItems]);

    // ── Pointer drag (move guilds / rotate companions) ────────────────────────
    useEffect(() => {
        const onMove = (e) => {
            const ds = dragRef.current;
            if (!ds) return;
            if (ds.type === 'guild') {
                const { id, startX, startY, origXM, origYM } = ds;
                const tree = treesRef.current.find(t => t.id === id);
                if (!tree) return;
                const gR  = tree.guildRadiusM || 2.0;
                const ppm = pxMRef.current;
                const W = wMRef.current, H = hMRef.current;
                const newXM = Math.max(gR, Math.min(W - gR, origXM + (e.clientX - startX) / ppm));
                const newYM = Math.max(gR, Math.min(H - gR - 1.2, origYM + (e.clientY - startY) / ppm));
                setTrees(prev => prev.map(t => t.id === id ? { ...t, xM: newXM, yM: newYM } : t));
            } else if (ds.type === 'companion') {
                const { treeId, compIdx } = ds;
                const svgEl = svgRef.current;
                if (!svgEl) return;
                const rect = svgEl.getBoundingClientRect();
                const tree = treesRef.current.find(t => t.id === treeId);
                if (!tree) return;
                const dx = e.clientX - rect.left - tree.xM * pxMRef.current;
                const dy = e.clientY - rect.top  - tree.yM * pxMRef.current;
                const newAngle = Math.atan2(dy, dx);
                setTrees(prev => prev.map(t => {
                    if (t.id !== treeId) return t;
                    const comps = (t.companions || []).map((c, i) =>
                        i === compIdx ? { ...c, angle: newAngle } : c
                    );
                    return { ...t, companions: comps };
                }));
            }
        };
        const onUp = () => {
            if (!dragRef.current) return;
            setDrag(null);
            cbRef.current?.(treesRef.current);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, []);

    const startGuildDrag = useCallback((e, treeId) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        const tree = treesRef.current.find(t => t.id === treeId);
        if (!tree) return;
        setDrag({ type: 'guild', id: treeId, startX: e.clientX, startY: e.clientY, origXM: tree.xM, origYM: tree.yM });
    }, []);

    const startCompDrag = useCallback((e, treeId, compIdx) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        setDrag({ type: 'companion', treeId, compIdx });
    }, []);

    // ── HTML5 drag-and-drop from PlantSidebar ─────────────────────────────────
    const hitTestGuild = useCallback((clientX, clientY) => {
        const svgEl = svgRef.current;
        if (!svgEl) return null;
        const rect = svgEl.getBoundingClientRect();
        const mx = clientX - rect.left;
        const my = clientY - rect.top;
        for (const tree of treesRef.current) {
            const cx = tree.xM * pxMRef.current;
            const cy = tree.yM * pxMRef.current;
            const gR = (tree.guildRadiusM || 2.0) * pxMRef.current;
            const dx = mx - cx, dy = my - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= gR) {
                const innerR = gR * 0.54;
                const zone  = dist <= innerR ? 'tree' : 'companion';
                const angle = Math.atan2(dy, dx);
                return { guildId: tree.id, zone, angle };
            }
        }
        return null;
    }, []);

    const handleDragOver = useCallback((e) => {
        const hit = hitTestGuild(e.clientX, e.clientY);
        if (hit) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setDropOver(hit);
        } else {
            setDropOver(null);
        }
    }, [hitTestGuild]);

    const handleDragLeave = useCallback((e) => {
        // Only clear when leaving the SVG element itself
        if (!svgRef.current?.contains(e.relatedTarget)) {
            setDropOver(null);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDropOver(null);
        const raw = e.dataTransfer.getData('plant');
        if (!raw) return;
        let dropped;
        try { dropped = JSON.parse(raw); } catch { return; }
        if (dropped.isStructure) return;

        const hit = hitTestGuild(e.clientX, e.clientY);
        if (!hit) return;
        const { guildId, zone, angle } = hit;

        setTrees(prev => {
            const next = prev.map(tree => {
                if (tree.id !== guildId) return tree;
                if (zone === 'tree') {
                    return { ...tree, treeName: dropped.name };
                }
                // companion zone — add new companion at drop angle
                const newComp = {
                    id: genId('comp'),
                    name: dropped.name,
                    iconData: dropped.iconData || null,
                    role: 'companion',
                    angle,
                };
                return { ...tree, companions: [...(tree.companions || []), newComp] };
            });
            cbRef.current?.(next);
            return next;
        });
    }, [hitTestGuild]);

    // ── Remove companion on double-click ──────────────────────────────────────
    const removeCompanion = useCallback((treeId, compIdx) => {
        setTrees(prev => {
            const next = prev.map(t => {
                if (t.id !== treeId) return t;
                return { ...t, companions: (t.companions || []).filter((_, i) => i !== compIdx) };
            });
            cbRef.current?.(next);
            return next;
        });
    }, []);

    const laneZones = useMemo(() => {
        if (!trees.length) return [];
        const guildR = trees[0]?.guildRadiusM || 2.0;
        const rowYs  = [...new Set(trees.map(t => Math.round(t.yM * 10) / 10))].sort((a, b) => a - b);
        return rowYs.slice(0, -1).flatMap((ry, i) => {
            const top = ry + guildR, bot = rowYs[i + 1] - guildR;
            return bot > top + 0.4 ? [{ top, bot }] : [];
        });
    }, [trees]);

    const bgStyle      = mapCanvasBg(pxM);
    const treeNames    = [...new Set(trees.map(t => t.treeName))].slice(0, 5).join(' · ');
    const isGDragging  = drag?.type === 'guild';
    const selectedTree = trees.find(t => t.id === selectedId);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ flexShrink: 0, padding: '5px 16px', background: '#f7f0e0', borderBottom: '1px solid #e8e2cc', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#3a2408', fontFamily: 'Newsreader, Georgia, serif' }}>
                    {zoneName || 'Fruit Tree Orchard'}
                </span>
                <span style={{ fontSize: 11, color: '#7a5830' }}>
                    {trees.length} {trees.length === 1 ? 'tree' : 'trees'} · {treeNames}
                </span>
                <span style={{ fontSize: 10, color: '#b09060', marginLeft: 'auto', fontStyle: 'italic' }}>
                    drop plant on center to change tree · drop on ring to add companion
                </span>
            </div>

            {/* Canvas */}
            <div className="overflow-auto flex-1" style={{ display: 'flex' }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', margin: 'auto' }}>
                    <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 25 }}>
                        <div style={{ width: RULER_SIZE, height: RULER_SIZE, flexShrink: 0, background: '#1d3a20', position: 'sticky', left: 0, zIndex: 30 }} />
                        <HorizontalRuler widthM={wM} pxPerM={pxM} />
                    </div>
                    <div style={{ display: 'flex' }}>
                        <div style={{ position: 'sticky', left: 0, zIndex: 25, flexShrink: 0 }}>
                            <VerticalRuler heightM={hM} pxPerM={pxM} />
                        </div>
                        <div style={{ position: 'relative', width: svgW, height: svgH, flexShrink: 0, ...bgStyle }}>
                            <svg
                                ref={svgRef}
                                width={svgW} height={svgH}
                                style={{ display: 'block', position: 'absolute', top: 0, left: 0,
                                         cursor: isGDragging ? 'grabbing' : 'default',
                                         userSelect: 'none' }}
                                onClick={e => { if (e.target === svgRef.current) setSelectedId(null); }}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <defs>
                                    <pattern id="orchard-lane-hatch" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                                        <line x1="0" y1="8" x2="8" y2="0" stroke="rgba(160,125,75,0.08)" strokeWidth="1" />
                                    </pattern>
                                </defs>

                                {[...new Set(trees.map(t => Math.round(t.yM * 10) / 10))].map((ry, i) => {
                                    const gR = (trees[0]?.guildRadiusM || 2.0) * pxM;
                                    return (
                                        <rect key={i} x={0} y={ry * pxM - gR - 2} width={svgW} height={gR * 2 + 4}
                                            fill={i % 2 === 0 ? 'rgba(160,185,120,0.04)' : 'rgba(140,165,100,0.03)'}
                                        />
                                    );
                                })}

                                {laneZones.map((lane, i) => (
                                    <g key={i}>
                                        <rect x={svgW * 0.06} y={lane.top * pxM}
                                            width={svgW * 0.88} height={Math.max(3, (lane.bot - lane.top) * pxM)}
                                            rx={3} fill="rgba(175,145,90,0.11)" />
                                        <rect x={svgW * 0.06} y={lane.top * pxM}
                                            width={svgW * 0.88} height={Math.max(3, (lane.bot - lane.top) * pxM)}
                                            rx={3} fill="url(#orchard-lane-hatch)" />
                                        <line x1={svgW * 0.06} y1={lane.top * pxM} x2={svgW * 0.94} y2={lane.top * pxM}
                                            stroke="rgba(140,110,60,0.12)" strokeWidth={1} />
                                        <line x1={svgW * 0.06} y1={lane.bot * pxM} x2={svgW * 0.94} y2={lane.bot * pxM}
                                            stroke="rgba(140,110,60,0.12)" strokeWidth={1} />
                                    </g>
                                ))}

                                {trees.map(tree => (
                                    <OrchardGuild
                                        key={tree.id}
                                        tree={tree}
                                        pxM={pxM}
                                        plantList={plantList}
                                        selected={selectedId === tree.id}
                                        isGuildDragging={drag?.type === 'guild' && drag.id === tree.id}
                                        draggingCompIdx={drag?.type === 'companion' && drag.treeId === tree.id ? drag.compIdx : null}
                                        dropZone={dropOver?.guildId === tree.id ? dropOver.zone : null}
                                        onSelect={() => setSelectedId(prev => prev === tree.id ? null : tree.id)}
                                        onGuildPointerDown={e => startGuildDrag(e, tree.id)}
                                        onCompPointerDown={(e, ci) => startCompDrag(e, tree.id, ci)}
                                        onCompDblClick={ci => removeCompanion(tree.id, ci)}
                                    />
                                ))}
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info bar */}
            {selectedTree && (
                <div style={{ flexShrink: 0, padding: '7px 14px', background: 'rgba(235,220,190,0.97)', borderTop: '1px solid rgba(120,90,50,0.20)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#5a3a10' }}>{selectedTree.treeName}</span>
                    <span style={{ fontSize: 10, color: '#8a6540' }}>
                        {selectedTree.guildRadiusM?.toFixed(1)} m · {selectedTree.xM?.toFixed(1)}, {selectedTree.yM?.toFixed(1)} m
                    </span>
                    {(selectedTree.companions || []).map((c, i) => (
                        <span key={i}
                            title="Double-click companion on canvas to remove"
                            style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(100,70,30,0.12)', color: '#6a4520' }}
                        >{c.name}</span>
                    ))}
                    <button onClick={() => setSelectedId(null)}
                        style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(100,70,30,0.25)', background: 'transparent', color: '#7a5530', cursor: 'pointer' }}
                    >✕</button>
                </div>
            )}
        </div>
    );
}
