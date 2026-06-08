// Zone detail views — one per clickable zone. Each gets its OWN visual
// vocabulary so users get a real sense of place when they open the zone.
//
// Garden coordinate system is 100m × 60m (matches canvas.jsx).
// Components receive { faded, pxPerM, pxPerMY } and render absolutely-positioned
// content over the detail canvas. They should return a single React fragment.

const { useMemo: useMemoZD } = React;
const GW = 100, GH = 60;

// ────────────────────────────────────────────────────────────────────────
// Shared tiny primitives (kept self-contained so this file is portable)
// ────────────────────────────────────────────────────────────────────────

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0xffffff) / 0xffffff;
  };
}

// Pill label — cream paper-tag, matches the rest of the canvas
function Pill({ x, y, text, size = 11, weight = 600, italic = false,
                bg = '#f7ecd0', color = '#3a2810', shadow = true,
                rotation = 0, transformOrigin = '50% 50%' }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${(x / GW) * 100}%`,
      top:  `${(y / GH) * 100}%`,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      transformOrigin,
      background: bg,
      border: '1px solid rgba(110,75,30,0.55)',
      padding: `${Math.max(2, size * 0.22)}px ${Math.max(6, size * 0.7)}px`,
      borderRadius: 2,
      fontFamily: italic ? 'Newsreader, Georgia, serif' : 'Inter, sans-serif',
      fontSize: size, fontWeight: weight,
      color,
      letterSpacing: '0.08em',
      textTransform: italic ? 'none' : 'uppercase',
      fontStyle: italic ? 'italic' : 'normal',
      boxShadow: shadow ? '0 2px 4px rgba(80,50,20,0.18)' : 'none',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      lineHeight: 1.2,
      zIndex: 20,
    }}>
      {text}
    </div>
  );
}

// Plant icon at a coordinate, sized in metres
function Plant({ cx, cy, sizeM, icon, pxPerM, pxPerMY, opacity = 1, rotate = 0 }) {
  const wPx = sizeM * pxPerM;
  const hPx = sizeM * pxPerMY;
  return (
    <img src={icon} alt="" draggable={false}
         style={{
           position: 'absolute',
           left: `calc(${(cx / GW) * 100}% - ${wPx / 2}px)`,
           top:  `calc(${(cy / GH) * 100}% - ${hPx / 2}px)`,
           width: wPx, height: hPx, objectFit: 'contain',
           opacity,
           transform: `rotate(${rotate}deg)`,
           filter: 'drop-shadow(0 1.5px 2px rgba(50,30,10,0.32))',
           pointerEvents: 'none',
         }}/>
  );
}

// Round leafy canopy (a tree from above)
function Canopy({ cx, cy, rM, pxPerM, pxPerMY, fruit = null, tone = 'medium' }) {
  const wPx = rM * 2 * pxPerM;
  const hPx = rM * 2 * pxPerMY;
  const palette = {
    light:  ['#c0dba0', '#86b06a', '#5e8a48'],
    medium: ['#a8d088', '#6f9858', '#4d7637'],
    dark:   ['#85b574', '#4d7637', '#2e4f1d'],
  }[tone] || ['#a8d088', '#6f9858', '#4d7637'];
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / GW) * 100}% - ${wPx / 2}px)`,
      top:  `calc(${(cy / GH) * 100}% - ${hPx / 2}px)`,
      width: wPx, height: hPx,
      borderRadius: '50%',
      background:
        `radial-gradient(circle at 32% 28%, ${palette[0]} 0%, ${palette[1]} 55%, ${palette[2]} 100%)`,
      border: '1.5px solid rgba(50,80,30,0.55)',
      boxShadow: '0 4px 10px rgba(40,60,30,0.32), inset 0 -3px 5px rgba(50,80,30,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      {fruit && wPx > 22 && (
        <img src={fruit} alt="" draggable={false}
             style={{ width: '52%', height: '52%', objectFit: 'contain',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.32))' }}/>
      )}
    </div>
  );
}

// SVG layer that fills the whole map area
function Layer({ children, opacity = 1 }) {
  return (
    <svg viewBox={`0 0 ${GW} ${GH}`} preserveAspectRatio="none"
         style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                  pointerEvents: 'none', opacity }}>
      {children}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────
// ORCHARD — fruit trees, each in a circular mulch ring with companion
// plants around it. Mowed grass rows between, dirt path through the middle.
// ────────────────────────────────────────────────────────────────────────

const ORCHARD_TREES = [
  // 2 rows × 3 trees, with the centre being apples (the user's hero)
  { cx: 20, cy: 17, rTree: 4.5, rRing: 8, name: 'Apple',     icon: 'assets/veg/apple.svg' },
  { cx: 50, cy: 17, rTree: 4.5, rRing: 8, name: 'Apple',     icon: 'assets/veg/apple.svg' },
  { cx: 80, cy: 17, rTree: 4.5, rRing: 8, name: 'Plum',      icon: 'assets/veg/plum.svg' },
  { cx: 20, cy: 43, rTree: 4.0, rRing: 7, name: 'Hazelnut',  icon: 'assets/veg/hazelnut.svg' },
  { cx: 50, cy: 43, rTree: 4.5, rRing: 8, name: 'Apple',     icon: 'assets/veg/apple.svg' },
  { cx: 80, cy: 43, rTree: 4.0, rRing: 7, name: 'Walnut',    icon: 'assets/veg/walnut.svg' },
];

// 6 companions around each tree (ring of icons)
const ORCHARD_COMPANIONS = [
  'assets/veg/calendula.svg',
  'assets/veg/chamomile.svg',
  'assets/veg/strawberry.svg',
  'assets/veg/garlic.svg',
  'assets/veg/blueberry.svg',
  'assets/veg/sunflower.svg',
];

