import { useMemo, useState } from 'react';
import { STRUCTURES } from './gardenZoneConfig';

const GUILD_LABEL_COLOR = {
    'Producer':             'bg-green-100 text-green-800',
    'Nitrogen fixer':       'bg-blue-100 text-blue-800',
    'Pollinator attractor': 'bg-yellow-100 text-yellow-800',
    'Dynamic accumulator':  'bg-purple-100 text-purple-800',
    'Pest repellent':       'bg-orange-100 text-orange-800',
    'Groundcover':          'bg-teal-100 text-teal-800',
};

function loadFavorites() {
    try { return JSON.parse(localStorage.getItem('gardenFavorites') || '[]'); } catch { return []; }
}

// ── Expandable info panel shown below a plant card ─────────────────────────
function PlantInfo({ plant }) {
    return (
        <div className="mt-1.5 mb-1 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs space-y-1.5">
            {plant.sunlight && (
                <div className="flex items-center gap-1.5">
                    <span>☀️</span>
                    <span className="text-gray-600">{plant.sunlight}</span>
                </div>
            )}
            {plant.spacingCm && (
                <div className="flex items-center gap-1.5">
                    <span>📏</span>
                    <span className="text-gray-600">{plant.spacingCm} cm spacing</span>
                </div>
            )}
            {plant.season && (
                <div className="flex items-center gap-1.5">
                    <span>🗓</span>
                    <span className="text-gray-600">{plant.season}</span>
                </div>
            )}
            {plant.planting?.daysToMaturity && (
                <div className="flex items-center gap-1.5">
                    <span>⏳</span>
                    <span className="text-gray-600">{plant.planting.daysToMaturity} days to maturity</span>
                </div>
            )}
            {plant.companions?.length > 0 && (
                <div>
                    <span className="font-semibold text-green-700">Good with: </span>
                    <span className="text-gray-600">{plant.companions.slice(0, 5).join(', ')}{plant.companions.length > 5 ? '…' : ''}</span>
                </div>
            )}
            {plant.antagonists?.length > 0 && (
                <div>
                    <span className="font-semibold text-red-600">Avoid with: </span>
                    <span className="text-gray-600">{plant.antagonists.slice(0, 5).join(', ')}{plant.antagonists.length > 5 ? '…' : ''}</span>
                </div>
            )}
            {plant.ecologicalFunctions?.length > 0 && (
                <div>
                    <span className="font-semibold text-forest">Functions: </span>
                    <span className="text-gray-600">{plant.ecologicalFunctions.join(', ')}</span>
                </div>
            )}
        </div>
    );
}

