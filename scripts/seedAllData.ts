import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Node.js compatible Supabase client with service role key for admin operations
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// National chains to exclude (case-insensitive)
const NATIONAL_CHAINS = [
  'starbucks',
  'dunkin',
  'dunkin donuts',
  'mcdonald\'s',
  'mcdonalds',
  'burger king',
  'subway',
  'taco bell',
  'kfc',
  'kentucky fried chicken',
  'wendy\'s',
  'wendys',
  'domino\'s',
  'dominos',
  'pizza hut',
  'papa john\'s',
  'papa johns',
  'chipotle',
  'panera bread',
  'panera',
  'tim hortons',
  'caribou coffee',
  'peet\'s coffee',
  'peets coffee',
  'coffee bean & tea leaf',
  'coffee bean',
  'the coffee bean',
  'seattle\'s best',
  'seattles best',
  'biggby coffee',
  'dutch bros',
  'dutch brothers',
  'philz coffee',
  'blue bottle coffee',
  'intelligentsia coffee',
  'stumptown coffee',
  'counter culture coffee',
  'lavazza',
  'illy',
  'nespresso',
  'keurig',
  'green mountain coffee',
  'folgers',
  'maxwell house',
  'nestle',
  'nescafe',
  'jacobs coffee',
  'tchibo',
  'costa coffee',
  'pret a manger',
  'pret',
  'eat',
  'greggs',
  'cafe nero',
  'caffe nero',
  'costa',
  'black sheep coffee',
  'grind',
  'all bar one',
  'weatherspoons',
  'wetherspoons',
  'toby carvery',
  'harvester',
  'beefeater',
  'brewers fayre',
  'frankie & benny\'s',
  'frankie and bennys',
  'chiquito',
  'las iguanas',
  'bella italia',
  'prezzo',
  'zizzi',
  'ask italian',
  'pizza express',
  'nandos',
  'wagamama',
  'byron',
  'gourmet burger kitchen',
  'gbk',
  'five guys',
  'shake shack',
  'in-n-out',
  'whataburger',
  'sonic',
  'arby\'s',
  'arbys',
  'popeyes',
  'bojangles',
  'raising cane\'s',
  'raising canes',
  'chick-fil-a',
  'chick fil a',
  'church\'s chicken',
  'churches chicken',
  'el pollo loco',
  'qdoba',
  'moe\'s southwest grill',
  'moes',
  'baja fresh',
  'del taco',
  'jack in the box',
  'white castle',
  'culver\'s',
  'culvers',
  'steak \'n shake',
  'steak and shake',
  'hardee\'s',
  'hardees',
  'carl\'s jr',
  'carls jr',
  'rally\'s',
  'rallys',
  'checkers',
  'a&w',
  'long john silver\'s',
  'long john silvers',
  'red lobster',
  'olive garden',
  'outback steakhouse',
  'applebee\'s',
  'applebees',
  'chili\'s',
  'chilis',
  'tgi friday\'s',
  'tgi fridays',
  'bennigan\'s',
  'bennigans',
  'ruby tuesday',
  'hooters',
  'buffalo wild wings',
  'wingstop',
  'zaxby\'s',
  'zaxbys',
  'boston market',
  'krispy kreme',
  'dunkin\' donuts',
  'shipley donuts',
  'winchell\'s donuts',
  'winchells donuts',
  'lamar\'s donuts',
  'lamars donuts',
  'yum yum donuts',
  'donut king',
  'donut palace',
  'donut stop',
  'donut shop',
  'donut house',
  'donut corner',
  'donut world',
  'donut time',
  'donut plus',
  'donut express',
  'donut factory',
  'donut heaven',
  'donut land',
  'donut man',
  'donut master',
  'donut queen',
  'donut station',
  'donut store',
  'donut town',
  'donut village',
  'donut world',
  'donut zone'
];

// Check if a cafe name is a national chain
function isNationalChain(cafeName: string): boolean {
  const lowerName = cafeName.toLowerCase().trim();
  return NATIONAL_CHAINS.some(chain => lowerName.includes(chain));
}

