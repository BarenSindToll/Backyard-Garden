import React, { useEffect, useRef, useState } from 'react';
import { detectDetailType, DETAIL_REGISTRY } from './ZoneDetailRegistry';

const BUTTON_STYLE = {
    background: 'rgba(247,236,208,0.92)',
    border: '1px solid rgba(110,75,30,0.45)',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#3a2810',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    boxShadow: '0 1px 3px rgba(80,50,20,0.15)',
    whiteSpace: 'nowrap',
};

export default function ZoneDetailCanvas({ zoneName, onEditGrid, language }) {
    const containerRef = useRef(null);
    const [dims, setDims] = useState({ w: 800, h: 480 });

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) setDims({ w: width, h: height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const detailType = detectDetailType(zoneName || '');
    const DetailComponent = DETAIL_REGISTRY[detailType];

    const pxPerM = dims.w / 100;
    const pxPerMY = dims.h / 60;

    const editLabel = language === 'ro' ? 'Editare Grilă' : 'Edit Grid';

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                background: '#fbf7ea',
                borderRadius: 4,
            }}
        >
            {DetailComponent ? (
                <DetailComponent faded={false} pxPerM={pxPerM} pxPerMY={pxPerMY} />
            ) : (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#9a7c54', fontFamily: 'Newsreader, Georgia, serif',
                    fontSize: 15, fontStyle: 'italic',
                }}>
                    {language === 'ro' ? 'Nicio ilustrație disponibilă' : 'No illustration available'}
                </div>
            )}

            {/* Edit Grid toggle */}
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 50 }}>
                <button style={BUTTON_STYLE} onClick={onEditGrid}>
                    {editLabel}
                </button>
            </div>
        </div>
    );
}
