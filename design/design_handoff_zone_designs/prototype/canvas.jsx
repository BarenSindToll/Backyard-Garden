// Garden canvas — permaculture homestead plan with zone tabs.
//
// • General view: simple watercolour zones, each with a cream pill label and
//   a hint of iconic content (orchard trees, berry bushes, bee hives, etc.).
//   Click any zone to open its detail tab.
// • Detail views (per zone):
//     - Vegetable Garden — wooden raised beds with companion-planted cells
//     - Apple Guild      — central tree ringed by companion plants with role
//                          callouts (pollinator, nitrogen fixer, etc.)
//     - Duck Pond        — pond with marginal/water plants ringed around it
//     - Orchard          — grid of fruit trees with labels
//     - Herb Garden      — herb clusters with labels

const { useMemo, useRef: useRefC, useState: useStateC, useEffect: useEffectC, useLayoutEffect } = React;

// ── Garden bounds (metres) ─────────────────────────────────────────────────
const GARDEN_W = 100;
const GARDEN_H = 60;

// ── Deterministic random ──────────────────────────────────────────────────
function seedRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0xffffff) / 0xffffff;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────

function ZoneLabel({ text, size = 'normal' }) {
  const fontMap = { small: 10, normal: 11.5, large: 13 };
  return (
    <div style={{
      display: 'inline-block',
      background: '#f7ecd0',
      border: '1px solid rgba(110,75,30,0.55)',
      padding: '3px 11px',
      borderRadius: 2,
      fontFamily: 'Newsreader, Georgia, serif',
      fontSize: fontMap[size],
      fontWeight: 600,
      color: '#3a2810',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      textAlign: 'center',
      boxShadow: '0 2px 4px rgba(80,50,20,0.18)',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      lineHeight: 1.2,
    }}>
      {text}
    </div>
  );
}

// Hand-drawn dashed leader line for callouts
function LeaderLine({ x1, y1, x2, y2, color = '#5a3a18' }) {
  return (
    <g opacity="0.7">
      <line x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth="0.18" strokeDasharray="0.6 0.4"
            strokeLinecap="round"/>
      <circle cx={x2} cy={y2} r="0.4" fill={color}/>
    </g>
  );
}

