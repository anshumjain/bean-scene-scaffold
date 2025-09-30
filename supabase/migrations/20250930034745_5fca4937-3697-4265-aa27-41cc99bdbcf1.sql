-- Enable RLS on tables that don't have it enabled
ALTER TABLE public.cafe_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

-- Add public read policies for tables that need them
CREATE POLICY "Cafe photos are viewable by everyone"
ON public.cafe_photos
FOR SELECT
USING (true);

CREATE POLICY "Sync history viewable by authenticated users"
ON public.sync_history
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix function search paths (set to public for all custom functions)
ALTER FUNCTION public.calculate_cafe_user_rating(uuid) SET search_path = public;
ALTER FUNCTION public.update_cafe_user_rating() SET search_path = public;
ALTER FUNCTION public.update_cafe_hero_image(uuid) SET search_path = public;
ALTER FUNCTION public.trigger_update_hero_image() SET search_path = public;
ALTER FUNCTION public.update_cafe_hero_photo() SET search_path = public;