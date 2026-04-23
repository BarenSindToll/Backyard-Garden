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

export default function PlantSidebar({ setup = {}, allPlants = [], placedPlantNames = [] }) {
    const [tab, setTab] = useState('plants'); // 'plants' | 'structures'
    const [search, setSearch] = useState('');
    const [zoneFilterOn, setZoneFilterOn] = useState(false);
    const [activeRole, setActiveRole] = useState(null);

    const zone = setup.hardinessZone || '7b';
    const focusAreas = setup.focusAreas || [];

    const filteredPlants = useMemo(() => {
        let plants = [...allPlants];

        // Zone filter: only apply when explicitly turned on
        if (zoneFilterOn) {
            plants = plants.filter(p => {
                const zt = p.planting?.zoneTimes;
                // No zone data at all → always show
                if (!zt || Object.keys(zt).length === 0) return true;
                return zt[zone] !== undefined && zt[zone] !== null;
            });
        }

        // Guild role filter (pill click or single focus area)
        const roleToFilter = activeRole || (focusAreas.length === 1 ? focusAreas[0] : null);
        if (roleToFilter) {
            plants = plants.filter(p => p.guildRole?.includes(roleToFilter));
        }

        // Text search
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            plants = plants.filter(p => p.name.toLowerCase().includes(q));
        }

        // Sort: focus-area matches first, then alphabetical
        if (focusAreas.length > 0 && !activeRole) {
            plants.sort((a, b) => {
                const aMatch = a.guildRole?.some(r => focusAreas.includes(r)) ? 0 : 1;
                const bMatch = b.guildRole?.some(r => focusAreas.includes(r)) ? 0 : 1;
                return aMatch - bMatch || a.name.localeCompare(b.name);
            });
        }

        return plants;
    }, [allPlants, search, zoneFilterOn, zone, focusAreas, activeRole]);

    return (
        <aside className="bg-cream rounded-xl border border-gray-200 text-forest w-full overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-200">
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

            <div className="p-4">
                {/* ── STRUCTURES TAB ── */}
                {tab === 'structures' && (
                    <div className="space-y-2">
                        <p className="text-xs text-gray-500 mb-3">Drag structures onto the grid to plan your layout</p>
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
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold">Choose Plants</h2>
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full border border-green-300 font-medium">
                                Zone {zone}
                            </span>
                        </div>

                        {/* Zone + role filter pills */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-3">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 bg-white focus:outline-none focus:ring-2 focus:ring-forest/20"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />

                        <p className="text-xs text-gray-400 mb-2">{filteredPlants.length} plant{filteredPlants.length !== 1 ? 's' : ''}</p>

                        {/* Plant list */}
                        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                            {filteredPlants.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-6">No plants match your filters.</p>
                            )}
                            {filteredPlants.map((plant, idx) => {
                                const hasAntagonist = plant.antagonists?.some(a => placedPlantNames.includes(a));
                                const isCompanion = !hasAntagonist && plant.companions?.some(c => placedPlantNames.includes(c));
                                const primaryRole = plant.guildRole?.[0];
                                const isFocus = focusAreas.length > 0 && plant.guildRole?.some(r => focusAreas.includes(r));

                                return (
                                    <div
                                        key={idx}
                                        className={`flex justify-between items-center bg-white border rounded-xl p-3 shadow-sm transition-all ${
                                            hasAntagonist ? 'border-red-300 bg-red-50/40' :
                                            isCompanion   ? 'border-green-300 bg-green-50/40' :
                                            isFocus       ? 'border-forest/25 bg-forest/5' :
                                                            'border-gray-200'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0 mr-2">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <h4 className="text-sm font-semibold truncate">{plant.name}</h4>
                                                {hasAntagonist && <span title="Antagonist plant in garden">⚠️</span>}
                                                {isCompanion   && <span title="Companion plant in garden">🤝</span>}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {plant.sunlight}{plant.season && ` · ${plant.season}`}
                                            </p>
                                            {primaryRole && (
                                                <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-1 ${GUILD_LABEL_COLOR[primaryRole] || 'bg-gray-100 text-gray-600'}`}>
                                                    {primaryRole}
                                                </span>
                                            )}
                                        </div>

                                        {plant.iconData ? (
                                            <img
                                                src={`data:image/svg+xml;base64,${plant.iconData}`}
                                                alt={plant.name}
                                                className="w-10 h-10 flex-shrink-0 cursor-grab"
                                                draggable
                                                onDragStart={e =>
                                                    e.dataTransfer.setData('plant', JSON.stringify({ name: plant.name, iconData: plant.iconData }))
                                                }
                                            />
                                        ) : (
                                            <div
                                                className="w-10 h-10 flex-shrink-0 rounded-full bg-green-100 flex items-center justify-center text-lg cursor-grab"
                                                draggable
                                                onDragStart={e =>
                                                    e.dataTransfer.setData('plant', JSON.stringify({ name: plant.name }))
                                                }
                                            >🌱</div>
                                        )}
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
