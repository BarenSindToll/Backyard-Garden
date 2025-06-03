// seedFromLocalFile.js (final version using 100 plants + fallback icons)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Plant from './models/plantModel.js';

dotenv.config();

const ICON_FOLDER = path.resolve('../fixed-frontend/src/assets/veg-icons');
const DEFAULT_ICON_PATH = path.join(ICON_FOLDER, 'default.svg');

const assignIcon = (plantName, iconData) => {
    // Force overwrite if iconData is a fake SVG like <svg>Tomato</svg>
    try {
        const decoded = Buffer.from(iconData || '', 'base64').toString('utf8');
        if (decoded.includes('<svg') && decoded.length < 100) {
            throw new Error('Fake or placeholder SVG');
        }
    } catch {
        // fallback to icon reassignment
    }


    const normalized = plantName
        .toLowerCase()
        .replace(/ț/g, 't').replace(/ș/g, 's').replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]/g, '') + '.svg';

    const allIcons = fs.readdirSync(ICON_FOLDER);
    const match = allIcons.find(f => f.toLowerCase() === normalized);
    const filePath = match ? path.join(ICON_FOLDER, match) : DEFAULT_ICON_PATH;


    try {
        const svg = fs.existsSync(filePath)
            ? fs.readFileSync(filePath)
            : fs.readFileSync(DEFAULT_ICON_PATH);
        return svg.toString('base64');
    } catch (err) {
        console.error(`❌ Icon not found for ${plantName} (${normalized})`);
        return '';
    }
};

async function seedFromLocalFile() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const rawData = fs.readFileSync('./romanian_plants.json');
        const plants = JSON.parse(rawData);

        for (const plant of plants) {
            plant.iconData = assignIcon(plant.name, plant.iconData);

            await Plant.findOneAndUpdate(
                { name: plant.name },
                plant,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        console.log(`${plants.length} plants inserted or updated.`);
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error.message);
        process.exit(1);
    }
}

seedFromLocalFile();
