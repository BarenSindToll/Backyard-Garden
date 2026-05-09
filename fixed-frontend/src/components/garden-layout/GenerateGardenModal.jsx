import { useState } from 'react';
import { useLanguage } from '../../utils/languageContext';
import { apiUrl } from '../../utils/api';

// EN values sent to the backend — stable regardless of UI language
const EXPERIENCE_EN  = ['Beginner', 'Intermediate', 'Advanced'];
const MAINTENANCE_EN = ['Low', 'Medium', 'High'];
const PRIORITY_EN    = ['Mostly Food', 'Balanced', 'Mostly Ornamental', 'Healing / Medicinal'];
const SOIL_EN        = ['Sandy', 'Loam', 'Clay', 'Chalky', 'Silty'];
const SUN_EN         = ['Full Sun', 'Partial Shade', 'Full Shade'];
const WATER_EN       = ['Rain Only', 'Manual', 'Irrigated'];
const SLOPE_EN       = ['Flat', 'Gentle Slope', 'Steep'];
const SEASON_EN      = ['Spring', 'Summer', 'Autumn', 'Winter'];
const SUGGESTABLE_STRUCTURES = ['Path', 'Greenhouse', 'Pond', 'Compost', 'Raised Bed', 'Coop'];

const STRUCTURE_EMOJIS = {
    Path: '🛤️', Greenhouse: '🌿', Pond: '💧', Compost: '♻️',
    House: '🏠', Shed: '🏚️', 'Raised Bed': '🪴', Fence: '🚧', Coop: '🐔',
};

function estimatePxPerM(widthM, heightM) {
    if (!widthM || !heightM) return 10;
    const estW = Math.max(600, (window.innerWidth || 1200) - 286);
    const estH = Math.max(400, (window.innerHeight || 800) - 160);
    return Math.max(4, Math.min(estW / widthM, estH / heightM));
}

// Reusable pill-button group
function PillGroup({ options, activeIdx, onSelect, cols }) {
    return (
        <div className={cols ? `grid gap-1.5` : 'flex flex-wrap gap-1.5'}
             style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : {}}>
            {options.map((label, i) => (
                <button key={i} type="button" onClick={() => onSelect(i)}
                    className={`py-1.5 px-2 text-xs rounded-lg border transition-colors text-center ${
                        activeIdx === i
                            ? 'bg-forest text-white border-forest'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-forest'
                    }`}
                >{label}</button>
            ))}
        </div>
    );
}