export default function PlantSidebar({ setup = {}, allPlants = [], placedPlantNames = [] }) {
    const [tab, setTab] = useState('plants');
    const [search, setSearch] = useState('');
    const [zoneFilterOn, setZoneFilterOn] = useState(false);
    const [activeRole, setActiveRole] = useState(null);
    const [expandedPlant, setExpandedPlant] = useState(null);
    const [favorites, setFavorites] = useState(loadFavorites);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    const zone = setup.hardinessZone || '7b';
    const focusAreas = setup.focusAreas || [];

    const toggleFavorite = (e, plantName) => {
        e.stopPropagation();
        const updated = favorites.includes(plantName)
            ? favorites.filter(f => f !== plantName)
            : [...favorites, plantName];
        setFavorites(updated);
        localStorage.setItem('gardenFavorites', JSON.stringify(updated));
    };

    const filteredPlants = useMemo(() => {
        let plants = [...allPlants];

        if (showFavoritesOnly) {
            plants = plants.filter(p => favorites.includes(p.name));
        }

        if (zoneFilterOn) {
            plants = plants.filter(p => {
                const zt = p.planting?.zoneTimes;
                if (!zt || Object.keys(zt).length === 0) return true;
                return zt[zone] !== undefined && zt[zone] !== null;
            });
        }

        const roleToFilter = activeRole || (focusAreas.length === 1 ? focusAreas[0] : null);
        if (roleToFilter) {
            plants = plants.filter(p => p.guildRole?.includes(roleToFilter));
        }

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
    }, [allPlants, search, zoneFilterOn, zone, focusAreas, activeRole, showFavoritesOnly, favorites]);

    return (
        <aside className="bg-cream rounded-xl border border-gray-200 text-forest w-full overflow-hidden flex flex-col">
            {/* Tab bar */}
            <div className="flex border-b border-gray-200 flex-shrink-0">
                <button
                    onClick={() => setTab('plants')}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'plants' ? 'bg-white text-forest border-b-2 border-forest' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Plants
                </button>
                <button
                    onClick={() => setTab('structures')}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === 'structures' ? 'bg-white text-forest border-b-2 border-forest' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Structures
                </button>
            </div>

            <div className="p-3 flex flex-col flex-1 min-h-0">
                {/* ── STRUCTURES TAB ── */}
                {tab === 'structures' && (
                    <div className="space-y-2 overflow-y-auto">
                        <p className="text-xs text-gray-500 mb-3">Drag onto a garden area to fill a row</p>
                        {STRUCTURES.map((structure) => (
                            <div
                                key={structure.name}
                                className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm cursor-grab hover:shadow-md transition-shadow"
                                draggable
                                onDragStart={e => e.dataTransfer.setData('plant', JSON.stringify({
                                    name: structure.name,
                                    isStructure: true,
                                    icon: structure.icon,
                                    color: structure.color,
                                }))}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                                    style={{ backgroundColor: structure.color + '44' }}
                                >
                                    <img src={structure.icon} alt={structure.name} className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{structure.name}</p>
                                    <p className="text-xs text-gray-500">{structure.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── PLANTS TAB ── */}
                {tab === 'plants' && (
                    <>
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-2 flex-shrink-0">
                            <h2 className="text-sm font-bold">Plants</h2>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setShowFavoritesOnly(v => !v)}
                                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${showFavoritesOnly ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-gray-500 border-gray-300 hover:border-amber-300'}`}
                                    title="Show favourites only"
                                >
                                    ♥ {showFavoritesOnly ? 'Favs' : favorites.length}
                                </button>
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full border border-green-300 font-medium">
                                    Zone {zone}
                                </span>
                            </div>
                        </div>

                        {/* Filter pills */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-2 flex-shrink-0">
                            <button
                                onClick={() => setZoneFilterOn(v => !v)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${zoneFilterOn ? 'bg-forest text-white border-forest' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'}`}
                            >
                                {zoneFilterOn ? `Zone ${zone} ✓` : 'All zones'}
                            </button>
                            {focusAreas.map(role => (
                                <button
                                    key={role}
                                    onClick={() => setActiveRole(r => r === role ? null : role)}
                                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${activeRole === role ? 'bg-forest text-white border-forest' : `${GUILD_LABEL_COLOR[role] || 'bg-gray-100 text-gray-600'} border-transparent`}`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Search plants..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 flex-shrink-0"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />

                        <p className="text-xs text-gray-400 mb-2 flex-shrink-0">
                            {filteredPlants.length} plant{filteredPlants.length !== 1 ? 's' : ''}
                            {showFavoritesOnly && ' · favourites'}
                        </p>

                        {/* Plant list */}
                        <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
                            {filteredPlants.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-6">
                                    {showFavoritesOnly ? 'No favourites yet — click ♥ to save a plant.' : 'No plants match your filters.'}
                                </p>
                            )}

                            {filteredPlants.map((plant, idx) => {
                                const hasAntagonist = plant.antagonists?.some(a => placedPlantNames.includes(a));
                                const isCompanion = !hasAntagonist && plant.companions?.some(c => placedPlantNames.includes(c));
                                const primaryRole = plant.guildRole?.[0];
                                const isFocus = focusAreas.length > 0 && plant.guildRole?.some(r => focusAreas.includes(r));
                                const isFav = favorites.includes(plant.name);
                                const isExpanded = expandedPlant === plant.name;

                                const iconSrc = plant.iconData
                                    ? `data:image/svg+xml;base64,${plant.iconData}`
                                    : null;

                                return (
                                    <div key={idx}>
                                        <div
                                            className={`flex items-center gap-2 bg-white border rounded-xl px-2.5 py-2 shadow-sm transition-all ${
                                                hasAntagonist ? 'border-red-300 bg-red-50/40' :
                                                isCompanion   ? 'border-green-300 bg-green-50/40' :
                                                isFocus       ? 'border-forest/25 bg-forest/5' :
                                                                'border-gray-200'
                                            }`}
                                        >
                                            {/* Favourite button */}
                                            <button
                                                onClick={e => toggleFavorite(e, plant.name)}
                                                className={`flex-shrink-0 text-base leading-none transition-colors ${isFav ? 'text-amber-400' : 'text-gray-200 hover:text-amber-300'}`}
                                                title={isFav ? 'Remove from favourites' : 'Add to favourites'}
                                            >♥</button>

                                            {/* Plant info (click to expand) */}
                                            <div
                                                className="flex-1 min-w-0 cursor-pointer"
                                                onClick={() => setExpandedPlant(p => p === plant.name ? null : plant.name)}
                                            >
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    <span className="text-sm font-semibold truncate">{plant.name}</span>
                                                    {hasAntagonist && <span title="Antagonist in garden" className="text-sm">⚠️</span>}
                                                    {isCompanion   && <span title="Companion in garden" className="text-sm">🤝</span>}
                                                    <span className="text-gray-400 text-xs ml-auto">{isExpanded ? '▲' : '▼'}</span>
                                                </div>
                                                {primaryRole && (
                                                    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${GUILD_LABEL_COLOR[primaryRole] || 'bg-gray-100 text-gray-600'}`}>
                                                        {primaryRole}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Drag handle icon */}
                                            {iconSrc ? (
                                                <img
                                                    src={iconSrc}
                                                    alt={plant.name}
                                                    className="w-9 h-9 flex-shrink-0 cursor-grab"
                                                    draggable
                                                    onDragStart={e =>
                                                        e.dataTransfer.setData('plant', JSON.stringify({ name: plant.name, iconData: plant.iconData }))
                                                    }
                                                    title="Drag onto a garden area"
                                                />
                                            ) : (
                                                <div
                                                    className="w-9 h-9 flex-shrink-0 rounded-full bg-green-100 flex items-center justify-center text-base cursor-grab"
                                                    draggable
                                                    onDragStart={e =>
                                                        e.dataTransfer.setData('plant', JSON.stringify({ name: plant.name }))
                                                    }
                                                    title="Drag onto a garden area"
                                                >🌱</div>
                                            )}
                                        </div>

                                        {/* Expanded info */}
                                        {isExpanded && <PlantInfo plant={plant} />}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
}
