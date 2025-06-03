import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Circle, Text, Image as KonvaImage, Group } from 'react-konva';

const RADIUS = 200; // overall guild radius
const CENTER_X = 300;
const CENTER_Y = 300;
const OUTER_CIRCLE_RADIUS = 40;
const CENTER_CIRCLE_RADIUS = 60;

const initialPositions = [
    [0, -RADIUS],
    [RADIUS * Math.sin(Math.PI / 4), -RADIUS * Math.cos(Math.PI / 4)],
    [RADIUS, 0],
    [RADIUS * Math.sin(Math.PI / 4), RADIUS * Math.cos(Math.PI / 4)],
    [0, RADIUS],
    [-RADIUS * Math.sin(Math.PI / 4), RADIUS * Math.cos(Math.PI / 4)],
    [-RADIUS, 0],
    [-RADIUS * Math.sin(Math.PI / 4), -RADIUS * Math.cos(Math.PI / 4)],
];

export default function GuildGrid() {
    const [drops, setDrops] = useState(Array(initialPositions.length + 1).fill(null));
    const stageRef = useRef();

    const handleDrop = (e) => {
        e.preventDefault();
        stageRef.current.setPointersPositions(e);
        const pos = stageRef.current.getPointerPosition();

        const raw = e.dataTransfer.getData('plant');
        if (!raw) return;

        try {
            const dropped = JSON.parse(raw);
            const newDrops = [...drops];

            const index = findClosestCircle(pos);
            if (index === -1) return;

            newDrops[index] = dropped;
            setDrops(newDrops);
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    const handleDoubleClick = (index) => {
        const newDrops = [...drops];
        newDrops[index] = null;
        setDrops(newDrops);
    };

    const findClosestCircle = (point) => {
        const all = [
            { x: CENTER_X, y: CENTER_Y, r: CENTER_CIRCLE_RADIUS },
            ...initialPositions.map(([dx, dy]) => ({
                x: CENTER_X + dx,
                y: CENTER_Y + dy,
                r: OUTER_CIRCLE_RADIUS,
            })),
        ];

        return all.findIndex(({ x, y, r }) => {
            const dist = Math.hypot(point.x - x, point.y - y);
            return dist <= r;
        });
    };

    const DropCircle = ({ drop, x, y, r, index }) => {
        const [img, setImg] = useState(null);

        useEffect(() => {
            if (!drop?.icon) return;

            const image = new window.Image();
            image.src = drop.icon;
            image.onload = () => {
                setImg(image);
            };
        }, [drop?.icon]);

        if (!drop || (drop.icon && !img)) return null;

        return (
            <Group
                x={x}
                y={y}
                offsetX={r}
                offsetY={r}
                onDblClick={() => handleDoubleClick(index)}
            >
                {img ? (
                    <KonvaImage image={img} width={r * 2} height={r * 2} />
                ) : (
                    <Circle radius={r} fill={drop.color || '#ccc'} />
                )}
                <Text
                    text={drop.name}
                    y={r * 2 + 4}
                    width={r * 2}
                    fontSize={12}
                    align="center"
                    fill="#333"
                />
            </Group>
        );
    };


    return (
        <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{ width: 600, height: 600, border: '1px solid #999', background: '#ecfccb' }}
        >
            <Stage width={600} height={600} ref={stageRef}>
                <Layer>
                    {/* Center circle */}
                    <Circle x={CENTER_X} y={CENTER_Y} radius={CENTER_CIRCLE_RADIUS} fill="#a7f3d0" stroke="#444" strokeWidth={2} />
                    <DropCircle
                        drop={drops[0]}
                        x={CENTER_X}
                        y={CENTER_Y}
                        r={CENTER_CIRCLE_RADIUS}
                        index={0}
                    />

                    {/* Outer circles */}
                    {initialPositions.map(([dx, dy], i) => (
                        <Group key={`guild-circle-${i}`}>
                            <Circle
                                x={CENTER_X + dx}
                                y={CENTER_Y + dy}
                                radius={OUTER_CIRCLE_RADIUS}
                                fill="#bbf7d0"
                                stroke="#555"
                                strokeWidth={1}
                            />
                            <DropCircle
                                drop={drops[i + 1]}
                                x={CENTER_X + dx}
                                y={CENTER_Y + dy}
                                r={OUTER_CIRCLE_RADIUS}
                                index={i + 1}
                            />
                        </Group>
                    ))}
                </Layer>
            </Stage>
        </div>
    );
}