// Plant tile (cream disc with icon)
function PlantTile({ cx, cy, sizeM, icon, pxPerM, pxPerMY }) {
  const wPx = sizeM * pxPerM;
  const hPx = sizeM * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / GARDEN_W) * 100}% - ${wPx / 2}px)`,
      top:  `calc(${(cy / GARDEN_H) * 100}% - ${hPx / 2}px)`,
      width: wPx, height: hPx,
      pointerEvents: 'none',
    }}>
      <img src={icon} alt=""
           style={{ width: '100%', height: '100%', objectFit: 'contain',
                    filter: 'drop-shadow(0 1px 2px rgba(50,30,10,0.3))' }}
           draggable={false}/>
    </div>
  );
}

// Soft watercolour wash circle/rect background under a zone
function ZoneWash({ shape = 'rect', x, y, w, h, color, opacity = 0.45 }) {
  if (shape === 'blob') {
    return (
      <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2}
               fill={color} opacity={opacity}/>
    );
  }
  return (
    <rect x={x} y={y} width={w} height={h} rx="1.2" ry="1.2"
          fill={color} opacity={opacity}/>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// GENERAL VIEW — homestead-style zoned layout
// ─────────────────────────────────────────────────────────────────────────

const GENERAL_ZONES = [
  // Top
  { id: 'pasture',    label: 'Pasture',          x: 4,  y: 4,  w: 30, h: 16, color: '#cbe0a8', tab: 'pasture' },
  { id: 'bees',       label: 'Bee Hives',        x: 36, y: 4,  w: 14, h: 10, color: '#f0d68a', tab: 'bees' },
  { id: 'orchard',    label: 'Orchard',          x: 52, y: 4,  w: 32, h: 18, color: '#bcd9a4', tab: 'orchard' },
  { id: 'guild',      label: 'Apple Guild',      x: 86, y: 6,  w: 10, h: 14, color: '#d8e0b4', tab: 'guild' },

  // Middle
  { id: 'grain',      label: 'Grain Plot',       x: 4,  y: 22, w: 14, h: 14, color: '#e8d090', tab: 'grain' },
  { id: 'berry',      label: 'Berry Patch',      x: 20, y: 24, w: 16, h: 12, color: '#e8c4ce', tab: 'berry' },
  { id: 'veg',        label: 'Vegetable Garden', x: 38, y: 24, w: 32, h: 18, color: '#cfd9ad', tab: 'vegetable' },
  { id: 'chickens',   label: 'Chicken Coop',     x: 72, y: 24, w: 12, h: 12, color: '#dec8a8', tab: 'chickens' },

  // Bottom
  { id: 'herbs',      label: 'Herb Garden',      x: 4,  y: 38, w: 16, h: 18, color: '#c4dcc8', tab: 'herbs' },
  { id: 'house',      label: 'House',            x: 22, y: 44, w: 14, h: 14, color: '#d8b88c', tab: 'house' },
  { id: 'greenhouse', label: 'Greenhouse',       x: 38, y: 44, w: 10, h: 10, color: '#d4e8b8', tab: 'greenhouse' },
  { id: 'patio',      label: 'Patio',            x: 50, y: 44, w: 8,  h: 8,  color: '#d4d0c2', tab: 'patio' },
  { id: 'compost',    label: 'Compost',          x: 60, y: 44, w: 8,  h: 6,  color: '#b8967e', tab: 'compost' },
  { id: 'pond',       label: 'Duck Pond',        x: 70, y: 44, w: 16, h: 14, color: '#a4cee0', tab: 'pond', shape: 'blob' },
];

// Iconic decoration inside each zone — kept extremely simple so general
// view stays uncluttered ("just a hint")
function ZoneDecoration({ z, pxPerM, pxPerMY }) {
  const wPx = z.w * pxPerM;
  const hPx = z.h * pxPerMY;
  // Generate iconic content per zone kind
  switch (z.id) {
    case 'orchard': {
      // 6 small tree circles
      const positions = [];
      const cols = 4, rows = 2;
      const dx = (z.w - 4) / (cols - 1);
      const dy = (z.h - 7) / (rows - 1);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          positions.push({ x: z.x + 2 + c * dx, y: z.y + 4 + r * dy });
      return positions.map((p, i) => (
        <Tree key={i} cx={p.x} cy={p.y} r={1.8} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
      ));
    }
    case 'guild': {
      // Single central tree (preview of the guild)
      return <Tree cx={z.x + z.w / 2} cy={z.y + z.h / 2 + 1} r={3.5}
                   pxPerM={pxPerM} pxPerMY={pxPerMY}/>;
    }
    case 'bees': {
      // 3 small hive trapezoids
      return [0, 1, 2].map(i => (
        <BeeHive key={i}
                 cx={z.x + 3 + i * ((z.w - 6) / 2)}
                 cy={z.y + z.h / 2 + 1.5}
                 pxPerM={pxPerM} pxPerMY={pxPerMY}/>
      ));
    }
    case 'veg': {
      // 3 small bed rectangle hints
      return [0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          left:  `${((z.x + 2 + i * ((z.w - 4) / 3)) / GARDEN_W) * 100}%`,
          top:   `${((z.y + 3) / GARDEN_H) * 100}%`,
          width: `${(((z.w - 4) / 3 - 1) / GARDEN_W) * 100}%`,
          height:`${((z.h - 8) / GARDEN_H) * 100}%`,
          background: 'rgba(110,70,35,0.5)',
          border: '1px solid rgba(80,45,15,0.7)',
          borderRadius: 2,
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}/>
      ));
    }
    case 'berry': {
      // 4 small bush dots
      const positions = [];
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 3; c++)
          positions.push({ x: z.x + 3 + c * ((z.w - 6) / 2), y: z.y + 4 + r * 3 });
      return positions.map((p, i) => (
        <Bush key={i} cx={p.x} cy={p.y} pxPerM={pxPerM} pxPerMY={pxPerMY}
              color="#b87a8c"/>
      ));
    }
    case 'herbs': {
      // 5 herb tufts
      const rand = seedRand(91);
      const out = [];
      for (let i = 0; i < 6; i++) {
        out.push({
          x: z.x + 3 + rand() * (z.w - 6),
          y: z.y + 4 + rand() * (z.h - 8),
          color: ['#9bc298', '#b09cc4', '#9cbb9a', '#c0a4b8'][i % 4],
        });
      }
      return out.map((p, i) => (
        <Bush key={i} cx={p.x} cy={p.y} pxPerM={pxPerM} pxPerMY={pxPerMY}
              color={p.color} r={1.0}/>
      ));
    }
    case 'grain': {
      // Yellow hatched stripes
      return (
        <div style={{
          position: 'absolute',
          left:  `${((z.x + 1.5) / GARDEN_W) * 100}%`,
          top:   `${((z.y + 3) / GARDEN_H) * 100}%`,
          width: `${((z.w - 3) / GARDEN_W) * 100}%`,
          height:`${((z.h - 7) / GARDEN_H) * 100}%`,
          background: 'repeating-linear-gradient(90deg, #d4a040 0 3px, #b8842c 3px 5px, #d4a040 5px 8px)',
          borderRadius: 2,
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}/>
      );
    }
    case 'pasture': {
      // Just a few cattle/sheep dots
      const rand = seedRand(7);
      const out = [];
      for (let i = 0; i < 3; i++) {
        out.push({
          x: z.x + 4 + rand() * (z.w - 8),
          y: z.y + 5 + rand() * (z.h - 9),
        });
      }
      return out.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `calc(${(p.x / GARDEN_W) * 100}% - 6px)`,
          top:  `calc(${(p.y / GARDEN_H) * 100}% - 4px)`,
          width: 12, height: 8, borderRadius: '50% / 60%',
          background: '#f6efd9',
          border: '1px solid rgba(80,60,30,0.5)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}/>
      ));
    }
    case 'house': {
      return <StructureIcon icon="assets/structures/house.svg" z={z}
                            pxPerM={pxPerM} pxPerMY={pxPerMY}/>;
    }
    case 'greenhouse': {
      return <StructureIcon icon="assets/structures/greenhouse.svg" z={z}
                            pxPerM={pxPerM} pxPerMY={pxPerMY}/>;
    }
    case 'compost': {
      return <StructureIcon icon="assets/structures/compost.svg" z={z}
                            pxPerM={pxPerM} pxPerMY={pxPerMY}/>;
    }
    case 'pond': {
      // Water blob with stones edge
      return (
        <svg style={{ position: 'absolute',
                       left: `${(z.x / GARDEN_W) * 100}%`,
                       top:  `${(z.y / GARDEN_H) * 100}%`,
                       width: `${(z.w / GARDEN_W) * 100}%`,
                       height:`${(z.h / GARDEN_H) * 100}%`,
                       pointerEvents: 'none' }}
             viewBox={`0 0 ${z.w} ${z.h}`} preserveAspectRatio="none">
          <ellipse cx={z.w / 2} cy={z.h / 2 + 0.5} rx={z.w / 2 - 1.5} ry={z.h / 2 - 1.5}
                   fill="#5fa2c8" opacity="0.7"/>
          <ellipse cx={z.w / 2 - 1} cy={z.h / 2 - 0.7}
                   rx={(z.w / 2 - 1.5) * 0.5} ry={(z.h / 2 - 1.5) * 0.3}
                   fill="rgba(255,255,255,0.32)"/>
        </svg>
      );
    }
    case 'chickens': {
      // 3-4 small chicken oval dots
      const positions = [
        { x: z.x + 3, y: z.y + 4 },
        { x: z.x + 6, y: z.y + 7 },
        { x: z.x + 4, y: z.y + 9 },
        { x: z.x + 8, y: z.y + 5 },
      ];
      return positions.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `calc(${(p.x / GARDEN_W) * 100}% - 5px)`,
          top:  `calc(${(p.y / GARDEN_H) * 100}% - 4px)`,
          width: 10, height: 8, borderRadius: '50% / 60%',
          background: '#f3d878', border: '1px solid rgba(120,80,20,0.55)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}/>
      ));
    }
    case 'patio': {
      return (
        <div style={{
          position: 'absolute',
          left:  `${((z.x + 1) / GARDEN_W) * 100}%`,
          top:   `${((z.y + 1.5) / GARDEN_H) * 100}%`,
          width: `${((z.w - 2) / GARDEN_W) * 100}%`,
          height:`${((z.h - 5) / GARDEN_H) * 100}%`,
          background:
            'repeating-linear-gradient(45deg, #c2bcae 0 6px, #b0a89c 6px 8px),' +
            'repeating-linear-gradient(135deg, transparent 0 5px, rgba(0,0,0,0.07) 5px 6px)',
          borderRadius: 2,
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}/>
      );
    }
    default:
      return null;
  }
}

function Tree({ cx, cy, r = 2, pxPerM, pxPerMY, icon = 'assets/veg/apple.svg' }) {
  const wPx = r * 2 * pxPerM;
  const hPx = r * 2 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / GARDEN_W) * 100}% - ${wPx / 2}px)`,
      top:  `calc(${(cy / GARDEN_H) * 100}% - ${hPx / 2}px)`,
      width: wPx, height: hPx,
      borderRadius: '50%',
      background:
        'radial-gradient(circle at 35% 28%, #a8d088 0%, #6f9858 55%, #4d7637 100%)',
      border: '1px solid rgba(60,90,40,0.55)',
      boxShadow: '0 2px 4px rgba(40,60,30,0.28)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      {wPx > 20 && (
        <img src={icon} alt=""
             style={{ width: '55%', height: '55%', objectFit: 'contain',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}/>
      )}
    </div>
  );
}

function Bush({ cx, cy, pxPerM, pxPerMY, color = '#a8c490', r = 1.3 }) {
  const wPx = r * 2 * pxPerM;
  const hPx = r * 2 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / GARDEN_W) * 100}% - ${wPx / 2}px)`,
      top:  `calc(${(cy / GARDEN_H) * 100}% - ${hPx / 2}px)`,
      width: wPx, height: hPx,
      borderRadius: '50%',
      background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.4), ${color} 55%, rgba(0,0,0,0.15))`,
      border: `1px solid ${color}99`,
      boxShadow: '0 1.5px 3px rgba(40,40,20,0.2)',
      pointerEvents: 'none',
    }}/>
  );
}

