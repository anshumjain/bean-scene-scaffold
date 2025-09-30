-- Create cafe_reviews table for Google Reviews data
CREATE TABLE IF NOT EXISTS public.cafe_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES public.cafes(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  profile_photo_url TEXT,
  time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cafe_id, reviewer_name, review_text)
);

-- Add index for fast lookups by cafe
CREATE INDEX IF NOT EXISTS idx_cafe_reviews_cafe_id ON public.cafe_reviews(cafe_id);

-- Add index for sorting by rating
CREATE INDEX IF NOT EXISTS idx_cafe_reviews_rating ON public.cafe_reviews(rating DESC);

-- Add index for sorting by time
CREATE INDEX IF NOT EXISTS idx_cafe_reviews_time ON public.cafe_reviews(time DESC);

-- Enable RLS
ALTER TABLE public.cafe_reviews ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read reviews
CREATE POLICY "Reviews are viewable by everyone"
ON public.cafe_reviews
FOR SELECT
USING (true);

-- Only authenticated users can insert/update/delete reviews (for admin operations)
CREATE POLICY "Only authenticated users can modify reviews"
ON public.cafe_reviews
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add trigger to update updated_at
CREATE TRIGGER update_cafe_reviews_updated_at
BEFORE UPDATE ON public.cafe_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();