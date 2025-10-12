-- Restore Core Database Schema
-- This migration restores the essential tables that were accidentally deleted

-- Create cafes table
CREATE TABLE IF NOT EXISTS public.cafes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,      
  place_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT,
  latitude DECIMAL NOT NULL,
  longitude DECIMAL NOT NULL,
  rating DECIMAL,
  google_rating DECIMAL,
  price_level INTEGER,
  phone_number TEXT,
  website TEXT,
  opening_hours TEXT[],
  photos TEXT[],
  hero_photo_url TEXT,
  google_photo_reference TEXT,
  parking_info TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  cached_weather_data JSONB,
  weather_cached_at TIMESTAMP WITH TIME ZONE,
  hero_updated_at TIMESTAMP WITH TIME ZONE,
  user_rating DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),  
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()   
);

-- Create users table (profiles)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,      
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  username TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),  
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()   
);

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,      
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE,
  place_id TEXT,
  image_url TEXT,
  image_urls TEXT[],
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), 
  text_review TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  username TEXT,
  device_id TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),     
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()      
);

-- Create cafe_reviews table for Google reviews
CREATE TABLE IF NOT EXISTS public.cafe_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  profile_photo_url TEXT,
  time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, cafe_id),
  UNIQUE(device_id, cafe_id)
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general', 'support')),
  subject TEXT NOT NULL,
  details TEXT NOT NULL,
  allow_followup BOOLEAN DEFAULT false,
  contact_email TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tag_reports table
CREATE TABLE IF NOT EXISTS public.tag_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  reported_tag TEXT NOT NULL,
  reason TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cafes_place_id ON public.cafes(place_id);
CREATE INDEX IF NOT EXISTS idx_cafes_neighborhood ON public.cafes(neighborhood);
CREATE INDEX IF NOT EXISTS idx_cafes_location ON public.cafes(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_cafe_id ON public.posts(cafe_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_cafe_reviews_cafe_id ON public.cafe_reviews(cafe_id);

-- Enable Row Level Security
ALTER TABLE public.cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cafes (public read, admin write)
CREATE POLICY "Cafes are viewable by everyone" ON public.cafes FOR SELECT USING (true);
CREATE POLICY "Cafes are insertable by authenticated users" ON public.cafes FOR INSERT WITH CHECK (true);
CREATE POLICY "Cafes are updatable by authenticated users" ON public.cafes FOR UPDATE USING (true);

-- Create RLS policies for users
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = auth_user_id);

-- Create RLS policies for posts (public read, users can manage their own)
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Create RLS policies for cafe_reviews (public read, admin insert)
CREATE POLICY "Cafe reviews are viewable by everyone" ON public.cafe_reviews FOR SELECT USING (true);
CREATE POLICY "Cafe reviews are insertable by authenticated users" ON public.cafe_reviews FOR INSERT WITH CHECK (true);

-- Create RLS policies for favorites
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert their own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can delete their own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Create RLS policies for feedback
CREATE POLICY "Users can insert feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Create RLS policies for tag_reports
CREATE POLICY "Users can insert tag reports" ON public.tag_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own tag reports" ON public.tag_reports FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
