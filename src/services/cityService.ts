/**
 * City detection and configuration service
 * Supports IP-based detection and coordinate-based city detection
 */

export type City = 'houston' | 'austin';

export interface CityConfig {
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  neighborhoods: string[];
  center: { lat: number; lng: number };
}

export const CITY_CONFIGS: Record<City, CityConfig> = {
  houston: {
    name: 'Houston',
    bounds: {
      north: 30.5,
      south: 29.0,
      east: -94.5,
      west: -96.0,
    },
    neighborhoods: [
      'Downtown', 'Montrose', 'Heights', 'Rice Village', 
      'Medical Center', 'Galleria', 'Midtown', 'East End'
    ],
    center: { lat: 29.7604, lng: -95.3698 },
  },
  austin: {
    name: 'Austin',
    bounds: {
      north: 30.6,
      south: 30.0,
      east: -97.4,
      west: -98.0,
    },
    neighborhoods: [
      'Downtown', 'South Austin', 'East Austin', 'North Austin',
      'West Austin', 'University', 'Mueller', 'Zilker'
    ],
    center: { lat: 30.2672, lng: -97.7431 },
  },
};

/**
 * Detect city from IP address (fallback to browser geolocation)
 */
export async function detectUserCity(): Promise<City> {
  // Try IP-based detection first (for users who denied location)
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.city) {
      const cityLower = data.city.toLowerCase();
      if (cityLower.includes('austin')) return 'austin';
      if (cityLower.includes('houston')) return 'houston';
    }
    
    // Check by coordinates if available
    if (data.latitude && data.longitude) {
      return detectCityFromCoordinates(data.latitude, data.longitude);
    }
  } catch (error) {
    console.log('IP detection failed, trying browser geolocation...', error);
  }
  
  // Fallback to browser geolocation
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    
    return detectCityFromCoordinates(
      position.coords.latitude,
      position.coords.longitude
    );
  } catch (error) {
    console.log('Geolocation failed, defaulting to Houston');
    return 'houston'; // Default
  }
}

/**
 * Detect city from coordinates
 */
export function detectCityFromCoordinates(lat: number, lng: number): City {
  for (const [city, config] of Object.entries(CITY_CONFIGS)) {
    const { bounds } = config;
    if (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    ) {
      return city as City;
    }
  }
  return 'houston'; // Default
}

/**
 * Get current city from localStorage or detect
 */
export async function getCurrentCity(): Promise<City> {
  const stored = localStorage.getItem('user-city') as City | null;
  if (stored && (stored === 'houston' || stored === 'austin')) {
    return stored;
  }
  
  const detected = await detectUserCity();
  localStorage.setItem('user-city', detected);
  return detected;
}

/**
 * Set user's city preference
 */
export function setUserCity(city: City): void {
  localStorage.setItem('user-city', city);
}

/**
 * Get city config
 */
export function getCityConfig(city: City): CityConfig {
  return CITY_CONFIGS[city];
}
