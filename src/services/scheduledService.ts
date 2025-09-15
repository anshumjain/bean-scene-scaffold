import { syncGooglePlacesCafes } from './cafeService';
import { ApiResponse } from './types';

/**
 * Main sync function for Houston cafes - runs on API key setup and monthly
 * This function should be called from a Supabase Edge Function with cron scheduling
 */
export async function runGooglePlacesSync(): Promise<ApiResponse<number>> {
  try {
    console.log('Starting Houston cafes sync from Google Places API...');
    
    const syncResult = await syncGooglePlacesCafes();
    
    if (!syncResult.success) {
      throw new Error(syncResult.error || 'Sync failed');
    }
    
    const syncedCount = syncResult.data;
    
    // Log sync results (TODO: Store in analytics table)
    console.log(`Successfully synced ${syncedCount} Houston cafes`);
    
    // TODO: Store sync metrics in Supabase when connected
    // await logSyncMetrics({
    //   syncDate: new Date().toISOString(),
    //   cafesProcessed: syncedCount,
    //   status: 'success'
    // });
    
    return {
      data: syncedCount,
      success: true
    };
  } catch (error) {
    console.error('Cafe sync failed:', error);
    
    // TODO: Store error in analytics table
    // await logSyncMetrics({
    //   syncDate: new Date().toISOString(),
    //   cafesProcessed: 0,
    //   status: 'error',
    //   error: error instanceof Error ? error.message : 'Unknown error'
    // });
    
    return {
      data: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed'
    };
  }
}

/**
 * Initial data load when Google Places API key is first configured
 * This should run immediately when the API key is added to environment variables
 */
export async function onFirstApiKeySetup(): Promise<ApiResponse<string>> {
  try {
    console.log('Google Places API key detected - running initial Houston cafes sync...');
    
    const syncResult = await runGooglePlacesSync();
    
    if (!syncResult.success) {
      throw new Error(syncResult.error || 'Initial sync failed');
    }
    
    const message = `Bean Scene is now live! Successfully imported ${syncResult.data} Houston cafes from Google Places. Monthly updates are scheduled automatically.`;
    
    return {
      data: message,
      success: true
    };
  } catch (error) {
    return {
      data: '',
      success: false,
      error: error instanceof Error ? error.message : 'Initial setup failed'
    };
  }
}

/**
 * Monthly data refresh function
 * Should be called on the 1st of every month via Supabase Edge Function cron job
 */
export async function monthlyDataRefresh(): Promise<ApiResponse<string>> {
  try {
    console.log('Running monthly Houston cafes data refresh...');
    
    const syncResult = await runGooglePlacesSync();
    
    if (!syncResult.success) {
      throw new Error(syncResult.error || 'Monthly refresh failed');
    }
    
    const message = `Monthly refresh completed: ${syncResult.data} cafes updated with latest Google Places data`;
    
    // TODO: Send notification to admin users when Supabase is connected
    
    return {
      data: message,
      success: true
    };
  } catch (error) {
    return {
      data: '',
      success: false,
      error: error instanceof Error ? error.message : 'Monthly refresh failed'
    };
  }
}

/**
 * Check if initial sync has been completed
 */
export async function hasInitialSyncCompleted(): Promise<boolean> {
  try {
    // TODO: Check sync history table in Supabase when connected
    // const { data, error } = await supabase
    //   .from('sync_history')
    //   .select('id')
    //   .eq('sync_type', 'initial')
    //   .eq('status', 'success')
    //   .limit(1);
    
    // return data && data.length > 0;
    
    // For now, return false to indicate sync is needed
    return false;
  } catch (error) {
    console.error('Failed to check sync status:', error);
    return false;
  }
}

/**
 * Get last sync date and status
 */
export async function getLastSyncInfo(): Promise<ApiResponse<{
  lastSync: string | null;
  status: 'success' | 'error' | 'never';
  cafesCount: number;
}>> {
  try {
    // TODO: Query sync history from Supabase when connected
    // const { data, error } = await supabase
    //   .from('sync_history')
    //   .select('*')
    //   .order('created_at', { ascending: false })
    //   .limit(1);
    
    // Mock data for development
    return {
      data: {
        lastSync: null,
        status: 'never',
        cafesCount: 0
      },
      success: true
    };
  } catch (error) {
    return {
      data: {
        lastSync: null,
        status: 'error',
        cafesCount: 0
      },
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sync info'
    };
  }
}

/**
 * Manual sync trigger (for admin use)
 */
export async function triggerManualSync(): Promise<ApiResponse<string>> {
  try {
    console.log('Manual sync triggered by admin...');
    
    const syncResult = await runGooglePlacesSync();
    
    if (!syncResult.success) {
      throw new Error(syncResult.error || 'Manual sync failed');
    }
    
    const message = `Manual sync completed: ${syncResult.data} Houston cafes processed`;
    
    return {
      data: message,
      success: true
    };
  } catch (error) {
    return {
      data: '',
      success: false,
      error: error instanceof Error ? error.message : 'Manual sync failed'
    };
  }
}

/**
 * Utility function to log sync metrics
 * TODO: Implement when Supabase is connected
 */
async function logSyncMetrics(metrics: {
  syncDate: string;
  cafesProcessed: number;
  status: 'success' | 'error';
  error?: string;
}): Promise<void> {
  try {
    // TODO: Insert into Supabase analytics table
    // const { error } = await supabase
    //   .from('sync_history')
    //   .insert(metrics);
    
    console.log('Sync metrics:', metrics);
  } catch (error) {
    console.error('Failed to log sync metrics:', error);
  }
}

/*
 * Supabase Edge Function Example for Scheduled Sync
 * 
 * Create this as sync-houston-cafes.ts in Supabase Edge Functions:
 * 
 * import { runGooglePlacesSync } from '../services/scheduledService.ts';
 * 
 * Deno.serve(async (req) => {
 *   const { method } = req;
 *   
 *   if (method !== 'POST') {
 *     return new Response('Method not allowed', { status: 405 });
 *   }
 *   
 *   try {
 *     const result = await runGooglePlacesSync();
 *     return Response.json(result);
 *   } catch (error) {
 *     return Response.json({ 
 *       success: false, 
 *       error: error.message 
 *     }, { status: 500 });
 *   }
 * });
 * 
 * Add to supabase/functions/cron/cron.ts for monthly scheduling:
 * 
 * import { Cron } from 'https://deno.land/x/cron/cron.ts';
 * 
 * const cron = new Cron();
 * 
 * // Run on 1st of every month at midnight
 * cron.monthly(() => {
 *   fetch('https://your-project.supabase.co/functions/v1/sync-houston-cafes', {
 *     method: 'POST',
 *     headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` }
 *   });
 * }, { date: 1, hour: 0, minute: 0 });
 * 
 * cron.start();
 */