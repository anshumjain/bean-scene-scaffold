    -- Sync cafe tags from posts
    -- This function aggregates all tags from posts for each cafe and updates the cafe's tags field

    -- Function to sync tags from posts to cafes
    CREATE OR REPLACE FUNCTION sync_cafe_tags_from_posts()
    RETURNS void AS $$
    BEGIN
    -- Update each cafe with aggregated tags from its posts
    UPDATE public.cafes 
    SET tags = (
        SELECT COALESCE(array_agg(DISTINCT tag), '{}'::text[])
        FROM (
        SELECT unnest(tags) as tag
        FROM public.posts 
        WHERE cafe_id = public.cafes.id 
            AND tags IS NOT NULL 
            AND array_length(tags, 1) > 0
        ) as post_tags
    ),
    updated_at = now()
    WHERE id IN (
        SELECT DISTINCT cafe_id 
        FROM public.posts 
        WHERE tags IS NOT NULL 
        AND array_length(tags, 1) > 0
    );
    
    -- Log the update
    RAISE NOTICE 'Updated cafe tags from posts';
    END;
    $$ LANGUAGE plpgsql;

    -- Run the sync function
    SELECT sync_cafe_tags_from_posts();

    -- Verify the results
    SELECT 
    c.name,
    c.neighborhood,
    c.tags,
    array_length(c.tags, 1) as tag_count,
    COUNT(p.id) as post_count
    FROM public.cafes c
    LEFT JOIN public.posts p ON c.id = p.cafe_id
    WHERE c.is_active = true
    GROUP BY c.id, c.name, c.neighborhood, c.tags
    HAVING array_length(c.tags, 1) > 0
    ORDER BY array_length(c.tags, 1) DESC
    LIMIT 10;

    -- Also check posts with tags
    SELECT 
    p.id,
    c.name as cafe_name,
    p.tags,
    p.created_at
    FROM public.posts p
    JOIN public.cafes c ON p.cafe_id = c.id
    WHERE p.tags IS NOT NULL 
    AND array_length(p.tags, 1) > 0
    ORDER BY p.created_at DESC
    LIMIT 10;
