import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Group, Image as KonvaImage, Rect, Transformer } from 'react-konva';

function StructureIcon({ x, y, icon, id, color, onDragEnd, onDoubleClick, setSelectedId, isSelected }) {
    const [img, setImg] = useState(null);
    const shapeRef = useRef();

    useEffect(() => {
        if (!icon) return;
        const image = new window.Image();
        image.src = icon;
        image.onload = () => setImg(image);
    }, [icon]);

    useEffect(() => {
        if (isSelected && shapeRef.current) {
            shapeRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    return (
        <Group
            id={id}
            ref={shapeRef}
            x={x}
            y={y}
            draggable
            onClick={() => setSelectedId(id)}
            onDragEnd={(e) => onDragEnd(id, e.target.x(), e.target.y())}
            onDblClick={() => onDoubleClick(id)}
        >
            {img ? (
                <KonvaImage image={img} width={50} height={50} />
            ) : (
                <Rect width={50} height={50} fill={color || '#999'} />
            )}
        </Group>
    );
}

export default function StructuresGrid({ onZoneCreate }) {

    const width = 800;
    const height = 500;
    const stageRef = useRef();
    const trRef = useRef();
    const [elements, setElements] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    const handleDrop = (e) => {
        e.preventDefault();
        stageRef.current.setPointersPositions(e);
        const pointer = stageRef.current.getPointerPosition();
        const raw = e.dataTransfer.getData('gardenStructure');
        if (!raw) return;

        try {
            const dropped = JSON.parse(raw);
            if (['bed', 'guild', 'greenhouse'].includes(dropped.type?.toLowerCase())) {
                if (onZoneCreate) onZoneCreate(dropped.type);
            }

            const newItem = {
                id: `${dropped.type}-${Date.now()}`,
                name: dropped.name,
                type: dropped.type,
                color: dropped.color,
                icon: dropped.icon,
                x: pointer.x,
                y: pointer.y,
            };
            setElements((prev) => [...prev, newItem]);
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    const handleDragEnd = (id, x, y) => {
        setElements((prev) =>
            prev.map((el) => (el.id === id ? { ...el, x, y } : el))
        );
    };

    const handleDoubleClick = (id) => {
        setElements((prev) => prev.filter((el) => el.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    useEffect(() => {
        if (trRef.current && selectedId) {
            const stage = stageRef.current;
            const selectedNode = stage.findOne(`#${selectedId}`);
            if (selectedNode) {
                trRef.current.nodes([selectedNode]);
                trRef.current.getLayer().batchDraw();
            }
        }
    }, [selectedId, elements]);

    return (
        <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{
                width,
                height,
                background: '#d1fae5',
                border: '2px dashed #4b5563',
                borderRadius: '8px',
                display: 'inline-block'
            }}
        >
            <Stage ref={stageRef} width={width} height={height}>
                <Layer>
                    <Rect width={width} height={height} fill="#d1fae5" />
                    {elements.map((el) => (
                        <StructureIcon
                            key={el.id}
                            {...el}
                            onDragEnd={handleDragEnd}
                            onDoubleClick={handleDoubleClick}
                            setSelectedId={setSelectedId}
                            isSelected={selectedId === el.id}
                        />
                    ))}
                    <Transformer
                        ref={trRef}
                        boundBoxFunc={(oldBox, newBox) =>
                            newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
                        }
                        rotateEnabled={false}
                    />
                </Layer>
            </Stage>
        </div>
    );
}
