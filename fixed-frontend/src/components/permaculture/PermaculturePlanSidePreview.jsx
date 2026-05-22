import { useMemo } from 'react';

const TYPE_COLORS = {
    'permaculture-zone': '#6040a0',
    'structure':         '#8B5E3C',
    'planting-strip':    '#4a7c3f',
    'water-feature':     '#1a70c0',
};
const TYPE_ICONS = {
    'permaculture-zone': '🔵',
    'structure':         '🏗',
    'planting-strip':    '🌿',
    'water-feature':     '💧',
};
const TYPE_LABELS = {
    'permaculture-zone': 'Conceptual zone',
    'structure':         'Structure',
    'planting-strip':    'Planting strip',
    'water-feature':     'Water feature',
};

// Actions that produce a map element (can be checked/applied).
// recommendation_only elements are panel-only.
const APPLY_ACTIONS = new Set(['create_new', 'enhance_existing', 'plant_inside_existing', 'add_near_existing']);

// Action badge styling
const ACTION_META = {
    create_new:            { label: 'Create new',         color: '#5b4ec0', bg: 'rgba(91,78,192,0.1)',   icon: '✚' },
    enhance_existing:      { label: 'Enhance existing',   color: '#b06010', bg: 'rgba(176,96,16,0.1)',  icon: '⟳' },
    plant_inside_existing: { label: 'Plant inside',       color: '#2e7d32', bg: 'rgba(46,125,50,0.1)',  icon: '🌱' },
    add_near_existing:     { label: 'Add near existing',  color: '#5b4ec0', bg: 'rgba(91,78,192,0.1)',   icon: '⊕' },
    recommendation_only:   { label: 'Recommendation',     color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '💡' },
};

function ActionBadge({ action }) {
    const meta = ACTION_META[action] || ACTION_META.recommendation_only;
    return (
        <span style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          3,
            fontSize:     9,
            fontWeight:   700,
            color:        meta.color,
            background:   meta.bg,
            borderRadius: 4,
            padding:      '1px 5px',
            lineHeight:   1.5,
            flexShrink:   0,
        }}>
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
        </span>
    );
}

function ConfidenceBar({ value = 0.8 }) {
    const pct   = Math.round((value ?? 0.8) * 100);
    const color = pct >= 85 ? '#4a7c3f' : pct >= 65 ? '#a07040' : '#b04040';
    return (
        <div className="flex items-center gap-1.5 flex-shrink-0">
            <div style={{ width: 36, height: 3, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, color, fontWeight: 600 }}>{pct}%</span>
        </div>
    );
}