function Orchard({ faded, pxPerM, pxPerMY }) {
  return (
    <>
      {/* Mowed grass background with stripes between rows */}
      <Layer opacity={faded ? 0.55 : 1}>
        <defs>
          <pattern id="grass-stripes" width="100" height="6" patternUnits="userSpaceOnUse">
            <rect width="100" height="6" fill="#bfd397"/>
            <rect y="3" width="100" height="3" fill="#aac783"/>
          </pattern>
          <radialGradient id="mulch-grad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#7a5a32"/>
            <stop offset="0.7" stopColor="#5a3e1d"/>
            <stop offset="1" stopColor="#46301a"/>
          </radialGradient>
        </defs>
        <rect width={GW} height={GH} fill="url(#grass-stripes)"/>

        {/* Soft grass tufts */}
        {Array.from({ length: 120 }).map((_, i) => {
          const r = rng(i + 13);
          const x = r() * GW, y = r() * GH;
          return (
            <circle key={i} cx={x} cy={y} r={0.4 + r() * 0.4}
                    fill="#8eb56e" opacity={0.5}/>
          );
        })}

        {/* Horizontal grass walk between the two tree rows */}
        <path d="M 6 30 L 94 30"
              stroke="#b18244" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" fill="none"
              opacity="0.85"/>
        <path d="M 6 30 L 94 30"
              stroke="rgba(255,235,200,0.25)" strokeWidth="0.6"
              strokeLinecap="butt" fill="none"/>

        {/* Mulch ring under each tree */}
        {ORCHARD_TREES.map((t, i) => (
          <circle key={i} cx={t.cx} cy={t.cy} r={t.rRing}
                  fill="url(#mulch-grad)" opacity="0.85"/>
        ))}
        {/* Inner mulch detail flecks */}
        {ORCHARD_TREES.map((t, i) => {
          const r = rng(i * 37 + 5);
          return Array.from({ length: 18 }).map((_, k) => {
            const a = r() * Math.PI * 2;
            const dist = r() * (t.rRing - 1);
            return (
              <circle key={`${i}-${k}`}
                      cx={t.cx + Math.cos(a) * dist}
                      cy={t.cy + Math.sin(a) * dist}
                      r={0.15 + r() * 0.2}
                      fill={r() > 0.5 ? '#3a2510' : '#8a6038'}
                      opacity="0.6"/>
            );
          });
        })}

        {/* Wheel-tracked outer rim ring */}
        {ORCHARD_TREES.map((t, i) => (
          <circle key={`r-${i}`} cx={t.cx} cy={t.cy} r={t.rRing + 0.15}
                  fill="none" stroke="rgba(60,40,15,0.4)" strokeWidth="0.15"
                  strokeDasharray="0.7 0.5"/>
        ))}
      </Layer>

      {/* Companion plant ring around each tree */}
      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1,
                    pointerEvents: 'none' }}>
        {ORCHARD_TREES.map((t, i) => (
          <React.Fragment key={`comp-${i}`}>
            {ORCHARD_COMPANIONS.map((icon, k) => {
              const angle = (k / ORCHARD_COMPANIONS.length) * Math.PI * 2 - Math.PI / 2;
              const ringR = t.rRing - 0.8;
              const cx = t.cx + Math.cos(angle) * ringR;
              const cy = t.cy + Math.sin(angle) * ringR;
              return (
                <React.Fragment key={k}>
                  {/* Leafy background patch so the icon stands out from mulch */}
                  <div style={{
                    position: 'absolute',
                    left: `calc(${(cx / GW) * 100}% - ${1.7 * pxPerM}px)`,
                    top:  `calc(${(cy / GH) * 100}% - ${1.7 * pxPerMY}px)`,
                    width: 3.4 * pxPerM, height: 3.4 * pxPerMY,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 30%, #b4d68a, #6a9050 75%, #4a7028)',
                    border: '1.2px solid rgba(50,80,30,0.5)',
                    boxShadow: '0 2px 4px rgba(40,60,30,0.35), inset 0 -1.5px 3px rgba(50,80,30,0.4)',
                    pointerEvents: 'none',
                  }}/>
                  <Plant cx={cx} cy={cy} sizeM={2.6} icon={icon}
                         pxPerM={pxPerM} pxPerMY={pxPerMY}/>
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}

        {/* Trees themselves (rendered after rings so they sit on top) */}
        {ORCHARD_TREES.map((t, i) => (
          <Canopy key={`tree-${i}`}
                  cx={t.cx} cy={t.cy} rM={t.rTree}
                  pxPerM={pxPerM} pxPerMY={pxPerMY}
                  fruit={t.icon}/>
        ))}

        {/* Cream pill name for each tree, under the mulch ring */}
        {ORCHARD_TREES.map((t, i) => (
          <Pill key={`lbl-${i}`}
                x={t.cx} y={t.cy + t.rRing + 1.8}
                text={t.name} size={11}/>
        ))}

        {/* Fallen apples & a wheelbarrow at the entrance */}
        <Plant cx={26} cy={29} sizeM={1.0} icon="assets/veg/apple.svg"
               pxPerM={pxPerM} pxPerMY={pxPerMY} rotate={-12}/>
        <Plant cx={28} cy={30.5} sizeM={0.8} icon="assets/veg/apple.svg"
               pxPerM={pxPerM} pxPerMY={pxPerMY} rotate={22}/>
        <Plant cx={72} cy={31} sizeM={1.0} icon="assets/veg/plum.svg"
               pxPerM={pxPerM} pxPerMY={pxPerMY} rotate={8}/>

        {/* A bird-box stake at the corner */}
        <BirdBox cx={94} cy={6} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        <BirdBox cx={6}  cy={54} pxPerM={pxPerM} pxPerMY={pxPerMY}/>

        {/* Section legend at the top */}
        <CalloutCard x={50} y={3.5} text="ORCHARD"
                     subtitle="6 fruit trees · companion guilds"/>
      </div>
    </>
  );
}

function BirdBox({ cx, cy, pxPerM, pxPerMY }) {
  const w = 1.6 * pxPerM, h = 2.4 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / GW) * 100}% - ${w / 2}px)`,
      top:  `calc(${(cy / GH) * 100}% - ${h / 2}px)`,
      width: w, height: h,
      pointerEvents: 'none',
    }}>
      <div style={{ width: '40%', height: '55%', margin: '0 auto',
                    background: 'linear-gradient(180deg,#a06840,#6e4225)',
                    borderRadius: '3px 3px 1px 1px',
                    position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
        <div style={{ position: 'absolute', top: '35%', left: '50%',
                      transform: 'translate(-50%,-50%)',
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#1a0e04' }}/>
      </div>
      <div style={{ width: 1.5, height: '45%', margin: '0 auto',
                    background: '#5a3c1c' }}/>
    </div>
  );
}

function CalloutCard({ x, y, text, subtitle }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${(x / GW) * 100}%`,
      top:  `${(y / GH) * 100}%`,
      transform: 'translate(-50%, -50%)',
      background: 'rgba(247,236,208,0.95)',
      border: '1.5px solid rgba(110,75,30,0.6)',
      padding: '5px 13px',
      borderRadius: 4,
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
      boxShadow: '0 2px 6px rgba(80,50,20,0.25)',
      pointerEvents: 'none',
      zIndex: 30,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#3a2810',
                    letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {text}
      </div>
      {subtitle && (
        <div style={{ fontSize: 9.5, color: '#6a4f28', marginTop: 1.5,
                      fontStyle: 'italic', fontFamily: 'Newsreader, Georgia, serif' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// BERRY PATCH — three long beds of berries with cane stakes & netting
// ────────────────────────────────────────────────────────────────────────

const BERRY_ROWS = [
  { y: 14, name: 'Raspberry', icon: 'assets/veg/raspberry.svg', color: '#d870a0' },
  { y: 28, name: 'Blueberry', icon: 'assets/veg/blueberry.svg', color: '#7eb0d4' },
  { y: 42, name: 'Strawberry', icon: 'assets/veg/strawberry.svg', color: '#f08a70' },
];

function BerryPatch({ faded, pxPerM, pxPerMY }) {
  return (
    <>
      <Layer opacity={faded ? 0.5 : 1}>
        <defs>
          <pattern id="berry-grass" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#c4d4a0"/>
            <circle cx="3" cy="5" r="0.3" fill="#94b070" opacity="0.6"/>
            <circle cx="12" cy="9" r="0.25" fill="#94b070" opacity="0.5"/>
            <circle cx="7" cy="15" r="0.3" fill="#94b070" opacity="0.6"/>
          </pattern>
          <pattern id="straw-mulch" width="2" height="2" patternUnits="userSpaceOnUse">
            <rect width="2" height="2" fill="#d6b070"/>
            <line x1="0" y1="0.5" x2="2" y2="0.7"
                  stroke="#a8814a" strokeWidth="0.12"/>
            <line x1="0" y1="1.3" x2="2" y2="1.5"
                  stroke="#c49858" strokeWidth="0.1"/>
          </pattern>
        </defs>
        <rect width={GW} height={GH} fill="url(#berry-grass)"/>

        {/* Three long raised beds with straw mulch */}
        {BERRY_ROWS.map((row, i) => (
          <g key={i}>
            {/* Wood frame */}
            <rect x="10" y={row.y - 4} width="80" height="8" rx="0.5"
                  fill="#7a5230" opacity="0.95"/>
            <rect x="10.4" y={row.y - 3.6} width="79.2" height="7.2"
                  fill="url(#straw-mulch)"/>
            {/* Wood plank seams */}
            <line x1="10" y1={row.y - 4} x2="90" y2={row.y - 4}
                  stroke="#3a230c" strokeWidth="0.3"/>
            <line x1="10" y1={row.y + 4} x2="90" y2={row.y + 4}
                  stroke="#3a230c" strokeWidth="0.3"/>

            {/* Vertical stakes for canes (raspberry) */}
            {row.name === 'Raspberry' && Array.from({ length: 9 }).map((_, k) => (
              <g key={k}>
                <line x1={14 + k * 9} y1={row.y - 3.5}
                      x2={14 + k * 9} y2={row.y + 3.5}
                      stroke="#5a3a1c" strokeWidth="0.18"/>
              </g>
            ))}
            {/* Horizontal training wires for raspberries */}
            {row.name === 'Raspberry' && [-2, 0, 2].map((off, k) => (
              <line key={k} x1="14" y1={row.y + off}
                    x2="86" y2={row.y + off}
                    stroke="#888a85" strokeWidth="0.08"/>
            ))}
          </g>
        ))}

        {/* Netting overlay (whole patch) */}
        <g opacity="0.35">
          {Array.from({ length: 50 }).map((_, i) => (
            <line key={`v-${i}`} x1={10 + i * 1.6} y1="8"
                  x2={10 + i * 1.6} y2="48"
                  stroke="#5a5a5a" strokeWidth="0.05"/>
          ))}
          {Array.from({ length: 27 }).map((_, i) => (
            <line key={`h-${i}`} x1="10" y1={8 + i * 1.5}
                  x2="90" y2={8 + i * 1.5}
                  stroke="#5a5a5a" strokeWidth="0.05"/>
          ))}
        </g>
      </Layer>

      {/* Berry plants */}
      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1,
                    pointerEvents: 'none' }}>
        {BERRY_ROWS.map((row, i) => {
          const plants = [];
          const count = row.name === 'Strawberry' ? 30 : 16;
          for (let k = 0; k < count; k++) {
            plants.push({
              x: 12 + (k * (76 / (count - 1))),
              y: row.y + (row.name === 'Strawberry'
                  ? ((k % 2) ? 2 : -2)
                  : 0),
              size: row.name === 'Strawberry' ? 1.8 : 2.5,
            });
          }
          return plants.map((p, k) => (
            <Plant key={`${i}-${k}`}
                   cx={p.x} cy={p.y} sizeM={p.size}
                   icon={row.icon}
                   pxPerM={pxPerM} pxPerMY={pxPerMY}/>
          ));
        })}

        {/* Labels at the ends */}
        {BERRY_ROWS.map((row, i) => (
          <Pill key={`lbl-${i}`}
                x={6} y={row.y} text={row.name} size={10}
                rotation={-90}/>
        ))}

        {/* Yield tags */}
        {[
          { x: 95, y: 14, text: '~6kg/yr', italic: true },
          { x: 95, y: 28, text: '~4kg/yr', italic: true },
          { x: 95, y: 42, text: '~3kg/yr', italic: true },
        ].map((t, i) => (
          <Pill key={i} x={t.x} y={t.y} text={t.text} size={9}
                italic bg="#fef6e0" rotation={90}/>
        ))}

        <CalloutCard x={50} y={4} text="BERRY PATCH"
                     subtitle="netted · straw-mulched · 3 species"/>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// BEE HIVES — line of hives in a wildflower meadow with foraging bees
// ────────────────────────────────────────────────────────────────────────

const BEE_HIVES = [
  { x: 20, y: 30, color: '#d49858' },
  { x: 35, y: 30, color: '#c08648' },
  { x: 50, y: 30, color: '#d49858' },
  { x: 65, y: 30, color: '#b88040' },
  { x: 80, y: 30, color: '#d49858' },
];

function BeeHives({ faded, pxPerM, pxPerMY }) {
  // Scatter wildflowers around the hives
  const flowers = useMemoZD(() => {
    const r = rng(42);
    const icons = ['assets/veg/calendula.svg', 'assets/veg/sunflower.svg',
                   'assets/veg/chamomile.svg', 'assets/veg/rose.svg'];
    const out = [];
    for (let i = 0; i < 80; i++) {
      const y = r() * GH;
      // Avoid the hive line band
      if (y > 26 && y < 36) continue;
      out.push({
        x: 4 + r() * 92, y, size: 1.4 + r() * 1.2,
        icon: icons[Math.floor(r() * icons.length)],
      });
    }
    return out;
  }, []);

  // Bees as small dots floating around
  const bees = useMemoZD(() => {
    const r = rng(7);
    const out = [];
    for (let i = 0; i < 40; i++) {
      out.push({
        x: 4 + r() * 92, y: 4 + r() * 52,
        size: 0.8 + r() * 0.4,
      });
    }
    return out;
  }, []);

  return (
    <>
      <Layer opacity={faded ? 0.5 : 1}>
        <defs>
          <pattern id="meadow" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="#d7e5b3"/>
            <circle cx="5" cy="8" r="0.4" fill="#b4c887" opacity="0.6"/>
            <circle cx="20" cy="15" r="0.3" fill="#b4c887" opacity="0.6"/>
            <circle cx="12" cy="22" r="0.4" fill="#b4c887" opacity="0.6"/>
            <circle cx="25" cy="5" r="0.3" fill="#a8be78" opacity="0.5"/>
            <circle cx="8" cy="26" r="0.35" fill="#a8be78" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width={GW} height={GH} fill="url(#meadow)"/>

        {/* Dirt path under the hives (the beekeeper walks here) */}
        <rect x="6" y="33.5" width="88" height="3" fill="#b48650" opacity="0.7"/>

        {/* Sun rays from corner */}
        <g opacity="0.25">
          <circle cx="92" cy="6" r="2.5" fill="#fae07a"/>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <line key={i}
                    x1={92 + Math.cos(a) * 3} y1={6 + Math.sin(a) * 3}
                    x2={92 + Math.cos(a) * 5} y2={6 + Math.sin(a) * 5}
                    stroke="#e3a83f" strokeWidth="0.3"/>
            );
          })}
        </g>

        {/* Foraging flight curves between hives and flowers */}
        <g opacity={faded ? 0.25 : 0.4} fill="none"
           stroke="#7a5a18" strokeWidth="0.1" strokeDasharray="0.3 0.4">
          <path d="M 20 30 Q 12 18 8 10"/>
          <path d="M 35 30 Q 32 18 28 9"/>
          <path d="M 50 30 Q 56 18 60 12"/>
          <path d="M 65 30 Q 70 20 75 10"/>
          <path d="M 80 30 Q 85 18 90 8"/>
          <path d="M 20 30 Q 14 44 10 52"/>
          <path d="M 50 30 Q 50 44 50 52"/>
          <path d="M 80 30 Q 82 46 88 52"/>
        </g>
      </Layer>

      {/* Wildflowers */}
      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1,
                    pointerEvents: 'none' }}>
        {flowers.map((f, i) => (
          <Plant key={i} cx={f.x} cy={f.y} sizeM={f.size} icon={f.icon}
                 pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}

        {/* Hives */}
        {BEE_HIVES.map((h, i) => (
          <Langstroth key={i} h={h} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}

        {/* Numbered tag in front of each hive */}
        {BEE_HIVES.map((h, i) => (
          <Pill key={`tag-${i}`} x={h.x} y={h.y + 5} text={`#${i + 1}`}
                size={9} bg="#fef6e0"/>
        ))}

        {/* Bees */}
        {bees.map((b, i) => (
          <Bee key={i} b={b} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}

        <CalloutCard x={50} y={6} text="APIARY"
                     subtitle="5 hives · pollinator meadow"/>
      </div>
    </>
  );
}

function Langstroth({ h, pxPerM, pxPerMY }) {
  const w = 5 * pxPerM, hpx = 6 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(h.x / GW) * 100}% - ${w / 2}px)`,
      top:  `calc(${(h.y / GH) * 100}% - ${hpx / 2}px)`,
      width: w, height: hpx,
      pointerEvents: 'none',
    }}>
      {/* Roof */}
      <div style={{
        position: 'absolute', top: 0, left: '-8%', right: '-8%',
        height: '15%',
        background: 'linear-gradient(180deg, #6e4520 0%, #4a2c10 100%)',
        borderRadius: '2px 2px 0 0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
      }}/>
      {/* Boxes stacked */}
      {[0, 1, 2, 3].map(k => (
        <div key={k} style={{
          position: 'absolute',
          top: `${15 + k * 18}%`, left: 0, right: 0,
          height: '17%',
          background: `linear-gradient(180deg, ${h.color} 0%, ${h.color}cc 100%)`,
          border: '1px solid #5a3a1c',
          boxShadow: 'inset 0 1px 0 rgba(255,240,210,0.3), inset 0 -1px 0 rgba(60,30,10,0.4)',
        }}/>
      ))}
      {/* Landing board */}
      <div style={{
        position: 'absolute', bottom: '0%', left: '20%', right: '20%',
        height: '4%', background: '#3a2510',
      }}/>
      {/* Entrance */}
      <div style={{
        position: 'absolute', bottom: '4%', left: '40%', width: '20%',
        height: '3%', background: '#1a0e04', borderRadius: 1,
      }}/>
    </div>
  );
}

function Bee({ b, pxPerM, pxPerMY }) {
  const w = b.size * pxPerM, h = b.size * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(b.x / GW) * 100}% - ${w / 2}px)`,
      top:  `calc(${(b.y / GH) * 100}% - ${h / 2}px)`,
      width: w, height: h,
      background:
        'repeating-linear-gradient(90deg, #f2c43a 0 25%, #2a1a08 25% 50%)',
      borderRadius: '50%',
      boxShadow: '0 0 0 0.5px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
      pointerEvents: 'none',
    }}/>
  );
}

// ────────────────────────────────────────────────────────────────────────
// CHICKEN COOP — wooden coop + fenced run with scratching dirt patches
// ────────────────────────────────────────────────────────────────────────

function ChickenCoop({ faded, pxPerM, pxPerMY }) {
  const coop = { x: 14, y: 18, w: 24, h: 22 };
  const run  = { x: 40, y: 14, w: 50, h: 32 };

  const chickens = useMemoZD(() => {
    const r = rng(99);
    const out = [];
    // A few in the coop
    for (let i = 0; i < 2; i++) {
      out.push({
        x: coop.x + 5 + r() * (coop.w - 10),
        y: coop.y + 5 + r() * (coop.h - 10),
        kind: r() > 0.5 ? 'brown' : 'white',
      });
    }
    // More in the run
    for (let i = 0; i < 9; i++) {
      out.push({
        x: run.x + 3 + r() * (run.w - 6),
        y: run.y + 3 + r() * (run.h - 6),
        kind: ['brown', 'white', 'speckled'][Math.floor(r() * 3)],
      });
    }
    return out;
  }, []);

  return (
    <>
      <Layer opacity={faded ? 0.5 : 1}>
        <defs>
          <pattern id="dirt-yard" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#c9a468"/>
            <circle cx="4" cy="5" r="0.4" fill="#8a6840" opacity="0.6"/>
            <circle cx="14" cy="3" r="0.3" fill="#8a6840" opacity="0.5"/>
            <circle cx="9" cy="12" r="0.5" fill="#8a6840" opacity="0.55"/>
            <circle cx="17" cy="16" r="0.35" fill="#a07640" opacity="0.5"/>
            <circle cx="2" cy="17" r="0.3" fill="#a07640" opacity="0.5"/>
          </pattern>
          <pattern id="grass-bg" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#bcd089"/>
            <circle cx="5" cy="5" r="0.4" fill="#94b06a" opacity="0.5"/>
            <circle cx="15" cy="12" r="0.3" fill="#94b06a" opacity="0.5"/>
          </pattern>
        </defs>

        <rect width={GW} height={GH} fill="url(#grass-bg)"/>

        {/* Run: dirt yard with chicken wire fencing */}
        <rect x={run.x} y={run.y} width={run.w} height={run.h}
              fill="url(#dirt-yard)" rx="0.5"/>

        {/* Scratching dust patches (chickens love to bath) */}
        {[
          { x: 50, y: 22 }, { x: 65, y: 32 }, { x: 78, y: 22 },
          { x: 55, y: 40 }, { x: 72, y: 40 },
        ].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5}
                  fill="#a87a40" opacity="0.5"/>
        ))}

        {/* Chicken wire pattern overlay on run */}
        <g opacity="0.45">
          {Array.from({ length: 25 }).map((_, i) => {
            const x = run.x + i * 2;
            return Array.from({ length: 16 }).map((_, j) => {
              const y = run.y + j * 2;
              const offset = j % 2 ? 1 : 0;
              return (
                <polygon key={`${i}-${j}`}
                         points={`${x + offset},${y} ${x + 1 + offset},${y + 0.5} ${x + 1 + offset},${y + 1.5} ${x + offset},${y + 2} ${x - 1 + offset},${y + 1.5} ${x - 1 + offset},${y + 0.5}`}
                         fill="none" stroke="#888" strokeWidth="0.07"/>
              );
            });
          })}
        </g>

        {/* Fence posts around run */}
        {[
          [run.x, run.y], [run.x + run.w, run.y],
          [run.x, run.y + run.h], [run.x + run.w, run.y + run.h],
          [run.x + run.w / 2, run.y], [run.x + run.w / 2, run.y + run.h],
        ].map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="0.5"
                  fill="#5a3a18" stroke="#3a2510" strokeWidth="0.1"/>
        ))}

        {/* Feed and water bowls */}
        <circle cx="50" cy="34" r="1.5" fill="#b87040" stroke="#5a3a18"
                strokeWidth="0.2"/>
        <circle cx="50" cy="34" r="0.8" fill="#5a3a18"/>
        <circle cx="58" cy="36" r="1.5" fill="#5a8db8" stroke="#3a5a78"
                strokeWidth="0.2"/>
        <circle cx="58" cy="36" r="0.8" fill="#2a4a6a"/>
      </Layer>

      {/* Coop building */}
      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1,
                    pointerEvents: 'none' }}>
        <CoopBuilding coop={coop} pxPerM={pxPerM} pxPerMY={pxPerMY}/>

        {/* Chickens */}
        {chickens.map((c, i) => (
          <Chicken key={i} c={c} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}

        <Pill x={coop.x + coop.w / 2} y={coop.y - 2}
              text="Henhouse" size={10}/>
        <Pill x={run.x + run.w / 2} y={run.y - 2}
              text="Outdoor Run" size={10}/>
        <Pill x={50} y={50} text="12 hens · 1 cockerel"
              size={9} italic bg="#fef6e0"/>
        <CalloutCard x={50} y={6} text="POULTRY"
                     subtitle="raised coop · predator-safe run"/>
      </div>
    </>
  );
}

