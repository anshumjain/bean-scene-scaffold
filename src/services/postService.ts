import { Post, SearchFilters, ApiResponse, CheckInData } from './types';
import { fetchCafeDetails } from './cafeService';
import { uploadImage } from './cloudinaryService';
import { generateId, formatTimeAgo } from './utils';

/**
 * Fetch posts for the main feed with optional filters
 */
export async function fetchPosts(filters: SearchFilters = {}): Promise<ApiResponse<Post[]>> {
  try {
    // TODO: Replace with Supabase query when connected
    // const { data, error } = await supabase
    //   .from('posts')
    //   .select(`
    //     *,
    //     cafes (name, neighborhood, placeId)
    //   `)
    //   .order('createdAt', { ascending: false });
    
    // Mock data for development - matches real Houston cafes
    const mockPosts: Post[] = [
      {
        id: "1",
        userId: "user1",
        cafeId: "1",
        placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        imageUrl: "/placeholder.svg",
        rating: 5,
        textReview: "Amazing cortado with beautiful latte art! The atmosphere is perfect for working, and the baristas really know their craft. Highly recommend the house blend.",
        tags: ["latte-art", "cozy-vibes", "laptop-friendly"],
        likes: 24,
        comments: 8,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
        cafe: {
          name: "Blacksmith Coffee",
          neighborhood: "Montrose", 
          placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4"
        }
      },
      {
        id: "2",
        userId: "user2",
        cafeId: "2",
        placeId: "ChIJd8BlQ2u5EmsRxjaOBJUaYmQ",
        imageUrl: "/placeholder.svg",
        rating: 4,
        textReview: "Love their cold brew setup! Great outdoor seating with a view. Perfect spot to catch up with friends over some specialty drinks.",
        tags: ["third-wave", "cold-brew", "rooftop"],
        likes: 18,
        comments: 5,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4h ago
        cafe: {
          name: "Greenway Coffee",
          neighborhood: "Heights",
          placeId: "ChIJd8BlQ2u5EmsRxjaOBJUaYmQ"
        }
      },
      {
        id: "3", 
        userId: "user3",
        cafeId: "3",
        placeId: "ChIJKa7wl2u2EmsRQypMbycKUJo",
        imageUrl: "/placeholder.svg",
        rating: 4,
        textReview: "Their croissants are to die for! Got here early and it was already buzzing with the morning crowd. Great energy and even better coffee.",
        tags: ["pastries", "instagram-worthy", "busy"],
        likes: 31,
        comments: 12,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
        cafe: {
          name: "Hugo's Coffee", 
          neighborhood: "Downtown",
          placeId: "ChIJKa7wl2u2EmsRQypMbycKUJo"
        }
      }
    ];
    
    let filteredPosts = mockPosts;
    
    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      filteredPosts = filteredPosts.filter(post =>
        post.tags.some(tag => filters.tags!.includes(tag))
      );
    }
    
    // Apply neighborhood filter
    if (filters.neighborhoods && filters.neighborhoods.length > 0) {
      filteredPosts = filteredPosts.filter(post =>
        post.cafe && filters.neighborhoods!.includes(post.cafe.neighborhood)
      );
    }
    
    // Apply search query
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filteredPosts = filteredPosts.filter(post =>
        post.textReview.toLowerCase().includes(query) ||
        (post.cafe?.name.toLowerCase().includes(query)) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return {
      data: filteredPosts,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch posts'
    };
  }
}

/**
 * Fetch posts for a specific cafe
 */
export async function fetchCafePostsById(placeId: string): Promise<ApiResponse<Post[]>> {
  try {
    // TODO: Replace with Supabase query when connected
    // const { data, error } = await supabase
    //   .from('posts')
    //   .select('*, cafes (name, neighborhood, placeId)')
    //   .eq('placeId', placeId)
    //   .order('createdAt', { ascending: false });
    
    const { data: allPosts } = await fetchPosts();
    const cafePosts = allPosts.filter(post => post.placeId === placeId || post.cafeId === placeId);
    
    return {
      data: cafePosts,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch cafe posts'
    };
  }
}

/**
 * Filter feed posts by specific tag
 */
export async function filterFeedByTag(tag: string): Promise<ApiResponse<Post[]>> {
  return await fetchPosts({ tags: [tag] });
}

/**
 * Submit a new check-in post
 */
export async function submitCheckin(checkinData: CheckInData): Promise<ApiResponse<Post>> {
  try {
    let imageUrl = checkinData.imageUrl || '';
    
    // Upload image to Cloudinary if file provided
    if (checkinData.imageFile) {
      const uploadResult = await uploadImage(checkinData.imageFile);
      if (uploadResult.success && uploadResult.data) {
        imageUrl = uploadResult.data.url;
      } else {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }
    }
    
    // Get cafe details to populate the post
    const cafeResult = await fetchCafeDetails(checkinData.placeId);
    const cafe = cafeResult.data;
    
    if (!cafe) {
      throw new Error('Cafe not found');
    }
    
    // Create new post
    const newPost: Post = {
      id: generateId(),
      userId: 'current_user', // TODO: Get from auth context
      cafeId: checkinData.cafeId,
      placeId: checkinData.placeId,
      imageUrl,
      rating: checkinData.rating,
      textReview: checkinData.review,
      tags: checkinData.tags,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
      cafe: {
        name: cafe.name,
        neighborhood: cafe.neighborhood,
        placeId: cafe.placeId
      }
    };
    
    // TODO: Insert into Supabase when connected
    // const { data, error } = await supabase
    //   .from('posts')
    //   .insert(newPost)
    //   .select()
    //   .single();
    
    console.log('Would create post:', newPost);
    
    return {
      data: newPost,
      success: true
    };
  } catch (error) {
    return {
      data: {} as Post,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit check-in'
    };
  }
}

/**
 * Like a post
 */
export async function likePost(postId: string): Promise<ApiResponse<boolean>> {
  try {
    // TODO: Implement with Supabase when connected
    // const { error } = await supabase.rpc('increment_post_likes', { post_id: postId });
    
    console.log(`Would like post: ${postId}`);
    
    return {
      data: true,
      success: true
    };
  } catch (error) {
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to like post'
    };
  }
}

/**
 * Unlike a post
 */
export async function unlikePost(postId: string): Promise<ApiResponse<boolean>> {
  try {
    // TODO: Implement with Supabase when connected
    // const { error } = await supabase.rpc('decrement_post_likes', { post_id: postId });
    
    console.log(`Would unlike post: ${postId}`);
    
    return {
      data: true,
      success: true
    };
  } catch (error) {
    return {
      data: false,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlike post'
    };
  }
}

/**
 * Get posts by search query across all fields
 */
export async function searchPosts(query: string): Promise<ApiResponse<Post[]>> {
  return await fetchPosts({ query });
}

/**
 * Get trending posts (most liked in last 7 days)
 */
export async function fetchTrendingPosts(): Promise<ApiResponse<Post[]>> {
  try {
    // TODO: Implement trending algorithm with Supabase when connected
    const { data: allPosts } = await fetchPosts();
    
    // Simple trending: sort by likes (in production, factor in time and engagement)
    const trendingPosts = allPosts
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 10);
    
    return {
      data: trendingPosts,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trending posts'
    };
  }
}