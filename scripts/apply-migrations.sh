#!/bin/bash

# BeanScene Database Migration Script
# This script applies all migrations and regenerates TypeScript types

echo "🚀 Starting BeanScene database migration..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from the project root."
    exit 1
fi

echo "📋 Applying database migrations..."

# Apply migrations
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migrations applied successfully!"
else
    echo "❌ Failed to apply migrations. Please check the errors above."
    exit 1
fi

echo "🔄 Regenerating TypeScript types..."

# Generate types
supabase gen types typescript --local > src/integrations/supabase/types.ts

if [ $? -eq 0 ]; then
    echo "✅ TypeScript types regenerated successfully!"
else
    echo "❌ Failed to regenerate types. Please check the errors above."
    exit 1
fi

echo "🧹 Cleaning up old migration files..."

# Remove the individual migration files since we have the complete one
rm -f supabase/migrations/20251006_add_username_to_users.sql
rm -f supabase/migrations/20251006_add_username_device_to_posts.sql
rm -f supabase/migrations/20251006_add_favorites_and_user_activities.sql

echo "✅ Cleanup completed!"

echo ""
echo "🎉 Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run 'npm install' to install dependencies"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Test the new features:"
echo "   - Username selection in profile"
echo "   - Favorites functionality"
echo "   - Activity tracking"
echo "   - Admin analytics dashboard"
echo ""
echo "To seed sample data:"
echo "  npm run seed:reviews"
echo "  npm run seed:posts"
