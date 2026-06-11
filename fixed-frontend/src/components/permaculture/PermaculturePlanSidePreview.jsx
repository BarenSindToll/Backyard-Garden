/**
 * PermaculturePlanSidePreview
 * Right-side panel shown after the wizard generates a draft.
 * Prototype-style: cream background, serif header, grouped sections,
 * variant cards, sticky footer with Apply / Edit / Regenerate / Discard.
 */
import { useMemo, useState } from 'react';
import { getApplyMode, isApplyableElement, classifyApplyGroup, getSelectedApplyableElements } from '../../config/permaculturePlanSchema';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
    paper:   '#fbf7ea',
    cream:   '#ece2c8',
    sage:    '#d8e3c0',
    forest:  '#3d6b34',
    deep:    '#1f3a18',
    ink:     '#1d2a20',
    inkSoft: '#485547',
    muted:   '#7c857a',
    line:    '#d3cdb8',
    soft:    '#e8e2cc',
};

// ── Strategy badge derivation ─────────────────────────────────────────────────
// Returns a short badge string for the active variant strategy, or null.
function deriveStrategyBadge(el, variantStrategy) {
    // AI returned explicit strategyReason — use it
    if (el.strategyReason) return el.strategyReason;

    const reason   = (el.reason || '').toLowerCase();
    const strategy = el.variantStrategy || variantStrategy || '';

    if (strategy === 'solar-priority' || strategy === 'solar_priority') {
        if (reason.includes('high-sun') || reason.includes('full sun') || reason.includes('sunniest') || el.strategyTags?.includes('full-sun'))
            return 'Solar: full-sun placement';
        if (reason.includes('partial shade') || reason.includes('partial-shade') || el.strategyTags?.includes('partial-shade'))
            return 'Solar: partial-shade placement';
        if (reason.includes('solar priority') || reason.includes('variant a'))
            return 'Solar: sun-optimised';
        if (reason.includes('sun') || reason.includes('shade'))
            return 'Solar: sun considered';
    }
    if (strategy === 'flow-access' || strategy === 'flow_access') {
        if (reason.includes('zone 1') || reason.includes('daily harvest') || reason.includes('daily use') || el.strategyTags?.includes('zone-1'))
            return 'Access: Zone 1 — daily use';
        if (reason.includes('zone 2') || el.strategyTags?.includes('zone-2'))
            return 'Access: Zone 2 — regular access';
        if (reason.includes('zone 3') || el.strategyTags?.includes('zone-3'))
            return 'Access: Zone 3 — low frequency';
        if (reason.includes('path') || reason.includes('access') || el.strategyTags?.includes('path-access'))
            return 'Access: connects productive zones';
        if (reason.includes('close to house') || reason.includes('near house') || el.strategyTags?.includes('near-house'))
            return 'Access: near house';
    }
    if (strategy === 'water-gravity' || strategy === 'water_gravity') {
        if (reason.includes('contour') || reason.includes('slope') || el.strategyTags?.includes('contour'))
            return 'Water: slope / contour';
        if (reason.includes('low point') || reason.includes('lowest') || el.strategyTags?.includes('low-point'))
            return 'Water: low-point placement';
    }
    return null;
}

// ── Source extraction ─────────────────────────────────────────────────────────
// Pulls the first meaningful sentence from an element's reason as a short "Because…" line.
function extractBecause(reason) {
    if (!reason) return null;
    const first = reason.split(/\.\s+/)[0].trim();
    if (first.length < 18) return null;
    return first.length > 110 ? first.slice(0, 107) + '…' : first;
}

