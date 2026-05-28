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
    getPriorityMainCrops,
} from '../garden-layout/mainCropsRomania';

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

    return (
        <div>
            <div style={{
                maxHeight: showAll ? 260 : 180,
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
                        <div key={group} style={{ marginBottom: 10 }}>
                            <div style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: 8.5, letterSpacing: '0.14em',
                                textTransform: 'uppercase', color: C.muted,
                                marginBottom: 5,
                            }}>{group}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {crops.map(c => {
                                    const active = selected.has(c.name);
                                    return (
                                        <button
                                            key={c.name}
                                            title={c.companionNotes || ''}
                                            onClick={() => onToggle(c.name)}
                                            style={{
                                                padding: '4px 10px', borderRadius: 999,
                                                fontSize: 11.5,
                                                background: active ? C.forest : 'transparent',
                                                color: active ? '#f4f1e6' : C.soft,
                                                border: `1px solid ${active ? C.forest : C.line}`,
                                                fontWeight: active ? 500 : 400,
                                                cursor: 'pointer',
                                                transition: 'all 0.1s',
                                            }}
                                        >
                                            {c.name}
                                            <span style={{
                                                fontSize: 9.5,
                                                opacity: active ? 0.75 : 0.55,
                                                marginLeft: 4,
                                                fontStyle: 'italic',
                                            }}>
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
            <button
                onClick={() => setShowAll(v => !v)}
                style={{
                    marginTop: 5, background: 'none', border: 'none',
                    color: C.muted, fontSize: 11, cursor: 'pointer', padding: 0,
                    fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
                }}
            >
                {showAll ? '▲ Show fewer groups' : `▼ Show all groups (${MAIN_CROP_GROUPS_ROMANIA.length - 4} more)`}
            </button>
        </div>
    );
}

// ── Steps ──────────────────────────────────────────────────────────────────────

function StepConditions({ cond, setCond }) {
    return (
        <div>
            <div style={{ marginBottom: 24 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 22 }}>
                <div>
                    <FieldLabel>Design style</FieldLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {STYLES.map(s => <Pill key={s} label={s} selected={intent.style === s} onClick={() => setIntent(i => ({ ...i, style: s }))} />)}
                    </div>
                </div>
                <div>
                    <FieldLabel>Time per week</FieldLabel>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {TIMES.map(t => <Pill key={t} label={t} selected={intent.time === t} onClick={() => setIntent(i => ({ ...i, time: t }))} />)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 22 }}>
                <div>
                    <FieldLabel>Plants I love <span style={{ color: C.muted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></FieldLabel>
                    <input
                        value={intent.preferred}
                        onChange={e => setIntent(i => ({ ...i, preferred: e.target.value }))}
                        placeholder="Tomato, Lavender, Apple"
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
                    ['Terrain', terrain?.label || '—'],
                    ['Water',   water?.label || '—'],
                    ['Sun',     sun?.label || '—'],
                    ['Soil',    soil?.label || '—'],
                    ['Style',   intent.style],
                    ['Time/wk', intent.time],
                ].map(([k, v]) => (
                    <div key={k} style={{ background: C.paper, padding: '10px 14px' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, marginBottom: 2 }}>{k}</div>
                        <div style={{ fontSize: 13, color: C.ink }}>{v}</div>
                    </div>
                ))}
            </div>

            {(intent.preferred || intent.disliked) && (
                <div style={{ marginTop: 14, fontSize: 12.5, color: C.soft, lineHeight: 1.6 }}>
                    {intent.preferred && (
                        <div>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.muted, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loves </span>
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
}) {
    const [step, setStep] = useState(1);
    const [generating, setGenerating] = useState(false);
    const [genError,   setGenError]   = useState('');

    const [cond, setCond] = useState({
        terrain: 'flat', water: 'manual', sun: 'full', soil: 'loam',
    });
    const [intent, setIntent] = useState({
        goal: 'food', style: 'Mixed', time: '1–3 h',
        preferred: (favoritePlants || []).map(p => typeof p === 'string' ? p : p.name).slice(0, 6).join(', '),
        disliked: '',
        issues: new Set(),
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

            const noteParts = [
                condParts.length > 0                   && `Site conditions — ${condParts.join('; ')}.`,
                intent.style !== 'Mixed'               && `Design style: ${intent.style}.`,
                intent.time  !== '1–3 h'               && `Available time per week: ${intent.time}.`,
            ].filter(Boolean);

            const goalConfig = GOALS.find(g => g.key === intent.goal) || GOALS[0];

            const generationRequest = {
                taskType:    'full-layout',
                designFocus: goalConfig.designFocus,
                changeLevel: 'moderate',
                allowedAdditions: {
                    raisedBeds: true,
                    greenhouse: false,
                    pond:       intent.issues.has('Drought') || intent.issues.has('Flooding'),
                    compost:    true,
                    animalArea: false,
                    paths:      true,
                    guilds:     true,
                },
                plantPreferences: {
                    useFavorites:      true,
                    prioritizePlants:  intent.preferred.split(',').map(s => s.trim()).filter(Boolean),
                    avoidPlants:       intent.disliked.split(',').map(s => s.trim()).filter(Boolean),
                    allowSuggestions:  true,
                },
                outputOptions: {
                    variants:        2,
                    includeReasons:  true,
                    includeWarnings: true,
                    previewOnly:     true,
                },
                notes: noteParts.join(' '),
            };

            const POST = (variantType) => fetch(apiUrl('/api/permaculture-plans/generate-draft'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ variantType, generationRequest }),
            }).then(r => r.json()).catch(() => ({ success: false }));

            const [dataA, dataB] = await Promise.all([POST('A'), POST('B')]);

            const planA = dataA.success ? dataA.plan : null;
            const planB = dataB.success ? dataB.plan : null;

            if (planA || planB) {
                onDraftChange?.(planA || planB, planB || null);
            } else {
                setGenError(dataA.message || dataB.message || 'Generation failed. Please try again.');
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
                <div style={{ background: C.paper, borderRadius: 12, padding: '36px 44px', boxShadow: '0 20px 60px rgba(20,30,25,0.3)', textAlign: 'center', maxWidth: 380 }}>
                    <div style={{ display: 'inline-flex', marginBottom: 18 }}>
                        <svg width="48" height="48" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke={C.lineSoft} strokeWidth="2.5"/>
                            <circle cx="24" cy="24" r="20" fill="none" stroke={C.forest} strokeWidth="2.5"
                                strokeDasharray="40 80" strokeLinecap="round" transform="rotate(-90 24 24)">
                                <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="1.2s" repeatCount="indefinite"/>
                            </circle>
                        </svg>
                    </div>
                    <h2 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 22, margin: '0 0 8px', color: C.deep, lineHeight: 1.2 }}>
                        Drafting two variants
                    </h2>
                    <p style={{ fontSize: 13, color: C.soft, margin: 0, lineHeight: 1.55 }}>
                        Analysing site, plants, structures, and preferences. Should take about 15 seconds.
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
                        {step === 1 && <StepConditions cond={cond} setCond={setCond} />}
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
