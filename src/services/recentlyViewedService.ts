import { Cafe } from './types';

const RECENTLY_VIEWED_KEY = 'recently_viewed_cafes';
const MAX_RECENT_ITEMS = 10;

interface RecentlyViewedCafe extends Pick<Cafe, 'id' | 'placeId' | 'name' | 'neighborhood' | 'photos' | 'rating' | 'tags'> {
  viewedAt: string;
}

/**
 * Get recently viewed cafes from localStorage
 */
export function getRecentlyViewed(): RecentlyViewedCafe[] {
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading recently viewed cafes:', error);
    return [];
  }
}

/**
 * Add a cafe to recently viewed list
 * Removes duplicates and maintains chronological order (newest first)
 */
export function addToRecentlyViewed(cafe: Cafe): void {
  try {
    const recentItem: RecentlyViewedCafe = {
      id: cafe.id,
      placeId: cafe.placeId,
      name: cafe.name,
      neighborhood: cafe.neighborhood,
      photos: cafe.photos,
      rating: cafe.rating,
      tags: cafe.tags,
      viewedAt: new Date().toISOString()
    };

    let recent = getRecentlyViewed();
    
    // Remove existing entry if present
    recent = recent.filter(item => item.placeId !== cafe.placeId);
    
    // Add to beginning of array
    recent.unshift(recentItem);
    
    // Keep only the most recent items
    recent = recent.slice(0, MAX_RECENT_ITEMS);
    
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recent));
  } catch (error) {
    console.error('Error saving recently viewed cafe:', error);
  }
}

/**
 * Clear all recently viewed cafes
 */
export function clearRecentlyViewed(): void {
  try {
    localStorage.removeItem(RECENTLY_VIEWED_KEY);
  } catch (error) {
    console.error('Error clearing recently viewed cafes:', error);
  }
}

/**
 * Remove a specific cafe from recently viewed
 */
export function removeFromRecentlyViewed(placeId: string): void {
  try {
    const recent = getRecentlyViewed();
    const filtered = recent.filter(item => item.placeId !== placeId);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from recently viewed cafes:', error);
  }
}
