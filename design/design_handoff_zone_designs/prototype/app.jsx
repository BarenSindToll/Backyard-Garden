// Main app — page chrome + state orchestrator for the prototype.

const { useState: useStateA, useEffect: useEffectA } = React;

const GARDEN = {
  name: 'Casa Bunicii',
  widthM: 100,
  heightM: 60,
  hardinessZone: '7b',
  climate: 'Temperate continental',
};

// ── Page chrome ────────────────────────────────────────────────────────────

function TopBar({ planOpen, onGenerateClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px',
                  background: 'var(--paper)', borderBottom: '1px solid var(--line)',
                  gap: 16, flexShrink: 0 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--forest)',
                      color: '#f4f1e6', display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center' }}>
          <window.Icons.Leaf size={13} sw={2}/>
        </div>
        <span className="display" style={{ fontSize: 15, color: 'var(--forest-deep)' }}>{GARDEN.name}</span>
      </div>
      <div style={{ height: 16, width: 1, background: 'var(--line)' }}/>
      <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em' }}>
        {GARDEN.widthM} × {GARDEN.heightM} m  ·  Zone {GARDEN.hardinessZone}
      </div>

      {/* Guild health bar — vestigial, simplified */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Guild health
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[1,1,1,1,0].map((on, i) => (
            <span key={i} style={{ width: 14, height: 4, borderRadius: 2,
                                    background: on ? 'var(--forest)' : 'var(--line)' }}/>
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>4 of 5</span>
      </div>

      <div style={{ flex: 1 }}/>

      <button onClick={onGenerateClick}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', background: planOpen ? 'var(--sage)' : 'transparent',
                  color: 'var(--forest)', border: '1px solid var(--forest)',
                  borderRadius: 6, fontSize: 12.5, fontWeight: 500 }}>
        <window.Icons.Sparkle size={13}/>
        Generate plan
      </button>
      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', background: 'transparent',
                  color: 'var(--ink-soft)', border: '1px solid var(--line)',
                  borderRadius: 6, fontSize: 12.5 }}>
        <window.Icons.Compass size={13}/>
        Setup
      </button>
      <button style={{ padding: '7px 14px', background: 'var(--forest)',
                  color: '#f4f1e6', border: 'none',
                  borderRadius: 6, fontSize: 12.5, fontWeight: 500 }}>
        Save
      </button>
    </div>
  );
}

function ZoneTabs({ activeZone, onChange }) {
  const tabs = window.ZONE_TABS || [{ id: 'general', label: 'General' }];
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px', gap: 8,
                  background: 'var(--paper)', borderBottom: '1px solid var(--line-soft)',
                  flexShrink: 0, overflowX: 'auto' }} className="scroll">
      <span className="mono" style={{ fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase',
                                       color: 'var(--muted)', marginRight: 4, flexShrink: 0 }}>Zone</span>
      {tabs.map(z => {
        const isActive = z.id === activeZone;
        return (
          <button key={z.id} onClick={() => onChange(z.id)}
            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12,
                     background: isActive ? 'var(--forest)' : 'transparent',
                     color: isActive ? '#f4f1e6' : 'var(--ink-soft)',
                     border: '1px solid', borderColor: isActive ? 'var(--forest)' : 'var(--line)',
                     fontWeight: isActive ? 500 : 400,
                     whiteSpace: 'nowrap', flexShrink: 0 }}>
            {z.label}
          </button>
        );
      })}
      <button style={{ padding: '5px 8px', borderRadius: 999, fontSize: 12,
                   background: 'transparent', color: 'var(--muted)',
                   border: '1px dashed var(--line)', display: 'inline-flex', alignItems: 'center',
                   gap: 4, flexShrink: 0 }}>
        <window.Icons.Plus size={11}/> Add zone
      </button>
    </div>
  );
}

