import { useMemo, useState } from 'react';
import { STRUCTURES, GENERAL_STRUCTURES } from './gardenZoneConfig';
import { useLanguage } from '../../utils/languageContext';
import {
    Home, CookingPot, Sprout, Recycle, Waves, Hammer, Car, Bird, PawPrint,
    Network, TreePine, Cherry, Carrot, Hexagon, Smile, Wheat, Trees,
} from 'lucide-react';

const LUCIDE_ICONS = { Home, CookingPot, Sprout, Recycle, Waves, Hammer, Car, Bird, PawPrint, Network, TreePine, Cherry, Carrot, Hexagon, Smile, Wheat, Trees };

function LucideIcon({ name, size = 18, color = '#4a5a40' }) {
    const Icon = LUCIDE_ICONS[name];
    if (!Icon) return <span style={{ fontSize: size * 0.75 }}>🌱</span>;
    return <Icon size={size} color={color} strokeWidth={1.8} />;
}

const GUILD_LABEL_COLOR = {
    'Producer':             'bg-green-100 text-green-800',
    'Nitrogen fixer':       'bg-blue-100 text-blue-800',
    'Pollinator attractor': 'bg-yellow-100 text-yellow-800',
    'Dynamic accumulator':  'bg-purple-100 text-purple-800',
    'Pest repellent':       'bg-orange-100 text-orange-800',
    'Groundcover':          'bg-teal-100 text-teal-800',
};

