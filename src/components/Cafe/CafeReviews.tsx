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
  review_text: string;
  profile_photo_url?: string;
  time: string;
  source: 'google' | 'user';
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

        const { data, error } = await supabase
          .from('cafe_reviews')
          .select('*')
          .eq('cafe_id', cafeId)
          .order('rating', { ascending: false })
          .order('time', { ascending: false })
          .limit(maxReviews);

        if (error) throw error;

        // Transform data to include source information
        const reviewsWithSource = (data || []).map(review => ({
          ...review,
          source: review.source || 'google' // Default to google since existing reviews are seeded from Google
        }));

        setReviews(reviewsWithSource);
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
        <Card key={review.id} className={`shadow-coffee border-0 ${review.source === 'google' ? 'opacity-90' : ''}`}>
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
                  {new Date(review.time).toLocaleDateString('en-US', {
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
