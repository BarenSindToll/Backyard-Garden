/**
 * SiteAnalysisWizard
 * 4-step modal that collects detailed site analysis data per-garden.
 *
 * Props:
 *   setup          – current garden setup (northDirection, hardinessZone…)
 *   overlayItems   – placed overlay elements (pre-fill existing elements step)
 *   zoneItems      – zone-placed items keyed by zone name
 *   initialData    – previously saved SiteAnalysis (or null)
 *   onSave(data)   – called with complete SiteAnalysis object
 *   onClose()      – called when user dismisses without saving
 */
import { useState } from 'react';
import { useLanguage } from '../../utils/languageContext';

// ── Stability classification (mirrors backend permacultureContextService) ──────
const FIXED_NAMES    = new Set(['House', 'Shed', 'Fence', 'Wall', 'Gate', 'Greenhouse', 'Pergola', 'Garage']);
const MOVABLE_NAMES  = new Set(['Compost', 'Raised Bed', 'Cold Frame', 'Beehive', 'Water Barrel', 'Tool Store']);

function classifyElement(name = '') {
    if (FIXED_NAMES.has(name)) return 'fixed';
    if (MOVABLE_NAMES.has(name)) return 'movable';
    return 'replaceable';
}

function collectElements(overlayItems = [], zoneItems = {}) {
    const seen = new Map();
    const add = (item) => {
        const key = `${item.name || item.type || 'Unknown'}`;
        if (!seen.has(key)) {
            seen.set(key, {
                name:     key,
                source:   item.source || 'map',
                type:     classifyElement(key),
                notes:    item.notes || '',
            });
        }
    };
    (overlayItems || []).forEach(add);
    Object.values(zoneItems || {}).forEach(list => (list || []).forEach(add));
    return [...seen.values()];
}

// ── Default empty state ────────────────────────────────────────────────────────
function buildDefault(setup, overlayItems, zoneItems) {
    return {
        // Step 1 — Climate & Terrain
        climate: {
            climateZone:     setup?.hardinessZone || '',
            annualRainfall:  '',
            firstFrostDate:  '',
            lastFrostDate:   '',
            altitude:        '',
            notes:           '',
        },
        topography: {
            slopeType:           '',
            slopeDirection:      '',
            poolingAreas:        '',
            waterSources:        [],
            rainwaterHarvesting: false,
            drainageNotes:       '',
        },
        // Step 2 — Sectors & Soil
        sectors: {
            northDirection:   setup?.northDirection || 'top',
            sunnyAreas:       '',
            shadedAreas:      '',
            dominantWind:     '',
            frostPockets:     '',
            viewsToPreserve:  '',
            viewsToBlock:     '',
            notes:            '',
        },
        soil: {
            soilType:         '',
            soilPH:           '',
            soilDrainage:     '',
            soilFertility:    '',
            soilContamination:'',
            soilCompaction:   false,
            notes:            '',
        },
        // Step 3 — Existing Elements
        elements: collectElements(overlayItems, zoneItems).map(el => ({ ...el, notes: '' })),
        // Step 4 — Goals & Constraints
        access: {
            mainAccess:  '',
            dailyUse:    '',
            closeAtHand: '',
            farAway:     '',
            notes:       '',
        },
        goals: {
            mainGoal:          '',
            productionGoals:   [],
            animals:           '',
            maintenanceTime:   '',
            budget:            '',
            experienceLevel:   '',
            aestheticPrefs:    '',
            preferredPlants:   '',
            avoidedPlants:     '',
            allergies:         '',
            childrenPets:      false,
        },
        constraints: {
            localRules:        '',
            pests:             '',
            accessibility:     '',
            irrigationLimits:  '',
            privacy:           '',
            safety:            '',
            notes:             '',
        },
    };
}

// ── Field primitives ───────────────────────────────────────────────────────────

