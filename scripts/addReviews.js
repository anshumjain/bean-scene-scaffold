// scripts/addReviews.js
// Fetch top 3 Google reviews per cafe using Google Places Details API

const fs = require('fs');
const fetch = require('node-fetch');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY env var required');

const cafes = JSON.parse(fs.readFileSync('cafes_amenities.json', 'utf-8'));
const reviews = [];
let apiCalls = 0;
const MAX_API_CALLS = 2000;
const reviewSet = new Set();

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchDetails(placeId) {
  if (apiCalls >= MAX_API_CALLS) return null;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${GOOGLE_API_KEY}`;
  apiCalls++;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const json = await resp.json();
  return json.result?.reviews || [];
}

(async () => {
  for (const cafe of cafes) {
    if (apiCalls >= MAX_API_CALLS) break;
    const googleReviews = await fetchDetails(cafe.place_id);
    for (const review of (googleReviews || []).slice(0, 3)) {
      const key = `${cafe.place_id}|${review.author_name}|${review.text}`;
      if (!reviewSet.has(key)) {
        reviewSet.add(key);
        reviews.push({
          cafe_id: cafe.place_id,
          author_name: review.author_name,
          review_text: review.text,
          rating: review.rating,
          time: review.time,
          profile_photo_url: review.profile_photo_url,
        });
      }
    }
    await sleep(100);
  }
  fs.writeFileSync('cafe_reviews.json', JSON.stringify(reviews, null, 2));
  console.log(`Done. Reviews: ${reviews.length}, API calls: ${apiCalls}`);
})();

