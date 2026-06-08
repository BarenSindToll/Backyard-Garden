// Shared map chrome — rulers, corner, canvas background.
// Used by GeneralCanvas, RaisedBedZoneCanvas, OrchardZoneCanvas.

export const RULER_SIZE = 30;

// Smallest "nice" tick interval (metres) so ticks stay ≥ targetPx apart
export function goodInterval(pxPerM, targetPx) {
    const candidates = [0.5, 1, 2, 5, 10, 20, 25, 50, 100];
    const minM = targetPx / pxPerM;
    return candidates.find(c => c >= minM) ?? 100;
}

// Returns background style object matching the General map canvas
export function mapCanvasBg(pxPerM) {
    const gridPx = goodInterval(pxPerM, 30) * pxPerM;
    return {
        background: 'radial-gradient(circle at 50% 40%, #f3ecd8 0%, #eadfc4 70%, #e3d6b6 100%)',
        backgroundImage: 'radial-gradient(circle, rgba(94,80,45,0.10) 1.5px, transparent 1.5px)',
        backgroundSize: `${gridPx}px ${gridPx}px`,
    };
}

export function HorizontalRuler({ widthM, pxPerM }) {
    const totalPx = widthM * pxPerM;
    const minor = goodInterval(pxPerM, 40);
    const major = goodInterval(pxPerM, 90);
    const marks = [];
    for (let m = 0; m <= widthM + 0.001; m = Math.round((m + minor) * 1e6) / 1e6) {
        const isMajor = Math.abs(m % major) < 0.001 || Math.abs(m % major - major) < 0.001;
        const x = m * pxPerM;
        marks.push(
            <g key={m}>
                <line x1={x} y1={RULER_SIZE} x2={x} y2={isMajor ? RULER_SIZE - 12 : RULER_SIZE - 6}
                    stroke={isMajor ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)'} strokeWidth={1} />
                {isMajor && m > 0 && (
                    <text x={x + 2} y={RULER_SIZE - 14} fill="rgba(255,255,255,0.6)" fontSize={9} fontFamily="monospace">
                        {Number.isInteger(m) ? m : m.toFixed(1)}m
                    </text>
                )}
            </g>
        );
    }
    return (
        <svg width={totalPx} height={RULER_SIZE} style={{ display: 'block', flexShrink: 0, background: '#1d3a20' }}>
            <line x1={0} y1={RULER_SIZE - 1} x2={totalPx} y2={RULER_SIZE - 1} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            {marks}
        </svg>
    );
}

export function VerticalRuler({ heightM, pxPerM }) {
    const totalPx = heightM * pxPerM;
    const minor = goodInterval(pxPerM, 40);
    const major = goodInterval(pxPerM, 90);
    const marks = [];
    for (let m = 0; m <= heightM + 0.001; m = Math.round((m + minor) * 1e6) / 1e6) {
        const isMajor = Math.abs(m % major) < 0.001 || Math.abs(m % major - major) < 0.001;
        const y = m * pxPerM;
        marks.push(
            <g key={m}>
                <line x1={RULER_SIZE} y1={y} x2={isMajor ? RULER_SIZE - 12 : RULER_SIZE - 6} y2={y}
                    stroke={isMajor ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)'} strokeWidth={1} />
                {isMajor && m > 0 && (
                    <text x={2} y={y - 2} fill="rgba(255,255,255,0.6)" fontSize={9} fontFamily="monospace">
                        {Number.isInteger(m) ? m : m.toFixed(1)}m
                    </text>
                )}
            </g>
        );
    }
    return (
        <svg width={RULER_SIZE} height={totalPx} style={{ display: 'block', flexShrink: 0, background: '#1d3a20' }}>
            <line x1={RULER_SIZE - 1} y1={0} x2={RULER_SIZE - 1} y2={totalPx} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            {marks}
        </svg>
    );
}

// Ruler layout wrapper — same structure as GeneralCanvas.
// children are rendered inside the beige canvas div.
export function RulerCanvas({ widthM, heightM, pxPerM, canvasW, canvasH, onClick, children }) {
    const w = canvasW ?? widthM * pxPerM;
    const h = canvasH ?? heightM * pxPerM;
    const bg = mapCanvasBg(pxPerM);
    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', margin: 'auto' }}>
            {/* Row 1: corner + horizontal ruler (sticky top) */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 25 }}>
                <div style={{ width: RULER_SIZE, height: RULER_SIZE, flexShrink: 0, background: '#1d3a20', position: 'sticky', left: 0, zIndex: 30 }} />
                <HorizontalRuler widthM={widthM} pxPerM={pxPerM} />
            </div>
            {/* Row 2: vertical ruler (sticky left) + canvas */}
            <div style={{ display: 'flex' }}>
                <div style={{ position: 'sticky', left: 0, zIndex: 25, flexShrink: 0 }}>
                    <VerticalRuler heightM={heightM} pxPerM={pxPerM} />
                </div>
                <div style={{ position: 'relative', width: w, height: h, flexShrink: 0, ...bg }} onClick={onClick}>
                    {children}
                </div>
            </div>
        </div>
    );
}
