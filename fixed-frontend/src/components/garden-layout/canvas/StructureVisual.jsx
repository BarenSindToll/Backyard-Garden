// ── Per-structure SVG visual (replaces background rectangles) ─────────────────
export function StructureVisual({ sk, W, H, borderColor, hovered }) {
    const bc = borderColor || '#608040';
    const abs = { position: 'absolute', inset: 0, pointerEvents: 'none' };

    switch (sk) {
        case 'pond': {
            const cx = W / 2, cy = (Math.max(4, H - 20)) / 2, rx = W * 0.42, ry = (Math.max(4, H - 20)) * 0.42;
            const rings = Math.max(1, Math.min(3, Math.floor(Math.min(W, Math.max(4, H - 20)) / 24)));
            return <svg style={abs} width={W} height={H}>
                <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(40,110,200,0.18)" stroke={bc} strokeWidth={1.5} />
                {Array.from({ length: rings }, (_, i) => (
                    <ellipse key={i} cx={cx} cy={cy}
                        rx={rx * (i + 1) / rings * 0.78} ry={ry * (i + 1) / rings * 0.78}
                        fill="none" stroke={bc} strokeWidth={0.8} opacity={0.28} />
                ))}
            </svg>;
        }
        case 'guild': {
            const cx = W / 2, h0 = Math.max(4, H - 20), cy = h0 / 2, r = Math.min(W, h0) * 0.40;
            const compR = r * 0.76, n = 6;
            return <svg style={abs} width={W} height={H}>
                <circle cx={cx} cy={cy} r={r} fill="rgba(100,50,160,0.15)" stroke={bc} strokeWidth={1.5} strokeDasharray="5 3" />
                <circle cx={cx} cy={cy} r={r * 0.54} fill="rgba(100,50,160,0.12)" stroke={bc} strokeWidth={1} />
                <circle cx={cx} cy={cy} r={r * 0.14} fill={bc} opacity={0.42} />
                {Array.from({ length: n }, (_, i) => {
                    const a = (i / n) * Math.PI * 2;
                    return <circle key={i} cx={cx + Math.cos(a) * compR} cy={cy + Math.sin(a) * compR} r={Math.max(2.5, r * 0.08)} fill={bc} opacity={0.38} />;
                })}
            </svg>;
        }
        case 'house': {
            const h0 = Math.max(4, H - 20), bw = W * 0.74, bh = h0 * 0.50, bx = (W - bw) / 2, by = h0 * 0.34, rh = h0 * 0.34;
            return <svg style={abs} width={W} height={H}>
                <rect x={bx + 2} y={by + 2} width={bw} height={bh} rx={2} fill="rgba(0,0,0,0.05)" />
                <rect x={bx} y={by} width={bw} height={bh} rx={2} fill="rgba(195,160,110,0.24)" stroke={bc} strokeWidth={1.5} />
                <polygon points={`${W / 2},${by - rh} ${bx - 3},${by + 2} ${bx + bw + 3},${by + 2}`} fill="rgba(140,85,45,0.26)" stroke={bc} strokeWidth={1.5} />
                <rect x={W / 2 - 6} y={by + bh * 0.35} width={12} height={bh * 0.60} rx={2} fill="rgba(100,55,15,0.28)" stroke={bc} strokeWidth={1} />
                {[bx + bw * 0.18 - 6, bx + bw * 0.82 - 6].map((wx, i) => (
                    <rect key={i} x={wx} y={by + bh * 0.22} width={12} height={9} rx={1} fill="rgba(160,205,235,0.35)" stroke={bc} strokeWidth={0.8} />
                ))}
            </svg>;
        }
        case 'greenhouse': {
            const h0 = Math.max(4, H - 20), gw = W * 0.80, gh = h0 * 0.68, gx = (W - gw) / 2, gy = h0 * 0.16, rh = gh * 0.38, bodyY = gy + rh;
            const panes = Math.max(3, Math.floor(gw / 18));
            return <svg style={abs} width={W} height={H}>
                <rect x={gx} y={bodyY} width={gw} height={gh - rh} fill="rgba(130,205,155,0.18)" stroke={bc} strokeWidth={1.5} />
                <polygon points={`${W / 2},${gy} ${gx - 3},${bodyY} ${gx + gw + 3},${bodyY}`} fill="rgba(90,175,115,0.16)" stroke={bc} strokeWidth={1.5} />
                {Array.from({ length: panes - 1 }, (_, i) => (
                    <line key={i} x1={gx + gw * (i + 1) / panes} y1={bodyY} x2={gx + gw * (i + 1) / panes} y2={gy + gh - 2} stroke={bc} strokeWidth={0.8} opacity={0.28} />
                ))}
                <line x1={gx + 4} y1={bodyY + 4} x2={gx + 4} y2={gy + gh - 4} stroke="white" strokeWidth={2} opacity={0.14} />
            </svg>;
        }
        case 'compost': {
            const h0 = Math.max(4, H - 20), nb = 3, gap = 4, bh = h0 * 0.54, bw2 = Math.min(20, (W * 0.78 - (nb - 1) * gap) / nb);
            const sx = (W - (nb * bw2 + (nb - 1) * gap)) / 2, sy = h0 * 0.18;
            return <svg style={abs} width={W} height={H}>
                {Array.from({ length: nb }, (_, i) => (
                    <g key={i}>
                        <rect x={sx + i * (bw2 + gap)} y={sy + 6} width={bw2} height={bh} rx={2}
                            fill={i === 1 ? 'rgba(110,70,20,0.21)' : 'rgba(90,55,15,0.15)'} stroke={bc} strokeWidth={1.5} />
                        <rect x={sx + i * (bw2 + gap) - 1} y={sy} width={bw2 + 2} height={8} rx={1}
                            fill="rgba(70,35,5,0.22)" stroke={bc} strokeWidth={1} />
                    </g>
                ))}
            </svg>;
        }
        case 'beehives': {
            const h0 = Math.max(4, H - 20), nh = Math.max(2, Math.min(3, Math.floor(W / 28)));
            const bw2 = Math.min(20, (W * 0.78) / nh - 5), bh = Math.min(28, h0 * 0.60);
            const tw = nh * (bw2 + 5) - 5, sx = (W - tw) / 2, sy = h0 * 0.14;
            return <svg style={abs} width={W} height={H}>
                {Array.from({ length: nh }, (_, i) => (
                    <g key={i}>
                        <rect x={sx + i * (bw2 + 5)} y={sy + 8} width={bw2} height={bh} rx={2} fill="rgba(210,165,30,0.20)" stroke={bc} strokeWidth={1.5} />
                        <rect x={sx + i * (bw2 + 5) - 2} y={sy} width={bw2 + 4} height={10} rx={1} fill="rgba(155,105,10,0.24)" stroke={bc} strokeWidth={1} />
                        <rect x={sx + i * (bw2 + 5) + bw2 * 0.28} y={sy + 8 + bh - 4} width={bw2 * 0.44} height={3} rx={1} fill="rgba(70,35,5,0.32)" />
                        {[1, 2].map(j => (
                            <line key={j} x1={sx + i * (bw2 + 5) + 1} y1={sy + 8 + bh * j / 3} x2={sx + i * (bw2 + 5) + bw2 - 1} y2={sy + 8 + bh * j / 3} stroke={bc} strokeWidth={0.8} opacity={0.28} />
                        ))}
                    </g>
                ))}
            </svg>;
        }
        case 'coop': {
            const h0 = Math.max(4, H - 20), bw = W * 0.50, bh = h0 * 0.50, bx = (W - W * 0.74) / 2, by = h0 * 0.30, rh = h0 * 0.26;
            return <svg style={abs} width={W} height={H}>
                <rect x={bx + bw + 2} y={by} width={W * 0.24} height={bh} rx={2} fill="rgba(160,195,100,0.10)" stroke={bc} strokeWidth={1} strokeDasharray="4 3" />
                <rect x={bx + 2} y={by + 2} width={bw} height={bh} rx={2} fill="rgba(0,0,0,0.04)" />
                <rect x={bx} y={by} width={bw} height={bh} rx={2} fill="rgba(195,170,90,0.22)" stroke={bc} strokeWidth={1.5} />
                <polygon points={`${bx - 2},${by} ${bx + bw + 2},${by} ${bx + bw / 2},${by - rh}`} fill="rgba(130,95,30,0.25)" stroke={bc} strokeWidth={1.5} />
                <rect x={bx + bw * 0.20} y={by + bh * 0.40} width={bw * 0.22} height={bh * 0.50} rx={1} fill="rgba(90,55,15,0.28)" stroke={bc} strokeWidth={1} />
            </svg>;
        }
        case 'workshop': {
            const h0 = Math.max(4, H - 20), bw = W * 0.70, bh = h0 * 0.50, bx = (W - bw) / 2, by = h0 * 0.28, rh = h0 * 0.26;
            return <svg style={abs} width={W} height={H}>
                <rect x={bx + 2} y={by + 2} width={bw} height={bh} rx={2} fill="rgba(0,0,0,0.05)" />
                <rect x={bx} y={by} width={bw} height={bh} rx={2} fill="rgba(145,125,95,0.20)" stroke={bc} strokeWidth={1.5} />
                <polygon points={`${W / 2},${by - rh} ${bx - 3},${by + 2} ${bx + bw + 3},${by + 2}`} fill="rgba(95,75,45,0.24)" stroke={bc} strokeWidth={1.5} />
                <rect x={bx + bw * 0.62} y={by + bh * 0.22} width={bw * 0.24} height={bh * 0.52} rx={2} fill="rgba(80,55,15,0.22)" stroke={bc} strokeWidth={1} />
                {[0.45, 0.62].map((fy, i) => (
                    <line key={i} x1={bx + bw * 0.12} y1={by + bh * fy} x2={bx + bw * 0.48} y2={by + bh * fy} stroke={bc} strokeWidth={1} opacity={0.28} />
                ))}
            </svg>;
        }
        case 'outdoorKitchen': {
            const h0 = Math.max(4, H - 20), bw = W * 0.68, bh = h0 * 0.46, bx = (W - bw) / 2, by = h0 * 0.22;
            return <svg style={abs} width={W} height={H}>
                <rect x={bx} y={by} width={bw} height={bh} rx={3} fill="rgba(180,85,55,0.18)" stroke={bc} strokeWidth={1.5} />
                <rect x={bx - 3} y={by - 6} width={bw + 6} height={8} rx={2} fill="rgba(120,45,15,0.22)" stroke={bc} strokeWidth={1} />
                {[0.28, 0.72].map((fx, i) => (
                    <circle key={i} cx={bx + bw * fx} cy={by + bh * 0.52} r={Math.max(4, bw * 0.12)} fill="none" stroke={bc} strokeWidth={1.2} opacity={0.38} />
                ))}
            </svg>;
        }
        case 'orchard': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const cols = Math.max(2, Math.floor(W / 26)), rows = Math.max(2, Math.floor(h0 / 26));
            const tr = Math.max(3.5, Math.min(9, Math.min(W / cols, h0 / rows) * 0.26));
            const trees = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                const ox = r % 2 === 1 ? (W / cols) * 0.5 : 0;
                const tx = pr + (W - 2 * pr) / cols * (c + 0.5) + ox, ty = pr + (h0 - 2 * pr) / rows * (r + 0.5);
                if (tx > pr && tx < W - pr && ty > pr && ty < h0 - pr)
                    trees.push(<g key={`${r}-${c}`}><circle cx={tx} cy={ty} r={tr} fill={bc + '30'} /><circle cx={tx} cy={ty} r={tr * 0.5} fill={bc + '55'} /></g>);
            }
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={10} fill="rgba(70,140,30,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.70} />
                {trees}
            </svg>;
        }
        case 'berryPatch': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const cols = Math.max(3, Math.floor(W / 16)), rows = Math.max(2, Math.floor(h0 / 16));
            const dr = Math.max(2.5, Math.min(W / cols, h0 / rows) * 0.17);
            const dots = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                const dx = pr + (W - 2 * pr) / cols * (c + 0.5), dy = pr + (h0 - 2 * pr) / rows * (r + 0.5);
                if (dx > pr && dx < W - pr && dy > pr && dy < h0 - pr)
                    dots.push(<circle key={`${r}-${c}`} cx={dx} cy={dy} r={dr} fill={bc + '50'} />);
            }
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={14} fill="rgba(150,30,80,0.12)" stroke={bc} strokeWidth={1.5} strokeDasharray="5 3" opacity={0.70} />
                {dots}
            </svg>;
        }
        case 'vegetableGarden': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const bedH = Math.max(5, Math.min(13, (h0 - pr * 2) / Math.max(3, Math.floor(h0 / 16))));
            const nb = Math.max(2, Math.floor((h0 - pr * 2) / (bedH + 5)));
            const totalH = nb * (bedH + 5) - 5;
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={8} fill="rgba(90,150,40,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.70} />
                {Array.from({ length: nb }, (_, i) => {
                    const by = pr + (h0 - pr * 2 - totalH) / 2 + i * (bedH + 5);
                    return <rect key={i} x={pr + 5} y={by} width={W - pr * 2 - 10} height={bedH} rx={2} fill="rgba(45,90,25,0.22)" stroke={bc} strokeWidth={1} opacity={0.70} />;
                })}
            </svg>;
        }
        case 'stapleCrops': {
            const h0 = Math.max(4, H - 20), pr = 5, nl = Math.max(4, Math.floor(h0 / 9));
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={5} fill="rgba(170,130,20,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.70} />
                {Array.from({ length: nl }, (_, i) => {
                    const y = pr + (h0 - 2 * pr) * i / (nl - 1);
                    return <line key={i} x1={pr + 4} y1={y} x2={W - pr - 4} y2={y} stroke={bc} strokeWidth={i % 2 === 0 ? 1.4 : 0.7} opacity={i % 2 === 0 ? 0.42 : 0.22} />;
                })}
            </svg>;
        }
        case 'pasture': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const cols = Math.max(2, Math.floor(W / 22)), rows = Math.max(2, Math.floor(h0 / 22));
            const dots = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                if ((r + c) % 3 !== 0) dots.push(<circle key={`${r}-${c}`} cx={pr + (W - 2 * pr) / cols * (c + 0.5)} cy={pr + (h0 - 2 * pr) / rows * (r + 0.5)} r={1.8} fill={bc} opacity={0.28} />);
            }
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={12} fill="rgba(90,165,40,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.70} />
                {dots}
            </svg>;
        }
        case 'animalRun': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const cols = Math.max(3, Math.floor(W / 20)), rows = Math.max(2, Math.floor(h0 / 20));
            const dots = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                if ((r * cols + c) % 4 !== 0) dots.push(<circle key={`${r}-${c}`} cx={pr + (W - 2 * pr) / cols * (c + 0.5)} cy={pr + (h0 - 2 * pr) / rows * (r + 0.5)} r={1.5} fill={bc} opacity={0.26} />);
            }
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={5} fill="rgba(80,160,40,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.70} />
                {dots}
            </svg>;
        }
        case 'woodlot': {
            const h0 = Math.max(4, H - 20), pr = 5;
            const cols = Math.max(2, Math.floor(W / 22)), rows = Math.max(2, Math.floor(h0 / 22));
            const trees = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                const ox = r % 2 === 1 ? (W / cols) * 0.5 : 0;
                const tx = pr + (W - 2 * pr) / cols * (c + 0.5) + ox, ty = pr + (h0 - 2 * pr) / rows * (r + 0.5);
                const th = Math.min(14, (h0 - 2 * pr) / rows * 0.68), tw = th * 0.65;
                if (tx > pr && tx < W - pr)
                    trees.push(<polygon key={`${r}-${c}`} points={`${tx},${ty - th * 0.55} ${tx - tw / 2},${ty + th * 0.45} ${tx + tw / 2},${ty + th * 0.45}`} fill={bc} opacity={0.28} />);
            }
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={10} fill="rgba(25,70,25,0.13)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.70} />
                {trees}
            </svg>;
        }
        case 'carRoad': {
            const isH = W >= H;
            return <svg style={abs} width={W} height={H}>
                <rect x={0} y={0} width={W} height={H} rx={3} fill="rgba(145,135,115,0.16)" stroke={bc} strokeWidth={1.2} opacity={0.65} />
                {isH
                    ? Array.from({ length: Math.floor(W / 20) }, (_, i) => (
                        <line key={i} x1={12 + i * 20} y1={H / 2} x2={12 + i * 20 + 10} y2={H / 2} stroke={bc} strokeWidth={1.2} opacity={0.28} />
                    ))
                    : Array.from({ length: Math.floor(H / 20) }, (_, i) => (
                        <line key={i} x1={W / 2} y1={12 + i * 20} x2={W / 2} y2={12 + i * 20 + 10} stroke={bc} strokeWidth={1.2} opacity={0.28} />
                    ))
                }
            </svg>;
        }
        case 'kidsPlayground': {
            const h0 = Math.max(4, H - 20), y1 = h0 * 0.22, y2 = h0 * 0.70;
            return <svg style={abs} width={W} height={H}>
                <line x1={W * 0.22} y1={y1} x2={W * 0.5} y2={y2} stroke={bc} strokeWidth={2} opacity={0.38} />
                <line x1={W * 0.78} y1={y1} x2={W * 0.5} y2={y2} stroke={bc} strokeWidth={2} opacity={0.38} />
                <line x1={W * 0.22} y1={y1} x2={W * 0.78} y2={y1} stroke={bc} strokeWidth={2} opacity={0.38} />
                <line x1={W * 0.38} y1={y1} x2={W * 0.38} y2={y2 * 0.87} stroke={bc} strokeWidth={1.2} opacity={0.28} />
                <line x1={W * 0.62} y1={y1} x2={W * 0.62} y2={y2 * 0.87} stroke={bc} strokeWidth={1.2} opacity={0.28} />
                <rect x={W * 0.31} y={y2 * 0.83} width={W * 0.14} height={5} rx={1} fill={bc} opacity={0.30} />
                <rect x={W * 0.55} y={y2 * 0.83} width={W * 0.14} height={5} rx={1} fill={bc} opacity={0.30} />
            </svg>;
        }
        default: {
            const h0 = Math.max(4, H - 20);
            return <svg style={abs} width={W} height={H}>
                <rect x={2} y={2} width={W - 4} height={h0} rx={8} fill="rgba(80,120,50,0.12)" stroke={bc} strokeWidth={1.5} strokeDasharray="6 4" opacity={0.65} />
            </svg>;
        }
    }
}
