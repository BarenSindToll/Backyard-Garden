import { useState } from 'react';
import { ZONE_TYPES } from './gardenZoneConfig';

export default function AddZoneModal({ onAdd, onClose }) {
    const [customName, setCustomName] = useState('');

    const handlePickType = (typeKey) => {
        const name = customName.trim() || ZONE_TYPES[typeKey].label;
        onAdd(name);
    };

    const handleCustomAdd = () => {
        if (customName.trim()) onAdd(customName.trim());
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-forest text-lg">Add a new garden area</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Choose a type or enter a custom name</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                </div>

                {/* Custom name input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && customName.trim() && handleCustomAdd()}
                        placeholder="Custom name, e.g. Back Orchard, South Veggie Patch..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                        autoFocus
                    />
                    {customName.trim() && (
                        <button
                            onClick={handleCustomAdd}
                            className="px-4 py-2 bg-forest text-white text-sm rounded-lg hover:bg-green-800 font-medium whitespace-nowrap"
                        >
                            Add
                        </button>
                    )}
                </div>

                {/* Zone type grid */}
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Or pick a type:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                        {Object.entries(ZONE_TYPES).map(([key, def]) => (
                            <button
                                key={key}
                                onClick={() => handlePickType(key)}
                                className={`rounded-xl border-2 p-2.5 text-center cursor-pointer hover:scale-105 hover:shadow-md transition-all ${def.color}`}
                            >
                                <div className="text-2xl mb-1 leading-none">{def.emoji}</div>
                                <p className="text-xs font-semibold leading-tight">{def.label}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
