import 'dotenv/config';
import { syncGooglePlacesCafes } from './nodeCafeService';

(async () => {
  try {
    console.log('Starting cafe seeding...');
    const result = await syncGooglePlacesCafes();
    console.log('Seeding result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
})();
