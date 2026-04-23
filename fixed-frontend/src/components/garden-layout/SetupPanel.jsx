import { useState } from 'react';

const FOCUS_AREAS = [
    { key: 'Producer',             label: 'Food Producers',       color: 'bg-green-100 border-green-400 text-green-800' },
    { key: 'Nitrogen fixer',       label: 'Nitrogen Fixers',      color: 'bg-blue-100 border-blue-400 text-blue-800' },
    { key: 'Pollinator attractor', label: 'Pollinators',          color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
    { key: 'Dynamic accumulator',  label: 'Dynamic Accumulators', color: 'bg-purple-100 border-purple-400 text-purple-800' },
    { key: 'Pest repellent',       label: 'Pest Controllers',     color: 'bg-orange-100 border-orange-400 text-orange-800' },
    { key: 'Groundcover',          label: 'Ground Covers',        color: 'bg-teal-100 border-teal-400 text-teal-800' },
];

const GOALS = ['Food Production', 'Biodiversity', 'Water Retention', 'Pollinator Support', 'Medicinal', 'Aesthetics'];
const CLIMATES = ['Temperate', 'Mediterranean', 'Continental', 'Oceanic', 'Arid', 'Subtropical', 'Tropical'];
const HARDINESS_ZONES = ['5b', '6a', '6b', '7a', '7b'];
const CELL_SIZES = [
    { value: 0.25, label: '0.25m (25cm) — detailed' },
    { value: 0.5,  label: '0.5m (50cm) — standard' },
    { value: 1,    label: '1m — large scale' },
    { value: 2,    label: '2m — overview' },
];

export default function SetupPanel({ setup, onSave }) {
    const isNew = !setup.gardenName || setup.gardenName === 'My Garden';
    const [open, setOpen] = useState(isNew);
    const [form, setForm] = useState({ ...setup });

    const toggleFocus = (key) => {
        const arr = form.focusAreas || [];
        setForm(f => ({ ...f, focusAreas: arr.includes(key) ? arr.filter(x => x !== key) : [...arr, key] }));
    };
    const toggleGoal = (goal) => {
        const arr = form.goals || [];
        setForm(f => ({ ...f, goals: arr.includes(goal) ? arr.filter(x => x !== goal) : [...arr, goal] }));
    };

    const computedCols = Math.max(1, Math.round((form.widthM || 10) / (form.cellSizeM || 1)));
    const computedRows = Math.max(1, Math.round((form.heightM || 10) / (form.cellSizeM || 1)));

    const handleSave = () => {
        onSave(form);
        setOpen(false);
    };

    if (!open) {
        return (
            <div className="bg-cream border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-forest text-sm">{form.gardenName}</span>
                <span className="text-sm text-gray-500">{form.widthM}m × {form.heightM}m</span>
                {form.country && <span className="text-sm text-gray-500">{form.country}</span>}
                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full border border-green-300">Zone {form.hardinessZone}</span>
                <span className="bg-sky-100 text-sky-800 text-xs px-2 py-0.5 rounded-full border border-sky-300">{form.climate}</span>
                <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full border border-gray-300">
                    Grid {computedCols}×{computedRows} ({form.cellSizeM || 1}m/cell)
                </span>
                {(form.goals || []).map(g => (
                    <span key={g} className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full border border-amber-300">{g}</span>
                ))}
                <button
                    onClick={() => setOpen(true)}
                    className="ml-auto text-xs text-forest border border-forest/30 px-3 py-1 rounded-full hover:bg-forest hover:text-white transition-colors"
                >
                    Edit Setup
                </button>
            </div>
        );
    }

    return (
        <div className="bg-cream border border-gray-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-forest">Garden Setup</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Configure size, location and permacultural focus — applying this will resize your grid</p>
                </div>
                {!isNew && (
                    <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
                )}
            </div>

            {/* Row 1: name, width, height, country */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Garden Name</label>
                    <input
                        type="text"
                        value={form.gardenName}
                        onChange={e => setForm(f => ({ ...f, gardenName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Width (m)</label>
                    <input
                        type="number" min="1"
                        value={form.widthM}
                        onChange={e => setForm(f => ({ ...f, widthM: +e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Height (m)</label>
                    <input
                        type="number" min="1"
                        value={form.heightM}
                        onChange={e => setForm(f => ({ ...f, heightM: +e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Country / Region</label>
                    <input
                        type="text"
                        value={form.country}
                        onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                        placeholder="e.g. Romania"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                    />
                </div>
            </div>

            {/* Row 2: zone, climate, cell size */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Hardiness Zone</label>
                    <select
                        value={form.hardinessZone}
                        onChange={e => setForm(f => ({ ...f, hardinessZone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                    >
                        {HARDINESS_ZONES.map(z => <option key={z} value={z}>Zone {z}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Climate Type</label>
                    <select
                        value={form.climate}
                        onChange={e => setForm(f => ({ ...f, climate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                    >
                        {CLIMATES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Cell Size (grid resolution)</label>
                    <select
                        value={form.cellSizeM || 1}
                        onChange={e => setForm(f => ({ ...f, cellSizeM: +e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                    >
                        {CELL_SIZES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <p className="text-xs text-forest mt-1 font-medium">
                        → Grid: {computedCols} cols × {computedRows} rows
                    </p>
                </div>
            </div>

            {/* Focus areas */}
            <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                    Permaculture Focus Areas
                    <span className="text-gray-400 font-normal ml-1">(prioritised in plant suggestions)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                    {FOCUS_AREAS.map(({ key, label, color }) => {
                        const selected = (form.focusAreas || []).includes(key);
                        return (
                            <button
                                key={key} type="button" onClick={() => toggleFocus(key)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selected ? color + ' font-semibold' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'}`}
                            >{label}</button>
                        );
                    })}
                </div>
            </div>

            {/* Goals */}
            <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Garden Goals</label>
                <div className="flex flex-wrap gap-2">
                    {GOALS.map(goal => {
                        const selected = (form.goals || []).includes(goal);
                        return (
                            <button
                                key={goal} type="button" onClick={() => toggleGoal(goal)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selected ? 'bg-forest text-white border-forest font-semibold' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'}`}
                            >{goal}</button>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                {!isNew && (
                    <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                )}
                <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-forest text-white text-sm rounded-lg hover:bg-green-800 font-medium transition-colors"
                >
                    Apply Setup
                </button>
            </div>
        </div>
    );
}
