import { useEffect, useRef, useState } from 'react';
import { ZONE_TYPES, detectZoneType, GENERAL_STRUCTURES_MAP } from './gardenZoneConfig';
import { RULER_SIZE, goodInterval, HorizontalRuler, VerticalRuler } from './MapComponents';
import RaisedBedZoneCanvas from './RaisedBedZoneCanvas';
import OrchardZoneCanvas from './OrchardZoneCanvas';
import AddZoneModal from './AddZoneModal';
import ZoneTabs from './ZoneTabs';
import { useLanguage } from '../../utils/languageContext';
import ProposedElementsOverlay from '../permaculture/ProposedElementsOverlay';
import { CompassRose } from './canvas/CompassRose';
import { NeighbourhoodBands } from './canvas/NeighbourhoodBands';
import { OverlayItem } from './canvas/OverlayItem';
import { resolveIconSrc } from './canvas/iconUtils';
import { LINEAR_STRUCTURES, CIRCULAR_STRUCTURES, MAP_ACTION_BUTTON_STYLE, PAPER_LABEL_STYLE } from './canvas/sharedConstants';

const CELL_PX = 36;
const MIN_CELL = 28;
const HEADER_H = 34;
const FOOTER_H = 24;
const GENERAL_PX_PER_M = 10;
// RULER_SIZE, goodInterval, HorizontalRuler, VerticalRuler imported from MapComponents

// Default sizes in metres for each structure when first dropped on General map.
// Legacy display-name entries are kept as a defensive fallback for pre-MVP saved
// overlay items that predate the structureKey system.
const STRUCTURE_DEFAULTS = {
    Path: { wM: 20, hM: 1 },
    Greenhouse: { wM: 5, hM: 4 },
    Compost: { wM: 2, hM: 2 },
    Pond: { wM: 5, hM: 5 },
    House: { wM: 10, hM: 8 },
    Coop: { wM: 3, hM: 3 },
    'Raised Bed': { wM: 3, hM: 1.2 },
    // GENERAL_STRUCTURES keys — auto-derived from config
    ...Object.fromEntries(Object.values(GENERAL_STRUCTURES_MAP).map(s => [s.key, s.defaultSize])),
};

// MVP NOTE: this file used to contain a second, older zone-detail rendering
// system (ZoneItemLayer / PlantBlock / ZoneBlock + a `grids`-based plant grid,
// resize/rename/drop handlers, and a PlantingModal wired to it). It was fully
// superseded by RaisedBedZoneCanvas / OrchardZoneCanvas + the zoneItems/
// bedLayouts system and was never actually rendered (dead code with zero
// reachable JSX). Removed for MVP stability — see git history if needed.
// (ZoneCircle below is NOT part of that dead system — it's the live General Map
// zone-circle renderer and is still used by GeneralCanvas.)

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
export default function GardenCanvas({ zones, positions, setup, currentZone, onSelectZone, onUpdatePositions, onAddZone, onDeleteZone, onRenameZone, plantList, overlayItems = [], onUpdateOverlayItems, selectedBedId, onSelectBed, selectedBedElementId, onSelectBedElement, bedLayouts, onUpdateBedLayout, zoneItems, onUpdateZoneItems, onResetZone, proposedItems = [], proposedHoveredName = null, proposedSelectedNames = null, onOpenZonePortal, neighbourhood = null, onRotateNorth, hideCompass = false }) {
    const { t, language } = useLanguage();
    const [generalZoom, setGeneralZoom] = useState(1);
    const [detailModeMap, setDetailModeMap] = useState({});
    const [addZoneOpen, setAddZoneOpen] = useState(false);

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
                <GeneralCanvas zones={zones} positions={positions} currentZone={currentZone} overlayItems={overlayItems} plantList={plantList} setup={setup} onSelectZone={onSelectZone} onUpdatePositions={onUpdatePositions} onUpdateOverlayItems={onUpdateOverlayItems} onAddZone={onAddZone} selectedBedId={selectedBedId} onSelectBed={onSelectBed} selectedBedElementId={selectedBedElementId} onSelectBedElement={onSelectBedElement} bedLayouts={bedLayouts} onUpdateBedLayout={onUpdateBedLayout} proposedItems={proposedItems} proposedHoveredName={proposedHoveredName} proposedSelectedNames={proposedSelectedNames} onOpenZonePortal={onOpenZonePortal} neighbourhood={neighbourhood} onRotateNorth={onRotateNorth} hideCompass={hideCompass || addZoneOpen} zoneItems={zoneItems} />
            ) : (
                <div className="flex-1" style={{ position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!hideCompass && !addZoneOpen && (
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
        </div>
    );
}
