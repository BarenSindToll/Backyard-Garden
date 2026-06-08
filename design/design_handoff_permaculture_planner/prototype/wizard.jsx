// New Generate-plan wizard.
// 3 steps in a focused two-column sheet:
//   1. Conditions  — terrain/water/sun/soil
//   2. Intent      — primary goal + secondary settings
//   3. Review      — plain-language summary + Generate
//
// Pain points addressed vs old version:
//   • No emoji as primary affordance — monoline icons + bigger type
//   • Visual selection cards with descriptive copy, not pill chips
//   • Step 3 confirms what's being requested before firing off the call
//   • Left rail shows the existing garden so the user knows what context the AI sees

const { useState } = React;

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
  { key: 'full',    label: 'Full sun',     desc: '6+ hours direct' },
  { key: 'partial', label: 'Partial',      desc: '3–6 hours direct' },
  { key: 'mixed',   label: 'Mixed',        desc: 'Sun and shade in patches' },
];
const SOIL = [
  { key: 'sandy',   label: 'Sandy',   desc: 'Drains fast, low nutrients' },
  { key: 'loam',    label: 'Loam',    desc: 'Balanced, easy to work' },
  { key: 'clay',    label: 'Clay',    desc: 'Holds water, slow to drain' },
  { key: 'unknown', label: 'Not sure', desc: 'Skip and let AI infer' },
];

const GOALS = [
  { key: 'food',    icon: 'Harvest', label: 'Food production',
    desc: 'Maximum yield — vegetables, fruit, perennials. Productive year-round.' },
  { key: 'low',     icon: 'Calm',    label: 'Low maintenance',
    desc: 'Self-sustaining systems — perennials, mulch, drought-tolerant.' },
  { key: 'beauty',  icon: 'Bloom',   label: 'Flowers & beauty',
    desc: 'Ornamental focus with edible underplanting where it fits.' },
  { key: 'wild',    icon: 'Wild',    label: 'Wildlife habitat',
    desc: 'Pollinator strips, hedges, water — invite biodiversity in.' },
  { key: 'balance', icon: 'Balance', label: 'Mixed balanced',
    desc: 'Some of each — production, beauty, habitat in equal measure.' },
];

const STYLES = ['Intensive beds', 'Food forest', 'Mixed', 'Greenhouse-focused'];
const TIME   = ['<1 h', '1–3 h', '3–7 h', '7+ h'];
const ISSUES = ['Flooding', 'Drought', 'Strong wind', 'Poor soil', 'Too much shade', 'Steep slope'];

// ── Shared atoms ───────────────────────────────────────────────────────────

function StepHeader({ kicker, title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                                     color: 'var(--muted)', marginBottom: 6 }}>{kicker}</div>
      <h2 className="display" style={{ fontSize: 30, lineHeight: 1.1, margin: 0, color: 'var(--ink)' }}>
        {title}
      </h2>
      {sub && <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 8, marginBottom: 0, maxWidth: 520 }}>{sub}</p>}
    </div>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
      <span className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
                                       color: 'var(--ink-soft)', fontWeight: 500 }}>
        {children}
      </span>
      {hint && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{hint}</span>}
    </div>
  );
}

function OptionCard({ label, desc, selected, onClick, compact = false }) {
  return (
    <button onClick={onClick}
      style={{
        textAlign: 'left',
        padding: compact ? '10px 12px' : '12px 14px',
        background: selected ? 'var(--forest)' : 'var(--paper)',
        color: selected ? '#f4f1e6' : 'var(--ink)',
        border: '1px solid',
        borderColor: selected ? 'var(--forest)' : 'var(--line)',
        borderRadius: 6,
        transition: 'all 120ms ease',
        cursor: 'pointer',
        width: '100%',
        display: 'block',
      }}
      onMouseEnter={e => !selected && (e.currentTarget.style.borderColor = 'var(--forest-2)')}
      onMouseLeave={e => !selected && (e.currentTarget.style.borderColor = 'var(--line)')}
    >
      <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2 }}>{label}</div>
      {desc && (
        <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 3, lineHeight: 1.35 }}>{desc}</div>
      )}
    </button>
  );
}

function Pill({ label, selected, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '7px 14px',
        background: selected ? 'var(--forest)' : 'transparent',
        color: selected ? '#f4f1e6' : 'var(--ink-soft)',
        border: '1px solid',
        borderColor: selected ? 'var(--forest)' : 'var(--line)',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: selected ? 500 : 400,
        transition: 'all 120ms ease',
      }}>
      {label}
    </button>
  );
}

