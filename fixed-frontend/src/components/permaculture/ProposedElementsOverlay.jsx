import { CANONICAL_TYPE_COLORS, resolveElementColor } from '../../config/permaculturePlanSchema';

// Rendering colors per action type
const ACTION_COLOR = {
    create_new:            '#5b4ec0',  // blue-purple — new placement
    enhance_existing:      '#b06010',  // amber — improve what's there
    plant_inside_existing: '#2e7d32',  // dark green — planting
    add_near_existing:     '#5b4ec0',  // same as create_new
    recommendation_only:   '#888888',  // grey — informational only
};

const ACTION_FILL = {
    create_new:            { normal: 'rgba(91,78,192,0.06)',  hover: 'rgba(91,78,192,0.16)'  },
    enhance_existing:      { normal: 'rgba(176,96,16,0.08)', hover: 'rgba(176,96,16,0.18)'  },
    plant_inside_existing: { normal: 'rgba(46,125,50,0.08)', hover: 'rgba(46,125,50,0.18)'  },
    add_near_existing:     { normal: 'rgba(91,78,192,0.06)',  hover: 'rgba(91,78,192,0.16)'  },
    recommendation_only:   { normal: 'rgba(136,136,136,0.05)', hover: 'rgba(136,136,136,0.1)' },
};

const ACTION_LABEL = {
    create_new:            'New',
    enhance_existing:      'Enhance',
    plant_inside_existing: 'Plant in',
    add_near_existing:     'Add near',
    recommendation_only:   'Note',
};

// Per-type icons shown in the label chip — by AI schema type
const TYPE_ICONS = {
    'permaculture-zone': '🔵',
    'structure':         '🏗',
    'planting-strip':    '🌿',
    'water-feature':     '💧',
};

// Per-canonical-type icons (override TYPE_ICONS when catalogKey/canonicalType is known)
const CANONICAL_ICONS = {
    raised_bed:     '🪴',
    greenhouse:     '🏡',
    path:           '🛤',
    compost:        '♻️',
    coop:           '🐔',
    beehive:        '🐝',
    shed:           '🏚',
    patio:          '🪑',
    windbreak:      '🌬',
    pond:           '💧',
    swale:          '〰',
    orchard:        '🍎',
    guild:          '🌀',
    berry_patch:    '🫐',
    herb_garden:    '🌿',
    food_forest:    '🌳',
    wild_zone:      '🦋',
    'permaculture-zone': '🔵',
};

// Only these actions produce a visible map element — everything else is panel-only.
// Crucially, elements with a missing/unknown action are NOT rendered by default.
const MAP_RENDERABLE_ACTIONS = new Set([
    'create_new',
    'enhance_existing',
    'plant_inside_existing',
    'add_near_existing',
]);

/**
 * Renders proposed permaculture plan elements on the General Map as temporary
 * dashed overlays. Non-interactive (pointerEvents: none).
 *
 * Visual treatment per action:
 *   create_new            – blue-purple dashed box
 *   enhance_existing      – amber dashed halo (slightly larger than target)
 *   plant_inside_existing – green dashed box at target bounds with plant indicator
 *   add_near_existing     – blue-purple dashed box (same as create_new)
 *   recommendation_only   – NOT rendered on map under any circumstances
 *   missing / unknown     – NOT rendered on map (no fallback box)
 *
 * Props
 *   items          – array of proposed plan elements (already filtered for active zone)
 *   pxPerM         – pixels-per-metre from GeneralCanvas
 *   hoveredName    – element name hovered in the side panel
 *   selectedNames  – Set of names selected for apply; null = all selected
 */
