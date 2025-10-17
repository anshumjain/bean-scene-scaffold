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
 */
export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    // Check if we're on HTTPS (required for mobile browsers)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      reject(new Error('Location access requires HTTPS on mobile browsers. Please use a secure connection.'));
      return;
    }
    
    // iOS Safari geolocation workaround - use watchPosition instead of getCurrentPosition
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    if (isIOS) {
      console.log('🍎 iOS detected - using watchPosition workaround');
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          console.log('✅ iOS watchPosition success:', position.coords);
          navigator.geolocation.clearWatch(watchId);
          resolve(position);
        },
        (error) => {
          console.error('❌ iOS watchPosition failed:', error);
          navigator.geolocation.clearWatch(watchId);
          
          // Fallback to getCurrentPosition with different options
          console.log('🔄 iOS fallback to getCurrentPosition...');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('✅ iOS fallback success:', position.coords);
              resolve(position);
            },
            (error) => {
              console.error('❌ iOS fallback also failed:', error);
              reject(new Error('iOS geolocation is not working. Please try refreshing the page or using a different browser.'));
            },
            {
              enableHighAccuracy: false,
              timeout: 30000,
              maximumAge: 0
            }
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 0
        }
      );
    } else {
      // Non-iOS browsers - use standard getCurrentPosition
    navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Geolocation success:', position.coords);
          resolve(position);
        },
      (error) => {
          console.error('❌ Geolocation error:', error);
          
        let errorMessage = 'Location access failed';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while retrieving location.';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000
        }
      );
    }
  });
}

/**
 * Check if the current browser is mobile
 */
export function isMobileBrowser(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Debug mobile location capabilities
 */
export function debugMobileLocation(): void {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent);
  const isChromeIOS = isIOS && isChrome;
  
  console.log('🔍 Mobile Location Debug Info:', {
    userAgent: userAgent,
    isMobile: isMobileBrowser(),
    isIOS: isIOS,
    isAndroid: isAndroid,
    isSafari: isSafari,
    isChrome: isChrome,
    isChromeIOS: isChromeIOS,
    hasGeolocation: !!navigator.geolocation,
    protocol: location.protocol,
    hostname: location.hostname,
    isSecureContext: window.isSecureContext,
    permissionsAPI: !!navigator.permissions,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  });
  
  // Platform-specific warnings
  if (isChromeIOS) {
    console.warn('⚠️ Chrome on iOS detected - known to have geolocation issues!');
    console.warn('💡 Try using Safari instead, or check iOS Settings > Privacy > Location Services');
  }
  
  if (isIOS && !isSecureContext) {
    console.error('❌ iOS requires HTTPS for geolocation!');
  }
  
  // Test permissions API if available
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' as PermissionName })
      .then(result => {
        console.log('📍 Permissions API result:', {
          state: result.state,
          onchange: typeof result.onchange
        });
      })
      .catch(err => {
        console.log('📍 Permissions API error:', err);
      });
  }
}

/**
 * Chrome iOS retry mechanism with different approaches
 */
function attemptGeolocationWithRetry(
  resolve: (position: GeolocationPosition) => void,
  reject: (error: Error) => void,
  options: PositionOptions,
  retries: number
): void {
  const userAgent = navigator.userAgent;
  const isChromeIOS = /iPad|iPhone|iPod/.test(userAgent) && /Chrome/.test(userAgent);
  const browserType = isChromeIOS ? 'Chrome iOS' : 'Safari iOS';
  
  console.log(`🔄 ${browserType} attempt ${4 - retries}/3...`);
  
  // Try different options for each attempt
  const attemptOptions = [
    { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
  ];
  
  const currentOptions = attemptOptions[3 - retries] || options;
  console.log('Using options:', currentOptions);
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log(`✅ ${browserType} location obtained successfully:`, position.coords);
      resolve(position);
    },
    (error) => {
      console.error(`❌ ${browserType} attempt ${4 - retries} failed:`, {
        code: error.code,
        message: error.message,
        options: currentOptions
      });
      
      if (retries > 1) {
        // Wait 2 seconds before retry
        setTimeout(() => {
          attemptGeolocationWithRetry(resolve, reject, options, retries - 1);
        }, 2000);
      } else {
        // All retries failed - provide iOS specific guidance
        const userAgent = navigator.userAgent;
        const isChromeIOS = /iPad|iPhone|iPod/.test(userAgent) && /Chrome/.test(userAgent);
        
        let errorMessage = 'iOS has known geolocation issues. ';
        
        if (error.code === 1) {
          if (isChromeIOS) {
            errorMessage += 'Please try using Safari instead, or check iOS Settings > Privacy & Security > Location Services > Safari.';
          } else {
            errorMessage += 'Please check iOS Settings > Privacy & Security > Location Services > Safari and ensure location is enabled.';
          }
        } else {
          errorMessage += 'Please check that location services are enabled on your device.';
        }
        
        reject(new Error(errorMessage));
      }
    },
    currentOptions
  );
}