// Delete existing national chains from database
async function deleteNationalChains(): Promise<{ deleted: number; errors: string[] }> {
  console.log('🗑️ Checking for and removing existing national chains...');
  
  const errors: string[] = [];
  let totalDeleted = 0;

  try {
    // Get all cafes
    const { data: cafes, error: fetchError } = await supabase
      .from('cafes')
      .select('id, name');

    if (fetchError) {
      errors.push(`Error fetching cafes: ${fetchError.message}`);
      return { deleted: 0, errors };
    }

    if (!cafes || cafes.length === 0) {
      console.log('  📊 No cafes found to check');
      return { deleted: 0, errors };
    }

    // Identify national chains to delete
    const nationalChainIds: string[] = [];
    const nationalChainNames: string[] = [];

    for (const cafe of cafes) {
      if (isNationalChain(cafe.name)) {
        nationalChainIds.push(cafe.id);
        nationalChainNames.push(cafe.name);
      }
    }

    if (nationalChainIds.length === 0) {
      console.log('  ✅ No national chains found in database');
      return { deleted: 0, errors };
    }

    console.log(`  🎯 Found ${nationalChainIds.length} national chains to remove:`);
    nationalChainNames.forEach(name => console.log(`    - ${name}`));

    // Delete national chains
    const { error: deleteError } = await supabase
      .from('cafes')
      .delete()
      .in('id', nationalChainIds);

    if (deleteError) {
      errors.push(`Error deleting national chains: ${deleteError.message}`);
      return { deleted: 0, errors };
    }

    totalDeleted = nationalChainIds.length;
    console.log(`  ✅ Successfully removed ${totalDeleted} national chains`);

  } catch (error: any) {
    errors.push(`Unexpected error: ${error.message}`);
  }

  return { deleted: totalDeleted, errors };
}

interface CafeData {
  place_id: string;
  name: string;
  address: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  google_rating?: number;
  price_level?: number;
  phone_number?: string;
  website?: string;
  opening_hours?: string[];
  photos?: string[];
  hero_photo_url?: string;
  google_photo_reference?: string;
  parking_info?: string;
  tags?: string[];
  is_active?: boolean;
}

interface SeedingResult {
  success: boolean;
  message: string;
  stats: {
    cafes_processed: number;
    cafes_added: number;
    reviews_added: number;
    api_calls: number;
    errors: string[];
  };
}

