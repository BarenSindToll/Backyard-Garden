import { useState } from 'react';
import { useLanguage } from '../../utils/languageContext';

const FOCUS_AREA_KEYS = [
    { key: 'Producer',             color: 'bg-green-100 border-green-400 text-green-800' },
    { key: 'Nitrogen fixer',       color: 'bg-blue-100 border-blue-400 text-blue-800' },
    { key: 'Pollinator attractor', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
    { key: 'Dynamic accumulator',  color: 'bg-purple-100 border-purple-400 text-purple-800' },
    { key: 'Pest repellent',       color: 'bg-orange-100 border-orange-400 text-orange-800' },
    { key: 'Groundcover',          color: 'bg-teal-100 border-teal-400 text-teal-800' },
];

// English values stored in DB — index matches t.garden.goals
const GOALS_EN = ['Food Production', 'Biodiversity', 'Water Retention', 'Pollinator Support', 'Medicinal', 'Aesthetics'];
// English values stored in DB — index matches t.garden.climates
const CLIMATES_EN = ['Temperate', 'Mediterranean', 'Continental', 'Oceanic', 'Arid', 'Subtropical', 'Tropical'];
const HARDINESS_ZONES = ['5b', '6a', '6b', '7a', '7b'];
const CELL_SIZE_VALUES = [0.25, 0.5, 1, 2];

export default function SetupPanel({ setup, onSave }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ ...setup });
    const { t } = useLanguage();
    const g = t.garden;

    const openPanel = () => {
        setForm({ ...setup });
        setOpen(true);
    };

    const toggleFocus = (key) => {
        const arr = form.focusAreas || [];
        setForm(f => ({ ...f, focusAreas: arr.includes(key) ? arr.filter(x => x !== key) : [...arr, key] }));
    };
    const toggleGoal = (goal) => {
        const arr = form.goals || [];
        setForm(f => ({ ...f, goals: arr.includes(goal) ? arr.filter(x => x !== goal) : [...arr, goal] }));
    };

    const handleSave = () => {
        onSave(form);
        setOpen(false);
    };

    return (
        <>
            <button
                onClick={openPanel}
                className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:border-forest hover:text-forest transition-colors flex-shrink-0"
            >
                <span>⚙</span>
                <span>{g.setup}</span>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />

                    <div className="fixed inset-y-0 right-0 w-[440px] bg-white z-50 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-forest">{g.setupTitle}</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{g.setupSubtitle}</p>
                            </div>
                            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-600 block mb-1">{g.gardenName}</label>
                                    <input
                                        type="text"
                                        value={form.gardenName}
                                        onChange={e => setForm(f => ({ ...f, gardenName: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">
                                        {g.widthLabel} <span className="text-gray-400 font-normal">— {g.generalMapHint}</span>
                                    </label>
                                    <input
                                        type="number" min="1" step="any"
                                        value={form.widthM}
                                        onChange={e => setForm(f => ({ ...f, widthM: Math.max(1, Number(e.target.value)) }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">
                                        {g.heightLabel} <span className="text-gray-400 font-normal">— {g.generalMapHint}</span>
                                    </label>
                                    <input
                                        type="number" min="1" step="any"
                                        value={form.heightM}
                                        onChange={e => setForm(f => ({ ...f, heightM: Math.max(1, Number(e.target.value)) }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-600 block mb-1">{g.countryRegion}</label>
                                    <input
                                        type="text"
                                        value={form.country}
                                        onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                                        placeholder={g.countryPlaceholder}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-1">{g.hardinessZone}</label>
                                        <select
                                            value={form.hardinessZone}
                                            onChange={e => setForm(f => ({ ...f, hardinessZone: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                                        >
                                            {HARDINESS_ZONES.map(z => (
                                                <option key={z} value={z}>{g.zonePrefix} {z}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 block mb-1">{g.climate}</label>
                                        <select
                                            value={form.climate}
                                            onChange={e => setForm(f => ({ ...f, climate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                                        >
                                            {CLIMATES_EN.map((c, i) => (
                                                <option key={c} value={c}>{g.climates[i]}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 block mb-1">{g.cellSize}</label>
                                    <select
                                        value={form.cellSizeM || 1}
                                        onChange={e => setForm(f => ({ ...f, cellSizeM: +e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                                    >
                                        {CELL_SIZE_VALUES.map((v, i) => (
                                            <option key={v} value={v}>{g.cellSizes[i]}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">{g.cellSizeHelp}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-2">
                                    {g.permacultureFocus}
                                    <span className="text-gray-400 font-normal ml-1">({g.prioritised})</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {FOCUS_AREA_KEYS.map(({ key, color }, i) => {
                                        const selected = (form.focusAreas || []).includes(key);
                                        return (
                                            <button
                                                key={key} type="button" onClick={() => toggleFocus(key)}
                                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selected ? color + ' font-semibold' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'}`}
                                            >{g.focusAreas[i]}</button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-2">{g.gardenGoals}</label>
                                <div className="flex flex-wrap gap-2">
                                    {GOALS_EN.map((goal, i) => {
                                        const selected = (form.goals || []).includes(goal);
                                        return (
                                            <button
                                                key={goal} type="button" onClick={() => toggleGoal(goal)}
                                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selected ? 'bg-forest text-white border-forest font-semibold' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'}`}
                                            >{g.goals[i]}</button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex gap-3">
                            <button
                                onClick={() => setOpen(false)}
                                className="flex-1 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl hover:text-gray-700 transition-colors"
                            >{g.cancel}</button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-2 bg-forest text-white text-sm rounded-xl hover:bg-green-800 font-medium transition-colors"
                            >{g.applySetup}</button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
