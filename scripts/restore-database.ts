import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Node.js compatible Supabase client with service role key for admin operations
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface MigrationResult {
  success: boolean;
  message: string;
  errors: string[];
}

async function applyMigration(sqlContent: string): Promise<MigrationResult> {
  try {
    console.log('📝 Executing migration...');
    
    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const errors: string[] = [];
    let successCount = 0;

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.error(`❌ Error executing statement: ${error.message}`);
            errors.push(`Statement failed: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err: any) {
          console.error(`❌ Error executing statement: ${err.message}`);
          errors.push(`Statement failed: ${err.message}`);
        }
      }
    }

    const success = errors.length === 0;
    
    return {
      success,
      message: success 
        ? `Successfully executed ${successCount} SQL statements` 
        : `Executed ${successCount} statements with ${errors.length} errors`,
      errors
    };

  } catch (error: any) {
    console.error('💥 Migration failed:', error);
    return {
      success: false,
      message: `Migration failed: ${error.message}`,
      errors: [error.message]
    };
  }
}

async function restoreDatabase(): Promise<void> {
  console.log('🔧 Starting database restoration...');
  
  try {
    // Read the core schema migration
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250127000008_restore_core_schema.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    
    console.log('📋 Found core schema migration');
    
    // Apply the migration
    const result = await applyMigration(migrationContent);
    
    if (result.success) {
      console.log('✅ Core schema restoration completed successfully!');
      console.log('📊 Database tables and policies have been created');
    } else {
      console.error('❌ Core schema restoration failed');
      console.error('Errors:', result.errors);
    }

    // Test the database connection and check tables
    console.log('\n🔍 Verifying database structure...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['cafes', 'users', 'posts', 'cafe_reviews', 'favorites', 'feedback', 'tag_reports']);

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('✅ Found tables:', tables?.map(t => t.table_name).join(', ') || 'None');
    }

    // Check if we have any data
    const { data: cafeCount, error: cafeError } = await supabase
      .from('cafes')
      .select('id', { count: 'exact', head: true });

    if (cafeError) {
      console.error('❌ Error checking cafe count:', cafeError);
    } else {
      console.log(`📊 Current cafe count: ${cafeCount || 0}`);
    }

    console.log('\n🎉 Database restoration complete!');
    console.log('📝 Next steps:');
    console.log('   1. Run the seeding script to populate with cafe data');
    console.log('   2. Use the admin dashboard to manage data');
    console.log('   3. Verify all functionality is working');

  } catch (error: any) {
    console.error('💥 Database restoration failed:', error);
    process.exit(1);
  }
}

// Run the restoration script if called directly
if (require.main === module) {
  restoreDatabase()
    .then(() => {
      console.log('✅ Database restoration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database restoration failed:', error);
      process.exit(1);
    });
}

export { restoreDatabase };
