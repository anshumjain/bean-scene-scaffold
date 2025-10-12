import { useEffect, useState } from "react";
import { Star, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GoogleAttribution } from "@/components/Attribution/GoogleAttribution";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text?: string;
  text_review?: string; // For post reviews
  profile_photo_url?: string;
  time?: string;
  created_at?: string; // For post reviews
  source: 'google' | 'user';
  review_type?: 'cafe_review' | 'post_review';
  username?: string;
  device_id?: string;
  image_url?: string;
  tags?: string[];
}

interface CafeReviewsProps {
  cafeId: string;
  placeId?: string;
  maxReviews?: number;
}

export function CafeReviews({ cafeId, placeId, maxReviews = 5 }: CafeReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        setLoading(true);
        setError(null);

        // Use the unified reviews function
        const { data, error } = await supabase
          .rpc('get_cafe_reviews_unified', { 
            p_cafe_id: cafeId, 
            p_limit: maxReviews 
          });

        if (error) throw error;

        // Transform data to normalize field names and filter for text-based reviews only
        const normalizedReviews = (data || [])
          .map(review => ({
            ...review,
            review_text: review.review_text || review.text_review,
            time: review.time || review.created_at,
            source: review.source || 'user'
          }))
          .filter(review => {
            // Only show reviews that have text content
            // Exclude post reviews that are primarily image-based (no text or very short text)
            if (review.review_type === 'post_review') {
              return review.review_text && review.review_text.trim().length > 20;
            }
            // Include all Google reviews and cafe reviews
            return true;
          });

        setReviews(normalizedReviews);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError(err instanceof Error ? err.message : 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    }

    if (cafeId) {
      fetchReviews();
    }
  }, [cafeId, maxReviews]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-coffee border-0">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-coffee border-0">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Unable to load reviews</p>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="shadow-coffee border-0">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">No reviews yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={`${review.review_type}-${review.id}`} className={`shadow-coffee border-0 ${review.source === 'google' ? 'opacity-90' : ''}`}>
          <CardContent className="p-4">
            {/* Reviewer Info */}
            <div className="flex items-start gap-3 mb-3">
              {review.source === 'user' ? (
                <Avatar className="w-10 h-10">
                  {review.profile_photo_url ? (
                    <AvatarImage src={review.profile_photo_url} alt={review.reviewer_name} />
                  ) : null}
                  <AvatarFallback>
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-semibold text-sm truncate ${review.source === 'google' ? 'text-muted-foreground' : ''}`}>
                    {review.source === 'google' ? 'Anonymous Reviewer' : review.reviewer_name}
                  </h4>
                  <div className="flex items-center gap-1 ml-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{review.rating}</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {new Date(review.time || review.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>


            {/* Review Text */}
            <p className="text-sm text-foreground leading-relaxed">
              {review.review_text}
            </p>

            {/* Tags (for post reviews) */}
            {review.review_type === 'post_review' && review.tags && review.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {review.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Google Attribution */}
            {review.source === 'google' && (
              <div className="mt-3">
                <GoogleAttribution 
                  type="review" 
                  sourceUrl={placeId ? `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}` : undefined}
                  size="sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
