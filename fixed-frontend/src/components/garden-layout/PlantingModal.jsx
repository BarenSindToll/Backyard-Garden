import { useState } from 'react';
import { useLanguage } from '../../utils/languageContext';

export default function PlantingModal({ plant, suggestedDate, onConfirm, onCancel }) {
    const [date, setDate] = useState(suggestedDate || new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const { t } = useLanguage();
    const g = t.garden;

    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={e => e.target === e.currentTarget && onCancel()}
        >
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-84 space-y-4 max-w-sm w-full mx-4">
                <div className="flex items-center gap-3">
                    {plant.iconData ? (
                        <img src={`data:image/svg+xml;base64,${plant.iconData}`} alt={plant.name} className="w-12 h-12" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl">🌱</div>
                    )}
                    <div>
                        <h3 className="font-bold text-forest text-lg">{plant.name}</h3>
                        <p className="text-xs text-gray-500">{g.setPlantingDetails}</p>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">{g.plantingDate}</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                    />
                    {suggestedDate && (
                        <p className="text-xs text-gray-400 mt-1">{g.suggestedByZone}</p>
                    )}
                </div>

                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">
                        {g.notes} <span className="text-gray-400 font-normal">({g.optional})</span>
                    </label>
                    <input
                        type="text"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder={g.notesPlaceholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                    />
                </div>

                <div className="flex gap-2 justify-end pt-1">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                    >
                        {g.cancel}
                    </button>
                    <button
                        onClick={() => onConfirm({ date, notes })}
                        className="px-5 py-2 bg-forest text-white text-sm rounded-lg hover:bg-green-800 font-medium transition-colors"
                    >
                        {g.placePlant}
                    </button>
                </div>
            </div>
        </div>
    );
}
