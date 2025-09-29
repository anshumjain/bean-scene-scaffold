-- UP: Create cafe_photos table for user-generated photos
CREATE TABLE public.cafe_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_approved BOOLEAN NOT NULL DEFAULT true,
  is_hero BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_cafe_photos_cafe_id ON public.cafe_photos(cafe_id);
CREATE INDEX idx_cafe_photos_uploaded_by ON public.cafe_photos(uploaded_by);
CREATE INDEX idx_cafe_photos_is_hero ON public.cafe_photos(is_hero) WHERE is_hero = true;
CREATE INDEX idx_cafe_photos_uploaded_at ON public.cafe_photos(uploaded_at DESC);

-- Create trigger to update cafe hero_photo_url when is_hero changes
CREATE OR REPLACE FUNCTION update_cafe_hero_photo()
RETURNS TRIGGER AS $$
BEGIN
  -- If this photo is being set as hero, unset all other hero photos for this cafe
  IF NEW.is_hero = true THEN
    UPDATE public.cafe_photos 
    SET is_hero = false 
    WHERE cafe_id = NEW.cafe_id AND id != NEW.id;
    
    -- Update the cafe's hero_photo_url
    UPDATE public.cafes 
    SET hero_photo_url = NEW.photo_url, updated_at = now()
    WHERE id = NEW.cafe_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cafe_hero_photo
  AFTER INSERT OR UPDATE ON public.cafe_photos
  FOR EACH ROW
  WHEN (NEW.is_hero = true)
  EXECUTE FUNCTION update_cafe_hero_photo();

-- Add hero_updated_at column to cafes table for tracking
ALTER TABLE public.cafes ADD COLUMN IF NOT EXISTS hero_updated_at TIMESTAMP WITH TIME ZONE;

-- Update the trigger to also set hero_updated_at
CREATE OR REPLACE FUNCTION update_cafe_hero_photo()
RETURNS TRIGGER AS $$
BEGIN
  -- If this photo is being set as hero, unset all other hero photos for this cafe
  IF NEW.is_hero = true THEN
    UPDATE public.cafe_photos 
    SET is_hero = false 
    WHERE cafe_id = NEW.cafe_id AND id != NEW.id;
    
    -- Update the cafe's hero_photo_url and hero_updated_at
    UPDATE public.cafes 
    SET hero_photo_url = NEW.photo_url, hero_updated_at = now(), updated_at = now()
    WHERE id = NEW.cafe_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

