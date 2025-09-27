-- DOWN: Remove cafe_photos table and related triggers
DROP TRIGGER IF EXISTS trigger_update_cafe_hero_photo ON public.cafe_photos;
DROP FUNCTION IF EXISTS update_cafe_hero_photo();
DROP TABLE IF EXISTS public.cafe_photos;
ALTER TABLE public.cafes DROP COLUMN IF EXISTS hero_updated_at;
