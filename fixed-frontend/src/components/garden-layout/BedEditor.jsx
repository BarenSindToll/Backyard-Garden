import { useState, useEffect, useRef } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const gid = () => `bed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function resolveIcon(iconData) {
    if (!iconData) return null;
    return iconData.startsWith('data:') ? iconData : `data:image/svg+xml;base64,${iconData}`;
}

// Positions at which to render plant icons inside an area
function getPlantPositions(widthPx, heightPx, spacingCm, scale) {
    const sp = (spacingCm / 100) * scale;
    if (sp < 6) return [];
    const cols = Math.max(1, Math.floor(widthPx / sp));
    const rows = Math.max(1, Math.floor(heightPx / sp));
    if (cols * rows > 200) return []; // safety cap
    const offX = (widthPx - (cols - 1) * sp) / 2;
    const offY = (heightPx - (rows - 1) * sp) / 2;
    const out = [];
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            out.push({ x: offX + c * sp, y: offY + r * sp });
    return out;
}

// ── PlantIcon ─────────────────────────────────────────────────────────────────
function PlantIcon({ iconData, name, size = 22 }) {
    const src = resolveIcon(iconData);
    if (src) return (
        <img src={src} alt={name} draggable={false}
            style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
    );
    const letters = (name || '?').slice(0, 2).toUpperCase();
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: '#4a7c3f', color: '#fff',
            fontSize: Math.max(8, size * 0.38), fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
        }}>{letters}</div>
    );
}

// ── PlantSelector (searchable dropdown) ───────────────────────────────────────
function PlantSelector({ value, allPlants, onChange, placeholder = 'Select plant…' }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const current = allPlants.find(p => p.name === value);
    const filtered = allPlants.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 14);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                onClick={() => { setOpen(o => !o); setQ(''); }}
                className="w-full flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white text-left text-sm hover:border-forest transition-colors"
            >
                {current
                    ? <><PlantIcon iconData={current.iconData} name={current.name} size={18} /><span className="flex-1 truncate">{current.name}</span></>
                    : <span className="flex-1 text-gray-400">{placeholder}</span>
                }
                <span className="text-gray-400 text-xs">▾</span>
            </button>

            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            autoFocus type="text" value={q} onChange={e => setQ(e.target.value)}
                            placeholder="Search…"
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-forest"
                        />
                    </div>
                    <div className="max-h-44 overflow-y-auto">
                        <button type="button"
                            onClick={() => { onChange(null); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-gray-50">
                            None
                        </button>
                        {filtered.map(p => (
                            <button key={p._id || p.name} type="button"
                                onClick={() => { onChange(p); setOpen(false); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-50 text-left ${value === p.name ? 'bg-green-50 font-medium text-forest' : ''}`}>
                                <PlantIcon iconData={p.iconData} name={p.name} size={18} />
                                <span>{p.name}</span>
                            </button>
                        ))}
                        {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No results</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── BedRow (visual row inside bed) ────────────────────────────────────────────
function BedRow({ row, scale, selected, onMouseDown, onResizeMouseDown, onClick }) {
    const [hov, setHov] = useState(false);
    const x = row.x * scale;
    const y = row.y * scale;
    const w = row.widthM * scale;
    const h = row.heightM * scale;
    const plant = row.plant;
    const companions = row.companions || [];
    const iconSz = Math.min(Math.max(10, h * 0.55), 26, w / 3);
    const positions = plant ? getPlantPositions(w, h, row.spacingCm || 30, scale) : [];
    const compSp = (row.spacingCm || 30) * 1.4;
    const compPositions = companions.length > 0 ? getPlantPositions(w, h, compSp, scale) : [];
    const compIconSz = iconSz * 0.62;

    return (
        <div
            style={{
                position: 'absolute', left: x, top: y, width: w, height: h,
                background: selected
                    ? 'rgba(168,216,112,0.62)'
                    : hov ? 'rgba(200,235,160,0.50)' : 'rgba(180,220,130,0.38)',
                border: selected ? '2px solid #5a9a28' : `1.5px solid rgba(255,255,255,${hov ? 0.65 : 0.30})`,
                borderRadius: 4, cursor: 'grab',
                zIndex: selected ? 15 : hov ? 10 : 5,
                boxShadow: selected ? '0 0 0 2px rgba(90,154,40,0.35)' : 'none',
                transition: 'background 0.1s, border-color 0.1s',
            }}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            onMouseDown={onMouseDown}
            onClick={e => { e.stopPropagation(); onClick(); }}
        >
            {/* Main plant icons */}
            {positions.map((pos, i) => (
                <div key={i} style={{ position: 'absolute', left: pos.x - iconSz / 2, top: pos.y - iconSz / 2, pointerEvents: 'none' }}>
                    <PlantIcon iconData={plant?.iconData} name={plant?.name || '?'} size={iconSz} />
                </div>
            ))}
            {/* Companion icons — interleaved between main positions */}
            {companions.map((comp, ci) =>
                compPositions
                    .filter((_, pi) => pi % companions.length === ci)
                    .map((pos, pi) => (
                        <div key={`c-${ci}-${pi}`} style={{ position: 'absolute', left: pos.x - compIconSz / 2, top: pos.y - compIconSz / 2, opacity: 0.82, pointerEvents: 'none' }}>
                            <PlantIcon iconData={comp.iconData} name={comp.name || '?'} size={compIconSz} />
                        </div>
                    ))
            )}
            {/* Label when no plant */}
            {!plant && h >= 18 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', background: 'rgba(0,0,0,0.22)', borderRadius: 4, padding: '1px 7px' }}>
                        Row — no plant
                    </span>
                </div>
            )}
            {/* Resize handle */}
            {(selected || hov) && (
                <div
                    style={{ position: 'absolute', bottom: -5, right: -5, width: 11, height: 11, background: 'white', border: '1.5px solid #555', borderRadius: 2, cursor: 'se-resize', zIndex: 20 }}
                    onMouseDown={onResizeMouseDown}
                />
            )}
        </div>
    );
}

