import { useState } from 'react';

export default function ZoneTabs({ zones, currentZone, setZones, setCurrentZone, onAddZone, onDeleteZone, onRenameZone }) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [zoneName, setZoneName] = useState('');

    const handleInputBlur = () => {
        if (zoneName.trim()) {
            const updated = [...zones];
            updated[editingIndex] = zoneName.trim();
            setZones(updated);
            if (onRenameZone) onRenameZone(updated);
        }
        setEditingIndex(null);
    };

    const confirmDelete = (index) => {
        const confirm = window.confirm(`Delete "${zones[index]}"? This cannot be undone.`);
        if (confirm) onDeleteZone(index);
    };

    const getZoneColor = (zone) => {
        if (zone.toLowerCase().includes('guild')) return 'bg-green-200';
        if (zone.toLowerCase().includes('bed')) return 'bg-yellow-200';
        if (zone.toLowerCase().includes('pond')) return 'bg-blue-200';
        if (zone.toLowerCase().includes('compost')) return 'bg-amber-300';
        if (zone.toLowerCase().includes('greenhouse')) return 'bg-lime-200';
        if (zone === 'Main Garden') return 'bg-white';
        return 'bg-gray-100';
    };

    const displayZones = ['Main Garden', ...zones.filter(z => z !== 'Main Garden')];

    return (
        <div className="w-full bg-cream border p-2">
            <div className="flex items-center space-x-2 bg-cream p-2 rounded-md max-w-full md:max-w-3xl mx-auto overflow-x-auto">
                {displayZones.map((zone, index) => (
                    <div
                        key={index}
                        className={`relative px-4 py-2 rounded cursor-pointer flex items-center group ${currentZone === zone ? 'ring-2 ring-forest font-semibold' : 'text-gray-600'
                            } ${getZoneColor(zone)}`}
                        onClick={() => setCurrentZone(zone)}
                        onDoubleClick={() => {
                            setEditingIndex(index);
                            setZoneName(zone);
                        }}
                    >
                        {editingIndex === index ? (
                            <input
                                value={zoneName}
                                onChange={(e) => setZoneName(e.target.value)}
                                onBlur={handleInputBlur}
                                onKeyDown={(e) => e.key === 'Enter' && handleInputBlur()}
                                autoFocus
                                className="bg-white border-b border-gray-400 focus:outline-none text-sm"
                            />
                        ) : (
                            <span>{zone}</span>
                        )}

                        {displayZones.length > 1 && zone !== 'Main Garden' && (
                            <button
                                className="absolute -right-2 -top-2 text-xs text-red-500 bg-white rounded-full shadow group-hover:block hidden"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDelete(index);
                                }}
                                title="Delete Zone"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                ))}

                <button
                    onClick={onAddZone}
                    className="px-3 py-2 text-lg text-forest hover:bg-white rounded"
                    title="Add new zone"
                >
                    ＋
                </button>
            </div>
        </div>
    );
} 
