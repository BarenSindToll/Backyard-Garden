// seedGardenStructures.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GardenStructureModel from './models/gardenStructureModel.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/backyardgarden';

const svgs = {
    greenhouse: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 12 5 12 5 22 19 22 19 12 22 12 12 2"/><line x1="12" y1="22" x2="12" y2="12"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    compost: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8B4513" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16v-4H4z" /><line x1="6" y1="16" x2="6" y2="12" /><line x1="10" y1="16" x2="10" y2="12" /><line x1="14" y1="16" x2="14" y2="12" /><line x1="18" y1="16" x2="18" y2="12" /></svg>`,
    house: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D2691E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 L12 3 L21 12 V21 H3z" /><rect x="9" y="17" width="6" height="4" /></svg>`,
    pond: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00A99D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="14" rx="9" ry="5" /><path d="M3 14c0 4 9 4 9 0"/></svg>`,
};

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function seed() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        await GardenStructureModel.deleteMany({});
        console.log('Cleared GardenStructures collection');



        const structures = [
            {

                type: 'greenhouse',
                name: 'Main Greenhouse',
                color: '#4A90E2',
                x: 100,
                y: 100,
                zone: 'main',
                iconSvg: svgs.greenhouse,
                radius: 40,
            },
            {

                type: 'compost',
                name: 'Compost Area',
                color: '#8B4513',
                x: 250,
                y: 120,
                zone: 'main',
                iconSvg: svgs.compost,
                width: 80,
                height: 50,
            },
            {

                type: 'house',
                name: 'Garden House',
                color: '#D2691E',
                x: 400,
                y: 90,
                zone: 'main',
                iconSvg: svgs.house,
                width: 80,
                height: 80,
            },
            {

                type: 'pond',
                name: 'Garden Pond',
                color: '#00A99D',
                x: 180,
                y: 250,
                zone: 'main',
                iconSvg: svgs.pond,
                radius: 40,
            },
        ];

        for (const structure of structures) {
            await GardenStructureModel.create(structure);
            await delay(100); // throttle insertions
        }

        console.log('GardenStructures seeded successfully');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Seeding failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

seed();