/**
 * Test different geolocation approaches for debugging
 */
export function testGeolocationApproaches(): void {
  if (!navigator.geolocation) {
    console.error('❌ Geolocation not supported');
    return;
  }

  console.log('🧪 Testing different geolocation approaches...');

  // Test 1: Basic approach
  console.log('Test 1: Basic geolocation');
  navigator.geolocation.getCurrentPosition(
    (pos) => console.log('✅ Test 1 success:', pos.coords),
    (err) => console.log('❌ Test 1 failed:', err.code, err.message),
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
  );

  // Test 2: High accuracy
  console.log('Test 2: High accuracy');
  navigator.geolocation.getCurrentPosition(
    (pos) => console.log('✅ Test 2 success:', pos.coords),
    (err) => console.log('❌ Test 2 failed:', err.code, err.message),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );

  // Test 3: With cached location
  console.log('Test 3: With cached location');
  navigator.geolocation.getCurrentPosition(
    (pos) => console.log('✅ Test 3 success:', pos.coords),
    (err) => console.log('❌ Test 3 failed:', err.code, err.message),
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
  );

  // Test 4: iOS specific - very long timeout
  console.log('Test 4: iOS long timeout');
  navigator.geolocation.getCurrentPosition(
    (pos) => console.log('✅ Test 4 success:', pos.coords),
    (err) => console.log('❌ Test 4 failed:', err.code, err.message),
    { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 }
  );
}

/**
 * Simple, direct geolocation test - bypass all complex logic
 */
export function testSimpleGeolocation(): void {
  console.log('🚀 Testing simple, direct geolocation...');
  
  if (!navigator.geolocation) {
    console.error('❌ Geolocation not supported');
    return;
  }
  
  // Use the most basic settings possible
  const options = {
    enableHighAccuracy: false,
    timeout: 15000,
    maximumAge: 0
  };
  
  console.log('Making simple geolocation request with options:', options);
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('✅ SIMPLE SUCCESS! Location obtained:', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    },
    (error) => {
      console.error('❌ Simple geolocation failed:', {
        code: error.code,
        message: error.message
      });
    },
    options
  );
}

/**
 * Test iOS specific geolocation workarounds
 */