function PlantSidebar() {
  const plants = [
    'Tomato', 'Basil', 'Lavender', 'Apple', 'Comfrey', 'Strawberry',
    'Borage', 'Garlic', 'Calendula', 'Carrot', 'Beans', 'Sage',
  ];
  return (
    <div style={{ width: 256, background: 'var(--paper)', height: '100%',
                  borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column',
                  flexShrink: 0 }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--line-soft)' }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
                                        color: 'var(--muted)', marginBottom: 4 }}>
          Plants
        </div>
        <h3 className="display" style={{ fontSize: 18, margin: 0, color: 'var(--forest-deep)' }}>
          Drag onto map
        </h3>
      </div>
      <input placeholder="Search plants…"
        style={{ margin: '12px 18px', padding: '7px 12px', border: '1px solid var(--line)',
                  borderRadius: 6, fontSize: 12.5, fontFamily: 'inherit', background: 'var(--paper)' }}/>
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 18px 18px' }}>
        {plants.map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 6,
            background: i === 2 || i === 3 ? 'var(--sage)' : 'transparent',
            marginBottom: 2, cursor: 'grab',
          }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--cream)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--forest)' }}>
              <window.Icons.Leaf size={12}/>
            </div>
            <span style={{ fontSize: 13, color: 'var(--ink)' }}>{p}</span>
            {(i === 2 || i === 3) && (
              <span className="mono" style={{ fontSize: 9, color: 'var(--forest)', marginLeft: 'auto',
                                              letterSpacing: '0.1em' }}>FAV</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--forest)', color: '#f4f1e6', padding: '10px 18px',
                  borderRadius: 8, fontSize: 13, boxShadow: '0 10px 30px rgba(20,30,25,0.25)',
                  zIndex: 100, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <window.Icons.Check size={14} sw={2.5}/>
      {message}
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────

function App() {
  // Tweaks
  const [tweaks, setTweak] = window.useTweaks(/*EDITMODE-BEGIN*/{
    "density": "comfortable",
    "wizardLayout": "sheet",
    "accent": "forest",
    "showAppliedOverlay": false
  }/*EDITMODE-END*/);

  // Apply accent palette to root via CSS variables
  useEffectA(() => {
    const root = document.documentElement;
    if (tweaks.accent === 'harvest') {
      // Warm amber/terracotta heavy — autumn garden
      root.style.setProperty('--forest',      '#7a5028');
      root.style.setProperty('--forest-2',    '#a07040');
      root.style.setProperty('--forest-deep', '#3d2812');
      root.style.setProperty('--sage',        '#e8d8b8');
      root.style.setProperty('--paper',       '#fbf4e2');
      root.style.setProperty('--cream',       '#e8d8b8');
    } else if (tweaks.accent === 'linen') {
      // Muted neutral — minimalist
      root.style.setProperty('--forest',      '#4a5547');
      root.style.setProperty('--forest-2',    '#6a7568');
      root.style.setProperty('--forest-deep', '#222a20');
      root.style.setProperty('--sage',        '#dcdfd0');
      root.style.setProperty('--paper',       '#f7f5ee');
      root.style.setProperty('--cream',       '#e2dfd0');
    } else if (tweaks.accent === 'forest-dark') {
      // Original deep forest
      root.style.setProperty('--forest',      '#1b3b2f');
      root.style.setProperty('--forest-2',    '#2d5a45');
      root.style.setProperty('--forest-deep', '#102218');
      root.style.setProperty('--sage',        '#dde3d2');
      root.style.setProperty('--paper',       '#fbfaf5');
      root.style.setProperty('--cream',       '#ecebe3');
    } else {
      // Default — garden green (fresh, warm)
      root.style.setProperty('--forest',      '#3d6b34');
      root.style.setProperty('--forest-2',    '#5e9050');
      root.style.setProperty('--forest-deep', '#1f3a18');
      root.style.setProperty('--sage',        '#d8e3c0');
      root.style.setProperty('--paper',       '#fbf7ea');
      root.style.setProperty('--cream',       '#ece2c8');
    }
  }, [tweaks.accent]);

  // Prototype flow state
  const [stage, setStage] = useStateA('idle'); // idle | wizard | loading | preview | applied
  const [activeZone, setActiveZone] = useStateA('general');
  const [activeVariant, setActiveVariant] = useStateA('A');
  const [hovered, setHovered] = useStateA(null);
  const [selected, setSelected] = useStateA(new Set(['Three Sisters bed', 'Berry strip', 'Hazelnut tree', 'Walnut tree', 'Rain pond', 'Apple guild']));
  const [previewHidden, setPreviewHidden] = useStateA(false);
  const [toast, setToast] = useStateA(null);

  // When switching variants, reset selection to all applyable items
  const switchVariant = (v) => {
    setActiveVariant(v);
    const items = window.PLAN_DATA[v].groups.flatMap(g => g.items.filter(i => i.action !== 'tip'));
    setSelected(new Set(items.map(i => i.name)));
  };

  const handleGenerate = () => {
    setStage('loading');
    setTimeout(() => setStage('preview'), 1800);
  };

  const handleApply = () => {
    setStage('applied');
    setToast(`Applied ${selected.size} elements to map`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleReject = () => {
    setStage('idle');
  };

  const handleRegenerate = (which) => {
    if (which === 'edit' || which === 'new') {
      setStage('wizard');
    }
  };

  const proposedPlan = (stage === 'preview' || stage === 'applied')
    ? { ...window.PLAN_VARIANTS[activeVariant === 'A' ? 0 : 1] }
    : null;

  // Filter proposedPlan to only selected items when in preview
  const visibleProposed = proposedPlan ? {
    ...proposedPlan,
    elements: proposedPlan.elements,
  } : null;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  background: 'var(--cream)' }}>
      <TopBar planOpen={stage === 'wizard' || stage === 'preview'}
              onGenerateClick={() => setStage('wizard')}/>
      <ZoneTabs activeZone={activeZone} onChange={setActiveZone}/>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Map area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden',
                      background: 'var(--cream)' }}>
          <div style={{ position: 'absolute', inset: 0, padding: 24 }}>
            <div style={{ width: '100%', height: '100%',
                          background: 'var(--paper)',
                          borderRadius: 10, border: '1px solid var(--line-soft)',
                          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)',
                          overflow: 'hidden', position: 'relative' }}>
              <window.GardenCanvas
                activeZone={activeZone}
                onOpenZone={setActiveZone}
                proposedPlan={visibleProposed}
                hoveredName={hovered}
                selectedNames={selected}
                onHover={setHovered}
                showProposed={!previewHidden}
                faded={stage === 'wizard' || stage === 'loading'}
              />
              {/* Map legend */}
              <div style={{ position: 'absolute', left: 16, bottom: 16,
                             background: 'rgba(251,250,245,0.9)', backdropFilter: 'blur(4px)',
                             padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line-soft)',
                             display: 'flex', gap: 14, fontSize: 11, color: 'var(--ink-soft)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, background: '#bda480', borderRadius: 2 }}/>
                  Existing
                </span>
                {proposedPlan && (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, background: 'rgba(45,90,69,0.3)',
                                      border: '1px dashed var(--forest-2)', borderRadius: 2 }}/>
                      Proposed
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, background: 'rgba(160,132,101,0.3)',
                                      border: '1px dashed var(--earth)', borderRadius: 2 }}/>
                      Enhance
                    </span>
                  </>
                )}
              </div>
              {/* Map scale */}
              <div style={{ position: 'absolute', right: 16, bottom: 16,
                             background: 'rgba(251,250,245,0.9)', backdropFilter: 'blur(4px)',
                             padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line-soft)',
                             display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5,
                             color: 'var(--ink-soft)' }} className="mono">
                <span style={{ width: 30, height: 2, background: 'var(--ink-soft)' }}/>
                10 m
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — plant list or plan preview */}
        {(stage === 'preview' || stage === 'applied') && proposedPlan ? (
          <window.PlanPreview
            activeVariant={activeVariant}
            onSwitchVariant={switchVariant}
            hovered={hovered}
            setHovered={setHovered}
            selected={selected}
            setSelected={setSelected}
            previewHidden={previewHidden}
            onTogglePreview={() => setPreviewHidden(h => !h)}
            onApply={handleApply}
            onReject={handleReject}
            onRegenerate={handleRegenerate}
            density={tweaks.density}
          />
        ) : (
          <PlantSidebar/>
        )}
      </div>

      {stage === 'wizard' && (
        <window.Wizard onClose={() => setStage('idle')} onGenerate={handleGenerate}
                       garden={GARDEN} density={tweaks.density} layout={tweaks.wizardLayout}/>
      )}
      {stage === 'loading' && <window.LoadingPlan/>}

      <Toast message={toast}/>

      {/* Tweaks panel */}
      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Layout">
          <window.TweakRadio label="Wizard shape" value={tweaks.wizardLayout} onChange={v => setTweak('wizardLayout', v)}
            options={[{ value: 'sheet', label: 'Sheet' }, { value: 'panel', label: 'Side panel' }]}/>
          <window.TweakRadio label="Density" value={tweaks.density} onChange={v => setTweak('density', v)}
            options={[{ value: 'comfortable', label: 'Roomy' }, { value: 'compact', label: 'Compact' }]}/>
        </window.TweakSection>
        <window.TweakSection label="Aesthetic">
          <window.TweakSelect label="Palette" value={tweaks.accent} onChange={v => setTweak('accent', v)}
            options={[
              { value: 'forest',      label: 'Garden green (warm)' },
              { value: 'forest-dark', label: 'Deep forest' },
              { value: 'harvest',     label: 'Harvest amber' },
              { value: 'linen',       label: 'Linen neutral' },
            ]}/>
        </window.TweakSection>
        <window.TweakSection label="Jump to step">
          <window.TweakButton label="Open wizard"        onClick={() => setStage('wizard')}/>
          <window.TweakButton label="Show loading"       onClick={() => setStage('loading')}/>
          <window.TweakButton label="Show preview panel" onClick={() => setStage('preview')}/>
          <window.TweakButton label="Reset to map"       onClick={() => setStage('idle')} secondary/>
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
