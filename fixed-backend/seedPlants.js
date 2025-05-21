import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Plant from './models/plantModel.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);


// Helper to load and convert SVG to base64
const getIconBase64 = (filename) => {
    const filePath = path.join('../fixed-frontend/src/assets/veg-icons', filename);

    const svgData = fs.readFileSync(filePath);
    return Buffer.from(svgData).toString('base64');
};


const plants = [
    {
        name: 'Path',
        sunlight: 'Cardboard',
        season: '',
        note: 'Best covered with woodchips',
        iconData: getIconBase64('path.svg'),
    },
    {
        name: 'Basil',
        sunlight: 'Full Sun',
        season: 'Summer',
        note: 'Good with tomatoes',
        iconData: getIconBase64('basil.svg'),
    },
    {
        name: 'Parsley',
        sunlight: 'Full Sun',
        season: 'Summer',
        note: 'Green',
        iconData: getIconBase64('parsley.svg'),
    },
    {
        name: 'Lettuce',
        sunlight: 'Partial Shade',
        season: 'Spring–Fall',
        note: 'Stehm more',
        iconData: getIconBase64('lettuce.svg'),
    },
    {
        name: 'Carrot',
        sunlight: 'Full Sun',
        season: 'Spring–Fall',
        note: '',
        iconData: getIconBase64('carrot.svg'),
    },
    {
        name: 'Tomato',
        sunlight: 'Full Sun',
        season: 'Spring–Fall',
        note: '',
        iconData: getIconBase64('tomato.svg'),
    },

];

await Plant.deleteMany();
await Plant.insertMany(plants);
console.log('🌱 Plants with icons seeded.');
process.exit();
