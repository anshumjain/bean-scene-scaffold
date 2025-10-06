/**
 * Google Analytics Service for BeanScene
 * Provides utilities for tracking custom events and user interactions
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

class GoogleAnalyticsService {
  private isInitialized = false;
  private trackingId = 'G-RFNKYG6WL5';

  constructor() {
    this.checkInitialization();
  }

  private checkInitialization() {
    // Check if gtag is available
    if (typeof window !== 'undefined' && window.gtag) {
      this.isInitialized = true;
    } else {
      // Wait for gtag to load
      setTimeout(() => this.checkInitialization(), 100);
    }
  }

  /**
   * Track page views
   */
  trackPageView(pagePath: string, pageTitle?: string) {
    if (!this.isInitialized) return;

    window.gtag('config', this.trackingId, {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }

  /**
   * Track custom events
   */
  trackEvent(eventName: string, parameters?: Record<string, any>) {
    if (!this.isInitialized) return;

    window.gtag('event', eventName, {
      event_category: 'BeanScene',
      ...parameters,
    });
  }

  /**
   * Track cafe-related events
   */
  trackCafeEvent(action: string, cafeName: string, cafeId?: string, additionalData?: Record<string, any>) {
    this.trackEvent('cafe_interaction', {
      event_category: 'Cafe',
      action,
      cafe_name: cafeName,
      cafe_id: cafeId,
      ...additionalData,
    });
  }

  /**
   * Track check-in events
   */
  trackCheckIn(cafeName: string, cafeId: string, rating?: number, hasImage?: boolean, tagCount?: number) {
    this.trackEvent('check_in', {
      event_category: 'Check-in',
      cafe_name: cafeName,
      cafe_id: cafeId,
      rating,
      has_image: hasImage,
      tag_count: tagCount,
    });
  }

  /**
   * Track quick post events
   */
  trackQuickPost(cafeName?: string, cafeId?: string, hasImage?: boolean) {
    this.trackEvent('quick_post', {
      event_category: 'Quick Post',
      cafe_name: cafeName,
      cafe_id: cafeId,
      has_image: hasImage,
    });
  }

  /**
   * Track search events
   */
  trackSearch(searchTerm: string, resultsCount?: number, filters?: Record<string, any>) {
    this.trackEvent('search', {
      event_category: 'Search',
      search_term: searchTerm,
      results_count: resultsCount,
      filters: JSON.stringify(filters),
    });
  }

  /**
   * Track cafe detail views
   */
  trackCafeDetailView(cafeName: string, cafeId: string, source?: string) {
    this.trackEvent('cafe_detail_view', {
      event_category: 'Cafe Detail',
      cafe_name: cafeName,
      cafe_id: cafeId,
      source,
    });
  }

  /**
   * Track feed interactions
   */
  trackFeedInteraction(action: string, postId?: string, cafeName?: string) {
    this.trackEvent('feed_interaction', {
      event_category: 'Feed',
      action,
      post_id: postId,
      cafe_name: cafeName,
    });
  }

  /**
   * Track user engagement
   */
  trackEngagement(action: string, details?: Record<string, any>) {
    this.trackEvent('user_engagement', {
      event_category: 'Engagement',
      action,
      ...details,
    });
  }

  /**
   * Track error events
   */
  trackError(errorType: string, errorMessage: string, context?: Record<string, any>) {
    this.trackEvent('error', {
      event_category: 'Error',
      error_type: errorType,
      error_message: errorMessage,
      ...context,
    });
  }

  /**
   * Track admin actions
   */
  trackAdminAction(action: string, details?: Record<string, any>) {
    this.trackEvent('admin_action', {
      event_category: 'Admin',
      action,
      ...details,
    });
  }
}

// Create and export a singleton instance
export const googleAnalytics = new GoogleAnalyticsService();

// Export the class for testing purposes
export { GoogleAnalyticsService };
