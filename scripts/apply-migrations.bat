@echo off
REM BeanScene Database Migration Script for Windows
REM This script applies all migrations and regenerates TypeScript types

echo 🚀 Starting BeanScene database migration...

REM Check if supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Supabase CLI not found. Please install it first:
    echo    npm install -g supabase
    exit /b 1
)

REM Check if we're in a Supabase project
if not exist "supabase\config.toml" (
    echo ❌ Not in a Supabase project directory. Please run this from the project root.
    exit /b 1
)

echo 📋 Applying database migrations...

REM Apply migrations
supabase db push

if %ERRORLEVEL% EQU 0 (
    echo ✅ Database migrations applied successfully!
) else (
    echo ❌ Failed to apply migrations. Please check the errors above.
    exit /b 1
)

echo 🔄 Regenerating TypeScript types...

REM Generate types
supabase gen types typescript --local > src\integrations\supabase\types.ts

if %ERRORLEVEL% EQU 0 (
    echo ✅ TypeScript types regenerated successfully!
) else (
    echo ❌ Failed to regenerate types. Please check the errors above.
    exit /b 1
)

echo 🧹 Cleaning up old migration files...

REM Remove the individual migration files since we have the complete one
if exist "supabase\migrations\20251006_add_username_to_users.sql" del "supabase\migrations\20251006_add_username_to_users.sql"
if exist "supabase\migrations\20251006_add_username_device_to_posts.sql" del "supabase\migrations\20251006_add_username_device_to_posts.sql"
if exist "supabase\migrations\20251006_add_favorites_and_user_activities.sql" del "supabase\migrations\20251006_add_favorites_and_user_activities.sql"

echo ✅ Cleanup completed!

echo.
echo 🎉 Migration completed successfully!
echo.
echo Next steps:
echo 1. Run 'npm install' to install dependencies
echo 2. Run 'npm run dev' to start the development server
echo 3. Test the new features:
echo    - Username selection in profile
echo    - Favorites functionality
echo    - Activity tracking
echo    - Admin analytics dashboard
echo.
echo To seed sample data:
echo   npm run seed:reviews
echo   npm run seed:posts
