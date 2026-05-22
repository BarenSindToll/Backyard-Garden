import { useState } from 'react';
import { apiUrl } from '../../utils/api';

const GOALS = ['Food Production', 'Low Maintenance', 'Flowers & Beauty', 'Wildlife Habitat', 'Mixed / Balanced'];
const STYLES = ['Intensive Beds', 'Food Forest', 'Mixed', 'Greenhouse-Focused'];
const TIME_OPTIONS = ['< 1 hour', '1–3 hours', '3–7 hours', '7 hours+'];
const PROBLEMS = ['Flooding', 'Drought', 'Shade', 'Strong Wind', 'Poor Soil', 'Steep Slope'];

function PillGroup({ options, activeIdx, onSelect }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map((label, i) => (
                <button key={i} type="button" onClick={() => onSelect(i)}
                    className={`py-1.5 px-3 text-xs rounded-lg border transition-colors ${
                        activeIdx === i
                            ? 'bg-forest text-white border-forest'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-forest'
                    }`}
                >{label}</button>
            ))}
        </div>
    );
}

function Section({ label, children }) {
    return (
        <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</p>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

export default function PermaculturePlanWizard({ setup, favoritePlants, overlayItems, onGenerated, onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const [goalIdx, setGoalIdx]   = useState(0);
    const [styleIdx, setStyleIdx] = useState(2);
    const [timeIdx, setTimeIdx]   = useState(1);
    const [preferred, setPreferred] = useState(
        favoritePlants?.length ? favoritePlants.map(p => (typeof p === 'string' ? p : p.name)).join(', ') : ''
    );
    const [disliked, setDisliked] = useState('');
    const [problems, setProblems] = useState(new Set());
    const [notes, setNotes]       = useState('');

    const toggleProblem = (p) =>
        setProblems(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(apiUrl('/api/permaculture-plans/generate-draft'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    userRequirements: {
                        freeText:        [
                            `Garden style: ${STYLES[styleIdx]}`,
                            `Available time: ${TIME_OPTIONS[timeIdx]} per week`,
                            ...[...problems].map(p => `Problem: ${p}`),
                            notes,
                        ].filter(Boolean).join('. '),
                        goals:           [GOALS[goalIdx]],
                        focusAreas:      [STYLES[styleIdx]],
                        preferredPlants: preferred.split(',').map(s => s.trim()).filter(Boolean),
                        excludedPlants:  disliked.split(',').map(s => s.trim()).filter(Boolean),
                    },
                    locationContext: {
                        country:       setup.country || '',
                        hardinessZone: setup.hardinessZone || '',
                        climateNotes:  setup.climate || '',
                    },
                }),
            });
            const data = await res.json();
            if (data.success) {
                onGenerated(data.plan);
            } else {
                setError(data.message || 'Generation failed. Please try again.');
                setLoading(false);
            }
        } catch {
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };

    const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20';
    const labelCls = 'text-xs font-medium text-gray-600 block mb-1.5';

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
             onClick={e => e.target === e.currentTarget && !loading && onClose()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="font-bold text-forest text-lg">Permaculture Plan</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Generates a draft — review before applying to your garden
                        </p>
                    </div>
                    {!loading && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">✕</button>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 px-6">
                        <div className="w-14 h-14 rounded-full border-4 border-forest border-t-transparent animate-spin" />
                        <p className="text-sm text-gray-600 text-center font-medium">
                            Generating your permaculture plan draft…
                        </p>
                        <p className="text-xs text-gray-400 text-center max-w-xs">
                            Analysing your garden, site context, and preferences
                        </p>
                    </div>
                )}

                {/* Form */}
                {!loading && (
                    <>
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                            {/* Setup summary */}
                            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-xs text-gray-600">
                                <p className="font-semibold text-forest text-[11px] mb-1">Current garden</p>
                                <p>📐 {setup.widthM}m × {setup.heightM}m · Zone {setup.hardinessZone} · {setup.climate}</p>
                                {overlayItems?.length > 0 && (
                                    <p className="mt-0.5">🏗 {overlayItems.map(i => i.name).join(', ')}</p>
                                )}
                            </div>

                            {/* Goal */}
                            <div>
                                <label className={labelCls}>Main goal</label>
                                <PillGroup options={GOALS} activeIdx={goalIdx} onSelect={setGoalIdx} />
                            </div>

                            <Section label="Design style">
                                <div>
                                    <label className={labelCls}>Garden style</label>
                                    <PillGroup options={STYLES} activeIdx={styleIdx} onSelect={setStyleIdx} />
                                </div>
                                <div>
                                    <label className={labelCls}>Available time per week</label>
                                    <PillGroup options={TIME_OPTIONS} activeIdx={timeIdx} onSelect={setTimeIdx} />
                                </div>
                            </Section>

                            <Section label="Plants">
                                <div>
                                    <label className={labelCls}>Preferred plants (comma-separated)</label>
                                    <input type="text" value={preferred}
                                        onChange={e => setPreferred(e.target.value)}
                                        placeholder="Tomato, Apple, Comfrey…"
                                        className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Plants to avoid</label>
                                    <input type="text" value={disliked}
                                        onChange={e => setDisliked(e.target.value)}
                                        placeholder="Bamboo, Mint (invasive)…"
                                        className={inputCls} />
                                </div>
                            </Section>

                            <Section label="Site problems">
                                <div className="grid grid-cols-2 gap-1.5">
                                    {PROBLEMS.map(p => (
                                        <label key={p} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-xs transition-colors ${
                                            problems.has(p)
                                                ? 'border-amber-400 bg-amber-50 text-amber-800'
                                                : 'border-gray-200 text-gray-600 hover:border-amber-300'
                                        }`}>
                                            <input type="checkbox" checked={problems.has(p)}
                                                onChange={() => toggleProblem(p)} className="accent-amber-500 flex-shrink-0" />
                                            {p}
                                        </label>
                                    ))}
                                </div>
                            </Section>

                            <Section label="Additional notes">
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="Any specific requirements, constraints, or goals…"
                                    rows={2} className={inputCls + ' resize-none'} />
                            </Section>

                            {error && <p className="text-red-500 text-xs">{error}</p>}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-2">
                            <button onClick={onClose}
                                className="flex-1 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl hover:text-gray-700">
                                Cancel
                            </button>
                            <button onClick={handleSubmit}
                                className="flex-1 py-2 bg-forest text-white text-sm rounded-xl hover:bg-green-800 font-medium">
                                Generate Draft
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
