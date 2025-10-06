/**
 * Distance calculation utilities for geo-based check-ins
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param distance - Distance in miles
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 0.1) {
    return `${Math.round(distance * 5280)} ft away`;
  } else if (distance < 1) {
    return `${(distance * 10).toFixed(1)} mi away`;
  } else {
    return `${distance.toFixed(1)} mi away`;
  }
}

/**
 * Get cafes within a certain radius and sort by distance
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param cafes - Array of all cafes
 * @param maxDistance - Maximum distance in miles (default: 50)
 * @param limit - Maximum number of cafes to return (default: 10)
 * @returns Array of cafes sorted by distance with distance property added
 */
export function getNearbyCafes(
  userLat: number,
  userLng: number,
  cafes: any[],
  maxDistance: number = 50,
  limit: number = 10
): (any & { distance: number })[] {
  const cafesWithDistance = cafes
    .map(cafe => ({
      ...cafe,
      distance: calculateDistance(userLat, userLng, cafe.latitude, cafe.longitude)
    }))
    .filter(cafe => cafe.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return cafesWithDistance;
}