function CoopBuilding({ coop, pxPerM, pxPerMY }) {
  const w = coop.w * pxPerM, h = coop.h * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `${(coop.x / GW) * 100}%`,
      top:  `${(coop.y / GH) * 100}%`,
      width: w, height: h,
      pointerEvents: 'none',
    }}>
      {/* Roof (sloped triangle on top) */}
      <div style={{
        position: 'absolute', top: '-12%', left: '-8%', right: '-8%',
        height: '36%',
        background:
          'repeating-linear-gradient(0deg, #5a3a18 0 6px, #4a2c10 6px 7px),' +
          'linear-gradient(180deg, #7a4a20 0%, #5a3a18 100%)',
        clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
      }}/>
      {/* Body */}
      <div style={{
        position: 'absolute', top: '20%', left: 0, right: 0, bottom: 0,
        background:
          'repeating-linear-gradient(0deg, transparent 0 12px, rgba(60,30,10,0.3) 12px 13px),' +
          'linear-gradient(90deg, #c79866 0%, #b88350 50%, #c79866 100%)',
        border: '1.5px solid #5a3a18',
        borderRadius: 2,
        boxShadow: '0 2px 5px rgba(40,20,5,0.35), inset 0 1px 0 rgba(255,240,210,0.4)',
      }}>
        {/* Window */}
        <div style={{
          position: 'absolute', top: '18%', left: '15%',
          width: '25%', height: '28%',
          background: '#3a5070',
          border: '1.5px solid #4a2c10',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0,
            height: '1.5px', background: '#4a2c10',
          }}/>
          <div style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0,
            width: '1.5px', background: '#4a2c10',
          }}/>
        </div>
        {/* Door */}
        <div style={{
          position: 'absolute', bottom: 0, right: '15%',
          width: '32%', height: '60%',
          background: 'linear-gradient(180deg, #6e4220 0%, #4a2c10 100%)',
          border: '1.5px solid #2a1808',
          borderRadius: '4px 4px 0 0',
        }}>
          <div style={{
            position: 'absolute', top: '40%', right: '15%',
            width: 3, height: 3, borderRadius: '50%',
            background: '#e8c08a', boxShadow: '0 0 0 0.5px #2a1808',
          }}/>
        </div>
        {/* Pop-hole (chicken entrance) at bottom-left */}
        <div style={{
          position: 'absolute', bottom: 0, left: '12%',
          width: '15%', height: '22%',
          background: '#1a0e04',
          borderRadius: '50% 50% 0 0',
          border: '1.5px solid #2a1808',
        }}/>
      </div>
    </div>
  );
}

