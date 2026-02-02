/**
 * Test script to diagnose follow feature issues
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFollowFeature() {
  console.log('🔍 Testing Follow Feature Setup...\n');
  
  // 1. Check if user_follows table exists
  console.log('1. Checking if user_follows table exists...');
  const { data: tableCheck, error: tableError } = await supabase
    .from('user_follows')
    .select('*')
    .limit(1);
  
  if (tableError) {
    if (tableError.code === 'PGRST204' || tableError.message.includes('does not exist')) {
      console.log('❌ user_follows table does NOT exist');
      console.log('\n📋 ACTION REQUIRED:');
      console.log('   Run the migration in Supabase Dashboard:');
      console.log('   1. Go to Supabase Dashboard > SQL Editor');
      console.log('   2. Copy and paste the SQL from: MIGRATION_TO_RUN.sql');
      console.log('   3. Or run: supabase/migrations/20250129000001_add_user_following.sql');
      console.log('   4. Click "Run"');
      return;
    } else {
      console.log('⚠️  Error checking table:', tableError.message);
    }
  } else {
    console.log('✅ user_follows table exists');
  }
  
  // 2. Check if users table has data
  console.log('\n2. Checking users table...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username, device_id')
    .limit(5);
  
  if (usersError) {
    console.log('❌ Error accessing users table:', usersError.message);
  } else {
    console.log(`✅ Found ${users?.length || 0} users`);
    if (users && users.length > 0) {
      console.log('   Sample users:');
      users.forEach(u => {
        console.log(`   - ${u.username || 'No username'} (ID: ${u.id}, Device: ${u.device_id || 'N/A'})`);
      });
    }
  }
  
  // 3. Check existing follows
  console.log('\n3. Checking existing follow relationships...');
  const { data: follows, error: followsError } = await supabase
    .from('user_follows')
    .select('*')
    .limit(10);
  
  if (followsError) {
    console.log('⚠️  Error checking follows:', followsError.message);
  } else {
    console.log(`✅ Found ${follows?.length || 0} follow relationships`);
  }
  
  console.log('\n✅ Diagnostic complete!');
}

testFollowFeature().catch(console.error);