/**
 * Right-side preview panel shown after the wizard generates a draft.
 * Replaces the normal sidebar column in GardenLayout.
 *
 * Props
 *   plan                – full plan object from the backend
 *   selectedNames       – Set | null (null = all selected)
 *   onSelectionChange   – (Set | null) => void
 *   hoveredName         – currently hovered element name (string | null)
 *   onHover             – (name | null) => void
 *   applying            – bool: apply request in progress
 *   onApply             – (force: bool) => void
 *   onReject            – () => void
 *   onRegenerate        – (initialStep: 1|2) => void — reopens wizard
 *   onClose             – () => void — close without saving
 *   applyWarning        – { warning: string } | null
 *   applyError          – string
 *   skipped             – [{ element, reason }]
 *   previewHidden       – bool
 *   onToggleHide        – () => void
 */
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
}) {
    if (!plan) return null;

    const {
        siteAnalysis     = {},
        proposedElements = [],
        planNarrative    = '',
        summary          = '',
        planWarnings     = [],
        bibliography     = [],
        createdAt,
    } = plan;

    // APPLY_ACTIONS is defined at module scope — used to distinguish map-renderable from panel-only elements.

    const applyableElements = useMemo(
        () => proposedElements.filter(e =>
            e.type !== 'permaculture-zone' && APPLY_ACTIONS.has(e.action || 'create_new')
        ),
        [proposedElements]
    );

    const recommendationElements = useMemo(
        () => proposedElements.filter(e => e.action === 'recommendation_only'),
        [proposedElements]
    );

    const selected = useMemo(
        () => selectedNames === null ? new Set(applyableElements.map(e => e.name)) : selectedNames,
        [selectedNames, applyableElements]
    );

    const allChecked  = selected.size === applyableElements.length;
    const noneChecked = selected.size === 0;

    const toggleElement = (name) => {
        const next = new Set(selected);
        next.has(name) ? next.delete(name) : next.add(name);
        onSelectionChange(next);
    };

    const toggleAll = () => onSelectionChange(allChecked ? new Set() : null);

    const narrative = summary || planNarrative;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">

            {/* ── Header ── */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200"
                 style={{ background: 'linear-gradient(135deg, #1a3a1a 0%, #2d5a28 100%)' }}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-white font-bold text-sm leading-tight">🌿 Permaculture Plan</p>
                        <p className="text-green-300 text-[10px] mt-0.5">
                            {applyableElements.length} element{applyableElements.length !== 1 ? 's' : ''}
                            {createdAt ? ` · ${new Date(createdAt).toLocaleDateString()}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            plan.aiSource === 'ai'
                                ? 'bg-forest/80 text-white'
                                : 'bg-amber-400/90 text-amber-900'
                        }`}>
                            {plan.aiSource === 'ai' ? 'AI' : 'DRAFT'}
                        </span>
                        <button onClick={onClose}
                            className="text-white/60 hover:text-white text-lg leading-none transition-colors">✕</button>
                    </div>
                </div>
            </div>

            {/* ── Preview active banner ── */}
            <div className="flex-shrink-0 px-3 py-1.5 border-b border-green-100 bg-green-50 flex items-center gap-2">
                <span className="text-[10px] text-green-700 font-semibold flex-1">
                    {previewHidden ? '👁 Preview hidden from map' : '📍 Elements shown on map'}
                </span>
                <button onClick={onToggleHide}
                    className="text-[10px] text-forest border border-forest/30 rounded-md px-2 py-0.5 hover:bg-green-100 transition-colors font-medium">
                    {previewHidden ? 'Show' : 'Hide'}
                </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto text-sm">

                {/* Summary */}
                {narrative && (
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Overview</p>
                        <p className="text-xs text-gray-700 leading-relaxed">
                            {narrative.split('\n').find(l => l.trim() && !l.startsWith('##'))?.replace(/^\*\*|\*\*$/g, '') || narrative.split('\n')[0]}
                        </p>
                        {plan.aiSource && (
                            <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                plan.aiSource === 'ai' ? 'bg-forest/10 text-forest' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {plan.aiSource === 'ai' ? '✦ AI Generated' : 'Rule-based plan'}
                            </span>
                        )}
                    </div>
                )}

                {/* Plan warnings */}
                {planWarnings.length > 0 && (
                    <div className="px-4 py-3 border-b border-amber-100 bg-amber-50">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Plan notes</p>
                        {planWarnings.map((w, i) => (
                            <p key={i} className="text-[11px] text-amber-800 leading-snug flex gap-1.5">
                                <span className="flex-shrink-0 mt-0.5">•</span><span>{w}</span>
                            </p>
                        ))}
                    </div>
                )}

                {/* Site analysis — brief */}
                {(siteAnalysis.opportunities?.length > 0 || siteAnalysis.constraints?.length > 0) && (
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Site Analysis</p>
                        {siteAnalysis.opportunities?.slice(0, 2).map((o, i) => (
                            <p key={i} className="flex gap-1.5 text-xs text-gray-700 mb-1">
                                <span className="text-green-500 flex-shrink-0">✓</span><span>{o}</span>
                            </p>
                        ))}
                        {siteAnalysis.constraints?.slice(0, 2).map((c, i) => (
                            <p key={i} className="flex gap-1.5 text-xs text-gray-700 mb-1">
                                <span className="text-amber-500 flex-shrink-0">⚠</span><span>{c}</span>
                            </p>
                        ))}
                    </div>
                )}

                {/* Proposed elements with checkboxes */}
                {proposedElements.length > 0 && (
                    <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Proposed Elements
                            </p>
                            {applyableElements.length > 0 && (
                                <button onClick={toggleAll}
                                    className="text-[10px] text-forest hover:underline font-medium flex-shrink-0">
                                    {allChecked ? 'Deselect all' : 'Select all'}
                                </button>
                            )}
                        </div>
                        {applyableElements.length > 0 && (
                            <p className="text-[10px] text-gray-400 mb-2.5">
                                {selected.size} of {applyableElements.length} selected for apply
                            </p>
                        )}

                        <div className="space-y-2">
                            {proposedElements.map((el, i) => {
                                const color      = TYPE_COLORS[el.type] || '#4a7c3f';
                                const icon       = TYPE_ICONS[el.type]  || '📍';
                                const label      = TYPE_LABELS[el.type] || el.type;
                                // recommendation_only and permaculture-zone elements cannot be applied
                                const isApply    = el.type !== 'permaculture-zone' &&
                                                   el.action !== 'recommendation_only';
                                const isChecked  = !isApply || selected.has(el.name);
                                const isHovered  = el.name === hoveredName;
                                const isRecommendationOnly = el.action === 'recommendation_only';

                                return (
                                    <div key={i}
                                        className={`rounded-xl border overflow-hidden transition-all cursor-default ${
                                            !isChecked ? 'opacity-40' : ''
                                        } ${isHovered ? 'ring-1' : ''}`}
                                        style={{
                                            borderColor: color + (isChecked ? '55' : '22'),
                                            ringColor:   color,
                                            boxShadow:   isHovered ? `0 0 0 2px ${color}40` : 'none',
                                        }}
                                        onMouseEnter={() => onHover(el.name)}
                                        onMouseLeave={() => onHover(null)}
                                    >
                                        {/* Row header */}
                                        <div className="flex items-start gap-2 px-3 py-2"
                                             style={{ background: isRecommendationOnly ? '#f9f9f9' : color + (isChecked ? '0d' : '06') }}>
                                            {isApply ? (
                                                <input type="checkbox" checked={isChecked}
                                                    onChange={() => toggleElement(el.name)}
                                                    disabled={applying}
                                                    className="mt-0.5 flex-shrink-0 accent-forest cursor-pointer" />
                                            ) : (
                                                /* recommendation_only and zone overlays: no checkbox, grey dash */
                                                <span className="text-[10px] flex-shrink-0 mt-0.5 text-gray-300 font-medium w-3 text-center select-none">–</span>
                                            )}
                                            <span className="text-sm flex-shrink-0">{icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <p className="font-semibold text-xs truncate" style={{ color }}>
                                                        {el.name}
                                                    </p>
                                                    <ConfidenceBar value={el.confidence} />
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                    <ActionBadge action={el.action || 'create_new'} />
                                                    <span className="text-[10px] text-gray-400">
                                                        {label}
                                                        {el.targetZone ? ` · Zone ${el.targetZone}` : ''}
                                                        {el.width && el.action !== 'recommendation_only' ? ` · ${el.width}×${el.height}m` : ''}
                                                    </span>
                                                </div>
                                                {/* Target element note */}
                                                {el.targetElementId && (
                                                    <p className="text-[10px] text-gray-500 mt-0.5 italic">
                                                        Targets existing map element
                                                    </p>
                                                )}
                                                {/* Catalog key note */}
                                                {el.catalogKey && (el.action === 'create_new' || el.action === 'add_near_existing') && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        From catalog: <span className="font-medium text-gray-600">{el.catalogKey.replace(/_/g, ' ')}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Body */}
                                        {(el.reason || el.plants?.length > 0 || el.warnings?.length > 0) && (
                                            <div className="px-3 pb-2.5 pt-1.5 space-y-1.5">
                                                {el.reason && (
                                                    <p className="text-[11px] text-gray-600 leading-snug">{el.reason}</p>
                                                )}
                                                {el.plants?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {el.plants.map((pl, pi) => (
                                                            <span key={pi} className="text-[10px] px-1.5 py-0.5 rounded-full border"
                                                                style={{ borderColor: color + '55', color, background: color + '10' }}>
                                                                {pl}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {el.warnings?.map((w, wi) => (
                                                    <p key={wi} className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1 flex gap-1">
                                                        <span className="flex-shrink-0">⚠</span><span>{w}</span>
                                                    </p>
                                                ))}
                                                {/* recommendation_only note — explains why there's no checkbox or map preview */}
                                                {isRecommendationOnly && (
                                                    <p className="text-[10px] text-gray-400 italic mt-1">
                                                        💡 Panel-only recommendation — not drawn on map, not applied to layout.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Skipped elements after partial apply */}
                {skipped.length > 0 && (
                    <div className="px-4 py-3 border-b border-orange-200 bg-orange-50">
                        <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider mb-1.5">
                            {skipped.length} element{skipped.length !== 1 ? 's' : ''} skipped
                        </p>
                        {skipped.map((s, i) => (
                            <p key={i} className="text-[11px] text-orange-900 leading-snug mb-1">
                                <span className="font-semibold">{s.element}:</span> {s.reason}
                            </p>
                        ))}
                    </div>
                )}

                {/* Bibliography */}
                {bibliography.length > 0 && (
                    <div className="px-4 py-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">References</p>
                        <ul className="space-y-1">
                            {bibliography.map((b, i) => (
                                <li key={i} className="text-[10px] text-gray-400 leading-snug pl-3 border-l-2 border-gray-200">{b}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-2">

                {/* Apply error */}
                {applyError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 flex gap-1.5">
                        <span className="flex-shrink-0">⚠</span><span>{applyError}</span>
                    </div>
                )}

                {/* Layout-changed warning */}
                {applyWarning && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 space-y-2">
                        <p className="text-[11px] text-amber-800 leading-snug">⚠ {applyWarning.warning}</p>
                        <div className="flex gap-2">
                            <button onClick={() => onApply(true)} disabled={applying}
                                className="flex-1 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50 transition-colors">
                                Apply Anyway
                            </button>
                            <button onClick={onClose} disabled={applying}
                                className="flex-1 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Primary apply */}
                {!applyWarning && (
                    <button
                        onClick={() => onApply(false)}
                        disabled={applying || noneChecked}
                        className="w-full py-2.5 bg-forest text-white text-sm rounded-xl hover:bg-green-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {applying ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Applying…
                            </>
                        ) : noneChecked ? (
                            'Select elements to apply'
                        ) : (
                            `✓ Apply ${selected.size} selected to map`
                        )}
                    </button>
                )}

                {/* Secondary actions */}
                <div className="flex gap-1.5">
                    <button onClick={() => onRegenerate(2)} disabled={applying}
                        className="flex-1 py-1.5 text-[11px] text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors">
                        ← Edit
                    </button>
                    <button onClick={() => onRegenerate(1)} disabled={applying}
                        className="flex-1 py-1.5 text-[11px] text-forest border border-forest/30 rounded-xl hover:bg-green-50 disabled:opacity-50 transition-colors font-medium">
                        ↺ New plan
                    </button>
                    <button onClick={onReject} disabled={applying}
                        className="flex-1 py-1.5 text-[11px] text-red-500 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors">
                        Reject
                    </button>
                </div>
            </div>
        </div>
    );
}
