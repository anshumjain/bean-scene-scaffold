-- Check if there's any data in the tables
SELECT 'cafes' as table_name, COUNT(*) as record_count FROM cafes
UNION ALL
SELECT 'posts' as table_name, COUNT(*) as record_count FROM posts
UNION ALL
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'cafe_reviews' as table_name, COUNT(*) as record_count FROM cafe_reviews
UNION ALL
SELECT 'cafe_photos' as table_name, COUNT(*) as record_count FROM cafe_photos
UNION ALL
SELECT 'tag_reports' as table_name, COUNT(*) as record_count FROM tag_reports;

-- Show sample data if any exists
SELECT 'Sample cafes:' as info;
SELECT id, name, address, neighborhood FROM cafes LIMIT 3;

SELECT 'Sample posts:' as info;
SELECT id, text_review, created_at FROM posts LIMIT 3;
