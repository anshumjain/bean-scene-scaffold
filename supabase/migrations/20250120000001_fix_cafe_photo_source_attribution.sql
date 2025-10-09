-- Fix cafe photo source attribution when user photos become hero photos
-- This ensures that when a user uploads a photo and it becomes the hero photo,
-- the cafe's photo_source is updated to reflect that the hero photo is user-generated

-- Update the trigger to also set photo_source when user photo becomes hero
CREATE OR REPLACE FUNCTION update_cafe_hero_photo()
RETURNS TRIGGER AS $$
BEGIN
  -- If this photo is being set as hero, unset all other hero photos for this cafe
  IF NEW.is_hero = true THEN
    UPDATE public.cafe_photos 
    SET is_hero = false 
    WHERE cafe_id = NEW.cafe_id AND id != NEW.id;
    
    -- Update the cafe's hero_photo_url, hero_updated_at, and photo_source
    UPDATE public.cafes 
    SET 
      hero_photo_url = NEW.photo_url, 
      hero_updated_at = now(), 
      updated_at = now(),
      photo_source = 'user' -- User-uploaded photos should be marked as user source
    WHERE id = NEW.cafe_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add photo_source column to cafe_photos table for better tracking
ALTER TABLE public.cafe_photos 
ADD COLUMN IF NOT EXISTS photo_source VARCHAR(20) DEFAULT 'user';

-- Update existing cafe_photos records to have photo_source = 'user'
UPDATE public.cafe_photos 
SET photo_source = 'user' 
WHERE photo_source IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cafe_photos_photo_source ON public.cafe_photos(photo_source);

-- Add comment for documentation
COMMENT ON COLUMN public.cafe_photos.photo_source IS 'Source of photo: google or user';
