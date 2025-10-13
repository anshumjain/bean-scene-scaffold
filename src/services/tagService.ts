import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from './userService';

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
    console.log('Getting popular tags from posts...');
    
    // Get all posts with their tags
    const { data: posts, error } = await supabase
      .from('posts')
      .select('tags, created_at')
      .not('tags', 'is', null);

    if (error) {
      console.error('Error fetching posts for tag analysis:', error);
      return [];
    }

    console.log('Posts with tags:', posts?.length || 0);

    // Also get tags directly from cafes
    console.log('Getting tags from cafes...');
    const { data: cafes, error: cafeError } = await supabase
      .from('cafes')
      .select('tags')
      .not('tags', 'is', null);

    if (cafeError) {
      console.error('Error fetching cafes for tag analysis:', cafeError);
    } else {
      console.log('Cafes with tags:', cafes?.length || 0);
    }

    // Count tag usage from both posts and cafes
    const tagCounts: Record<string, { total: number; recent: number }> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count tags from posts
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

    // Count tags from cafes (each cafe tag counts as 1 usage)
    cafes?.forEach(cafe => {
      if (cafe.tags && Array.isArray(cafe.tags)) {
        cafe.tags.forEach(tag => {
          if (!tagCounts[tag]) {
            tagCounts[tag] = { total: 0, recent: 0 };
          }
          tagCounts[tag].total++;
          // Cafe tags don't have timestamps, so we don't count them as recent
        });
      }
    });

    console.log('Total unique tags found:', Object.keys(tagCounts).length);
    console.log('Tag counts:', tagCounts);

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
 * Get top tags for a specific cafe based on recent posts and direct cafe tags
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
    }

    // Get direct cafe tags
    const { data: cafe, error: cafeError } = await supabase
      .from('cafes')
      .select('tags')
      .eq('id', cafeId)
      .single();

    if (cafeError) {
      console.error('Error fetching cafe tags:', cafeError);
    }

    // Count tag usage from posts
    const tagCounts: Record<string, number> = {};
    
    posts?.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // Add direct cafe tags (each counts as 1)
    if (cafe?.tags && Array.isArray(cafe.tags)) {
      cafe.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }

    // If no tags found, return empty array
    if (Object.keys(tagCounts).length === 0) {
      return [];
    }

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
 * Add tags directly to a cafe without creating a post
 * Updates the cafe's tags array directly
 */
export async function addTagsToCafe(cafeId: string, tags: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate all tags
    const normalizedTags = tags.map(tag => normalizeTag(tag)).filter(tag => tag);
    
    if (normalizedTags.length === 0) {
      return { success: false, error: 'No valid tags provided' };
    }
    
    // Get current cafe tags
    const { data: cafe, error: cafeError } = await supabase
      .from('cafes')
      .select('tags')
      .eq('id', cafeId)
      .single();
    
    if (cafeError || !cafe) {
      return { success: false, error: 'Cafe not found' };
    }
    
    // Merge new tags with existing tags (avoid duplicates)
    const existingTags = cafe.tags || [];
    const allTags = [...new Set([...existingTags, ...normalizedTags])];
    
    // Update cafe with new tags
    const { error: updateError } = await supabase
      .from('cafes')
      .update({ tags: allTags })
      .eq('id', cafeId);
    
    if (updateError) {
      console.error('Error updating cafe tags:', updateError);
      return { success: false, error: updateError.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error adding tags to cafe:', error);
    return { success: false, error: 'Failed to add tags' };
  }
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
