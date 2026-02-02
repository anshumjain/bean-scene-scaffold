/**
 * Run the user_follows table migration
 * This script creates the table and sets up all necessary policies
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrationSQL = `
-- Create user_follows table (simplified)
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  -- Ensure user doesn't follow themselves
  CHECK (follower_id != following_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON public.user_follows(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
CREATE POLICY "Anyone can view follows" ON public.user_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
CREATE POLICY "Users can follow others" ON public.user_follows FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
CREATE POLICY "Users can unfollow" ON public.user_follows FOR DELETE USING (
  follower_id IN (
    SELECT id FROM public.users 
    WHERE auth_user_id = auth.uid() OR device_id IS NOT NULL
  )
);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.user_follows TO anon, authenticated;
`;

async function runMigration() {
  console.log('🔄 Running user_follows table migration...\n');
  
  try {
    // Use REST API to execute SQL via PostgREST
    // We'll use the Management API endpoint
    const managementUrl = supabaseUrl.replace('/rest/v1', '');
    
    console.log('📡 Executing SQL via Supabase Management API...\n');
    
    // Execute the full SQL
    const response = await fetch(`${managementUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ query: migrationSQL }),
    });
    
    if (!response.ok) {
      // If RPC doesn't exist, try direct approach
      console.log('⚠️  RPC method not available, trying alternative...\n');
      
      // Execute statements one by one using table operations where possible
      await executeMigrationStatements();
      return;
    }
    
    console.log('✅ SQL executed successfully\n');
    
    // Verify the table was created
    await verifyMigration();
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n🔄 Trying alternative method...\n');
    await executeMigrationStatements();
  }
}

async function executeMigrationStatements() {
  console.log('📝 Executing migration using Management API...\n');
  
  // Check if table already exists
  const { error: checkError } = await supabase
    .from('user_follows')
    .select('id')
    .limit(1);
  
  if (!checkError) {
    console.log('✅ user_follows table already exists!');
    await verifyMigration();
    return;
  }
  
  // Try using Management API with service role key
  try {
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
    
    console.log('🔄 Attempting to execute via Management API...\n');
    
    const response = await fetch(managementApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: migrationSQL,
      }),
    });
    
    if (response.ok) {
      console.log('✅ Migration executed successfully!\n');
      await verifyMigration();
      return;
    } else {
      const errorText = await response.text();
      console.log('⚠️  Management API error:', response.status, errorText);
    }
  } catch (error: any) {
    console.log('⚠️  Management API not available:', error.message);
  }
  
  // Fallback: Manual instructions
  console.log('\n⚠️  Cannot execute DDL (CREATE TABLE) via Supabase JS client.');
  console.log('   The Supabase JS client only supports DML operations.\n');
  console.log('📋 Please run this migration manually:\n');
  console.log('   1. Go to: https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Go to SQL Editor');
  console.log('   4. Click "New query"');
  console.log('   5. Copy and paste the SQL below\n');
  console.log('─'.repeat(60));
  console.log(migrationSQL);
  console.log('─'.repeat(60));
  console.log('\n   6. Click "Run" (or press Ctrl+Enter)\n');
  
  console.log('📄 Or use the migration file:');
  console.log('   supabase/migrations/20250129000001_add_user_following.sql\n');
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...');
  
  const { data, error } = await supabase
    .from('user_follows')
    .select('*')
    .limit(1);
  
  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
      console.log('❌ Table still does not exist.');
      console.log('   Please run the migration manually (see instructions above).');
    } else {
      console.log('⚠️  Error verifying:', error.message);
    }
  } else {
    console.log('✅ Migration successful! user_follows table exists.');
    console.log('✅ Follow feature is now ready to use!');
  }
}

async function runMigrationViaRest() {
  // Use REST API to execute SQL
  const url = `${supabaseUrl}/rest/v1/rpc/exec_sql`;
  
  try {
    // Try to execute via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: migrationSQL }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('✅ Migration executed via REST API');
  } catch (error: any) {
    console.log('❌ REST API method also failed:', error.message);
    console.log('\n📋 Manual migration required:');
    console.log('   File: supabase/migrations/20250129000001_add_user_following.sql');
    console.log('   See: FOLLOW_FEATURE_SETUP.md for instructions');
  }
}

// Alternative: Use Supabase Management API if available
async function runMigrationDirect() {
  console.log('🔄 Attempting direct SQL execution...\n');
  
  // Since Supabase JS client doesn't support raw SQL, we'll provide clear instructions
  console.log('⚠️  The Supabase JS client cannot execute raw SQL directly.');
  console.log('   You need to run this migration in Supabase Dashboard.\n');
  
  console.log('📋 Steps:');
  console.log('   1. Open Supabase Dashboard: https://supabase.com/dashboard');
  console.log('   2. Select your project');
  console.log('   3. Go to SQL Editor');
  console.log('   4. Click "New query"');
  console.log('   5. Copy and paste the SQL from: supabase/migrations/20250129000001_add_user_following.sql');
  console.log('   6. Click "Run"\n');
  
  console.log('📄 Or use this SQL:\n');
  console.log(migrationSQL);
}

runMigration().catch(console.error);
