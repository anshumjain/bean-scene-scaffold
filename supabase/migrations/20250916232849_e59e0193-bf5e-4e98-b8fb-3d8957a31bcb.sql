-- Create cafes table
CREATE TABLE public.cafes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
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
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create users table (profiles)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  place_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text_review TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create API usage logs table
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_service TEXT NOT NULL, -- 'google_places', 'cloudinary'
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  response_status INTEGER,
  error_message TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create validation logs table
CREATE TABLE public.validation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action_type TEXT NOT NULL, -- 'check_in', 'photo_upload', 'cafe_access'
  cafe_id UUID,
  place_id TEXT,
  validation_result BOOLEAN NOT NULL,
  error_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cafes (public read access)
CREATE POLICY "Cafes are viewable by everyone" 
ON public.cafes 
FOR SELECT 
USING (true);

CREATE POLICY "Only authenticated users can modify cafes" 
ON public.cafes 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for users
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policies for posts (public read, authenticated write)
CREATE POLICY "Posts are viewable by everyone" 
ON public.posts 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own posts" 
ON public.posts 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can update their own posts" 
ON public.posts 
FOR UPDATE 
USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can delete their own posts" 
ON public.posts 
FOR DELETE 
USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE id = user_id));

-- RLS Policies for API usage logs (admin only)
CREATE POLICY "API logs viewable by authenticated users" 
ON public.api_usage_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for validation logs (admin only)
CREATE POLICY "Validation logs viewable by authenticated users" 
ON public.validation_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_cafes_place_id ON public.cafes(place_id);
CREATE INDEX idx_cafes_neighborhood ON public.cafes(neighborhood);
CREATE INDEX idx_cafes_location ON public.cafes(latitude, longitude);
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_cafe_id ON public.posts(cafe_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_api_usage_date ON public.api_usage_logs(date, api_service);
CREATE INDEX idx_validation_logs_created_at ON public.validation_logs(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_cafes_updated_at
  BEFORE UPDATE ON public.cafes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to prevent duplicate check-ins (same user/cafe/day)
CREATE OR REPLACE FUNCTION public.check_duplicate_checkin()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.posts 
    WHERE user_id = NEW.user_id 
    AND cafe_id = NEW.cafe_id 
    AND DATE(created_at) = DATE(NEW.created_at)
  ) THEN
    RAISE EXCEPTION 'Duplicate check-in: User has already checked in to this cafe today';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for duplicate check-in prevention
CREATE TRIGGER prevent_duplicate_checkins
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_duplicate_checkin();