function Label({ text, required }) {
    return (
        <label className="block text-xs font-semibold text-gray-700 mb-1">
            {text}
            {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
    );
}

function Input({ label, value, onChange, placeholder, required, type = 'text' }) {
    return (
        <div>
            {label && <Label text={label} required={required} />}
            <input
                type={type}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-forest/50 placeholder:text-gray-300"
            />
        </div>
    );
}

function Textarea({ label, value, onChange, placeholder, rows = 2 }) {
    return (
        <div>
            {label && <Label text={label} />}
            <textarea
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-forest/50 placeholder:text-gray-300"
            />
        </div>
    );
}

function Select({ label, value, onChange, options, placeholder, required }) {
    return (
        <div>
            {label && <Label text={label} required={required} />}
            <select
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-forest/50 text-gray-700"
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}

function MultiSelect({ label, value = [], onChange, options }) {
    const toggle = (opt) => {
        const next = value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt];
        onChange(next);
    };
    return (
        <div>
            {label && <Label text={label} />}
            <div className="flex flex-wrap gap-1.5">
                {options.map((opt, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => toggle(opt)}
                        className={`text-xs py-1 px-2.5 rounded-full border transition-colors ${
                            value.includes(opt)
                                ? 'bg-forest text-white border-forest'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-forest/50'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
                onClick={() => onChange(!checked)}
                className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-forest' : 'bg-gray-200'}`}
            >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-gray-700">{label}</span>
        </label>
    );
}

function SectionHeader({ title }) {
    return <h3 className="text-xs font-bold text-forest uppercase tracking-wide mt-4 mb-2 first:mt-0">{title}</h3>;
}

// ── Steps ──────────────────────────────────────────────────────────────────────

function Step1ClimateTopography({ data, onChange, sa }) {
    const { climate: c, topography: t } = data;
    const set = (section, key, val) => onChange({ ...data, [section]: { ...data[section], [key]: val } });

    return (
        <div className="space-y-3">
            <SectionHeader title={sa.sectionClimate} />
            <div className="grid grid-cols-2 gap-3">
                <Input label={sa.climateZone} value={c.climateZone} onChange={v => set('climate', 'climateZone', v)} />
                <Input label={sa.annualRainfall} value={c.annualRainfall} onChange={v => set('climate', 'annualRainfall', v)} placeholder="e.g. 650" />
                <Input label={sa.firstFrostDate} value={c.firstFrostDate} onChange={v => set('climate', 'firstFrostDate', v)} placeholder="e.g. Oct 15" />
                <Input label={sa.lastFrostDate} value={c.lastFrostDate} onChange={v => set('climate', 'lastFrostDate', v)} placeholder="e.g. Apr 5" />
                <Input label={sa.altitude} value={c.altitude} onChange={v => set('climate', 'altitude', v)} placeholder="e.g. 120" />
            </div>
            <Textarea label={sa.climateNotes} value={c.notes} onChange={v => set('climate', 'notes', v)} />

            <SectionHeader title={sa.sectionTopography} />
            <div className="grid grid-cols-2 gap-3">
                <Select label={sa.slopeType} value={t.slopeType} onChange={v => set('topography', 'slopeType', v)}
                    options={sa.slopeTypes} placeholder="—" required />
                <Select label={sa.slopeDirection} value={t.slopeDirection} onChange={v => set('topography', 'slopeDirection', v)}
                    options={sa.slopeDirections} placeholder="—" />
            </div>
            <Input label={sa.poolingAreas} value={t.poolingAreas} onChange={v => set('topography', 'poolingAreas', v)} />
            <MultiSelect label={sa.waterSources} value={t.waterSources} onChange={v => set('topography', 'waterSources', v)} options={sa.waterSourceOptions} />
            <Toggle label={sa.rainwaterHarvesting} checked={!!t.rainwaterHarvesting} onChange={v => set('topography', 'rainwaterHarvesting', v)} />
            <Textarea label={sa.drainageNotes} value={t.drainageNotes} onChange={v => set('topography', 'drainageNotes', v)} />
        </div>
    );
}

function Step2SectorsSoil({ data, onChange, sa }) {
    const { sectors: s, soil } = data;
    const set = (section, key, val) => onChange({ ...data, [section]: { ...data[section], [key]: val } });

    return (
        <div className="space-y-3">
            <SectionHeader title={sa.sectionSectors} />
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label text={sa.northDirectionLabel} />
                    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                        {['top', 'right', 'bottom', 'left'].map((dir, i) => (
                            <button key={dir} type="button"
                                onClick={() => set('sectors', 'northDirection', dir)}
                                className={`text-xs px-2.5 py-1.5 transition-colors ${i > 0 ? 'border-l border-gray-200' : ''} ${
                                    s.northDirection === dir ? 'bg-forest text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}>
                                {dir === 'top' ? '↑N' : dir === 'right' ? '→N' : dir === 'bottom' ? '↓N' : '←N'}
                            </button>
                        ))}
                    </div>
                </div>
                <Select label={sa.dominantWind} value={s.dominantWind} onChange={v => set('sectors', 'dominantWind', v)}
                    options={sa.windDirections} placeholder="—" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Textarea label={sa.sunnyAreas} value={s.sunnyAreas} onChange={v => set('sectors', 'sunnyAreas', v)} />
                <Textarea label={sa.shadedAreas} value={s.shadedAreas} onChange={v => set('sectors', 'shadedAreas', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Input label={sa.frostPockets} value={s.frostPockets} onChange={v => set('sectors', 'frostPockets', v)} />
                <Input label={sa.viewsToPreserve} value={s.viewsToPreserve} onChange={v => set('sectors', 'viewsToPreserve', v)} />
            </div>
            <Input label={sa.viewsToBlock} value={s.viewsToBlock} onChange={v => set('sectors', 'viewsToBlock', v)} />
            <Textarea label={sa.sectorNotes} value={s.notes} onChange={v => set('sectors', 'notes', v)} />

            <SectionHeader title={sa.sectionSoil} />
            <div className="grid grid-cols-2 gap-3">
                <Select label={sa.soilType} value={soil.soilType} onChange={v => set('soil', 'soilType', v)}
                    options={sa.soilTypes} placeholder="—" required />
                <Select label={sa.soilPH} value={soil.soilPH} onChange={v => set('soil', 'soilPH', v)}
                    options={sa.soilPHOptions} placeholder="—" />
                <Select label={sa.soilDrainage} value={soil.soilDrainage} onChange={v => set('soil', 'soilDrainage', v)}
                    options={sa.soilDrainageOptions} placeholder="—" />
                <Select label={sa.soilFertility} value={soil.soilFertility} onChange={v => set('soil', 'soilFertility', v)}
                    options={sa.soilFertilityOptions} placeholder="—" />
            </div>
            <Input label={sa.soilContamination} value={soil.soilContamination} onChange={v => set('soil', 'soilContamination', v)} />
            <Toggle label={sa.soilCompaction} checked={!!soil.soilCompaction} onChange={v => set('soil', 'soilCompaction', v)} />
            <Textarea label={sa.soilNotes} value={soil.notes} onChange={v => set('soil', 'notes', v)} />
        </div>
    );
}

function Step3Elements({ data, onChange, sa }) {
    const elements = data.elements || [];
    const updateEl = (i, key, val) => {
        const next = elements.map((el, idx) => idx === i ? { ...el, [key]: val } : el);
        onChange({ ...data, elements: next });
    };

    const TYPE_CLASSES = {
        fixed:       'bg-slate-100 text-slate-700',
        movable:     'bg-amber-50 text-amber-700',
        replaceable: 'bg-sky-50 text-sky-700',
    };

    return (
        <div className="space-y-3">
            <SectionHeader title={sa.sectionElements} />
            {elements.length === 0 ? (
                <p className="text-sm text-gray-400 italic">{sa.noElements}</p>
            ) : (
                <p className="text-xs text-gray-400 italic">{sa.elementsHint}</p>
            )}
            {elements.map((el, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800">{el.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{sa.elementSource}: {el.source}</span>
                            <select
                                value={el.type}
                                onChange={e => updateEl(i, 'type', e.target.value)}
                                className={`text-xs rounded-lg px-2 py-1 border-0 font-medium ${TYPE_CLASSES[el.type] || ''}`}
                            >
                                <option value="fixed">{sa.elementFixed}</option>
                                <option value="movable">{sa.elementMovable}</option>
                                <option value="replaceable">{sa.elementReplaceable}</option>
                            </select>
                        </div>
                    </div>
                    <Textarea
                        label={sa.elementNotes}
                        value={el.notes}
                        onChange={v => updateEl(i, 'notes', v)}
                        rows={1}
                    />
                </div>
            ))}
        </div>
    );
}

function Step4GoalsConstraints({ data, onChange, sa }) {
    const { access: a, goals: g, constraints: c } = data;
    const set = (section, key, val) => onChange({ ...data, [section]: { ...data[section], [key]: val } });

    return (
        <div className="space-y-3">
            <SectionHeader title={sa.sectionAccess} />
            <Input label={sa.mainAccess} value={a.mainAccess} onChange={v => set('access', 'mainAccess', v)}
                placeholder="e.g. North gate on Elm Street" />
            <div className="grid grid-cols-2 gap-3">
                <Textarea label={sa.dailyUse} value={a.dailyUse} onChange={v => set('access', 'dailyUse', v)} />
                <Textarea label={sa.closeAtHand} value={a.closeAtHand} onChange={v => set('access', 'closeAtHand', v)} />
            </div>
            <Textarea label={sa.farAway} value={a.farAway} onChange={v => set('access', 'farAway', v)} />
            <Textarea label={sa.pathsNotes} value={a.notes} onChange={v => set('access', 'notes', v)} />

            <SectionHeader title={sa.sectionGoals} />
            <Select label={sa.mainGoal} value={g.mainGoal} onChange={v => set('goals', 'mainGoal', v)}
                options={sa.mainGoalOptions} placeholder="—" />
            <MultiSelect label={sa.productionGoals} value={g.productionGoals} onChange={v => set('goals', 'productionGoals', v)} options={sa.productionGoalOptions} />
            <div className="grid grid-cols-2 gap-3">
                <Select label={sa.maintenanceTime} value={g.maintenanceTime} onChange={v => set('goals', 'maintenanceTime', v)}
                    options={sa.maintenanceTimes} placeholder="—" />
                <Select label={sa.budget} value={g.budget} onChange={v => set('goals', 'budget', v)}
                    options={sa.budgets} placeholder="—" />
            </div>
            <Select label={sa.experienceLevel} value={g.experienceLevel} onChange={v => set('goals', 'experienceLevel', v)}
                options={sa.experienceLevels} placeholder="—" />
            <div className="grid grid-cols-2 gap-3">
                <Input label={sa.preferredPlants} value={g.preferredPlants} onChange={v => set('goals', 'preferredPlants', v)} />
                <Input label={sa.avoidedPlants} value={g.avoidedPlants} onChange={v => set('goals', 'avoidedPlants', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Input label={sa.animals} value={g.animals} onChange={v => set('goals', 'animals', v)} />
                <Input label={sa.allergies} value={g.allergies} onChange={v => set('goals', 'allergies', v)} />
            </div>
            <Textarea label={sa.aestheticPrefs} value={g.aestheticPrefs} onChange={v => set('goals', 'aestheticPrefs', v)} />
            <Toggle label={sa.childrenPets} checked={!!g.childrenPets} onChange={v => set('goals', 'childrenPets', v)} />

            <SectionHeader title={sa.sectionConstraints} />
            <div className="grid grid-cols-2 gap-3">
                <Input label={sa.localRules} value={c.localRules} onChange={v => set('constraints', 'localRules', v)} />
                <Input label={sa.pests} value={c.pests} onChange={v => set('constraints', 'pests', v)} />
                <Input label={sa.accessibility} value={c.accessibility} onChange={v => set('constraints', 'accessibility', v)} />
                <Input label={sa.irrigationLimits} value={c.irrigationLimits} onChange={v => set('constraints', 'irrigationLimits', v)} />
                <Input label={sa.privacy} value={c.privacy} onChange={v => set('constraints', 'privacy', v)} />
                <Input label={sa.safety} value={c.safety} onChange={v => set('constraints', 'safety', v)} />
            </div>
            <Textarea label={sa.constraintNotes} value={c.notes} onChange={v => set('constraints', 'notes', v)} />
        </div>
    );
}

// ── Wizard shell ───────────────────────────────────────────────────────────────

export default function SiteAnalysisWizard({ setup, overlayItems, zoneItems, initialData, onSave, onClose }) {
    const { t } = useLanguage();
    const sa = t.garden.siteAnalysis;

    const [step, setStep] = useState(0);
    const [data, setData] = useState(() =>
        initialData
            ? { ...buildDefault(setup, overlayItems, zoneItems), ...initialData }
            : buildDefault(setup, overlayItems, zoneItems)
    );

    const STEPS = sa.steps;
    const isLast = step === STEPS.length - 1;

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);
    const handleSave = () => onSave(data);

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">🌍 {sa.title}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{sa.subtitle}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5">×</button>
                </div>

                {/* Step tabs */}
                <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto">
                    {STEPS.map((label, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setStep(i)}
                            className={`flex-1 min-w-max text-xs font-medium px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                                i === step
                                    ? 'border-forest text-forest'
                                    : i < step
                                        ? 'border-forest/30 text-forest/60'
                                        : 'border-transparent text-gray-400'
                            }`}
                        >
                            <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] mr-1.5 ${
                                i < step ? 'bg-forest text-white' : i === step ? 'bg-forest/10 text-forest' : 'bg-gray-100 text-gray-400'
                            }`}>{i < step ? '✓' : i + 1}</span>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Body — scrollable */}
                <div className="overflow-y-auto flex-1 px-6 py-5">
                    {step === 0 && <Step1ClimateTopography data={data} onChange={setData} sa={sa} />}
                    {step === 1 && <Step2SectorsSoil data={data} onChange={setData} sa={sa} />}
                    {step === 2 && <Step3Elements data={data} onChange={setData} sa={sa} />}
                    {step === 3 && <Step4GoalsConstraints data={data} onChange={setData} sa={sa} />}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0">
                    <button
                        type="button"
                        onClick={step === 0 ? onClose : handleBack}
                        className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        {step === 0 ? '✕ Cancel' : '← Back'}
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-300">{step + 1} / {STEPS.length}</span>
                        {isLast ? (
                            <button
                                type="button"
                                onClick={handleSave}
                                className="bg-forest text-white text-sm px-5 py-2 rounded-lg font-medium hover:bg-green-800 transition-colors"
                            >
                                {sa.saveAnalysis}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="bg-forest text-white text-sm px-5 py-2 rounded-lg font-medium hover:bg-green-800 transition-colors"
                            >
                                Next →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
