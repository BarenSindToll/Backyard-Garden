/**
 * PermaculturePlanWizard — 3-step brief form.
 * Step 1: Conditions  (terrain / water / sun / soil)
 * Step 2: Intent      (goal / style / time / plants / issues)
 * Step 3: Review      (summary card + generate)
 *
 * Maps to existing POST /api/permaculture-plans/generate-draft payload.
 */
import { useState } from 'react';
import { apiUrl } from '../../utils/api';
import {
    MAIN_CROPS_ROMANIA,
    MAIN_CROP_GROUPS_ROMANIA,
    STRUCTURE_ICON,
    getPriorityMainCrops,
} from './mainCropsRomania';

// ── Option data ────────────────────────────────────────────────────────────────

const TERRAIN = [
    { key: 'flat',   label: 'Flat',         desc: 'Even ground, drains slowly' },
    { key: 'gentle', label: 'Gentle slope', desc: 'Mild gradient, good drainage' },
    { key: 'steep',  label: 'Steep slope',  desc: 'Strong drainage, erosion risk' },
];
const WATER = [
    { key: 'rain',   label: 'Rain only',  desc: 'No irrigation system' },
    { key: 'manual', label: 'Manual',     desc: 'Hose or watering can' },
    { key: 'irrig',  label: 'Irrigated',  desc: 'Drip or sprinkler installed' },
];
const SUN = [
    { key: 'full',    label: 'Full sun',  desc: '6+ hours direct' },
    { key: 'partial', label: 'Partial',   desc: '3–6 hours direct' },
    { key: 'mixed',   label: 'Mixed',     desc: 'Sun and shade in patches' },
];
const SOIL = [
    { key: 'sandy',   label: 'Sandy',    desc: 'Drains fast, low nutrients' },
    { key: 'loam',    label: 'Loam',     desc: 'Balanced, easy to work' },
    { key: 'clay',    label: 'Clay',     desc: 'Holds water, slow to drain' },
    { key: 'unknown', label: 'Not sure', desc: 'Skip and let AI infer' },
];
const GOALS = [
    { key: 'food',    label: 'Food production',  desc: 'Maximum yield — vegetables, fruit, perennials. Productive year-round.',   designFocus: 'food' },
    { key: 'low',     label: 'Low maintenance',  desc: 'Self-sustaining systems — perennials, mulch, drought-tolerant.',           designFocus: 'low-maintenance' },
    { key: 'beauty',  label: 'Flowers & beauty', desc: 'Ornamental focus with edible underplanting where it fits.',                designFocus: 'ornamental' },
    { key: 'wild',    label: 'Wildlife habitat', desc: 'Pollinator strips, hedges, water — invite biodiversity in.',               designFocus: 'biodiversity' },
    { key: 'balance', label: 'Mixed balanced',   desc: 'Some of each — production, beauty, habitat in equal measure.',            designFocus: 'balanced' },
];
const STYLES = ['Intensive beds', 'Food forest', 'Mixed', 'Greenhouse-focused'];
const TIMES  = ['<1 h', '1–3 h', '3–7 h', '7+ h'];
const ISSUES = ['Flooding', 'Drought', 'Strong wind', 'Poor soil', 'Too much shade', 'Steep slope'];
const CHANGE_LEVELS = [
    { key: 'minimal',   label: 'Minimal',   desc: 'Add a few elements, keep what you have' },
    { key: 'moderate',  label: 'Moderate',  desc: 'Reasonable redesign, some new elements' },
    { key: 'ambitious', label: 'Ambitious', desc: 'Full permaculture redesign' },
];
const ANIMAL_TYPES = [
    { type: 'chickens', label: 'Chickens', icon: '🐔' },
    { type: 'ducks',    label: 'Ducks',    icon: '🦆' },
    { type: 'bees',     label: 'Bees',     icon: '🐝' },
    { type: 'rabbits',  label: 'Rabbits',  icon: '🐇' },
    { type: 'goats',    label: 'Goats',    icon: '🐐' },
];
const PRODUCTIVE_AREAS = [
    { key: 'potatoes',             label: 'Potato area',                    icon: '🥔', hint: 'Field or raised-bed area for potatoes',                       allowsKey: null },
    { key: 'tomatoesInGreenhouse', label: 'Tomatoes in greenhouse / solar', icon: '🍅', hint: 'Greenhouse or polytunnel beds for tomatoes, peppers',          allowsKey: 'greenhouse' },
    { key: 'cabbage',              label: 'Cabbage bed',                    icon: '🥬', hint: 'Bed for brassicas (cabbage, kale, broccoli)',                 allowsKey: null },
    { key: 'carrots',              label: 'Carrot / root bed',              icon: '🥕', hint: 'Raised or field bed for root crops',                          allowsKey: null },
    { key: 'onionsGarlic',         label: 'Onion & garlic bed',             icon: '🧅', hint: 'Raised or field bed for alliums',                             allowsKey: null },
    { key: 'beansPeas',            label: 'Beans & peas',                   icon: '🫘', hint: 'Field row for legumes — nitrogen fixers',                      allowsKey: null },
    { key: 'cornPumpkin',          label: 'Three Sisters',                  icon: '🌽', hint: 'Corn + beans + pumpkin companion guild',                       allowsKey: 'guilds' },
    { key: 'saladGreens',          label: 'Salad greens',                   icon: '🥗', hint: 'Raised bed for cut-and-come-again lettuce, spinach, chard',   allowsKey: null },
    { key: 'herbs',                label: 'Herb garden',                    icon: '🌿', hint: 'Dedicated herb garden area (parsley, dill, lovage, basil)',    allowsKey: 'herbGarden' },
    { key: 'berryPatch',           label: 'Berry patch',                    icon: '🫐', hint: 'Berry patch with raspberries, strawberries, currants',          allowsKey: 'berryPatch' },
    { key: 'orchard',              label: 'Orchard',                        icon: '🍎', hint: 'Fruit tree area — apple, pear, plum, cherry',                  allowsKey: 'orchard' },
    { key: 'vineyard',             label: 'Vineyard / grape trellis',       icon: '🍇', hint: 'Grape vine on trellis or pergola',                             allowsKey: null },
    { key: 'medicinalFlowers',     label: 'Medicinal & pollinator flowers', icon: '🌸', hint: 'Guild with calendula, marigold, lavender, borage, yarrow',      allowsKey: null },
];

const PLANNING_INCLUSIONS = [
    { key: 'coopPlacement',      label: 'Coop placement',               icon: '🏚', forAnimals: ['chickens','ducks'], allowsKey: 'coop' },
    { key: 'manureComposting',   label: 'Manure composting',            icon: '♻️', forAnimals: ['chickens','ducks','goats','rabbits'], allowsKey: null },
    { key: 'rotationalGrazing',  label: 'Rotational grazing',           icon: '🔄', forAnimals: ['goats','rabbits'], allowsKey: null },
    { key: 'orchardChicken',     label: 'Orchard & chicken integration',icon: '🍎', forAnimals: ['chickens'], allowsKey: 'orchard' },
    { key: 'beeForage',          label: 'Bee forage & pollinator strip', icon: '🐝', forAnimals: ['bees'], allowsKey: null },
    { key: 'duckPond',           label: 'Duck pond integration',         icon: '🦆', forAnimals: ['ducks'], allowsKey: 'pond' },
];