function BeeHive({ cx, cy, pxPerM, pxPerMY }) {
  const wPx = 2.2 * pxPerM;
  const hPx = 2.6 * pxPerMY;
  return (
    <div style={{
      position: 'absolute',
      left: `calc(${(cx / GARDEN_W) * 100}% - ${wPx / 2}px)`,
      top:  `calc(${(cy / GARDEN_H) * 100}% - ${hPx / 2}px)`,
      width: wPx, height: hPx,
      background:
        'linear-gradient(180deg, #d49858 0%, #b07840 100%)',
      border: '1.5px solid #6e4520',
      borderRadius: '2px 2px 1px 1px',
      boxShadow: '0 2px 4px rgba(40,30,10,0.3)',
      pointerEvents: 'none',
      backgroundImage:
        'repeating-linear-gradient(180deg, transparent 0 ' + (hPx * 0.22) + 'px, rgba(70,40,15,0.5) ' + (hPx * 0.22) + 'px ' + (hPx * 0.24) + 'px)',
    }}/>
  );
}

function StructureIcon({ icon, z, pxPerM, pxPerMY }) {
  return (
    <img src={icon} alt=""
         style={{
           position: 'absolute',
           left:  `${((z.x + z.w * 0.2) / GARDEN_W) * 100}%`,
           top:   `${((z.y + z.h * 0.15) / GARDEN_H) * 100}%`,
           width: `${(z.w * 0.6 / GARDEN_W) * 100}%`,
           height:`${(z.h * 0.55 / GARDEN_H) * 100}%`,
           objectFit: 'contain',
           filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
           pointerEvents: 'none',
         }}
         draggable={false}/>
  );
}

// One zone tile on the general map
function ZoneTile({ z, onClick, pxPerM, pxPerMY }) {
  const [hovered, setHovered] = useStateC(false);
  const clickable = !!z.tab;
  return (
    <div
      onClick={() => clickable && onClick?.(z.tab)}
      onMouseEnter={() => clickable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left:  `${(z.x / GARDEN_W) * 100}%`,
        top:   `${(z.y / GARDEN_H) * 100}%`,
        width: `${(z.w / GARDEN_W) * 100}%`,
        height:`${(z.h / GARDEN_H) * 100}%`,
        cursor: clickable ? 'pointer' : 'default',
        borderRadius: z.shape === 'blob' ? '50%' : 3,
        background: z.color + 'aa',
        border: `1.2px ${clickable ? 'solid' : 'dashed'} rgba(120,80,30,${hovered ? 0.85 : 0.45})`,
        boxShadow: hovered
          ? `inset 0 0 0 1px rgba(255,255,255,0.4), 0 4px 14px rgba(80,50,20,0.18)`
          : 'inset 0 1px 0 rgba(255,255,255,0.35)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Zone label centred */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
      }}>
        <ZoneLabel text={z.label} size={z.w < 12 || z.h < 8 ? 'small' : 'normal'}/>
      </div>

      {/* Tap-hint badge */}
      {clickable && hovered && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          background: '#3a2810', color: '#f7ecd0',
          fontSize: 9, fontWeight: 600,
          padding: '2px 7px', borderRadius: 999,
          fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em',
          textTransform: 'uppercase', zIndex: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
        }}>Open</div>
      )}
    </div>
  );
}

function GeneralMap({ onOpenZone, faded }) {
  return (
    <>
      {/* Watercolour washes in SVG (under everything) */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                     pointerEvents: 'none' }}
           viewBox={`0 0 ${GARDEN_W} ${GARDEN_H}`} preserveAspectRatio="none">
        {GENERAL_ZONES.map(z => (
          <ZoneWash key={z.id} shape={z.shape || 'rect'}
                    x={z.x} y={z.y} w={z.w} h={z.h}
                    color={z.color} opacity={0.35}/>
        ))}
      </svg>

      {/* Iconic decoration */}
      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.4 : 1,
                     pointerEvents: 'none' }}>
        {GENERAL_ZONES.map(z => (
          <ZoneDecoration key={z.id} z={z} pxPerM={1} pxPerMY={1}/>
        ))}
      </div>

      {/* Zone tiles (clickable, with labels) */}
      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1 }}>
        {GENERAL_ZONES.map(z => (
          <ZoneTileWrap key={z.id} z={z} onClick={onOpenZone}/>
        ))}
      </div>
    </>
  );
}

// Wrap so we can read sizes once
function ZoneTileWrap({ z, onClick }) {
  return <ZoneTile z={z} onClick={onClick} pxPerM={1} pxPerMY={1}/>;
}

// ─────────────────────────────────────────────────────────────────────────
// APPLE GUILD DETAIL — central tree + ring of companion plants
// ─────────────────────────────────────────────────────────────────────────

const GUILD_COMPANIONS = [
  { angle: -90, role: 'Pollinator',           plant: 'Calendula',  icon: 'assets/veg/calendula.svg' },
  { angle: -30, role: 'Nitrogen Fixer',       plant: 'Clover',     icon: 'assets/veg/blueberry.svg' },
  { angle:  30, role: 'Nutrient Accumulator', plant: 'Sunflower',  icon: 'assets/veg/sunflower.svg' },
  { angle:  90, role: 'Weed Suppressor',      plant: 'Strawberry', icon: 'assets/veg/strawberry.svg' },
  { angle: 150, role: 'Pest Repeller',        plant: 'Garlic',     icon: 'assets/veg/garlic.svg' },
  { angle: 210, role: 'Soil Insulator',       plant: 'Chamomile',  icon: 'assets/veg/chamomile.svg' },
];

