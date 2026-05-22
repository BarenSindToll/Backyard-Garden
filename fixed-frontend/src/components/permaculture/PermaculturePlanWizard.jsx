/**
 * PermaculturePlanWizard
 * Two-step centered modal: Site Context → Goals
 *
 * When generation succeeds, calls onDraftChange(plan) and the parent
 * closes the wizard (by setting generatePlanOpen=false) and opens the
 * side preview panel. The wizard does NOT show a Step 3 — preview is
 * handled entirely by PermaculturePlanSidePreview in the parent.
 *
 * Props:
 *   setup          – current garden setup object
 *   favoritePlants – user's favourite plants list
 *   overlayItems   – current overlay items (for stable-element summary)
 *   initialStep    – 1 or 2 (default 1); lets parent reopen at step 2
 *   onDraftChange  – called with the generated plan; parent closes wizard
 *   onClose        – called when user explicitly cancels
 */
import { useState } from 'react';
import { apiUrl } from '../../utils/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const TERRAIN       = ['Flat', 'Gentle slope', 'Steep slope'];
const WATER_SOURCE  = ['Rain only', 'Manual', 'Irrigated'];
const SUN_EXPOSURE  = ['Full sun', 'Partial shade', 'Mixed'];
const SOIL_TYPE     = ['Sandy', 'Loam', 'Clay', 'Unknown'];

const MAIN_GOALS    = ['Food production', 'Low maintenance', 'Flowers & beauty', 'Wildlife habitat', 'Mixed balanced'];
const DESIGN_STYLES = ['Intensive beds', 'Food forest', 'Mixed', 'Greenhouse-focused'];
const AVAIL_TIME    = ['< 1 hour', '1–3 hours', '3–7 hours', '7+ hours'];
const SITE_PROBLEMS = ['Flooding', 'Drought', 'Strong wind', 'Poor soil', 'Too much shade', 'Steep slope'];

const STABLE_NAMES  = new Set(['House', 'Shed', 'Fence', 'Greenhouse', 'Tree', 'Wall', 'Gate']);

// ── Shared primitives ─────────────────────────────────────────────────────────

function PillGroup({ options, selected, onSelect }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map((opt, i) => (
                <button key={i} type="button" onClick={() => onSelect(i)}
                    className={`py-1.5 px-3 text-xs rounded-lg border transition-all ${
                        selected === i
                            ? 'bg-forest text-white border-forest shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-forest/60 hover:text-forest'
                    }`}>
                    {opt}
                </button>
            ))}
        </div>
    );
}

function Card({ title, icon, children }) {
    return (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                {icon && <span className="text-sm">{icon}</span>}
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</p>
            </div>
            <div className="px-4 py-4 space-y-4">
                {children}
            </div>
        </div>
    );
}

function Label({ children }) {
    return <p className="text-xs font-medium text-gray-500 mb-1.5">{children}</p>;
}

