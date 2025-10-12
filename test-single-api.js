// Test a single Google Places API call
import fetch from 'node-fetch';

async function testSingleAPICall() {
  try {
    console.log('🧪 Testing single Google Places API call...\n');
    
    // Test with a known place_id
    const placeId = 'ChIJiQeaPW6_QIYRuFrZ8ZVBFOw'; // Double Trouble Caffeine & Cocktails
    const fields = 'opening_hours,formatted_phone_number,website,reviews,editorial_summary';
    
    // We'll need to get the API key from Supabase secrets
    // For now, let's test with a placeholder to see the URL structure
    console.log('📡 Testing API URL structure:');
    console.log(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=[API_KEY]`);
    
    console.log('\n🔑 To test the actual API call, we need to:');
    console.log('1. Get the Google Places API key from Supabase secrets');
    console.log('2. Test a single call to see what error we get');
    console.log('3. Check if it\'s a quota, billing, or authentication issue');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSingleAPICall();

