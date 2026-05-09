import { useState, useEffect, useRef, useMemo } from 'react';

const gid = () => `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function resolveIcon(iconData) {
    if (!iconData) return null;
    return iconData.startsWith('data:') ? iconData : `data:image/svg+xml;base64,${iconData}`;
}

function PlantIcon({ iconData, name, size = 16 }) {
    const src = resolveIcon(iconData);
    if (src) return (
        <img src={src} alt={name} draggable={false}
            style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
    );
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', background: '#4a7c3f', color: '#fff',
            fontSize: Math.max(7, size * 0.38), fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
            {(name || '?').slice(0, 2).toUpperCase()}
        </div>
    );
}

function PlantSelector({ value, allPlants, favoritePlants = [], onChange, placeholder = 'Select plant…' }) {
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

    const { favs, others } = useMemo(() => {
        const favSet = new Set(Array.isArray(favoritePlants) ? favoritePlants.map(f => typeof f === 'string' ? f : f.name) : []);
        return {
            favs: allPlants.filter(p => favSet.has(p.name)),
            others: allPlants.filter(p => !favSet.has(p.name)).sort((a, b) => a.name.localeCompare(b.name)),
        };
    }, [allPlants, favoritePlants]);

    const lq = q.toLowerCase();
    const filtFavs = favs.filter(p => p.name.toLowerCase().includes(lq)).slice(0, 8);
    const filtOthers = others.filter(p => p.name.toLowerCase().includes(lq)).slice(0, 10);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button type="button"
                onClick={() => { setOpen(o => !o); setQ(''); }}
                className="w-full flex items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-left hover:border-forest transition-colors">
                {current
                    ? <><PlantIcon iconData={current.iconData} name={current.name} size={14} />
                        <span className="flex-1 truncate text-xs">{current.name}</span></>
                    : <span className="flex-1 text-gray-400 text-xs">{placeholder}</span>
                }
                <span className="text-gray-400 text-[10px]">▾</span>
            </button>

            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-1.5 border-b border-gray-100">
                        <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)}
                            placeholder="Search…"
                            className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-forest" />
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 190 }}>
                        <button type="button" onClick={() => { onChange(null); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-400 hover:bg-gray-50">None</button>

                        {filtFavs.length > 0 && (
                            <>
                                <div className="px-2.5 py-0.5 text-[9px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 border-y border-amber-100">
                                    ♥ Favorites
                                </div>
                                {filtFavs.map(p => (
                                    <button key={p._id || p.name} type="button"
                                        onClick={() => { onChange(p); setOpen(false); }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-amber-50 text-left ${value === p.name ? 'bg-amber-50 font-medium text-forest' : ''}`}>
                                        <PlantIcon iconData={p.iconData} name={p.name} size={14} />
                                        <span>{p.name}</span>
                                    </button>
                                ))}
                            </>
                        )}

                        {filtOthers.length > 0 && (
                            <>
                                {filtFavs.length > 0 && (
                                    <div className="px-2.5 py-0.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-y border-gray-100">
                                        All plants
                                    </div>
                                )}
                                {filtOthers.map(p => (
                                    <button key={p._id || p.name} type="button"
                                        onClick={() => { onChange(p); setOpen(false); }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-green-50 text-left ${value === p.name ? 'bg-green-50 font-medium text-forest' : ''}`}>
                                        <PlantIcon iconData={p.iconData} name={p.name} size={14} />
                                        <span>{p.name}</span>
                                    </button>
                                ))}
                            </>
                        )}

                        {filtFavs.length === 0 && filtOthers.length === 0 && (
                            <p className="px-2.5 py-1.5 text-xs text-gray-400">No results</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BedSidebar({ bed, bedLayout, allPlants = [], favoritePlants = [], selectedElementId, onSelectElement, onUpdateBedLayout, onClose }) {
    if (!bed) return null;

    const bedW = bed.wM || 3;
    const bedH = bed.hM || 1.2;
    const layout = bedLayout || { rows: [], blocks: [], layoutMode: 'mixed' };
    const rows = layout.rows || [];
    const blocks = layout.blocks || [];
    const layoutMode = layout.layoutMode || 'mixed';

    const selectedRow = rows.find(r => r.id === selectedElementId);
    const selectedBlock = blocks.find(b => b.id === selectedElementId);
    const selected = selectedRow || selectedBlock;
    const selectedType = selectedRow ? 'row' : selectedBlock ? 'block' : null;

    const updateLayout = (newLayout) => onUpdateBedLayout(bed.id, newLayout);

    const getNextRowY = () => {
        if (!rows.length) return 0.05;
        const last = rows.reduce((m, r) => Math.max(m, r.y + r.heightM), 0);
        return Math.min(last + 0.05, bedH - 0.15);
    };

    const handleAddRow = () => {
        const r = {
            id: gid(), plant: null, companions: [],
            x: 0.05, y: getNextRowY(),
            widthM: Math.max(0.3, bedW - 0.1), heightM: Math.min(0.3, bedH * 0.28),
            spacingCm: 30, rowSpacingCm: 70, notes: '',
        };
        updateLayout({ ...layout, rows: [...rows, r] });
        onSelectElement(r.id);
    };

    const handleAddBlock = () => {
        const last = blocks[blocks.length - 1];
        const bx = last ? Math.min(last.x + last.widthM + 0.1, bedW * 0.5) : 0.1;
        const b = {
            id: gid(), plant: null, companions: [],
            x: bx, y: 0.1,
            widthM: Math.min(bedW * 0.4, 1.2), heightM: Math.min(bedH * 0.6, 0.8),
            spacingCm: 25, notes: '',
        };
        updateLayout({ ...layout, blocks: [...blocks, b] });
        onSelectElement(b.id);
    };

    const handleModeChange = (m) => updateLayout({ ...layout, layoutMode: m });

    const updateElement = (patch) => {
        if (selectedType === 'row') {
            updateLayout({ ...layout, rows: rows.map(r => r.id === selectedElementId ? { ...r, ...patch } : r) });
        } else {
            updateLayout({ ...layout, blocks: blocks.map(b => b.id === selectedElementId ? { ...b, ...patch } : b) });
        }
    };

    const deleteElement = () => {
        if (selectedType === 'row') updateLayout({ ...layout, rows: rows.filter(r => r.id !== selectedElementId) });
        else updateLayout({ ...layout, blocks: blocks.filter(b => b.id !== selectedElementId) });
        onSelectElement(null);
    };

    const companions = selected?.companions || [];

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">

            {/* ── Header ── */}
            <div className="px-3 py-2.5 border-b border-gray-200 flex-shrink-0 bg-[#f7f9f4]">
                <div className="flex items-center gap-2 mb-2">
                    <button onClick={onClose}
                        className="text-[10px] text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-1.5 py-0.5 leading-none transition-colors flex-shrink-0">
                        ← Back
                    </button>
                    <span className="text-xs font-bold text-forest truncate flex-1">{bed.name}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{bedW}m×{bedH}m</span>
                </div>

                {/* Layout mode */}
                <div className="flex gap-1 mb-2">
                    {['rows', 'blocks', 'mixed'].map(m => (
                        <button key={m} onClick={() => handleModeChange(m)}
                            className={`flex-1 text-[10px] py-1 rounded-md capitalize transition-colors font-medium ${layoutMode === m ? 'bg-forest text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                            {m}
                        </button>
                    ))}
                </div>

                {/* Add buttons */}
                <div className="flex gap-1.5">
                    {(layoutMode === 'rows' || layoutMode === 'mixed') && (
                        <button onClick={handleAddRow}
                            className="flex-1 text-[10px] font-semibold border border-forest text-forest py-1 rounded-md hover:bg-forest hover:text-white transition-colors">
                            + Row
                        </button>
                    )}
                    {(layoutMode === 'blocks' || layoutMode === 'mixed') && (
                        <button onClick={handleAddBlock}
                            className="flex-1 text-[10px] font-semibold border border-forest text-forest py-1 rounded-md hover:bg-forest hover:text-white transition-colors">
                            + Block
                        </button>
                    )}
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto">

                {/* Element list */}
                {(rows.length > 0 || blocks.length > 0) && (
                    <div className="px-3 py-2.5 border-b border-gray-100">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Planting areas</p>
                        <div className="space-y-1">
                            {rows.map(row => (
                                <button key={row.id}
                                    onClick={() => onSelectElement(selectedElementId === row.id ? null : row.id)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors text-xs ${selectedElementId === row.id ? 'bg-green-50 border border-green-200 text-forest' : 'bg-gray-50 hover:bg-gray-100 border border-transparent text-gray-700'}`}>
                                    <span style={{ width: 14, height: 8, background: 'rgba(140,200,100,0.6)', border: '1px solid #5a9a28', borderRadius: 2, flexShrink: 0, display: 'inline-block' }} />
                                    <span className="flex-1 truncate">
                                        {row.plant?.name || <span className="text-gray-400 italic text-[10px]">Row — no plant</span>}
                                    </span>
                                    {row.plant && <PlantIcon iconData={row.plant.iconData} name={row.plant.name} size={14} />}
                                </button>
                            ))}
                            {blocks.map(block => (
                                <button key={block.id}
                                    onClick={() => onSelectElement(selectedElementId === block.id ? null : block.id)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors text-xs ${selectedElementId === block.id ? 'bg-blue-50 border border-blue-200 text-blue-800' : 'bg-gray-50 hover:bg-gray-100 border border-transparent text-gray-700'}`}>
                                    <span style={{ width: 12, height: 12, background: 'rgba(90,150,210,0.6)', border: '1px solid #3a8abf', borderRadius: 3, flexShrink: 0, display: 'inline-block' }} />
                                    <span className="flex-1 truncate">
                                        {block.plant?.name || <span className="text-gray-400 italic text-[10px]">Block — no plant</span>}
                                    </span>
                                    {block.plant && <PlantIcon iconData={block.plant.iconData} name={block.plant.name} size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Selected element settings */}
                {selected && (
                    <div className="px-3 py-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-forest">
                                {selectedType === 'row' ? 'Row' : 'Block'} settings
                            </p>
                            <button onClick={deleteElement}
                                className="text-[10px] text-red-500 border border-red-200 px-2 py-0.5 rounded-md hover:bg-red-50 transition-colors">
                                Delete
                            </button>
                        </div>

                        <div>
                            <p className="text-[10px] text-gray-500 font-semibold mb-1">Main plant</p>
                            <PlantSelector
                                value={selected.plant?.name}
                                allPlants={allPlants}
                                favoritePlants={favoritePlants}
                                onChange={p => updateElement({ plant: p ? { name: p.name, iconData: p.iconData } : null })}
                            />
                        </div>

                        <div>
                            <p className="text-[10px] text-gray-500 font-semibold mb-1">Plant spacing (cm)</p>
                            <input type="number" min={5} max={200}
                                value={selected.spacingCm ?? 25}
                                onChange={e => updateElement({ spacingCm: Math.max(5, Number(e.target.value)) })}
                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:border-forest outline-none" />
                        </div>

                        <div>
                            <p className="text-[10px] text-gray-500 font-semibold mb-1">Companion plants</p>
                            {companions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                    {companions.map((comp, i) => (
                                        <span key={i} className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-full pl-1 pr-1 py-0.5 text-[10px] text-green-800">
                                            <PlantIcon iconData={comp.iconData} name={comp.name} size={12} />
                                            {comp.name}
                                            <button
                                                onClick={() => updateElement({ companions: companions.filter((_, ci) => ci !== i) })}
                                                className="text-red-400 hover:text-red-600 ml-0.5 leading-none">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <PlantSelector
                                value={null}
                                allPlants={allPlants.filter(p => !companions.some(c => c.name === p.name) && p.name !== selected.plant?.name)}
                                favoritePlants={favoritePlants}
                                onChange={p => { if (p) updateElement({ companions: [...companions, { name: p.name, iconData: p.iconData }] }); }}
                                placeholder="Add companion…"
                            />
                        </div>

                        <div>
                            <p className="text-[10px] text-gray-500 font-semibold mb-1">Notes</p>
                            <textarea rows={2} value={selected.notes || ''}
                                onChange={e => updateElement({ notes: e.target.value })}
                                placeholder="Optional notes…"
                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs resize-none focus:border-forest outline-none" />
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {rows.length === 0 && blocks.length === 0 && (
                    <div className="px-3 py-8 text-center">
                        <p className="text-3xl mb-2">🌱</p>
                        <p className="text-xs font-bold text-forest mb-1">Empty bed</p>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            Use <strong>+ Row</strong> for crop rows or <strong>+ Block</strong> for planting blocks. Click an area to configure its plants.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
