/**
 * Retroactively update badges and XP for existing users
 * This script goes through all existing posts, check-ins, and reviews
 * and awards appropriate XP and badges based on actual activity
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// XP values (matching gamificationService)
const XP_VALUES = {
  CHECK_IN: 10,
  PHOTO_UPLOAD: 5,
  TAG_ADDED: 3,
  REVIEW_WRITTEN: 15,
  NEW_CAFE_BONUS: 5,
  FIRST_DISCOVERER: 50,
};

// Badge definitions (matching gamificationService)
const BADGE_DEFINITIONS = {
  FIRST_SIP: {
    type: 'first_sip',
    name: 'First Sip',
    description: 'Complete your first check-in',
    condition: (stats: any) => stats.total_checkins >= 1,
  },
  FIRST_POST: {
    type: 'first_post',
    name: 'First Post',
    description: 'Share your first post',
    condition: (stats: any) => stats.total_posts >= 1,
  },
  EARLY_ADOPTER: {
    type: 'early_adopter',
    name: 'Early Adopter',
    description: 'Share 3 posts',
    condition: (stats: any) => stats.total_posts >= 3,
  },
  SOCIAL_SHARER: {
    type: 'social_sharer',
    name: 'Social Sharer',
    description: 'Share 10 social posts',
    condition: (stats: any) => stats.total_posts >= 10,
  },
  DETAILED_REVIEWER: {
    type: 'detailed_reviewer',
    name: 'Detailed Reviewer',
    description: 'Write 10 detailed reviews',
    condition: (stats: any) => stats.total_reviews >= 10,
  },
  CAFE_EXPERT: {
    type: 'cafe_expert',
    name: 'Cafe Expert',
    description: 'Check-in at 15 different cafes',
    condition: (stats: any) => stats.total_cafes_visited >= 15,
  },
  COFFEE_EXPLORER: {
    type: 'coffee_explorer',
    name: 'Coffee Explorer',
    description: 'Visit 5 different cafés',
    condition: (stats: any) => stats.total_cafes_visited >= 5,
  },
  PHOTOGRAPHER: {
    type: 'photographer',
    name: 'Photographer',
    description: 'Share 10 photos',
    condition: (stats: any) => stats.total_photos >= 10,
  },
  REVIEWER: {
    type: 'reviewer',
    name: 'Reviewer',
    description: 'Write 5 reviews',
    condition: (stats: any) => stats.total_reviews >= 5,
  },
  CONTENT_CREATOR: {
    type: 'content_creator',
    name: 'Content Creator',
    description: 'Share 25 posts with photos',
    condition: (stats: any) => stats.posts_with_photos >= 25,
  },
};

function calculateLevelFromXP(xp: number): number {
  // Level = floor(XP / 100) + 1
  return Math.floor(xp / 100) + 1;
}

async function getOrCreateUserStats(userId: string | null, deviceId: string | null, username: string | null) {
  // Try to find existing stats
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
  
  const { data: existing } = await query.single();
  
  if (existing) {
    return existing;
  }
  
  // Create new stats (only include columns that exist in database)
  const insertData: any = {
      user_id: userId,
      device_id: deviceId,
      username: username,
      total_xp: 0,
      current_level: 1,
      total_checkins: 0,
      total_reviews: 0,
      total_photos: 0,
      total_cafes_visited: 0,
    };
  
  const { data: newStats, error } = await supabase
    .from('user_stats')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user stats:', error);
    return null;
  }
  
  return newStats;
}

async function hasBadge(userId: string | null, deviceId: string | null, username: string | null, badgeType: string): Promise<boolean> {
  let query = supabase.from('user_badges').select('id').eq('badge_type', badgeType);
  
  if (userId) {
    query = query.eq('user_id', userId);
  } else if (deviceId) {
    query = query.eq('device_id', deviceId);
  } else if (username) {
    query = query.eq('username', username);
  } else {
    return false;
  }
  
  const { data, error } = await query.single();
  
  if (error && error.code !== 'PGRST116') {
    return false;
  }
  
  return !!data;
}

async function awardBadge(userId: string | null, deviceId: string | null, username: string | null, badgeType: string, badgeName: string, badgeDescription: string) {
  const alreadyHas = await hasBadge(userId, deviceId, username, badgeType);
  if (alreadyHas) {
    return null;
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
    console.error(`Error awarding badge ${badgeName}:`, error);
    return null;
  }
  
  return data;
}

async function processUser(userId: string | null, deviceId: string | null, username: string | null) {
  console.log(`\n📊 Processing user: ${username || deviceId || userId}`);
  
  // Get all posts for this user
  let postsQuery = supabase.from('posts').select('*');
  if (userId) {
    postsQuery = postsQuery.eq('user_id', userId);
  } else if (deviceId) {
    postsQuery = postsQuery.eq('device_id', deviceId);
  } else if (username) {
    postsQuery = postsQuery.eq('username', username);
  }
  
  const { data: posts, error: postsError } = await postsQuery;
  
  if (postsError) {
    console.error('Error fetching posts:', postsError);
    return;
  }
  
  // Get all check-ins (posts with rating or review)
  const checkins = posts?.filter(p => p.rating || p.text_review) || [];
  const socialPosts = posts?.filter(p => !p.rating && !p.text_review) || [];
  
  // Count photos
  const postsWithPhotos = posts?.filter(p => p.image_url || (p.image_urls && p.image_urls.length > 0)) || [];
  const totalPhotos = posts?.reduce((sum, p) => {
    if (p.image_urls && Array.isArray(p.image_urls)) {
      return sum + p.image_urls.length;
    }
    return sum + (p.image_url ? 1 : 0);
  }, 0) || 0;
  
  // Count unique cafes visited
  const uniqueCafeIds = new Set(posts?.filter(p => p.cafe_id).map(p => p.cafe_id) || []);
  const cafesVisited = uniqueCafeIds.size;
  
  // Calculate XP
  let totalXP = 0;
  
  // XP from check-ins
  checkins.forEach(checkin => {
    totalXP += XP_VALUES.CHECK_IN;
    if (checkin.text_review) {
      totalXP += XP_VALUES.REVIEW_WRITTEN;
    }
    if (checkin.image_url || (checkin.image_urls && checkin.image_urls.length > 0)) {
      const photoCount = checkin.image_urls?.length || 1;
      totalXP += XP_VALUES.PHOTO_UPLOAD * photoCount;
    }
    if (checkin.tags && Array.isArray(checkin.tags) && checkin.tags.length > 0) {
      totalXP += XP_VALUES.TAG_ADDED * checkin.tags.length;
    }
  });
  
  // XP from social posts
  socialPosts.forEach(post => {
    totalXP += XP_VALUES.CHECK_IN; // Social posts also give base XP
    if (post.image_url || (post.image_urls && post.image_urls.length > 0)) {
      const photoCount = post.image_urls?.length || 1;
      totalXP += XP_VALUES.PHOTO_UPLOAD * photoCount;
    }
    if (post.tags && Array.isArray(post.tags) && post.tags.length > 0) {
      totalXP += XP_VALUES.TAG_ADDED * post.tags.length;
    }
  });
  
  // Get or create user stats
  const stats = await getOrCreateUserStats(userId, deviceId, username);
  if (!stats) {
    console.error('Could not get or create user stats');
    return;
  }
  
  // Update stats - only use columns that exist in current schema
  const newLevel = calculateLevelFromXP(totalXP);
  const updates: any = {
    total_xp: totalXP,
    current_level: newLevel,
    total_checkins: checkins.length,
    total_reviews: checkins.length, // Check-ins count as reviews
    total_photos: totalPhotos,
    total_cafes_visited: cafesVisited,
    updated_at: new Date().toISOString(),
  };
  
  const { error: updateError } = await supabase
    .from('user_stats')
    .update(updates)
    .eq('id', stats.id);
  
  if (updateError) {
    console.error('Error updating stats:', updateError);
    return;
  }
  
  // Get the updated stats to use for badge checking
  const { data: updatedStatsData } = await supabase
    .from('user_stats')
    .select('*')
    .eq('id', stats.id)
    .single();
  
  const finalStats = updatedStatsData || stats;
  
  console.log(`✅ Updated stats:`, {
    total_xp: totalXP,
    level: newLevel,
    checkins: checkins.length,
    posts: posts?.length || 0,
    photos: totalPhotos,
    cafes: cafesVisited,
  });
  
  // Check and award badges
  // Build stats object with calculated values (including ones not in DB yet)
  const updatedStats = {
    ...finalStats,
    total_posts: posts?.length || 0, // Calculate from posts, not from DB column
    posts_with_photos: postsWithPhotos.length, // Calculate from posts, not from DB column
  };
  let badgesAwarded = 0;
  
  for (const [key, badge] of Object.entries(BADGE_DEFINITIONS)) {
    const hasThisBadge = await hasBadge(userId, deviceId, username, badge.type);
    
    if (!hasThisBadge && badge.condition(updatedStats)) {
      const awarded = await awardBadge(userId, deviceId, username, badge.type, badge.name, badge.description);
      if (awarded) {
        badgesAwarded++;
        console.log(`  🏆 Awarded badge: ${badge.name}`);
      }
    }
  }
  
  if (badgesAwarded > 0) {
    console.log(`  ✨ Awarded ${badgesAwarded} new badge(s)`);
  } else {
    console.log(`  ℹ️  No new badges to award`);
  }
}

async function main() {
  console.log('🔄 Starting retroactive badge and XP update...\n');
  
  // Get all unique users from posts
  const { data: allPosts, error: postsError } = await supabase
    .from('posts')
    .select('user_id, device_id, username')
    .not('username', 'is', null);
  
  if (postsError) {
    console.error('Error fetching posts:', postsError);
    return;
  }
  
  // Get unique users
  const uniqueUsers = new Map<string, { userId: string | null; deviceId: string | null; username: string | null }>();
  
  allPosts?.forEach(post => {
    const key = post.username || post.device_id || post.user_id || '';
    if (key && !uniqueUsers.has(key)) {
      uniqueUsers.set(key, {
        userId: post.user_id,
        deviceId: post.device_id,
        username: post.username,
      });
    }
  });
  
  console.log(`Found ${uniqueUsers.size} unique users to process\n`);
  
  let processed = 0;
  for (const [key, user] of uniqueUsers) {
    processed++;
    console.log(`[${processed}/${uniqueUsers.size}]`);
    await processUser(user.userId, user.deviceId, user.username);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ Completed! Processed ${processed} users.`);
}

main().catch(console.error);