const FOOD_COVERAGE_GOALS = [
    { key: 'supplement', label: 'Supplement only',          desc: 'Herbs, salads, seasonal extras' },
    { key: 'partial',    label: 'Partial food supply',      desc: 'Regular vegetables and fruit in season' },
    { key: 'high',       label: 'High production',          desc: 'Large part of vegetables and fruit' },
    { key: 'maximum',    label: 'Maximum self-sufficiency', desc: 'As much food as space allows' },
];
const FOOD_CATEGORIES = [
    { key: 'vegetables',       label: 'Vegetables',                     icon: '🥕' },
    { key: 'fruits',           label: 'Fruit',                          icon: '🍎' },
    { key: 'herbs',            label: 'Herbs',                          icon: '🌿' },
    { key: 'stapleCrops',      label: 'Staple crops',                   icon: '🌽', hint: 'Potatoes, corn, beans, squash' },
    { key: 'preservationCrops',label: 'Crops for preserving',           icon: '🍅', hint: 'Tomatoes, peppers, cabbage, cucumbers, berries' },
    { key: 'animalProducts',   label: 'Animal products',                icon: '🥚', hint: 'Eggs, honey, manure cycle' },
    { key: 'medicinalPlants',  label: 'Medicinal / tea plants',         icon: '🌸' },
];
const PRESERVATION_GOALS = [
    { key: 'freshEating',   label: 'Fresh eating',              icon: '🥗' },
    { key: 'canning',       label: 'Canning / sauces / zacuscă', icon: '🫙' },
    { key: 'drying',        label: 'Drying herbs / teas',        icon: '☀️' },
    { key: 'freezing',      label: 'Freezing',                   icon: '❄️' },
    { key: 'fermentation',  label: 'Fermentation / pickles / sauerkraut', icon: '🥒' },
    { key: 'winterStorage', label: 'Winter storage',              icon: '🏠', hint: 'Potatoes, onions, garlic, squash, apples' },
];

const GOAL_TO_TASK_TYPE = {
    food:    'food-production',
    low:     'low-maintenance',
    wild:    'biodiversity',
    beauty:  'full-design',
    balance: 'full-design',
};

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
    paper:   '#fbf7ea',
    cream:   '#ece2c8',
    sage:    '#d8e3c0',
    forest:  '#3d6b34',
    forest2: '#5e9050',
    deep:    '#1f3a18',
    ink:     '#1d2a20',
    soft:    '#485547',
    muted:   '#7c857a',
    line:    '#d3cdb8',
    lineSoft:'#e8e2cc',
};

// ── Shared atoms ───────────────────────────────────────────────────────────────

function FieldLabel({ children }) {
    return (
        <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: C.soft, fontWeight: 500, marginBottom: 10,
        }}>{children}</div>
    );
}

function OptionCard({ label, desc, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                textAlign: 'left', padding: '10px 13px', width: '100%',
                background: selected ? C.forest : C.paper,
                color: selected ? '#f4f1e6' : C.ink,
                border: `1px solid ${selected ? C.forest : C.line}`,
                borderRadius: 6, cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = C.forest2; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = C.line; }}
        >
            <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.2 }}>{label}</div>
            {desc && <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 3, lineHeight: 1.35 }}>{desc}</div>}
        </button>
    );
}

function GoalCard({ label, desc, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                textAlign: 'left', padding: '14px 16px', width: '100%',
                background: selected ? C.forest : C.paper,
                color: selected ? '#f4f1e6' : C.ink,
                border: `1px solid ${selected ? C.forest : C.line}`,
                borderRadius: 8, cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = C.forest2; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = C.line; }}
        >
            <div style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 16, fontWeight: 500, lineHeight: 1.2, marginBottom: 4 }}>
                {label}
            </div>
            <div style={{ fontSize: 12, opacity: selected ? 0.85 : 0.65, lineHeight: 1.4 }}>{desc}</div>
        </button>
    );
}

function Pill({ label, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 13px', borderRadius: 999, fontSize: 12.5,
                background: selected ? C.forest : 'transparent',
                color: selected ? '#f4f1e6' : C.soft,
                border: `1px solid ${selected ? C.forest : C.line}`,
                fontWeight: selected ? 500 : 400, cursor: 'pointer', transition: 'all 0.12s',
            }}
        >{label}</button>
    );
}

// ── Main crops picker ─────────────────────────────────────────────────────────

