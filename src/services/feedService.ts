import { FeedItem, SearchFilters, ApiResponse } from './types';
import { fetchCafes } from './cafeService';
import { fetchPosts } from './postService';

/**
 * Fetch and merge cafes and posts into unified feed items
 * Sorted by createdAt in descending order (newest first)
 */
export async function fetchFeedItems(filters: SearchFilters = {}): Promise<ApiResponse<FeedItem[]>> {
  try {
    // Fetch both cafes and posts
    const [cafesResult, postsResult] = await Promise.all([
      fetchCafes(filters),
      fetchPosts(filters)
    ]);

    if (!cafesResult.success) {
      return {
        data: [],
        success: false,
        error: cafesResult.error || 'Failed to fetch cafes'
      };
    }

    if (!postsResult.success) {
      return {
        data: [],
        success: false,
        error: postsResult.error || 'Failed to fetch posts'
      };
    }

    // Normalize cafes into FeedItem format
    const cafeItems: FeedItem[] = cafesResult.data.map(cafe => ({
      type: "cafe" as const,
      id: `cafe_${cafe.id}`,
      createdAt: cafe.createdAt,
      cafe
    }));

    // Normalize posts into FeedItem format  
    const postItems: FeedItem[] = postsResult.data.map(post => ({
      type: "post" as const,
      id: `post_${post.id}`,
      createdAt: post.createdAt,
      post
    }));

    // Merge and sort by createdAt (newest first)
    const allItems = [...cafeItems, ...postItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply tag filtering across both cafe and post tags (AND logic)
    let filteredItems = allItems;
    if (filters.tags && filters.tags.length > 0) {
      filteredItems = allItems.filter(item => {
        if (item.type === "cafe" && item.cafe) {
          // Cafe must have ALL selected tags
          return filters.tags!.every(tag => item.cafe!.tags.includes(tag));
        }
        if (item.type === "post" && item.post) {
          // Post must have ALL selected tags
          return filters.tags!.every(tag => item.post!.tags.includes(tag));
        }
        return false;
      });
    }

    return {
      data: filteredItems,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch feed items'
    };
  }
}

/**
 * Filter feed by specific tag
 */
export async function filterFeedByTag(tag: string): Promise<ApiResponse<FeedItem[]>> {
  return await fetchFeedItems({ tags: [tag] });
}