export function testIOSWorkarounds(): void {
  console.log('🍎 Testing iOS specific workarounds...');
  
  // Test 1: watchPosition
  console.log('Test 1: watchPosition...');
  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      console.log('✅ watchPosition success:', pos.coords);
      navigator.geolocation.clearWatch(watchId);
    },
    (err) => {
      console.log('❌ watchPosition failed:', err.code, err.message);
      navigator.geolocation.clearWatch(watchId);
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
  );
  
  // Clear watch after 5 seconds
  setTimeout(() => {
    navigator.geolocation.clearWatch(watchId);
    console.log('Cleared watchPosition');
  }, 5000);
  
  // Test 2: Check if we can access device orientation (indicates device capabilities)
  if (window.DeviceOrientationEvent) {
    console.log('✅ Device orientation API available');
  } else {
    console.log('❌ Device orientation API not available');
  }
  
  // Test 3: Check if we can access device motion (indicates device capabilities)
  if (window.DeviceMotionEvent) {
    console.log('✅ Device motion API available');
  } else {
    console.log('❌ Device motion API not available');
  }
  
  // Test 4: Check secure context and HTTPS details
  console.log('Secure context check:', {
    isSecureContext: window.isSecureContext,
    protocol: location.protocol,
    hostname: location.hostname,
    origin: location.origin,
    port: location.port,
    href: location.href
  });
  
  // Check if we can access security-related APIs
  console.log('Security APIs:', {
    crypto: !!window.crypto,
    cryptoSubtle: !!(window.crypto && window.crypto.subtle),
    indexedDB: !!window.indexedDB,
    localStorage: !!window.localStorage,
    sessionStorage: !!window.sessionStorage
  });
  
  // Test 5: Check if we can access navigator properties
  console.log('Navigator capabilities:', {
    geolocation: !!navigator.geolocation,
    permissions: !!navigator.permissions,
    serviceWorker: !!navigator.serviceWorker,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  });
  
  // Test 6: Check domain trust and app-like behavior
  console.log('Domain trust check:', {
    isApp: window.matchMedia('(display-mode: standalone)').matches,
    isPWA: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone,
    referrer: document.referrer,
    userAgent: navigator.userAgent.substring(0, 50) + '...'
  });
  
  // Test 7: Try to access location without user interaction (should fail but gives us info)
  console.log('Testing immediate geolocation call...');
  try {
    navigator.geolocation.getCurrentPosition(
      (pos) => console.log('✅ Immediate call succeeded (unexpected):', pos.coords),
      (err) => console.log('❌ Immediate call failed (expected):', err.code, err.message),
      { enableHighAccuracy: false, timeout: 1000, maximumAge: 0 }
    );
  } catch (e) {
    console.log('❌ Immediate call threw exception:', e);
  }
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
    
    const userAgent = navigator.userAgent;
    const isMobile = isMobileBrowser();
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !isChrome;
    const isChromeIOS = isIOS && isChrome;
    
    console.log('Browser detection:', {
      userAgent: userAgent.substring(0, 100) + '...',
      isIOS,
      isChrome,
      isSafari,
      isChromeIOS
    });
    
    console.log('Platform detection:', {
      isMobile,
      isIOS,
      isAndroid,
      isChromeIOS,
      userAgent: userAgent.substring(0, 100) + '...'
    });
    
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
    
    // Platform-specific options
    let options;
    if (isChromeIOS) {
      // Chrome on iOS - use retry mechanism
      console.log('🔄 Chrome iOS detected - using retry mechanism');
      attemptGeolocationWithRetry(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 0
      }, 3);
      return;
    } else if (isIOS && isSafari) {
      // Safari on iOS - also has issues, use retry mechanism
      console.log('🔄 Safari iOS detected - using retry mechanism');
      attemptGeolocationWithRetry(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 25000,
        maximumAge: 0
      }, 3);
      return;
    } else if (isAndroid) {
      // Android browsers
      options = {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 0
      };
      console.log('Using Android options');
    } else {
      // Desktop
      options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      };
      console.log('Using desktop options');
    }
    
    console.log('Geolocation options:', options);
    console.log('Making geolocation request...');
    
    // Chrome iOS specific workaround - try multiple times with different approaches
    if (isChromeIOS) {
      console.log('🔄 Chrome iOS detected - using retry mechanism');
      attemptGeolocationWithRetry(resolve, reject, options, 3);
      return;
    }
    
    // Add a timeout to detect if the request is hanging
    const requestTimeout = setTimeout(() => {
      console.error('Geolocation request timed out after 25 seconds');
    }, 25000);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(requestTimeout);
        console.log('✅ Location obtained successfully:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        resolve(position);
      },
      (error) => {
        clearTimeout(requestTimeout);
        console.error('❌ Geolocation error details:', {
          code: error.code,
          message: error.message,
          isMobile: isMobile,
          userAgent: navigator.userAgent,
          protocol: location.protocol,
          hostname: location.hostname,
          secureContext: window.isSecureContext
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