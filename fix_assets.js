const fs = require('fs');
const path = require('path');

const dir = 'public/assets';
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (file.endsWith('.tsj')) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        try {
            const json = JSON.parse(content);
            if (json.image) {
                const oldPath = json.image;
                const newPath = path.basename(oldPath);
                json.image = newPath;
                fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
                console.log(`Fixed ${file}: ${oldPath} -> ${newPath}`);
            }
        } catch (err) {
            console.error(`Error processing ${file}:`, err);
        }
    }
});
