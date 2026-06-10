import { useState } from 'react';
import { useLanguage } from '../../utils/languageContext';

export default function ZoneTabs({ zones, currentZone, setCurrentZone, setZones, onAddZone, onDeleteZone, onRenameZone, onResetZone }) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editName, setEditName] = useState('');
    const { t } = useLanguage();
    const g = t.garden;

    const handleBlur = () => {
        if (editName.trim() && editingIndex !== null) {
            const updated = [...zones];
            updated[editingIndex] = editName.trim();
            setZones(updated);
            if (onRenameZone) onRenameZone(updated);
        }
        setEditingIndex(null);
    };

    const confirmDelete = (index) => {
        const msg = g.deleteZoneConfirm.replace('{name}', zones[index]);
        if (window.confirm(msg)) onDeleteZone(index);
    };

    return (
        <div className="flex items-center gap-2 overflow-x-auto min-w-0">
            {/* ZONE label */}
            <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase',
                color: '#7c857a', flexShrink: 0, marginRight: 4,
            }}>
                Zone
            </span>

            {/* General tab */}
            <button
                onClick={() => setCurrentZone(-1)}
                title={g.overviewTitle}
                style={{
                    flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 9999, fontSize: 12,
                    background: currentZone === -1 ? '#3d6b34' : 'transparent',
                    color: currentZone === -1 ? '#f4f1e6' : '#485547',
                    border: `1px solid ${currentZone === -1 ? '#3d6b34' : '#d3cdb8'}`,
                    fontWeight: currentZone === -1 ? 500 : 400,
                    cursor: 'pointer', transition: 'all 0.12s',
                }}
            >
                {g.generalTab}
                {currentZone === -1 && onResetZone && (
                    <span
                        role="button"
                        onClick={e => { e.stopPropagation(); onResetZone(-1); }}
                        style={{ marginLeft: 2, color: 'rgba(244,241,230,0.6)', fontSize: 13, lineHeight: 1, cursor: 'pointer' }}
                        title="Reset General Map"
                    >
                        ↺
                    </span>
                )}
            </button>

            {/* Custom zone tabs */}
            {zones.map((zone, index) => (
                <div key={index} style={{ position: 'relative', flexShrink: 0 }}
                    className="group">
                    <button
                        onClick={() => setCurrentZone(index)}
                        onDoubleClick={() => { setEditingIndex(index); setEditName(zone); }}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', borderRadius: 9999, fontSize: 12,
                            background: currentZone === index ? '#3d6b34' : 'transparent',
                            color: currentZone === index ? '#f4f1e6' : '#485547',
                            border: `1px solid ${currentZone === index ? '#3d6b34' : '#d3cdb8'}`,
                            fontWeight: currentZone === index ? 500 : 400,
                            cursor: 'pointer', transition: 'all 0.12s',
                        }}
                    >
                        {editingIndex === index ? (
                            <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onBlur={handleBlur}
                                onKeyDown={e => e.key === 'Enter' && handleBlur()}
                                autoFocus
                                onClick={e => e.stopPropagation()}
                                style={{
                                    background: 'transparent', outline: 'none', border: 'none',
                                    width: 80, fontSize: 12, color: 'inherit', fontFamily: 'inherit',
                                }}
                            />
                        ) : zone}
                        {currentZone === index && onResetZone && editingIndex !== index && (
                            <span
                                role="button"
                                onClick={e => { e.stopPropagation(); onResetZone(index); }}
                                style={{ marginLeft: 2, color: 'rgba(244,241,230,0.6)', fontSize: 13, lineHeight: 1, cursor: 'pointer' }}
                                title={`Reset ${zone}`}
                            >
                                ↺
                            </span>
                        )}
                    </button>

                    {/* Delete × on hover */}
                    <button
                        className="absolute -right-1 -top-1 w-4 h-4 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                            background: '#fbf7ea', color: '#7c857a', border: '1px solid #d3cdb8',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)', zIndex: 10, cursor: 'pointer',
                        }}
                        onClick={e => { e.stopPropagation(); confirmDelete(index); }}
                        title={g.deleteZoneConfirm.replace('{name}', zone)}
                    >
                        ×
                    </button>
                </div>
            ))}

            {/* Zone tabs are created automatically when openable elements are placed on the General Map */}
        </div>
    );
}
