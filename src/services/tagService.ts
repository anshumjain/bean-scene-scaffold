import { supabase } from '@/integrations/supabase/client';

export interface TagStats {
  tag: string;
  count: number;
  recent_count: number; // Last 30 days
  trending: boolean;
}

/**
 * Get popular tags based on usage in posts
 * Updates dynamically as users post and check-in
 */
export async function getPopularTags(limit: number = 8): Promise<TagStats[]> {
  try {
    // Get all posts with their tags
    const { data: posts, error } = await supabase
      .from('posts')
      .select('tags, created_at')
      .not('tags', 'is', null);

    if (error) {
      console.error('Error fetching posts for tag analysis:', error);
      return [];
    }

    // Count tag usage
    const tagCounts: Record<string, { total: number; recent: number }> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    posts?.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          if (!tagCounts[tag]) {
            tagCounts[tag] = { total: 0, recent: 0 };
          }
          tagCounts[tag].total++;
          
          // Count recent usage
          if (new Date(post.created_at) > thirtyDaysAgo) {
            tagCounts[tag].recent++;
          }
        });
      }
    });

    // Convert to array and sort by popularity
    const tagStats: TagStats[] = Object.entries(tagCounts).map(([tag, counts]) => ({
      tag,
      count: counts.total,
      recent_count: counts.recent,
      trending: counts.recent > counts.total * 0.3 // Trending if 30% of usage is recent
    }));

    // Sort by total count, then by recent count
    tagStats.sort((a, b) => {
      if (a.count !== b.count) {
        return b.count - a.count;
      }
      return b.recent_count - a.recent_count;
    });

    return tagStats.slice(0, limit);
  } catch (error) {
    console.error('Error getting popular tags:', error);
    return [];
  }
}

/**
 * Get tag suggestions for autocomplete
 * Returns existing tags that match the input
 */
export async function getTagSuggestions(input: string): Promise<string[]> {
  try {
    if (!input || input.length < 2) {
      return [];
    }

    // Get all unique tags from posts
    const { data: posts, error } = await supabase
      .from('posts')
      .select('tags')
      .not('tags', 'is', null);

    if (error) {
      console.error('Error fetching posts for tag suggestions:', error);
      return [];
    }

    // Extract and normalize all tags
    const allTags = new Set<string>();
    posts?.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          allTags.add(tag.toLowerCase().trim());
        });
      }
    });

    // Filter tags that match input
    const normalizedInput = input.toLowerCase().trim();
    const suggestions = Array.from(allTags)
      .filter(tag => tag.includes(normalizedInput))
      .sort((a, b) => {
        // Prioritize exact matches and tags starting with input
        const aStartsWith = a.startsWith(normalizedInput);
        const bStartsWith = b.startsWith(normalizedInput);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 10); // Limit to 10 suggestions

    return suggestions;
  } catch (error) {
    console.error('Error getting tag suggestions:', error);
    return [];
  }
}

/**
 * Normalize a tag (lowercase, trim, replace spaces with hyphens)
 */
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') // Remove special characters except hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Get top 3 tags for a specific cafe based on recent posts
 */
export async function getCafeTopTags(cafeId: string, limit: number = 3): Promise<string[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all posts for this cafe in the last 30 days
    const { data: posts, error } = await supabase
      .from('posts')
      .select('tags, created_at')
      .eq('cafe_id', cafeId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .not('tags', 'is', null);

    if (error) {
      console.error('Error fetching cafe posts for tag analysis:', error);
      return [];
    }

    if (!posts || posts.length === 0) {
      return [];
    }

    // Count tag usage
    const tagCounts: Record<string, number> = {};
    
    posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // Convert to array and sort by usage count
    const sortedTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([tag]) => tag)
      .slice(0, limit);

    return sortedTags;
  } catch (error) {
    console.error('Error getting cafe top tags:', error);
    return [];
  }
}

/**
 * Validate a tag
 */
export function validateTag(tag: string): { valid: boolean; error?: string } {
  const normalized = normalizeTag(tag);
  
  if (!normalized) {
    return { valid: false, error: 'Tag cannot be empty' };
  }
  
  if (normalized.length < 2) {
    return { valid: false, error: 'Tag must be at least 2 characters' };
  }
  
  if (normalized.length > 20) {
    return { valid: false, error: 'Tag must be less than 20 characters' };
  }
  
  return { valid: true };
}

/**
 * Add tags directly to a cafe without requiring a check-in
 * Creates a lightweight post with just the tags
 */
export async function addTagsToCafe(cafeId: string, tags: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate all tags
    const normalizedTags = tags.map(tag => normalizeTag(tag)).filter(tag => tag);
    
    if (normalizedTags.length === 0) {
      return { success: false, error: 'No valid tags provided' };
    }
    
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();
    
    // Get username (works for both authenticated and anonymous users)
    const username = await getUsername();
    
    // Get or create user profile (only for authenticated users)
    let userProfile = null;
    if (user) {
      let { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!profile) {
        // Create user profile if it doesn't exist
        const { data: newProfile, error: profileError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
            email: user.email || '',
          })
          .select('id')
          .single();
        
        if (profileError) throw new Error(profileError.message);
        profile = newProfile;
      }
      userProfile = profile;
    }
    
    // Get cafe details for place_id
    const { data: cafe, error: cafeError } = await supabase
      .from('cafes')
      .select('place_id')
      .eq('id', cafeId)
      .single();
    
    if (cafeError || !cafe) {
      return { success: false, error: 'Cafe not found' };
    }
    
    // Create a lightweight post with just the tags
    const postData = {
      user_id: userProfile?.id || null,
      cafe_id: cafeId,
      place_id: cafe.place_id || '', // Handle case where place_id might be null
      image_url: '', // No image for direct tagging
      image_urls: [], // No images for direct tagging
      rating: 0, // No rating for direct tagging
      text_review: `Added tags: ${normalizedTags.join(', ')}`,
      tags: normalizedTags,
      username: username.success ? username.data : null,
      device_id: deviceId,
      source: 'user',
      photo_source: 'user'
    };
    
    const { error: insertError } = await supabase
      .from('posts')
      .insert(postData);
    
    if (insertError) {
      console.error('Error adding tags to cafe:', insertError);
      return { success: false, error: insertError.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error adding tags to cafe:', error);
    return { success: false, error: 'Failed to add tags' };
  }
}

/**
 * Get device ID for anonymous users
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

/**
 * Get username for current user
 */
async function getUsername(): Promise<{ success: boolean; data?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // For authenticated users, get username from profile
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('auth_user_id', user.id)
        .single();
      
      return { success: true, data: profile?.name || user.email?.split('@')[0] || 'Anonymous' };
    } else {
      // For anonymous users, get from localStorage
      let username = localStorage.getItem('username');
      if (!username) {
        username = 'Anonymous';
        localStorage.setItem('username', username);
      }
      return { success: true, data: username };
    }
  } catch (error) {
    return { success: false };
  }
}
