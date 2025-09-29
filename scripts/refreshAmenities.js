// scripts/refreshAmenities.js
// Update amenities for all cafes using Google Places Details API

const fs = require('fs');
const fetch = require('node-fetch');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY env var required');

const cafes = JSON.parse(fs.readFileSync('cafes_expanded.json', 'utf-8'));
const updated = [];
let apiCalls = 0;
const MAX_API_CALLS = 2000;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchDetails(placeId) {
  if (apiCalls >= MAX_API_CALLS) return null;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours,price_level,wheelchair_accessible_entrance,parking&key=${GOOGLE_API_KEY}`;
  apiCalls++;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const json = await resp.json();
  return json.result || null;
}

(async () => {
  for (const cafe of cafes) {
    if (apiCalls >= MAX_API_CALLS) break;
    const details = await fetchDetails(cafe.place_id);
    if (details) {
      cafe.opening_hours = details.opening_hours?.weekday_text || [];
      cafe.price_level = details.price_level;
      cafe.wheelchair_accessible_entrance = details.wheelchair_accessible_entrance;
      cafe.parking = details.parking;
      updated.push(cafe);
    } else {
      updated.push(cafe);
    }
    await sleep(100);
  }
  fs.writeFileSync('cafes_amenities.json', JSON.stringify(updated, null, 2));
  console.log(`Done. Updated: ${updated.length}, API calls: ${apiCalls}`);
})();

