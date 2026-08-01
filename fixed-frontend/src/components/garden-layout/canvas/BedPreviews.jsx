import { resolveIconSrc } from './iconUtils';

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

function BedIcon({ iconData, name, size, bg = '#4a7c3f' }) {
    const src = resolveIconSrc(iconData);
    if (src) return <img src={src} alt="" style={{ width: size, height: size, objectFit: 'contain' }} draggable={false} />;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', fontSize: Math.max(4, size * 0.36), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>
            {(name || '?').slice(0, 2).toUpperCase()}
        </div>
    );
}

// ── Bed row/block previews rendered inside a bed on the General Map ───────────
export function BedRowPreview({ row, bedWM, bedHM, pxPerM, selected, onDragStart, onClick, onResizeStart }) {
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

export function BedBlockPreview({ block, bedWM, bedHM, pxPerM, selected, onDragStart, onClick, onResizeStart }) {
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

// ── Vegetable Garden zone-portal mini-bed preview ─────────────────────────────
export function VegGardenPreview({ item, pxPerM, bedLayout, zoneBeds }) {
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