// ── BedBlock (visual block inside bed) ────────────────────────────────────────
function BedBlock({ block, scale, selected, onMouseDown, onResizeMouseDown, onClick }) {
    const [hov, setHov] = useState(false);
    const x = block.x * scale;
    const y = block.y * scale;
    const w = block.widthM * scale;
    const h = block.heightM * scale;
    const plant = block.plant;
    const companions = block.companions || [];
    const iconSz = Math.min(Math.max(8, Math.min(w, h) * 0.22), 24);
    const positions = plant ? getPlantPositions(w, h, block.spacingCm || 25, scale) : [];
    const compSp = (block.spacingCm || 25) * 1.4;
    const compPositions = companions.length > 0 ? getPlantPositions(w, h, compSp, scale) : [];
    const compIconSz = iconSz * 0.62;

    return (
        <div
            style={{
                position: 'absolute', left: x, top: y, width: w, height: h,
                background: selected
                    ? 'rgba(112,168,216,0.60)'
                    : hov ? 'rgba(160,200,235,0.50)' : 'rgba(130,185,225,0.38)',
                border: selected ? '2px solid #3a8abf' : `1.5px solid rgba(255,255,255,${hov ? 0.65 : 0.30})`,
                borderRadius: 6, cursor: 'grab',
                zIndex: selected ? 15 : hov ? 10 : 5,
                boxShadow: selected ? '0 0 0 2px rgba(58,138,191,0.35)' : 'none',
                transition: 'background 0.1s, border-color 0.1s',
            }}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            onMouseDown={onMouseDown}
            onClick={e => { e.stopPropagation(); onClick(); }}
        >
            {positions.map((pos, i) => (
                <div key={i} style={{ position: 'absolute', left: pos.x - iconSz / 2, top: pos.y - iconSz / 2, pointerEvents: 'none' }}>
                    <PlantIcon iconData={plant?.iconData} name={plant?.name || '?'} size={iconSz} />
                </div>
            ))}
            {companions.map((comp, ci) =>
                compPositions
                    .filter((_, pi) => pi % companions.length === ci)
                    .map((pos, pi) => (
                        <div key={`c-${ci}-${pi}`} style={{ position: 'absolute', left: pos.x - compIconSz / 2, top: pos.y - compIconSz / 2, opacity: 0.82, pointerEvents: 'none' }}>
                            <PlantIcon iconData={comp.iconData} name={comp.name || '?'} size={compIconSz} />
                        </div>
                    ))
            )}
            {!plant && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', background: 'rgba(0,0,0,0.22)', borderRadius: 4, padding: '1px 7px' }}>Block</span>
                </div>
            )}
            {(selected || hov) && (
                <div
                    style={{ position: 'absolute', bottom: -5, right: -5, width: 11, height: 11, background: 'white', border: '1.5px solid #555', borderRadius: 2, cursor: 'se-resize', zIndex: 20 }}
                    onMouseDown={onResizeMouseDown}
                />
            )}
        </div>
    );
}

