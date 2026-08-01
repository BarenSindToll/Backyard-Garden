import { useEffect, useRef, useState } from 'react';
import { GENERAL_STRUCTURES_MAP, GENERAL_KEYS_SET } from '../gardenZoneConfig';
import { LUCIDE_ICONS_MAP } from './icons';
import { resolveIconSrc } from './iconUtils';
import { StructureVisual } from './StructureVisual';
import { getOverlayVisualStyle } from './overlayVisualStyle';
import { BedRowPreview, BedBlockPreview, VegGardenPreview } from './BedPreviews';
import { LINEAR_STRUCTURES, CIRCULAR_STRUCTURES, BED_LIKE_STRUCTURES, MAP_ACTION_BUTTON_STYLE, PAPER_LABEL_STYLE } from './sharedConstants';

// Structures that show the rotation handle
const ROTATABLE_STRUCTURES = new Set(['Path', 'Fence', 'Raised Bed', 'carRoad', 'Car Road']);
// Overlay items that open a zone tab when clicked — productive areas only
const ZONE_PORTAL_TYPES = new Set([
    'vegetableGarden', 'greenhouse', 'guild', 'orchard', 'berryPatch', 'pond', 'stapleCrops',
]);
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

// ── Free-floating overlay item ────────────────────────────────────────────────
export function OverlayItem({ item, pxPerM, zoom = 1, onMouseDown, onRemove, onResizeStart, onRotateStart, onSelectBed, selectedBedId, bedLayout, selectedBedElementId, onSelectBedElement, onUpdateBedLayout, onOpenZonePortal, zoneBeds = [] }) {
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