function Chicken({ c, pxPerM, pxPerMY }) {
  const w = 1.8 * pxPerM, h = 1.4 * pxPerMY;
  const colors = {
    brown:     { body: '#9c5a2a', wing: '#7a4220', comb: '#c0282c' },
    white:     { body: '#f0ebde', wing: '#d4cdb8', comb: '#c0282c' },
    speckled:  { body: '#5a4a3a', wing: '#3a2c1c', comb: '#c0282c' },
  }[c.kind];
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(c.x / GW) * 100}% - ${w / 2}px)`,
      top:  `calc(${(c.y / GH) * 100}% - ${h / 2}px)`,
      width: w, height: h,
      pointerEvents: 'none',
    }}>
      {/* Body */}
      <div style={{
        position: 'absolute', inset: 0,
        background:
          `radial-gradient(ellipse at 30% 35%, ${colors.body} 0%, ${colors.wing} 80%)`,
        borderRadius: '60% 50% 50% 50%',
        boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
        border: '0.5px solid rgba(40,25,10,0.5)',
      }}/>
      {/* Head + comb */}
      <div style={{
        position: 'absolute', top: '-15%', left: '60%',
        width: '35%', height: '50%',
        background: colors.body,
        borderRadius: '50%',
        boxShadow: '0 1px 1.5px rgba(0,0,0,0.3)',
        border: '0.5px solid rgba(40,25,10,0.5)',
      }}>
        {/* Comb */}
        <div style={{
          position: 'absolute', top: '-30%', left: '20%',
          width: '70%', height: '50%',
          background: colors.comb,
          borderRadius: '60% 60% 0 0',
        }}/>
        {/* Beak */}
        <div style={{
          position: 'absolute', top: '55%', right: '-20%',
          width: '30%', height: '20%',
          background: '#e8a440',
          clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
        }}/>
        {/* Eye */}
        <div style={{
          position: 'absolute', top: '40%', right: '20%',
          width: 1.5, height: 1.5, borderRadius: '50%',
          background: '#1a0e04',
        }}/>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// COMPOST — three-bin wooden system at different stages of decomposition
// ────────────────────────────────────────────────────────────────────────

function Compost({ faded, pxPerM, pxPerMY }) {
  const bins = [
    { x: 14, label: 'Fresh',     fill: '#7a8d3a', pile: 0.85,
      contents: 'kitchen scraps · green' },
    { x: 42, label: 'Cooking',   fill: '#6a5028', pile: 0.65,
      contents: 'turning · hot stage' },
    { x: 70, label: 'Finished',  fill: '#3a2810', pile: 0.45,
      contents: 'crumbly · ready to use' },
  ];
  return (
    <>
      <Layer opacity={faded ? 0.5 : 1}>
        <defs>
          <pattern id="dirt-comp" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#b8a070"/>
            <circle cx="4" cy="6" r="0.4" fill="#8a7048" opacity="0.5"/>
            <circle cx="14" cy="12" r="0.3" fill="#8a7048" opacity="0.5"/>
            <circle cx="9" cy="16" r="0.35" fill="#8a7048" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width={GW} height={GH} fill="url(#dirt-comp)"/>

        {/* Concrete pad under bins */}
        <rect x="8" y="22" width="84" height="28" fill="#aaa49a" opacity="0.55"
              stroke="#7a7568" strokeWidth="0.25"/>

        {/* Tool shadow & wheelbarrow shadow */}
        <ellipse cx="84" cy="14" rx="6" ry="1.5" fill="rgba(0,0,0,0.18)"/>
      </Layer>

      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1,
                    pointerEvents: 'none' }}>
        {bins.map((bin, i) => (
          <CompostBin key={i} bin={bin}
                      pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}

        {/* Tool wall */}
        <ToolWall pxPerM={pxPerM} pxPerMY={pxPerMY}/>

        <CalloutCard x={50} y={5} text="COMPOST YARD"
                     subtitle="3-bin rotation · kitchen + garden scraps"/>
        <Pill x={50} y={56} text="produces ~2m³ finished compost/yr"
              size={9} italic bg="#fef6e0"/>
      </div>
    </>
  );
}

function CompostBin({ bin, pxPerM, pxPerMY }) {
  const w = 24 * pxPerM, h = 24 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `${(bin.x / GW) * 100}%`,
      top:  `${(22 / GH) * 100}%`,
      width: w, height: h,
      pointerEvents: 'none',
    }}>
      {/* Wood frame — slatted */}
      <div style={{
        position: 'absolute', inset: 0,
        background:
          'repeating-linear-gradient(0deg, #6e4520 0 18%, transparent 18% 22%)',
      }}/>
      {/* Side posts */}
      {[0, 1].map(i => (
        <div key={i} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: i ? 'auto' : 0, right: i ? 0 : 'auto',
          width: '6%',
          background: 'linear-gradient(180deg, #4a2c10 0%, #6e4520 100%)',
          boxShadow: '0 0 3px rgba(0,0,0,0.4)',
        }}/>
      ))}
      {/* Compost pile (height varies by stage) */}
      <div style={{
        position: 'absolute', left: '6%', right: '6%', bottom: 0,
        height: `${bin.pile * 100}%`,
        background:
          `radial-gradient(ellipse at 50% 30%, ${bin.fill}ee 0%, ${bin.fill} 70%, ${bin.fill}cc 100%)`,
        borderRadius: '40% 40% 0 0 / 20% 20% 0 0',
        boxShadow: 'inset 0 -4px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.25)',
      }}>
        {/* Texture flecks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const r = rng(bin.x * 31 + i);
          return (
            <span key={i} style={{
              position: 'absolute',
              left: `${r() * 90 + 5}%`, top: `${r() * 80 + 10}%`,
              width: 4, height: 3,
              borderRadius: '50%',
              background: r() > 0.5 ? 'rgba(255,240,200,0.4)' : 'rgba(40,20,5,0.5)',
            }}/>
          );
        })}
      </div>
      {/* Label sign */}
      <div style={{
        position: 'absolute', top: '-12%', left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(180deg, #e3c08a 0%, #c19655 100%)',
        border: '1.5px solid #5e3d1c',
        padding: '2px 10px', borderRadius: 3,
        fontSize: 11, fontWeight: 700, color: '#3a2510',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        fontFamily: 'Inter, sans-serif',
        boxShadow: '0 2px 4px rgba(0,0,0,0.35)',
      }}>{bin.label}</div>
      {/* Subtitle in italics below */}
      <div style={{
        position: 'absolute', bottom: '-12%', left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 9.5, color: '#3a2810',
        fontFamily: 'Newsreader, Georgia, serif',
        fontStyle: 'italic', whiteSpace: 'nowrap',
        textShadow: '0 0 4px rgba(247,236,208,0.95)',
      }}>{bin.contents}</div>
    </div>
  );
}

function ToolWall({ pxPerM, pxPerMY }) {
  // Pitchfork + shovel + wheelbarrow at corner
  return (
    <>
      {/* Pitchfork */}
      <div style={{
        position: 'absolute',
        left: `${(7 / GW) * 100}%`, top: `${(8 / GH) * 100}%`,
        width: 4 * pxPerM, height: 14 * pxPerMY,
        transform: 'rotate(8deg)', transformOrigin: 'bottom center',
        pointerEvents: 'none',
      }}>
        <div style={{ width: '12%', height: '85%', margin: '0 auto',
                      background: 'linear-gradient(90deg, #6e4520, #a07238, #6e4520)',
                      borderRadius: 1 }}/>
        <div style={{ display: 'flex', justifyContent: 'space-around',
                      width: '70%', margin: '0 auto', marginTop: -2 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: '8%', height: 14,
                                  background: '#8a8a8a',
                                  borderRadius: '0 0 1px 1px',
                                  boxShadow: '0 1px 1px rgba(0,0,0,0.3)' }}/>
          ))}
        </div>
      </div>
      {/* Shovel */}
      <div style={{
        position: 'absolute',
        left: `${(92 / GW) * 100}%`, top: `${(8 / GH) * 100}%`,
        width: 3.5 * pxPerM, height: 14 * pxPerMY,
        transform: 'rotate(-12deg) translateX(-100%)',
        transformOrigin: 'bottom center',
        pointerEvents: 'none',
      }}>
        <div style={{ width: '15%', height: '78%', margin: '0 auto',
                      background: 'linear-gradient(90deg, #6e4520, #a07238, #6e4520)',
                      borderRadius: 1 }}/>
        <div style={{ width: '70%', height: 18, margin: '0 auto', marginTop: -2,
                      background: 'linear-gradient(180deg, #b8b8b8, #6a6a6a)',
                      borderRadius: '20% 20% 50% 50%',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}/>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// GREENHOUSE — glass-roof structure with planting tables and pots
// ────────────────────────────────────────────────────────────────────────

function Greenhouse({ faded, pxPerM, pxPerMY }) {
  return (
    <>
      <Layer opacity={faded ? 0.5 : 1}>
        <defs>
          <pattern id="gravel" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#b8ab94"/>
            <circle cx="1.2" cy="2" r="0.35" fill="#8a7c64" opacity="0.6"/>
            <circle cx="4" cy="4.5" r="0.3" fill="#8a7c64" opacity="0.55"/>
            <circle cx="3" cy="1" r="0.25" fill="#6a5c44" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width={GW} height={GH} fill="#d5e3a8"/>

        {/* Greenhouse footprint */}
        <rect x="12" y="10" width="76" height="40" fill="url(#gravel)"
              stroke="#3a2810" strokeWidth="0.5"/>

        {/* Centre walking path */}
        <rect x="12" y="28" width="76" height="4" fill="#9c8a6a" opacity="0.7"/>

        {/* Tile lines on the floor */}
        {[16, 20, 24, 36, 40, 44, 48].map((y, i) => (
          <line key={i} x1="12" y1={y} x2="88" y2={y}
                stroke="#7a6a54" strokeWidth="0.1" opacity="0.5"/>
        ))}

        {/* Glass roof grid — drawn as a translucent overlay */}
        <g opacity="0.35">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`v-${i}`} x1={12 + i * 9.5} y1="10"
                  x2={12 + i * 9.5} y2="50"
                  stroke="#5a7a8a" strokeWidth="0.2"/>
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`h-${i}`} x1="12" y1={10 + i * 10}
                  x2="88" y2={10 + i * 10}
                  stroke="#5a7a8a" strokeWidth="0.2"/>
          ))}
          <rect x="12" y="10" width="76" height="40"
                fill="rgba(180,210,225,0.35)"
                stroke="#3a4858" strokeWidth="0.4"/>
        </g>

        {/* Light beams from windows */}
        <g opacity="0.18">
          <polygon points="20,10 28,10 38,50 30,50" fill="#fae07a"/>
          <polygon points="60,10 68,10 78,50 70,50" fill="#fae07a"/>
        </g>

        {/* Door at south */}
        <rect x="46" y="48" width="8" height="4"
              fill="#6e4520" stroke="#3a2510" strokeWidth="0.4"/>
      </Layer>

      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1,
                    pointerEvents: 'none' }}>
        {/* Two long planting tables (top and bottom) */}
        <PlantingTable x={14} y={15} w={72} h={10} icon="assets/veg/strawberry.svg"
                       count={18} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        <PlantingTable x={14} y={35} w={72} h={10} icon="assets/veg/calendula.svg"
                       count={18} pxPerM={pxPerM} pxPerMY={pxPerMY}/>

        {/* Hanging baskets */}
        {[22, 36, 50, 64, 78].map((x, i) => (
          <HangingBasket key={i} x={x} y={11}
                         pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}

        {/* Watering can in the corner */}
        <WateringCan x={86} y={48} pxPerM={pxPerM} pxPerMY={pxPerMY}/>

        <Pill x={14} y={20} text="Seed Tray" size={9} italic bg="#fef6e0"/>
        <Pill x={14} y={40} text="Flowers" size={9} italic bg="#fef6e0"/>
        <CalloutCard x={50} y={5} text="GREENHOUSE"
                     subtitle="76 m² · year-round growing"/>
      </div>
    </>
  );
}

function PlantingTable({ x, y, w, h, icon, count, pxPerM, pxPerMY }) {
  return (
    <>
      {/* Table top */}
      <div style={{
        position: 'absolute',
        left: `${(x / GW) * 100}%`, top: `${(y / GH) * 100}%`,
        width: w * pxPerM, height: h * pxPerMY,
        background: 'linear-gradient(180deg, #a87a44 0%, #7a5028 100%)',
        border: '1.5px solid #3a2510', borderRadius: 2,
        boxShadow: '0 3px 6px rgba(0,0,0,0.35)',
        pointerEvents: 'none',
      }}/>
      {/* Pots in a row */}
      {Array.from({ length: count }).map((_, k) => {
        const cx = x + 2 + (k * ((w - 4) / (count - 1)));
        const cy = y + h / 2;
        return (
          <React.Fragment key={k}>
            {/* Terracotta pot circle */}
            <div style={{
              position: 'absolute',
              left: `calc(${(cx / GW) * 100}% - ${1.8 * pxPerM}px)`,
              top:  `calc(${(cy / GH) * 100}% - ${1.8 * pxPerMY}px)`,
              width: 3.6 * pxPerM, height: 3.6 * pxPerMY,
              background: 'radial-gradient(circle at 30% 30%, #d68a58, #a85a30 80%)',
              borderRadius: '50%',
              boxShadow: '0 1.5px 3px rgba(0,0,0,0.4), inset 0 -2px 3px rgba(60,20,5,0.4)',
              pointerEvents: 'none',
            }}/>
            <Plant cx={cx} cy={cy} sizeM={2.4} icon={icon}
                   pxPerM={pxPerM} pxPerMY={pxPerMY}/>
          </React.Fragment>
        );
      })}
    </>
  );
}

function HangingBasket({ x, y, pxPerM, pxPerMY }) {
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(x / GW) * 100}% - ${2 * pxPerM}px)`,
      top:  `calc(${(y / GH) * 100}% - ${1 * pxPerMY}px)`,
      width: 4 * pxPerM, height: 4 * pxPerMY,
      pointerEvents: 'none',
    }}>
      <div style={{ width: '40%', margin: '0 auto', height: '20%',
                    background: 'linear-gradient(180deg, #5a3a18, #3a2510)',
                    borderRadius: '50% 50% 0 0' }}/>
      <div style={{ width: '90%', margin: '0 auto', height: '60%',
                    background: 'radial-gradient(circle at 40% 30%, #88b066, #4a7028)',
                    borderRadius: '0 0 60% 60%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    border: '0.5px solid rgba(40,60,20,0.5)' }}/>
    </div>
  );
}

