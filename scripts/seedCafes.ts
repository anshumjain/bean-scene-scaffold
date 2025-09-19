console.log('🚀 Starting cafe seeding script...');
console.log('Environment check:');
console.log('Google API Key:', process.env.GOOGLE_PLACES_API_KEY ? '✅ Found' : '❌ Missing');
console.log('Supabase URL:', process.env.VITE_SUPABASE_URL ? '✅ Found' : '❌ Missing');

// Before calling onFirstApiKeySetup():
console.log('📞 About to call onFirstApiKeySetup()...');

// After the call:
console.log('✅ onFirstApiKeySetup() completed');

// scripts/seedCafes.ts
import 'dotenv/config'; // Loads .env automatically
import { onFirstApiKeySetup } from '@/services/scheduledService';

(async () => {
  try {
    const result = await onFirstApiKeySetup();
    console.log('Seeding result:', result);
  } catch (err) {
    console.error('Error running initial seed:', err);
  }
})();
