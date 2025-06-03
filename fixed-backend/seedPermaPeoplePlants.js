// seedPermapeoplePlants.js (with retry + throttle)
import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Plant from './models/plantModel.js';

dotenv.config();

const PERMAPEOPLE_API = 'https://permapeople.org/api/plants';
const headers = {
    'x-permapeople-key-id': process.env.PERMAPEOPLE_KEY_ID,
    'x-permapeople-key-secret': process.env.PERMAPEOPLE_KEY_SECRET,
};

const LIMIT = 100;
const allowedZones = ['5b', '6a', '6b', '7a', '7b'];
const bannedKeywords = ['banana', 'pineapple', 'papaya', 'mango', 'coconut', 'tropical', 'subtropical'];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const safeFetch = async (url, options, retries = 3) => {
    try {
        return await axios.get(url, options);
    } catch (err) {
        if (retries > 0) {
            console.warn('Retrying fetch...', retries, err.message);
            await delay(300);
            return safeFetch(url, options, retries - 1);
        }
        throw err;
    }
};

const assignIcon = (plantName) => {
    const normalized = plantName.toLowerCase().replace(/\s+/g, '-');
    const iconPath = path.join('./assets/veg-icons', `${normalized}.svg`);
    if (fs.existsSync(iconPath)) {
        return fs.readFileSync(iconPath).toString('base64');
    }
    return '';
};

async function fetchPlantsPaginated() {
    let allPlants = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data } = await safeFetch(PERMAPEOPLE_API, {
            headers,
            params: { limit: LIMIT, offset }
        });

        const batch = data?.plants || [];
        allPlants = allPlants.concat(batch);
        offset += LIMIT;
        hasMore = batch.length === LIMIT;

        await delay(200); // throttle requests
    }

    return allPlants;
}

async function seedPlants() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const rawPlants = await fetchPlantsPaginated();
        console.log(`Fetched ${rawPlants.length} plants from API`);

        const filtered = rawPlants.filter(p => {
            const name = p.name?.toLowerCase() || '';
            if (bannedKeywords.some(kw => name.includes(kw))) return false;

            const zones = p?.planting?.zoneTimes
                ? Array.isArray(p.planting.zoneTimes)
                    ? p.planting.zoneTimes.map(z => z.zone)
                    : Object.keys(p.planting.zoneTimes)
                : [];

            return zones.some(z => allowedZones.includes(z));
        });

        for (const plant of filtered) {
            const doc = {
                name: plant.common_name || plant.name,
                botanicalName: plant.scientific_name,
                sunlight: plant.sun || 'Unknown',
                season: 'Spring–Fall',
                perennial: plant.duration === 'perennial',
                category: plant.type || 'herb',
                iconData: assignIcon(plant.name || ''),
                note: plant.notes || '',
                guildRole: plant.functions || [],
                ecologicalFunctions: plant.functions || [],
                companions: plant.companion_plants || [],
                antagonists: [],
                rotationGroup: '',
                rootDepth: plant.root_depth || 'Medium',
                soilNeeds: plant.soil || [],
                waterNeeds: plant.water || 'Medium',
                pH: '',
                spacingCm: 30,
                succession: { previous: [], next: [] },
                planting: {
                    daysToMaturity: 70,
                    zoneTimes: new Map([['7a', {
                        indoorStart: 'March 1',
                        transplant: 'April 20',
                        directSow: 'May 5',
                        harvestStart: 'July 10',
                        harvestEnd: 'September 30'
                    }]])
                }
            };

            await Plant.findOneAndUpdate(
                { name: doc.name },
                doc,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        console.log(`${filtered.length} plants inserted or updated.`);
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error.message);
        process.exit(1);
    }
}

seedPlants();
