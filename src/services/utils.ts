import { HOUSTON_BOUNDS } from './types';

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if coordinates are within Houston Metro area
 */
export function isWithinHoustonMetro(lat: number, lng: number): boolean {
  return lat >= HOUSTON_BOUNDS.south &&
         lat <= HOUSTON_BOUNDS.north &&
         lng >= HOUSTON_BOUNDS.west &&
         lng <= HOUSTON_BOUNDS.east;
}

/**
 * Parse URL parameters for filtering
 */
export function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlObj = new URL(url);
  
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

/**
 * Get current user location with error handling
 * Enhanced for mobile browser compatibility
 */
export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    // Check if we're on HTTPS (required for mobile browsers)
    // Allow localhost and 127.0.0.1 for development
    const isSecureContext = location.protocol === 'https:' || 
                           location.hostname === 'localhost' || 
                           location.hostname === '127.0.0.1' ||
                           location.hostname.includes('vercel.app') ||
                           location.hostname.includes('netlify.app');
    
    if (!isSecureContext) {
      reject(new Error('Location access requires HTTPS on mobile browsers. Please use a secure connection.'));
      return;
    }
    
    // Don't check permissions API - let the geolocation request handle it
    // The permissions API can be unreliable on mobile browsers
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location obtained successfully:', position.coords);
        resolve(position);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Location access failed';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings and refresh the page.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your device location settings and try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while retrieving location. Please try again.';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: false, // Changed to false for better compatibility
        timeout: 10000, // Reduced timeout to 10 seconds
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}

/**
 * Check if the current browser is mobile
 */
export function isMobileBrowser(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Get mobile-friendly location with better error handling
 */
export function getMobileFriendlyLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    const isMobile = isMobileBrowser();
    console.log('Mobile browser detected:', isMobile);
    
    // Check if we're on HTTPS (required for mobile browsers)
    const isSecureContext = location.protocol === 'https:' || 
                           location.hostname === 'localhost' || 
                           location.hostname === '127.0.0.1' ||
                           location.hostname.includes('vercel.app') ||
                           location.hostname.includes('netlify.app');
    
    console.log('Secure context:', isSecureContext, 'Protocol:', location.protocol, 'Hostname:', location.hostname);
    
    if (!isSecureContext) {
      reject(new Error('Location access requires HTTPS on mobile browsers. Please use a secure connection.'));
      return;
    }
    
    // For mobile browsers, use very conservative settings
    const options = isMobile ? {
      enableHighAccuracy: false,
      timeout: 20000, // Even longer timeout for mobile
      maximumAge: 0 // Don't use cached location on mobile
    } : {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes for desktop
    };
    
    console.log('Geolocation options:', options);
    console.log('Making geolocation request...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location obtained successfully:', position.coords);
        resolve(position);
      },
      (error) => {
        console.error('Geolocation error details:', {
          code: error.code,
          message: error.message,
          isMobile: isMobile,
          userAgent: navigator.userAgent
        });
        
        let errorMessage = 'Location access failed';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = isMobile 
              ? 'Location access denied. Please enable location permissions in your browser settings and refresh the page.'
              : 'Location access denied. Please allow location access when prompted.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = isMobile
              ? 'Location information unavailable. Please check that your device has location services enabled and try again.'
              : 'Location information unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while retrieving location. Please try again.';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      options
    );
  });
}

/**
 * Format time ago from date string
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffYears < 1) {
    // Within the year, show mm/dd
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
  } else {
    // Over a year, show mm/dd/yyyy
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  }
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 1) {
    const feet = Math.round(miles * 5280);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

/**
 * Detect neighborhood from coordinates
 * This is a simplified version - in production you'd use more precise boundaries
 */
export function detectNeighborhood(lat: number, lng: number): string {
  // Simplified neighborhood detection based on rough coordinates
  // In production, use proper geofencing with detailed boundaries
  
  if (lat > 29.75 && lng > -95.4) return "Heights";
  if (lat > 29.73 && lat < 29.77 && lng > -95.4 && lng < -95.35) return "Montrose";
  if (lat > 29.7 && lat < 29.77 && lng > -95.38 && lng < -95.35) return "Downtown";
  if (lat > 29.7 && lat < 29.75 && lng > -95.4 && lng < -95.35) return "Midtown";
  if (lat > 29.68 && lat < 29.72 && lng > -95.45 && lng < -95.4) return "Rice Village";
  if (lat > 29.72 && lat < 29.78 && lng > -95.45 && lng < -95.4) return "River Oaks";
  if (lat > 29.75 && lng < -95.4) return "Memorial";
  if (lat > 29.7 && lat < 29.75 && lng < -95.45) return "Galleria";
  if (lat > 29.7 && lat < 29.75 && lng > -95.35) return "East End";
  
  return "Houston"; // Default
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}