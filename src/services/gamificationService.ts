import { supabase } from '@/integrations/supabase/client';

// XP values for different actions
export const XP_VALUES = {
  CHECK_IN: 10,
  PHOTO_UPLOAD: 5,
  TAG_ADDED: 3,
  REVIEW_WRITTEN: 15,
  NEW_CAFE_BONUS: 5,
  FIRST_DISCOVERER: 50,
} as const;

// Badge definitions
export const BADGE_DEFINITIONS = {
  FIRST_SIP: {
    type: 'first_sip',
    name: 'First Sip',
    description: 'Complete your first check-in',
    condition: (stats: UserStats) => stats.total_checkins >= 1,
    icon: '☕',
    xp: 0,
  },
  COFFEE_EXPLORER: {
    type: 'coffee_explorer',
    name: 'Coffee Explorer',
    description: 'Visit 5 different cafés',
    condition: (stats: UserStats) => stats.total_cafes_visited >= 5,
    icon: '🗺️',
    xp: 0,
  },
  PHOTOGRAPHER: {
    type: 'photographer',
    name: 'Photographer',
    description: 'Share 10 photos',
    condition: (stats: UserStats) => stats.total_photos >= 10,
    icon: '📸',
    xp: 0,
  },
  REVIEWER: {
    type: 'reviewer',
    name: 'Reviewer',
    description: 'Write 5 reviews',
    condition: (stats: UserStats) => stats.total_reviews >= 5,
    icon: '✍️',
    xp: 0,
  },
  PIONEER: {
    type: 'pioneer',
    name: 'Pioneer',
    description: 'Be the first to discover a new café',
    condition: (stats: UserStats) => stats.pioneer_count >= 1,
    icon: '🚀',
    xp: 0,
  },
} as const;

export interface UserStats {
  id: string;
  user_id?: string;
  device_id?: string;
  username?: string;
  total_xp: number;
  current_level: number;
  total_checkins: number;
  total_photos: number;
  total_reviews: number;
  total_cafes_visited: number;
  pioneer_count?: number;
  created_at: string;
  updated_at: string;
}

export interface UserBadge {
  id: string;
  user_id?: string;
  device_id?: string;
  username?: string;
  badge_type: string;
  badge_name: string;
  badge_description?: string;
  earned_at: string;
}

export interface CafeVisit {
  id: string;
  user_id?: string;
  device_id?: string;
  username?: string;
  cafe_id: string;
  visit_count: number;
  first_visit: string;
  last_visit: string;
}

/**
 * Calculate level from XP using simple formula: every 100 XP = new level
 */
