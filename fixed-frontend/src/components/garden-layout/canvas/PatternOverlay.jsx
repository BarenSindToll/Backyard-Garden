// ── Pattern overlays for GENERAL_STRUCTURES ───────────────────────────────────
export function PatternOverlay({ pattern, width, height, color, borderColor }) {
    if (!pattern || !width || !height || width < 10 || height < 10) return null;
    const W = Math.round(width);
    const H = Math.round(height);
    const style = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 };
    const bc = borderColor;

    if (pattern === 'rows') {
        const gap = Math.max(6, Math.min(14, H / 6));
        const lines = [];
        for (let y = gap; y < H - 2; y += gap)
            lines.push(<line key={y} x1={8} y1={y} x2={W - 8} y2={y} stroke={bc} strokeWidth={1.5} opacity={0.22} />);
        return <svg style={style} width={W} height={H}>{lines}</svg>;
    }

    if (pattern === 'crop-rows') {
        const gap = Math.max(8, Math.min(16, H / 5));
        const dotGap = Math.max(10, Math.min(18, W / 6));
        const elems = [];
        for (let y = gap; y < H - 2; y += gap) {
            elems.push(<line key={`l${y}`} x1={8} y1={y} x2={W - 8} y2={y} stroke={bc} strokeWidth={1} opacity={0.18} />);
            for (let x = dotGap / 2; x < W - 4; x += dotGap)
                elems.push(<circle key={`d${y}-${Math.round(x)}`} cx={x} cy={y} r={1.5} fill={bc} opacity={0.32} />);
        }
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    if (pattern === 'tree-dots') {
        const r = Math.min(W, H) * 0.09;
        const cols = Math.max(2, Math.floor(W / (r * 2.8)));
        const rows = Math.max(2, Math.floor(H / (r * 2.8)));
        const elems = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const ox = row % 2 === 1 ? (W / cols) * 0.5 : 0;
                const cx = (W / cols) * (col + 0.5) + ox;
                const cy = (H / rows) * (row + 0.5);
                if (cx > 4 && cx < W - 4 && cy > 4 && cy < H - 4) {
                    elems.push(<circle key={`f${row}-${col}`} cx={cx} cy={cy} r={Math.max(3, r)} fill={bc} opacity={0.22} />);
                    elems.push(<circle key={`o${row}-${col}`} cx={cx} cy={cy} r={Math.max(3, r)} fill="none" stroke={bc} strokeWidth={1} opacity={0.32} />);
                }
            }
        }
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    if (pattern === 'forest') {
        const gap = Math.max(12, Math.min(22, Math.min(W, H) / 4));
        const cols = Math.max(2, Math.floor(W / gap));
        const rows = Math.max(2, Math.floor(H / gap));
        const trees = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const ox = row % 2 === 1 ? gap * 0.5 : 0;
                const cx = (W / cols) * (col + 0.5) + ox;
                const cy = (H / rows) * (row + 0.5);
                if (cx > 4 && cx < W - 4 && cy > 4 && cy < H - 4) {
                    const th = gap * 0.7, tw = gap * 0.5;
                    trees.push(<polygon key={`${row}-${col}`}
                        points={`${cx},${cy - th * 0.6} ${cx - tw * 0.5},${cy + th * 0.4} ${cx + tw * 0.5},${cy + th * 0.4}`}
                        fill="#ffffff" opacity={0.28} />);
                }
            }
        }
        return <svg style={style} width={W} height={H}>{trees}</svg>;
    }

    if (pattern === 'greenhouse') {
        const panes = Math.max(3, Math.floor(W / 18));
        const pW = W / panes;
        const roofH = Math.min(20, H * 0.35);
        const elems = [
            <line key="ridg" x1={W * 0.5} y1={2} x2={W * 0.5} y2={roofH} stroke="#fff" strokeWidth={1.5} opacity={0.5} />,
            <line key="rl"   x1={0}       y1={roofH} x2={W * 0.5} y2={2} stroke="#fff" strokeWidth={1} opacity={0.4} />,
            <line key="rr"   x1={W}       y1={roofH} x2={W * 0.5} y2={2} stroke="#fff" strokeWidth={1} opacity={0.4} />,
        ];
        for (let i = 1; i < panes; i++)
            elems.push(<line key={`p${i}`} x1={pW * i} y1={roofH} x2={pW * i} y2={H - 4} stroke="#fff" strokeWidth={1} opacity={0.28} />);
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    if (pattern === 'fence') {
        const postGap = Math.max(12, Math.min(20, Math.min(W, H) / 5));
        const elems = [
            <line key="t" x1={4}     y1={8}     x2={W - 4} y2={8}     stroke="#fff" strokeWidth={1.5} opacity={0.38} />,
            <line key="b" x1={4}     y1={H - 8} x2={W - 4} y2={H - 8} stroke="#fff" strokeWidth={1.5} opacity={0.38} />,
            <line key="l" x1={8}     y1={4}     x2={8}     y2={H - 4} stroke="#fff" strokeWidth={1.5} opacity={0.38} />,
            <line key="r" x1={W - 8} y1={4}     x2={W - 8} y2={H - 4} stroke="#fff" strokeWidth={1.5} opacity={0.38} />,
        ];
        for (let x = 4; x <= W - 4; x += postGap) {
            elems.push(<circle key={`pt${Math.round(x)}`} cx={x} cy={8}     r={2} fill="#fff" opacity={0.42} />);
            elems.push(<circle key={`pb${Math.round(x)}`} cx={x} cy={H - 8} r={2} fill="#fff" opacity={0.42} />);
        }
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    if (pattern === 'road-line') {
        const seg = 12, gp = 8;
        const elems = [];
        if (W >= H) {
            const cy = H / 2;
            for (let x = seg; x < W - seg; x += seg + gp)
                elems.push(<line key={x} x1={x} y1={cy} x2={x + seg} y2={cy} stroke="#fff" strokeWidth={2} opacity={0.55} />);
        } else {
            const cx = W / 2;
            for (let y = seg; y < H - seg; y += seg + gp)
                elems.push(<line key={y} x1={cx} y1={y} x2={cx} y2={y + seg} stroke="#fff" strokeWidth={2} opacity={0.55} />);
        }
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    if (pattern === 'water-rings') {
        const cx = W / 2, cy = H / 2;
        const rings = Math.max(2, Math.min(5, Math.floor(Math.min(W, H) / 14)));
        return (
            <svg style={style} width={W} height={H}>
                {Array.from({ length: rings }, (_, i) => (
                    <ellipse key={i} cx={cx} cy={cy}
                        rx={(W * 0.42) * ((i + 1) / rings)} ry={(H * 0.42) * ((i + 1) / rings)}
                        fill="none" stroke="#fff" strokeWidth={1.2} opacity={0.35} />
                ))}
            </svg>
        );
    }

    if (pattern === 'radial') {
        const cx = W / 2, cy = H / 2;
        const spokes = 8;
        return (
            <svg style={style} width={W} height={H}>
                {Array.from({ length: spokes }, (_, i) => {
                    const a = (i / spokes) * Math.PI * 2;
                    return <line key={i} x1={cx} y1={cy}
                        x2={cx + Math.cos(a) * W * 0.44} y2={cy + Math.sin(a) * H * 0.44}
                        stroke="#fff" strokeWidth={1} opacity={0.28} />;
                })}
                <circle cx={cx} cy={cy} r={Math.min(W, H) * 0.1} fill="#fff" opacity={0.15} />
            </svg>
        );
    }

    if (pattern === 'honeycomb') {
        const hexR = Math.max(5, Math.min(12, Math.min(W, H) / 4));
        const hexH = hexR * Math.sqrt(3);
        const cols = Math.ceil(W / (hexR * 3)) + 1;
        const rows = Math.ceil(H / hexH) + 1;
        const elems = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const ox = row % 2 === 1 ? hexR * 1.5 : 0;
                const cx = hexR * 3 * col + hexR * 1.5 + ox;
                const cy = hexH * row + hexH * 0.5;
                const pts = Array.from({ length: 6 }, (_, i) => {
                    const a = (Math.PI / 3) * i - Math.PI / 6;
                    return `${cx + hexR * Math.cos(a)},${cy + hexR * Math.sin(a)}`;
                }).join(' ');
                elems.push(<polygon key={`${row}-${col}`} points={pts} fill="none" stroke="#fff" strokeWidth={1} opacity={0.28} />);
            }
        }
        return <svg style={style} width={W} height={H}>{elems}</svg>;
    }

    return null;
}
