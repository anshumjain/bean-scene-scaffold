// scripts/expandCafes.js
// Crawl Houston and surrounding zones for cafes using Google Places API (grid-based)
// Zones: Houston, Katy, Sugar Land, Cypress, The Woodlands, Pearland
// Deduplicate by place_id or (name+address). Output up to 1200 unique cafes. ≤2000 API calls.

const fs = require('fs');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY env var required');

const ZONES = [
  { name: 'Houston', lat: 29.7604, lng: -95.3698, radius: 18000 },
  { name: 'Katy', lat: 29.7858, lng: -95.8245, radius: 9000 },
  { name: 'Sugar Land', lat: 29.6197, lng: -95.6349, radius: 9000 },
  { name: 'Cypress', lat: 29.9691, lng: -95.6972, radius: 9000 },
  { name: 'The Woodlands', lat: 30.1658, lng: -95.4613, radius: 9000 },
  { name: 'Pearland', lat: 29.5636, lng: -95.2861, radius: 9000 },
];

const GRID_STEP = 0.045; // ~5km
const MAX_CAFES = 1200;
const MAX_API_CALLS = 2000;

const cafes = new Map();
let apiCalls = 0;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPlaces(lat, lng, radius) {
  if (apiCalls >= MAX_API_CALLS) return [];
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=cafe&key=${GOOGLE_API_KEY}`;
  apiCalls++;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const json = await resp.json();
  return json.results || [];
}

function dedupeAndAdd(results) {
  for (const cafe of results) {
    const key = cafe.place_id || (cafe.name + '|' + cafe.vicinity);
    if (!cafes.has(key)) {
      cafes.set(key, {
        id: uuidv4(),
        place_id: cafe.place_id,
        name: cafe.name,
        address: cafe.vicinity,
        lat: cafe.geometry.location.lat,
        lng: cafe.geometry.location.lng,
        rating: cafe.rating,
        user_ratings_total: cafe.user_ratings_total,
        types: cafe.types,
        photos: cafe.photos,
        icon: cafe.icon,
        reference: cafe.reference,
        scope: cafe.scope,
      });
    }
  }
}

async function crawlZone(zone) {
  const { lat, lng, radius } = zone;
  // Grid: step north/south/east/west
  for (let dLat = -0.18; dLat <= 0.18; dLat += GRID_STEP) {
    for (let dLng = -0.18; dLng <= 0.18; dLng += GRID_STEP) {
      if (cafes.size >= MAX_CAFES || apiCalls >= MAX_API_CALLS) return;
      const clat = lat + dLat;
      const clng = lng + dLng;
      const results = await fetchPlaces(clat, clng, 1500);
      dedupeAndAdd(results);
      await sleep(100); // avoid rate limit
    }
  }
}

(async () => {
  for (const zone of ZONES) {
    await crawlZone(zone);
    if (cafes.size >= MAX_CAFES || apiCalls >= MAX_API_CALLS) break;
  }
  // Output to file
  fs.writeFileSync('cafes_expanded.json', JSON.stringify(Array.from(cafes.values()), null, 2));
  console.log(`Done. Cafes: ${cafes.size}, API calls: ${apiCalls}`);
})();

