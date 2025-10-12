-- Add parking_info column to cafes table
-- This column will store parking information inferred from Google Places reviews and editorial content

-- Only add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cafes' 
        AND column_name = 'parking_info'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.cafes ADD COLUMN parking_info TEXT;
    END IF;
END $$;