function StepBar({ step }) {
    const labels = ['Site', 'Goals'];
    return (
        <div className="flex items-center">
            {labels.map((label, i) => {
                const idx  = i + 1;
                const done = idx < step;
                const curr = idx === step;
                return (
                    <div key={i} className="flex items-center">
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold leading-none transition-colors ${
                            curr ? 'bg-forest text-white' : done ? 'bg-green-100 text-forest' : 'bg-gray-100 text-gray-400'
                        }`}>
                            <span>{done ? '✓' : idx}</span>
                            <span className="hidden sm:inline">{label}</span>
                        </div>
                        {i < labels.length - 1 && (
                            <div className={`h-px w-4 flex-shrink-0 mx-0.5 transition-colors ${done ? 'bg-forest' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PermaculturePlanWizard({
    setup,
    favoritePlants,
    overlayItems,
    initialStep = 1,
    onDraftChange,
    onClose,
}) {
    const [step, setStep]         = useState(initialStep);
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState('');

    // Step 1 — Site Context
    const [terrainIdx, setTerrainIdx] = useState(0);
    const [waterIdx, setWaterIdx]     = useState(1);
    const [sunIdx, setSunIdx]         = useState(0);
    const [soilIdx, setSoilIdx]       = useState(1);

    // Step 2 — Goals
    const [goalIdx, setGoalIdx]       = useState(0);
    const [styleIdx, setStyleIdx]     = useState(2);
    const [timeIdx, setTimeIdx]       = useState(1);
    const [preferred, setPreferred]   = useState(
        (favoritePlants || []).map(p => typeof p === 'string' ? p : p.name).slice(0, 8).join(', ')
    );
    const [disliked, setDisliked]     = useState('');
    const [problems, setProblems]     = useState(new Set());
    const [notes, setNotes]           = useState('');

    const toggleProblem = (p) =>
        setProblems(prev => { const s = new Set(prev); s.has(p) ? s.delete(p) : s.add(p); return s; });

    const stableItems  = (overlayItems || []).filter(i => STABLE_NAMES.has(i.name));
    const regularItems = (overlayItems || []).filter(i => !STABLE_NAMES.has(i.name));

    // ── Generate ──────────────────────────────────────────────────────────────
    const handleGenerate = async () => {
        setGenerating(true);
        setGenError('');
        try {
            const problemParts = [...problems].map(p => `Problem: ${p}`);
            const freeText = [
                `Terrain: ${TERRAIN[terrainIdx]}`,
                `Water source: ${WATER_SOURCE[waterIdx]}`,
                `Sun exposure: ${SUN_EXPOSURE[sunIdx]}`,
                `Soil type: ${SOIL_TYPE[soilIdx]}`,
                `Design style: ${DESIGN_STYLES[styleIdx]}`,
                `Available time: ${AVAIL_TIME[timeIdx]} per week`,
                ...problemParts,
                notes,
            ].filter(Boolean).join('. ');

            const res = await fetch(apiUrl('/api/permaculture-plans/generate-draft'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    userRequirements: {
                        freeText,
                        goals:           [MAIN_GOALS[goalIdx]],
                        focusAreas:      [DESIGN_STYLES[styleIdx]],
                        preferredPlants: preferred.split(',').map(s => s.trim()).filter(Boolean),
                        excludedPlants:  disliked.split(',').map(s => s.trim()).filter(Boolean),
                    },
                    locationContext: {
                        country:       setup.country       || '',
                        hardinessZone: setup.hardinessZone || '7b',
                        climateNotes: [
                            setup.climate || '',
                            SUN_EXPOSURE[sunIdx],
                            TERRAIN[terrainIdx] !== 'Flat' ? TERRAIN[terrainIdx] : '',
                        ].filter(Boolean).join(', '),
                    },
                }),
            });
            const data = await res.json();
            if (data.success) {
                // Hand draft to parent — parent will close this wizard and open the side panel
                onDraftChange?.(data.plan);
            } else {
                setGenError(data.message || 'Generation failed. Please try again.');
            }
        } catch {
            setGenError('Network error. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/40 transition-colors';

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={e => e.target === e.currentTarget && !generating && onClose?.()}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '85vh' }}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 gap-4">
                    <div className="min-w-0">
                        <h2 className="font-bold text-forest text-base leading-tight truncate">
                            🌿 Generate Permaculture Plan
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Creates a draft — review before applying to your garden
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {!generating && <StepBar step={step} />}
                        {!generating && (
                            <button onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors ml-1">
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Loading ── */}
                {generating && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-16 px-8">
                        <div className="w-14 h-14 rounded-full border-4 border-forest border-t-transparent animate-spin" />
                        <div className="text-center">
                            <p className="text-sm text-gray-700 font-semibold">Generating your permaculture plan…</p>
                            <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                                Analysing site context, applying zone & sector logic, selecting companion guilds
                            </p>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                            {['🌱', '🌿', '🌳'].map((e, i) => (
                                <span key={i} className="text-lg animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>{e}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 1: Site Context ── */}
                {!generating && step === 1 && (
                    <>
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 space-y-1.5">
                                <p className="text-[10px] font-bold text-forest uppercase tracking-widest mb-2">
                                    📍 Current garden
                                </p>
                                <p className="text-xs text-gray-700">
                                    📐 {setup.widthM} m × {setup.heightM} m
                                    &nbsp;·&nbsp;🌡 Zone {setup.hardinessZone}
                                    &nbsp;·&nbsp;{setup.climate}
                                    {setup.country ? ` · ${setup.country}` : ''}
                                </p>
                                {stableItems.length > 0 && (
                                    <p className="text-xs text-gray-600">
                                        🏗 Stable: {stableItems.map(i => i.name).join(', ')}
                                    </p>
                                )}
                                {regularItems.length > 0 && (
                                    <p className="text-xs text-gray-600">
                                        📦 Other: {regularItems.map(i => i.name).join(', ')}
                                    </p>
                                )}
                            </div>

                            <Card title="Growing conditions" icon="🌤">
                                <div>
                                    <Label>Terrain</Label>
                                    <PillGroup options={TERRAIN} selected={terrainIdx} onSelect={setTerrainIdx} />
                                </div>
                                <div>
                                    <Label>Water source</Label>
                                    <PillGroup options={WATER_SOURCE} selected={waterIdx} onSelect={setWaterIdx} />
                                </div>
                                <div>
                                    <Label>Sun exposure</Label>
                                    <PillGroup options={SUN_EXPOSURE} selected={sunIdx} onSelect={setSunIdx} />
                                </div>
                                <div>
                                    <Label>Soil type</Label>
                                    <PillGroup options={SOIL_TYPE} selected={soilIdx} onSelect={setSoilIdx} />
                                </div>
                            </Card>
                        </div>

                        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                            <button onClick={onClose}
                                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <div className="flex-1" />
                            <button onClick={() => setStep(2)}
                                className="px-6 py-2 bg-forest text-white text-sm rounded-xl hover:bg-green-800 font-medium transition-colors">
                                Next →
                            </button>
                        </div>
                    </>
                )}

                {/* ── Step 2: Goals ── */}
                {!generating && step === 2 && (
                    <>
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                            <Card title="Goals" icon="🎯">
                                <div>
                                    <Label>Main goal</Label>
                                    <PillGroup options={MAIN_GOALS} selected={goalIdx} onSelect={setGoalIdx} />
                                </div>
                                <div>
                                    <Label>Design style</Label>
                                    <PillGroup options={DESIGN_STYLES} selected={styleIdx} onSelect={setStyleIdx} />
                                </div>
                                <div>
                                    <Label>Available time per week</Label>
                                    <PillGroup options={AVAIL_TIME} selected={timeIdx} onSelect={setTimeIdx} />
                                </div>
                            </Card>

                            <Card title="Plants" icon="🌱">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Preferred plants (comma-separated)</Label>
                                        <input type="text" value={preferred}
                                            onChange={e => setPreferred(e.target.value)}
                                            placeholder="Tomato, Comfrey, Apple…"
                                            className={inputCls} />
                                    </div>
                                    <div>
                                        <Label>Plants to avoid</Label>
                                        <input type="text" value={disliked}
                                            onChange={e => setDisliked(e.target.value)}
                                            placeholder="Bamboo, invasive mint…"
                                            className={inputCls} />
                                    </div>
                                </div>
                            </Card>

                            <Card title="Site problems" icon="⚠">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {SITE_PROBLEMS.map(p => (
                                        <label key={p} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-xs transition-colors select-none ${
                                            problems.has(p)
                                                ? 'border-amber-400 bg-amber-50 text-amber-800'
                                                : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50/40'
                                        }`}>
                                            <input type="checkbox" checked={problems.has(p)}
                                                onChange={() => toggleProblem(p)}
                                                className="accent-amber-500 flex-shrink-0" />
                                            {p}
                                        </label>
                                    ))}
                                </div>
                            </Card>

                            <div>
                                <Label>Additional notes (optional)</Label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="Specific constraints, goals, or requirements…"
                                    rows={2} className={inputCls + ' resize-none'} />
                            </div>

                            {genError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 flex gap-2 items-start">
                                    <span className="flex-shrink-0 mt-0.5">⚠</span>
                                    <span>{genError}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                            <button onClick={() => { setStep(1); setGenError(''); }}
                                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                ← Back
                            </button>
                            <div className="flex-1" />
                            <button onClick={handleGenerate}
                                className="px-6 py-2 bg-forest text-white text-sm rounded-xl hover:bg-green-800 font-medium transition-colors">
                                Generate Draft
                            </button>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