function GuildDetail({ faded }) {
  const cx = 50, cy = 28;
  const ringR = 18;
  const treeR = 8;
  const plantR = 3.5;

  return (
    <>
      {/* Background wash */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
           viewBox={`0 0 ${GARDEN_W} ${GARDEN_H}`} preserveAspectRatio="none">
        <circle cx={cx} cy={cy} r={ringR + 6} fill="#d4e0b8" opacity="0.45"/>
        <circle cx={cx} cy={cy} r={ringR + 1} fill="#bcd9a4" opacity="0.4"/>
        {/* Dashed ring suggesting the guild boundary */}
        <circle cx={cx} cy={cy} r={ringR} fill="none"
                stroke="#5a3a18" strokeWidth="0.18" strokeDasharray="0.8 0.6"
                opacity={faded ? 0.3 : 0.5}/>

        {/* Leader lines to each companion plant */}
        {GUILD_COMPANIONS.map((c, i) => {
          const a = (c.angle * Math.PI) / 180;
          const px = cx + Math.cos(a) * ringR;
          const py = cy + Math.sin(a) * ringR;
          // Label sits outside the ring
          const lx = cx + Math.cos(a) * (ringR + 7);
          const ly = cy + Math.sin(a) * (ringR + 7);
          return <LeaderLine key={i} x1={lx} y1={ly} x2={px} y2={py}/>;
        })}
      </svg>

      {/* Central tree */}
      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1 }}>
        <Tree cx={cx} cy={cy} r={treeR}
              pxPerM={1} pxPerMY={1} icon="assets/veg/apple.svg"/>
        <CentralTreeLabel cx={cx} cy={cy}/>

        {/* Companion plants */}
        {GUILD_COMPANIONS.map((c, i) => {
          const a = (c.angle * Math.PI) / 180;
          const px = cx + Math.cos(a) * ringR;
          const py = cy + Math.sin(a) * ringR;
          return (
            <React.Fragment key={i}>
              <Bush cx={px} cy={py} pxPerM={1} pxPerMY={1}
                    color="#9bbb88" r={plantR}/>
              <PlantTile cx={px} cy={py} sizeM={plantR * 1.4} icon={c.icon}
                         pxPerM={1} pxPerMY={1}/>
              <GuildCallout c={c} cx={cx} cy={cy} ringR={ringR}/>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}

function CentralTreeLabel({ cx, cy }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${(cx / GARDEN_W) * 100}%`,
      top:  `${((cy + 11) / GARDEN_H) * 100}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 10,
    }}>
      <ZoneLabel text="Apple Tree" size="normal"/>
    </div>
  );
}

function GuildCallout({ c, cx, cy, ringR }) {
  const a = (c.angle * Math.PI) / 180;
  const lx = cx + Math.cos(a) * (ringR + 7);
  const ly = cy + Math.sin(a) * (ringR + 7);
  return (
    <div style={{
      position: 'absolute',
      left: `${(lx / GARDEN_W) * 100}%`,
      top:  `${(ly / GARDEN_H) * 100}%`,
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif',
      pointerEvents: 'none',
      zIndex: 12,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#3a2810',
        letterSpacing: '0.04em', textTransform: 'uppercase',
        textShadow: '0 0 6px rgba(247,236,208,0.95), 0 0 4px rgba(247,236,208,0.95)',
        lineHeight: 1.15,
      }}>
        {c.role}
      </div>
      <div style={{
        fontSize: 10, color: '#5a4528',
        fontStyle: 'italic',
        textShadow: '0 0 6px rgba(247,236,208,0.95)',
        marginTop: 2,
      }}>
        {c.plant}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// DUCK POND DETAIL — pond + marginal/water plants in a ring
// ─────────────────────────────────────────────────────────────────────────

const POND_PLANTS = [
  { angle: -135, role: 'Marginal',       plant: 'Iris',         icon: 'assets/veg/sunflower.svg' },
  { angle:  -75, role: 'Floating',       plant: 'Water Lily',   icon: 'assets/veg/rose.svg' },
  { angle:  -15, role: 'Marginal',       plant: 'Cattail',      icon: 'assets/veg/corn.svg' },
  { angle:   45, role: 'Edge Cover',     plant: 'Calendula',    icon: 'assets/veg/calendula.svg' },
  { angle:  105, role: 'Insect Habitat', plant: 'Chamomile',    icon: 'assets/veg/chamomile.svg' },
  { angle:  165, role: 'Bog Plant',      plant: 'Borage',       icon: 'assets/veg/blueberry.svg' },
];

function PondDetail({ faded }) {
  const cx = 50, cy = 28;
  const pondRx = 18, pondRy = 12;
  const ringR = 22;
  return (
    <>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
           viewBox={`0 0 ${GARDEN_W} ${GARDEN_H}`} preserveAspectRatio="none">
        <defs>
          <radialGradient id="pond-grad" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#86bdda"/>
            <stop offset="0.6" stopColor="#4690b8"/>
            <stop offset="1" stopColor="#2a6a8c"/>
          </radialGradient>
        </defs>
        {/* Sand/mud margin */}
        <ellipse cx={cx} cy={cy} rx={pondRx + 2} ry={pondRy + 2}
                 fill="#c9a76a" opacity={faded ? 0.4 : 0.7}/>
        {/* Water */}
        <ellipse cx={cx} cy={cy} rx={pondRx} ry={pondRy}
                 fill="url(#pond-grad)" opacity={faded ? 0.6 : 1}/>
        {/* Water highlight */}
        <ellipse cx={cx - 4} cy={cy - 3} rx={pondRx * 0.55} ry={pondRy * 0.35}
                 fill="rgba(255,255,255,0.32)"/>

        {/* Stones around */}
        {Array.from({ length: 22 }).map((_, i) => {
          const a = (i / 22) * Math.PI * 2;
          const rand = (((i * 71) | 0) % 100) / 100;
          const r = 0.9 + rand * 0.5;
          const sx = cx + Math.cos(a) * (pondRx + 1.5) - r / 2;
          const sy = cy + Math.sin(a) * (pondRy + 1.5) - r / 2;
          return (
            <ellipse key={i}
                     cx={sx + r / 2} cy={sy + r / 2}
                     rx={r * 0.55} ry={r * 0.45}
                     fill="#aeaaa0" stroke="rgba(60,60,55,0.5)" strokeWidth="0.05"/>
          );
        })}

        {/* Leader lines to plants */}
        {POND_PLANTS.map((p, i) => {
          const a = (p.angle * Math.PI) / 180;
          const px = cx + Math.cos(a) * ringR;
          const py = cy + Math.sin(a) * (ringR * 0.75);  // squash vertical for ellipse layout
          const lx = cx + Math.cos(a) * (ringR + 6);
          const ly = cy + Math.sin(a) * (ringR * 0.75 + 6);
          return <LeaderLine key={i} x1={lx} y1={ly} x2={px} y2={py}/>;
        })}
      </svg>

      <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1 }}>
        {/* Central pond label */}
        <div style={{ position: 'absolute',
                       left: `${(cx / GARDEN_W) * 100}%`,
                       top:  `${(cy / GARDEN_H) * 100}%`,
                       transform: 'translate(-50%, -50%)',
                       zIndex: 4 }}>
          <ZoneLabel text="Duck Pond" size="large"/>
        </div>

        {/* Marginal plant ring */}
        {POND_PLANTS.map((p, i) => {
          const a = (p.angle * Math.PI) / 180;
          const px = cx + Math.cos(a) * ringR;
          const py = cy + Math.sin(a) * (ringR * 0.75);
          const lx = cx + Math.cos(a) * (ringR + 6);
          const ly = cy + Math.sin(a) * (ringR * 0.75 + 6);
          return (
            <React.Fragment key={i}>
              <Bush cx={px} cy={py} pxPerM={1} pxPerMY={1} color="#9cc28e" r={2}/>
              <PlantTile cx={px} cy={py} sizeM={2.8} icon={p.icon}
                         pxPerM={1} pxPerMY={1}/>
              <PondCallout p={p} lx={lx} ly={ly}/>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}

function PondCallout({ p, lx, ly }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${(lx / GARDEN_W) * 100}%`,
      top:  `${(ly / GARDEN_H) * 100}%`,
      transform: 'translate(-50%, -50%)',
      textAlign: 'center', fontFamily: 'Inter, sans-serif',
      pointerEvents: 'none', zIndex: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#3a2810',
                     letterSpacing: '0.04em', textTransform: 'uppercase',
                     textShadow: '0 0 6px rgba(247,236,208,0.95), 0 0 4px rgba(247,236,208,0.95)',
                     lineHeight: 1.15 }}>
        {p.plant}
      </div>
      <div style={{ fontSize: 9.5, color: '#5a4528', fontStyle: 'italic',
                     textShadow: '0 0 6px rgba(247,236,208,0.95)', marginTop: 2 }}>
        {p.role}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VEGETABLE GARDEN DETAIL — wooden raised beds with companion cells
// ─────────────────────────────────────────────────────────────────────────

const DENSITY_GRID = {
  wide:   { plantsPerM2: 0.6 },
  medium: { plantsPerM2: 1.2 },
  tight:  { plantsPerM2: 2.5 },
};

const VEG_BEDS = [
  {
    id: 'bed-companion', x: 14, y: 8, w: 36, h: 22, style: 'pine',
    cols: 3, rows: 3,
    cells: [
      { pair: { a: 'Strawberry', iconA: 'assets/veg/strawberry.svg', colorA: '#f08a70',
                b: 'Calendula',  iconB: 'assets/veg/calendula.svg',  colorB: '#f0c45a' },
        density: 'medium' },
      { pair: { a: 'Garlic',     iconA: 'assets/veg/garlic.svg',     colorA: '#e8d8b0',
                b: 'Chamomile',  iconB: 'assets/veg/chamomile.svg',  colorB: '#dde4b0' },
        density: 'tight' },
      { pair: { a: 'Raspberry',  iconA: 'assets/veg/raspberry.svg',  colorA: '#d870a0',
                b: 'Garlic',     iconB: 'assets/veg/garlic.svg',     colorB: '#e8d8b0' },
        density: 'medium' },
      { pair: { a: 'Blueberry',  iconA: 'assets/veg/blueberry.svg',  colorA: '#7eb0d4',
                b: 'Chamomile',  iconB: 'assets/veg/chamomile.svg',  colorB: '#dde4b0' },
        density: 'medium' },
      { pair: { a: 'Corn',       iconA: 'assets/veg/corn.svg',       colorA: '#f5d65a',
                b: 'Sunflower',  iconB: 'assets/veg/sunflower.svg',  colorB: '#f0c45a' },
        density: 'wide' },
      { pair: { a: 'Rose',       iconA: 'assets/veg/rose.svg',       colorA: '#e890a8',
                b: 'Garlic',     iconB: 'assets/veg/garlic.svg',     colorB: '#e8d8b0' },
        density: 'medium' },
      { pair: { a: 'Apple',      iconA: 'assets/veg/apple.svg',      colorA: '#e8806a',
                b: 'Calendula',  iconB: 'assets/veg/calendula.svg',  colorB: '#f0c45a' },
        density: 'wide' },
      { pair: { a: 'Plum',       iconA: 'assets/veg/plum.svg',       colorA: '#a07cb8',
                b: 'Chamomile',  iconB: 'assets/veg/chamomile.svg',  colorB: '#dde4b0' },
        density: 'wide' },
      { pair: { a: 'Strawberry', iconA: 'assets/veg/strawberry.svg', colorA: '#f08a70',
                b: 'Rose',       iconB: 'assets/veg/rose.svg',       colorB: '#e890a8' },
        density: 'medium' },
    ],
  },
  {
    id: 'bed-2', x: 55, y: 8, w: 30, h: 10, style: 'dark',
    cols: 3, rows: 1,
    cells: [
      { plant: 'Sunflower', icon: 'assets/veg/sunflower.svg', density: 'wide' },
      { plant: 'Calendula', icon: 'assets/veg/calendula.svg', density: 'medium' },
      { plant: 'Rose',      icon: 'assets/veg/rose.svg',      density: 'wide' },
    ],
  },
  {
    id: 'bed-3', x: 55, y: 22, w: 30, h: 8, style: 'dark',
    cols: 4, rows: 1,
    cells: [
      { plant: 'Garlic',     icon: 'assets/veg/garlic.svg',     density: 'tight' },
      { plant: 'Chamomile',  icon: 'assets/veg/chamomile.svg',  density: 'tight' },
      { plant: 'Strawberry', icon: 'assets/veg/strawberry.svg', density: 'medium' },
      { plant: 'Calendula',  icon: 'assets/veg/calendula.svg',  density: 'medium' },
    ],
  },
];

function CompanionPill({ a, b, colorA, colorB, fontSize, maxWidth }) {
  const charPx = fontSize * 0.6;
  const halfPx = (maxWidth || 200) / 2 - fontSize * 1.4;
  const maxChars = Math.max(2, Math.floor(halfPx / charPx));
  const fit = (s) => s.length <= maxChars ? s : s.slice(0, Math.max(2, maxChars - 1)) + '.';
  const aT = fit(a), bT = fit(b);
  const pad = `${Math.max(1.5, fontSize * 0.22)}px ${Math.max(3, fontSize * 0.45)}px`;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'stretch',
      borderRadius: 999, overflow: 'hidden',
      border: '1px solid #2a1a08',
      boxShadow: '0 1.5px 4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.32)',
      fontFamily: 'Inter, sans-serif', fontSize,
      fontWeight: 800, letterSpacing: '0.01em',
      textTransform: 'uppercase', whiteSpace: 'nowrap',
      pointerEvents: 'none', maxWidth,
    }}>
      <span style={{ padding: pad, background: colorA, color: '#231a08',
                      textShadow: '0 1px 0 rgba(255,255,255,0.35)' }}>{aT}</span>
      <span style={{ padding: `${Math.max(1.5, fontSize * 0.22)}px ${Math.max(2, fontSize * 0.25)}px`,
                      background: '#2a1a08', color: '#f5e6c4',
                      display: 'flex', alignItems: 'center', fontWeight: 600 }}>+</span>
      <span style={{ padding: pad, background: colorB, color: '#231a08',
                      textShadow: '0 1px 0 rgba(255,255,255,0.35)' }}>{bT}</span>
    </div>
  );
}

function WoodSign({ text, fontSize }) {
  return (
    <div style={{
      display: 'inline-block',
      padding: `${Math.max(2, fontSize * 0.25)}px ${Math.max(6, fontSize * 0.7)}px`,
      background: 'linear-gradient(180deg, #e3c08a 0%, #d4ad6c 35%, #c19655 65%, #a87a44 100%)',
      border: '1.5px solid #5e3d1c', borderRadius: 4,
      fontSize, fontWeight: 700, color: '#3a2510',
      fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em',
      textTransform: 'uppercase',
      textShadow: '0 1px 0 rgba(255,236,200,0.45)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,240,210,0.4), inset 0 -1.5px 0 rgba(60,30,10,0.35)',
      whiteSpace: 'nowrap', pointerEvents: 'none',
    }}>{text}</div>
  );
}

function CompanionCell({ cell, cellWM, cellHM, pxPerM, pxPerMY, seed }) {
  const cellWPx = cellWM * pxPerM, cellHPx = cellHM * pxPerMY;
  const p = cell.pair;
  const halfArea = (cellWM / 2) * cellHM;
  const target = Math.max(2, Math.round(halfArea * DENSITY_GRID[cell.density].plantsPerM2));
  const aspect = (cellWM / 2) / Math.max(0.1, cellHM);
  const cols = Math.max(1, Math.round(Math.sqrt(target * aspect)));
  const rows = Math.max(1, Math.ceil(target / cols));
  const halfWPx = cellWPx / 2;
  const dx = halfWPx / cols, dy = cellHPx / rows;
  const tileSize = Math.min(dx, dy) * 0.95;
  const make = (ox, icon) => {
    const out = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        out.push({ x: ox + dx * (c + 0.5), y: dy * (r + 0.5), icon });
    return out;
  };
  const all = [...make(0, p.iconA), ...make(halfWPx, p.iconB)];
  const pillFont = Math.max(6.5, Math.min(11, cellWPx * 0.075, cellHPx * 0.16));
  const pillMaxW = Math.max(40, cellWPx - 4);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%',
                   background: 'radial-gradient(ellipse at 30% 30%, #5a3a1f 0%, #3e2612 60%, #2a190a 100%)',
                   overflow: 'hidden' }}>
      {all.map((t, i) => (
        <img key={i} src={t.icon} alt=""
             style={{ position: 'absolute', left: t.x - tileSize / 2, top: t.y - tileSize / 2,
                      width: tileSize, height: tileSize, objectFit: 'contain',
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.45))' }}
             draggable={false}/>
      ))}
      <div style={{ position: 'absolute', top: '50%', left: '50%',
                     transform: 'translate(-50%, -50%)', zIndex: 2 }}>
        <CompanionPill a={p.a} b={p.b} colorA={p.colorA} colorB={p.colorB}
                       fontSize={pillFont} maxWidth={pillMaxW}/>
      </div>
    </div>
  );
}

function BedCell({ cell, cellWM, cellHM, pxPerM, pxPerMY, seed = 0 }) {
  if (cell.pair) {
    return <CompanionCell cell={cell} cellWM={cellWM} cellHM={cellHM}
                          pxPerM={pxPerM} pxPerMY={pxPerMY} seed={seed}/>;
  }
  const cellWPx = cellWM * pxPerM, cellHPx = cellHM * pxPerMY;
  const area = cellWM * cellHM;
  const target = Math.max(2, Math.round(area * DENSITY_GRID[cell.density].plantsPerM2));
  const aspect = cellWM / Math.max(0.1, cellHM);
  const cols = Math.max(1, Math.round(Math.sqrt(target * aspect)));
  const rows = Math.max(1, Math.ceil(target / cols));
  const dx = cellWPx / cols, dy = cellHPx / rows;
  const tileSize = Math.min(dx, dy) * 0.92;
  const positions = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      positions.push({ x: dx * (c + 0.5), y: dy * (r + 0.5) });
  const signFont = Math.max(7, Math.min(13, cellWPx * 0.075, cellHPx * 0.22));
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%',
                   background: 'radial-gradient(ellipse at 30% 30%, #5a3a1f 0%, #3e2612 60%, #2a190a 100%)',
                   overflow: 'hidden' }}>
      {positions.map((p, i) => (
        <img key={i} src={cell.icon} alt=""
             style={{ position: 'absolute', left: p.x - tileSize / 2, top: p.y - tileSize / 2,
                      width: tileSize, height: tileSize, objectFit: 'contain',
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.45))' }}
             draggable={false}/>
      ))}
      <div style={{ position: 'absolute', top: '50%', left: '50%',
                     transform: 'translate(-50%, -50%)', zIndex: 2 }}>
        <WoodSign text={cell.plant} fontSize={signFont}/>
      </div>
    </div>
  );
}

function RaisedBed({ bed, pxPerM, pxPerMY }) {
  const cellWM = bed.w / bed.cols, cellHM = bed.h / bed.rows;
  const widthPx = bed.w * pxPerM;
  const frame = Math.max(5, Math.min(11, widthPx * 0.022));
  const isPine = bed.style === 'pine';
  const wood = isPine
    ? { base: '#c79a64', grain: 'rgba(255,235,200,0.25)', seam: 'rgba(100,65,30,0.4)',
        topLight: 'rgba(255,240,210,0.4)', bottomShade: 'rgba(80,50,20,0.25)',
        gradient: 'linear-gradient(90deg, #b88858 0%, #d5a86e 25%, #c79a64 55%, #d8ad72 80%, #b18250 100%)',
        nail: 'radial-gradient(circle at 30% 30%, #e8d8b0, #8a6e40 60%, #4a3015 100%)' }
    : { base: '#6e3d1e', grain: 'rgba(255,210,170,0.08)', seam: 'rgba(20,10,3,0.45)',
        topLight: 'rgba(255,220,175,0.18)', bottomShade: 'rgba(0,0,0,0.18)',
        gradient: 'linear-gradient(90deg, #5e3318 0%, #8a5a30 30%, #6e3d1e 55%, #7a4a25 80%, #5e3318 100%)',
        nail: 'radial-gradient(circle at 30% 30%, #d8c8a0, #6e5028 60%, #2a1808 100%)' };
  const nailSz = Math.max(2.5, frame * 0.4);
  return (
    <div style={{
      position: 'absolute',
      left:  `${(bed.x / GARDEN_W) * 100}%`,
      top:   `${(bed.y / GARDEN_H) * 100}%`,
      width: `${(bed.w / GARDEN_W) * 100}%`,
      height:`${(bed.h / GARDEN_H) * 100}%`,
      background: wood.base, padding: frame, borderRadius: 4,
      boxShadow: '0 5px 18px rgba(40,25,10,0.4), inset 0 0 0 1px rgba(40,20,5,0.45)',
      boxSizing: 'border-box',
    }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 4,
                     backgroundImage:
                       `repeating-linear-gradient(90deg, transparent 0 8px, ${wood.grain} 8px 9px, transparent 9px 22px, ${wood.seam} 22px 23px),` +
                       `repeating-linear-gradient(0deg, transparent 0 26px, ${wood.seam} 26px 27px),` +
                       `linear-gradient(180deg, ${wood.topLight} 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 75%, ${wood.bottomShade} 100%),` +
                       wood.gradient,
                     backgroundBlendMode: 'overlay, normal, normal, normal',
                     pointerEvents: 'none' }}/>
      {[
        { top: frame * 0.35, left: frame * 0.35 },
        { top: frame * 0.35, right: frame * 0.35 },
        { bottom: frame * 0.35, left: frame * 0.35 },
        { bottom: frame * 0.35, right: frame * 0.35 },
      ].map((pos, i) => (
        <span key={i} style={{ position: 'absolute', ...pos,
                                width: nailSz, height: nailSz, borderRadius: '50%',
                                background: wood.nail,
                                boxShadow: '0 1px 1px rgba(0,0,0,0.45)',
                                pointerEvents: 'none', zIndex: 3 }}/>
      ))}
      <div style={{ position: 'relative', width: '100%', height: '100%',
                     background: '#2e1a0c',
                     display: 'grid',
                     gridTemplateColumns: `repeat(${bed.cols}, 1fr)`,
                     gridTemplateRows: `repeat(${bed.rows}, 1fr)`,
                     gap: Math.max(1, frame * 0.18),
                     boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.6)',
                     overflow: 'hidden', borderRadius: 1, zIndex: 2 }}>
        {bed.cells.map((c, i) =>
          <BedCell key={i} cell={c} seed={i + 1}
                   cellWM={cellWM} cellHM={cellHM}
                   pxPerM={pxPerM} pxPerMY={pxPerMY}/>
        )}
      </div>
    </div>
  );
}

function VegetableGardenDetail({ faded, pxPerM, pxPerMY }) {
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1 }}>
      {VEG_BEDS.map(b =>
        <RaisedBed key={b.id} bed={b} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ORCHARD DETAIL — grid of fruit trees with labels
// ─────────────────────────────────────────────────────────────────────────

const ORCHARD_TREES = [
  { cx: 18, cy: 12, r: 5, name: 'Apple',     icon: 'assets/veg/apple.svg' },
  { cx: 36, cy: 12, r: 5, name: 'Apple',     icon: 'assets/veg/apple.svg' },
  { cx: 54, cy: 12, r: 5, name: 'Plum',      icon: 'assets/veg/plum.svg' },
  { cx: 72, cy: 12, r: 5, name: 'Plum',      icon: 'assets/veg/plum.svg' },
  { cx: 90, cy: 12, r: 5, name: 'Walnut',    icon: 'assets/veg/walnut.svg' },

  { cx: 18, cy: 30, r: 5, name: 'Hazelnut',  icon: 'assets/veg/hazelnut.svg' },
  { cx: 36, cy: 30, r: 5, name: 'Hazelnut',  icon: 'assets/veg/hazelnut.svg' },
  { cx: 54, cy: 30, r: 5, name: 'Elderberry', icon: 'assets/veg/elderberry.svg' },
  { cx: 72, cy: 30, r: 5, name: 'Elderberry', icon: 'assets/veg/elderberry.svg' },
  { cx: 90, cy: 30, r: 5, name: 'Walnut',    icon: 'assets/veg/walnut.svg' },

  { cx: 18, cy: 48, r: 5, name: 'Apple',     icon: 'assets/veg/apple.svg' },
  { cx: 36, cy: 48, r: 5, name: 'Plum',      icon: 'assets/veg/plum.svg' },
  { cx: 54, cy: 48, r: 5, name: 'Apple',     icon: 'assets/veg/apple.svg' },
  { cx: 72, cy: 48, r: 5, name: 'Hazelnut',  icon: 'assets/veg/hazelnut.svg' },
  { cx: 90, cy: 48, r: 5, name: 'Plum',      icon: 'assets/veg/plum.svg' },
];

function OrchardDetail({ faded }) {
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1 }}>
      {ORCHARD_TREES.map((t, i) => (
        <React.Fragment key={i}>
          <Tree cx={t.cx} cy={t.cy} r={t.r} icon={t.icon}
                pxPerM={1} pxPerMY={1}/>
          <div style={{
            position: 'absolute',
            left: `${(t.cx / GARDEN_W) * 100}%`,
            top:  `${((t.cy + t.r + 2) / GARDEN_H) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}>
            <ZoneLabel text={t.name} size="small"/>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HERB GARDEN DETAIL — herb clusters with labels
// ─────────────────────────────────────────────────────────────────────────

const HERB_CLUSTERS = [
  { cx: 16, cy: 12, r: 5, name: 'Chamomile',  icon: 'assets/veg/chamomile.svg', tint: '#f0f1d2' },
  { cx: 36, cy: 12, r: 5, name: 'Calendula',  icon: 'assets/veg/calendula.svg', tint: '#fcecb8' },
  { cx: 56, cy: 12, r: 5, name: 'Garlic',     icon: 'assets/veg/garlic.svg',    tint: '#f6ecd6' },
  { cx: 76, cy: 12, r: 5, name: 'Rose',       icon: 'assets/veg/rose.svg',      tint: '#f9d4dc' },

  { cx: 16, cy: 30, r: 5, name: 'Strawberry', icon: 'assets/veg/strawberry.svg', tint: '#fde0e4' },
  { cx: 36, cy: 30, r: 5, name: 'Borage',     icon: 'assets/veg/blueberry.svg',  tint: '#dce5f0' },
  { cx: 56, cy: 30, r: 5, name: 'Calendula',  icon: 'assets/veg/calendula.svg',  tint: '#fcecb8' },
  { cx: 76, cy: 30, r: 5, name: 'Sunflower',  icon: 'assets/veg/sunflower.svg',  tint: '#fde9a4' },

  { cx: 16, cy: 48, r: 5, name: 'Chamomile',  icon: 'assets/veg/chamomile.svg', tint: '#f0f1d2' },
  { cx: 36, cy: 48, r: 5, name: 'Garlic',     icon: 'assets/veg/garlic.svg',    tint: '#f6ecd6' },
  { cx: 56, cy: 48, r: 5, name: 'Rose',       icon: 'assets/veg/rose.svg',      tint: '#f9d4dc' },
  { cx: 76, cy: 48, r: 5, name: 'Calendula',  icon: 'assets/veg/calendula.svg', tint: '#fcecb8' },
];

function HerbGardenDetail({ faded, pxPerM, pxPerMY }) {
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: faded ? 0.5 : 1 }}>
      {HERB_CLUSTERS.map((c, i) => (
        <HerbCluster key={i} c={c} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
      ))}
    </div>
  );
}

function HerbCluster({ c, pxPerM, pxPerMY }) {
  // Render a packed grid of icon tiles inside a circle area
  const grid = useMemo(() => {
    const arr = [];
    const r = c.r;
    const step = 1.4;
    for (let dx = -r; dx <= r; dx += step) {
      for (let dy = -r; dy <= r; dy += step) {
        if (dx * dx + dy * dy < r * r * 0.85) {
          arr.push({ x: c.cx + dx, y: c.cy + dy });
        }
      }
    }
    return arr;
  }, [c.cx, c.cy, c.r]);
  return (
    <>
      {/* Tinted blob */}
      <div style={{
        position: 'absolute',
        left: `calc(${(c.cx / GARDEN_W) * 100}% - ${c.r * pxPerM}px)`,
        top:  `calc(${(c.cy / GARDEN_H) * 100}% - ${c.r * pxPerMY}px)`,
        width:  c.r * 2 * pxPerM,
        height: c.r * 2 * pxPerMY,
        borderRadius: '50%',
        background: c.tint,
        opacity: 0.55,
        boxShadow: '0 3px 8px rgba(60,40,20,0.18)',
        pointerEvents: 'none',
      }}/>
      {grid.map((p, i) => (
        <PlantTile key={i} cx={p.x} cy={p.y} sizeM={1.1}
                   icon={c.icon} pxPerM={pxPerM} pxPerMY={pxPerMY}/>
      ))}
      <div style={{
        position: 'absolute',
        left: `${(c.cx / GARDEN_W) * 100}%`,
        top:  `${(c.cy / GARDEN_H) * 100}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 5, pointerEvents: 'none',
      }}>
        <ZoneLabel text={c.name} size="normal"/>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RULER BARS
// ─────────────────────────────────────────────────────────────────────────

function HorizontalRuler({ pxPerM }) {
  const minor = 5, major = 10;
  const totalPx = GARDEN_W * pxPerM;
  const ticks = [];
  for (let m = 0; m <= GARDEN_W; m += minor) {
    ticks.push({ m, isMajor: m % major === 0, x: m * pxPerM });
  }
  return (
    <svg width={totalPx} height={22} style={{ display: 'block', background: 'var(--ruler)' }}>
      {ticks.map(t => (
        <g key={t.m}>
          <line x1={t.x} y1={22} x2={t.x} y2={t.isMajor ? 10 : 16}
                stroke={t.isMajor ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.28)'}
                strokeWidth="1"/>
          {t.isMajor && t.m > 0 && t.m < GARDEN_W && (
            <text x={t.x + 3} y={9} fill="rgba(255,255,255,0.55)" fontSize="9"
                  fontFamily="JetBrains Mono, monospace">{t.m}m</text>
          )}
        </g>
      ))}
    </svg>
  );
}
function VerticalRuler({ pxPerM }) {
  const minor = 5, major = 10;
  const totalPx = GARDEN_H * pxPerM;
  const ticks = [];
  for (let m = 0; m <= GARDEN_H; m += minor) {
    ticks.push({ m, isMajor: m % major === 0, y: m * pxPerM });
  }
  return (
    <svg width={22} height={totalPx} style={{ display: 'block', background: 'var(--ruler)' }}>
      {ticks.map(t => (
        <g key={t.m}>
          <line x1={22} y1={t.y} x2={t.isMajor ? 10 : 16} y2={t.y}
                stroke={t.isMajor ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.28)'}
                strokeWidth="1"/>
          {t.isMajor && t.m > 0 && t.m < GARDEN_H && (
            <text x={3} y={t.y - 3} fill="rgba(255,255,255,0.55)" fontSize="9"
                  fontFamily="JetBrains Mono, monospace">{t.m}m</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN — GardenCanvas dispatcher
// ─────────────────────────────────────────────────────────────────────────

const ZONE_TABS = [
  { id: 'general',    label: 'General' },
  { id: 'vegetable',  label: 'Vegetable Garden' },
  { id: 'orchard',    label: 'Orchard' },
  { id: 'guild',      label: 'Apple Guild' },
  { id: 'berry',      label: 'Berry Patch' },
  { id: 'herbs',      label: 'Herb Garden' },
  { id: 'pond',       label: 'Duck Pond' },
  { id: 'bees',       label: 'Bee Hives' },
  { id: 'chickens',   label: 'Chicken Coop' },
  { id: 'pasture',    label: 'Pasture' },
  { id: 'grain',      label: 'Grain Plot' },
  { id: 'greenhouse', label: 'Greenhouse' },
  { id: 'compost',    label: 'Compost' },
  { id: 'house',      label: 'House' },
  { id: 'patio',      label: 'Patio' },
];

const DETAIL_TITLES = {
  vegetable: 'Vegetable Garden',
  orchard:   'Orchard',
  guild:     'Apple Guild',
  herbs:     'Herb Garden',
  pond:      'Duck Pond',
  berry:     'Berry Patch',
  bees:      'Bee Hives',
  chickens:  'Chicken Coop',
  pasture:   'Pasture',
  grain:     'Grain Plot',
  greenhouse:'Greenhouse',
  compost:   'Compost Yard',
  house:     'House',
  patio:     'Patio',
};

function GardenCanvas({ activeZone = 'general', onOpenZone,
                        proposedPlan = null, hoveredName, selectedNames, onHover,
                        showProposed = true, faded = false }) {
  const wrapRef = useRefC(null);
  const [pxPerM, setPxPerM] = useStateC(10);
  const [pxPerMY, setPxPerMY] = useStateC(10);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setPxPerM(e.contentRect.width / GARDEN_W);
        setPxPerMY(e.contentRect.height / GARDEN_H);
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const isGeneral = activeZone === 'general';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                  background: 'var(--ruler)' }}>
      {/* Top ruler */}
      <div style={{ display: 'flex', flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, background: 'var(--ruler)',
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       fontSize: 8, color: 'rgba(255,255,255,0.4)',
                       fontFamily: 'JetBrains Mono, monospace' }}>m</div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <HorizontalRuler pxPerM={pxPerM}/>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: 22, overflow: 'hidden', flexShrink: 0 }}>
          <VerticalRuler pxPerM={pxPerMY}/>
        </div>

        <div ref={wrapRef} style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          background: '#f0e3c0',
        }}>
          {/* Cream paper texture */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                         pointerEvents: 'none' }}
               viewBox={`0 0 ${GARDEN_W} ${GARDEN_H}`} preserveAspectRatio="none">
            <defs>
              <pattern id="paper-tex" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                <rect width="4" height="4" fill="#f0e3c0"/>
                <circle cx="0.5" cy="1.5" r="0.07" fill="rgba(140,110,50,0.16)"/>
                <circle cx="3"   cy="0.8" r="0.05" fill="rgba(140,110,50,0.12)"/>
                <circle cx="2.5" cy="3.5" r="0.06" fill="rgba(140,110,50,0.13)"/>
                <circle cx="1.8" cy="2.4" r="0.05" fill="rgba(140,110,50,0.11)"/>
              </pattern>
            </defs>
            <rect width={GARDEN_W} height={GARDEN_H} fill="url(#paper-tex)"
                  opacity={faded ? 0.55 : 1}/>
          </svg>

          {/* Detail title (only for the older detail views without a CalloutCard) */}
          {!isGeneral && !window.ZoneDetails?.[activeZone] && (
            <div style={{ position: 'absolute', top: 12, left: '50%',
                           transform: 'translateX(-50%)', zIndex: 30 }}>
              <ZoneLabel text={DETAIL_TITLES[activeZone] || ''} size="large"/>
            </div>
          )}

          {/* Compass */}
          <div style={{ position: 'absolute', top: 10, right: 10,
                         width: 36, height: 36, borderRadius: '50%',
                         background: 'rgba(255,248,225,0.85)', color: '#3a2810',
                         display: 'flex', flexDirection: 'column',
                         alignItems: 'center', justifyContent: 'center',
                         fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                         border: '1.5px solid rgba(90,60,25,0.6)',
                         boxShadow: '0 2px 6px rgba(80,50,20,0.25)',
                         opacity: faded ? 0.4 : 0.92, zIndex: 50 }}>
            <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>N</span>
            <span style={{ width: 0, height: 0,
                            borderLeft: '4px solid transparent',
                            borderRight: '4px solid transparent',
                            borderBottom: '7px solid #3a2810',
                            marginTop: 1 }}/>
          </div>

          {/* View content */}
          {isGeneral && <GeneralMap onOpenZone={onOpenZone} faded={faded}/>}
          {activeZone === 'vegetable' && <VegetableGardenDetail faded={faded} pxPerM={pxPerM} pxPerMY={pxPerMY}/>}
          {activeZone === 'guild'     && <GuildDetail faded={faded}/>}
          {activeZone === 'pond'      && <PondDetail faded={faded}/>}
          {activeZone === 'herbs'     && <HerbGardenDetail faded={faded} pxPerM={pxPerM} pxPerMY={pxPerMY}/>}
          {/* All other zones come from the window.ZoneDetails registry
              (zone-details.jsx) so this file stays focused. */}
          {window.ZoneDetails && window.ZoneDetails[activeZone] && (() => {
            const Comp = window.ZoneDetails[activeZone];
            return <Comp faded={faded} pxPerM={pxPerM} pxPerMY={pxPerMY}/>;
          })()}
        </div>
      </div>
    </div>
  );
}

window.GardenCanvas = GardenCanvas;
window.ZONE_TABS = ZONE_TABS;
window.GENERAL_ZONES = GENERAL_ZONES;
// Back-compat for existing app.jsx imports
window.PLAN_VARIANTS = [
  { label: 'Food Focus', elements: [] },
  { label: 'Biodiversity', elements: [] },
];
window.EXISTING_ELEMENTS = GENERAL_ZONES;
