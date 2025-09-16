import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './types';

interface ApiUsageLog {
  id: string;
  api_service: string;
  endpoint: string;
  request_count: number;
  date: string;
  created_at: string;
}

interface UsageStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  dailyLimit: number;
  isNearLimit: boolean;
  remainingCalls: number;
}

/**
 * API usage monitoring service with placeholder functionality
 */
export class MonitoringService {
  private static DAILY_LIMITS = {
    google_places: 1000,
    cloudinary: 2000,
    general: 5000
  };

  /**
   * Log API usage (placeholder implementation)
   */
  static async logApiUsage(
    service: string,
    endpoint: string,
    count: number = 1
  ): Promise<ApiResponse<boolean>> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if log exists for today
      const { data: existingLog, error: selectError } = await supabase
        .from('api_usage_logs')
        .select('*')
        .eq('api_service', service)
        .eq('endpoint', endpoint)
        .eq('date', today)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existingLog) {
        // Update existing log
        const { error: updateError } = await supabase
          .from('api_usage_logs')
          .update({ 
            request_count: existingLog.request_count + count 
          })
          .eq('id', existingLog.id);

        if (updateError) throw updateError;
      } else {
        // Create new log entry
        const { error: insertError } = await supabase
          .from('api_usage_logs')
          .insert({
            api_service: service,
            endpoint,
            request_count: count,
            date: today
          });

        if (insertError) throw insertError;
      }

      return {
        data: true,
        success: true
      };
    } catch (error) {
      return {
        data: false,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log API usage'
      };
    }
  }

  /**
   * Get usage statistics for a service
   */
  static async getUsageStats(service: string): Promise<ApiResponse<UsageStats>> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      // Get usage data
      const { data: logs, error } = await supabase
        .from('api_usage_logs')
        .select('request_count, date')
        .eq('api_service', service)
        .gte('date', monthAgo.toISOString().split('T')[0]);

      if (error) throw error;

      const todayUsage = logs
        .filter(log => log.date === today)
        .reduce((sum, log) => sum + log.request_count, 0);

      const weekUsage = logs
        .filter(log => log.date >= weekAgo.toISOString().split('T')[0])
        .reduce((sum, log) => sum + log.request_count, 0);

      const monthUsage = logs
        .reduce((sum, log) => sum + log.request_count, 0);

      const dailyLimit = this.DAILY_LIMITS[service as keyof typeof this.DAILY_LIMITS] || this.DAILY_LIMITS.general;
      const remainingCalls = Math.max(0, dailyLimit - todayUsage);
      const isNearLimit = (todayUsage / dailyLimit) >= 0.8; // 80% threshold

      const stats: UsageStats = {
        today: todayUsage,
        thisWeek: weekUsage,
        thisMonth: monthUsage,
        dailyLimit,
        isNearLimit,
        remainingCalls
      };

      return {
        data: stats,
        success: true
      };
    } catch (error) {
      return {
        data: {} as UsageStats,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get usage stats'
      };
    }
  }

  /**
   * Check if service is within usage limits
   */
  static async checkUsageLimits(service: string): Promise<ApiResponse<{ canProceed: boolean; reason?: string }>> {
    try {
      const statsResult = await this.getUsageStats(service);
      if (!statsResult.success) {
        throw new Error(statsResult.error);
      }

      const stats = statsResult.data;
      
      if (stats.remainingCalls <= 0) {
        return {
          data: {
            canProceed: false,
            reason: `Daily limit of ${stats.dailyLimit} calls exceeded for ${service}`
          },
          success: true
        };
      }

      if (stats.isNearLimit) {
        console.warn(`${service} API usage near limit: ${stats.today}/${stats.dailyLimit} calls used`);
      }

      return {
        data: { canProceed: true },
        success: true
      };
    } catch (error) {
      return {
        data: { canProceed: false, reason: 'Unable to check usage limits' },
        success: false,
        error: error instanceof Error ? error.message : 'Limit check failed'
      };
    }
  }

  /**
   * Get daily usage trend for dashboard
   */
  static async getDailyUsageTrend(service: string, days: number = 30): Promise<ApiResponse<Array<{ date: string; usage: number }>>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: logs, error } = await supabase
        .from('api_usage_logs')
        .select('request_count, date')
        .eq('api_service', service)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      // Group by date and sum usage
      const trendData = logs.reduce((acc, log) => {
        const existing = acc.find(item => item.date === log.date);
        if (existing) {
          existing.usage += log.request_count;
        } else {
          acc.push({ date: log.date, usage: log.request_count });
        }
        return acc;
      }, [] as Array<{ date: string; usage: number }>);

      return {
        data: trendData,
        success: true
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get usage trend'
      };
    }
  }
}