// ── Selection panel ───────────────────────────────────────────────────────────
function ItemPanel({ item, type, allPlants, onUpdate, onDelete }) {
    const companions = item.companions || [];
    const mainName = item.plant?.name;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div>
                    <p className="text-xs font-bold text-forest">{type === 'row' ? 'Planting Row' : 'Planting Block'}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                        {item.widthM?.toFixed(2)}m × {item.heightM?.toFixed(2)}m
                    </p>
                </div>
                <button
                    onClick={onDelete}
                    className="text-xs text-red-500 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors">
                    Delete
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Main plant */}
                <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Main plant</label>
                    <PlantSelector
                        value={mainName}
                        allPlants={allPlants}
                        onChange={p => onUpdate({ plant: p ? { name: p.name, iconData: p.iconData } : null })}
                    />
                </div>

                {/* Spacing */}
                <div className={`grid gap-3 ${type === 'row' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Plant spacing (cm)</label>
                        <input
                            type="number" min={5} max={200}
                            value={item.spacingCm ?? 25}
                            onChange={e => onUpdate({ spacingCm: Math.max(5, Number(e.target.value)) })}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:border-forest outline-none"
                        />
                    </div>
                    {type === 'row' && (
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">Row spacing (cm)</label>
                            <input
                                type="number" min={10} max={300}
                                value={item.rowSpacingCm ?? 70}
                                onChange={e => onUpdate({ rowSpacingCm: Math.max(10, Number(e.target.value)) })}
                                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:border-forest outline-none"
                            />
                        </div>
                    )}
                </div>

                {/* Companion plants */}
                <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Companion plants</label>
                    {companions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {companions.map((comp, i) => (
                                <span key={i} className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-full pl-1.5 pr-1 py-0.5 text-xs text-green-800">
                                    <PlantIcon iconData={comp.iconData} name={comp.name} size={14} />
                                    <span>{comp.name}</span>
                                    <button
                                        onClick={() => onUpdate({ companions: companions.filter((_, ci) => ci !== i) })}
                                        className="text-red-400 hover:text-red-600 ml-0.5 leading-none">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                    <PlantSelector
                        value={null}
                        allPlants={allPlants.filter(p => !companions.some(c => c.name === p.name) && p.name !== mainName)}
                        onChange={p => { if (p) onUpdate({ companions: [...companions, { name: p.name, iconData: p.iconData }] }); }}
                        placeholder="Add companion…"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Notes</label>
                    <textarea
                        value={item.notes || ''}
                        onChange={e => onUpdate({ notes: e.target.value })}
                        rows={2}
                        placeholder="Optional notes…"
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:border-forest outline-none"
                    />
                </div>
            </div>
        </div>
    );
}

function EmptyPanel({ bedW, bedH, rowCount, blockCount }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
            <span className="text-4xl">🌱</span>
            <div>
                <p className="text-sm font-bold text-forest mb-1">Bed Editor</p>
                <p className="text-[11px] text-gray-400">{bedW}m × {bedH}m · {rowCount} rows · {blockCount} blocks</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
                Click <strong>+ Row</strong> to add a planting row or <strong>+ Block</strong> for a planting block.<br />
                Then click on it to select and assign plants.
            </p>
        </div>
    );
}

// ── BedEditor (main export) ───────────────────────────────────────────────────
export default function BedEditor({ bed, bedLayout, allPlants, onUpdateBedLayout, onClose }) {
    const bedW = bed?.wM || 3;
    const bedH = bed?.hM || 1.2;

    // Scale to fit in ~600×450px area
    const MAX_W = 600;
    const MAX_H = 440;
    const scale = Math.min(MAX_W / bedW, MAX_H / bedH, 220);
    const canvasW = bedW * scale;
    const canvasH = bedH * scale;

    // Initialise state from bedLayout (remount on key change in parent)
    const init = bedLayout || {};
    const [rows, setRows] = useState(init.rows || []);
    const [blocks, setBlocks] = useState(init.blocks || []);
    const [layoutMode, setLayoutMode] = useState(init.layoutMode || 'mixed');
    const [selectedId, setSelectedId] = useState(null);

    // Refs so drag/resize effects always see current state
    const rowsRef = useRef(rows);
    useEffect(() => { rowsRef.current = rows; }, [rows]);
    const blocksRef = useRef(blocks);
    useEffect(() => { blocksRef.current = blocks; }, [blocks]);
    const modeRef = useRef(layoutMode);
    useEffect(() => { modeRef.current = layoutMode; }, [layoutMode]);

    // Drag / resize state
    const [dragging, setDragging] = useState(null);
    const [resizing, setResizing] = useState(null);

    const persist = (r, b, m) => {
        onUpdateBedLayout(bed.id, {
            id: bed.id, name: bed.name,
            layoutMode: m ?? modeRef.current,
            widthM: bedW, heightM: bedH,
            rows: r, blocks: b,
        });
    };

    // Drag effect (window listeners so mouse can leave canvas)
    useEffect(() => {
        if (!dragging) return;
        const onMove = (e) => {
            const dx = (e.clientX - dragging.startX) / scale;
            const dy = (e.clientY - dragging.startY) / scale;
            if (dragging.type === 'row') {
                setRows(prev => prev.map(r => r.id !== dragging.id ? r : {
                    ...r,
                    x: clamp(dragging.origX + dx, 0, bedW - r.widthM),
                    y: clamp(dragging.origY + dy, 0, bedH - r.heightM),
                }));
            } else {
                setBlocks(prev => prev.map(b => b.id !== dragging.id ? b : {
                    ...b,
                    x: clamp(dragging.origX + dx, 0, bedW - b.widthM),
                    y: clamp(dragging.origY + dy, 0, bedH - b.heightM),
                }));
            }
        };
        const onUp = () => {
            persist(rowsRef.current, blocksRef.current);
            setDragging(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragging, scale, bedW, bedH]);

    // Resize effect
    useEffect(() => {
        if (!resizing) return;
        const onMove = (e) => {
            const dw = (e.clientX - resizing.startX) / scale;
            const dh = (e.clientY - resizing.startY) / scale;
            if (resizing.type === 'row') {
                setRows(prev => prev.map(r => r.id !== resizing.id ? r : {
                    ...r,
                    widthM: clamp(resizing.origW + dw, 0.3, bedW - r.x),
                    heightM: clamp(resizing.origH + dh, 0.1, bedH - r.y),
                }));
            } else {
                setBlocks(prev => prev.map(b => b.id !== resizing.id ? b : {
                    ...b,
                    widthM: clamp(resizing.origW + dw, 0.2, bedW - b.x),
                    heightM: clamp(resizing.origH + dh, 0.1, bedH - b.y),
                }));
            }
        };
        const onUp = () => {
            persist(rowsRef.current, blocksRef.current);
            setResizing(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [resizing, scale, bedW, bedH]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const nextRowY = () => {
        if (!rows.length) return 0.05;
        const last = rows.reduce((m, r) => Math.max(m, r.y + r.heightM), 0);
        return Math.min(last + 0.05, bedH - 0.15);
    };

    const handleAddRow = () => {
        const r = {
            id: gid(), plant: null, companions: [],
            x: 0.05, y: nextRowY(),
            widthM: Math.max(0.3, bedW - 0.1), heightM: Math.min(0.3, bedH * 0.28),
            spacingCm: 30, rowSpacingCm: 70, notes: '',
        };
        const newRows = [...rows, r];
        setRows(newRows);
        setSelectedId(r.id);
        persist(newRows, blocks);
    };

    const handleAddBlock = () => {
        const last = blocks[blocks.length - 1];
        const x = last ? Math.min(last.x + last.widthM + 0.1, bedW * 0.5) : 0.1;
        const b = {
            id: gid(), plant: null, companions: [],
            x, y: 0.1,
            widthM: Math.min(bedW * 0.4, 1.2), heightM: Math.min(bedH * 0.6, 0.8),
            spacingCm: 25, notes: '',
        };
        const newBlocks = [...blocks, b];
        setBlocks(newBlocks);
        setSelectedId(b.id);
        persist(rows, newBlocks);
    };

    const handleModeChange = (m) => {
        setLayoutMode(m);
        persist(rows, blocks, m);
    };

    const selectedRow = rows.find(r => r.id === selectedId);
    const selectedBlock = blocks.find(b => b.id === selectedId);
    const selected = selectedRow || selectedBlock;
    const selectedType = selectedRow ? 'row' : selectedBlock ? 'block' : null;

    const updateSelected = (patch) => {
        if (selectedType === 'row') {
            const nr = rows.map(r => r.id === selectedId ? { ...r, ...patch } : r);
            setRows(nr); persist(nr, blocks);
        } else {
            const nb = blocks.map(b => b.id === selectedId ? { ...b, ...patch } : b);
            setBlocks(nb); persist(rows, nb);
        }
    };

    const deleteSelected = () => {
        if (selectedType === 'row') {
            const nr = rows.filter(r => r.id !== selectedId);
            setRows(nr); persist(nr, blocks);
        } else {
            const nb = blocks.filter(b => b.id !== selectedId);
            setBlocks(nb); persist(rows, nb);
        }
        setSelectedId(null);
    };

    const startDrag = (e, item, type) => {
        e.preventDefault(); e.stopPropagation();
        setDragging({ id: item.id, type, startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y });
    };

    const startResize = (e, item, type) => {
        e.preventDefault(); e.stopPropagation();
        setResizing({ id: item.id, type, startX: e.clientX, startY: e.clientY, origW: item.widthM, origH: item.heightM, origX: item.x, origY: item.y });
    };

    const visibleRows = layoutMode === 'blocks' ? [] : rows;
    const visibleBlocks = layoutMode === 'rows' ? [] : blocks;

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0 flex-wrap">
                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
                    ← General Map
                </button>

                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-forest truncate">{bed?.name || 'Bed'}</span>
                    <span className="text-xs text-gray-400">{bedW}m × {bedH}m</span>
                </div>

                {/* Layout mode */}
                <div className="flex gap-1 flex-shrink-0">
                    {['rows', 'blocks', 'mixed'].map(m => (
                        <button key={m} onClick={() => handleModeChange(m)}
                            className={`text-xs px-2.5 py-1 rounded-lg capitalize transition-colors ${layoutMode === m ? 'bg-forest text-white' : 'border border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                            {m}
                        </button>
                    ))}
                </div>

                <div className="flex-1" />

                {/* Add buttons */}
                <div className="flex gap-2 flex-shrink-0">
                    {(layoutMode === 'rows' || layoutMode === 'mixed') && (
                        <button onClick={handleAddRow}
                            className="text-xs border border-forest text-forest px-3 py-1.5 rounded-lg hover:bg-forest hover:text-white transition-colors">
                            + Row
                        </button>
                    )}
                    {(layoutMode === 'blocks' || layoutMode === 'mixed') && (
                        <button onClick={handleAddBlock}
                            className="text-xs border border-forest text-forest px-3 py-1.5 rounded-lg hover:bg-forest hover:text-white transition-colors">
                            + Block
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Canvas area */}
                <div
                    className="flex-1 overflow-auto flex items-center justify-center p-6"
                    style={{
                        background: '#2e5a26',
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                        cursor: dragging || resizing ? 'grabbing' : 'default',
                    }}
                    onClick={() => setSelectedId(null)}
                >
                    <div>
                        {/* Width label */}
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 5, fontFamily: 'monospace' }}>
                            {bedW}m
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Height label */}
                            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'monospace', writingMode: 'vertical-rl', transform: 'rotate(180deg)', userSelect: 'none' }}>
                                {bedH}m
                            </div>

                            {/* The bed */}
                            <div style={{
                                position: 'relative', width: canvasW, height: canvasH,
                                background: 'linear-gradient(145deg, #5c3d2e 0%, #7a5236 45%, #623c25 100%)',
                                borderRadius: 10,
                                border: '3px solid #a06830',
                                boxShadow: '0 6px 28px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.06)',
                                overflow: 'hidden',
                                flexShrink: 0,
                            }}>
                                {/* Soil texture */}
                                <div style={{
                                    position: 'absolute', inset: 0, pointerEvents: 'none',
                                    backgroundImage: 'radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.07) 0%, transparent 60%), radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                                    backgroundSize: 'auto, 14px 14px',
                                }} />

                                {visibleRows.map(row => (
                                    <BedRow key={row.id} row={row} scale={scale}
                                        selected={selectedId === row.id}
                                        onMouseDown={e => startDrag(e, row, 'row')}
                                        onResizeMouseDown={e => startResize(e, row, 'row')}
                                        onClick={() => setSelectedId(row.id)}
                                    />
                                ))}

                                {visibleBlocks.map(block => (
                                    <BedBlock key={block.id} block={block} scale={scale}
                                        selected={selectedId === block.id}
                                        onMouseDown={e => startDrag(e, block, 'block')}
                                        onResizeMouseDown={e => startResize(e, block, 'block')}
                                        onClick={() => setSelectedId(block.id)}
                                    />
                                ))}

                                {visibleRows.length === 0 && visibleBlocks.length === 0 && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' }}>
                                            Click + Row or + Block to start
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center' }}>
                            {visibleRows.length > 0 && (
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 14, height: 8, background: 'rgba(168,216,112,0.5)', borderRadius: 2, display: 'inline-block' }} />
                                    Rows
                                </span>
                            )}
                            {visibleBlocks.length > 0 && (
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 14, height: 14, background: 'rgba(112,168,216,0.5)', borderRadius: 3, display: 'inline-block' }} />
                                    Blocks
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Side panel */}
                <div className="w-72 border-l border-gray-200 bg-white flex-shrink-0 flex flex-col overflow-hidden">
                    {selected
                        ? <ItemPanel
                            item={selected}
                            type={selectedType}
                            allPlants={allPlants}
                            onUpdate={updateSelected}
                            onDelete={deleteSelected}
                        />
                        : <EmptyPanel
                            bedW={bedW} bedH={bedH}
                            rowCount={rows.length} blockCount={blocks.length}
                        />
                    }
                </div>
            </div>
        </div>
    );
}
