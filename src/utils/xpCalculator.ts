/**
 * XP Calculation System
 * Frontend preview calculation for user feedback
 * Supports both Post (social) and Check-in (formal review) modes
 */

export type ShareMode = 'post' | 'checkin';

export interface XPCalculationInput {
  mode: ShareMode;
  hasPhoto?: boolean;
  hasCaption?: boolean;
  hasCafe?: boolean;
  hasRating?: boolean;
  tagsCount?: number;
  isGPSVerified?: boolean;
  isFirstTimeCafe?: boolean;
}

export interface XPCalculationResult {
  mode: ShareMode;
  baseXP: number;
  photoXP: number;
  captionXP: number;
  cafeXP: number;
  ratingXP: number;
  tagsXP: number;
  gpsXP: number;
  reviewXP: number;
  firstTimeCafeXP: number;
  totalXP: number;
  breakdown: string[];
}

/**
 * XP Values for different modes
 */
const XP_VALUES = {
  // Post Mode (Social Sharing)
  POST: {
    BASE: 10,
    PHOTO: 5,
    CAPTION: 5,
    CAFE_TAG: 5,
    RATING: 3,
    TAGS_PER: 2,
    TAGS_MAX: 10,
    GPS_VERIFIED: 5,
  },
  // Check-in Mode (Formal Reviews)
  CHECKIN: {
    BASE: 15,
    REVIEW: 20,
    RATING: 5,
    PHOTO: 5,
    TAGS_PER: 2,
    TAGS_MAX: 10,
    GPS_VERIFIED: 5,
    FIRST_TIME_CAFE: 10,
  }
} as const;

/**
 * Calculate XP for a post (frontend preview)
 */
export function calculateXP(input: XPCalculationInput): XPCalculationResult {
  const {
    mode,
    hasPhoto = false,
    hasCaption = false,
    hasCafe = false,
    hasRating = false,
    tagsCount = 0,
    isGPSVerified = false,
    isFirstTimeCafe = false
  } = input;

  const values = mode === 'post' ? XP_VALUES.POST : XP_VALUES.CHECKIN;
  
  // Base XP (different for post vs check-in)
  const baseXP = values.BASE;
  
  // Photo bonus (same for both modes)
  const photoXP = hasPhoto ? values.PHOTO : 0;
  
  // Caption/Review bonus
  const captionXP = mode === 'post' && hasCaption ? values.CAPTION : 0;
  const reviewXP = mode === 'checkin' && hasCaption ? values.REVIEW : 0;
  
  // Cafe tagging bonus (only for post mode)
  const cafeXP = mode === 'post' && hasCafe ? values.CAFE_TAG : 0;
  
  // Rating bonus (different values for each mode)
  const ratingXP = hasRating ? values.RATING : 0;
  
  // Tags bonus (same for both modes)
  const tagsXP = Math.min(tagsCount * values.TAGS_PER, values.TAGS_MAX);
  
  // GPS verification bonus (same for both modes)
  const gpsXP = isGPSVerified ? values.GPS_VERIFIED : 0;
  
  // First time cafe bonus (only for check-in mode)
  const firstTimeCafeXP = mode === 'checkin' && isFirstTimeCafe ? values.FIRST_TIME_CAFE : 0;
  
  const totalXP = baseXP + photoXP + captionXP + reviewXP + cafeXP + ratingXP + tagsXP + gpsXP + firstTimeCafeXP;
  
  // Create breakdown for display
  const breakdown: string[] = [];
  const modeLabel = mode === 'post' ? 'Post' : 'Check-in';
  breakdown.push(`${modeLabel} base: +${baseXP} XP`);
  
  if (photoXP > 0) breakdown.push(`Photo: +${photoXP} XP`);
  if (captionXP > 0) breakdown.push(`Caption: +${captionXP} XP`);
  if (reviewXP > 0) breakdown.push(`Review: +${reviewXP} XP`);
  if (cafeXP > 0) breakdown.push(`Cafe tagged: +${cafeXP} XP`);
  if (ratingXP > 0) breakdown.push(`Rating: +${ratingXP} XP`);
  if (tagsXP > 0) breakdown.push(`Tags (${tagsCount}): +${tagsXP} XP`);
  if (gpsXP > 0) breakdown.push(`GPS verified: +${gpsXP} XP`);
  if (firstTimeCafeXP > 0) breakdown.push(`First visit: +${firstTimeCafeXP} XP`);
  
  return {
    mode,
    baseXP,
    photoXP,
    captionXP,
    cafeXP,
    ratingXP,
    tagsXP,
    gpsXP,
    reviewXP,
    firstTimeCafeXP,
    totalXP,
    breakdown
  };
}

/**
 * Calculate XP from post data
 */
export function calculateXPFromPost(post: {
  mode: ShareMode;
  imageFile?: File | null;
  imageFiles?: File[];
  caption?: string;
  cafeId?: string | null;
  rating?: number;
  tags?: string[];
  location?: { latitude: number; longitude: number };
  cafeLocation?: { latitude: number; longitude: number };
  isFirstTimeCafe?: boolean;
}): XPCalculationResult {
  const hasPhoto = Boolean(
    post.imageFile || 
    (post.imageFiles && post.imageFiles.length > 0)
  );
  
  const hasCaption = Boolean(post.caption && post.caption.trim().length >= 20);
  
  const hasCafe = Boolean(post.cafeId);
  
  const hasRating = Boolean(post.rating && post.rating > 0);
  
  const tagsCount = post.tags ? post.tags.length : 0;
  
  // Check GPS verification (within 100 meters of cafe)
  let isGPSVerified = false;
  if (post.location && post.cafeLocation && hasCafe) {
    const distance = calculateDistance(
      post.location.latitude,
      post.location.longitude,
      post.cafeLocation.latitude,
      post.cafeLocation.longitude
    );
    isGPSVerified = distance <= 0.1; // 100 meters = 0.1 km
  }
  
  return calculateXP({
    mode: post.mode,
    hasPhoto,
    hasCaption,
    hasCafe,
    hasRating,
    tagsCount,
    isGPSVerified,
    isFirstTimeCafe: post.isFirstTimeCafe
  });
}

/**
 * Calculate distance between two coordinates (in kilometers)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
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
 * Get XP preview text for UI
 */
export function getXPPreviewText(result: XPCalculationResult): string {
  if (result.totalXP === result.baseXP) {
    return `${result.totalXP} XP`;
  }
  return `${result.totalXP} XP (${result.breakdown.length - 1} bonuses)`;
}

/**
 * Get detailed XP breakdown for tooltip
 */
export function getXPBreakdownText(result: XPCalculationResult): string {
  return result.breakdown.join('\n');
}