// Houston coordinates for comprehensive coverage - Core Houston + Important Suburbs
const houstonCoordinates = [
  // Core Inner Loop Areas (3km radius for dense coverage)
  { name: "Downtown", lat: 29.7604, lng: -95.3698, radius: 3000 },
  { name: "EaDo", lat: 29.7372, lng: -95.2891, radius: 3000 },
  { name: "Montrose", lat: 29.7367, lng: -95.3964, radius: 3000 },
  { name: "Museum District", lat: 29.7230, lng: -95.3890, radius: 3000 },
  { name: "Heights", lat: 29.7949, lng: -95.3995, radius: 3000 },
  { name: "North Heights", lat: 29.8200, lng: -95.4000, radius: 3000 },
  { name: "Rice Village", lat: 29.7218, lng: -95.4030, radius: 3000 },
  { name: "West University", lat: 29.7183, lng: -95.4289, radius: 3000 },
  { name: "Midtown", lat: 29.7344, lng: -95.3800, radius: 3000 },
  { name: "Medical Center", lat: 29.7041, lng: -95.3983, radius: 3000 },
  { name: "TMC", lat: 29.7041, lng: -95.3983, radius: 3000 },
  { name: "Near Northside", lat: 29.7982, lng: -95.2891, radius: 3000 },
  { name: "East End", lat: 29.7372, lng: -95.2891, radius: 3000 },
  
  // Core West Houston (3-4km radius)
  { name: "Galleria", lat: 29.7374, lng: -95.4619, radius: 4000 },
  { name: "Greenway Plaza", lat: 29.7303, lng: -95.4234, radius: 3000 },
  { name: "Bellaire", lat: 29.7056, lng: -95.4589, radius: 3000 },
  { name: "Westchase", lat: 29.6900, lng: -95.5600, radius: 3000 },
  { name: "Memorial", lat: 29.7811, lng: -95.5208, radius: 4000 },
  { name: "Memorial City", lat: 29.7811, lng: -95.5208, radius: 4000 },
  
  // Inner Suburbs (5km radius)
  { name: "Spring Branch", lat: 29.8059, lng: -95.5156, radius: 5000 },
  { name: "Clear Lake", lat: 29.5600, lng: -95.0890, radius: 5000 },
  { name: "NASA", lat: 29.5600, lng: -95.0890, radius: 5000 },
  { name: "Webster", lat: 29.5500, lng: -95.1000, radius: 5000 },
  { name: "League City", lat: 29.5500, lng: -95.1000, radius: 5000 },
  
  // Outer Suburbs (8km radius)
  { name: "Katy", lat: 29.7858, lng: -95.8244, radius: 8000 },
  { name: "Sugar Land", lat: 29.6197, lng: -95.6349, radius: 8000 },
  { name: "Missouri City", lat: 29.6100, lng: -95.6300, radius: 8000 },
  { name: "Pearland", lat: 29.5636, lng: -95.2860, radius: 8000 },
  { name: "The Woodlands", lat: 30.1658, lng: -95.4613, radius: 8000 },
  { name: "Cypress", lat: 29.8197, lng: -95.6404, radius: 8000 },
  { name: "Katy Mills", lat: 29.7858, lng: -95.8244, radius: 8000 },
  { name: "Humble", lat: 30.0200, lng: -95.1400, radius: 8000 },
  { name: "Atascocita", lat: 30.0200, lng: -95.1400, radius: 8000 },
  { name: "Pasadena", lat: 29.6200, lng: -95.2000, radius: 8000 },
  { name: "Deer Park", lat: 29.6200, lng: -95.2000, radius: 8000 },
  { name: "Rosenberg", lat: 29.5200, lng: -95.6700, radius: 8000 },
  { name: "Richmond", lat: 29.5200, lng: -95.6700, radius: 8000 }
];

// Convert Google's price level strings to integers for database
function convertPriceLevel(priceLevel: string): number | null {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE': return 0;
    case 'PRICE_LEVEL_INEXPENSIVE': return 1;
    case 'PRICE_LEVEL_MODERATE': return 2;
    case 'PRICE_LEVEL_EXPENSIVE': return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4;
    default: return null;
  }
}

// Get neighborhood from address
function extractNeighborhood(address: string): string {
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[1].trim();
  }
  return 'Houston';
}

