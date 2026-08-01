// ── Neighbourhood bands ────────────────────────────────────────────────────────
const NB_BAND_STYLES = {
    forest: {
        background: 'linear-gradient(to right, #2d5a27 0%, #3d7035 40%, #4a8040 70%, #3d7035 100%)',
        label: 'Forest', tone: '#b8e8a0',
    },
    river: {
        background: 'linear-gradient(to right, #1a6080 0%, #2077a0 40%, #3090b8 70%, #2077a0 100%)',
        label: 'River', tone: '#a8d8f0',
    },
    road: {
        background: 'repeating-linear-gradient(90deg, #888 0px, #888 8px, #aaa 8px, #aaa 16px)',
        label: 'Road', tone: '#e8e8e8',
    },
    buildings: {
        background: 'linear-gradient(to right, #7a7060 0%, #907e6c 50%, #7a7060 100%)',
        label: 'Buildings', tone: '#ece0c0',
    },
    field: {
        background: 'repeating-linear-gradient(0deg, #c8b840 0px, #c8b840 4px, #d8cc58 4px, #d8cc58 8px)',
        label: 'Field', tone: '#f0e880',
    },
    orchard: {
        background: 'linear-gradient(to right, #5a8830 0%, #6a9e38 50%, #5a8830 100%)',
        label: 'Orchard', tone: '#c0e890',
    },
    pasture: {
        background: 'linear-gradient(to right, #78a840 0%, #90c050 50%, #78a840 100%)',
        label: 'Pasture', tone: '#d0f0a0',
    },
    hedge: {
        background: 'linear-gradient(to right, #486830 0%, #587840 50%, #486830 100%)',
        label: 'Hedge', tone: '#a8d080',
    },
    empty: {
        background: 'linear-gradient(to right, #c8c0a8 0%, #d8d0b8 50%, #c8c0a8 100%)',
        label: 'Empty', tone: '#e8e0c8',
    },
    unknown: null,
    other: {
        background: 'linear-gradient(to right, #a89880 0%, #b8a890 50%, #a89880 100%)',
        label: 'Other', tone: '#e0d0b8',
    },
};

const BAND_THICKNESS = 28;

export function NeighbourhoodBands({ neighbourhood, northDirection = 'top', canvasW, canvasH }) {
    if (!neighbourhood) return null;

    // Map cardinal directions to screen edges accounting for northDirection rotation
    const edgeMap = {
        top: { north: 'top', east: 'right', south: 'bottom', west: 'left' },
        right: { north: 'right', east: 'bottom', south: 'left', west: 'top' },
        bottom: { north: 'bottom', east: 'left', south: 'top', west: 'right' },
        left: { north: 'left', east: 'top', south: 'right', west: 'bottom' },
    }[northDirection] || { north: 'top', east: 'right', south: 'bottom', west: 'left' };

    const bands = [];
    for (const [cardinal, screenEdge] of Object.entries(edgeMap)) {
        const side = neighbourhood[cardinal];
        if (!side || side.type === 'unknown') continue;
        const style = NB_BAND_STYLES[side.type];
        if (!style) continue;

        const label = side.type === 'other' && side.label ? side.label : style.label;
        const isHoriz = screenEdge === 'top' || screenEdge === 'bottom';

        const bandStyle = {
            position: 'absolute',
            zIndex: 2,
            pointerEvents: 'none',
            background: style.background,
            boxShadow: screenEdge === 'top' ? 'inset 0 -4px 8px rgba(0,0,0,0.15)' :
                screenEdge === 'bottom' ? 'inset 0 4px 8px rgba(0,0,0,0.15)' :
                    screenEdge === 'left' ? 'inset -4px 0 8px rgba(0,0,0,0.15)' :
                        'inset 4px 0 8px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        };

        if (isHoriz) {
            Object.assign(bandStyle, {
                left: 0, right: 0,
                height: BAND_THICKNESS,
                [screenEdge]: 0,
            });
        } else {
            Object.assign(bandStyle, {
                top: 0, bottom: 0,
                width: BAND_THICKNESS,
                [screenEdge]: 0,
            });
        }

        bands.push(
            <div key={cardinal} style={bandStyle}>
                <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: style.tone, opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    transform: !isHoriz ? 'rotate(-90deg)' : undefined,
                    whiteSpace: 'nowrap',
                }}>
                    {label}
                </span>
            </div>
        );
    }

    return <>{bands}</>;
}
