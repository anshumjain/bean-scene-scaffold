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