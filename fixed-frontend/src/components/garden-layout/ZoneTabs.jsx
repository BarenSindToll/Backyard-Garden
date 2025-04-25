import { useState } from 'react';

export default function ZoneTabs({ zones, currentZone, setZones, setCurrentZone, onAddZone, onDeleteZone }) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [zoneName, setZoneName] = useState('');

    const handleInputBlur = () => {
        if (zoneName.trim()) {
            const updated = [...zones];
            updated[editingIndex] = zoneName.trim();
            setZones(updated);
        }
        setEditingIndex(null);
    };

    const confirmDelete = (index) => {
        const confirm = window.confirm(`Delete "${zones[index]}"? This cannot be undone.`);
        if (confirm) onDeleteZone(index);
    };

    return (
        <div className="w-full bg-gray-100 border  p-2">{
            <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-md max-w-full md:max-w-3xl mx-auto">
                {zones.map((zone, index) => (
                    <div
                        key={index}
                        className={`relative px-4 py-2 rounded cursor-pointer flex items-center group
            ${currentZone === index ? 'bg-white font-semibold' : 'text-gray-600'}`}
                        onClick={() => setCurrentZone(index)}
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

                        {/* Delete icon - show only if >1 zones */}
                        {zones.length > 1 && (
                            <button
                                className="absolute -right-2 -top-2 text-xs text-red-500 bg-white rounded-full shadow group-hover:block hidden"
                                onClick={(e) => {
                                    e.stopPropagation(); // prevent zone switch
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
        }
        </div>
    );
}
