import { useState } from 'react';

// ── Compass rose ──────────────────────────────────────────────────────────────
const NORTH_DIRS = ['top', 'right', 'bottom', 'left'];
const NORTH_DEG = { top: 0, right: 90, bottom: 180, left: 270 };

export function CompassRose({ northDirection = 'top', onRotate }) {
    const deg = NORTH_DEG[northDirection] ?? 0;
    const canRotate = typeof onRotate === 'function';
    const [hover, setHover] = useState(false);

    const handleClick = () => {
        if (!canRotate) return;
        const idx = NORTH_DIRS.indexOf(northDirection);
        onRotate(NORTH_DIRS[(idx + 1) % 4]);
    };

    return (
        <div
            title={canRotate ? `North: ${northDirection} — click to rotate` : `North: ${northDirection}`}
            onClick={handleClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                position: 'absolute',
                bottom: 16,
                right: 18,
                zIndex: 90,
                userSelect: 'none',
                cursor: canRotate ? 'pointer' : 'default',
                borderRadius: '50%',
                background: 'rgba(252,247,235,0.93)',
                boxShadow: hover
                    ? '0 3px 12px rgba(0,0,0,0.18), 0 0 0 1.5px rgba(190,155,85,0.5)'
                    : '0 1px 6px rgba(0,0,0,0.13), 0 0 0 1px rgba(190,155,85,0.28)',
                transition: 'box-shadow 0.15s',
                backdropFilter: 'blur(3px)',
            }}
        >
            <svg width="46" height="46" viewBox="0 0 46 46" style={{ display: 'block' }}>
                {/* Background disc */}
                <circle cx="23" cy="23" r="21" fill="rgba(252,247,235,0)" />

                {/* Rotating needle group */}
                <g style={{ transformOrigin: '23px 23px', transform: `rotate(${deg}deg)`, transition: 'transform 0.3s ease' }}>
                    {/* North arm — red */}
                    <polygon points="23,4 19.5,23 23,19.5 26.5,23" fill="#c0442a" opacity="0.92" />
                    {/* South arm — muted */}
                    <polygon points="23,42 19.5,23 23,26.5 26.5,23" fill="#9a8e7e" opacity="0.85" />
                    {/* E/W cross-arms */}
                    <polygon points="42,23 23,19.5 26.5,23 23,26.5" fill="#c0a870" opacity="0.7" />
                    <polygon points="4,23 23,19.5 19.5,23 23,26.5"  fill="#c0a870" opacity="0.7" />
                    {/* Center cap */}
                    <circle cx="23" cy="23" r="3" fill="#faf5e8" stroke="rgba(190,155,85,0.6)" strokeWidth="1" />
                </g>

                {/* Cardinal labels — screen-fixed (don't rotate) */}
                <text x="23" y="3"  textAnchor="middle" dominantBaseline="auto"
                    style={{ font: 'bold 7.5px system-ui, sans-serif', fill: '#b83828' }}>N</text>
                <text x="23" y="46" textAnchor="middle" dominantBaseline="auto"
                    style={{ font: '6.5px system-ui, sans-serif', fill: '#7a6e62' }}>S</text>
                <text x="45" y="26" textAnchor="end" dominantBaseline="middle"
                    style={{ font: '6.5px system-ui, sans-serif', fill: '#7a6e62' }}>E</text>
                <text x="1"  y="26" textAnchor="start" dominantBaseline="middle"
                    style={{ font: '6.5px system-ui, sans-serif', fill: '#7a6e62' }}>W</text>
            </svg>
        </div>
    );
}