export function calculateLevelFromXP(xp: number): number {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

/**
 * Get user stats by user ID, device ID, or username
 */
export async function getUserStats(
  userId?: string,
  deviceId?: string,
  username?: string
): Promise<UserStats | null> {
  try {
    let query = supabase.from('user_stats').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else if (username) {
      query = query.eq('username', username);
    } else {
      return null;
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserStats:', error);
    return null;
  }
}

/**
 * Get or create user stats
 */
export async function getOrCreateUserStats(
  userId?: string,
  deviceId?: string,
  username?: string
): Promise<UserStats | null> {
  try {
    // Try to get existing stats first
    let stats = await getUserStats(userId, deviceId, username);
    
    if (stats) {
      return stats;
    }

    // Create new stats if none exist
    const { data, error } = await supabase
      .from('user_stats')
      .insert({
        user_id: userId,
        device_id: deviceId,
        username: username,
        total_xp: 0,
        current_level: 1,
        total_checkins: 0,
        total_photos: 0,
        total_reviews: 0,
        total_cafes_visited: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user stats:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getOrCreateUserStats:', error);
    return null;
  }
}

/**
 * Award XP to a user
 */
export async function awardXP(
  userId?: string,
  deviceId?: string,
  username?: string,
  xpAmount: number = 0,
  actionType: 'checkin' | 'photo' | 'review' = 'checkin'
): Promise<UserStats | null> {
  try {
    // First get or create user stats
    const stats = await getOrCreateUserStats(userId, deviceId, username);
    if (!stats) {
      return null;
    }

    // Update stats with new XP and action counters
    const updates: any = {
      total_xp: stats.total_xp + xpAmount,
      updated_at: new Date().toISOString(),
    };

    // Increment appropriate counter based on action type
    switch (actionType) {
      case 'checkin':
        updates.total_checkins = stats.total_checkins + 1;
        break;
      case 'photo':
        updates.total_photos = stats.total_photos + 1;
        break;
      case 'review':
        updates.total_reviews = stats.total_reviews + 1;
        break;
    }

    // Calculate new level
    const newLevel = calculateLevelFromXP(updates.total_xp);
    updates.current_level = newLevel;

    // Update the database
    const { data, error } = await supabase
      .from('user_stats')
      .update(updates)
      .eq('id', stats.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user stats:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in awardXP:', error);
    return null;
  }
}

/**
 * Track a cafe visit
 */
export async function trackCafeVisit(
  userId?: string,
  deviceId?: string,
  username?: string,
  cafeId: string
): Promise<CafeVisit | null> {
  try {
    // Check if this is the first visit to this cafe
    let query = supabase.from('cafe_visits').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else if (username) {
      query = query.eq('username', username);
    } else {
      return null;
    }

    query = query.eq('cafe_id', cafeId);

    const { data: existingVisit, error: fetchError } = await query.single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for first visits
      console.error('Error fetching cafe visit:', fetchError);
      return null;
    }

    if (existingVisit) {
      // Update existing visit count
      const { data, error } = await supabase
        .from('cafe_visits')
        .update({
          visit_count: existingVisit.visit_count + 1,
          last_visit: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingVisit.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating cafe visit:', error);
        return null;
      }

      return data;
    } else {
      // Create new visit record
      const { data, error } = await supabase
        .from('cafe_visits')
        .insert({
          user_id: userId,
          device_id: deviceId,
          username: username,
          cafe_id: cafeId,
          visit_count: 1,
          first_visit: new Date().toISOString(),
          last_visit: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating cafe visit:', error);
        return null;
      }

      return data;
    }
  } catch (error) {
    console.error('Error in trackCafeVisit:', error);
    return null;
  }
}

/**
 * Get user's visited cafes count
 */
export async function getCafesVisitedCount(
  userId?: string,
  deviceId?: string,
  username?: string
): Promise<number> {
  try {
    let query = supabase.from('cafe_visits').select('cafe_id', { count: 'exact' });

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else if (username) {
      query = query.eq('username', username);
    } else {
      return 0;
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error fetching cafes visited count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getCafesVisitedCount:', error);
    return 0;
  }
}

/**
 * Get user badges
 */
export async function getUserBadges(
  userId?: string,
  deviceId?: string,
  username?: string
): Promise<UserBadge[]> {
  try {
    let query = supabase.from('user_badges').select('*').order('earned_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else if (username) {
      query = query.eq('username', username);
    } else {
      return [];
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserBadges:', error);
    return [];
  }
}

/**
 * Check if user has a specific badge
 */
export async function hasBadge(
  userId?: string,
  deviceId?: string,
  username?: string,
  badgeType: string
): Promise<boolean> {
  try {
    let query = supabase.from('user_badges').select('id');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else if (username) {
      query = query.eq('username', username);
    } else {
      return false;
    }

    query = query.eq('badge_type', badgeType);

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking badge:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasBadge:', error);
    return false;
  }
}

/**
 * Award a badge to a user
 */
export async function awardBadge(
  userId?: string,
  deviceId?: string,
  username?: string,
  badgeType: string,
  badgeName: string,
  badgeDescription?: string
): Promise<UserBadge | null> {
  try {
    // Check if user already has this badge
    const alreadyHasBadge = await hasBadge(userId, deviceId, username, badgeType);
    if (alreadyHasBadge) {
      return null; // Already has the badge
    }

    const { data, error } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        device_id: deviceId,
        username: username,
        badge_type: badgeType,
        badge_name: badgeName,
        badge_description: badgeDescription,
        earned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error awarding badge:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in awardBadge:', error);
    return null;
  }
}

/**
 * Check and award badges based on current stats
 */
export async function checkAndAwardBadges(
  userId?: string,
  deviceId?: string,
  username?: string
): Promise<UserBadge[]> {
  try {
    const stats = await getUserStats(userId, deviceId, username);
    if (!stats) {
      return [];
    }

    // Get cafes visited count
    const cafesVisitedCount = await getCafesVisitedCount(userId, deviceId, username);
    
    // Update stats with cafes visited count
    const updatedStats = { ...stats, total_cafes_visited: cafesVisitedCount };

    const newBadges: UserBadge[] = [];

    // Check each badge condition
    for (const [key, badge] of Object.entries(BADGE_DEFINITIONS)) {
      const hasThisBadge = await hasBadge(userId, deviceId, username, badge.type);
      
      if (!hasThisBadge && badge.condition(updatedStats)) {
        const awardedBadge = await awardBadge(
          userId,
          deviceId,
          username,
          badge.type,
          badge.name,
          badge.description
        );
        
        if (awardedBadge) {
          newBadges.push(awardedBadge);
        }
      }
    }

    return newBadges;
  } catch (error) {
    console.error('Error in checkAndAwardBadges:', error);
    return [];
  }
}

/**
 * Process a post creation and award appropriate XP and badges
 */
export async function processPostCreation(
  userId?: string,
  deviceId?: string,
  username?: string,
  cafeId?: string,
  hasImage: boolean = false,
  hasReview: boolean = false,
  isFirstDiscoverer: boolean = false
): Promise<{ stats: UserStats | null; newBadges: UserBadge[] }> {
  try {
    let totalXP = XP_VALUES.CHECK_IN;
    
    if (hasImage) {
      totalXP += XP_VALUES.PHOTO_UPLOAD;
    }
    
    if (hasReview) {
      totalXP += XP_VALUES.REVIEW_WRITTEN;
    }
    
    if (isFirstDiscoverer) {
      totalXP += XP_VALUES.FIRST_DISCOVERER;
    }

    // Award XP
    const stats = await awardXP(userId, deviceId, username, totalXP, 'checkin');

    // Track cafe visit if cafe ID provided
    if (cafeId) {
      await trackCafeVisit(userId, deviceId, username, cafeId);
    }

    // Check and award badges
    const newBadges = await checkAndAwardBadges(userId, deviceId, username);

    return { stats, newBadges };
  } catch (error) {
    console.error('Error in processPostCreation:', error);
    return { stats: null, newBadges: [] };
  }
}
