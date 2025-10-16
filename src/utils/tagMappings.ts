/**
 * Tag to Vibe Mappings
 * Converts technical tags to human-readable vibes with emojis
 */

export const TAG_TO_VIBE_MAPPING: Record<string, string> = {
  // Wifi & Tech
  'wifi': '💻 Great wifi',
  'laptop-friendly': '💻 Laptop friendly',
  'student-friendly': '🎓 Student friendly',
  
  // Atmosphere
  'quiet': '🔇 Quiet atmosphere',
  'busy': '👥 Lively crowd',
  'loud': '🔊 Loud atmosphere',
  'cozy': '🛋️ Cozy vibes',
  'study-spot': '📚 Perfect for studying',
  
  // Coffee & Food
  'great-coffee': '☕ Excellent coffee',
  'good-coffee': '☕ Good coffee',
  'coffee': '☕ Coffee',
  'matcha': '🍵 Great matcha',
  'good-pastries': '🥐 Good pastries',
  'pastries': '🥐 Pastries',
  'bakery': '🥖 Fresh bakery',
  'vegan': '🌱 Vegan options',
  'food': '🍽️ Food available',
  'food-options': '🍽️ Food options',
  
  // Seating & Space
  'outdoor-seating': '🌳 Outdoor seating',
  'always-space': '🪑 Always space',
  'wfh-friendly': '💼 Work from home friendly',
  'spacious': '🪑 Spacious',
  
  // Social & Activities
  'date-spot': '💑 Great for dates',
  'pet-friendly': '🐕 Pet friendly',
  'family-friendly': '👨‍👩‍👧‍👦 Family friendly',
  
  // Visual & Aesthetic
  'latte-art': '🎨 Beautiful latte art',
  'instagram-worthy': '📸 Instagram worthy',
  'aesthetic': '✨ Aesthetic vibes',
  
  // Service & Staff
  'friendly-staff': '😊 Friendly staff',
  'fast-service': '⚡ Fast service',
  'good-service': '⭐ Good service',
  
  // Default fallback
  'default': '✨ Nice vibes'
};

/**
 * Convert a tag to a human-readable vibe
 */
export function tagToVibe(tag: string): string {
  const normalizedTag = tag.toLowerCase().trim();
  return TAG_TO_VIBE_MAPPING[normalizedTag] || TAG_TO_VIBE_MAPPING.default;
}

/**
 * Convert multiple tags to vibes
 */
export function tagsToVibes(tags: string[]): string[] {
  return tags.map(tagToVibe);
}

/**
 * Get tags formatted for text-only posts (cleaner display)
 */
export function getTextPostTags(tags: string[]): { 
  mapped: string[], 
  unmapped: string[] 
} {
  const mapped: string[] = [];
  const unmapped: string[] = [];
  
  tags.forEach(tag => {
    const vibe = tagToVibe(tag);
    if (vibe === TAG_TO_VIBE_MAPPING.default) {
      // This is an unmapped tag, show as simple tag
      unmapped.push(tag);
    } else {
      mapped.push(vibe);
    }
  });
  
  return { mapped, unmapped };
}

/**
 * Get all available tags for selection
 */
export function getAllAvailableTags(): string[] {
  return Object.keys(TAG_TO_VIBE_MAPPING).filter(tag => tag !== 'default');
}

/**
 * Get tags that should be shown as small pills (for photo posts)
 */
export function getPillTags(): string[] {
  return [
    'wifi', 'quiet', 'busy', 'cozy', 'study-spot', 'great-coffee',
    'outdoor-seating', 'pet-friendly', 'date-spot', 'laptop-friendly'
  ];
}

/**
 * Check if a post has a photo
 */
export function hasPhoto(post: { imageUrl?: string; imageUrls?: string[] }): boolean {
  const hasSingleImage = post.imageUrl && post.imageUrl !== '' && post.imageUrl !== 'null';
  const hasMultipleImages = post.imageUrls && post.imageUrls.length > 0;
  return Boolean(hasSingleImage || hasMultipleImages);
}

/**
 * Get post layout type based on content
 */
export function getPostLayoutType(post: { 
  imageUrl?: string; 
  imageUrls?: string[]; 
  textReview?: string; 
  tags?: string[];
  cafeName?: string;
}): 'photo' | 'text' | 'minimal' {
  if (hasPhoto(post)) {
    return 'photo';
  }
  
  const hasContent = Boolean(
    post.textReview?.trim() || 
    (post.tags && post.tags.length > 0)
  );
  
  if (hasContent) {
    return 'text';
  }
  
  return 'minimal';
}
