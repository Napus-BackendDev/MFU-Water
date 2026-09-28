// Keep the existing provider/style, but serve its unchanged manifest locally.
// Tiles, sprites and glyph URLs remain the provider's absolute URLs.
import { writeFile } from 'node:fs/promises';
const source = 'https://vector.openstreetmap.org/styles/shortbread/colorful.json';
const response = await fetch(source);
if (!response.ok) throw new Error(`Style download failed: ${response.status}`);
const raw = await response.text();
const style = JSON.parse(raw);
if (style.version !== 8 || !style.layers.some(layer => layer.id === 'boundary-country:outline') || !style.layers.some(layer => layer.id === 'land-forest')) throw new Error('Unexpected provider style');
const licenseResponse = await fetch('https://raw.githubusercontent.com/versatiles-org/versatiles-style/main/LICENSE.md');
if (!licenseResponse.ok) throw new Error('Style license unavailable');
const license = await licenseResponse.text();
await writeFile(new URL('../public/data/boundaries/shortbread-colorful.style.json', import.meta.url), raw);
await writeFile(new URL('../public/data/boundaries/shortbread-colorful.LICENSE.txt', import.meta.url), `Style source: ${source}\nToolkit: https://github.com/versatiles-org/versatiles-style\nMap data: https://www.openstreetmap.org/copyright\n\n${license}`);
console.log(`Cached unchanged style (${style.layers.length} layers); no provider or theme changes`);
