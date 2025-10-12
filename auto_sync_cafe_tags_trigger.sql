-- Auto-sync cafe tags trigger
-- This trigger automatically updates cafe tags whenever a post is created, updated, or deleted

-- Function to update cafe tags when posts change
CREATE OR REPLACE FUNCTION update_cafe_tags_on_post_change()
RETURNS TRIGGER AS $$
DECLARE
  target_cafe_id UUID;
BEGIN
  -- Determine which cafe to update
  IF TG_OP = 'DELETE' THEN
    target_cafe_id := OLD.cafe_id;
  ELSE
    target_cafe_id := NEW.cafe_id;
  END IF;

  -- Update the cafe's tags with aggregated tags from all its posts
  UPDATE public.cafes 
  SET tags = (
    SELECT COALESCE(array_agg(DISTINCT tag), '{}'::text[])
    FROM (
      SELECT unnest(tags) as tag
      FROM public.posts 
      WHERE cafe_id = target_cafe_id 
        AND tags IS NOT NULL 
        AND array_length(tags, 1) > 0
    ) as post_tags
  ),
  updated_at = now()
  WHERE id = target_cafe_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for post changes
DROP TRIGGER IF EXISTS trigger_update_cafe_tags_on_post_insert ON public.posts;
DROP TRIGGER IF EXISTS trigger_update_cafe_tags_on_post_update ON public.posts;
DROP TRIGGER IF EXISTS trigger_update_cafe_tags_on_post_delete ON public.posts;

CREATE TRIGGER trigger_update_cafe_tags_on_post_insert
  AFTER INSERT ON public.posts
  FOR EACH ROW
  WHEN (NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 0)
  EXECUTE FUNCTION update_cafe_tags_on_post_change();

CREATE TRIGGER trigger_update_cafe_tags_on_post_update
  AFTER UPDATE ON public.posts
  FOR EACH ROW
  WHEN (NEW.tags IS DISTINCT FROM OLD.tags)
  EXECUTE FUNCTION update_cafe_tags_on_post_change();

CREATE TRIGGER trigger_update_cafe_tags_on_post_delete
  AFTER DELETE ON public.posts
  FOR EACH ROW
  WHEN (OLD.tags IS NOT NULL AND array_length(OLD.tags, 1) > 0)
  EXECUTE FUNCTION update_cafe_tags_on_post_change();

-- Test the trigger by checking current state
SELECT 'Triggers created successfully' as status;
