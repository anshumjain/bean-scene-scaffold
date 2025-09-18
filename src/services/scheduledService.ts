// src/services/scheduledService.ts
import { syncGooglePlacesCafes } from './cafeService';
import { ApiResponse } from './types';

/**
 * Runs the main Google Places sync for Houston cafes
 * Should be triggered via Supabase Edge Function (cron job)
 */
export async function runGooglePlacesSync(): Promise<ApiResponse<number>> {
  try {
    console.log('[ScheduledService] Starting Houston cafes sync...');
    
    const result = await syncGooglePlacesCafes();
    
    if (!result.success) {
      throw new Error(result.error || 'Sync failed');
    }
    
    const syncedCount = result.data;
    console.log(`[ScheduledService] Successfully synced ${syncedCount} cafes`);
    
    // TODO: log sync metrics to Supabase if connected
    // await logSyncMetrics({ syncDate: new Date().toISOString(), cafesProcessed: syncedCount, status: 'success' });
    
    return { data: syncedCount, success: true };
    
  } catch (error) {
    console.error('[ScheduledService] Sync failed:', error);
    return { data: 0, success: false, error: error instanceof Error ? error.message : 'Sync failed' };
  }
}

/**
 * Run initial sync on API key setup
 */
export async function onFirstApiKeySetup(): Promise<ApiResponse<string>> {
  const syncResult = await runGooglePlacesSync();
  if (!syncResult.success) {
    return { data: '', success: false, error: syncResult.error || 'Initial sync failed' };
  }
  return { 
    data: `Initial sync complete! Imported ${syncResult.data} Houston cafes. Monthly updates scheduled.`, 
    success: true 
  };
}

/**
 * Run monthly refresh (cron)
 */
export async function monthlyDataRefresh(): Promise<ApiResponse<string>> {
  const syncResult = await runGooglePlacesSync();
  if (!syncResult.success) {
    return { data: '', success: false, error: syncResult.error || 'Monthly refresh failed' };
  }
  return { data: `Monthly refresh completed: ${syncResult.data} cafes updated`, success: true };
}

/**
 * Manual sync trigger (admin)
 */
export async function triggerManualSync(): Promise<ApiResponse<string>> {
  const syncResult = await runGooglePlacesSync();
  if (!syncResult.success) {
    return { data: '', success: false, error: syncResult.error || 'Manual sync failed' };
  }
  return { data: `Manual sync completed: ${syncResult.data} cafes processed`, success: true };
}

/**
 * Utility: check if initial sync completed
 */
export async function hasInitialSyncCompleted(): Promise<boolean> {
  // TODO: implement Supabase query to check sync history
  return false;
}

/**
 * Utility: get last sync info
 */
export async function getLastSyncInfo(): Promise<ApiResponse<{ lastSync: string | null; status: 'success' | 'error' | 'never'; cafesCount: number }>> {
  // TODO: implement Supabase query to get last sync
  return { data: { lastSync: null, status: 'never', cafesCount: 0 }, success: true };
}

/**
 * Optional: log metrics
 */
async function logSyncMetrics(metrics: { syncDate: string; cafesProcessed: number; status: 'success' | 'error'; error?: string }): Promise<void> {
  // TODO: insert metrics into Supabase
  console.log('[ScheduledService] Sync metrics:', metrics);
}
