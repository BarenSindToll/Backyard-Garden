import { useState } from 'react';
import basil from '../../assets/veg-icons/basil.svg';
import carrot from '../../assets/veg-icons/carrot.svg';
import lettuce from '../../assets/veg-icons/lettuce.svg';
import tomato from '../../assets/veg-icons/tomato.svg';
import parsley from '../../assets/veg-icons/parsley.svg';
import path from '../../assets/veg-icons/path.svg';

const iconMap = {
    Basil: basil,
    Carrot: carrot,
    Lettuce: lettuce,
    Tomato: tomato,
    Parsley: parsley,
    Path: path,
};

const plants = [
    {
        name: 'Path',
        sunlight: 'Cardboard',
        season: '',
        note: 'Best covered with woodchips',
    },
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
                className="w-full px-3 py-2 border rounded text-sm mb-4"
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
                                <p className="text-xs text-gray-600">
                                    {plant.sunlight} {plant.season && `· ${plant.season}`}
                                </p>
                                {plant.note && (
                                    <p className="text-xs text-gray-500 italic mt-0.5">
                                        {plant.note}
                                    </p>
                                )}
                            </div>
                            <img
                                src={iconMap[plant.name]}
                                alt={`${plant.name} icon`}
                                className="w-8 h-8 cursor-pointer"
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('plant', plant.name)}
                            />
                        </div>
                    ))}
            </div>
        </aside>
    );
}