// Get neighborhood from coordinates and address (same logic as in addNeighborhoodColumn.ts)
function getNeighborhoodFromCoordinates(lat: number, lng: number, address: string): string {
  // Downtown area
  if (lat >= 29.75 && lat <= 29.77 && lng >= -95.38 && lng <= -95.36) {
    return 'Downtown';
  }
  
  // EaDo (East Downtown)
  if (lat >= 29.73 && lat <= 29.75 && lng >= -95.30 && lng <= -95.28) {
    return 'EaDo';
  }
  
  // Montrose
  if (lat >= 29.72 && lat <= 29.76 && lng >= -95.40 && lng <= -95.38) {
    return 'Montrose';
  }
  
  // Museum District
  if (lat >= 29.71 && lat <= 29.74 && lng >= -95.39 && lng <= -95.37) {
    return 'Museum District';
  }
  
  // Heights
  if (lat >= 29.79 && lat <= 29.82 && lng >= -95.41 && lng <= -95.38) {
    return 'Heights';
  }
  
  // North Heights
  if (lat >= 29.82 && lat <= 29.85 && lng >= -95.41 && lng <= -95.38) {
    return 'North Heights';
  }
  
  // Rice Village
  if (lat >= 29.71 && lat <= 29.73 && lng >= -95.41 && lng <= -95.39) {
    return 'Rice Village';
  }
  
  // West University
  if (lat >= 29.71 && lat <= 29.73 && lng >= -95.44 && lng <= -95.41) {
    return 'West University';
  }
  
  // Midtown
  if (lat >= 29.72 && lat <= 29.75 && lng >= -95.39 && lng <= -95.36) {
    return 'Midtown';
  }
  
  // Medical Center / TMC
  if (lat >= 29.70 && lat <= 29.72 && lng >= -95.41 && lng <= -95.38) {
    return 'Medical Center';
  }
  
  // Near Northside
  if (lat >= 29.79 && lat <= 29.82 && lng >= -95.31 && lng <= -95.28) {
    return 'Near Northside';
  }
  
  // East End
  if (lat >= 29.72 && lat <= 29.76 && lng >= -95.31 && lng <= -95.28) {
    return 'East End';
  }
  
  // Galleria
  if (lat >= 29.73 && lat <= 29.75 && lng >= -95.47 && lng <= -95.44) {
    return 'Galleria';
  }
  
  // Greenway Plaza
  if (lat >= 29.72 && lat <= 29.74 && lng >= -95.43 && lng <= -95.40) {
    return 'Greenway Plaza';
  }
  
  // Bellaire
  if (lat >= 29.70 && lat <= 29.72 && lng >= -95.47 && lng <= -95.44) {
    return 'Bellaire';
  }
  
  // Westchase
  if (lat >= 29.68 && lat <= 29.72 && lng >= -95.57 && lng <= -95.54) {
    return 'Westchase';
  }
  
  // Memorial
  if (lat >= 29.77 && lat <= 29.79 && lng >= -95.53 && lng <= -95.50) {
    return 'Memorial';
  }
  
  // Memorial City
  if (lat >= 29.77 && lat <= 29.79 && lng >= -95.53 && lng <= -95.50) {
    return 'Memorial City';
  }
  
  // Spring Branch
  if (lat >= 29.80 && lat <= 29.83 && lng >= -95.52 && lng <= -95.49) {
    return 'Spring Branch';
  }
  
  // Clear Lake
  if (lat >= 29.55 && lat <= 29.57 && lng >= -95.10 && lng <= -95.07) {
    return 'Clear Lake';
  }
  
  // NASA
  if (lat >= 29.55 && lat <= 29.57 && lng >= -95.10 && lng <= -95.07) {
    return 'NASA';
  }
  
  // Webster
  if (lat >= 29.54 && lat <= 29.56 && lng >= -95.12 && lng <= -95.09) {
    return 'Webster';
  }
  
  // League City
  if (lat >= 29.54 && lat <= 29.56 && lng >= -95.12 && lng <= -95.09) {
    return 'League City';
  }
  
  // Katy
  if (lat >= 29.78 && lat <= 29.80 && lng >= -95.84 && lng <= -95.80) {
    return 'Katy';
  }
  
  // Sugar Land
  if (lat >= 29.61 && lat <= 29.63 && lng >= -95.64 && lng <= -95.60) {
    return 'Sugar Land';
  }
  
  // Missouri City
  if (lat >= 29.60 && lat <= 29.62 && lng >= -95.64 && lng <= -95.60) {
    return 'Missouri City';
  }
  
  // Pearland
  if (lat >= 29.56 && lat <= 29.58 && lng >= -95.30 && lng <= -95.26) {
    return 'Pearland';
  }
  
  // The Woodlands
  if (lat >= 30.16 && lat <= 30.18 && lng >= -95.47 && lng <= -95.44) {
    return 'The Woodlands';
  }
  
  // Cypress
  if (lat >= 29.81 && lat <= 29.83 && lng >= -95.65 && lng <= -95.61) {
    return 'Cypress';
  }
  
  // Humble
  if (lat >= 30.01 && lat <= 30.03 && lng >= -95.16 && lng <= -95.12) {
    return 'Humble';
  }
  
  // Atascocita
  if (lat >= 30.01 && lat <= 30.03 && lng >= -95.16 && lng <= -95.12) {
    return 'Atascocita';
  }
  
  // Pasadena
  if (lat >= 29.61 && lat <= 29.63 && lng >= -95.22 && lng <= -95.18) {
    return 'Pasadena';
  }
  
  // Deer Park
  if (lat >= 29.61 && lat <= 29.63 && lng >= -95.22 && lng <= -95.18) {
    return 'Deer Park';
  }
  
  // Rosenberg
  if (lat >= 29.52 && lat <= 29.54 && lng >= -95.69 && lng <= -95.65) {
    return 'Rosenberg';
  }
  
  // Richmond
  if (lat >= 29.52 && lat <= 29.54 && lng >= -95.69 && lng <= -95.65) {
    return 'Richmond';
  }
  
  // Fallback: extract from address if coordinates don't match
  const lowerAddress = address.toLowerCase();
  
  if (lowerAddress.includes('montrose')) return 'Montrose';
  if (lowerAddress.includes('heights')) return 'Heights';
  if (lowerAddress.includes('downtown')) return 'Downtown';
  if (lowerAddress.includes('rice village') || lowerAddress.includes('rice university')) return 'Rice Village';
  if (lowerAddress.includes('west university')) return 'West University';
  if (lowerAddress.includes('midtown')) return 'Midtown';
  if (lowerAddress.includes('medical center') || lowerAddress.includes('tmc')) return 'Medical Center';
  if (lowerAddress.includes('galleria')) return 'Galleria';
  if (lowerAddress.includes('bellaire')) return 'Bellaire';
  if (lowerAddress.includes('memorial')) return 'Memorial';
  if (lowerAddress.includes('spring branch')) return 'Spring Branch';
  if (lowerAddress.includes('clear lake')) return 'Clear Lake';
  if (lowerAddress.includes('nasa')) return 'NASA';
  if (lowerAddress.includes('webster')) return 'Webster';
  if (lowerAddress.includes('league city')) return 'League City';
  if (lowerAddress.includes('katy')) return 'Katy';
  if (lowerAddress.includes('sugar land')) return 'Sugar Land';
  if (lowerAddress.includes('missouri city')) return 'Missouri City';
  if (lowerAddress.includes('pearland')) return 'Pearland';
  if (lowerAddress.includes('woodlands')) return 'The Woodlands';
  if (lowerAddress.includes('cypress')) return 'Cypress';
  if (lowerAddress.includes('humble')) return 'Humble';
  if (lowerAddress.includes('atascocita')) return 'Atascocita';
  if (lowerAddress.includes('pasadena')) return 'Pasadena';
  if (lowerAddress.includes('deer park')) return 'Deer Park';
  if (lowerAddress.includes('rosenberg')) return 'Rosenberg';
  if (lowerAddress.includes('richmond')) return 'Richmond';
  
  // Default fallback
  return 'Houston';
}

