import fs from 'fs';
import path from 'path';

const ICON_FOLDER = path.resolve('./fixed-frontend/src/assets/veg-icons');

const normalize = (name) =>
    name
        .toLowerCase()
        .replace(/ț/g, 't').replace(/ș/g, 's').replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]/g, '');

const svgFiles = fs.readdirSync(ICON_FOLDER);

for (const file of svgFiles) {
    if (!file.toLowerCase().endsWith('.svg')) continue;

    const newName = normalize(path.basename(file, '.svg')) + '.svg';
    const oldPath = path.join(ICON_FOLDER, file);
    const newPath = path.join(ICON_FOLDER, newName);

    if (file !== newName && !fs.existsSync(newPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`✅ Renamed: ${file} → ${newName}`);
    } else if (file !== newName && fs.existsSync(newPath)) {
        console.warn(`⚠️  Conflict: ${newName} already exists, skipped ${file}`);
    }
}

console.log('✔️ Icon normalization done.');