function WateringCan({ x, y, pxPerM, pxPerMY }) {
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(x / GW) * 100}% - ${2 * pxPerM}px)`,
      top:  `calc(${(y / GH) * 100}% - ${1.5 * pxPerMY}px)`,
      width: 4 * pxPerM, height: 3 * pxPerMY,
      pointerEvents: 'none',
    }}>
      <div style={{ width: '70%', height: '100%',
                    background: 'linear-gradient(180deg, #6a8090 0%, #3a5060 100%)',
                    borderRadius: '20% 5% 5% 20%',
                    border: '1px solid #2a3a48',
                    boxShadow: '0 2px 3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)' }}/>
      <div style={{ position: 'absolute', top: '20%', left: '60%',
                    width: '50%', height: '60%',
                    background: 'linear-gradient(180deg, #6a8090 0%, #3a5060 100%)',
                    border: '1px solid #2a3a48',
                    borderRadius: '10% 50% 50% 10%' }}/>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PASTURE — grass with sheep, fence posts around perimeter, shade tree,
// water trough
// ────────────────────────────────────────────────────────────────────────

function Pasture({ faded, pxPerM, pxPerMY }) {
  const sheep = useMemoZD(() => {
    const r = rng(31);
    const out = [];
    for (let i = 0; i < 14; i++) {
      out.push({
        x: 12 + r() * 76, y: 12 + r() * 36,
        rotate: r() * 60 - 30,
        kind: r() > 0.85 ? 'black' : 'white',
      });
    }
    return out;
  }, []);

  return (
    <>
      <Layer opacity={faded ? 0.55 : 1}>
        <defs>
          <radialGradient id="pasture-grad" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0" stopColor="#c8de9a"/>
            <stop offset="1" stopColor="#a8c478"/>
          </radialGradient>
          <pattern id="grass-tufts" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="3" r="0.3" fill="#86a85e" opacity="0.5"/>
            <circle cx="6" cy="6" r="0.25" fill="#86a85e" opacity="0.5"/>
            <circle cx="5" cy="1" r="0.2" fill="#789c50" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width={GW} height={GH} fill="url(#pasture-grad)"/>
        <rect width={GW} height={GH} fill="url(#grass-tufts)"/>

        {/* Worn paths where sheep walk */}
        <path d="M 8 30 Q 30 28 50 32 Q 70 36 92 30"
              stroke="#a8884a" strokeWidth="1.6" fill="none" opacity="0.45"
              strokeLinecap="round"/>

        {/* Water trough at south */}
        <rect x="65" y="48" width="14" height="3.5"
              fill="#5a8db8" stroke="#2a3a48" strokeWidth="0.3" rx="0.5"/>
        <rect x="65.4" y="48.4" width="13.2" height="2.7"
              fill="#88b6d4"/>

        {/* Salt lick block */}
        <rect x="52" y="50" width="2" height="2" fill="#f0e8d8"
              stroke="#a8a090" strokeWidth="0.2"/>

        {/* Wooden fence around perimeter (post-and-rail) */}
        {/* Top rail */}
        {Array.from({ length: 24 }).map((_, i) => {
          const x = 6 + i * 4;
          return (
            <g key={`top-${i}`}>
              <rect x={x - 0.4} y="6" width="0.8" height="3"
                    fill="#6e4520"/>
            </g>
          );
        })}
        {/* Bottom posts */}
        {Array.from({ length: 24 }).map((_, i) => {
          const x = 6 + i * 4;
          return (
            <g key={`bot-${i}`}>
              <rect x={x - 0.4} y="53" width="0.8" height="3"
                    fill="#6e4520"/>
            </g>
          );
        })}
        {/* Rails */}
        <line x1="6" y1="7.5" x2="98" y2="7.5"
              stroke="#7a5028" strokeWidth="0.4"/>
        <line x1="6" y1="54.5" x2="98" y2="54.5"
              stroke="#7a5028" strokeWidth="0.4"/>
        {/* Left & right posts */}
        {[12, 22, 32, 42, 52].map((y, i) => (
          <g key={`lp-${i}`}>
            <rect x="3" y={y - 1.5} width="0.8" height="3" fill="#6e4520"/>
            <rect x="96" y={y - 1.5} width="0.8" height="3" fill="#6e4520"/>
          </g>
        ))}
        <line x1="3.4" y1="12" x2="3.4" y2="52"
              stroke="#7a5028" strokeWidth="0.4"/>
        <line x1="96.4" y1="12" x2="96.4" y2="52"
              stroke="#7a5028" strokeWidth="0.4"/>
      </Layer>

      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1,
                    pointerEvents: 'none' }}>
        {/* Shade tree */}
        <Canopy cx={20} cy={42} rM={5} pxPerM={pxPerM} pxPerMY={pxPerMY}
                tone="dark"/>
        <Canopy cx={86} cy={18} rM={4} pxPerM={pxPerM} pxPerMY={pxPerMY}
                tone="dark"/>

        {/* Sheep */}
        {sheep.map((s, i) => (
          <Sheep key={i} s={s} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}

        <CalloutCard x={50} y={4} text="PASTURE"
                     subtitle="14 sheep · rotational grazing"/>
        <Pill x={72} y={52} text="Trough" size={9} italic bg="#fef6e0"/>
        <Pill x={20} y={48} text="Shade Oak" size={9} italic bg="#fef6e0"/>
      </div>
    </>
  );
}

function Sheep({ s, pxPerM, pxPerMY }) {
  const w = 2.8 * pxPerM, h = 2 * pxPerMY;
  const body = s.kind === 'black' ? '#2a2520' : '#f4ede0';
  const head = s.kind === 'black' ? '#1a1510' : '#3a2820';
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(s.x / GW) * 100}% - ${w / 2}px)`,
      top:  `calc(${(s.y / GH) * 100}% - ${h / 2}px)`,
      width: w, height: h,
      transform: `rotate(${s.rotate}deg)`,
      pointerEvents: 'none',
    }}>
      {/* Wool body */}
      <div style={{
        position: 'absolute', inset: 0,
        background:
          `radial-gradient(circle at 30% 30%, ${body} 0%, ${body}cc 70%, ${body}aa 100%)`,
        borderRadius: '60% 70% 60% 70%',
        boxShadow: '0 1.5px 3px rgba(0,0,0,0.3)',
        border: '0.5px solid rgba(40,25,10,0.4)',
        // Fluffy bumps
        backgroundImage:
          `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.5) 8%, transparent 12%),
           radial-gradient(circle at 55% 30%, rgba(255,255,255,0.4) 8%, transparent 12%),
           radial-gradient(circle at 80% 50%, rgba(255,255,255,0.4) 7%, transparent 11%),
           radial-gradient(circle at 30% 70%, rgba(255,255,255,0.4) 7%, transparent 11%),
           radial-gradient(circle at 65% 75%, rgba(255,255,255,0.4) 7%, transparent 11%),
           radial-gradient(circle at 50% 50%, ${body} 0%, ${body} 100%)`,
      }}/>
      {/* Head */}
      <div style={{
        position: 'absolute', top: '20%', left: '-20%',
        width: '32%', height: '60%',
        background: head,
        borderRadius: '50% 40% 40% 50%',
        boxShadow: '0 1px 1.5px rgba(0,0,0,0.3)',
        border: '0.5px solid rgba(20,10,5,0.5)',
      }}/>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// GRAIN PLOT — rows of wheat, scarecrow, sheaves
