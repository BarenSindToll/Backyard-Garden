// New plan preview side panel.
// Replaces the dense checkbox list with grouped sections by user-meaningful purpose,
// plain-language action labels, and a clear primary action.

const { useMemo: useMemo_pv, useState: useState_pv } = React;

// Mock plan data
const PLAN_DATA = {
  A: {
    label: 'Food Focus',
    sub: 'Maximize edible yield from the south-facing slope',
    summary: 'A productive layout that turns your sunny south side into a Three Sisters bed flanked by berries, with two nut trees and a small rain pond to buffer drought.',
    confidence: 0.88,
    groups: [
      {
        key: 'planting',
        title: 'What will grow',
        items: [
          { name: 'Three Sisters bed', kind: 'Vegetable bed', action: 'add', why: 'Sunniest patch, builds soil via beans.',
            plants: ['Corn', 'Beans', 'Squash'], size: '18 × 6 m', fit: 'strong' },
          { name: 'Berry strip', kind: 'Soft fruit', action: 'add', why: 'Edge of beds — pollinators + harvest.',
            plants: ['Raspberry', 'Strawberry', 'Currant'], size: '18 × 5 m', fit: 'strong' },
          { name: 'Hazelnut tree', kind: 'Nut tree', action: 'add', why: 'Wind break + nuts in 4–5 years.',
            size: '⌀ 4 m', fit: 'strong' },
          { name: 'Walnut tree', kind: 'Nut tree', action: 'add', why: 'Far corner — needs space, juglone-tolerant guild.',
            size: '⌀ 5 m', fit: 'medium' },
        ],
      },
      {
        key: 'water-struct',
        title: 'Water & structures',
        items: [
          { name: 'Rain pond', kind: 'Water feature', action: 'add', why: 'Buffers drought, attracts pollinators.',
            size: '12 × 10 m', fit: 'medium' },
        ],
      },
      {
        key: 'zones',
        title: 'Existing elements to enhance',
        items: [
          { name: 'Apple guild', kind: 'Companion planting around apple tree', action: 'enhance', why: 'Underplant with comfrey, chives, nasturtium.',
            plants: ['Comfrey', 'Chives', 'Nasturtium'], fit: 'strong' },
        ],
      },
      {
        key: 'tips',
        title: 'Tips & recommendations',
        items: [
          { name: 'Mulch beds with straw',  kind: 'Practice', action: 'tip', why: 'Halves watering, suppresses weeds.', fit: 'strong' },
          { name: 'Compost in autumn',     kind: 'Practice', action: 'tip', why: 'Builds clay soil over 2 seasons.', fit: 'strong' },
        ],
      },
    ],
  },
  B: {
    label: 'Biodiversity',
    sub: 'A habitat-first plan that still earns its keep',
    summary: 'Pollinator strips, a wildlife pond and a mixed hedge along the boundary create year-round habitat. The Apple guild grows into a small mixed-species community.',
    confidence: 0.82,
    groups: [
      {
        key: 'planting',
        title: 'What will grow',
        items: [
          { name: 'Pollinator strip', kind: 'Wildflower band', action: 'add', why: 'Continuous bloom March–October.',
            plants: ['Lavender', 'Borage', 'Echinacea'], size: '20 × 10 m', fit: 'strong' },
          { name: 'Wildflower edge',  kind: 'Meadow strip', action: 'add', why: 'Self-seeding, mow once a year.',
            plants: ['Yarrow', 'Cornflower', 'Poppy'], size: '30 × 7 m', fit: 'strong' },
          { name: 'Hawthorn hedge', kind: 'Native shrub', action: 'add', why: 'Nesting habitat, blossom + berries.',
            size: '⌀ 4 m', fit: 'strong' },
          { name: 'Elderberry',     kind: 'Edible shrub', action: 'add', why: 'Berries for birds and people.',
            size: '⌀ 4 m', fit: 'medium' },
        ],
      },
      {
        key: 'water-struct',
        title: 'Water & structures',
        items: [
          { name: 'Wildlife pond', kind: 'Naturalistic pond', action: 'add', why: 'Frog habitat, no fish — gentle slopes.',
            size: '16 × 12 m', fit: 'strong' },
        ],
      },
      {
        key: 'zones',
        title: 'Existing elements to enhance',
        items: [
          { name: 'Mixed-species guild', kind: 'Around apple tree', action: 'enhance', why: 'Comfrey, currants, calendula — a small mini-forest.',
            plants: ['Comfrey', 'Currant', 'Calendula', 'Yarrow'], fit: 'strong' },
        ],
      },
      {
        key: 'tips',
        title: 'Tips & recommendations',
        items: [
          { name: 'Leave a wild corner', kind: 'Practice', action: 'tip', why: 'Logs, rocks, leaf litter — hedgehog & beetle habitat.', fit: 'strong' },
          { name: 'Skip pesticides',     kind: 'Practice', action: 'tip', why: 'Even organic ones — let predators do the work.', fit: 'strong' },
        ],
      },
    ],
  },
};