function GoalCard({ icon, label, desc, selected, onClick }) {
  const Icon = window.Icons[icon];
  return (
    <button onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '16px 18px',
        background: selected ? 'var(--forest)' : 'var(--paper)',
        color: selected ? '#f4f1e6' : 'var(--ink)',
        border: '1px solid',
        borderColor: selected ? 'var(--forest)' : 'var(--line)',
        borderRadius: 8,
        transition: 'all 120ms ease',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        width: '100%',
      }}
      onMouseEnter={e => !selected && (e.currentTarget.style.borderColor = 'var(--forest-2)')}
      onMouseLeave={e => !selected && (e.currentTarget.style.borderColor = 'var(--line)')}
    >
      <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                    background: selected ? 'rgba(255,255,255,0.1)' : 'var(--sage)',
                    color: selected ? '#f4f1e6' : 'var(--forest)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20}/>
      </div>
      <div style={{ flex: 1 }}>
        <div className="display" style={{ fontSize: 18, lineHeight: 1.1, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12.5, opacity: selected ? 0.85 : 0.7, marginTop: 4, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </button>
  );
}

// ── Steps ──────────────────────────────────────────────────────────────────

function StepConditions({ state, set }) {
  return (
    <div>
      <StepHeader kicker="Step 1 of 3"
        title="What's the site like?"
        sub="Tell the planner what you're working with. This shapes which plants and structures get suggested."/>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, rowGap: 22 }}>
        <div>
          <FieldLabel>Terrain</FieldLabel>
          <div style={{ display: 'grid', gap: 6 }}>
            {TERRAIN.map(o => (
              <OptionCard key={o.key} label={o.label} desc={o.desc}
                selected={state.terrain === o.key}
                onClick={() => set({ terrain: o.key })}/>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Water access</FieldLabel>
          <div style={{ display: 'grid', gap: 6 }}>
            {WATER.map(o => (
              <OptionCard key={o.key} label={o.label} desc={o.desc}
                selected={state.water === o.key}
                onClick={() => set({ water: o.key })}/>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Sun exposure</FieldLabel>
          <div style={{ display: 'grid', gap: 6 }}>
            {SUN.map(o => (
              <OptionCard key={o.key} label={o.label} desc={o.desc}
                selected={state.sun === o.key}
                onClick={() => set({ sun: o.key })}/>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Soil type</FieldLabel>
          <div style={{ display: 'grid', gap: 6 }}>
            {SOIL.map(o => (
              <OptionCard key={o.key} label={o.label} desc={o.desc}
                selected={state.soil === o.key}
                onClick={() => set({ soil: o.key })}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIntent({ state, set }) {
  const toggleIssue = (k) => {
    const next = new Set(state.issues);
    next.has(k) ? next.delete(k) : next.add(k);
    set({ issues: next });
  };
  return (
    <div>
      <StepHeader kicker="Step 2 of 3"
        title="What do you want most?"
        sub="Pick a main goal — it shifts the whole plan. You can fine-tune below."/>

      <FieldLabel>Main goal</FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
        {GOALS.map(g => (
          <GoalCard key={g.key} {...g} selected={state.goal === g.key}
            onClick={() => set({ goal: g.key })}/>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 22 }}>
        <div>
          <FieldLabel>Design style</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STYLES.map(s => (
              <Pill key={s} label={s} selected={state.style === s} onClick={() => set({ style: s })}/>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Time per week</FieldLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {TIME.map(t => (
              <Pill key={t} label={t} selected={state.time === t} onClick={() => set({ time: t })}/>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 22 }}>
        <div>
          <FieldLabel>Plants I love <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></FieldLabel>
          <input value={state.preferred}
            onChange={e => set({ preferred: e.target.value })}
            placeholder="Tomato, Lavender, Apple"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)',
                     borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                     background: 'var(--paper)', color: 'var(--ink)' }}/>
        </div>
        <div>
          <FieldLabel>Plants to avoid</FieldLabel>
          <input value={state.disliked}
            onChange={e => set({ disliked: e.target.value })}
            placeholder="Mint, Bamboo"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)',
                     borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                     background: 'var(--paper)', color: 'var(--ink)' }}/>
        </div>
      </div>

      <div>
        <FieldLabel>Known problems <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(tap any that apply)</span></FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ISSUES.map(p => (
            <Pill key={p} label={p} selected={state.issues.has(p)} onClick={() => toggleIssue(p)}/>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepReview({ state, garden }) {
  const goalLabel = GOALS.find(g => g.key === state.goal)?.label || '—';
  const terrainLabel = TERRAIN.find(t => t.key === state.terrain)?.label || '—';
  const waterLabel = WATER.find(w => w.key === state.water)?.label || '—';
  const sunLabel = SUN.find(s => s.key === state.sun)?.label || '—';
  const soilLabel = SOIL.find(s => s.key === state.soil)?.label || '—';

  return (
    <div>
      <StepHeader kicker="Step 3 of 3"
        title="Ready to generate"
        sub="The planner will draft two variants — one tuned for production, one for biodiversity — based on this brief."/>

      <div style={{ background: 'var(--sage)', borderRadius: 10, padding: 20, marginBottom: 18 }}>
        <p className="display" style={{ fontSize: 18, lineHeight: 1.45, margin: 0, color: 'var(--forest-deep)' }}>
          A <strong style={{ fontWeight: 600 }}>{goalLabel.toLowerCase()}</strong> plan
          for a <strong style={{ fontWeight: 600 }}>{garden.widthM}×{garden.heightM} m</strong> garden in zone {garden.hardinessZone}
          {state.style !== 'Mixed' ? <> ({state.style.toLowerCase()})</> : null},
          on <strong style={{ fontWeight: 600 }}>{terrainLabel.toLowerCase()}</strong> terrain
          with <strong style={{ fontWeight: 600 }}>{soilLabel.toLowerCase()}</strong> soil
          and <strong style={{ fontWeight: 600 }}>{sunLabel.toLowerCase()}</strong> sun.
          {state.issues.size > 0 && (
            <> Mindful of <strong style={{ fontWeight: 600 }}>{[...state.issues].join(', ').toLowerCase()}</strong>.</>
          )}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line-soft)',
                    border: '1px solid var(--line-soft)', borderRadius: 8, overflow: 'hidden' }}>
        {[
          ['Terrain', terrainLabel],
          ['Water',   waterLabel],
          ['Sun',     sunLabel],
          ['Soil',    soilLabel],
          ['Style',   state.style],
          ['Time/wk', state.time],
        ].map(([k, v]) => (
          <div key={k} style={{ background: 'var(--paper)', padding: '10px 14px' }}>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase',
                                            color: 'var(--muted)', marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 13, color: 'var(--ink)' }}>{v}</div>
          </div>
        ))}
      </div>

      {(state.preferred || state.disliked) && (
        <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          {state.preferred && <div><span className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loves </span>{state.preferred}</div>}
          {state.disliked && <div><span className="mono" style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Avoids </span>{state.disliked}</div>}
        </div>
      )}
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────

function Wizard({ onClose, onGenerate, garden, density = 'comfortable', layout = 'sheet' }) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState({
    terrain: 'flat', water: 'manual', sun: 'full', soil: 'loam',
    goal: 'food', style: 'Mixed', time: '1–3 h',
    preferred: 'Tomato, Apple, Lavender', disliked: '',
    issues: new Set(),
  });
  const update = (patch) => setState(s => ({ ...s, ...patch }));

  // Tweak: dense vs comfortable padding
  const pad = density === 'compact' ? { v: 22, h: 30 } : { v: 32, h: 40 };

  // Tweak: layout — sheet (centered) vs panel (right-side full-height)
  const containerStyle = layout === 'panel' ? {
    position: 'fixed', top: 0, right: 0, height: '100vh', width: '60vw', maxWidth: 900,
    background: 'var(--paper)', boxShadow: '-20px 0 60px rgba(20,30,25,0.25)',
    display: 'flex', flexDirection: 'column',
  } : {
    background: 'var(--paper)', borderRadius: 14, width: 'min(960px, 94vw)', height: 'min(82vh, 720px)',
    boxShadow: '0 30px 80px rgba(20,30,25,0.35), 0 0 0 1px rgba(20,30,25,0.08)',
    display: 'flex', overflow: 'hidden',
  };

  const StepDot = ({ n, label, active, done }) => (
    <button onClick={() => done && setStep(n)} disabled={!done}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0,
               background: 'none', border: 'none',
               color: active ? 'var(--forest)' : done ? 'var(--ink-soft)' : 'var(--muted)',
               cursor: done ? 'pointer' : 'default' }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
        background: active ? 'var(--forest)' : done ? 'var(--sage)' : 'transparent',
        color: active ? '#f4f1e6' : 'var(--forest)',
        border: active ? 'none' : done ? 'none' : '1px solid var(--line)',
      }}>{done ? <window.Icons.Check size={11} sw={2.5}/> : n}</span>
      <span className="mono" style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase',
                                      fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
  );

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,18,0.55)',
               backdropFilter: 'blur(2px)',
               display: 'flex', alignItems: 'center', justifyContent: layout === 'panel' ? 'flex-end' : 'center',
               zIndex: 40, padding: layout === 'panel' ? 0 : 24 }}>
      <div style={containerStyle}>

        {/* Left rail — only in sheet mode */}
        {layout === 'sheet' && (
          <div style={{ width: 256, flexShrink: 0, background: 'var(--cream)',
                        borderRight: '1px solid var(--line-soft)',
                        padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                                            color: 'var(--muted)', marginBottom: 4 }}>
              Generate plan
            </div>
            <h1 className="display" style={{ fontSize: 22, lineHeight: 1.1, margin: 0, color: 'var(--forest-deep)' }}>
              Brief the planner
            </h1>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <StepDot n={1} label="Conditions" active={step === 1} done={step > 1}/>
              <StepDot n={2} label="Intent"     active={step === 2} done={step > 2}/>
              <StepDot n={3} label="Review"     active={step === 3} done={step > 3}/>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--line-soft)' }}>
              <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase',
                                              color: 'var(--muted)', marginBottom: 8 }}>
                Your garden
              </div>
              <div style={{ aspectRatio: '1', borderRadius: 6, overflow: 'hidden',
                            border: '1px solid var(--line-soft)', background: 'var(--paper)' }}>
                <window.GardenCanvas/>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.5 }}>
                {garden.widthM} × {garden.heightM} m · Zone {garden.hardinessZone}
                <br/>
                <span style={{ color: 'var(--muted)' }}>House, shed, 3 trees, 2 beds</span>
              </div>
            </div>
          </div>
        )}

        {/* Right content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '18px 28px', borderBottom: '1px solid var(--line-soft)' }}>
            {layout === 'panel' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <h1 className="display" style={{ fontSize: 18, margin: 0, color: 'var(--forest-deep)' }}>
                  Brief the planner
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StepDot n={1} label="Site" active={step === 1} done={step > 1}/>
                  <window.Icons.Arrow size={10} sw={1} />
                  <StepDot n={2} label="Goals" active={step === 2} done={step > 2}/>
                  <window.Icons.Arrow size={10} sw={1} />
                  <StepDot n={3} label="Review" active={step === 3} done={step > 3}/>
                </div>
              </div>
            ) : <div/>}
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--muted)',
                       padding: 4, display: 'inline-flex' }}>
              <window.Icons.X size={18}/>
            </button>
          </div>

          <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: `${pad.v}px ${pad.h}px` }}>
            {step === 1 && <StepConditions state={state} set={update}/>}
            {step === 2 && <StepIntent     state={state} set={update}/>}
            {step === 3 && <StepReview     state={state} garden={garden}/>}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 28px', borderTop: '1px solid var(--line-soft)',
                        background: 'var(--cream)' }}>
            <button
              onClick={() => step === 1 ? onClose() : setStep(step - 1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                       background: 'none', border: 'none', color: 'var(--ink-soft)',
                       fontSize: 13, padding: '8px 4px' }}>
              {step === 1 ? <window.Icons.X size={14}/> : <window.Icons.ArrowLeft size={14}/>}
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                         background: 'var(--forest)', color: '#f4f1e6', border: 'none',
                         padding: '10px 18px', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                Continue
                <window.Icons.Arrow size={14}/>
              </button>
            ) : (
              <button onClick={() => onGenerate(state)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                         background: 'var(--forest)', color: '#f4f1e6', border: 'none',
                         padding: '11px 20px', borderRadius: 6, fontSize: 13.5, fontWeight: 500 }}>
                <window.Icons.Sparkle size={14}/>
                Generate two variants
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Loading screen ─────────────────────────────────────────────────────────
function LoadingPlan() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,18,0.6)',
                   backdropFilter: 'blur(3px)',
                   display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--paper)', borderRadius: 12, padding: '36px 44px',
                     boxShadow: '0 20px 60px rgba(20,30,25,0.3)', textAlign: 'center',
                     maxWidth: 380 }}>
        <div style={{ display: 'inline-flex', position: 'relative', width: 48, height: 48,
                       marginBottom: 18 }}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--line-soft)" strokeWidth="2.5"/>
            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--forest)" strokeWidth="2.5"
                    strokeDasharray="40 80" strokeLinecap="round"
                    transform="rotate(-90 24 24)">
              <animateTransform attributeName="transform" type="rotate"
                                from="0 24 24" to="360 24 24" dur="1.2s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--forest-deep)', lineHeight: 1.2 }}>
          Drafting two variants
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8, marginBottom: 0, lineHeight: 1.55 }}>
          One tuned for food production, one for biodiversity. Should take about 15 seconds.
        </p>
      </div>
    </div>
  );
}

window.Wizard = Wizard;
window.LoadingPlan = LoadingPlan;
