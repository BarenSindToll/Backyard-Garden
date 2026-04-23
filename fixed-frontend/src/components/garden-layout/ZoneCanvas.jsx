import { useState } from 'react';
import { ZONE_TYPES, STRUCTURES, detectZoneType } from './gardenZoneConfig';
import AddZoneModal from './AddZoneModal';

const STRUCTURE_NAMES = new Set(STRUCTURES.map(s => s.name));

function getPlantCount(grid) {
    if (!grid) return 0;
    return grid.flat().filter(cell => cell?.plant && !STRUCTURE_NAMES.has(cell.plant)).length;
}

function getStructureCount(grid) {
    if (!grid) return 0;
    return grid.flat().filter(cell => cell?.isStructure).length;
}

export default function ZoneCanvas({
    zones,
    grids,
    currentZone,
    onSelect,
    onAdd,
    onDelete,
    onRename,
    gardenName,
    widthM,
    heightM,
}) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editName, setEditName] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    const handleBlur = () => {
        if (editName.trim() && editingIndex !== null) {
            const updated = [...zones];
            updated[editingIndex] = editName.trim();
            onRename(updated);
        }
        setEditingIndex(null);
    };

    return (
        <div className="w-full">
            {/* Outer garden boundary — styled like a walled garden plan */}
            <div className="relative rounded-2xl border-4 border-[#8B6914] shadow-lg overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #f0ede4 0%, #e6e0d0 100%)' }}>

                {/* Corner fence posts */}
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                    <div key={i} className={`absolute ${pos} w-4 h-4 rounded-sm bg-[#6B4F0A] shadow-inner z-10`} />
                ))}

                {/* Garden header bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[#8B6914]/30 bg-[#8B6914]/10">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#4a3520]">{gardenName || 'My Garden'}</span>
                        <span className="text-xs text-[#7a6040] bg-[#8B6914]/10 px-2 py-0.5 rounded-full border border-[#8B6914]/20">
                            {widthM}m × {heightM}m
                        </span>
                    </div>
                    <span className="text-xs text-[#7a6040]">{zones.length} area{zones.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Zone cards */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {zones.map((zone, index) => {
                        const typeKey = detectZoneType(zone);
                        const typeDef = ZONE_TYPES[typeKey] || ZONE_TYPES.general;
                        const plantCount = getPlantCount(grids[index]);
                        const structureCount = getStructureCount(grids[index]);
                        const isSelected = currentZone === index;

                        return (
                            <div
                                key={index}
                                onClick={() => onSelect(index)}
                                onDoubleClick={() => { setEditingIndex(index); setEditName(zone); }}
                                className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all duration-150 group select-none
                                    ${typeDef.color}
                                    ${isSelected
                                        ? 'ring-2 ring-offset-2 ring-forest shadow-lg scale-[1.03]'
                                        : 'hover:shadow-md hover:scale-[1.02] opacity-90 hover:opacity-100'
                                    }`}
                            >
                                {/* Zone emoji */}
                                <div className="text-3xl mb-1.5 leading-none">{typeDef.emoji}</div>

                                {/* Zone name */}
                                {editingIndex === index ? (
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        onBlur={handleBlur}
                                        onKeyDown={e => e.key === 'Enter' && handleBlur()}
                                        autoFocus
                                        onClick={e => e.stopPropagation()}
                                        className="bg-white/80 border-b border-current focus:outline-none text-sm font-bold w-full"
                                    />
                                ) : (
                                    <p className="text-sm font-bold leading-tight">{zone}</p>
                                )}

                                {/* Type label */}
                                <p className="text-xs opacity-60 mt-0.5">{typeDef.label}</p>

                                {/* Stats */}
                                <div className="flex items-center gap-2 mt-2">
                                    {plantCount > 0 && (
                                        <span className="text-xs bg-white/50 rounded-full px-1.5 py-0.5">
                                            🌱 {plantCount}
                                        </span>
                                    )}
                                    {structureCount > 0 && (
                                        <span className="text-xs bg-white/50 rounded-full px-1.5 py-0.5">
                                            🏗️ {structureCount}
                                        </span>
                                    )}
                                    {plantCount === 0 && structureCount === 0 && (
                                        <span className="text-xs opacity-40">Empty</span>
                                    )}
                                </div>

                                {/* Selected indicator */}
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-forest" />
                                )}

                                {/* Delete button (hover) */}
                                {zones.length > 1 && (
                                    <button
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow border border-red-200"
                                        onClick={e => {
                                            e.stopPropagation();
                                            if (window.confirm(`Delete "${zone}"? This cannot be undone.`)) onDelete(index);
                                        }}
                                        title="Delete area"
                                    >×</button>
                                )}
                            </div>
                        );
                    })}

                    {/* Add area card */}
                    <div
                        onClick={() => setShowAddModal(true)}
                        className="rounded-xl border-2 border-dashed border-[#8B6914]/40 p-3 cursor-pointer flex flex-col items-center justify-center min-h-[110px] hover:border-[#8B6914]/80 hover:bg-[#8B6914]/5 transition-all text-[#8B6914]/50 hover:text-[#8B6914]"
                    >
                        <span className="text-3xl leading-none mb-1">+</span>
                        <span className="text-xs font-semibold">Add Area</span>
                    </div>
                </div>

                {/* Selected zone label */}
                {zones[currentZone] && (
                    <div className="px-5 pb-3 flex items-center gap-2">
                        <span className="text-xs text-[#7a6040]">Editing:</span>
                        <span className="text-xs font-semibold text-forest bg-forest/10 px-2 py-0.5 rounded-full">
                            {ZONE_TYPES[detectZoneType(zones[currentZone])]?.emoji} {zones[currentZone]}
                        </span>
                        <span className="text-xs text-[#7a6040]">— double-click a card to rename</span>
                    </div>
                )}
            </div>

            {showAddModal && (
                <AddZoneModal
                    onAdd={(name) => { onAdd(name); setShowAddModal(false); }}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
}