window.PLAN_DATA = PLAN_DATA;

// Action labels — plain language, no jargon
const ACTION = {
  add:     { label: 'Add new',          dot: '#2d5a45' },
  enhance: { label: 'Improve existing', dot: '#a08465' },
  tip:     { label: 'Tip',              dot: '#79857f' },
};

const FIT = {
  strong: { label: 'Strong fit', tone: '#2d5a45' },
  medium: { label: 'Worth trying', tone: '#a08465' },
  weak:   { label: 'Optional',    tone: '#79857f' },
};

// ── Small atoms ─────────────────────────────────────────────────────────────

function VariantTab({ label, sub, active, confidence, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        textAlign: 'left',
        flex: 1,
        padding: '8px 12px',
        background: active ? 'var(--paper)' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'var(--forest)' : 'transparent',
        borderRadius: 6,
        transition: 'all 120ms',
        position: 'relative',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className="mono" style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
                                        color: active ? 'var(--forest)' : 'var(--muted)', fontWeight: 600 }}>
          Variant {label === 'Food Focus' ? 'A' : 'B'}
        </span>
        <span className="mono" style={{ fontSize: 9.5, color: active ? 'var(--ink-soft)' : 'var(--muted)' }}>
          {Math.round(confidence * 100)}%
        </span>
      </div>
      <div className="display" style={{ fontSize: 14.5, marginTop: 1, color: active ? 'var(--ink)' : 'var(--ink-soft)', lineHeight: 1.15 }}>
        {label}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3 }}>
        {sub}
      </div>
    </button>
  );
}

function ItemRow({ item, checked, onToggle, hovered, onHoverEnter, onHoverLeave, density }) {
  const a = ACTION[item.action];
  const f = FIT[item.fit];
  const isTip = item.action === 'tip';
  const pad = density === 'compact' ? '8px 0' : '12px 0';

  return (
    <div onMouseEnter={onHoverEnter} onMouseLeave={onHoverLeave}
      style={{
        padding: pad, borderTop: '1px solid var(--line-soft)',
        background: hovered ? 'rgba(45,90,69,0.04)' : 'transparent',
        transition: 'background 120ms',
        opacity: !isTip && !checked ? 0.45 : 1,
      }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Checkbox or tip dot */}
        {!isTip ? (
          <button onClick={onToggle}
            style={{
              width: 16, height: 16, marginTop: 2, flexShrink: 0,
              borderRadius: 3, border: '1.5px solid',
              borderColor: checked ? 'var(--forest)' : 'var(--line)',
              background: checked ? 'var(--forest)' : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#f4f1e6', padding: 0,
            }}>
            {checked && <window.Icons.Check size={10} sw={3}/>}
          </button>
        ) : (
          <div style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--muted)' }}>
            <window.Icons.Info size={13}/>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>
              {item.name}
            </span>
            {item.size && (
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', flexShrink: 0 }}>
                {item.size}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.kind}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: f.tone }}/>
              <span style={{ fontSize: 11, color: f.tone, fontWeight: 500 }}>{f.label}</span>
            </span>
          </div>
          {item.why && (
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '6px 0 0 0', lineHeight: 1.45 }}>
              {item.why}
            </p>
          )}
          {item.plants && item.plants.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 7 }}>
              {item.plants.map((p, i) => (
                <span key={i}
                  style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999,
                           background: 'var(--sage)', color: 'var(--forest)', fontWeight: 500 }}>
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupSection({ group, checked, toggle, hovered, setHovered, density }) {
  const a = ACTION[group.items[0]?.action];
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                    paddingBottom: 6, marginBottom: 2 }}>
        <h3 className="display" style={{ fontSize: 16, margin: 0, color: 'var(--forest-deep)', fontWeight: 500 }}>
          {group.title}
        </h3>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                                        color: 'var(--muted)' }}>
          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <div>
        {group.items.map((it, i) => (
          <ItemRow key={i} item={it}
            checked={checked.has(it.name)}
            onToggle={() => toggle(it.name)}
            hovered={hovered === it.name}
            onHoverEnter={() => setHovered(it.name)}
            onHoverLeave={() => setHovered(null)}
            density={density}/>
        ))}
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

