/**
 * PermaculturePlanWizard — single-screen brief form (MVP).
 *
 * Collects a small brief (terrain / water / sun / soil / goal / style / time /
 * change level + optional plants & notes), sends ONE generation request, and
 * receives ONE Permaculture Draft. No variant system — this used to generate
 * two strategies (Solar Priority / Flow & Access) in parallel; that concept has
 * been removed entirely for MVP thesis-demo stability. See git history if a
 * future scope expansion needs it back.
 *
 * Maps to POST /api/permaculture-plans/generate-draft.
 */
import { useState } from 'react';
import { apiUrl } from '../../utils/api';

// ── Option data (matches the small MVP brief spec exactly) ─────────────────────

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
    { key: 'unknown', label: 'Not sure', desc: 'Skip and let the draft infer' },
];
const GOALS = [
    { key: 'food',    label: 'Food production',           designFocus: 'food' },
    { key: 'low',     label: 'Low maintenance',            designFocus: 'low-maintenance' },
    { key: 'wild',    label: 'Biodiversity / pollinators',  designFocus: 'biodiversity' },
    { key: 'balance', label: 'Balanced',                    designFocus: 'balanced' },
];
const STYLES = ['Mixed', 'Intensive beds', 'Greenhouse-focused', 'Food-forest inspired'];
const TIMES  = ['<1 h', '1–3 h', '3–7 h', '7+ h'];
const CHANGE_LEVELS = [
    { key: 'minimal',   label: 'Minimal',   desc: 'Add a few elements, keep what you have' },
    { key: 'moderate',  label: 'Moderate',  desc: 'Reasonable additions, some new elements' },
    { key: 'ambitious', label: 'Ambitious', desc: 'Larger set of new elements' },
];

const GOAL_TO_TASK_TYPE = {
    food:    'food-production',
    low:     'low-maintenance',
    wild:    'biodiversity',
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
            color: C.soft, fontWeight: 500, marginBottom: 8,
        }}>{children}</div>
    );
}

function OptionCard({ label, desc, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                textAlign: 'left', padding: '9px 12px', width: '100%',
                background: selected ? C.forest : C.paper,
                color: selected ? '#f4f1e6' : C.ink,
                border: `1px solid ${selected ? C.forest : C.line}`,
                borderRadius: 6, cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = C.forest2; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = C.line; }}
        >
            <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>{label}</div>
            {desc && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2, lineHeight: 1.3 }}>{desc}</div>}
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

// ── Site analysis — compact, informational only (no input needed) ─────────────

function assessSiteAnalysis(sa) {
    const checks = [
        { key: 'slope',    label: 'Terrain / slope',    value: sa?.topography?.slopeType },
        { key: 'wind',     label: 'Dominant wind',      value: sa?.sectors?.dominantWind },
        { key: 'soil',     label: 'Soil type',          value: sa?.soil?.soilType },
        { key: 'water',    label: 'Water sources',      value: sa?.topography?.waterSources?.length > 0 },
        { key: 'sun',      label: 'Sunny / shaded areas', value: sa?.sectors?.sunnyAreas || sa?.sectors?.shadedAreas },
    ];
    const present = checks.filter(c => c.value);
    return { hasAny: present.length > 0, presentCount: present.length, total: checks.length };
}

