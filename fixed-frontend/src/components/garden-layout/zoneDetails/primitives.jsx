// Shared primitives for zone detail views.
// 100 m × 60 m virtual canvas — positions are in metres.

export const GW = 100;
export const GH = 60;

// Deterministic PRNG — same seed → same scatter every render
export function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return (s & 0xffffff) / 0xffffff;
    };
}

// Cream paper-tag label positioned at metre coordinates
export function Pill({
    x, y, text, size = 11, weight = 600, italic = false,
    bg = '#f7ecd0', color = '#3a2810', shadow = true,
    rotation = 0, transformOrigin = '50% 50%',
}) {
    return (
        <div style={{
            position: 'absolute',
            left: `${(x / GW) * 100}%`,
            top: `${(y / GH) * 100}%`,
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

// Zone name + subtitle callout card
export function CalloutCard({ x, y, text, subtitle }) {
    return (
        <div style={{
            position: 'absolute',
            left: `${(x / GW) * 100}%`,
            top: `${(y / GH) * 100}%`,
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
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3a2810', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {text}
            </div>
            {subtitle && (
                <div style={{ fontSize: 9.5, color: '#6a4f28', marginTop: 1.5, fontStyle: 'italic', fontFamily: 'Newsreader, Georgia, serif' }}>
                    {subtitle}
                </div>
            )}
        </div>
    );
}

// Plant icon at a metre coordinate, sized in metres
export function Plant({ cx, cy, sizeM, icon, pxPerM, pxPerMY, opacity = 1, rotate = 0 }) {
    const wPx = sizeM * pxPerM;
    const hPx = sizeM * pxPerMY;
    return (
        <img src={icon} alt="" draggable={false} style={{
            position: 'absolute',
            left: `calc(${(cx / GW) * 100}% - ${wPx / 2}px)`,
            top: `calc(${(cy / GH) * 100}% - ${hPx / 2}px)`,
            width: wPx, height: hPx, objectFit: 'contain',
            opacity,
            transform: `rotate(${rotate}deg)`,
            filter: 'drop-shadow(0 1.5px 2px rgba(50,30,10,0.32))',
            pointerEvents: 'none',
        }} />
    );
}

// Round leafy canopy (tree from above)
export function Canopy({ cx, cy, rM, pxPerM, pxPerMY, fruit = null, tone = 'medium' }) {
    const wPx = rM * 2 * pxPerM;
    const hPx = rM * 2 * pxPerMY;
    const palette = {
        light: ['#c0dba0', '#86b06a', '#5e8a48'],
        medium: ['#a8d088', '#6f9858', '#4d7637'],
        dark: ['#85b574', '#4d7637', '#2e4f1d'],
    }[tone] || ['#a8d088', '#6f9858', '#4d7637'];
    return (
        <div style={{
            position: 'absolute',
            left: `calc(${(cx / GW) * 100}% - ${wPx / 2}px)`,
            top: `calc(${(cy / GH) * 100}% - ${hPx / 2}px)`,
            width: wPx, height: hPx,
            borderRadius: '50%',
            background: `radial-gradient(circle at 32% 28%, ${palette[0]} 0%, ${palette[1]} 55%, ${palette[2]} 100%)`,
            border: '1.5px solid rgba(50,80,30,0.55)',
            boxShadow: '0 4px 10px rgba(40,60,30,0.32), inset 0 -3px 5px rgba(50,80,30,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
        }}>
            {fruit && wPx > 22 && (
                <img src={fruit} alt="" draggable={false}
                    style={{ width: '52%', height: '52%', objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.32))' }} />
            )}
        </div>
    );
}

// Full-viewport SVG underlay (100 × 60 viewBox)
export function Layer({ children, opacity = 1 }) {
    return (
        <svg viewBox={`0 0 ${GW} ${GH}`} preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }}>
            {children}
        </svg>
    );
}

// Imported plant icons (Vite resolves these to URLs at build time)
import appleIcon from '../../../assets/veg-icons/apple.svg';
import plumIcon from '../../../assets/veg-icons/plum.svg';
import walnutIcon from '../../../assets/veg-icons/walnut.svg';
import hazelnutIcon from '../../../assets/veg-icons/hazelnut.svg';
import calendulaIcon from '../../../assets/veg-icons/calendula.svg';
import chamomileIcon from '../../../assets/veg-icons/chamomile.svg';
import strawberryIcon from '../../../assets/veg-icons/strawberry.svg';
import garlicIcon from '../../../assets/veg-icons/garlic.svg';
import blueberryIcon from '../../../assets/veg-icons/blueberry.svg';
import sunflowerIcon from '../../../assets/veg-icons/sunflower.svg';
import raspberryIcon from '../../../assets/veg-icons/raspberry.svg';
import roseIcon from '../../../assets/veg-icons/rose.svg';

export const ICONS = {
    apple: appleIcon,
    plum: plumIcon,
    walnut: walnutIcon,
    hazelnut: hazelnutIcon,
    calendula: calendulaIcon,
    chamomile: chamomileIcon,
    strawberry: strawberryIcon,
    garlic: garlicIcon,
    blueberry: blueberryIcon,
    sunflower: sunflowerIcon,
    raspberry: raspberryIcon,
    rose: roseIcon,
};
