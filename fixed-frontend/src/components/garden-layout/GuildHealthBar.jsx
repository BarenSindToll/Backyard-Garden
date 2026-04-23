const GUILD_ROLES = [
    { key: 'Producer', label: 'Producers', dot: 'bg-green-500' },
    { key: 'Nitrogen fixer', label: 'N-Fixers', dot: 'bg-blue-500' },
    { key: 'Pollinator attractor', label: 'Pollinators', dot: 'bg-yellow-500' },
    { key: 'Dynamic accumulator', label: 'Accumulators', dot: 'bg-purple-500' },
    { key: 'Pest repellent', label: 'Pest Ctrl', dot: 'bg-orange-500' },
    { key: 'Groundcover', label: 'Groundcover', dot: 'bg-teal-500' },
];

export default function GuildHealthBar({ placedPlantNames = [], allPlants = [] }) {
    const counts = Object.fromEntries(GUILD_ROLES.map(r => [r.key, 0]));

    placedPlantNames.forEach(name => {
        const plant = allPlants.find(p => p.name === name);
        plant?.guildRole?.forEach(role => {
            if (counts[role] !== undefined) counts[role]++;
        });
    });

    const missing = GUILD_ROLES.filter(r => counts[r.key] === 0);
    const total = placedPlantNames.length;

    return (
        <div className="bg-cream border border-gray-200 rounded-xl px-5 py-3">
            <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-xs font-semibold text-forest">Guild Balance</span>
                {total === 0 ? (
                    <span className="text-xs text-gray-400">No plants placed yet</span>
                ) : missing.length > 0 ? (
                    <span className="text-xs text-amber-600">
                        Missing: {missing.map(r => r.label).join(', ')}
                    </span>
                ) : (
                    <span className="text-xs text-green-600 font-medium">All guild roles covered!</span>
                )}
            </div>
            <div className="flex flex-wrap gap-4">
                {GUILD_ROLES.map(({ key, label, dot }) => {
                    const count = counts[key];
                    return (
                        <div key={key} className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot} ${count === 0 ? 'opacity-25' : ''}`} />
                            <span className={`text-xs ${count === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                                {label} <span className="font-semibold">{count}</span>
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
