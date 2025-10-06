import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { googleAnalytics } from '@/services/googleAnalyticsService';

/**
 * Hook to automatically track page views and provide analytics utilities
 */
export function useGoogleAnalytics() {
  const location = useLocation();

  // Track page views automatically
  useEffect(() => {
    googleAnalytics.trackPageView(location.pathname + location.search);
  }, [location]);

  return {
    trackEvent: googleAnalytics.trackEvent.bind(googleAnalytics),
    trackCafeEvent: googleAnalytics.trackCafeEvent.bind(googleAnalytics),
    trackCheckIn: googleAnalytics.trackCheckIn.bind(googleAnalytics),
    trackQuickPost: googleAnalytics.trackQuickPost.bind(googleAnalytics),
    trackSearch: googleAnalytics.trackSearch.bind(googleAnalytics),
    trackCafeDetailView: googleAnalytics.trackCafeDetailView.bind(googleAnalytics),
    trackFeedInteraction: googleAnalytics.trackFeedInteraction.bind(googleAnalytics),
    trackEngagement: googleAnalytics.trackEngagement.bind(googleAnalytics),
    trackError: googleAnalytics.trackError.bind(googleAnalytics),
    trackAdminAction: googleAnalytics.trackAdminAction.bind(googleAnalytics),
  };
}
