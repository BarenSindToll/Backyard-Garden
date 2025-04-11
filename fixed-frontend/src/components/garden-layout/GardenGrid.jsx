/*export default function GardenGrid({ gridData = defaultGrid }) {
    return (
        <div className="grid grid-cols-8 grid-rows-6 gap-1 bg-[#5f523f] p-2 rounded-md w-full max-w-5xl">
            {gridData.map((cell, index) => (
                <div
                    key={index}
                    className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded 
              ${cell.type === 'path' ? 'bg-[#d6c7aa]' : 'bg-[#85735d]'}`}
                >
                    {cell.icon && (
                        <img src={cell.icon} alt="plant" className="w-7 h-7" />
                    )}
                </div>
            ))}
        </div>
    );
}

// Sample grid with icons and path
import basil from '../../assets/veg-icons/basil.svg';
import carrot from '../../assets/veg-icons/carrot.svg';
import lettuce from '../../assets/veg-icons/lettuce.svg';
import tomato from '../../assets/veg-icons/tomato.svg';
import parsley from '../../assets/veg-icons/parsley.svg';

const defaultGrid = [
    { type: 'plant', icon: tomato }, { type: 'plant', icon: null }, { type: 'plant', icon: basil }, { type: 'path' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' },
    { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'path' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' },
    { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'path' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' },
    { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'path' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' },
    { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'path' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' },
    { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' }, { type: 'plant' },
];
*/
import { useState } from 'react';
import basil from '../../assets/veg-icons/basil.svg';
import carrot from '../../assets/veg-icons/carrot.svg';
import lettuce from '../../assets/veg-icons/lettuce.svg';
import tomato from '../../assets/veg-icons/tomato.svg';
import parsley from '../../assets/veg-icons/parsley.svg';


const plantIcons = { tomato, basil, carrot };

const layout = [
    ['tomato', null, null, null, null, 'carrot'],
    [null, 'basil', null, null, null, null],
    ['carrot', 'basil', null, 'path', 'path', 'tomato'],
    [null, null, 'basil', 'path', null, null],
    ['tomato', null, null, 'path', null, null]
];

export default function GardenGrid() {
    return (
        <div className="w-full max-w-3xl mx-auto p-4">
            <div
                className="grid gap-0.5"
                style={{
                    gridTemplateColumns: `repeat(${layout[0].length}, minmax(0, 1fr))`
                }}
            >
                {layout.flat().map((item, idx) => (
                    <div
                        key={idx}
                        className={`flex items-center justify-center border border-[#5D503E]
              ${item === 'path' ? 'bg-[#D6C7AA]' : 'bg-[#7D6C57]'}`}
                        style={{ aspectRatio: '1' }}
                    >
                        {item && item !== 'path' && (
                            <img src={plantIcons[item]} alt={item} className="w-8 h-8" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}