// ────────────────────────────────────────────────────────────────────────

function Grain({ faded, pxPerM, pxPerMY }) {
  return (
    <>
      <Layer opacity={faded ? 0.55 : 1}>
        <defs>
          <pattern id="wheat-rows" width="100" height="4" patternUnits="userSpaceOnUse">
            <rect width="100" height="4" fill="#e4be5e"/>
            <rect y="1.8" width="100" height="0.3" fill="#a87838"/>
          </pattern>
        </defs>
        <rect width={GW} height={GH} fill="#d4a850"/>
        <rect width={GW} height={GH} fill="url(#wheat-rows)"/>

        {/* Wheat stalks — dense vertical strokes */}
        <g opacity="0.85">
          {Array.from({ length: 360 }).map((_, i) => {
            const r = rng(i);
            const x = 4 + r() * 92;
            const y = 4 + r() * 52;
            return (
              <line key={i} x1={x} y1={y} x2={x + (r() - 0.5) * 0.4} y2={y - 1.4 - r() * 0.6}
                    stroke="#a87838" strokeWidth="0.1" strokeLinecap="round"/>
            );
          })}
          {/* Seed heads */}
          {Array.from({ length: 360 }).map((_, i) => {
            const r = rng(i + 500);
            const x = 4 + r() * 92;
            const y = 4 + r() * 52;
            return (
              <ellipse key={i} cx={x + (r() - 0.5) * 0.4} cy={y - 1.6}
                       rx={0.25} ry={0.5}
                       fill="#f0d680" stroke="#a87838" strokeWidth="0.04"/>
            );
          })}
        </g>

        {/* Footpath through the middle */}
        <rect x="0" y="29" width="100" height="2" fill="#a08050" opacity="0.7"/>

        {/* Sheaves at corners */}
        <Sheaf cx={10} cy={50}/>
        <Sheaf cx={88} cy={50}/>
        <Sheaf cx={10} cy={10}/>
      </Layer>

      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1,
                    pointerEvents: 'none' }}>
        <Scarecrow x={50} y={20} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        <Scarecrow x={50} y={42} pxPerM={pxPerM} pxPerMY={pxPerMY}/>

        <CalloutCard x={50} y={5} text="GRAIN PLOT"
                     subtitle="winter wheat · 600 m²"/>
        <Pill x={50} y={30} text="threshing path" size={9} italic bg="#fef6e0"/>
        <Pill x={10} y={54} text="Sheaves" size={9} italic bg="#fef6e0"/>
      </div>
    </>
  );
}

