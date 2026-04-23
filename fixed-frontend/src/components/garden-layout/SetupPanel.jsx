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
    { value: 0.25, label: '0.25 m — detailed' },
    { value: 0.5,  label: '0.5 m — standard' },
    { value: 1,    label: '1 m — large scale' },
    { value: 2,    label: '2 m — overview' },
];

export default function SetupPanel({ setup, onSave }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ ...setup });

    // Keep form in sync when setup changes externally (e.g. after load)
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

    const computedCols = Math.max(1, Math.round((form.widthM || 10) / (form.cellSizeM || 1)));
    const computedRows = Math.max(1, Math.round((form.heightM || 10) / (form.cellSizeM || 1)));

    const handleSave = () => {
        onSave(form);
        setOpen(false);
    };

    return (
        <>
            {/* Toolbar button */}
            <button
                onClick={openPanel}
                className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:border-forest hover:text-forest transition-colors flex-shrink-0"
            >
                <span>⚙</span>
                <span>Setup</span>
            </button>

            {/* Slide-over modal */}
            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/30 z-40"
                        onClick={() => setOpen(false)}
                    />

                    {/* Panel */}
                    <div className="fixed inset-y-0 right-0 w-[440px] bg-white z-50 shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-forest">Garden Setup</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Applying changes will resize all grids</p>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                            >✕</button>
                        </div>

                        {/* Scrollable form */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {/* Name, Width, Height, Country */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
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
                                <div className="col-span-2">
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

                            {/* Zone, Climate, Cell Size */}
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
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
                                        <label className="text-xs font-medium text-gray-600 block mb-1">Climate</label>
                                        <select
                                            value={form.climate}
                                            onChange={e => setForm(f => ({ ...f, climate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                                        >
                                            {CLIMATES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
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
                                        → Grid: {computedCols} cols × {computedRows} rows per area
                                    </p>
                                </div>
                            </div>

                            {/* Focus areas */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-2">
                                    Permaculture Focus
                                    <span className="text-gray-400 font-normal ml-1">(prioritised in suggestions)</span>
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
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex gap-3">
                            <button
                                onClick={() => setOpen(false)}
                                className="flex-1 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl hover:text-gray-700 transition-colors"
                            >Cancel</button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-2 bg-forest text-white text-sm rounded-xl hover:bg-green-800 font-medium transition-colors"
                            >Apply Setup</button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