// ── Site analysis panel ────────────────────────────────────────────────────────
function SiteAnalysisPanel({ summary }) {
    const [collapsed, setCollapsed] = useState(false);

    if (!summary) return null;
    const { usedFacts = [], missingFacts = [], confidenceImpact = [] } = summary;
    if (!usedFacts.length && !missingFacts.length) return null;

    const hasMissing = missingFacts.length > 0 || confidenceImpact.length > 0;

    return (
        <div style={{
            background: hasMissing ? '#fffbeb' : '#f0f7ec',
            border: `1px solid ${hasMissing ? 'rgba(180,120,0,0.3)' : 'rgba(61,107,52,0.25)'}`,
            borderRadius: 8, padding: '10px 13px', marginBottom: 18,
        }}>
            <button
                onClick={() => setCollapsed(v => !v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: hasMissing ? '#a06020' : '#3d6b34', fontWeight: 600 }}>
                    {hasMissing ? '⚠ Site Analysis — partial data' : '✓ Used from Site Analysis'}
                </span>
                <span style={{ fontSize: 10, color: '#7c857a' }}>{collapsed ? '▼' : '▲'}</span>
            </button>

            {!collapsed && (
                <div style={{ marginTop: 8 }}>
                    {usedFacts.length > 0 && (
                        <div style={{ marginBottom: missingFacts.length ? 8 : 0 }}>
                            {usedFacts.map((f, i) => (
                                <div key={i} style={{ display: 'flex', gap: 5, marginTop: i > 0 ? 3 : 0 }}>
                                    <span style={{ color: '#3d6b34', fontSize: 10, flexShrink: 0, marginTop: 2 }}>✓</span>
                                    <span style={{ fontSize: 11.5, color: '#1d2a20', lineHeight: 1.4 }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {missingFacts.length > 0 && (
                        <div style={{ paddingTop: 6, borderTop: usedFacts.length ? '1px solid rgba(160,96,32,0.2)' : 'none' }}>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a06020', marginBottom: 4 }}>
                                Missing — placement estimated
                            </div>
                            {missingFacts.map((f, i) => (
                                <div key={i} style={{ display: 'flex', gap: 5, marginTop: i > 0 ? 3 : 0 }}>
                                    <span style={{ color: '#a06020', fontSize: 10, flexShrink: 0, marginTop: 2 }}>–</span>
                                    <span style={{ fontSize: 11, color: '#78350f', lineHeight: 1.35 }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {confidenceImpact.length > 0 && (
                        <div style={{ marginTop: 5 }}>
                            {confidenceImpact.map((f, i) => (
                                <div key={i} style={{ display: 'flex', gap: 5, marginTop: i > 0 ? 2 : 0 }}>
                                    <span style={{ color: '#a06020', fontSize: 10, flexShrink: 0, marginTop: 2 }}>!</span>
                                    <span style={{ fontSize: 10.5, color: '#78350f', fontStyle: 'italic', lineHeight: 1.35 }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Household food strategy panel ─────────────────────────────────────────────
function FoodStrategyPanel({ strategy }) {
    const [collapsed, setCollapsed] = useState(true);  // collapsed by default — less prominent

    if (!strategy) return null;
    const { householdSize, coverageGoal, realism, estimatedIntensity, bedCountTarget, recommendations = [], warnings = [] } = strategy;

    const goalLabel = { supplement: 'Supplement', partial: 'Partial', high: 'High production', maximum: 'Max self-sufficiency' };
    const realismColor = realism === 'space-limited' ? '#a06020' : realism === 'ambitious' ? '#856020' : '#3d6b34';

    return (
        <div style={{ background: '#f5f9f2', border: '1px solid rgba(61,107,52,0.2)', borderRadius: 8, padding: '10px 13px', marginBottom: 18 }}>
            <button
                onClick={() => setCollapsed(v => !v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#3d6b34', fontWeight: 600 }}>
                    🥕 Food needs strategy
                </span>
                <span style={{ fontSize: 10, color: '#7c857a' }}>{collapsed ? '▼' : '▲'}</span>
            </button>

            {/* Always-visible summary line */}
            <div style={{ fontSize: 11.5, color: '#485547', marginTop: 5, lineHeight: 1.4 }}>
                {householdSize ? `${householdSize} people · ` : ''}
                <strong style={{ color: realismColor }}>{goalLabel[coverageGoal] || coverageGoal}</strong>
                {bedCountTarget ? ` · ${bedCountTarget} beds` : ''}
                {realism !== 'realistic' && <span style={{ color: realismColor, marginLeft: 5, fontSize: 10.5 }}>({realism})</span>}
            </div>

            {!collapsed && recommendations.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(61,107,52,0.15)' }}>
                    {recommendations.map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 5, marginTop: i > 0 ? 4 : 0 }}>
                            <span style={{ color: '#3d6b34', fontSize: 10, flexShrink: 0, marginTop: 2 }}>→</span>
                            <span style={{ fontSize: 11.5, color: '#1d2a20', lineHeight: 1.4 }}>{r}</span>
                        </div>
                    ))}
                    {warnings.map((w, i) => (
                        <div key={`w${i}`} style={{ display: 'flex', gap: 5, marginTop: 4, background: '#fffbeb', borderRadius: 4, padding: '4px 6px' }}>
                            <span style={{ color: '#a06020', fontSize: 10, flexShrink: 0, marginTop: 2 }}>⚠</span>
                            <span style={{ fontSize: 11, color: '#78350f', lineHeight: 1.35 }}>{w}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Element classification ─────────────────────────────────────────────────────
// Grouping is derived from `action` + `catalogKey`/`canonicalType` via
// classifyApplyGroup (shared with GardenLayout's apply pipeline) — never from
// the raw `type` field alone, which the AI can mislabel.
function groupElements(elements) {
    const groups = { structures: [], productive: [], water_ecology: [], recommendations: [] };
    elements.forEach(el => {
        const g = classifyApplyGroup(el);
        (groups[g] = groups[g] || []).push(el);
    });
    return groups;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDim(el) {
    const w = el.width;
    const h = el.height;
    if (!w) return null;
    if (!h || w === h) return `⌀ ${w} m`;
    return `${w} × ${h} m`;
}

function fitFromConf(confidence) {
    if (confidence == null) return null;
    const pct = confidence * 100;
    if (pct >= 80) return { label: 'Strong fit',   color: '#2d5a45' };
    if (pct >= 60) return { label: 'Worth trying',  color: '#a08465' };
    return               { label: 'Optional',       color: '#79857f' };
}

function avgConf(elements = []) {
    const cs = elements.filter(e => e.confidence != null).map(e => e.confidence);
    if (!cs.length) return null;
    return cs.reduce((a, b) => a + b, 0) / cs.length;
}

function getTitle(plan, variantIdx, totalVariants) {
    if (totalVariants >= 2) return variantIdx === 0 ? 'Solar Priority' : 'Flow & Access';
    // Fall back to plan summary or variant label from planNarrative
    const narrativeLine = (plan.planNarrative || '').split('\n').find(l => l.startsWith('## '));
    if (narrativeLine) return narrativeLine.replace('## Permaculture Plan — ', '').trim();
    const s = (plan.summary || '').split('.')[0].trim();
    return s.length > 0 && s.length <= 60 ? s : 'Permaculture Plan';
}

function getSubtitle(plan) {
    const src = plan.summary || plan.planNarrative || '';
    // find first non-heading line
    const first = src.split('\n').find(l => l.trim() && !l.startsWith('#'))?.replace(/^\*\*|\*\*$/g, '').trim() || '';
    if (first.length <= 140) return first || null;
    return first.slice(0, 140).trim() + '…';
}

// ── Atoms ──────────────────────────────────────────────────────────────────────

function PlanCheckbox({ checked, onChange, disabled }) {
    return (
        <button
            onClick={onChange}
            disabled={disabled}
            style={{
                width: 16, height: 16, marginTop: 2, flexShrink: 0,
                borderRadius: 3, border: `1.5px solid ${checked ? C.forest : C.line}`,
                background: checked ? C.forest : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer', padding: 0,
            }}
        >
            {checked && <span style={{ color: '#f4f1e6', fontSize: 9, lineHeight: 1, fontWeight: 700 }}>✓</span>}
        </button>
    );
}

function PlanTag({ children }) {
    return (
        <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, background: C.sage, color: C.forest, fontWeight: 500 }}>
            {children}
        </span>
    );
}

function VariantCard({ label, sub, confidence, active, onClick }) {
    return (
        <button onClick={onClick}
            style={{
                textAlign: 'left', flex: 1, padding: '8px 12px',
                background: active ? C.paper : 'transparent',
                border: `1px solid ${active ? C.forest : 'transparent'}`,
                borderRadius: 6, cursor: 'pointer', transition: 'all 0.12s',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: active ? C.forest : C.muted, fontWeight: 600 }}>
                    {label}
                </span>
                {confidence != null && (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: active ? C.inkSoft : C.muted }}>
                        {Math.round(confidence * 100)}%
                    </span>
                )}
            </div>
            {sub && (
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2, lineHeight: 1.3 }}>{sub}</div>
            )}
        </button>
    );
}

// ── Element card ───────────────────────────────────────────────────────────────
function PlanElementCard({ el, checked, onToggle, hovered, onHoverEnter, onHoverLeave, applying, variantStrategy }) {
    const applyMode   = getApplyMode(el);
    const isApplyable = applyMode !== 'recommendationOnly';
    const createsZoneTab = applyMode === 'linkedZoneElement';
    const isTip       = el.action === 'recommendation_only';
    const dim = formatDim(el);
    const fit = fitFromConf(el.confidence);

    return (
        <div
            onMouseEnter={onHoverEnter}
            onMouseLeave={onHoverLeave}
            style={{
                padding: '12px 0',
                borderTop: `1px solid ${C.soft}`,
                background: hovered ? 'rgba(61,107,52,0.04)' : 'transparent',
                opacity: isApplyable && !checked ? 0.45 : 1,
                transition: 'background 0.12s, opacity 0.12s',
            }}
        >
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {/* Checkbox / indicator */}
                {isApplyable ? (
                    <PlanCheckbox checked={checked} onChange={onToggle} disabled={applying} />
                ) : (
                    <span style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 11 }}>
                        {isTip ? '·' : '○'}
                    </span>
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 500, color: C.ink, lineHeight: 1.3 }}>
                            {el.name}
                        </span>
                        {dim && (
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: C.muted, flexShrink: 0 }}>
                                {dim}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                        {el.type && (
                            <span style={{ fontSize: 11, color: C.muted }}>
                                {el.type.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}
                                {el.targetZone ? ` · Zone ${el.targetZone}` : ''}
                            </span>
                        )}
                        {fit && (
                            <>
                                <span style={{ fontSize: 11, color: C.muted }}>·</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: fit.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: 11, color: fit.color, fontWeight: 500 }}>{fit.label}</span>
                                </span>
                            </>
                        )}
                        {createsZoneTab && (
                            <span style={{
                                fontSize: 10, fontWeight: 600, color: '#4a3a90',
                                background: 'rgba(91,78,192,0.10)', border: '1px solid rgba(91,78,192,0.25)',
                                borderRadius: 999, padding: '1px 7px',
                            }}>
                                ↗ creates zone tab
                            </span>
                        )}
                    </div>

                    {(() => {
                        const badge = deriveStrategyBadge(el, variantStrategy);
                        return badge ? (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                marginTop: 5, padding: '2px 8px', borderRadius: 999,
                                background: variantStrategy === 'flow-access' ? 'rgba(91,78,192,0.09)' : variantStrategy === 'water-gravity' ? 'rgba(26,112,192,0.09)' : 'rgba(180,140,0,0.10)',
                                border: `1px solid ${variantStrategy === 'flow-access' ? 'rgba(91,78,192,0.22)' : variantStrategy === 'water-gravity' ? 'rgba(26,112,192,0.22)' : 'rgba(180,140,0,0.22)'}`,
                                fontSize: 10.5, color: variantStrategy === 'flow-access' ? '#4a3a90' : variantStrategy === 'water-gravity' ? '#1a5a90' : '#7a6000',
                                fontWeight: 500,
                            }}>
                                {variantStrategy === 'flow-access' ? '🚶' : variantStrategy === 'water-gravity' ? '💧' : '☀️'}
                                <span>{badge}</span>
                            </div>
                        ) : null;
                    })()}

                    {el.reason && (() => {
                        const because = extractBecause(el.reason);
                        return (
                            <>
                                {because && (
                                    <p style={{ fontSize: 11, color: C.forest, margin: '5px 0 0', lineHeight: 1.35, fontStyle: 'italic' }}>
                                        Because: {because}
                                    </p>
                                )}
                                {el.reason.length > (because?.length ?? 0) + 5 && (
                                    <p style={{ fontSize: 11.5, color: C.inkSoft, margin: '3px 0 0', lineHeight: 1.45 }}>
                                        {el.reason}
                                    </p>
                                )}
                            </>
                        );
                    })()}

                    {el.plants?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 7 }}>
                            {el.plants.map((p, i) => <PlanTag key={i}>{p}</PlanTag>)}
                        </div>
                    )}

                    {el.warnings?.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                            {el.warnings.map((w, i) => (
                                <p key={i} style={{ fontSize: 11, color: '#a05020', background: '#fef3e8', borderRadius: 4, padding: '3px 8px', margin: i > 0 ? '3px 0 0' : 0, display: 'flex', gap: 4 }}>
                                    <span>⚠</span><span>{w}</span>
                                </p>
                            ))}
                        </div>
                    )}

                    {isTip && (
                        <p style={{ fontSize: 10.5, color: C.muted, fontStyle: 'italic', margin: '4px 0 0' }}>
                            Panel recommendation — not drawn on map.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Section group ──────────────────────────────────────────────────────────────
function PlanSection({ title, items, selected, onToggle, hoveredName, onHover, applying, variantStrategy }) {
    if (!items || items.length === 0) return null;
    return (
        <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 6, marginBottom: 2 }}>
                <h3 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 16, margin: 0, color: C.deep, fontWeight: 500 }}>
                    {title}
                </h3>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
            </div>
            {items.map((el, i) => (
                <PlanElementCard
                    key={i} el={el}
                    checked={selected?.has(el.name) ?? true}
                    onToggle={() => onToggle(el.name)}
                    hovered={hoveredName === el.name}
                    onHoverEnter={() => onHover(el.name)}
                    onHoverLeave={() => onHover(null)}
                    applying={applying}
                    variantStrategy={variantStrategy}
                />
            ))}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PermaculturePlanSidePreview({
    plan,
    selectedNames,
    onSelectionChange,
    hoveredName,
    onHover,
    applying,
    onApply,
    onReject,
    onRegenerate,
    onClose,
    applyWarning,
    applyError,
    skipped = [],
    previewHidden,
    onToggleHide,
    variants = [],
    activeVariantIndex = 0,
    onVariantSwitch,
}) {
    if (!plan) return null;

    const {
        proposedElements  = [],
        planNarrative     = '',
        summary           = '',
        planWarnings      = [],
        siteAnalysis      = {},
    } = plan;

    const siteAnalysisSummary   = siteAnalysis?.siteAnalysisSummary             || null;
    const householdFoodStrategy = plan.sourceContext?.householdFoodStrategy      || null;
    const variantStrategy       = plan.sourceContext?.variantStrategy             || null;
    const waterGravityAvailable = !!(plan.sourceContext?.siteAnalysisSummary?.usedFacts?.some(f => /slope|water flow|pooling|low point/i.test(f)));

    const applyableElements = useMemo(
        () => proposedElements.filter(isApplyableElement),
        [proposedElements]
    );

    const selected = useMemo(
        () => selectedNames === null ? new Set(applyableElements.map(e => e.name)) : (selectedNames || new Set()),
        [selectedNames, applyableElements]
    );

    const allChecked  = applyableElements.length > 0 && selected.size === applyableElements.length;

    // Same selection used by GardenLayout's apply payload — keeps the button
    // count and the actual number of elements applied in sync.
    const selectedApplyableElements = useMemo(
        () => getSelectedApplyableElements(proposedElements, selectedNames),
        [proposedElements, selectedNames]
    );
    const applyCount  = selectedApplyableElements.length;
    const noneChecked = applyCount === 0;

    const toggleElement = (name) => {
        const next = new Set(selected);
        next.has(name) ? next.delete(name) : next.add(name);
        onSelectionChange(next);
    };
    const toggleAll = () => onSelectionChange(allChecked ? new Set() : null);

    const groups = useMemo(() => groupElements(proposedElements), [proposedElements]);

    const totalVariants = variants.length;
    const planTitle = getTitle(plan, activeVariantIndex, totalVariants);
    const planSub   = getSubtitle(plan);

    const confA = avgConf(variants[0]?.proposedElements);
    const confB = avgConf(variants[1]?.proposedElements);

    return (
        <div style={{ width: '100%', height: '100%', background: C.paper, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ── Header ── */}
            <div style={{ padding: '14px 22px 12px', borderBottom: `1px solid ${C.soft}`, background: C.paper, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {totalVariants >= 2
                                ? (activeVariantIndex === 0 ? '☀️ Variant A — Solar Priority' : '🚶 Variant B — Flow & Access')
                                : 'Draft plan'}
                            {/* Source badge */}
                            {plan.aiSource === 'ai' && (
                                <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(61,107,52,0.15)', color: C.forest, fontWeight: 700, letterSpacing: '0.08em' }}>AI</span>
                            )}
                            {(plan.aiSource === 'mock' || plan.aiSource === 'rule_based') && (
                                <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(120,133,122,0.15)', color: C.muted, fontWeight: 700, letterSpacing: '0.08em' }} title="Rule-based fallback — AI was not used">DRAFT</span>
                            )}
                        </div>
                        <h2 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 22, fontWeight: 400, margin: 0, color: C.deep, lineHeight: 1.1 }}>
                            {planTitle}
                        </h2>
                        {planSub && (
                            <p style={{ fontSize: 12.5, color: C.inkSoft, margin: '3px 0 0', lineHeight: 1.4 }}>{planSub}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose || onReject}
                        style={{ background: 'none', border: 'none', color: C.muted, padding: 4, cursor: 'pointer', fontSize: 18, marginTop: -2, flexShrink: 0 }}
                    >✕</button>
                </div>

                {/* Variant strategy cards */}
                {variants.length > 1 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 12, padding: 3, background: C.cream, borderRadius: 8 }}>
                        <VariantCard
                            label="☀️ Solar Priority"
                            sub="Sun-optimised placement"
                            confidence={confA}
                            active={activeVariantIndex === 0}
                            onClick={() => onVariantSwitch?.(0)}
                        />
                        <VariantCard
                            label="🚶 Flow & Access"
                            sub="Proximity-optimised placement"
                            confidence={confB}
                            active={activeVariantIndex === 1}
                            onClick={() => onVariantSwitch?.(1)}
                        />
                    </div>
                )}
            </div>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 22px', borderBottom: `1px solid ${C.soft}`, background: C.paper, flexShrink: 0 }}>
                <button onClick={toggleAll}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.forest, fontSize: 12, padding: 0, fontWeight: 500, cursor: 'pointer' }}>
                    <span style={{
                        width: 14, height: 14, borderRadius: 3,
                        border: `1.5px solid ${C.forest}`,
                        background: allChecked ? C.forest : 'transparent',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: '#f4f1e6', flexShrink: 0,
                    }}>
                        {allChecked && <span style={{ fontSize: 8, fontWeight: 700 }}>✓</span>}
                    </span>
                    {allChecked ? 'Deselect all' : 'Select all'} ({applyCount}/{applyableElements.length})
                </button>
                <button onClick={onToggleHide}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.line}`, color: C.inkSoft, fontSize: 11.5, padding: '4px 10px', borderRadius: 999, cursor: 'pointer' }}>
                    {previewHidden ? '👁 Show on map' : '⊘ Hide on map'}
                </button>
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 20px', minHeight: 0 }}>

                {/* Site Analysis summary */}
                <SiteAnalysisPanel summary={siteAnalysisSummary} />

                {/* Household food strategy */}
                <FoodStrategyPanel strategy={householdFoodStrategy} />

                {/* Water & Gravity availability note */}
                {waterGravityAvailable && (
                    <div style={{ background: '#eef6ff', border: '1px solid rgba(26,112,192,0.25)', borderRadius: 6, padding: '8px 12px', marginBottom: 18 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a5a90', fontWeight: 600 }}>
                            💧 Water & Gravity data available
                        </span>
                        <div style={{ fontSize: 11, color: '#1d3a60', marginTop: 3, lineHeight: 1.4 }}>
                            Slope or water-flow data detected in Site Analysis. A Water & Gravity strategy can be applied as a future refinement.
                        </div>
                    </div>
                )}

                {/* Plan warnings */}
                {planWarnings.length > 0 && (
                    <div style={{ background: '#fef3e8', border: '1px solid #fcd9a8', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a06020', marginBottom: 6 }}>
                            Notes
                        </div>
                        {planWarnings.map((w, i) => (
                            <p key={i} style={{ fontSize: 11.5, color: '#92400e', margin: i > 0 ? '4px 0 0' : 0, lineHeight: 1.4 }}>• {w}</p>
                        ))}
                    </div>
                )}

                {/* Grouped sections */}
                <PlanSection title="Structures"               items={groups.structures}     selected={selected} onToggle={toggleElement} hoveredName={hoveredName} onHover={onHover} applying={applying} variantStrategy={variantStrategy} />
                <PlanSection title="Productive zones"         items={groups.productive}     selected={selected} onToggle={toggleElement} hoveredName={hoveredName} onHover={onHover} applying={applying} variantStrategy={variantStrategy} />
                <PlanSection title="Water & ecology"          items={groups.water_ecology}  selected={selected} onToggle={toggleElement} hoveredName={hoveredName} onHover={onHover} applying={applying} variantStrategy={variantStrategy} />
                <PlanSection title="Recommendations & warnings" items={groups.recommendations} selected={selected} onToggle={toggleElement} hoveredName={hoveredName} onHover={onHover} applying={applying} variantStrategy={variantStrategy} />

                {/* Skipped elements */}
                {skipped.length > 0 && (
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '12px 14px', marginTop: 8 }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c2410c', marginBottom: 6 }}>
                            {skipped.length} element{skipped.length !== 1 ? 's' : ''} skipped
                        </div>
                        {skipped.map((s, i) => (
                            <p key={i} style={{ fontSize: 11.5, color: '#9a3412', margin: i > 0 ? '4px 0 0' : 0, lineHeight: 1.4 }}>
                                <strong>{s.element}:</strong> {s.reason}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div style={{ padding: '12px 22px 14px', borderTop: `1px solid ${C.line}`, background: C.paper, flexShrink: 0 }}>

                {/* Apply error */}
                {applyError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11.5, color: '#dc2626' }}>
                        ⚠ {applyError}
                    </div>
                )}

                {/* Apply warning */}
                {applyWarning && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                        <p style={{ fontSize: 11.5, color: '#92400e', margin: '0 0 8px', lineHeight: 1.4 }}>⚠ {applyWarning.warning}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => onApply(true)} disabled={applying}
                                style={{ flex: 1, padding: '7px', background: '#d97706', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                                Apply Anyway
                            </button>
                            <button onClick={onClose} disabled={applying}
                                style={{ flex: 1, padding: '7px', background: 'none', border: `1px solid ${C.line}`, color: C.muted, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Primary apply button */}
                {!applyWarning && (
                    <button
                        onClick={() => onApply(false)}
                        disabled={applying || noneChecked}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            width: '100%', padding: '13px 16px', borderRadius: 8,
                            background: !noneChecked && !applying ? C.forest : C.line,
                            color: !noneChecked && !applying ? '#f4f1e6' : C.muted,
                            border: 'none', fontSize: 14, fontWeight: 500,
                            cursor: !noneChecked && !applying ? 'pointer' : 'not-allowed',
                            transition: 'background 0.12s',
                        }}
                    >
                        {applying ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
                                    <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(244,241,230,0.35)" strokeWidth="1.5"/>
                                    <circle cx="7" cy="7" r="5.5" fill="none" stroke="#f4f1e6" strokeWidth="1.5"
                                        strokeDasharray="12 22" strokeLinecap="round" transform="rotate(-90 7 7)">
                                        <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="1s" repeatCount="indefinite"/>
                                    </circle>
                                </svg>
                                Applying…
                            </>
                        ) : noneChecked ? (
                            'Select elements to apply'
                        ) : (
                            `✓ Apply ${applyCount} element${applyCount !== 1 ? 's' : ''} to map`
                        )}
                    </button>
                )}

                {/* Secondary actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => onRegenerate(2)} disabled={applying}
                        style={{ flex: 1, padding: '8px', background: 'none', border: `1px solid ${C.line}`, color: C.inkSoft, fontSize: 12, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        ✏ Edit brief
                    </button>
                    <button onClick={() => onRegenerate(1)} disabled={applying}
                        style={{ flex: 1, padding: '8px', background: 'none', border: `1px solid ${C.line}`, color: C.inkSoft, fontSize: 12, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        ↺ Regenerate
                    </button>
                    <button onClick={onReject} disabled={applying}
                        style={{ padding: '8px 12px', background: 'none', border: `1px solid ${C.line}`, color: C.muted, fontSize: 12, borderRadius: 6, cursor: 'pointer' }}>
                        Discard
                    </button>
                </div>
            </div>
        </div>
    );
}