function Sheaf({ cx, cy }) {
  // Bundle of wheat stalks tied with twine
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i - 6) * 0.12;
        return (
          <g key={i} transform={`rotate(${a * 30})`}>
            <line x1="0" y1="0" x2="0" y2="-3"
                  stroke="#c89848" strokeWidth="0.2" strokeLinecap="round"/>
            <ellipse cx="0" cy="-3.2" rx="0.3" ry="0.6"
                     fill="#f0d680" stroke="#a87838" strokeWidth="0.05"/>
          </g>
        );
      })}
      {/* Twine */}
      <ellipse cx="0" cy="-0.5" rx="1.2" ry="0.4"
               fill="none" stroke="#7a4a20" strokeWidth="0.2"/>
    </g>
  );
}

function Scarecrow({ x, y, pxPerM, pxPerMY }) {
  const w = 3.5 * pxPerM, h = 6 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(x / GW) * 100}% - ${w / 2}px)`,
      top:  `calc(${(y / GH) * 100}% - ${h / 2}px)`,
      width: w, height: h,
      pointerEvents: 'none',
    }}>
      {/* Vertical pole */}
      <div style={{
        position: 'absolute', left: '50%', top: '15%',
        width: 2, height: '85%', marginLeft: -1,
        background: 'linear-gradient(90deg, #5a3a18, #7a5028, #5a3a18)',
      }}/>
      {/* Horizontal arms */}
      <div style={{
        position: 'absolute', top: '32%', left: '5%', right: '5%',
        height: 2,
        background: 'linear-gradient(180deg, #7a5028, #5a3a18)',
      }}/>
      {/* Head — burlap sack */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        width: '50%', height: '25%', marginLeft: '-25%',
        background: 'radial-gradient(circle at 35% 35%, #d4a868, #a8784a)',
        borderRadius: '40% 40% 40% 40%',
        border: '1px solid #5a3a18',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }}>
        {/* Eyes */}
        <div style={{ position: 'absolute', top: '40%', left: '25%',
                      width: 2, height: 2, background: '#1a0e04',
                      borderRadius: '50%' }}/>
        <div style={{ position: 'absolute', top: '40%', right: '25%',
                      width: 2, height: 2, background: '#1a0e04',
                      borderRadius: '50%' }}/>
        {/* Stitched mouth */}
        <div style={{ position: 'absolute', top: '65%', left: '30%', right: '30%',
                      height: 1, borderTop: '1.5px dashed #1a0e04' }}/>
      </div>
      {/* Hat */}
      <div style={{ position: 'absolute', top: '-2%', left: '20%', right: '20%',
                    height: '10%',
                    background: 'linear-gradient(180deg, #6e4520, #4a2c10)',
                    borderRadius: '50% 50% 5% 5% / 90% 90% 5% 5%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }}/>
      {/* Shirt — straw poking from sleeves */}
      <div style={{ position: 'absolute', top: '30%', left: '15%', right: '15%',
                    height: '40%',
                    background: 'linear-gradient(180deg, #b85e3e, #8a4628)',
                    border: '1px solid #5a2c18',
                    borderRadius: '20% 20% 50% 50%' }}/>
      {/* Straw at hands */}
      {[
        { left: '0%', top: '30%' }, { right: '0%', top: '30%' },
      ].map((pos, i) => (
        <div key={i} style={{ position: 'absolute', ...pos,
                              width: '20%', height: '15%',
                              background: 'radial-gradient(circle, #d4a040, #a8782c)',
                              borderRadius: '50%',
                              boxShadow: '0 0 2px rgba(120,80,20,0.5)' }}/>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// HOUSE — floor plan with porch, garden bed
// ────────────────────────────────────────────────────────────────────────

function House({ faded, pxPerM, pxPerMY }) {
  return (
    <>
      <Layer opacity={faded ? 0.5 : 1}>
        <defs>
          <pattern id="lawn" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#bcd089"/>
            <circle cx="5" cy="6" r="0.3" fill="#94b06a" opacity="0.55"/>
            <circle cx="14" cy="14" r="0.35" fill="#94b06a" opacity="0.55"/>
          </pattern>
          <pattern id="floor" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#dac0a0"/>
            <rect width="6" height="0.3" fill="#a8845a"/>
            <rect width="0.3" height="6" fill="#a8845a"/>
          </pattern>
          <pattern id="roof-shingle" width="3" height="2.4" patternUnits="userSpaceOnUse">
            <rect width="3" height="2.4" fill="#6e3a1c"/>
            <path d="M 0 2 Q 1.5 1.6 3 2 L 3 2.4 L 0 2.4 Z" fill="#4a2410"/>
          </pattern>
        </defs>
        <rect width={GW} height={GH} fill="url(#lawn)"/>

        {/* House footprint */}
        <rect x="20" y="14" width="60" height="34" fill="url(#floor)"
              stroke="#3a2510" strokeWidth="0.6"/>

        {/* Interior wall divisions */}
        <line x1="50" y1="14" x2="50" y2="34"
              stroke="#3a2510" strokeWidth="0.4"/>
        <line x1="20" y1="34" x2="80" y2="34"
              stroke="#3a2510" strokeWidth="0.4"/>
        <line x1="65" y1="34" x2="65" y2="48"
              stroke="#3a2510" strokeWidth="0.4"/>

        {/* Doors (gaps in walls) */}
        <line x1="48" y1="34" x2="52" y2="34" stroke="url(#floor)" strokeWidth="0.5"/>
        <line x1="50" y1="24" x2="50" y2="28" stroke="url(#floor)" strokeWidth="0.5"/>
        <line x1="65" y1="40" x2="65" y2="44" stroke="url(#floor)" strokeWidth="0.5"/>

        {/* Roof outline (overhang as shadow) */}
        <rect x="18" y="12" width="64" height="38" fill="none"
              stroke="#3a2510" strokeWidth="0.3" strokeDasharray="0.5 0.4"/>

        {/* Front porch */}
        <rect x="34" y="48" width="20" height="6" fill="#a8835a"
              stroke="#3a2510" strokeWidth="0.4"/>
        <g>
          {[36, 42, 48, 52].map((x, i) => (
            <circle key={i} cx={x} cy="54" r="0.6" fill="#5a3a18"/>
          ))}
        </g>

        {/* Path from porch */}
        <rect x="40" y="54" width="8" height="4" fill="#a89a80"
              stroke="#7a6e5c" strokeWidth="0.2"/>

        {/* Front garden beds either side of porch */}
        <rect x="20" y="48" width="14" height="6"
              fill="#5a3a1c" stroke="#3a2510" strokeWidth="0.3"/>
        <rect x="54" y="48" width="26" height="6"
              fill="#5a3a1c" stroke="#3a2510" strokeWidth="0.3"/>
      </Layer>

      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1,
                    pointerEvents: 'none' }}>
        {/* Room labels */}
        <Pill x={35} y={24} text="Kitchen" size={11} italic bg="#fef6e0"/>
        <Pill x={65} y={24} text="Living" size={11} italic bg="#fef6e0"/>
        <Pill x={35} y={41} text="Bedroom" size={11} italic bg="#fef6e0"/>
        <Pill x={57} y={41} text="Bath" size={10} italic bg="#fef6e0"/>
        <Pill x={72} y={41} text="Office" size={11} italic bg="#fef6e0"/>

        {/* Furniture hints */}
        <Furn x={28} y={20} w={6} h={3}/>
        <Furn x={42} y={20} w={5} h={2}/>
        <Furn x={56} y={20} w={12} h={5}/>
        <Furn x={56} y={28} w={5} h={3}/>
        <Furn x={26} y={42} w={10} h={5}/>
        <Furn x={70} y={42} w={6} h={3}/>

        {/* Plants in garden beds */}
        {[22, 26, 30].map((x, i) => (
          <Plant key={i} cx={x} cy={51} sizeM={2.5} icon="assets/veg/calendula.svg"
                 pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}
        {[58, 62, 66, 70, 74, 78].map((x, i) => (
          <Plant key={i} cx={x} cy={51} sizeM={2.5}
                 icon={['assets/veg/rose.svg', 'assets/veg/sunflower.svg', 'assets/veg/chamomile.svg'][i % 3]}
                 pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}

        <CalloutCard x={50} y={4} text="HOUSE"
                     subtitle="3 rooms · porch · front beds"/>
      </div>
    </>
  );
}

function Furn({ x, y, w, h }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${(x / GW) * 100}%`, top: `${(y / GH) * 100}%`,
      width: `${(w / GW) * 100}%`, height: `${(h / GH) * 100}%`,
      background: 'rgba(110,75,30,0.45)',
      border: '1px solid rgba(60,40,15,0.6)',
      borderRadius: 1,
      pointerEvents: 'none',
    }}/>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATIO — flagstones, table & chairs, planters with herbs
