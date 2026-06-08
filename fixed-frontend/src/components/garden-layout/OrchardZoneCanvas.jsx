import React, { useMemo, useEffect, useState } from 'react';
import { RULER_SIZE, HorizontalRuler, VerticalRuler, mapCanvasBg } from './MapComponents';

// ── Helpers ───────────────────────────────────────────────────────────────────
function genId(p = 'id') { return `${p}-${Math.random().toString(36).slice(2, 9)}`; }

function resolveIcon(iconData) {
    if (!iconData) return null;
    if (iconData.startsWith('data:') || iconData.startsWith('http')) return iconData;
    if (iconData.startsWith('<svg')) return `data:image/svg+xml;utf8,${encodeURIComponent(iconData)}`;
    return null;
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

// ── Default orchard content ───────────────────────────────────────────────────
const TREE_VARIANTS = [
    'Apple', 'Pear', 'Plum', 'Cherry', 'Peach', 'Apricot', 'Apple', 'Pear', 'Walnut', 'Quince',
];
const DEFAULT_COMPANIONS = [
    { name: 'Comfrey',    role: 'dynamicAccumulator' },
    { name: 'Garlic',     role: 'pestRepellent'      },
    { name: 'Strawberry', role: 'groundCover'         },
    { name: 'Nasturtium', role: 'companion'           },
    { name: 'Yarrow',     role: 'pollinator'          },
    { name: 'Borage',     role: 'pollinator'          },
];

function buildDefaultOrchard(wM, hM) {
    const SPACING = 5.0;
    const cols = Math.max(2, Math.min(5, Math.floor(wM / SPACING)));
    const rows = Math.max(1, Math.min(4, Math.floor(hM / SPACING)));

    const padX = wM * 0.08;
    const padY = hM * 0.10;
    const usableW = wM - padX * 2;
    const usableH = hM - padY * 2;
    const hGap = cols > 1 ? usableW / (cols - 1) : 0;
    const vGap = rows > 1 ? usableH / (rows - 1) : 0;

    const trees = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            trees.push({
                id: genId('tree'),
                type: 'orchardTree',
                treeName: TREE_VARIANTS[idx % TREE_VARIANTS.length],
                xM: padX + c * hGap,
                yM: padY + r * vGap,
                guildRadiusM: Math.min(SPACING * 0.40, 2.1),
                companions: DEFAULT_COMPANIONS.map(c => ({ ...c, id: genId('comp') })),
            });
        }
    }
    return trees;
}

