import { useState } from 'react';
import basilIcon from '../../assets/veg-icons/basil.svg';
import carrotIcon from '../../assets/veg-icons/carrot.svg';
import lettuceIcon from '../../assets/veg-icons/lettuce.svg';
import tomatoIcon from '../../assets/veg-icons/tomato.svg';
import parsleyIcon from '../../assets/veg-icons/parsley.svg';

const iconMap = {
    Basil: basilIcon,
    Carrot: carrotIcon,
    Lettuce: lettuceIcon,
    Tomato: tomatoIcon,
    Parsley: parsleyIcon // fallback or same as basil for now
};


const plants = [
    {
        name: 'Basil',
        sunlight: 'Full Sun',
        season: 'Summer',
        note: 'Good with tomatoes',
    },
    {
        name: 'Parsley',
        sunlight: 'Full Sun',
        season: 'Summer',
        note: 'Green',
    },
    {
        name: 'Lettuce',
        sunlight: 'Partial Shade',
        season: 'Spring–Fall',
        note: 'Stehm more',
    },
    {
        name: 'Carrot',
        sunlight: 'Full Sun',
        season: 'Spring–Fall',
        note: '',
    },
    {
        name: 'Tomato',
        sunlight: 'Full Sun',
        season: 'Spring–Fall',
        note: '',
    },
];


export default function PlantSidebar() {
    const [search, setSearch] = useState('');

    return (
        <aside className="bg-[#f7f3ec] p-5 rounded-lg border border-gray-200 text-forest w-full">
            <h2 className="text-lg font-bold mb-4">Choose Your Plants</h2>

            <input
                type="text"
                placeholder="Search"
                className="w-full px-3 py-2 mb-5 border border-gray-300 rounded"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <div className="space-y-3">
                {plants
                    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
                    .map((plant, idx) => (
                        <div
                            key={idx}
                            className="flex justify-between items-center bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                        >
                            <div>
                                <h4 className="text-sm font-semibold">{plant.name}</h4>
                                <p className="text-xs text-gray-600">{plant.sunlight} · {plant.season}</p>
                                {plant.note && (
                                    <p className="text-xs text-gray-500 italic mt-0.5">{plant.note}</p>
                                )}
                            </div>
                            <img src={iconMap[plant.name]} alt={`${plant.name} icon`} className="w-8 h-8" />
                        </div>

                    ))}
            </div>
        </aside>
    );
}