export default function ProposedElementsOverlay({ items = [], pxPerM, hoveredName, selectedNames }) {
    // Strict whitelist: only known renderable actions pass — no implicit fallback.
    const renderable = items.filter(el => MAP_RENDERABLE_ACTIONS.has(el.action));
    if (!renderable.length) return null;

    return (
        <>
            {renderable.map((el, i) => {
                const action     = el.action || 'create_new';
                const canonKey   = el.catalogKey || el.canonicalType;
                const canonColor = canonKey ? CANONICAL_TYPE_COLORS[canonKey] : null;
                const color      = canonColor || ACTION_COLOR[action] || ACTION_COLOR.create_new;
                const fills      = ACTION_FILL[action]  || ACTION_FILL.create_new;
                const actionTag  = ACTION_LABEL[action] || 'Proposed';
                const icon       = (canonKey && CANONICAL_ICONS[canonKey])
                    || TYPE_ICONS[el.type]
                    || '📍';

                const isHovered   = el.name === hoveredName;
                const isSelected  = selectedNames === null || selectedNames.has(el.name);
                const isEnhance   = action === 'enhance_existing' || action === 'plant_inside_existing';

                const wPx = Math.max(24, (el.width  ?? 2) * pxPerM);
                const hPx = Math.max(16, (el.height ?? 2) * pxPerM);

                const fill       = isHovered ? fills.hover : fills.normal;
                const borderPx   = isHovered ? 3 : (isEnhance ? 2 : 2);
                const borderStyle = isEnhance ? 'dashed' : 'dashed';
                const labelTop   = isHovered ? -23 : -17;
                const hasWarnings = el.warnings?.length > 0;
                const hasPlants   = el.plants?.length > 0 && wPx > 68;
                const hasConf     = el.confidence != null && wPx > 52;

                return (
                    <div
                        key={`prop-${i}`}
                        style={{
                            position:      'absolute',
                            left:          (el.x ?? 0) * pxPerM,
                            top:           (el.y ?? 0) * pxPerM,
                            width:         wPx,
                            height:        hPx,
                            border:        `${borderPx}px ${borderStyle} ${color}`,
                            background:    isSelected ? fill : `${color}04`,
                            borderRadius:  isEnhance ? 12 : 8,
                            pointerEvents: 'none',   // no edit/remove controls ever
                            zIndex:        el.type === 'permaculture-zone' ? 1 : (isEnhance ? 5 : 4),
                            boxSizing:     'border-box',
                            opacity:       isSelected ? (isHovered ? 1 : 0.88) : 0.18,
                            boxShadow:     isHovered
                                ? `0 0 0 2px ${color}25, 0 3px 10px ${color}20`
                                : isEnhance ? `0 0 0 1px ${color}15` : 'none',
                            transition:    'opacity 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                        }}
                    >
                        {/* ── Label chip ── */}
                        <div style={{
                            position:     'absolute',
                            top:          labelTop,
                            left:         0,
                            background:   isHovered ? shadeColor(color, -20) : color,
                            color:        '#fff',
                            fontSize:     9,
                            fontWeight:   700,
                            lineHeight:   1,
                            padding:      '2px 6px 2px 4px',
                            borderRadius: '3px 3px 3px 0',
                            whiteSpace:   'nowrap',
                            maxWidth:     190,
                            overflow:     'hidden',
                            textOverflow: 'ellipsis',
                            display:      'flex',
                            alignItems:   'center',
                            gap:          3,
                            boxShadow:    isHovered ? '0 2px 6px rgba(0,0,0,0.28)' : 'none',
                            transition:   'top 0.12s ease, box-shadow 0.12s ease',
                        }}>
                            <span style={{ fontSize: 8, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                            <span style={{ opacity: 0.8, fontSize: 8, flexShrink: 0 }}>[{actionTag}]</span>
                            <span>{el.name}</span>
                            {hasWarnings && <span style={{ marginLeft: 1, opacity: 0.85, flexShrink: 0 }}>⚠</span>}
                        </div>

                        {/* ── Confidence badge (top-right, only when selected) ── */}
                        {hasConf && isSelected && (
                            <div style={{
                                position:     'absolute',
                                top:          4,
                                right:        4,
                                background:   el.confidence >= 0.85
                                    ? 'rgba(74,124,63,0.88)'
                                    : el.confidence >= 0.65
                                        ? 'rgba(160,112,64,0.88)'
                                        : 'rgba(176,64,64,0.88)',
                                color:        '#fff',
                                fontSize:     8,
                                borderRadius: 3,
                                padding:      '1px 3px',
                                lineHeight:   1,
                                fontWeight:   700,
                            }}>
                                {Math.round(el.confidence * 100)}%
                            </div>
                        )}

                        {/* ── Plant chips for plant_inside_existing (inner indicator) ── */}
                        {action === 'plant_inside_existing' && el.plants?.length > 0 && isSelected && (
                            <div style={{
                                position:   'absolute',
                                top:        '50%',
                                left:       '50%',
                                transform:  'translate(-50%, -50%)',
                                display:    'flex',
                                gap:        3,
                                flexWrap:   'wrap',
                                justifyContent: 'center',
                                maxWidth:   wPx - 8,
                            }}>
                                {el.plants.slice(0, 3).map((pl, pi) => (
                                    <span key={pi} style={{
                                        fontSize:     7,
                                        background:   'rgba(46,125,50,0.75)',
                                        color:        '#fff',
                                        borderRadius: 3,
                                        padding:      '1px 3px',
                                        lineHeight:   1.2,
                                        fontWeight:   600,
                                        whiteSpace:   'nowrap',
                                    }}>🌱 {pl}</span>
                                ))}
                            </div>
                        )}

                        {/* ── Plant list bottom (for other actions) ── */}
                        {action !== 'plant_inside_existing' && hasPlants && isSelected && (
                            <div style={{
                                position:     'absolute',
                                bottom:       4,
                                left:         5,
                                right:        5,
                                fontSize:     8,
                                color,
                                fontWeight:   600,
                                overflow:     'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace:   'nowrap',
                                opacity:      isHovered ? 1 : 0.75,
                            }}>
                                {el.plants.slice(0, 4).join(' · ')}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}

// Darken a hex color by `pct` percent (negative = darken, positive = lighten)
function shadeColor(hex, pct) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + pct));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + pct));
    const b = Math.min(255, Math.max(0, (n & 0xff) + pct));
    return `rgb(${r},${g},${b})`;
}