// Fetch cafe details from Google Places
async function getCafeDetails(placeId: string): Promise<any> {
  if (!GOOGLE_PLACES_API_KEY) return null;

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,price_level&key=${GOOGLE_PLACES_API_KEY}`);
    const data = await response.json();
    
    if (data.status === 'OK' && data.result) {
      return {
        phone_number: data.result.formatted_phone_number,
        website: data.result.website,
        opening_hours: data.result.opening_hours?.weekday_text || [],
        price_level: data.result.price_level
      };
    }
  } catch (error) {
    console.error(`Error fetching details for ${placeId}:`, error);
  }
  
  return null;
}


// Save cafe to database
async function saveCafeToDatabase(cafeData: CafeData): Promise<{ success: boolean; cafeId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('cafes')
      .upsert(cafeData, { onConflict: 'place_id' })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving cafe:', error);
      return { success: false, error: error.message };
    }

    return { success: true, cafeId: data.id };
  } catch (error: any) {
    console.error('Error saving cafe:', error);
    return { success: false, error: error.message };
  }
}


// Check existing cafe coverage for a zone
async function checkZoneCoverage(location: { name: string; lat: number; lng: number; radius: number }): Promise<number> {
  try {
    // Convert radius from meters to degrees (rough approximation)
    const latDelta = location.radius / 111000; // 1 degree ≈ 111km
    const lngDelta = location.radius / (111000 * Math.cos(location.lat * Math.PI / 180)); // Account for latitude
    
    // Check how many cafes already exist within this zone's radius
    const { data, error } = await supabase
      .from('cafes')
      .select('id')
      .gte('latitude', location.lat - latDelta)
      .lte('latitude', location.lat + latDelta)
      .gte('longitude', location.lng - lngDelta)
      .lte('longitude', location.lng + lngDelta);

    if (error) {
      console.error(`Error checking coverage for ${location.name}:`, error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error(`Error checking coverage for ${location.name}:`, error);
    return 0;
  }
}

// Main seeding function
export async function seedAllCafeData(): Promise<SeedingResult> {
  console.log('🌱 Starting comprehensive cafe data seeding...');
  console.log('🔑 Google Places API Key configured:', GOOGLE_PLACES_API_KEY ? 'Yes' : 'No');
  
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ Google Places API key not found');
    return {
      success: false,
      message: 'Google Places API key not found',
      stats: {
        cafes_processed: 0,
        cafes_added: 0,
        reviews_added: 0,
        api_calls: 0,
        errors: ['Missing Google Places API key']
      }
    };
  }

  // Check existing cafe count
  const { data: existingCafes, error: countError } = await supabase
    .from('cafes')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    console.error('Error checking existing cafes:', countError);
  } else {
    console.log(`📊 Existing cafes in database: ${existingCafes || 0}`);
  }

  // Delete existing national chains
  const chainDeletionResult = await deleteNationalChains();
  if (chainDeletionResult.errors.length > 0) {
    console.error('Errors during chain deletion:', chainDeletionResult.errors);
  }

  const searchTerms = [
    'coffee shop',
    'cafe',
    'coffee',
    'espresso',
    'latte',
    'cappuccino',
    'specialty coffee',
    'third wave coffee',
    'coffee bar',
    'breakfast coffee',
    'coffee beans',
    'local coffee',
    'roastery',
    'coffee roaster',
    'artisan coffee',
    'craft coffee',
    'indie coffee',
    'boutique coffee'
  ];

  let totalProcessed = 0;
  let totalAdded = 0;
  let totalApiCalls = 0;
  const errors: string[] = [];
  const processedPlaceIds = new Set<string>();
  const skippedZones: string[] = [];
  const processedZones: string[] = [];

  const startTime = Date.now();

  console.log(`📍 Zones: ${houstonCoordinates.length}`);
  console.log(`🔍 Search terms: ${searchTerms.length}`);
  console.log(`🎯 Expected API calls: ~${houstonCoordinates.length * searchTerms.length}\n`);

  for (let i = 0; i < houstonCoordinates.length; i++) {
    const location = houstonCoordinates[i];
    console.log(`\n📍 Zone ${i + 1}/${houstonCoordinates.length}: ${location.name}`);

    // Check if this zone already has good coverage
    const existingCafeCount = await checkZoneCoverage(location);
    const minCafesPerZone = 15; // Skip if zone already has 15+ cafes
    
    if (existingCafeCount >= minCafesPerZone) {
      console.log(`  ⏭️ Skipping ${location.name} - already has ${existingCafeCount} cafes (threshold: ${minCafesPerZone})`);
      skippedZones.push(`${location.name} (${existingCafeCount} cafes)`);
      continue;
    } else {
      console.log(`  🔍 Zone needs more cafes (${existingCafeCount}/${minCafesPerZone}) - processing...`);
      processedZones.push(location.name);
    }

    for (const searchTerm of searchTerms) {
      const query = `${searchTerm} ${location.name}`;
      console.log(`  🔍 Searching: "${searchTerm}"`);

      try {
        totalApiCalls++;

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.photos,places.types,places.businessStatus'
          },
          body: JSON.stringify({
            textQuery: query,
            locationBias: {
              circle: {
                center: { latitude: location.lat, longitude: location.lng },
                radius: location.radius
              }
            },
            maxResultCount: 20
          })
        });

        const data = await response.json();

        if (data.error) {
          console.error(`    ❌ Google API Error:`, data.error);
          errors.push(`API Error for ${query}: ${data.error.message}`);
          continue;
        }

        if (!data.places || data.places.length === 0) {
          console.log(`    📊 No results found`);
          continue;
        }

        const resultsCount = data.places.length;
        console.log(`    📊 Found ${resultsCount} results`);

        for (const place of data.places) {
          // Skip duplicates
          if (processedPlaceIds.has(place.id)) {
            continue;
          }

           // Skip permanently closed businesses
           if (place.businessStatus === 'CLOSED_PERMANENTLY') {
             console.log(`    ⏭️ Skipping closed: ${place.displayName?.text}`);
             continue;
           }

           // Skip national chains
           const cafeName = place.displayName?.text || 'Unknown Cafe';
           if (isNationalChain(cafeName)) {
             console.log(`    🏢 Skipping national chain: ${cafeName}`);
             continue;
           }

           processedPlaceIds.add(place.id);
           totalProcessed++;

          try {
             // Prepare cafe data
             const cafeData: CafeData = {
               place_id: place.id,
               name: place.displayName?.text || 'Unknown Cafe',
               address: place.formattedAddress || '',
               neighborhood: getNeighborhoodFromCoordinates(
                 place.location?.latitude || 0,
                 place.location?.longitude || 0,
                 place.formattedAddress || ''
               ),
               latitude: place.location?.latitude || 0,
               longitude: place.location?.longitude || 0,
               google_rating: place.rating,
               price_level: convertPriceLevel(place.priceLevel),
               tags: [],
               is_active: true
             };

              // Get additional details
              const details = await getCafeDetails(place.id);
              if (details) {
                cafeData.phone_number = details.phone_number;
                cafeData.website = details.website;
                cafeData.opening_hours = details.opening_hours;
                cafeData.price_level = details.price_level || cafeData.price_level;
                totalApiCalls++;
              }

              // Save cafe to database
              const saveResult = await saveCafeToDatabase(cafeData);
              if (saveResult.success) {
                totalAdded++;
                console.log(`    ✅ Saved: ${cafeData.name}`);
              } else {
                console.error(`    ❌ Failed to save: ${cafeData.name} - ${saveResult.error}`);
                errors.push(`Failed to save ${cafeData.name}: ${saveResult.error}`);
              }

          } catch (error: any) {
            console.error(`    ❌ Error processing ${place.displayName?.text}:`, error);
            errors.push(`Error processing ${place.displayName?.text}: ${error.message}`);
          }

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error: any) {
        console.error(`    ❌ Search error for "${searchTerm}":`, error);
        errors.push(`Search error for "${searchTerm}": ${error.message}`);
      }

      // Rate limiting delay between searches
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);

  console.log('\n=== Seeding Complete ===');
  console.log(`⏱️ Duration: ${duration}s`);
  console.log(`📍 Total zones: ${houstonCoordinates.length}`);
  console.log(`✅ Zones processed: ${processedZones.length}`);
  console.log(`⏭️ Zones skipped: ${skippedZones.length}`);
  console.log(`🔍 Search terms: ${searchTerms.length}`);
  console.log(`📊 Total places found: ${processedPlaceIds.size}`);
  console.log(`✅ Cafes added: ${totalAdded}`);
  console.log(`🗑️ National chains removed: ${chainDeletionResult.deleted}`);
  console.log(`🌐 API calls made: ${totalApiCalls}`);
  console.log(`❌ Errors: ${errors.length}`);
  
  if (skippedZones.length > 0) {
    console.log('\n⏭️ Skipped zones (already have good coverage):');
    skippedZones.forEach(zone => console.log(`  - ${zone}`));
  }
  
  if (processedZones.length > 0) {
    console.log('\n✅ Processed zones:');
    processedZones.forEach(zone => console.log(`  - ${zone}`));
  }

  const success = totalAdded > 0 && errors.length < totalProcessed * 0.1; // Less than 10% error rate

  return {
    success,
    message: success 
      ? `Successfully seeded ${totalAdded} cafes` 
      : `Seeding completed with ${errors.length} errors`,
    stats: {
      cafes_processed: totalProcessed,
      cafes_added: totalAdded,
      reviews_added: 0,
      api_calls: totalApiCalls,
      errors
    }
  };
}

// Run the seeding script directly
seedAllCafeData()
  .then((result) => {
    if (result.success) {
      console.log('✅ Seeding completed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Seeding completed with errors');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