// ────────────────────────────────────────────────────────────────────────

function Patio({ faded, pxPerM, pxPerMY }) {
  // Flagstones laid in an irregular pattern
  const stones = useMemoZD(() => {
    const out = [];
    const r = rng(11);
    // 6 cols × 4 rows of slightly irregular stones
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 8; col++) {
        const cx = 15 + col * 9 + (r() - 0.5) * 1.5;
        const cy = 16 + row * 7 + (r() - 0.5) * 1;
        out.push({
          cx, cy,
          w: 7.5 + (r() - 0.5) * 1,
          h: 5.5 + (r() - 0.5) * 0.7,
          shade: 195 + Math.floor(r() * 25),
          rot: (r() - 0.5) * 5,
        });
      }
    }
    return out;
  }, []);

  return (
    <>
      <Layer opacity={faded ? 0.5 : 1}>
        <defs>
          <pattern id="patio-grass" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#bcd089"/>
            <circle cx="5" cy="5" r="0.3" fill="#94b06a" opacity="0.5"/>
            <circle cx="14" cy="12" r="0.3" fill="#94b06a" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width={GW} height={GH} fill="url(#patio-grass)"/>
        {/* Flagstones */}
        {stones.map((s, i) => (
          <g key={i} transform={`translate(${s.cx} ${s.cy}) rotate(${s.rot})`}>
            <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h}
                  rx="0.4"
                  fill={`rgb(${s.shade}, ${s.shade - 5}, ${s.shade - 12})`}
                  stroke="#6a6258" strokeWidth="0.2"/>
            {/* Moss in cracks */}
            <line x1={-s.w / 2} y1={-s.h / 2} x2={s.w / 2} y2={-s.h / 2}
                  stroke="#7c9560" strokeWidth="0.15" opacity="0.5"/>
          </g>
        ))}
      </Layer>

      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.55 : 1,
                    pointerEvents: 'none' }}>
        {/* Round dining table */}
        <RoundTable cx={50} cy={32} rM={6} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        {/* 4 chairs around it */}
        {[0, 90, 180, 270].map((a, i) => {
          const rad = (a * Math.PI) / 180;
          return (
            <Chair key={i}
                   cx={50 + Math.cos(rad) * 9.5}
                   cy={32 + Math.sin(rad) * 9.5}
                   rotate={a + 90}
                   pxPerM={pxPerM} pxPerMY={pxPerMY}/>
          );
        })}

        {/* Pot planters at corners */}
        {[
          { cx: 18, cy: 14, icon: 'assets/veg/rose.svg' },
          { cx: 82, cy: 14, icon: 'assets/veg/sunflower.svg' },
          { cx: 18, cy: 50, icon: 'assets/veg/calendula.svg' },
          { cx: 82, cy: 50, icon: 'assets/veg/chamomile.svg' },
        ].map((p, i) => (
          <Planter key={i} cx={p.cx} cy={p.cy} icon={p.icon}
                   pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}

        {/* Lanterns */}
        {[28, 72].map((x, i) => (
          <Lantern key={i} cx={x} cy={50}
                   pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        ))}

        <CalloutCard x={50} y={5} text="PATIO"
                     subtitle="dining for 4 · flagstone"/>
        <Pill x={50} y={56} text="overhead string lights"
              size={9} italic bg="#fef6e0"/>
      </div>
    </>
  );
}

function RoundTable({ cx, cy, rM, pxPerM, pxPerMY }) {
  const w = rM * 2 * pxPerM, h = rM * 2 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / GW) * 100}% - ${w / 2}px)`,
      top:  `calc(${(cy / GH) * 100}% - ${h / 2}px)`,
      width: w, height: h,
      borderRadius: '50%',
      background:
        'radial-gradient(circle at 30% 30%, #c79866, #8a5430 70%)',
      border: '2px solid #3a2510',
      boxShadow: '0 4px 10px rgba(0,0,0,0.35), inset 0 -3px 6px rgba(40,20,5,0.4)',
      pointerEvents: 'none',
    }}>
      {/* Plates / cups hint */}
      {[0, 90, 180, 270].map((a, i) => {
        const rad = (a * Math.PI) / 180;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `calc(50% + ${Math.cos(rad) * 40}% - 6px)`,
            top:  `calc(50% + ${Math.sin(rad) * 40}% - 6px)`,
            width: 12, height: 12, borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #fff, #d8d0c0)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
          }}/>
        );
      })}
      {/* Centrepiece vase */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '16%', height: '16%', borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #7a8a3a, #4a5a18)',
      }}/>
    </div>
  );
}

function Chair({ cx, cy, rotate, pxPerM, pxPerMY }) {
  const w = 3 * pxPerM, h = 3 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / GW) * 100}% - ${w / 2}px)`,
      top:  `calc(${(cy / GH) * 100}% - ${h / 2}px)`,
      width: w, height: h,
      transform: `rotate(${rotate}deg)`,
      pointerEvents: 'none',
    }}>
      {/* Seat */}
      <div style={{ width: '100%', height: '70%',
                    background: 'linear-gradient(180deg, #6e4520 0%, #4a2c10 100%)',
                    border: '1.5px solid #2a1808', borderRadius: 2,
                    boxShadow: '0 2px 3px rgba(0,0,0,0.4)' }}/>
      {/* Back (top edge) */}
      <div style={{ width: '100%', height: '30%',
                    background: 'linear-gradient(180deg, #8a5028 0%, #5a3018 100%)',
                    border: '1.5px solid #2a1808', borderRadius: '4px 4px 1px 1px',
                    marginTop: -2 }}/>
    </div>
  );
}

function Planter({ cx, cy, icon, pxPerM, pxPerMY }) {
  const w = 4 * pxPerM, h = 4 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / GW) * 100}% - ${w / 2}px)`,
      top:  `calc(${(cy / GH) * 100}% - ${h / 2}px)`,
      width: w, height: h,
      pointerEvents: 'none',
    }}>
      {/* Square terracotta planter */}
      <div style={{ width: '100%', height: '100%',
                    background: 'radial-gradient(ellipse at 30% 30%, #d68a58, #a85a30 80%)',
                    border: '1.5px solid #6a3a18', borderRadius: 4,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.35), inset 0 -3px 4px rgba(60,20,5,0.4)' }}/>
      <img src={icon} alt="" draggable={false}
           style={{ position: 'absolute', top: '-30%', left: '50%',
                    transform: 'translateX(-50%)',
                    width: '120%', height: '80%', objectFit: 'contain',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}/>
    </div>
  );
}

function Lantern({ cx, cy, pxPerM, pxPerMY }) {
  const w = 2 * pxPerM, h = 3 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / GW) * 100}% - ${w / 2}px)`,
      top:  `calc(${(cy / GH) * 100}% - ${h / 2}px)`,
      width: w, height: h,
      pointerEvents: 'none',
    }}>
      <div style={{ width: 1.5, height: '60%', margin: '0 auto',
                    background: '#3a2510' }}/>
      <div style={{ width: '100%', height: '40%',
                    background: 'radial-gradient(circle at 50% 30%, #fae07a, #c08828)',
                    borderRadius: '50% 50% 30% 30%',
                    border: '1px solid #5a3a18',
                    boxShadow: '0 0 12px rgba(250,224,122,0.7)' }}/>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Export registry
// ────────────────────────────────────────────────────────────────────────

window.ZoneDetails = {
  orchard:    Orchard,
  berry:      BerryPatch,
  bees:       BeeHives,
  chickens:   ChickenCoop,
  compost:    Compost,
  greenhouse: Greenhouse,
  pasture:    Pasture,
  grain:      Grain,
  house:      House,
  patio:      Patio,
};

window.ZoneDetailTitles = {
  orchard:    'Orchard',
  berry:      'Berry Patch',
  bees:       'Bee Hives',
  chickens:   'Chicken Coop',
  compost:    'Compost Yard',
  greenhouse: 'Greenhouse',
  pasture:    'Pasture',
  grain:      'Grain Plot',
  house:      'House',
  patio:      'Patio',
};
