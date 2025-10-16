/**
 * Mobile Location Test Utility
 * 
 * This utility helps test and debug location functionality on mobile browsers
 */

export interface LocationTestResult {
  isSupported: boolean;
  hasPermission: boolean;
  isSecure: boolean;
  userAgent: string;
  isMobile: boolean;
  error?: string;
}

/**
 * Test mobile location capabilities
 */
export async function testMobileLocation(): Promise<LocationTestResult> {
  const result: LocationTestResult = {
    isSupported: false,
    hasPermission: false,
    isSecure: false,
    userAgent: navigator.userAgent,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  };

  // Check if geolocation is supported
  result.isSupported = !!navigator.geolocation;

  // Check if we're on a secure connection
  result.isSecure = location.protocol === 'https:' || location.hostname === 'localhost';

  if (!result.isSupported) {
    result.error = 'Geolocation is not supported by this browser';
    return result;
  }

  if (!result.isSecure && result.isMobile) {
    result.error = 'Location access requires HTTPS on mobile browsers';
    return result;
  }

  // Test permission by making a quick location request
  try {
    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          result.hasPermission = true;
          resolve();
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              result.error = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              result.error = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              result.error = 'Location request timed out';
              break;
            default:
              result.error = 'Unknown location error';
              break;
          }
          resolve(); // Don't reject, just note the error
        },
        {
          timeout: 5000,
          enableHighAccuracy: false,
          maximumAge: 60000
        }
      );
    });
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

/**
 * Get mobile-friendly location error message
 */
export function getMobileLocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access denied. Please enable location permissions in your browser settings and try again.';
    case error.POSITION_UNAVAILABLE:
      return 'Location information unavailable. Please check that your device has location services enabled.';
    case error.TIMEOUT:
      return 'Location request timed out. Please try again in a moment.';
    default:
      return 'An unknown error occurred while retrieving your location.';
  }
}

/**
 * Check if current environment supports location features
 */
export function isLocationSupported(): boolean {
  return !!(
    navigator.geolocation && 
    (location.protocol === 'https:' || location.hostname === 'localhost')
  );
}

/**
 * Get mobile browser detection
 */
export function isMobileBrowser(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