function PlanPreview({ activeVariant, onSwitchVariant, hovered, setHovered, selected, setSelected,
                       previewHidden, onTogglePreview, onApply, onReject, onRegenerate, density = 'comfortable' }) {
  const plan = PLAN_DATA[activeVariant];
  const allItems = plan.groups.flatMap(g => g.items.filter(i => i.action !== 'tip'));
  const allChecked = selected.size === allItems.length;

  const toggle = (name) => {
    const next = new Set(selected);
    next.has(name) ? next.delete(name) : next.add(name);
    setSelected(next);
  };

  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(allItems.map(i => i.name)));
  };

  return (
    <div style={{ width: 440, background: 'var(--cream)', height: '100%',
                  borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column',
                  flexShrink: 0, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 22px 12px', borderBottom: '1px solid var(--line-soft)',
                    background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase',
                                            color: 'var(--muted)', marginBottom: 2 }}>
              Draft plan
            </div>
            <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--forest-deep)', lineHeight: 1.1 }}>
              {plan.label}
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '3px 0 0 0' }}>{plan.sub}</p>
          </div>
          <button onClick={onReject}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: 4, marginTop: -2 }}>
            <window.Icons.X size={18}/>
          </button>
        </div>

        {/* Variant toggle */}
        <div style={{ display: 'flex', gap: 4, marginTop: 12, padding: 3,
                      background: 'var(--cream)', borderRadius: 8 }}>
          <VariantTab label="Food Focus" sub="Yield, structure, harvest"
            active={activeVariant === 'A'} confidence={PLAN_DATA.A.confidence}
            onClick={() => onSwitchVariant('A')}/>
          <VariantTab label="Biodiversity" sub="Habitat, pollinators, water"
            active={activeVariant === 'B'} confidence={PLAN_DATA.B.confidence}
            onClick={() => onSwitchVariant('B')}/>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 24px', borderBottom: '1px solid var(--line-soft)',
                    background: 'var(--paper)' }}>
        <button onClick={toggleAll}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                   background: 'none', border: 'none', color: 'var(--forest)',
                   fontSize: 12, padding: 0, fontWeight: 500 }}>
          <span style={{
            width: 14, height: 14, borderRadius: 3, border: '1.5px solid var(--forest)',
            background: allChecked ? 'var(--forest)' : 'transparent',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#f4f1e6',
          }}>
            {allChecked && <window.Icons.Check size={9} sw={3}/>}
          </span>
          {allChecked ? 'Deselect all' : 'Select all'} ({selected.size}/{allItems.length})
        </button>
        <button onClick={onTogglePreview}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                   background: 'none', border: '1px solid var(--line)', color: 'var(--ink-soft)',
                   fontSize: 11.5, padding: '4px 10px', borderRadius: 999 }}>
          {previewHidden
            ? <><window.Icons.Eye size={12}/> Show on map</>
            : <><window.Icons.EyeOff size={12}/> Hide on map</>}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 20px', minHeight: 0 }}>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink)', margin: 0 }}>
          {plan.summary}
        </p>

        <div style={{ marginTop: 18 }}>
          {plan.groups.map(g => (
            <GroupSection key={g.key} group={g}
              checked={selected} toggle={toggle}
              hovered={hovered} setHovered={setHovered}
              density={density}/>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 22px 14px', borderTop: '1px solid var(--line)',
                    background: 'var(--paper)' }}>
        <button onClick={onApply} disabled={selected.size === 0}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                   width: '100%', padding: '12px 16px', borderRadius: 8,
                   background: selected.size > 0 ? 'var(--forest)' : 'var(--line)',
                   color: '#f4f1e6', border: 'none',
                   fontSize: 14, fontWeight: 500, cursor: selected.size > 0 ? 'pointer' : 'not-allowed' }}>
          <window.Icons.Check size={14} sw={2.5}/>
          {selected.size > 0
            ? `Apply ${selected.size} element${selected.size > 1 ? 's' : ''} to map`
            : 'Select elements to apply'}
        </button>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button onClick={() => onRegenerate('edit')}
            style={{ flex: 1, padding: '8px', background: 'none', border: '1px solid var(--line)',
                     color: 'var(--ink-soft)', fontSize: 12, borderRadius: 6,
                     display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <window.Icons.Pencil size={12}/> Edit brief
          </button>
          <button onClick={() => onRegenerate('new')}
            style={{ flex: 1, padding: '8px', background: 'none', border: '1px solid var(--line)',
                     color: 'var(--ink-soft)', fontSize: 12, borderRadius: 6,
                     display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <window.Icons.Refresh size={12}/> Regenerate
          </button>
          <button onClick={onReject}
            style={{ padding: '8px 12px', background: 'none', border: '1px solid var(--line)',
                     color: 'var(--muted)', fontSize: 12, borderRadius: 6,
                     display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

window.PlanPreview = PlanPreview;