function MainCropsPicker({ selected, onToggle }) {
    const [showAll, setShowAll] = useState(false);
    const groups = showAll ? MAIN_CROP_GROUPS_ROMANIA : MAIN_CROP_GROUPS_ROMANIA.slice(0, 4);
    const selectedCount = selected?.size || 0;

    return (
        <div>
            {selectedCount > 0 && (
                <div style={{ fontSize: 11, color: C.forest, marginBottom: 6, fontWeight: 500 }}>
                    {selectedCount} crop{selectedCount !== 1 ? 's' : ''} selected
                </div>
            )}
            <div style={{
                maxHeight: showAll ? 300 : 200,
                overflowY: 'auto',
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 6,
                padding: '10px 12px',
                background: C.paper,
                transition: 'max-height 0.2s',
            }}>
                {groups.map(group => {
                    const crops = MAIN_CROPS_ROMANIA
                        .filter(c => c.group === group)
                        .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
                    return (
                        <div key={group} style={{ marginBottom: 11 }}>
                            <div style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: 8.5, letterSpacing: '0.14em',
                                textTransform: 'uppercase', color: C.muted,
                                marginBottom: 5,
                            }}>{group}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {crops.map(c => {
                                    const active = selected.has(c.name);
                                    const icon   = STRUCTURE_ICON[c.preferredStructure] || '';
                                    const tip    = [
                                        c.notes,
                                        c.preferredStructure && `Grows in: ${c.preferredStructure}`,
                                        `Zone ${c.permacultureZone}`,
                                    ].filter(Boolean).join(' · ');
                                    return (
                                        <button
                                            key={c.name}
                                            title={tip}
                                            onClick={() => onToggle(c.name)}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                                padding: '4px 9px', borderRadius: 999, fontSize: 11.5,
                                                background: active ? C.forest : 'transparent',
                                                color: active ? '#f4f1e6' : C.soft,
                                                border: `1px solid ${active ? C.forest : C.line}`,
                                                fontWeight: active ? 500 : 400,
                                                cursor: 'pointer', transition: 'all 0.1s',
                                            }}
                                        >
                                            {icon && <span style={{ fontSize: 11, lineHeight: 1, opacity: active ? 1 : 0.7 }}>{icon}</span>}
                                            <span>{c.name}</span>
                                            <span style={{ fontSize: 9.5, opacity: active ? 0.75 : 0.5, fontStyle: 'italic' }}>
                                                {c.labelRo}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6 }}>
                <button
                    onClick={() => setShowAll(v => !v)}
                    style={{
                        background: 'none', border: 'none',
                        color: C.muted, fontSize: 11, cursor: 'pointer', padding: 0,
                        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
                    }}
                >
                    {showAll ? '▲ Show fewer groups' : `▼ Show all groups (${MAIN_CROP_GROUPS_ROMANIA.length - 4} more)`}
                </button>
                <span style={{ fontSize: 10, color: C.muted, fontStyle: 'italic' }}>
                    Hover a crop for growing notes
                </span>
            </div>
        </div>
    );
}

// ── Food needs section ────────────────────────────────────────────────────────

const numInputStyle = {
    width: '100%', padding: '6px 10px', border: `1px solid #d3cdb8`,
    borderRadius: 6, fontSize: 13, textAlign: 'center',
    background: '#fbf7ea', color: '#1d2a20', outline: 'none',
};

function FoodNeedsSection({ householdNeeds, onChange }) {
    const set = (key, val) => onChange({ ...householdNeeds, [key]: val });
    const toggleCat  = (k) => set('foodCategories',    { ...householdNeeds.foodCategories,    [k]: !householdNeeds.foodCategories[k] });
    const togglePres = (k) => set('preservationGoals', { ...householdNeeds.preservationGoals, [k]: !householdNeeds.preservationGoals[k] });

    const chipStyle = (active) => ({
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 11px', borderRadius: 999, fontSize: 12,
        background: active ? C.forest : 'transparent',
        color: active ? '#f4f1e6' : C.soft,
        border: `1px solid ${active ? C.forest : C.line}`,
        fontWeight: active ? 500 : 400, cursor: 'pointer', transition: 'all 0.1s',
    });

    return (
        <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.soft, fontWeight: 600, marginBottom: 12 }}>
                Household food needs <span style={{ color: C.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>(optional)</span>
            </div>

            {/* Household size */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                    { key: 'householdSize', label: 'Total people' },
                    { key: 'adults',        label: 'Adults' },
                    { key: 'children',      label: 'Children' },
                ].map(({ key, label }) => (
                    <div key={key}>
                        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>{label}</div>
                        <input
                            type="number" min="0" max="20"
                            value={householdNeeds[key] || ''}
                            onChange={e => set(key, Number(e.target.value) || null)}
                            placeholder="—"
                            style={numInputStyle}
                        />
                    </div>
                ))}
            </div>

            {/* Coverage goal */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 6 }}>How much of your food should the garden supply?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {FOOD_COVERAGE_GOALS.map(g => (
                        <button key={g.key} onClick={() => set('foodCoverageGoal', g.key)} style={{
                            textAlign: 'left', padding: '7px 10px', borderRadius: 6, fontSize: 12,
                            background: householdNeeds.foodCoverageGoal === g.key ? C.forest : C.paper,
                            color: householdNeeds.foodCoverageGoal === g.key ? '#f4f1e6' : C.soft,
                            border: `1px solid ${householdNeeds.foodCoverageGoal === g.key ? C.forest : C.line}`,
                            cursor: 'pointer', transition: 'all 0.1s',
                        }}>
                            <span style={{ fontWeight: 600, display: 'block', lineHeight: 1.25 }}>{g.label}</span>
                            <span style={{ fontSize: 10, opacity: 0.75, lineHeight: 1.3, display: 'block' }}>{g.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Food categories */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 6 }}>What food types do you want?</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {FOOD_CATEGORIES.map(({ key, label, icon, hint }) => (
                        <button key={key} title={hint || ''} onClick={() => toggleCat(key)} style={chipStyle(!!householdNeeds.foodCategories[key])}>
                            <span style={{ fontSize: 13 }}>{icon}</span>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Preservation goals */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 6 }}>How do you want to store or preserve food?</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {PRESERVATION_GOALS.map(({ key, label, icon, hint }) => (
                        <button key={key} title={hint || ''} onClick={() => togglePres(key)} style={chipStyle(!!householdNeeds.preservationGoals[key])}>
                            <span style={{ fontSize: 13 }}>{icon}</span>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Diet notes */}
            <textarea
                value={householdNeeds.dietNotes || ''}
                onChange={e => set('dietNotes', e.target.value)}
                rows={2}
                placeholder="Example: mostly vegetables, lots of tomato sauce, no spicy peppers, children eat berries, we want eggs later…"
                style={{
                    width: '100%', padding: '8px 11px', fontSize: 12.5,
                    border: `1px solid ${C.line}`, borderRadius: 6,
                    fontFamily: 'inherit', background: C.paper, color: C.ink,
                    outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = C.forest2}
                onBlur={e => e.target.style.borderColor = C.line}
            />
        </div>
    );
}

// ── Productive area toggles ───────────────────────────────────────────────────

function ProductiveAreasSection({ productiveAreas, onToggle }) {
    const selected = Object.values(productiveAreas).filter(Boolean).length;
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.soft, fontWeight: 600 }}>
                    Which productive areas do you want?
                </div>
                {selected > 0 && (
                    <span style={{ fontSize: 10.5, color: C.forest, fontWeight: 500 }}>
                        {selected} selected
                    </span>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                {PRODUCTIVE_AREAS.map(({ key, label, icon, hint }) => {
                    const active = !!productiveAreas[key];
                    return (
                        <button
                            key={key}
                            title={hint}
                            onClick={() => onToggle(key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 10px', borderRadius: 6, fontSize: 12,
                                background: active ? C.forest : C.paper,
                                color: active ? '#f4f1e6' : C.soft,
                                border: `1px solid ${active ? C.forest : C.line}`,
                                fontWeight: active ? 500 : 400,
                                cursor: 'pointer', textAlign: 'left',
                                transition: 'all 0.1s',
                            }}
                        >
                            <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
                            <span style={{ lineHeight: 1.3 }}>{label}</span>
                        </button>
                    );
                })}
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6, fontStyle: 'italic' }}>
                These create dedicated structures on the map — not random plant placements.
            </div>
        </div>
    );
}

// ── Animal preferences section ────────────────────────────────────────────────

const STATUS_CYCLE   = [null, 'have', 'want', 'maybe'];
const STATUS_LABEL   = { have: 'Have', want: 'Want', maybe: 'Maybe' };
const STATUS_COLORS  = {
    have:  { bg: '#3d6b34', text: '#f4f1e6' },
    want:  { bg: '#5e9050', text: '#f4f1e6' },
    maybe: { bg: '#d8e3c0', text: '#3d6b34' },
};

function AnimalSection({ intent, setIntent }) {
    const cycleStatus = (type) => setIntent(prev => {
        const existing = prev.animals.find(a => a.type === type);
        const currentIdx = existing ? STATUS_CYCLE.indexOf(existing.status) : 0;
        const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
        if (!nextStatus) return { ...prev, animals: prev.animals.filter(a => a.type !== type) };
        if (existing) return { ...prev, animals: prev.animals.map(a => a.type === type ? { ...a, status: nextStatus } : a) };
        return { ...prev, animals: [...prev.animals, { type, status: nextStatus, count: 0, notes: '' }] };
    });

    const setCount = (type, val) => setIntent(prev => ({
        ...prev,
        animals: prev.animals.map(a => a.type === type ? { ...a, count: Math.max(0, Number(val) || 0) } : a),
    }));

    const toggleInclusion = (key) => setIntent(prev => {
        const next = new Set(prev.planningInclusions || []);
        next.has(key) ? next.delete(key) : next.add(key);
        return { ...prev, planningInclusions: next };
    });

    const selectedTypes = new Set(intent.animals.map(a => a.type));
    const relevantInclusions = PLANNING_INCLUSIONS.filter(p =>
        p.forAnimals.some(t => selectedTypes.has(t))
    );

    return (
        <div>
            <FieldLabel>Animals <span style={{ color: C.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — tap to add, tap again to cycle)</span></FieldLabel>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ANIMAL_TYPES.map(({ type, label, icon }) => {
                    const status = intent.animals.find(a => a.type === type)?.status || null;
                    const sc = status ? STATUS_COLORS[status] : null;
                    return (
                        <button key={type} onClick={() => cycleStatus(type)} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 999, fontSize: 12.5,
                            background: sc ? sc.bg : 'transparent',
                            color: sc ? sc.text : C.soft,
                            border: `1px solid ${sc ? 'transparent' : C.line}`,
                            fontWeight: sc ? 500 : 400, cursor: 'pointer', transition: 'all 0.12s',
                        }}>
                            <span style={{ fontSize: 14 }}>{icon}</span>
                            <span>{label}</span>
                            {status && <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>{STATUS_LABEL[status]}</span>}
                        </button>
                    );
                })}
            </div>

            {/* Count inputs */}
            {intent.animals.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {intent.animals.map(a => {
                        const def = ANIMAL_TYPES.find(t => t.type === a.type);
                        return (
                            <div key={a.type} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.cream, borderRadius: 6, padding: '5px 10px' }}>
                                <span style={{ fontSize: 13 }}>{def?.icon}</span>
                                <span style={{ fontSize: 12, color: C.soft }}>How many {a.type}?</span>
                                <input
                                    type="number" min="0" max="999"
                                    value={a.count || ''}
                                    onChange={e => setCount(a.type, e.target.value)}
                                    placeholder="0"
                                    style={{
                                        width: 52, padding: '3px 6px', fontSize: 12,
                                        border: `1px solid ${C.line}`, borderRadius: 4,
                                        textAlign: 'center', background: C.paper, color: C.ink, outline: 'none',
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Planning inclusions — only relevant to selected animals */}
            {relevantInclusions.length > 0 && (
                <div style={{ marginTop: 11 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
                        Include in the plan
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {relevantInclusions.map(({ key, label, icon }) => {
                            const active = (intent.planningInclusions || new Set()).has(key);
                            return (
                                <button key={key} onClick={() => toggleInclusion(key)} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '5px 11px', borderRadius: 999, fontSize: 12,
                                    background: active ? C.forest : 'transparent',
                                    color: active ? '#f4f1e6' : C.soft,
                                    border: `1px solid ${active ? C.forest : C.line}`,
                                    fontWeight: active ? 500 : 400, cursor: 'pointer', transition: 'all 0.1s',
                                }}>
                                    <span style={{ fontSize: 13 }}>{icon}</span>
                                    <span>{label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {intent.animals.length > 0 && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                    Tap again to cycle Have → Want → Maybe → off
                </div>
            )}
        </div>
    );
}

// ── Site analysis summary ──────────────────────────────────────────────────────

function assessSiteAnalysis(sa) {
    const checks = [
        { key: 'slope',    label: 'Terrain / slope',    value: sa?.topography?.slopeType },
        { key: 'slopeDir', label: 'Slope direction',    value: sa?.topography?.slopeDirection },
        { key: 'wind',     label: 'Dominant wind',      value: sa?.sectors?.dominantWind },
        { key: 'soil',     label: 'Soil type',          value: sa?.soil?.soilType },
        { key: 'drainage', label: 'Soil drainage',      value: sa?.soil?.soilDrainage },
        { key: 'water',    label: 'Water sources',      value: sa?.topography?.waterSources?.length > 0 ? sa.topography.waterSources.join(', ') : null },
        { key: 'sun',      label: 'Sunny / shaded areas', value: sa?.sectors?.sunnyAreas || sa?.sectors?.shadedAreas },
    ];

    const present = checks.filter(c => c.value);
    const missing = checks.filter(c => !c.value);
    const criticalMissingKeys = ['wind', 'slope', 'soil', 'drainage'];
    const criticalMissing = criticalMissingKeys
        .map(k => checks.find(c => c.key === k))
        .filter(c => !c?.value);

    let status = 'complete';
    if (!sa || present.length === 0) status = 'missing';
    else if (criticalMissing.length >= 2) status = 'incomplete';
    else if (missing.length >= 1) status = 'partial';

    return { status, present, missing, criticalMissing };
}

function SiteAnalysisSummary({ siteAnalysis, onOpenSiteAnalysis }) {
    const { status, present, missing, criticalMissing } = assessSiteAnalysis(siteAnalysis);
    const sa = siteAnalysis;

    // What the AI will use — build natural-language bullets
    const knownFacts = [
        sa?.topography?.slopeType && (
            sa?.topography?.slopeDirection
                ? `${sa.topography.slopeType} slope, ${sa.topography.slopeDirection}-facing`
                : `${sa.topography.slopeType} terrain`
        ),
        sa?.sectors?.dominantWind   && `dominant wind from the ${sa.sectors.dominantWind}`,
        sa?.soil?.soilType          && `${sa.soil.soilType} soil${sa.soil?.soilDrainage ? `, ${sa.soil.soilDrainage} drainage` : ''}`,
        sa?.soil?.soilFertility     && `soil fertility: ${sa.soil.soilFertility}`,
        sa?.topography?.waterSources?.length > 0 && `water sources: ${sa.topography.waterSources.join(', ')}`,
        sa?.topography?.rainwaterHarvesting && 'rainwater harvesting present',
        sa?.sectors?.sunnyAreas     && `sunny areas: ${sa.sectors.sunnyAreas}`,
        sa?.goals?.animals          && `animals: ${sa.goals.animals}`,
        sa?.goals?.childrenPets     && 'children or pets on site',
        sa?.climate?.climateZone    && `hardiness zone ${sa.climate.climateZone}`,
    ].filter(Boolean);

    const criticalImpact = {
        wind:     'windbreak and pond placement',
        slope:    'swale and water-harvesting placement',
        soil:     'raised bed height and soil amendment recommendations',
        drainage: 'pond and swale placement',
    };

    if (status === 'missing') {
        return (
            <div style={{
                background: '#fffbeb', border: '1px solid #d4a017',
                borderRadius: 8, padding: '14px 16px', marginBottom: 22,
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>⚠</span>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                            No Site Analysis found
                        </div>
                        <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.5 }}>
                            Generation will continue, but placement of swales, ponds, windbreaks, and sun-sensitive crops will be less accurate without site data.
                        </div>
                        {onOpenSiteAnalysis && (
                            <button
                                onClick={onOpenSiteAnalysis}
                                style={{
                                    marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
                                    background: '#92400e', color: '#fff', border: 'none',
                                    borderRadius: 5, padding: '6px 12px', fontSize: 12,
                                    fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em',
                                }}
                            >
                                Complete Site Analysis →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const incomplete = status === 'incomplete' || status === 'partial';

    return (
        <div style={{
            background: incomplete ? '#fffbeb' : '#f0f7ec',
            border: `1px solid ${incomplete ? '#d4a017' : 'rgba(61,107,52,0.3)'}`,
            borderRadius: 8, padding: '14px 16px', marginBottom: 22,
        }}>
            <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: incomplete ? '#92400e' : C.forest, marginBottom: 8, fontWeight: 600,
            }}>
                {incomplete ? '⚠ Partial site analysis' : '✓ Site analysis loaded'}
            </div>

            {knownFacts.length > 0 && (
                <>
                    <div style={{ fontSize: 11.5, color: C.soft, marginBottom: 6, fontWeight: 500 }}>
                        From your site analysis, the plan will use:
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '3px 0' }}>
                        {knownFacts.map((f, i) => (
                            <li key={i} style={{
                                width: '50%', fontSize: 12, color: C.ink,
                                lineHeight: 1.45, paddingRight: 8,
                                display: 'flex', alignItems: 'baseline', gap: 5,
                            }}>
                                <span style={{ color: C.forest, flexShrink: 0, fontSize: 10 }}>✓</span>
                                {f}
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {criticalMissing.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${incomplete ? '#fde68a' : 'rgba(61,107,52,0.15)'}` }}>
                    <div style={{ fontSize: 11.5, color: '#92400e', marginBottom: 5, fontWeight: 500 }}>
                        Missing — affects accuracy of:
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {criticalMissing.map(c => (
                            <li key={c.key} style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5, display: 'flex', gap: 5 }}>
                                <span style={{ flexShrink: 0 }}>–</span>
                                <span><strong>{c.label}</strong> → {criticalImpact[c.key] || 'general placement'}</span>
                            </li>
                        ))}
                    </ul>
                    {onOpenSiteAnalysis && (
                        <button
                            onClick={onOpenSiteAnalysis}
                            style={{
                                marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 5,
                                background: 'none', color: '#92400e',
                                border: '1px solid #d4a017', borderRadius: 5,
                                padding: '5px 11px', fontSize: 11.5, fontWeight: 600,
                                cursor: 'pointer', letterSpacing: '0.04em',
                            }}
                        >
                            Complete Site Analysis →
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Strategy data dependency note ─────────────────────────────────────────────
function StrategyDataNote({ siteAnalysis }) {
    const sa = siteAnalysis;

    const solarDeps = {
        label: '☀️ Solar Priority',
        description: 'Best when you care about maximum crop performance. Places demanding crops in the sunniest areas and protects productive beds from shade.',
        checks: [
            { ok: !!(sa?.sectors?.sunnyAreas || sa?.sectors?.shadedAreas), label: 'Sun/shade sector data', warn: 'Sun exposure data missing — solar placement will be estimated from North direction only' },
            { ok: !!(sa?.sectors?.northDirection), label: 'Orientation / north direction' },
        ],
    };
    const flowDeps = {
        label: '🚶 Flow & Access',
        description: 'Best when you care about daily usability. Places frequent-harvest crops near the house and connects productive areas with efficient paths.',
        checks: [
            { ok: true, label: 'House position (always assumed from map)' },
            { ok: !!(sa?.access?.mainAccess || sa?.access?.dailyUse), label: 'Access notes', warn: 'Access notes missing — daily-use placement will be estimated from map' },
        ],
    };
    const waterDeps = {
        label: '💧 Water & Gravity (advanced, optional)',
        description: 'Only when slope or water-flow data is available. Places water-demanding crops lower, swales on contour, drought-tolerant crops higher.',
        available: !!(sa?.topography?.slopeType && sa?.topography?.slopeDirection) || !!(sa?.topography?.poolingAreas),
        checks: [
            { ok: !!(sa?.topography?.slopeType), label: 'Slope type' },
            { ok: !!(sa?.topography?.slopeDirection), label: 'Slope direction' },
            { ok: !!(sa?.topography?.poolingAreas || sa?.topography?.drainageNotes), label: 'Water flow / pooling areas' },
        ],
    };

    const strategies = [solarDeps, flowDeps];

    return (
        <div style={{ marginBottom: 16 }}>
            {strategies.map(s => {
                const missing = s.checks.filter(c => !c.ok && c.warn);
                return (
                    <div key={s.label} style={{
                        marginBottom: 8, padding: '8px 12px', borderRadius: 6,
                        background: C.paper, border: `1px solid ${C.lineSoft}`,
                    }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.forest, marginBottom: 3 }}>
                            {s.label}
                        </div>
                        <div style={{ fontSize: 11.5, color: C.soft, lineHeight: 1.4, marginBottom: missing.length ? 5 : 0 }}>
                            {s.description}
                        </div>
                        {missing.map((c, i) => (
                            <div key={i} style={{ fontSize: 11, color: '#a06020', marginTop: 3, display: 'flex', gap: 5 }}>
                                <span>⚠</span><span>{c.warn}</span>
                            </div>
                        ))}
                    </div>
                );
            })}
            <div style={{
                padding: '7px 12px', borderRadius: 6,
                background: waterDeps.available ? '#f0f7ec' : C.cream,
                border: `1px solid ${waterDeps.available ? 'rgba(61,107,52,0.25)' : C.lineSoft}`,
            }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: waterDeps.available ? C.forest : C.muted, marginBottom: 3 }}>
                    {waterDeps.label}
                </div>
                <div style={{ fontSize: 11.5, color: C.soft, lineHeight: 1.4 }}>
                    {waterDeps.available
                        ? '✓ Slope or water-flow data found — Water & Gravity strategy can be applied as a future refinement.'
                        : 'Requires slope direction or water-flow data in Site Analysis. Not used as a default strategy.'}
                </div>
            </div>
        </div>
    );
}

// ── Steps ──────────────────────────────────────────────────────────────────────

function StepConditions({ cond, setCond, siteAnalysis, onOpenSiteAnalysis }) {
    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
                    Step 1 of 3
                </div>
                <h2 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 28, fontWeight: 400, lineHeight: 1.1, margin: 0, color: C.ink }}>
                    What's the site like?
                </h2>
                <p style={{ fontSize: 13.5, color: C.soft, marginTop: 8, maxWidth: 520, lineHeight: 1.5, marginBottom: 0 }}>
                    Tell the planner what you're working with. This shapes which plants and structures get suggested.
                </p>
            </div>

            <SiteAnalysisSummary siteAnalysis={siteAnalysis} onOpenSiteAnalysis={onOpenSiteAnalysis} />
            <StrategyDataNote siteAnalysis={siteAnalysis} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, rowGap: 22 }}>
                <div>
                    <FieldLabel>Terrain</FieldLabel>
                    <div style={{ display: 'grid', gap: 6 }}>
                        {TERRAIN.map(o => <OptionCard key={o.key} {...o} selected={cond.terrain === o.key} onClick={() => setCond(c => ({ ...c, terrain: o.key }))} />)}
                    </div>
                </div>
                <div>
                    <FieldLabel>Water access</FieldLabel>
                    <div style={{ display: 'grid', gap: 6 }}>
                        {WATER.map(o => <OptionCard key={o.key} {...o} selected={cond.water === o.key} onClick={() => setCond(c => ({ ...c, water: o.key }))} />)}
                    </div>
                </div>
                <div>
                    <FieldLabel>Sun exposure</FieldLabel>
                    <div style={{ display: 'grid', gap: 6 }}>
                        {SUN.map(o => <OptionCard key={o.key} {...o} selected={cond.sun === o.key} onClick={() => setCond(c => ({ ...c, sun: o.key }))} />)}
                    </div>
                </div>
                <div>
                    <FieldLabel>Soil type</FieldLabel>
                    <div style={{ display: 'grid', gap: 6 }}>
                        {SOIL.map(o => <OptionCard key={o.key} {...o} selected={cond.soil === o.key} onClick={() => setCond(c => ({ ...c, soil: o.key }))} />)}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepIntent({ intent, setIntent }) {
    const toggle = (issue) => setIntent(i => {
        const next = new Set(i.issues);
        next.has(issue) ? next.delete(issue) : next.add(issue);
        return { ...i, issues: next };
    });
    const toggleCrop = (name) => setIntent(i => {
        const next = new Set(i.mainCrops);
        next.has(name) ? next.delete(name) : next.add(name);
        return { ...i, mainCrops: next };
    });

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
                    Step 2 of 3
                </div>
                <h2 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 28, fontWeight: 400, lineHeight: 1.1, margin: 0, color: C.ink }}>
                    What do you want most?
                </h2>
                <p style={{ fontSize: 13.5, color: C.soft, marginTop: 8, lineHeight: 1.5, marginBottom: 0 }}>
                    Pick a main goal — it shifts the whole plan. You can fine-tune below.
                </p>
            </div>

            <FieldLabel>Main goal</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
                {GOALS.map(g => (
                    <GoalCard key={g.key} label={g.label} desc={g.desc}
                        selected={intent.goal === g.key}
                        onClick={() => setIntent(i => ({ ...i, goal: g.key }))} />
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 22 }}>
                <div>
                    <FieldLabel>Design style</FieldLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {STYLES.map(s => <Pill key={s} label={s} selected={intent.style === s} onClick={() => setIntent(i => ({ ...i, style: s }))} />)}
                    </div>
                </div>
                <div>
                    <FieldLabel>Time per week</FieldLabel>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {TIMES.map(t => <Pill key={t} label={t} selected={intent.time === t} onClick={() => setIntent(i => ({ ...i, time: t }))} />)}
                    </div>
                </div>
                <div>
                    <FieldLabel>Change level</FieldLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {CHANGE_LEVELS.map(c => (
                            <button key={c.key} onClick={() => setIntent(i => ({ ...i, changeLevel: c.key }))} style={{
                                textAlign: 'left', padding: '6px 10px', borderRadius: 5, fontSize: 12,
                                background: intent.changeLevel === c.key ? C.forest : 'transparent',
                                color: intent.changeLevel === c.key ? '#f4f1e6' : C.soft,
                                border: `1px solid ${intent.changeLevel === c.key ? C.forest : C.line}`,
                                cursor: 'pointer',
                            }}>
                                <span style={{ fontWeight: 600 }}>{c.label}</span>
                                <span style={{ opacity: 0.7, marginLeft: 5, fontSize: 11 }}>{c.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: 22 }}>
                <FieldLabel>Main crops <span style={{ color: C.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(select from common Romanian crops)</span></FieldLabel>
                <MainCropsPicker selected={intent.mainCrops} onToggle={toggleCrop} />
            </div>

            <div style={{ marginBottom: 22 }}>
                <ProductiveAreasSection
                    productiveAreas={intent.productiveAreas}
                    onToggle={key => setIntent(i => ({
                        ...i,
                        productiveAreas: { ...i.productiveAreas, [key]: !i.productiveAreas[key] },
                    }))}
                />
            </div>

            <div style={{ marginBottom: 22 }}>
                <FoodNeedsSection
                    householdNeeds={intent.householdNeeds}
                    onChange={val => setIntent(i => ({ ...i, householdNeeds: val }))}
                />
            </div>

            <div style={{ marginBottom: 22 }}>
                <AnimalSection intent={intent} setIntent={setIntent} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 22 }}>
                <div>
                    <FieldLabel>Other plants I want <span style={{ color: C.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(free text)</span></FieldLabel>
                    <input
                        value={intent.preferred}
                        onChange={e => setIntent(i => ({ ...i, preferred: e.target.value }))}
                        placeholder="Hop, Lemon balm, Quinoa"
                        style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: C.paper, color: C.ink, outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>
                <div>
                    <FieldLabel>Plants to avoid</FieldLabel>
                    <input
                        value={intent.disliked}
                        onChange={e => setIntent(i => ({ ...i, disliked: e.target.value }))}
                        placeholder="Mint, Bamboo"
                        style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: C.paper, color: C.ink, outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>
            </div>

            <div>
                <FieldLabel>Known problems <span style={{ color: C.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(tap any that apply)</span></FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ISSUES.map(p => <Pill key={p} label={p} selected={intent.issues.has(p)} onClick={() => toggle(p)} />)}
                </div>
            </div>

            <div style={{ marginTop: 4 }}>
                <FieldLabel>Your own notes <span style={{ color: C.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(ideas, problems, wishes — in your own words)</span></FieldLabel>
                <textarea
                    value={intent.freeText}
                    onChange={e => setIntent(i => ({ ...i, freeText: e.target.value }))}
                    placeholder={
                        'Examples:\n' +
                        '• I want a pond near the apple tree.\n' +
                        '• The north corner is always waterlogged after rain.\n' +
                        '• My neighbour has a big oak that shades the east side.\n' +
                        '• I want to grow tomatoes every year without buying new soil.'
                    }
                    rows={5}
                    style={{
                        width: '100%', padding: '10px 12px',
                        border: `1px solid ${C.line}`, borderRadius: 6,
                        fontSize: 13, fontFamily: 'inherit',
                        background: C.paper, color: C.ink,
                        outline: 'none', resize: 'vertical',
                        lineHeight: 1.55, boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = C.forest2}
                    onBlur={e => e.target.style.borderColor = C.line}
                />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.4 }}>
                    Write anything — the AI reads this verbatim. The more specific, the better.
                </div>
            </div>
        </div>
    );
}

function StepReview({ cond, intent, setup }) {
    const goal    = GOALS.find(g => g.key === intent.goal);
    const terrain = TERRAIN.find(t => t.key === cond.terrain);
    const water   = WATER.find(w => w.key === cond.water);
    const sun     = SUN.find(s => s.key === cond.sun);
    const soil    = SOIL.find(s => s.key === cond.soil);
    const wM = setup?.widthM || '—';
    const hM = setup?.heightM || '—';
    const zone = setup?.hardinessZone || '—';

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
                    Step 3 of 3
                </div>
                <h2 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 28, fontWeight: 400, lineHeight: 1.1, margin: 0, color: C.ink }}>
                    Ready to generate
                </h2>
                <p style={{ fontSize: 13.5, color: C.soft, marginTop: 8, lineHeight: 1.5, marginBottom: 0 }}>
                    The planner will draft two variants — one tuned for production, one for biodiversity — based on this brief.
                </p>
            </div>

            <div style={{ background: C.sage, borderRadius: 10, padding: 20, marginBottom: 18 }}>
                <p style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 16, lineHeight: 1.5, margin: 0, color: C.deep }}>
                    A <strong style={{ fontWeight: 600 }}>{goal?.label?.toLowerCase() || 'balanced'}</strong> plan
                    for a <strong style={{ fontWeight: 600 }}>{wM}×{hM} m</strong> garden in zone {zone}
                    {intent.style !== 'Mixed' ? <>, {intent.style.toLowerCase()}</> : null},
                    on <strong style={{ fontWeight: 600 }}>{terrain?.label?.toLowerCase() || 'flat'}</strong> terrain
                    with <strong style={{ fontWeight: 600 }}>{soil?.label?.toLowerCase() || 'mixed'}</strong> soil
                    and <strong style={{ fontWeight: 600 }}>{sun?.label?.toLowerCase() || 'full sun'}</strong>.
                    {intent.issues.size > 0 && (
                        <> Mindful of <strong style={{ fontWeight: 600 }}>{[...intent.issues].join(', ').toLowerCase()}</strong>.</>
                    )}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: C.lineSoft, border: `1px solid ${C.lineSoft}`, borderRadius: 8, overflow: 'hidden' }}>
                {[
                    ['Terrain',  terrain?.label || '—'],
                    ['Water',    water?.label   || '—'],
                    ['Sun',      sun?.label     || '—'],
                    ['Soil',     soil?.label    || '—'],
                    ['Style',    intent.style],
                    ['Time/wk',  intent.time],
                    ['Change',   intent.changeLevel || 'moderate'],
                    ...(intent.animals?.length > 0 ? [['Animals', intent.animals.map(a => `${a.type} (${a.status})`).join(', ')]] : []),
                ].map(([k, v]) => (
                    <div key={k} style={{ background: C.paper, padding: '10px 14px' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, marginBottom: 2 }}>{k}</div>
                        <div style={{ fontSize: 13, color: C.ink }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Selected crops summary */}
            {intent.mainCrops?.size > 0 && (
                <div style={{ marginTop: 14 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, marginBottom: 7 }}>
                        Main crops ({intent.mainCrops.size})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {[...intent.mainCrops].map(name => {
                            const c = MAIN_CROPS_ROMANIA.find(x => x.name === name);
                            const icon = c ? (STRUCTURE_ICON[c.preferredStructure] || '') : '';
                            return (
                                <span key={name} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    padding: '3px 9px', borderRadius: 999, fontSize: 11,
                                    background: C.sage, color: C.deep,
                                    border: `1px solid rgba(61,107,52,0.2)`,
                                }}>
                                    {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
                                    <span>{name}</span>
                                    {c?.labelRo && <span style={{ opacity: 0.6, fontStyle: 'italic', fontSize: 9.5 }}>{c.labelRo}</span>}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {(intent.preferred || intent.disliked) && (
                <div style={{ marginTop: 12, fontSize: 12.5, color: C.soft, lineHeight: 1.6 }}>
                    {intent.preferred && (
                        <div>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.muted, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Also wants </span>
                            {intent.preferred}
                        </div>
                    )}
                    {intent.disliked && (
                        <div>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.muted, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Avoids </span>
                            {intent.disliked}
                        </div>
                    )}
                </div>
            )}

            {intent.freeText?.trim() && (
                <div style={{ marginTop: 14 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
                        Your notes
                    </div>
                    <div style={{
                        background: C.sage, borderRadius: 6, padding: '10px 14px',
                        fontSize: 12.5, color: C.ink, lineHeight: 1.6,
                        borderLeft: `3px solid ${C.forest2}`,
                        fontStyle: 'italic', whiteSpace: 'pre-wrap',
                    }}>
                        {intent.freeText.trim()}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PermaculturePlanWizard({
    setup,
    siteAnalysis,
    favoritePlants,
    overlayItems,
    initialStep,   // kept for back-compat
    onDraftChange,
    onClose,
    onOpenSiteAnalysis,
}) {
    const [step, setStep] = useState(1);
    const [generating, setGenerating] = useState(false);
    const [genError,   setGenError]   = useState('');
    const [genStatus,  setGenStatus]  = useState('');  // current step description during generation

    const [cond, setCond] = useState({
        terrain: 'flat', water: 'manual', sun: 'full', soil: 'loam',
    });
    const preselectedMainCrops = (() => {
        const favNames = new Set((favoritePlants || []).map(p => typeof p === 'string' ? p : p.name));
        return new Set(MAIN_CROPS_ROMANIA.filter(c => favNames.has(c.name)).map(c => c.name));
    })();

    const [intent, setIntent] = useState({
        goal: 'food', style: 'Mixed', time: '1–3 h', changeLevel: 'moderate',
        preferred: (favoritePlants || []).map(p => typeof p === 'string' ? p : p.name).slice(0, 6).join(', '),
        disliked: '',
        issues: new Set(),
        freeText: '',
        mainCrops: preselectedMainCrops,
        productiveAreas: {
            potatoes: false, tomatoesInGreenhouse: false, cabbage: false,
            carrots: false, onionsGarlic: false, beansPeas: false, cornPumpkin: false,
            saladGreens: false, herbs: false, berryPatch: false, orchard: false,
            vineyard: false, medicinalFlowers: false,
        },
        animals: [],
        planningInclusions: new Set(),
        householdNeeds: {
            householdSize: null,
            adults: null,
            children: null,
            foodCoverageGoal: 'supplement',
            foodCategories: {
                vegetables: true, fruits: true, herbs: true,
                stapleCrops: false, preservationCrops: false,
                animalProducts: false, medicinalPlants: false,
            },
            preservationGoals: {
                freshEating: true, canning: false, drying: false,
                freezing: false, fermentation: false, winterStorage: false,
            },
            dietNotes: '',
        },
    });

    // ── Generate ───────────────────────────────────────────────────────────────
    const handleGenerate = async () => {
        setGenerating(true);
        setGenError('');
        try {
            const condParts = [
                cond.terrain !== 'flat'   && `terrain: ${cond.terrain}`,
                cond.water   !== 'manual' && `water access: ${cond.water}`,
                cond.sun     !== 'full'   && `sun: ${cond.sun}`,
                cond.soil    !== 'loam'   && cond.soil !== 'unknown' && `soil: ${cond.soil}`,
                intent.issues.size > 0    && `site issues: ${[...intent.issues].join(', ')}`,
            ].filter(Boolean);

            const hn = intent.householdNeeds;
            const householdNote = hn.householdSize
                ? `Household: ${hn.householdSize} people${hn.adults ? ` (${hn.adults} adults${hn.children ? `, ${hn.children} children` : ''})` : ''}. Coverage goal: ${hn.foodCoverageGoal}.${
                    Object.entries(hn.preservationGoals).filter(([,v]) => v).length > 0
                        ? ` Preservation: ${Object.entries(hn.preservationGoals).filter(([,v]) => v).map(([k]) => k).join(', ')}.`
                        : ''
                  }${hn.dietNotes?.trim() ? ` Diet notes: ${hn.dietNotes.trim()}.` : ''}`
                : null;

            const noteParts = [
                intent.freeText?.trim()   && `User notes: ${intent.freeText.trim()}`,
                householdNote,
                condParts.length > 0      && `Site conditions — ${condParts.join('; ')}.`,
                intent.style !== 'Mixed'  && `Design style: ${intent.style}.`,
                intent.time  !== '1–3 h'  && `Available time per week: ${intent.time}.`,
            ].filter(Boolean);

            const goalConfig = GOALS.find(g => g.key === intent.goal) || GOALS[0];

            // ── Derive crop areas from main crop selections ──────────────────
            // Uses preferredStructure from mainCropsRomania.js for accuracy.
            const selectedCropNames = new Set([
                ...intent.mainCrops,
                ...intent.preferred.split(',').map(s => s.trim()).filter(Boolean),
            ]);
            const selectedCropData = MAIN_CROPS_ROMANIA.filter(c => selectedCropNames.has(c.name));
            const hasStructure = (struct) => selectedCropData.some(c => c.preferredStructure === struct);

            // Merge derived (from crops) OR explicit (from productive area toggles)
            const pa = intent.productiveAreas;
            const cropAreas = {
                potatoes:             pa.potatoes             || selectedCropNames.has('Potato'),
                tomatoesInGreenhouse: pa.tomatoesInGreenhouse || selectedCropData.some(c => c.name === 'Tomato' && c.preferredStructure === 'greenhouse'),
                cabbage:              pa.cabbage              || selectedCropNames.has('Cabbage'),
                carrots:              pa.carrots              || selectedCropNames.has('Carrot'),
                onionsGarlic:         pa.onionsGarlic         || selectedCropNames.has('Onion') || selectedCropNames.has('Garlic'),
                beansPeas:            pa.beansPeas            || selectedCropNames.has('Bean')  || selectedCropNames.has('Pea'),
                cornPumpkin:          pa.cornPumpkin          || selectedCropNames.has('Corn')  || selectedCropNames.has('Pumpkin'),
                saladGreens:          pa.saladGreens          || selectedCropNames.has('Lettuce') || selectedCropNames.has('Spinach') || selectedCropNames.has('Swiss Chard') || selectedCropNames.has('Kale'),
                herbs:                pa.herbs                || (hasStructure('raised-bed') && selectedCropData.some(c => c.category === 'herb')),
                berryPatch:           pa.berryPatch           || hasStructure('berry-patch'),
                orchard:              pa.orchard              || hasStructure('orchard'),
                vineyard:             pa.vineyard             || selectedCropNames.has('Grape'),
                medicinalFlowers:     pa.medicinalFlowers     || selectedCropData.some(c => c.category === 'flower' || c.category === 'dynamic_accumulator'),
            };

            // ── Smart allowedAdditions derived from all selections ───────────
            const pi = intent.planningInclusions || new Set();
            const hasChickensOrDucks = intent.animals.some(a => ['chickens','ducks'].includes(a.type));
            const hasBees            = intent.animals.some(a => a.type === 'bees');
            const hasDucks           = intent.animals.some(a => a.type === 'ducks');
            const allowedAdditions = {
                raisedBeds:   true,
                greenhouse:   cropAreas.tomatoesInGreenhouse || cond.sun === 'partial',
                pond:         intent.issues.has('Drought') || intent.issues.has('Flooding') || intent.goal === 'wild' || pi.has('duckPond'),
                swales:       cond.terrain !== 'flat' || intent.issues.has('Flooding') || intent.issues.has('Drought'),
                compost:      true,
                paths:        true,
                guilds:       cropAreas.orchard || cropAreas.cornPumpkin || intent.goal !== 'food',
                orchard:      cropAreas.orchard || pi.has('orchardChicken'),
                berryPatch:   cropAreas.berryPatch,
                herbGarden:   cropAreas.herbs,
                foodForest:   intent.goal === 'low' || intent.goal === 'wild' || (cropAreas.orchard && intent.goal !== 'food'),
                windbreak:    !!(siteAnalysis?.sectors?.dominantWind) || intent.issues.has('Strong wind'),
                coop:         hasChickensOrDucks || pi.has('coopPlacement'),
                beehives:     hasBees || pi.has('beeForage'),
            };

            // ── Task type ────────────────────────────────────────────────────
            const taskType = (hasChickensOrDucks || hasBees)
                ? 'animal-integration'
                : (GOAL_TO_TASK_TYPE[intent.goal] || 'full-design');

            // ── Site analysis acknowledgement ────────────────────────────────
            const saAssessment = assessSiteAnalysis(siteAnalysis);
            const siteAnalysisAcknowledgement = {
                usedFields: saAssessment.present.map(f => f.label),
                missingFields: saAssessment.missing.map(f => f.label),
                userConfirmedProceed: true,
            };

            // ── Merged preferred plants list ─────────────────────────────────
            const prioritizePlants = [...new Set([
                ...intent.mainCrops,
                ...intent.preferred.split(',').map(s => s.trim()).filter(Boolean),
            ])];
            const avoidPlants = intent.disliked.split(',').map(s => s.trim()).filter(Boolean);

            const generationRequest = {
                taskType,
                designFocus: goalConfig.designFocus,
                changeLevel: intent.changeLevel || 'moderate',
                maintenanceTime: intent.time,
                siteAnalysisAcknowledgement,

                cropPreferences: {
                    selectedMainCrops: [...intent.mainCrops],
                    cropAreas,
                    prioritizePlants,
                    avoidPlants,
                },

                animalPreferences: {
                    hasAnimals:          intent.animals.some(a => a.status === 'have'),
                    wantsAnimals:        intent.animals.some(a => a.status === 'want' || a.status === 'maybe'),
                    animals:             intent.animals,
                    planningInclusions:  [...pi],
                    manureManagement:    pi.has('manureComposting') || intent.animals.some(a => ['chickens','ducks','goats','rabbits'].includes(a.type)),
                    rotationalGrazing:   pi.has('rotationalGrazing'),
                    orchardIntegration:  pi.has('orchardChicken'),
                    beeForage:           pi.has('beeForage'),
                    duckPondIntegration: pi.has('duckPond'),
                    safetyNotes: '',
                },

                allowedAdditions,

                householdNeeds: {
                    householdSize:     intent.householdNeeds.householdSize,
                    adults:            intent.householdNeeds.adults,
                    children:          intent.householdNeeds.children,
                    foodCoverageGoal:  intent.householdNeeds.foodCoverageGoal,
                    foodCategories:    intent.householdNeeds.foodCategories,
                    preservationGoals: intent.householdNeeds.preservationGoals,
                    dietNotes:         intent.householdNeeds.dietNotes,
                },

                // Backward-compat alias kept for older backend paths
                plantPreferences: {
                    useFavorites:     true,
                    prioritizePlants,
                    avoidPlants,
                    allowSuggestions: true,
                },

                variantStrategies: {
                    defaultA: 'solar-priority',
                    defaultB: 'flow-access',
                    allowWaterGravityIfSiteDataExists: true,
                },

                outputOptions: {
                    variants:        2,
                    includeReasons:  true,
                    includeWarnings: true,
                    previewOnly:     true,
                },
                notes: noteParts.join(' '),
            };

            const STRATEGY_MAP = { A: 'solar-priority', B: 'flow-access' };
            const POST = (variantType) => fetch(apiUrl('/api/permaculture-plans/generate-draft'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    variantType,
                    variantStrategy: STRATEGY_MAP[variantType] || 'solar-priority',
                    generationRequest,
                }),
            }).then(r => r.json()).catch(() => ({ success: false, message: 'Network error' }));

            setGenStatus('Generating Variant A: Solar Priority & Variant B: Flow & Access…');
            const [dataA, dataB] = await Promise.all([POST('A'), POST('B')]);

            const planA = dataA.success ? dataA.plan : null;
            const planB = dataB.success ? dataB.plan : null;

            // Surface AI-charged-but-failed errors clearly
            const aiChargedError = [dataA, dataB]
                .filter(d => !d.success && d.aiWasCalled && d.chargedLikely)
                .map(d => d.message)
                .filter(Boolean)[0];

            if (planA || planB) {
                let warning = null;
                if (!planA && planB) warning = 'Variant A (Solar Priority) failed to generate — showing Variant B only.';
                if (planA && !planB) warning = 'Variant B (Flow & Access) failed to generate — showing Variant A only.';
                onDraftChange?.(planA || planB, planB || null, warning);
            } else if (aiChargedError) {
                // AI was called and charged but produced unusable output — show specific error
                setGenError(`AI generation failed: ${aiChargedError}`);
            } else {
                setGenError(
                    [dataA.message, dataB.message].filter(Boolean).join(' / ') ||
                    'Both variants failed to generate. Check your connection and try again.'
                );
            }
        } catch {
            setGenError('Network error. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    // ── Step indicator ─────────────────────────────────────────────────────────
    const StepDot = ({ n, label, active, done }) => (
        <button
            onClick={() => done ? setStep(n) : undefined}
            style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 0, background: 'none', border: 'none',
                color: active ? C.forest : done ? C.soft : C.muted,
                cursor: done ? 'pointer' : 'default',
            }}
        >
            <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
                background: active ? C.forest : done ? C.sage : 'transparent',
                color: active ? '#f4f1e6' : done ? C.forest : C.muted,
                border: active || done ? 'none' : `1px solid ${C.line}`,
            }}>
                {done ? '✓' : n}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: active ? 600 : 500 }}>
                {label}
            </span>
        </button>
    );

    // ── Loading overlay ────────────────────────────────────────────────────────
    if (generating) {
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,18,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                <div style={{ background: C.paper, borderRadius: 12, padding: '36px 44px', boxShadow: '0 20px 60px rgba(20,30,25,0.3)', textAlign: 'center', maxWidth: 420 }}>
                    <div style={{ display: 'inline-flex', marginBottom: 18 }}>
                        <svg width="48" height="48" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke={C.lineSoft} strokeWidth="2.5"/>
                            <circle cx="24" cy="24" r="20" fill="none" stroke={C.forest} strokeWidth="2.5"
                                strokeDasharray="40 80" strokeLinecap="round" transform="rotate(-90 24 24)">
                                <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="1.2s" repeatCount="indefinite"/>
                            </circle>
                        </svg>
                    </div>
                    <h2 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 22, margin: '0 0 12px', color: C.deep, lineHeight: 1.2 }}>
                        Generating two layout strategies
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, textAlign: 'left' }}>
                        {[
                            { label: 'Variant A — Solar Priority', desc: 'Elements placed for sun exposure: demanding crops on sunniest spots, shade-tolerant plants elsewhere', icon: '☀️' },
                            { label: 'Variant B — Flow & Access',  desc: 'Elements placed by visit frequency: daily-use crops close to house, low-maintenance systems further out', icon: '🚶' },
                        ].map(({ label, desc, icon }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.sage, borderRadius: 6, padding: '8px 12px' }}>
                                <span style={{ fontSize: 18 }}>{icon}</span>
                                <div>
                                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.forest, fontWeight: 600 }}>{label}</div>
                                    <div style={{ fontSize: 12.5, color: C.soft }}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: 12.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>
                        Analysing site analysis, crops, structures, and goals.<br/>Takes 15–30 seconds.
                    </p>
                </div>
            </div>
        );
    }

    // ── Main layout ────────────────────────────────────────────────────────────
    return (
        <div
            onClick={e => e.target === e.currentTarget && onClose?.()}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(16,22,18,0.55)', backdropFilter: 'blur(2px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 40, padding: 24,
            }}
        >
            <div style={{
                background: C.paper, borderRadius: 14,
                width: 'min(960px, 94vw)', height: 'min(82vh, 720px)',
                boxShadow: '0 30px 80px rgba(20,30,25,0.35), 0 0 0 1px rgba(20,30,25,0.08)',
                display: 'flex', overflow: 'hidden',
            }}>

                {/* Left rail */}
                <div style={{
                    width: 240, flexShrink: 0, background: C.cream,
                    borderRight: `1px solid ${C.lineSoft}`,
                    padding: '28px 24px', display: 'flex', flexDirection: 'column',
                }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
                        Generate plan
                    </div>
                    <h1 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 22, fontWeight: 400, lineHeight: 1.1, margin: 0, color: C.deep }}>
                        Brief the planner
                    </h1>

                    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <StepDot n={1} label="Conditions" active={step === 1} done={step > 1} />
                        <StepDot n={2} label="Intent"     active={step === 2} done={step > 2} />
                        <StepDot n={3} label="Review"     active={step === 3} done={false} />
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: `1px solid ${C.lineSoft}` }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>
                            Your garden
                        </div>
                        <div style={{ fontSize: 11.5, color: C.soft, lineHeight: 1.6 }}>
                            {setup?.widthM || '—'} × {setup?.heightM || '—'} m · Zone {setup?.hardinessZone || '—'}
                            {siteAnalysis && (
                                <><br/><span style={{ color: C.muted }}>Site analysis saved</span></>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                    {/* Top bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '16px 28px', borderBottom: `1px solid ${C.lineSoft}` }}>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, padding: 4, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
                            ✕
                        </button>
                    </div>

                    {/* Scrollable step content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
                        {step === 1 && <StepConditions cond={cond} setCond={setCond} siteAnalysis={siteAnalysis} onOpenSiteAnalysis={onOpenSiteAnalysis} />}
                        {step === 2 && <StepIntent intent={intent} setIntent={setIntent} />}
                        {step === 3 && <StepReview cond={cond} intent={intent} setup={setup} />}
                    </div>

                    {/* Error */}
                    {genError && (
                        <div style={{ margin: '0 28px 8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
                            ⚠ {genError}
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 28px', borderTop: `1px solid ${C.lineSoft}`,
                        background: C.cream,
                    }}>
                        <button
                            onClick={() => step === 1 ? onClose?.() : setStep(step - 1)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.soft, fontSize: 13, padding: '8px 4px', cursor: 'pointer' }}
                        >
                            {step === 1 ? '✕ Cancel' : '← Back'}
                        </button>

                        {step < 3 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.forest, color: '#f4f1e6', border: 'none', padding: '10px 18px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                            >
                                Continue →
                            </button>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.forest, color: '#f4f1e6', border: 'none', padding: '11px 20px', borderRadius: 6, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
                            >
                                ✦ Generate two variants
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
