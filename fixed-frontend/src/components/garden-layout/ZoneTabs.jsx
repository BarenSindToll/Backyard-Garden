import { useState } from 'react';

const getZoneColor = (zone = '') => {
    const z = zone.toLowerCase();
    if (z.includes('guild')) return 'bg-green-100';
    if (z.includes('bed')) return 'bg-yellow-100';
    if (z.includes('pond')) return 'bg-blue-100';
    if (z.includes('compost')) return 'bg-amber-200';
    if (z.includes('greenhouse')) return 'bg-lime-100';
    if (z.includes('forest') || z.includes('food')) return 'bg-emerald-100';
    return 'bg-gray-100';
};

export default function ZoneTabs({ zones, currentZone, setCurrentZone, setZones, onAddZone, onDeleteZone, onRenameZone }) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editName, setEditName] = useState('');

    const handleBlur = () => {
        if (editName.trim() && editingIndex !== null) {
            const updated = [...zones];
            updated[editingIndex] = editName.trim();
            setZones(updated);
            if (onRenameZone) onRenameZone(updated);
        }
        setEditingIndex(null);
    };

    const confirmDelete = (index) => {
        if (zones.length <= 1) return;
        if (window.confirm(`Delete "${zones[index]}"? This cannot be undone.`)) {
            onDeleteZone(index);
        }
    };

    return (
        <div className="w-full bg-cream border border-gray-200 rounded-xl p-2">
            <div className="flex items-center gap-2 overflow-x-auto">
                {zones.map((zone, index) => (
                    <div
                        key={index}
                        className={`relative flex-shrink-0 px-4 py-2 rounded-lg cursor-pointer flex items-center group transition-all ${
                            currentZone === index
                                ? 'ring-2 ring-forest font-semibold shadow-sm'
                                : 'text-gray-600 hover:bg-white/70'
                        } ${getZoneColor(zone)}`}
                        onClick={() => setCurrentZone(index)}
                        onDoubleClick={() => { setEditingIndex(index); setEditName(zone); }}
                    >
                        {editingIndex === index ? (
                            <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onBlur={handleBlur}
                                onKeyDown={e => e.key === 'Enter' && handleBlur()}
                                autoFocus
                                className="bg-white border-b border-gray-400 focus:outline-none text-sm w-24"
                            />
                        ) : (
                            <span className="text-sm">{zone}</span>
                        )}

                        {zones.length > 1 && (
                            <button
                                className="absolute -right-1 -top-1 w-4 h-4 bg-white text-red-400 hover:text-red-600 rounded-full shadow text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={e => { e.stopPropagation(); confirmDelete(index); }}
                                title="Delete zone"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}

                <button
                    onClick={onAddZone}
                    className="flex-shrink-0 px-3 py-2 text-sm text-forest hover:bg-white rounded-lg whitespace-nowrap border border-dashed border-forest/30 hover:border-forest transition-colors"
                    title="Add zone"
                >
                    + Add Zone
                </button>
            </div>
        </div>
    );
}
