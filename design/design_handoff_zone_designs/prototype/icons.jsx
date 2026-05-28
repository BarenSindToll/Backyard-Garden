// Monoline SVG icon set — replaces emojis throughout the design.
// All icons are 24×24 viewBox, stroke="currentColor", strokeWidth=1.5

const Ic = ({ d, children, size = 18, sw = 1.5, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  // Site
  Terrain: (p) => <Ic {...p}><path d="M3 18 L9 9 L13 14 L17 8 L21 18 Z" /></Ic>,
  Water:   (p) => <Ic {...p}><path d="M12 3 C7 9 5 13 5 16 a7 7 0 0 0 14 0 C19 13 17 9 12 3 Z" /></Ic>,
  Sun:     (p) => <Ic {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></Ic>,
  Soil:    (p) => <Ic {...p}><path d="M3 16 h18 M3 19 h18 M6 13 v-2 M10 13 v-3 M14 13 v-2 M18 13 v-3 M8 9 c0-1 1-2 2-2 M14 8 c0-1 1-2 2-2"/></Ic>,

  // Goals
  Harvest: (p) => <Ic {...p}><path d="M12 3 c2 3 4 5 4 8 a4 4 0 0 1-8 0 c0-3 2-5 4-8 Z M12 15 v6" /></Ic>,
  Calm:    (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12 a4 4 0 0 0 8 0"/></Ic>,
  Bloom:   (p) => <Ic {...p}><circle cx="12" cy="12" r="2.5"/><path d="M12 9.5 V5 M12 14.5 V19 M9.5 12 H5 M14.5 12 H19 M10 10 L7 7 M14 14 L17 17 M10 14 L7 17 M14 10 L17 7"/></Ic>,
  Wild:    (p) => <Ic {...p}><path d="M12 21 V13 M12 13 C9 11 6 11 5 8 C9 8 11 9 12 11 M12 11 C13 8 16 7 19 8 C18 11 15 11 12 13"/></Ic>,
  Balance: (p) => <Ic {...p}><path d="M12 4 v16 M4 8 h16 M6 8 l-2 5 a3 3 0 0 0 6 0 Z M18 8 l-2 5 a3 3 0 0 0 6 0 Z"/></Ic>,

  // Elements
  Zone:    (p) => <Ic {...p}><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" strokeDasharray="2 2"/></Ic>,
  Bed:     (p) => <Ic {...p}><rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M3 10 h18 M3 14 h18"/></Ic>,
  Tree:    (p) => <Ic {...p}><path d="M12 21 v-7 M12 14 c-4 0-6-3-6-6 C9 8 11 6 12 4 C13 6 15 8 18 8 C18 11 16 14 12 14 Z"/></Ic>,
  Strip:   (p) => <Ic {...p}><path d="M3 7 q3-3 6 0 t6 0 t6 0 M3 12 q3-3 6 0 t6 0 t6 0 M3 17 q3-3 6 0 t6 0 t6 0"/></Ic>,
  Pond:    (p) => <Ic {...p}><ellipse cx="12" cy="14" rx="8" ry="4"/><path d="M7 12 q5-3 10 0"/></Ic>,
  Compost: (p) => <Ic {...p}><path d="M5 21 V9 h14 V21 Z M5 13 h14 M5 17 h14 M9 9 V5 h6 V9"/></Ic>,
  Greenhouse: (p) => <Ic {...p}><path d="M4 21 V10 L12 4 L20 10 V21 Z M4 14 H20 M12 4 V21"/></Ic>,
  House:   (p) => <Ic {...p}><path d="M4 11 L12 4 L20 11 V21 H4 Z M10 21 V14 H14 V21"/></Ic>,
  Path:    (p) => <Ic {...p}><path d="M9 21 C8 16 14 14 13 9 C12 6 14 4 16 3 M15 21 H7"/></Ic>,

  // UI
  Sparkle: (p) => <Ic {...p}><path d="M12 3 L13.5 9 L19 10.5 L13.5 12 L12 18 L10.5 12 L5 10.5 L10.5 9 Z M18 16 L18.6 18 L20.5 18.6 L18.6 19.2 L18 21 L17.4 19.2 L15.5 18.6 L17.4 18 Z" fill="currentColor" stroke="none"/></Ic>,
  Check:   (p) => <Ic {...p}><path d="M4 12 L10 18 L20 6"/></Ic>,
  X:       (p) => <Ic {...p}><path d="M6 6 L18 18 M18 6 L6 18"/></Ic>,
  Arrow:   (p) => <Ic {...p}><path d="M5 12 H19 M13 6 L19 12 L13 18"/></Ic>,
  ArrowLeft: (p) => <Ic {...p}><path d="M19 12 H5 M11 6 L5 12 L11 18"/></Ic>,
  Plus:    (p) => <Ic {...p}><path d="M12 5 V19 M5 12 H19"/></Ic>,
  Eye:     (p) => <Ic {...p}><path d="M2 12 C5 6 8 4 12 4 C16 4 19 6 22 12 C19 18 16 20 12 20 C8 20 5 18 2 12 Z"/><circle cx="12" cy="12" r="3"/></Ic>,
  EyeOff:  (p) => <Ic {...p}><path d="M3 3 L21 21 M10.6 6.2 C11 6.1 11.5 6 12 6 C16 6 19 8 22 14 C21.3 15.3 20.5 16.4 19.7 17.3 M6.5 7.5 C4.7 8.9 3.2 10.9 2 14 C5 20 8 22 12 22 C13.7 22 15.3 21.6 16.7 20.9"/></Ic>,
  Refresh: (p) => <Ic {...p}><path d="M3 12 a9 9 0 0 1 15-6.7 L21 8 M21 3 V8 H16 M21 12 a9 9 0 0 1-15 6.7 L3 16 M3 21 V16 H8"/></Ic>,
  Pencil:  (p) => <Ic {...p}><path d="M16 3 L21 8 L8 21 H3 V16 Z M14 5 L19 10"/></Ic>,
  Compass: (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M15 9 L11 11 L9 15 L13 13 Z"/></Ic>,
  Layers:  (p) => <Ic {...p}><path d="M12 3 L21 8 L12 13 L3 8 Z M3 13 L12 18 L21 13 M3 17 L12 22 L21 17"/></Ic>,
  Clock:   (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7 V12 L15 14"/></Ic>,
  Leaf:    (p) => <Ic {...p}><path d="M5 19 C5 11 11 5 19 5 C19 13 13 19 5 19 Z M5 19 L13 11"/></Ic>,
  Info:    (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11 V17 M12 7 V8"/></Ic>,
  Alert:   (p) => <Ic {...p}><path d="M12 3 L22 20 H2 Z M12 10 V14 M12 17 V18"/></Ic>,
  Dot:     (p) => <Ic {...p} fill="currentColor"><circle cx="12" cy="12" r="3" stroke="none"/></Ic>,
  Save:    (p) => <Ic {...p}><path d="M5 3 H17 L21 7 V21 H3 V5 A2 2 0 0 1 5 3 Z M7 3 V9 H15 V3 M7 14 H17 V21 H7 Z"/></Ic>,
  Wind:    (p) => <Ic {...p}><path d="M3 8 H14 A3 3 0 1 0 11 5 M3 16 H17 A3 3 0 1 1 14 19 M3 12 H21"/></Ic>,
  Drop:    (p) => <Ic {...p}><path d="M12 3 C9 9 6 12 6 16 a6 6 0 0 0 12 0 C18 12 15 9 12 3 Z"/></Ic>,
};

window.Icons = Icons;
