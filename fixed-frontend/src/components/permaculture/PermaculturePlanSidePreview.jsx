/**
 * PermaculturePlanSidePreview
 * Right-side panel shown after the wizard generates a draft.
 * Prototype-style: cream background, serif header, grouped sections,
 * sticky footer with Apply / Regenerate / Discard.
 *
 * MVP: single draft only — the old variant-comparison UI (dual strategy cards,
 * per-element strategy badges tied to solar-priority/flow-access/water-gravity)
 * has been removed. See git history if it's ever needed back.
 */
import { useMemo, useState } from 'react';
import { getSelectedApplyableElements } from '../../config/permaculturePlanSchema';

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

// MVP: single draft only — no variant switcher. Title falls back through the
// plan's own narrative/summary, or a generic "Permaculture Draft" label.
function getTitle(plan) {
    const narrativeLine = (plan.planNarrative || '').split('\n').find(l => l.startsWith('## '));
    if (narrativeLine) return narrativeLine.replace('## Permaculture Plan — ', '').trim();
    const s = (plan.summary || '').split('.')[0].trim();
    return s.length > 0 && s.length <= 60 ? s : 'Permaculture Draft';
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

// ── Element card ───────────────────────────────────────────────────────────────
function PlanElementCard({ el, checked, onToggle, hovered, onHoverEnter, onHoverLeave, applying, isMapVisible }) {
    // MVP cap: only the ≤2 map-visible, MVP-supported suggestions are applyable.
    // Everything else (non-MVP catalog types AND MVP items beyond the cap) is
    // advice-only — no checkbox, never sent to the apply endpoint. Applying
    // never creates a zone tab (Option A: simple overlay items only), so no
    // "creates zone tab" badge is shown here either.
    const isApplyable = isMapVisible;
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
                    <span title="Advice only" style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 11 }}>
                        ·
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
                        {!isApplyable && (
                            <span style={{
                                fontSize: 10, fontWeight: 600, color: C.muted,
                                background: C.cream, border: `1px solid ${C.line}`,
                                borderRadius: 999, padding: '1px 7px',
                            }}>
                                Additional recommendation
                            </span>
                        )}
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
                    </div>

                    {el.strategyReason && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            marginTop: 5, padding: '2px 8px', borderRadius: 999,
                            background: 'rgba(180,140,0,0.10)', border: '1px solid rgba(180,140,0,0.22)',
                            fontSize: 10.5, color: '#7a6000', fontWeight: 500,
                        }}>
                            <span>{el.strategyReason}</span>
                        </div>
                    )}

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

                    {!isApplyable && (
                        <p style={{ fontSize: 10.5, color: C.muted, fontStyle: 'italic', margin: '4px 0 0' }}>
                            Advice only — not applied to the map{el.adviceReason ? ` (${el.adviceReason})` : ''}.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Section group ──────────────────────────────────────────────────────────────
// Collapsible when `collapsible` is set — used for the Map suggestions /
// Additional recommendations split (task: additional recs collapsed by default).
function PlanSection({ title, subtitle, items, selected, onToggle, hoveredName, onHover, applying, isMapSection = false, collapsible = false, defaultCollapsed = false }) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    if (!items || items.length === 0) return null;
    return (
        <div style={{ marginBottom: 28 }}>
            <div
                onClick={collapsible ? () => setCollapsed(v => !v) : undefined}
                style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 6, marginBottom: 2, cursor: collapsible ? 'pointer' : 'default' }}
            >
                <h3 style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 16, margin: 0, color: C.deep, fontWeight: 500 }}>
                    {title}
                </h3>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                    {collapsible && <span style={{ fontSize: 10, color: C.muted }}>{collapsed ? '▼' : '▲'}</span>}
                </span>
            </div>
            {subtitle && !collapsed && (
                <p style={{ fontSize: 11, color: C.muted, margin: '0 0 6px', lineHeight: 1.4 }}>{subtitle}</p>
            )}
            {!collapsed && items.map((el, i) => (
                <PlanElementCard
                    key={i} el={el}
                    checked={selected?.has(el.name) ?? true}
                    onToggle={() => onToggle(el.name)}
                    hovered={hoveredName === el.name}
                    onHoverEnter={() => onHover(el.name)}
                    onHoverLeave={() => onHover(null)}
                    applying={applying}
                    isMapVisible={isMapSection}
                />
            ))}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PermaculturePlanSidePreview({
    plan,
    mapSuggestions = [],
    additionalRecommendations = [],
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
}) {
    if (!plan) return null;

    const {
        planNarrative     = '',
        summary           = '',
        planWarnings      = [],
        siteAnalysis      = {},
    } = plan;

    // mapSuggestions / additionalRecommendations come pre-validated from
    // GardenLayout's buildDraftPreview() — the same split used for the map
    // overlay and the apply payload. Never re-derived here.
    const mapItems        = mapSuggestions;
    const additionalItems = additionalRecommendations;

    const siteAnalysisSummary   = siteAnalysis?.siteAnalysisSummary             || null;
    const householdFoodStrategy = plan.sourceContext?.householdFoodStrategy      || null;

    const applyableElements = mapItems;

    const selected = useMemo(
        () => selectedNames === null ? new Set(applyableElements.map(e => e.name)) : (selectedNames || new Set()),
        [selectedNames, applyableElements]
    );

    const allChecked  = applyableElements.length > 0 && selected.size === applyableElements.length;

    // Same selection used by GardenLayout's apply payload — keeps the button
    // count and the actual number of elements applied in sync.
    const selectedApplyableElements = useMemo(
        () => getSelectedApplyableElements(applyableElements, selectedNames),
        [applyableElements, selectedNames]
    );
    const applyCount  = selectedApplyableElements.length;
    const noneChecked = applyCount === 0;
    // Distinguish "nothing was even suggested for the map" (e.g. every MVP
    // structure already exists) from "suggestions exist but none checked" —
    // the former gets its own disabled state instead of a misleading
    // "Select elements to apply" prompt with nothing to select.
    const hasNoMapSuggestions = mapItems.length === 0;

    const toggleElement = (name) => {
        const next = new Set(selected);
        next.has(name) ? next.delete(name) : next.add(name);
        onSelectionChange(next);
    };
    const toggleAll = () => onSelectionChange(allChecked ? new Set() : null);

    const planTitle = getTitle(plan);
    const planSub   = getSubtitle(plan);

    return (
        <div style={{ width: '100%', height: '100%', background: C.paper, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ── Header ── */}
            <div style={{ padding: '14px 22px 12px', borderBottom: `1px solid ${C.soft}`, background: C.paper, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Permaculture Draft
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

            {/* ── Human-review note ── */}
            <div style={{ padding: '8px 22px', background: C.cream, borderBottom: `1px solid ${C.soft}`, flexShrink: 0 }}>
                <p style={{ fontSize: 11, color: C.inkSoft, margin: 0, lineHeight: 1.4 }}>
                    This draft is based on your current garden layout and brief. Only selected MVP-supported suggestions can be applied to the map. Other ideas are shown as advice only.
                </p>
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 20px', minHeight: 0 }}>

                {/* How this draft was generated — short, grounds it in the real garden */}
                <div style={{ background: '#f0f7ec', border: '1px solid rgba(61,107,52,0.2)', borderRadius: 8, padding: '9px 13px', marginBottom: 18 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.forest, fontWeight: 600 }}>
                        How this draft was generated
                    </span>
                    <p style={{ fontSize: 11.5, color: C.inkSoft, margin: '4px 0 0', lineHeight: 1.4 }}>
                        Built from your current map ({plan.sourceContext?.gardenLayout?.widthM ?? '—'} × {plan.sourceContext?.gardenLayout?.heightM ?? '—'} m), its existing structures and zones, and your brief.
                    </p>
                </div>

                {/* Site Analysis summary */}
                <SiteAnalysisPanel summary={siteAnalysisSummary} />

                {/* Household food strategy */}
                <FoodStrategyPanel strategy={householdFoodStrategy} />

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

                {/* Map suggestions — the ≤2 elements actually drawn on the General Map */}
                <PlanSection
                    title="Map suggestions"
                    subtitle="Shown as dashed boxes on the map. Uncheck any you don't want applied."
                    items={mapItems} selected={selected} onToggle={toggleElement}
                    hoveredName={hoveredName} onHover={onHover} applying={applying}
                    isMapSection
                />

                {/* Additional recommendations — advice-only, never drawn on the map */}
                <PlanSection
                    title="Additional recommendations"
                    subtitle="Not drawn on the map — advice only."
                    items={additionalItems} selected={selected} onToggle={toggleElement}
                    hoveredName={hoveredName} onHover={onHover} applying={applying}
                    collapsible defaultCollapsed
                />

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
                    hasNoMapSuggestions ? (
                        <button
                            disabled
                            title="Every MVP-supported structure already exists on your map, or nothing fit safely — see Additional recommendations for advice instead."
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                width: '100%', padding: '13px 16px', borderRadius: 8,
                                background: C.line, color: C.muted,
                                border: 'none', fontSize: 14, fontWeight: 500, cursor: 'not-allowed',
                            }}
                        >
                            No map changes suggested
                        </button>
                    ) : (
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
                    )
                )}

                {/* Secondary actions — single-draft MVP: one Regenerate reopens the brief */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={onRegenerate} disabled={applying}
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
