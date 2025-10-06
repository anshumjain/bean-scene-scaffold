import { supabase } from "@/integrations/supabase/client";
import { ApiResponse } from "./types";

export interface DailyActiveUsers {
  date: string;
  count: number;
}

export interface UserGrowth {
  date: string;
  totalUsers: number;
  newUsers: number;
}

export interface EngagementMetrics {
  totalUsers: number;
  totalPosts: number;
  totalCheckins: number;
  totalReviews: number;
  averageRating: number;
  dau: number;
  mau: number;
}

export async function getDailyActiveUsers(days: number = 30): Promise<ApiResponse<DailyActiveUsers[]>> {
  try {
    const { data, error } = await supabase
      .from('user_activities')
      .select('created_at, user_id, device_id')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date and count unique users
    const dailyCounts: { [key: string]: Set<string> } = {};
    
    data?.forEach(activity => {
      const date = new Date(activity.created_at).toISOString().split('T')[0];
      if (!dailyCounts[date]) {
        dailyCounts[date] = new Set();
      }
      // Use user_id if available, otherwise device_id
      const identifier = activity.user_id || activity.device_id;
      if (identifier) {
        dailyCounts[date].add(identifier);
      }
    });

    const result = Object.entries(dailyCounts).map(([date, users]) => ({
      date,
      count: users.size
    }));

    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get daily active users',
      data: []
    };
  }
}

export async function getMonthlyActiveUsers(): Promise<ApiResponse<number>> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('user_activities')
      .select('user_id, device_id')
      .gte('created_at', thirtyDaysAgo);

    if (error) throw error;

    // Count unique users
    const uniqueUsers = new Set<string>();
    data?.forEach(activity => {
      const identifier = activity.user_id || activity.device_id;
      if (identifier) {
        uniqueUsers.add(identifier);
      }
    });

    return { success: true, data: uniqueUsers.size };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get monthly active users',
      data: 0
    };
  }
}

export async function getUserGrowth(days: number = 30): Promise<ApiResponse<UserGrowth[]>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const dailyGrowth: { [key: string]: number } = {};
    let cumulative = 0;
    
    data?.forEach(user => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      dailyGrowth[date] = (dailyGrowth[date] || 0) + 1;
    });

    const result = Object.entries(dailyGrowth).map(([date, newUsers]) => {
      cumulative += newUsers;
      return {
        date,
        totalUsers: cumulative,
        newUsers
      };
    });

    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get user growth',
      data: []
    };
  }
}

export async function getEngagementMetrics(): Promise<ApiResponse<EngagementMetrics>> {
  try {
    const [
      usersResult,
      postsResult,
      activitiesResult,
      reviewsResult
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('posts').select('id, rating', { count: 'exact' }),
      supabase.from('user_activities').select('id, activity_type', { count: 'exact' }),
      supabase.from('cafe_reviews').select('id, rating', { count: 'exact' })
    ]);

    if (usersResult.error) throw usersResult.error;
    if (postsResult.error) throw postsResult.error;
    if (activitiesResult.error) throw activitiesResult.error;
    if (reviewsResult.error) throw reviewsResult.error;

    const totalUsers = usersResult.count || 0;
    const totalPosts = postsResult.count || 0;
    const totalReviews = reviewsResult.count || 0;
    
    // Count check-ins from activities
    const checkins = activitiesResult.data?.filter(a => a.activity_type === 'check-in').length || 0;
    
    // Calculate average rating
    const allRatings = [
      ...(postsResult.data?.map(p => p.rating) || []),
      ...(reviewsResult.data?.map(r => r.rating) || [])
    ];
    const averageRating = allRatings.length > 0 
      ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length 
      : 0;

    // Get DAU and MAU
    const dauResult = await getDailyActiveUsers(1);
    const mauResult = await getMonthlyActiveUsers();
    
    const dau = dauResult.success ? (dauResult.data[0]?.count || 0) : 0;
    const mau = mauResult.success ? mauResult.data : 0;

    return {
      success: true,
      data: {
        totalUsers,
        totalPosts,
        totalCheckins: checkins,
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        dau,
        mau
      }
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get engagement metrics',
      data: {
        totalUsers: 0,
        totalPosts: 0,
        totalCheckins: 0,
        totalReviews: 0,
        averageRating: 0,
        dau: 0,
        mau: 0
      }
    };
  }
}