function SiteAnalysisNote({ siteAnalysis, onOpenSiteAnalysis }) {
    const { hasAny, presentCount, total } = assessSiteAnalysis(siteAnalysis);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            background: hasAny ? '#f0f7ec' : '#fffbeb',
            border: `1px solid ${hasAny ? 'rgba(61,107,52,0.25)' : '#d4a017'}`,
            borderRadius: 8, padding: '9px 13px', marginBottom: 18,
        }}>
            <span style={{ fontSize: 12, color: hasAny ? C.forest : '#92400e' }}>
                {hasAny
                    ? `✓ Site analysis loaded (${presentCount}/${total} facts) — the draft will use it.`
                    : '⚠ No site analysis yet — placement will be estimated from the map only.'}
            </span>
            {onOpenSiteAnalysis && (
                <button
                    onClick={onOpenSiteAnalysis}
                    style={{ flexShrink: 0, background: 'none', border: 'none', color: hasAny ? C.forest : '#92400e', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                    {hasAny ? 'Edit →' : 'Complete →'}
                </button>
            )}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PermaculturePlanWizard({
    setup,
    siteAnalysis,
    favoritePlants,
    onDraftChange,
    onClose,
    onOpenSiteAnalysis,
}) {
    const [generating, setGenerating] = useState(false);
    const [genError,   setGenError]   = useState('');

    const [cond, setCond] = useState({ terrain: 'flat', water: 'manual', sun: 'full', soil: 'loam' });
    const [goal, setGoal] = useState('food');
    const [style, setStyle] = useState('Mixed');
    const [time, setTime] = useState('1–3 h');
    const [changeLevel, setChangeLevel] = useState('moderate');
    const [preferred, setPreferred] = useState(
        (favoritePlants || []).map(p => typeof p === 'string' ? p : p.name).slice(0, 6).join(', ')
    );
    const [avoided, setAvoided] = useState('');
    const [notes, setNotes] = useState('');

    // ── Generate ───────────────────────────────────────────────────────────────
    const handleGenerate = async () => {
        setGenerating(true);
        setGenError('');
        try {
            const goalConfig = GOALS.find(g => g.key === goal) || GOALS[0];

            const condParts = [
                cond.terrain !== 'flat'   && `terrain: ${cond.terrain}`,
                cond.water   !== 'manual' && `water access: ${cond.water}`,
                cond.sun     !== 'full'   && `sun: ${cond.sun}`,
                cond.soil    !== 'loam'   && cond.soil !== 'unknown' && `soil: ${cond.soil}`,
            ].filter(Boolean);

            const noteParts = [
                notes.trim() && `User notes: ${notes.trim()}`,
                condParts.length > 0 && `Site conditions — ${condParts.join('; ')}.`,
                style !== 'Mixed' && `Design style: ${style}.`,
                time  !== '1–3 h' && `Available time per week: ${time}.`,
            ].filter(Boolean);

            const saAssessment = assessSiteAnalysis(siteAnalysis);
            const siteAnalysisAcknowledgement = {
                usedFields: saAssessment.hasAny ? [`${saAssessment.presentCount}/${saAssessment.total} known facts`] : [],
                missingFields: saAssessment.hasAny ? [] : ['site analysis'],
                userConfirmedProceed: true,
            };

            const prioritizePlants = preferred.split(',').map(s => s.trim()).filter(Boolean);
            const avoidPlants = avoided.split(',').map(s => s.trim()).filter(Boolean);

            // Lightweight signal for the backend's rule-based fallback (used only when
            // the AI is unavailable) — kept small and derived straight from the brief,
            // scoped to the MVP-supported structure set (no crop/animal pickers).
            const allowedAdditions = {
                raisedBeds: true,
                compost: true,
                paths: true,
                greenhouse: style === 'Greenhouse-focused' || cond.sun !== 'full',
                pond: goal === 'wild',
                orchard: style === 'Food-forest inspired' || goal === 'food',
                guilds: goal !== 'food',
            };

            // Single generation request — one draft, no variant strategies.
            const generationRequest = {
                taskType: GOAL_TO_TASK_TYPE[goal] || 'full-design',
                designFocus: goalConfig.designFocus,
                changeLevel,
                maintenanceTime: time,
                siteAnalysisAcknowledgement,
                cropPreferences: { prioritizePlants, avoidPlants },
                allowedAdditions,
                // Backward-compat alias kept for older backend paths
                plantPreferences: { useFavorites: true, prioritizePlants, avoidPlants, allowSuggestions: true },
                outputOptions: { includeReasons: true, includeWarnings: true, previewOnly: true },
                notes: noteParts.join(' '),
            };

            const res = await fetch(apiUrl('/api/permaculture-plans/generate-draft'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ generationRequest }),
            }).then(r => r.json()).catch(() => ({ success: false, message: 'Network error' }));

            if (res.success && res.plan) {
                onDraftChange?.(res.plan);
            } else if (res.aiWasCalled && res.chargedLikely) {
                setGenError(`Draft generation failed: ${res.message}`);
            } else {
                setGenError(res.message || 'Draft generation failed. Check your connection and try again.');
            }
        } catch {
            setGenError('Network error. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

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
                        Generating permaculture draft
                    </h2>
                    <p style={{ fontSize: 12.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>
                        Analysing your garden setup, existing structures, plants, and preferences.<br/><br/>
                        This creates a draft only. You can review suggestions before applying them.
                    </p>
                </div>
            </div>
        );
    }

    // ── Main layout ────────────────────────────────────────────────────────────
    return (
        <div
            onClick={e => e.target === e.currentTarget && onClose?.()}
            style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,18,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
        >
            <div style={{
                background: C.paper, borderRadius: 14,
                width: 'min(680px, 94vw)', maxHeight: '88vh',
                boxShadow: '0 30px 80px rgba(20,30,25,0.35), 0 0 0 1px rgba(20,30,25,0.08)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '22px 28px 16px', borderBottom: `1px solid ${C.lineSoft}` }}>
                    <div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
                            Generate Draft
                        </div>
                        <h1 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 21, fontWeight: 400, lineHeight: 1.1, margin: 0, color: C.deep }}>
                            Brief the planner
                        </h1>
                        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>
                            {setup?.widthM || '—'} × {setup?.heightM || '—'} m garden · takes under 30 seconds
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, padding: 4, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
                </div>

                {/* Scrollable content — single screen, no steps */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

                    <SiteAnalysisNote siteAnalysis={siteAnalysis} onOpenSiteAnalysis={onOpenSiteAnalysis} />

                    {/* Basic conditions */}
                    <FieldLabel>Basic conditions</FieldLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                        <div>
                            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Terrain</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {TERRAIN.map(o => <OptionCard key={o.key} {...o} selected={cond.terrain === o.key} onClick={() => setCond({ ...cond, terrain: o.key })} />)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Water access</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {WATER.map(o => <OptionCard key={o.key} {...o} selected={cond.water === o.key} onClick={() => setCond({ ...cond, water: o.key })} />)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Sun exposure</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {SUN.map(o => <OptionCard key={o.key} {...o} selected={cond.sun === o.key} onClick={() => setCond({ ...cond, sun: o.key })} />)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Soil type</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {SOIL.map(o => <OptionCard key={o.key} {...o} selected={cond.soil === o.key} onClick={() => setCond({ ...cond, soil: o.key })} />)}
                            </div>
                        </div>
                    </div>

                    {/* Intent */}
                    <FieldLabel>Intent</FieldLabel>
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Main goal</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {GOALS.map(g => <OptionCard key={g.key} label={g.label} selected={goal === g.key} onClick={() => setGoal(g.key)} />)}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                        <div>
                            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 6 }}>Style</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {STYLES.map(s => <Pill key={s} label={s} selected={style === s} onClick={() => setStyle(s)} />)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 6 }}>Time per week</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {TIMES.map(t => <Pill key={t} label={t} selected={time === t} onClick={() => setTime(t)} />)}
                            </div>
                        </div>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 6 }}>Change level</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                            {CHANGE_LEVELS.map(c => <OptionCard key={c.key} {...c} selected={changeLevel === c.key} onClick={() => setChangeLevel(c.key)} />)}
                        </div>
                    </div>

                    {/* Optional */}
                    <FieldLabel>Optional</FieldLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
                        <div>
                            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>Preferred plants (comma separated)</div>
                            <input value={preferred} onChange={e => setPreferred(e.target.value)} placeholder="e.g. tomato, basil, apple"
                                style={{ width: '100%', padding: '8px 11px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12.5, background: C.paper, color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>Plants to avoid (comma separated)</div>
                            <input value={avoided} onChange={e => setAvoided(e.target.value)} placeholder="e.g. mint, walnut"
                                style={{ width: '100%', padding: '8px 11px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12.5, background: C.paper, color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>Short notes</div>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Anything else worth knowing?"
                                style={{ width: '100%', padding: '8px 11px', border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 12.5, background: C.paper, color: C.ink, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                    </div>
                </div>

                {/* Error */}
                {genError && (
                    <div style={{ margin: '0 28px 8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
                        ⚠ {genError}
                    </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderTop: `1px solid ${C.lineSoft}`, background: C.cream }}>
                    <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.soft, fontSize: 13, padding: '8px 4px', cursor: 'pointer' }}>
                        ✕ Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.forest, color: '#f4f1e6', border: 'none', padding: '11px 20px', borderRadius: 6, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
                    >
                        ✦ Generate Draft
                    </button>
                </div>
            </div>
        </div>
    );
}