function PlantInfo({ plant, g }) {
    return (
        <div style={{ margin: '4px 0 4px', padding: '8px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: 6, fontSize: 11, lineHeight: 1.6 }}>
            {plant.sunlight && <div style={{ color: '#485547' }}>☀ {plant.sunlight}</div>}
            {plant.spacingCm && <div style={{ color: '#485547' }}>↔ {plant.spacingCm} {g.cmSpacing}</div>}
            {plant.season && <div style={{ color: '#485547' }}>◷ {plant.season}</div>}
            {plant.companions?.length > 0 && (
                <div><span style={{ color: '#3d6b34', fontWeight: 600 }}>{g.goodWith}</span><span style={{ color: '#485547' }}>{plant.companions.slice(0, 4).join(', ')}{plant.companions.length > 4 ? '…' : ''}</span></div>
            )}
            {plant.antagonists?.length > 0 && (
                <div><span style={{ color: '#b55' , fontWeight: 600 }}>{g.avoidWith}</span><span style={{ color: '#485547' }}>{plant.antagonists.slice(0, 4).join(', ')}{plant.antagonists.length > 4 ? '…' : ''}</span></div>
            )}
        </div>
    );
}

export default function PlantSidebar({ setup = {}, allPlants = [], placedPlantNames = [], favoritePlants = [], onFavoritesChange, isGeneralView = false }) {
    const [tab, setTab] = useState(isGeneralView ? 'structures' : 'plants');
    const [search, setSearch] = useState('');
    const [zoneFilterOn, setZoneFilterOn] = useState(false);
    const [activeRole, setActiveRole] = useState(null);
    const [expandedPlant, setExpandedPlant] = useState(null);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const { t } = useLanguage();
    const g = t.garden;

    const zone = setup.hardinessZone || '7b';
    const focusAreas = setup.focusAreas || [];

    const toggleFavorite = (e, plantName) => {
        e.stopPropagation();
        const updated = favoritePlants.includes(plantName)
            ? favoritePlants.filter(f => f !== plantName)
            : [...favoritePlants, plantName];
        onFavoritesChange?.(updated);
    };

    const filteredPlants = useMemo(() => {
        let plants = [...allPlants];
        if (showFavoritesOnly) plants = plants.filter(p => favoritePlants.includes(p.name));
        if (zoneFilterOn) {
            plants = plants.filter(p => {
                const zt = p.planting?.zoneTimes;
                if (!zt || Object.keys(zt).length === 0) return true;
                return zt[zone] !== undefined && zt[zone] !== null;
            });
        }
        const roleToFilter = activeRole || (focusAreas.length === 1 ? focusAreas[0] : null);
        if (roleToFilter) plants = plants.filter(p => p.guildRole?.includes(roleToFilter));
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            plants = plants.filter(p => p.name.toLowerCase().includes(q));
        }
        if (focusAreas.length > 0 && !activeRole) {
            plants.sort((a, b) => {
                const aMatch = a.guildRole?.some(r => focusAreas.includes(r)) ? 0 : 1;
                const bMatch = b.guildRole?.some(r => focusAreas.includes(r)) ? 0 : 1;
                return aMatch - bMatch || a.name.localeCompare(b.name);
            });
        }
        return plants;
    }, [allPlants, search, zoneFilterOn, zone, focusAreas, activeRole, showFavoritesOnly, favoritePlants]);

    return (
        <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            background: '#fbf7ea', overflow: 'hidden',
        }}>
            {/* ── Header ── */}
            <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #e8e2cc', flexShrink: 0 }}>
                {/* Tab row */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    {!isGeneralView && (
                        <button
                            onClick={() => setTab('plants')}
                            style={{
                                padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer',
                                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                                letterSpacing: '0.15em', textTransform: 'uppercase',
                                color: tab === 'plants' ? '#3d6b34' : '#7c857a',
                                borderBottom: tab === 'plants' ? '2px solid #3d6b34' : '2px solid transparent',
                                transition: 'color 0.12s',
                            }}
                        >
                            {g.plantsTab}
                        </button>
                    )}
                    <button
                        onClick={() => setTab('structures')}
                        style={{
                            padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                            letterSpacing: '0.15em', textTransform: 'uppercase',
                            color: tab === 'structures' ? '#3d6b34' : '#7c857a',
                            borderBottom: tab === 'structures' ? '2px solid #3d6b34' : '2px solid transparent',
                            transition: 'color 0.12s',
                        }}
                    >
                        {isGeneralView ? 'Elements' : g.structuresTab}
                    </button>
                </div>

                {tab === 'plants' && (
                    <>
                        <h3 style={{
                            fontFamily: 'Newsreader, Georgia, serif', fontSize: 18, fontWeight: 400,
                            color: '#1f3a18', margin: '0 0 10px', lineHeight: 1.1,
                        }}>
                            Drag onto map
                        </h3>

                        {/* Search */}
                        <input
                            type="text"
                            placeholder={g.searchPlants}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '7px 10px',
                                border: '1px solid #d3cdb8', borderRadius: 6,
                                fontSize: 12.5, fontFamily: 'inherit',
                                background: '#fbf7ea', color: '#1d2a20',
                                outline: 'none', boxSizing: 'border-box',
                            }}
                        />

                        {/* Filter pills row */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                            <button
                                onClick={() => setZoneFilterOn(v => !v)}
                                style={{
                                    fontSize: 10, padding: '2px 8px', borderRadius: 999, cursor: 'pointer',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    background: zoneFilterOn ? '#3d6b34' : 'transparent',
                                    color: zoneFilterOn ? '#f4f1e6' : '#7c857a',
                                    border: `1px solid ${zoneFilterOn ? '#3d6b34' : '#d3cdb8'}`,
                                }}
                            >
                                {zoneFilterOn ? `Zone ${zone} ✓` : g.allZones}
                            </button>
                            <button
                                onClick={() => setShowFavoritesOnly(v => !v)}
                                style={{
                                    fontSize: 10, padding: '2px 8px', borderRadius: 999, cursor: 'pointer',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    background: showFavoritesOnly ? '#d8e3c0' : 'transparent',
                                    color: showFavoritesOnly ? '#1f3a18' : '#7c857a',
                                    border: `1px solid ${showFavoritesOnly ? '#5e9050' : '#d3cdb8'}`,
                                }}
                            >
                                ♥ {favoritePlants.length}
                            </button>
                            {focusAreas.map(role => (
                                <button
                                    key={role}
                                    onClick={() => setActiveRole(r => r === role ? null : role)}
                                    style={{
                                        fontSize: 10, padding: '2px 8px', borderRadius: 999, cursor: 'pointer',
                                        background: activeRole === role ? '#3d6b34' : 'transparent',
                                        color: activeRole === role ? '#f4f1e6' : '#7c857a',
                                        border: `1px solid ${activeRole === role ? '#3d6b34' : '#d3cdb8'}`,
                                    }}
                                >
                                    {g.guildRoles[role] || role}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {tab === 'structures' && (
                    <p style={{ fontSize: 11, color: '#7c857a', margin: 0 }}>
                        {isGeneralView ? 'Drag onto the General map to place a structure.' : g.dragInstruction}
                    </p>
                )}
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 16px' }}>

                {/* ── STRUCTURES TAB ── */}
                {tab === 'structures' && isGeneralView && (
                    <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {GENERAL_STRUCTURES.map((s) => (
                            <div
                                key={s.key}
                                draggable
                                onDragStart={e => e.dataTransfer.setData('plant', JSON.stringify({
                                    name: s.name,
                                    structureKey: s.key,
                                    isStructure: true,
                                    color: s.color,
                                    borderColor: s.borderColor,
                                    iconKey: s.iconKey,
                                    canOpenZone: s.canOpenZone,
                                }))}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    background: '#fbf7ea', border: `1px solid ${s.borderColor}44`,
                                    borderLeft: `3px solid ${s.borderColor}`,
                                    borderRadius: 7, padding: '7px 10px',
                                    cursor: 'grab',
                                    transition: 'box-shadow 0.1s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                            >
                                <div style={{
                                    width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: s.color, border: `1.5px solid ${s.borderColor}66`,
                                }}>
                                    <LucideIcon name={s.iconKey} size={17} color={s.textColor || s.borderColor} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1d2a20', margin: 0, letterSpacing: '0.01em' }}>{s.name}</p>
                                    <p style={{ fontSize: 10, color: '#7c857a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.description}</p>
                                </div>
                                {s.canOpenZone && (
                                    <div style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 8, color: s.borderColor, background: s.color, borderRadius: 3, padding: '1px 4px', border: `1px solid ${s.borderColor}44`, whiteSpace: 'nowrap' }}>zone</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'structures' && !isGeneralView && (
                    <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {STRUCTURES.map((structure) => {
                            const tr = g.structures[structure.name] || { name: structure.name, description: structure.description };
                            return (
                                <div
                                    key={structure.name}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        background: 'rgba(0,0,0,0.03)', border: '1px solid #e8e2cc',
                                        borderRadius: 8, padding: '8px 10px',
                                        cursor: 'grab',
                                    }}
                                    draggable
                                    onDragStart={e => e.dataTransfer.setData('plant', JSON.stringify({
                                        name: structure.name,
                                        isStructure: true,
                                        icon: structure.icon,
                                        color: structure.color,
                                    }))}
                                >
                                    <div style={{
                                        width: 34, height: 34, borderRadius: 6, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: (structure.color || '#888') + '33',
                                        overflow: 'hidden',
                                    }}>
                                        <img src={structure.icon} alt={tr.name} style={{ width: 26, height: 26 }} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1d2a20', margin: 0 }}>{tr.name}</p>
                                        <p style={{ fontSize: 10.5, color: '#7c857a', margin: 0 }}>{tr.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── PLANTS TAB ── */}
                {tab === 'plants' && (
                    <div style={{ padding: '2px 0' }}>
                        {filteredPlants.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#7c857a', fontSize: 12, padding: '24px 16px' }}>
                                {showFavoritesOnly ? g.noFavourites : g.noMatch}
                            </p>
                        )}

                        {filteredPlants.map((plant, idx) => {
                            const hasAntagonist = plant.antagonists?.some(a => placedPlantNames.includes(a));
                            const isCompanion = !hasAntagonist && plant.companions?.some(c => placedPlantNames.includes(c));
                            const primaryRole = plant.guildRole?.[0];
                            const isFav = favoritePlants.includes(plant.name);
                            const isExpanded = expandedPlant === plant.name;
                            const iconSrc = plant.iconData ? `data:image/svg+xml;base64,${plant.iconData}` : null;

                            return (
                                <div key={idx}>
                                    <div
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 9,
                                            padding: '7px 18px',
                                            background: isFav ? '#d8e3c0' : hasAntagonist ? 'rgba(180,60,60,0.06)' : isCompanion ? 'rgba(61,107,52,0.06)' : 'transparent',
                                            cursor: 'default',
                                            borderBottom: '1px solid rgba(211,205,184,0.35)',
                                        }}
                                    >
                                        {/* Favorite button */}
                                        <button
                                            onClick={e => toggleFavorite(e, plant.name)}
                                            style={{
                                                flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                                                fontSize: 13, lineHeight: 1, padding: 0,
                                                color: isFav ? '#e09060' : 'rgba(124,133,122,0.35)',
                                            }}
                                        >♥</button>

                                        {/* Icon */}
                                        <div
                                            style={{
                                                width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                                                background: '#ece2c8',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                overflow: 'hidden', cursor: 'grab',
                                            }}
                                            draggable
                                            onDragStart={e => e.dataTransfer.setData('plant', JSON.stringify({ name: plant.name, iconData: plant.iconData }))}
                                            title={g.dragOntoTitle}
                                        >
                                            {iconSrc
                                                ? <img src={iconSrc} alt={plant.name} style={{ width: 18, height: 18, objectFit: 'contain' }} draggable={false} />
                                                : <span style={{ fontSize: 13 }}>🌱</span>
                                            }
                                        </div>

                                        {/* Name + role */}
                                        <div
                                            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                                            onClick={() => setExpandedPlant(p => p === plant.name ? null : plant.name)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ fontSize: 13, color: '#1d2a20', fontWeight: hasAntagonist || isCompanion ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {plant.name}
                                                    {hasAntagonist && <span title={g.antagonistTitle} style={{ marginLeft: 3, fontSize: 11 }}>⚠️</span>}
                                                    {isCompanion && <span title={g.companionTitle} style={{ marginLeft: 3, fontSize: 11 }}>🤝</span>}
                                                </span>
                                            </div>
                                            {primaryRole && (
                                                <span className={`inline-block text-[9px] px-1.5 py-px rounded-full mt-0.5 ${GUILD_LABEL_COLOR[primaryRole] || 'bg-gray-100 text-gray-600'}`}>
                                                    {g.guildRoles[primaryRole] || primaryRole}
                                                </span>
                                            )}
                                        </div>

                                        {/* FAV badge */}
                                        {isFav && (
                                            <span style={{
                                                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                                                color: '#3d6b34', letterSpacing: '0.1em', flexShrink: 0,
                                                marginLeft: 'auto',
                                            }}>
                                                FAV
                                            </span>
                                        )}

                                        {/* Expand chevron */}
                                        <span
                                            style={{ fontSize: 9, color: '#7c857a', flexShrink: 0, cursor: 'pointer' }}
                                            onClick={() => setExpandedPlant(p => p === plant.name ? null : plant.name)}
                                        >
                                            {isExpanded ? '▲' : '▼'}
                                        </span>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: '0 18px' }}>
                                            <PlantInfo plant={plant} g={g} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
