// Lossless derivative of the navigation source; no coordinate simplification.
import { readFile, writeFile } from 'node:fs/promises';
const directory = new URL('../public/data/boundaries/', import.meta.url);
const data = JSON.parse(await readFile(new URL('se-asia-countries.geojson', directory), 'utf8'));
const features = data.features.filter(feature => feature.properties.shapeISO === 'THA');
if (features.length !== 1) throw new Error('Expected one Thailand feature');
await writeFile(new URL('thailand-navigation.geojson', directory), JSON.stringify({ ...data, features }), { flag: 'wx' });
console.log('Created lossless Thailand navigation boundary');
