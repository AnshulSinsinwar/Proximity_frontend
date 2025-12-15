const fs = require('fs');
const path = require('path');

const mapPath = 'public/assets/Proximity-layout.tmj';
const mapContent = fs.readFileSync(mapPath, 'utf8');
const map = JSON.parse(mapContent);

const assetsDir = path.dirname(mapPath);

console.log('Embedding tilesets...');

const newTilesets = [];

map.tilesets.forEach(tilesetRef => {
    if (tilesetRef.source) {
        // Construct path to the tsj file
        const tsjPath = path.join(assetsDir, tilesetRef.source);
        
        if (fs.existsSync(tsjPath)) {
            console.log(`Embedding ${tilesetRef.source}...`);
            const tsjContent = fs.readFileSync(tsjPath, 'utf8');
            const tsj = JSON.parse(tsjContent);
            
            // Merge properties: keep firstgid, remove source, add tsj properties
            const embeddedTileset = {
                firstgid: tilesetRef.firstgid,
                ...tsj
            };
            
            // Fix image path in embedded tileset if strictly relative
            // The tsj image path is relative to the tsj file. 
            // Since the map is in the same dir, it should be fine, but we cleaned them up earlier.
            // Ensure no ".." remain if they were fixed.
            
            newTilesets.push(embeddedTileset);
        } else {
            console.warn(`WARNING: Tileset file not found: ${tsjPath}. Keeping reference (might fail).`);
            // If office.tsj is missing, we must remove it or the game crashes.
            // But if we remove it, layer indices might shift if data uses IDs from it?
            // Tiled uses GIDs. If we remove a tileset, we basically break those tiles.
            // Better to keep a placeholder or remove if truly missing.
            // For now, push as is, but this is likely the error source if file missing.
            newTilesets.push(tilesetRef); 
        }
    } else {
        newTilesets.push(tilesetRef);
    }
});

map.tilesets = newTilesets;

const newMapPath = 'public/assets/Proximity-embedded.tmj';
fs.writeFileSync(newMapPath, JSON.stringify(map, null, 2));
console.log(`Saved embedded map to ${newMapPath}`);