// ── Orchard Guild (single tree + companions) ──────────────────────────────────
function OrchardGuild({ tree, pxM, plantList, selected, onSelect }) {
    const [hovered, setHovered] = useState(false);

    const cx = tree.xM * pxM;
    const cy = tree.yM * pxM;
    const gR  = (tree.guildRadiusM || 2.0) * pxM;
    const mulchR  = gR * 0.87;
    const innerR  = gR * 0.54;
    const compRng = gR * 0.76;
    const compSz  = Math.max(11, Math.min(20, gR * 0.22));
    const treeSz  = Math.max(18, Math.min(32, innerR * 0.85));

    const treePlant = lookupPlant(tree.treeName, plantList);
    const treeIcon  = resolveIcon(treePlant?.iconData);

    return (
        <g
            style={{ cursor: 'pointer' }}
            onClick={onSelect}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Drop shadow */}
            <circle cx={cx} cy={cy + gR * 0.07} r={gR * 0.88}
                fill="rgba(0,0,0,0.10)" />

            {/* Outer guild boundary */}
            <circle cx={cx} cy={cy} r={gR}
                fill="rgba(148,174,108,0.28)"
                stroke={selected || hovered ? 'rgba(90,120,50,0.6)' : 'rgba(100,130,60,0.18)'}
                strokeWidth={selected ? 2 : 1}
            />

            {/* Mulch ring */}
            <circle cx={cx} cy={cy} r={mulchR} fill="#6b3a1c" />
            {/* Mulch texture dots */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
                const a = (deg * Math.PI) / 180;
                const dr = mulchR * 0.70;
                return (
                    <circle key={deg}
                        cx={cx + Math.cos(a) * dr}
                        cy={cy + Math.sin(a) * dr}
                        r={2}
                        fill="rgba(40,18,6,0.35)"
                    />
                );
            })}

            {/* Inner green basin */}
            <circle cx={cx} cy={cy} r={innerR} fill="#5c8a3a" />
            <circle cx={cx} cy={cy} r={innerR * 0.78} fill="#6a9a46" />
            <circle cx={cx} cy={cy} r={innerR * 0.48} fill="#74a850"
                opacity={0.7} />

            {/* Companion plants */}
            {(tree.companions || []).map((comp, i) => {
                const total = tree.companions.length;
                const angle = -Math.PI / 2 + (i / total) * 2 * Math.PI;
                const px = cx + Math.cos(angle) * compRng;
                const py = cy + Math.sin(angle) * compRng;
                const compPlant = lookupPlant(comp.name, plantList);
                const compIcon  = resolveIcon(compPlant?.iconData);
                const initials  = (comp.name || '?').slice(0, 2).toUpperCase();

                return (
                    <g key={comp.id || i}>
                        <title>{comp.name}</title>
                        {/* Soil pad */}
                        <circle cx={px} cy={py} r={compSz * 0.72} fill="#4e2a10" />
                        <circle cx={px} cy={py} r={compSz * 0.62}
                            fill={comp.role === 'pollinator' ? '#4a6a28' : comp.role === 'groundCover' ? '#3a5c22' : '#3e2810'}
                        />
                        {compIcon ? (
                            <image
                                href={compIcon}
                                x={px - compSz / 2}
                                y={py - compSz / 2}
                                width={compSz}
                                height={compSz}
                                style={{ imageRendering: 'crisp-edges' }}
                            />
                        ) : (
                            <text x={px} y={py + compSz * 0.18}
                                textAnchor="middle"
                                fontSize={Math.max(5, compSz * 0.42)}
                                fill="#e8dcc0"
                                fontWeight="700"
                                fontFamily="Inter, system-ui, sans-serif"
                            >{initials}</text>
                        )}
                    </g>
                );
            })}

            {/* Main tree icon */}
            {treeIcon ? (
                <image
                    href={treeIcon}
                    x={cx - treeSz / 2}
                    y={cy - treeSz / 2}
                    width={treeSz}
                    height={treeSz}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
                />
            ) : (
                <text x={cx} y={cy + treeSz * 0.18}
                    textAnchor="middle"
                    fontSize={treeSz * 0.52}
                    fill="#f0e8c8"
                    fontWeight="700"
                    fontFamily="Inter, system-ui, sans-serif"
                >{(tree.treeName || '??').slice(0, 2).toUpperCase()}</text>
            )}

            {/* Tree name label */}
            <text x={cx} y={cy + gR + 13}
                textAnchor="middle"
                fontSize={10}
                fill="rgba(70,40,10,0.8)"
                fontWeight={600}
                fontFamily="Inter, system-ui, sans-serif"
            >{tree.treeName}</text>
        </g>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OrchardZoneCanvas({
    zoneName,
    items = [],
    onUpdateItems,
    plantList = [],
    setup,
    zoneWidthM,
    zoneHeightM,
}) {
    const wM = zoneWidthM  || 20;
    const hM = zoneHeightM || 15;

    // Adaptive scale — larger zones get fewer px/m so the whole layout fits
    const pxM = Math.min(70, Math.max(35, Math.floor(850 / Math.max(wM, hM))));
    const svgW = wM * pxM;
    const svgH = hM * pxM;

    const [selectedId, setSelectedId] = useState(null);

    // Build tree list from saved items or generate defaults
    const orchardTrees = useMemo(() => {
        const existing = items.filter(it => it.type === 'orchardTree');
        return existing.length > 0 ? existing : buildDefaultOrchard(wM, hM);
    }, [items, wM, hM]);

    // Persist auto-generated layout on first load
    useEffect(() => {
        if (!items.some(it => it.type === 'orchardTree') && orchardTrees.length > 0) {
            onUpdateItems?.(orchardTrees);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Compute row Y values for access lanes
    const rowYs = useMemo(() => {
        const ys = [...new Set(orchardTrees.map(t => Math.round(t.yM * 10) / 10))].sort((a, b) => a - b);
        return ys;
    }, [orchardTrees]);

    const laneMidpoints = useMemo(() => {
        const out = [];
        for (let i = 0; i < rowYs.length - 1; i++) {
            out.push((rowYs[i] + rowYs[i + 1]) / 2);
        }
        return out;
    }, [rowYs]);

    const laneHalfH = pxM * 0.45;

    // Summary label
    const treeNames = [...new Set(orchardTrees.map(t => t.treeName))].slice(0, 4).join(' · ');

    const bgStyle = mapCanvasBg(pxM);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Scrollable ruler + canvas area */}
            <div className="overflow-auto flex-1" style={{ display: 'flex' }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', margin: 'auto' }}>
                    {/* Ruler row */}
                    <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 25 }}>
                        <div style={{ width: RULER_SIZE, height: RULER_SIZE, flexShrink: 0, background: '#1d3a20', position: 'sticky', left: 0, zIndex: 30 }} />
                        <HorizontalRuler widthM={wM} pxPerM={pxM} />
                    </div>
                    {/* Canvas row */}
                    <div style={{ display: 'flex' }}>
                        <div style={{ position: 'sticky', left: 0, zIndex: 25, flexShrink: 0 }}>
                            <VerticalRuler heightM={hM} pxPerM={pxM} />
                        </div>
                        {/* Canvas div with same beige background as General map */}
                        <div style={{ position: 'relative', width: svgW, height: svgH, flexShrink: 0, ...bgStyle }}>
                <svg
                    width={svgW}
                    height={svgH}
                    style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
                    onClick={e => { if (e.target.tagName === 'svg' || e.target.tagName === 'rect') setSelectedId(null); }}
                >
                    <defs>
                        {/* Access lane texture */}
                        <pattern id="lane-hatch" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                            <line x1="0" y1="8" x2="8" y2="0" stroke="rgba(160,125,75,0.12)" strokeWidth="1" />
                        </pattern>
                    </defs>

                    {/* Orchard row tint strips (very subtle) */}
                    {rowYs.map((ry, i) => (
                        <rect key={i}
                            x={0}
                            y={(ry - (orchardTrees[0]?.guildRadiusM || 2.0)) * pxM - 4}
                            width={svgW}
                            height={((orchardTrees[0]?.guildRadiusM || 2.0) * 2) * pxM + 8}
                            fill={i % 2 === 0 ? 'rgba(160,185,120,0.06)' : 'rgba(140,165,100,0.04)'}
                        />
                    ))}

                    {/* Access lanes between rows */}
                    {laneMidpoints.map((mid, i) => (
                        <g key={i}>
                            <rect
                                x={svgW * 0.03}
                                y={mid * pxM - laneHalfH}
                                width={svgW * 0.94}
                                height={laneHalfH * 2}
                                rx={3}
                                fill="rgba(175,145,90,0.22)"
                            />
                            <rect
                                x={svgW * 0.03}
                                y={mid * pxM - laneHalfH}
                                width={svgW * 0.94}
                                height={laneHalfH * 2}
                                rx={3}
                                fill="url(#lane-hatch)"
                            />
                            {/* Lane edge lines */}
                            <line x1={svgW * 0.03} y1={mid * pxM - laneHalfH} x2={svgW * 0.97} y2={mid * pxM - laneHalfH} stroke="rgba(140,110,60,0.2)" strokeWidth={1} />
                            <line x1={svgW * 0.03} y1={mid * pxM + laneHalfH} x2={svgW * 0.97} y2={mid * pxM + laneHalfH} stroke="rgba(140,110,60,0.2)" strokeWidth={1} />
                        </g>
                    ))}

                    {/* Orchard guilds */}
                    {orchardTrees.map(tree => (
                        <OrchardGuild
                            key={tree.id}
                            tree={tree}
                            pxM={pxM}
                            plantList={plantList}
                            selected={selectedId === tree.id}
                            onSelect={() => setSelectedId(prev => prev === tree.id ? null : tree.id)}
                        />
                    ))}
                </svg>
                        </div>{/* canvas bg div */}
                    </div>{/* canvas row */}
                </div>{/* inline-flex col */}
            </div>{/* scroll container */}

            {/* Selected tree info panel */}
            {selectedId && (() => {
                const tree = orchardTrees.find(t => t.id === selectedId);
                if (!tree) return null;
                return (
                    <div style={{
                        flexShrink: 0,
                        padding: '7px 14px',
                        background: 'rgba(235,220,190,0.95)',
                        borderTop: '1px solid rgba(120,90,50,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#5a3a10' }}>
                            {tree.treeName}
                        </span>
                        <span style={{ fontSize: 10, color: '#7a5530' }}>
                            Guild radius: {tree.guildRadiusM?.toFixed(1)} m
                        </span>
                        <span style={{ fontSize: 10, color: '#7a5530' }}>
                            Position: {tree.xM?.toFixed(1)} m, {tree.yM?.toFixed(1)} m
                        </span>
                        {(tree.companions || []).map((c, i) => (
                            <span key={i} style={{
                                fontSize: 9, padding: '1px 6px', borderRadius: 10,
                                background: 'rgba(100,70,30,0.12)', color: '#6a4520',
                            }}>{c.name}</span>
                        ))}
                        <button
                            onClick={() => setSelectedId(null)}
                            style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(100,70,30,0.3)', background: 'transparent', color: '#7a5530', cursor: 'pointer' }}
                        >Close</button>
                    </div>
                );
            })()}
        </div>
    );
}
