/**
 * Emoji placeholders for cafe images
 * Provides deterministic emoji selection based on cafe ID
 */

const EMOJI_OPTIONS = ['☕', '🥐', '🍰', '🥯', '🧁', '🍪', '🥤'];

/**
 * Get a deterministic emoji for a cafe based on its ID
 * @param cafeId - The cafe's unique identifier
 * @returns A coffee-themed emoji
 */
export function getCafeEmoji(cafeId: string | number): string {
  const id = typeof cafeId === 'string' ? cafeId : cafeId.toString();
  
  // Create a simple hash from the cafe ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get emoji index
  const emojiIndex = Math.abs(hash) % EMOJI_OPTIONS.length;
  return EMOJI_OPTIONS[emojiIndex];
}

/**
 * Generate emoji placeholder component props
 * @param cafeId - The cafe's unique identifier
 * @param cafeName - The cafe's name (for alt text)
 * @returns Props for rendering emoji placeholder
 */
export function getEmojiPlaceholderProps(cafeId: string | number, cafeName: string) {
  const emoji = getCafeEmoji(cafeId);
  
  return {
    emoji,
    altText: `${cafeName} - Coffee emoji placeholder`,
    className: "w-full h-full flex items-center justify-center bg-gradient-to-br from-[#8b5a3c] to-[#6b4423] text-white text-6xl rounded-lg shadow-lg"
  };
}