// Section separator with label
function Section({ label, children }) {
    return (
        <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</p>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

export default function GenerateGardenModal({ setup, favoritePlants, overlayItems, onApply, onClose }) {
    const { t } = useLanguage();
    const g = t.garden;

    const [step, setStep] = useState('form');
    const [plan, setPlan] = useState(null);
    const [error, setError] = useState('');
    const [selectedStructures, setSelectedStructures] = useState(new Set());

    // ── Form state ────────────────────────────────────────────────────────────
    const [numZones, setNumZones]             = useState(3);
    const [experienceIdx, setExperienceIdx]   = useState(0);
    const [maintenanceIdx, setMaintenanceIdx] = useState(1);
    const [priorityIdx, setPriorityIdx]       = useState(1);

    // Growing conditions
    const [soilIdx, setSoilIdx]   = useState(1);   // Loam
    const [sunIdx, setSunIdx]     = useState(0);   // Full Sun
    const [waterIdx, setWaterIdx] = useState(1);   // Manual
    const [slopeIdx, setSlopeIdx] = useState(0);   // Flat

    // Structures to suggest
    const [wantedStructures, setWantedStructures] = useState(
        new Set(SUGGESTABLE_STRUCTURES)
    );

    // Planting
    const [seasonFocus, setSeasonFocus]         = useState(new Set(SEASON_EN));
    const [includeFavourites, setIncludeFavourites] = useState(favoritePlants?.length > 0);
    const [avoidPlants, setAvoidPlants]         = useState('');

    // Lifestyle
    const [wildlifeFriendly, setWildlifeFriendly] = useState(false);
    const [childrenPets, setChildrenPets]         = useState(false);

    // Notes
    const [specialNotes, setSpecialNotes] = useState('');

    // ── Togglers ──────────────────────────────────────────────────────────────
    const toggleWanted = (name) =>
        setWantedStructures(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });

    const toggleSeason = (s) =>
        setSeasonFocus(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

    const toggleStructure = (name) =>
        setSelectedStructures(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });

    // ── Generate ──────────────────────────────────────────────────────────────
    const handleGenerate = async () => {
        setStep('loading');
        setError('');
        try {
            const pxPerM = estimatePxPerM(setup.widthM, setup.heightM);
            const existingOverlayItems = (overlayItems || []).map(item => ({
                name: item.name,
                xM: item.x / pxPerM,
                yM: item.y / pxPerM,
                wM: item.wM ?? 4,
                hM: item.hM ?? 4,
            }));

            const res = await fetch(apiUrl('/api/ai/generate-garden'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    setup,
                    numZones,
                    experience:   EXPERIENCE_EN[experienceIdx],
                    maintenance:  MAINTENANCE_EN[maintenanceIdx],
                    priority:     PRIORITY_EN[priorityIdx],
                    soilType:     SOIL_EN[soilIdx],
                    sunExposure:  SUN_EN[sunIdx],
                    waterSource:  WATER_EN[waterIdx],
                    slope:        SLOPE_EN[slopeIdx],
                    wantedStructures: [...wantedStructures],
                    seasonFocus:  [...seasonFocus],
                    avoidPlants:  avoidPlants.split(',').map(s => s.trim()).filter(Boolean),
                    wildlifeFriendly,
                    childrenPets,
                    specialNotes,
                    includeFavorites: includeFavourites,
                    favoritePlants: favoritePlants || [],
                    existingOverlayItems,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setPlan(data.plan);
                setSelectedStructures(new Set((data.plan.structures || []).map(s => s.name)));
                setStep('result');
            } else {
                setError(data.message || g.generationError);
                setStep('form');
            }
        } catch {
            setError(g.generationError);
            setStep('form');
        }
    };

    const handleApply = (mode) => {
        const filteredStructures = (plan.structures || []).filter(s => selectedStructures.has(s.name));
        onApply({ ...plan, structures: filteredStructures }, mode);
    };

    const inputCls  = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest/20';
    const labelCls  = 'text-xs font-medium text-gray-600 block mb-1';
    const checkCls  = 'flex items-center gap-2 cursor-pointer select-none';

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
             onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="font-bold text-forest text-lg">{g.generateTitle}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{g.generateSubtitle}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">✕</button>
                </div>

                {/* ── FORM ── */}
                {step === 'form' && (
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                        {/* Current setup summary */}
                        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-xs text-gray-600 space-y-0.5">
                            <p className="font-semibold text-forest text-[11px] mb-1">{g.currentSetup}</p>
                            <p>📐 {setup.widthM}m × {setup.heightM}m &nbsp;|&nbsp; 🌡 Zone {setup.hardinessZone} &nbsp;|&nbsp; 🌤 {setup.climate}</p>
                            {setup.goals?.length > 0 && <p>🎯 {setup.goals.join(', ')}</p>}
                            {overlayItems?.length > 0 && <p>🏗 {overlayItems.map(i => i.name).join(', ')}</p>}
                        </div>

                        {/* Zones */}
                        <div>
                            <label className={labelCls}>{g.numZonesLabel}: <strong>{numZones}</strong></label>
                            <input type="range" min={2} max={6} value={numZones}
                                onChange={e => setNumZones(Number(e.target.value))}
                                className="w-full accent-forest" />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                {[2,3,4,5,6].map(n => <span key={n}>{n}</span>)}
                            </div>
                        </div>

                        {/* Style */}
                        <Section label="Style">
                            <div>
                                <label className={labelCls}>{g.experienceLabel}</label>
                                <PillGroup options={g.experienceLevels} activeIdx={experienceIdx} onSelect={setExperienceIdx} />
                            </div>
                            <div>
                                <label className={labelCls}>{g.maintenanceLabel}</label>
                                <PillGroup options={g.maintenanceLevels} activeIdx={maintenanceIdx} onSelect={setMaintenanceIdx} />
                            </div>
                            <div>
                                <label className={labelCls}>{g.priorityLabel}</label>
                                <PillGroup options={g.priorityOptions} activeIdx={priorityIdx} onSelect={setPriorityIdx} cols={2} />
                            </div>
                        </Section>

                        {/* Growing Conditions */}
                        <Section label={g.sectionConditions}>
                            <div>
                                <label className={labelCls}>{g.soilLabel}</label>
                                <PillGroup options={g.soilTypes} activeIdx={soilIdx} onSelect={setSoilIdx} />
                            </div>
                            <div>
                                <label className={labelCls}>{g.sunLabel}</label>
                                <PillGroup options={g.sunLevels} activeIdx={sunIdx} onSelect={setSunIdx} />
                            </div>
                            <div>
                                <label className={labelCls}>{g.waterLabel}</label>
                                <PillGroup options={g.waterLevels} activeIdx={waterIdx} onSelect={setWaterIdx} />
                            </div>
                            <div>
                                <label className={labelCls}>{g.slopeLabel}</label>
                                <PillGroup options={g.slopeLevels} activeIdx={slopeIdx} onSelect={setSlopeIdx} />
                            </div>
                        </Section>

                        {/* Structures to suggest */}
                        <Section label={g.sectionStructures}>
                            <div className="grid grid-cols-3 gap-1.5">
                                {SUGGESTABLE_STRUCTURES.map(name => (
                                    <label key={name} className={`${checkCls} border rounded-xl px-2.5 py-2 transition-colors cursor-pointer ${
                                        wantedStructures.has(name)
                                            ? 'border-forest/40 bg-green-50/60'
                                            : 'border-gray-200 opacity-60'
                                    }`}>
                                        <input type="checkbox" checked={wantedStructures.has(name)}
                                            onChange={() => toggleWanted(name)} className="accent-forest flex-shrink-0" />
                                        <span className="text-xs text-gray-700 leading-tight">
                                            {STRUCTURE_EMOJIS[name]} {name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </Section>

                        {/* Planting Preferences */}
                        <Section label={g.sectionPlanting}>
                            <div>
                                <label className={labelCls}>{g.seasonFocusLabel}</label>
                                <div className="flex gap-2">
                                    {SEASON_EN.map((s, i) => (
                                        <button key={s} type="button" onClick={() => toggleSeason(s)}
                                            className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                                                seasonFocus.has(s)
                                                    ? 'bg-forest text-white border-forest'
                                                    : 'bg-white border-gray-300 text-gray-600 hover:border-forest'
                                            }`}
                                        >{g.seasons[i]}</button>
                                    ))}
                                </div>
                            </div>

                            {favoritePlants?.length > 0 && (
                                <label className={checkCls}>
                                    <input type="checkbox" checked={includeFavourites}
                                        onChange={e => setIncludeFavourites(e.target.checked)} className="accent-forest" />
                                    <span className="text-sm text-gray-700">{g.includeFavourites}</span>
                                    <span className="text-xs text-gray-400">({favoritePlants.length})</span>
                                </label>
                            )}

                            <div>
                                <label className={labelCls}>{g.avoidPlantsLabel}</label>
                                <input type="text" value={avoidPlants}
                                    onChange={e => setAvoidPlants(e.target.value)}
                                    placeholder={g.avoidPlantsPlaceholder}
                                    className={inputCls} />
                            </div>
                        </Section>

                        {/* Lifestyle */}
                        <Section label={g.sectionLifestyle}>
                            <label className={checkCls}>
                                <input type="checkbox" checked={wildlifeFriendly}
                                    onChange={e => setWildlifeFriendly(e.target.checked)} className="accent-forest" />
                                <span className="text-sm text-gray-700">{g.wildlifeFriendly}</span>
                            </label>
                            <label className={checkCls}>
                                <input type="checkbox" checked={childrenPets}
                                    onChange={e => setChildrenPets(e.target.checked)} className="accent-forest" />
                                <span className="text-sm text-gray-700">{g.childrenPets}</span>
                            </label>
                        </Section>

                        {/* Special notes */}
                        <Section label={g.specialNotes}>
                            <textarea value={specialNotes} onChange={e => setSpecialNotes(e.target.value)}
                                placeholder={g.specialNotesPlaceholder} rows={2}
                                className={inputCls + ' resize-none'} />
                        </Section>

                        {error && <p className="text-red-500 text-xs">{error}</p>}
                    </div>
                )}

                {/* ── LOADING ── */}
                {step === 'loading' && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 px-6">
                        <div className="w-14 h-14 rounded-full border-4 border-forest border-t-transparent animate-spin" />
                        <p className="text-sm text-gray-600 text-center">{g.generating}</p>
                    </div>
                )}

                {/* ── RESULT ── */}
                {step === 'result' && plan && (
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                            <p className="text-xs font-semibold text-forest mb-1">{g.aiOverview}</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{plan.overview}</p>
                        </div>

                        {plan.structures?.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-2">
                                    {g.suggestedStructures}
                                    <span className="font-normal text-gray-400 ml-1">({g.dragToAdjust})</span>
                                </p>
                                <div className="space-y-1.5">
                                    {plan.structures.map((s, i) => (
                                        <label key={i} className={`flex items-start gap-3 border rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                                            selectedStructures.has(s.name)
                                                ? 'border-forest/40 bg-green-50/50'
                                                : 'border-gray-200 bg-white opacity-60'
                                        }`}>
                                            <input type="checkbox" checked={selectedStructures.has(s.name)}
                                                onChange={() => toggleStructure(s.name)} className="accent-forest mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-base">{STRUCTURE_EMOJIS[s.name] || '🏗️'}</span>
                                                    <span className="font-semibold text-sm text-forest">{s.name}</span>
                                                    <span className="text-[11px] text-gray-400 ml-auto">{s.wM}×{s.hM}m</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{s.reason}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">{g.generatedZones}</p>
                            <div className="space-y-2">
                                {plan.zones.map((zone, i) => (
                                    <div key={i} className="border border-gray-200 rounded-xl px-4 py-3 bg-white">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-semibold text-forest text-sm">{zone.name}</p>
                                            <span className="text-xs text-gray-400">{zone.plants.length} {g.plantsLabel}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">{zone.description}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {zone.plants.map((plant, j) => (
                                                <span key={j} className="bg-green-50 border border-green-200 text-green-800 text-[11px] px-2 py-0.5 rounded-full">
                                                    {plant}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-2">
                    {step === 'form' && (
                        <>
                            <button onClick={onClose}
                                className="flex-1 py-2 text-sm text-gray-500 border border-gray-300 rounded-xl hover:text-gray-700"
                            >{g.cancel}</button>
                            <button onClick={handleGenerate}
                                className="flex-1 py-2 bg-forest text-white text-sm rounded-xl hover:bg-green-800 font-medium"
                            >{g.generate}</button>
                        </>
                    )}
                    {step === 'result' && (
                        <>
                            <button onClick={() => setStep('form')}
                                className="py-2 px-4 text-sm text-gray-500 border border-gray-300 rounded-xl hover:text-gray-700"
                            >{g.backToForm}</button>
                            <button onClick={() => handleApply('replace')}
                                className="flex-1 py-2 bg-forest text-white text-sm rounded-xl hover:bg-green-800 font-medium"
                            >{g.applyReplace}</button>
                            <button onClick={() => handleApply('add')}
                                className="flex-1 py-2 bg-white text-forest text-sm rounded-xl border-2 border-forest hover:bg-green-50 font-medium"
                            >{g.applyAdd}</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
