import { useState, useMemo } from 'react';

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
    'permaculture-zone': 'Zone',
    'structure':         'Structure',
    'planting-strip':    'Planting Strip',
    'water-feature':     'Water Feature',
};

function ConfidenceBar({ value }) {
    const pct = Math.round((value ?? 0.8) * 100);
    const color = pct >= 85 ? '#4a7c3f' : pct >= 65 ? '#a07040' : '#b04040';
    return (
        <div className="flex items-center gap-1.5 flex-shrink-0">
            <div style={{ width: 40, height: 3, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, color, fontWeight: 600 }}>{pct}%</span>
        </div>
    );
}

/**
 * Props:
 *   plan              – the permaculture plan draft object
 *   applying          – boolean: apply is in progress
 *   onApply(names)    – called with array of selected element names
 *   onForceApply(names) – force-apply after layout-changed warning
 *   onReject          – reject the draft
 *   onRegenerate      – re-open the wizard to generate a new draft
 *   onClose           – close without applying
 *   applyWarning      – { warning } object when layout changed
 *   skippedElements   – [{ element, reason }] shown after partial apply
 */
export default function PermaculturePlanPreview({
    plan,
    applying,
    onApply,
    onForceApply,
    onReject,
    onRegenerate,
    onClose,
    applyWarning,
    skippedElements = [],
}) {
    const [checkedNames, setCheckedNames] = useState(null); // null = all checked (default)

    if (!plan) return null;

    const {
        siteAnalysis    = {},
        proposedElements = [],
        planNarrative   = '',
        summary         = '',
        bibliography    = [],
        createdAt,
    } = plan;

    const applyableElements = proposedElements.filter(e => e.type !== 'permaculture-zone');
    const zoneElements      = proposedElements.filter(e => e.type === 'permaculture-zone');

    // Which names are currently selected
    const selected = useMemo(() => {
        if (checkedNames === null) return new Set(applyableElements.map(e => e.name));
        return checkedNames;
    }, [checkedNames, applyableElements]);

    const toggleElement = (name) => {
        const next = new Set(selected);
        next.has(name) ? next.delete(name) : next.add(name);
        setCheckedNames(next);
    };

    const allChecked   = selected.size === applyableElements.length;
    const noneChecked  = selected.size === 0;
    const toggleAll    = () => setCheckedNames(allChecked ? new Set() : null);

    const selectedNames = [...selected];
    const narrative     = summary || planNarrative;

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ── Header ── */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200"
                 style={{ background: 'linear-gradient(135deg, #1a3a1a 0%, #2d5a28 100%)' }}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-white font-bold text-sm leading-tight">🌿 Permaculture Plan</p>
                        <p className="text-green-300 text-[10px] mt-0.5">
                            {zoneElements.length} design zone{zoneElements.length !== 1 ? 's' : ''} ·{' '}
                            {applyableElements.length} element{applyableElements.length !== 1 ? 's' : ''}
                            {createdAt ? ` · ${new Date(createdAt).toLocaleDateString()}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="bg-amber-400/90 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {plan.aiSource === 'ai' ? 'AI DRAFT' : 'DRAFT'}
                        </span>
                        <button onClick={onClose}
                            className="text-white/60 hover:text-white text-lg leading-none transition-colors ml-1">✕</button>
                    </div>
                </div>
                <p className="text-green-200/70 text-[10px] mt-1.5 italic">
                    Dashed outlines on map = proposed elements (not applied yet)
                </p>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto text-sm">

                {/* Summary / Narrative */}
                {narrative && (
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Overview</p>
                        <div className="text-xs text-gray-700 leading-relaxed space-y-1">
                            {narrative.split('\n').map((line, i) => {
                                if (!line.trim()) return null;
                                if (line.startsWith('## ')) return (
                                    <p key={i} className="font-bold text-forest text-sm mt-2 first:mt-0">{line.slice(3)}</p>
                                );
                                if (/^\*\*(.+)\*\*$/.test(line.trim())) return (
                                    <p key={i} className="font-semibold text-gray-800">{line.trim().slice(2, -2)}</p>
                                );
                                return <p key={i}>{line}</p>;
                            })}
                        </div>
                    </div>
                )}

                {/* Site Analysis */}
                {(siteAnalysis.constraints?.length > 0 || siteAnalysis.opportunities?.length > 0) && (
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Site Analysis</p>

                        {siteAnalysis.opportunities?.length > 0 && (
                            <div className="mb-2.5">
                                <p className="text-[10px] font-semibold text-green-700 mb-1">✓ Opportunities</p>
                                <ul className="space-y-0.5">
                                    {siteAnalysis.opportunities.map((o, i) => (
                                        <li key={i} className="flex gap-1.5 text-xs text-gray-700">
                                            <span className="text-green-500 flex-shrink-0 mt-0.5">•</span>
                                            <span>{o}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {siteAnalysis.constraints?.length > 0 && (
                            <div>
                                <p className="text-[10px] font-semibold text-amber-700 mb-1">⚠ Constraints</p>
                                <ul className="space-y-0.5">
                                    {siteAnalysis.constraints.map((c, i) => (
                                        <li key={i} className="flex gap-1.5 text-xs text-gray-700">
                                            <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                                            <span>{c}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Proposed Elements — with checkboxes */}
                {proposedElements.length > 0 && (
                    <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-2.5">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
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
                            <p className="text-[10px] text-gray-400 mb-2">
                                {selected.size} of {applyableElements.length} selected for apply
                            </p>
                        )}

                        <div className="space-y-2">
                            {proposedElements.map((el, i) => {
                                const color        = TYPE_COLORS[el.type] || '#4a7c3f';
                                const icon         = TYPE_ICONS[el.type]  || '📍';
                                const label        = TYPE_LABELS[el.type] || el.type;
                                const isApplyable  = el.type !== 'permaculture-zone';
                                const isChecked    = !isApplyable || selected.has(el.name);

                                return (
                                    <div key={i}
                                         className={`rounded-xl border overflow-hidden transition-opacity ${!isChecked ? 'opacity-50' : ''}`}
                                         style={{ borderColor: color + (isChecked ? '55' : '22'), background: 'white' }}>

                                        {/* Row header */}
                                        <div className="flex items-start gap-2 px-3 py-2"
                                             style={{ background: color + (isChecked ? '0d' : '06') }}>
                                            {isApplyable ? (
                                                <input type="checkbox" checked={isChecked}
                                                    onChange={() => toggleElement(el.name)}
                                                    className="mt-0.5 flex-shrink-0 accent-forest cursor-pointer"
                                                    disabled={applying} />
                                            ) : (
                                                <span className="text-[10px] flex-shrink-0 mt-0.5 text-gray-400 font-medium">–</span>
                                            )}
                                            <span className="text-sm flex-shrink-0">{icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                                    <p className="font-semibold text-xs truncate" style={{ color }}>{el.name}</p>
                                                    <ConfidenceBar value={el.confidence} />
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                    {label}
                                                    {el.targetZone ? ` · Zone ${el.targetZone}` : ''}
                                                    {el.width ? ` · ${el.width}×${el.height}m` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="px-3 pb-2 pt-1.5 space-y-1.5">
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
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bibliography */}
                {bibliography.length > 0 && (
                    <div className="px-4 py-3">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bibliography</p>
                        <ul className="space-y-1">
                            {bibliography.map((b, i) => (
                                <li key={i} className="text-[10px] text-gray-500 leading-relaxed pl-3 border-l-2 border-gray-200">{b}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* ── Skipped elements (after partial apply) ── */}
            {skippedElements.length > 0 && (
                <div className="px-4 py-3 border-t border-amber-200 bg-amber-50 flex-shrink-0">
                    <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">
                        {skippedElements.length} element{skippedElements.length !== 1 ? 's' : ''} skipped
                    </p>
                    <ul className="space-y-1">
                        {skippedElements.map((s, i) => (
                            <li key={i} className="text-[10px] text-amber-900 leading-snug">
                                <span className="font-semibold">{s.element}:</span>{' '}
                                <span>{s.reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Footer ── */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-2">

                {/* Layout-changed warning */}
                {applyWarning && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 space-y-2">
                        <p className="text-[11px] text-amber-800 leading-snug">⚠ {applyWarning.warning}</p>
                        <div className="flex gap-2">
                            <button onClick={() => onForceApply(selectedNames)} disabled={applying}
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

                {/* Primary apply button */}
                {!applyWarning && (
                    <button
                        onClick={() => onApply(selectedNames)}
                        disabled={applying || noneChecked}
                        className="w-full py-2 bg-forest text-white text-sm rounded-xl hover:bg-green-800 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                <div className="flex gap-2">
                    <button onClick={onRegenerate} disabled={applying}
                        className="flex-1 py-1.5 text-xs text-forest border border-forest/40 rounded-xl hover:bg-green-50 transition-colors disabled:opacity-50 font-medium">
                        ↺ Regenerate
                    </button>
                    <button onClick={onReject} disabled={applying}
                        className="flex-1 py-1.5 text-xs text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
                        Reject
                    </button>
                    <button onClick={onClose} disabled={applying}
                        className="flex-1 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
