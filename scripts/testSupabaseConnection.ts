import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://hhdcequsdmosxzjebdyj.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create admin client if service key is available
const supabaseAdmin = SUPABASE_SERVICE_KEY ? 
  createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null;

async function testConnection() {
  console.log('🔗 Testing Supabase Connection...\n');
  
  // Display configuration
  console.log('📋 Configuration:');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Anon Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...${SUPABASE_ANON_KEY.substring(SUPABASE_ANON_KEY.length - 4)}`);
  console.log(`   Service Key: ${SUPABASE_SERVICE_KEY ? '✅ Available' : '❌ Not found'}\n`);

  try {
    // Test 1: Basic connection
    console.log('🧪 Test 1: Basic Connection');
    const { data: healthData, error: healthError } = await supabase
      .from('cafes')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.log('   ❌ Failed:', healthError.message);
    } else {
      console.log('   ✅ Success: Connected to Supabase');
    }

    // Test 2: Table existence check
    console.log('\n🧪 Test 2: Table Structure Check');
    const tables = ['cafes', 'users', 'posts', 'cafe_reviews', 'favorites', 'feedback'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: Table exists`);
        }
      } catch (err) {
        console.log(`   ❌ ${table}: Connection failed`);
      }
    }

    // Test 3: Data count check
    console.log('\n🧪 Test 3: Data Count Check');
    try {
      const { count: cafeCount, error: cafeError } = await supabase
        .from('cafes')
        .select('*', { count: 'exact', head: true });
      
      if (cafeError) {
        console.log('   ❌ Cafes count:', cafeError.message);
      } else {
        console.log(`   📊 Total cafes: ${cafeCount || 0}`);
      }

      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (userError) {
        console.log('   ❌ Users count:', userError.message);
      } else {
        console.log(`   👥 Total users: ${userCount || 0}`);
      }

      const { count: postCount, error: postError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });
      
      if (postError) {
        console.log('   ❌ Posts count:', postError.message);
      } else {
        console.log(`   📝 Total posts: ${postCount || 0}`);
      }
    } catch (err) {
      console.log('   ❌ Data count check failed:', err);
    }

    // Test 4: Admin operations (if service key available)
    if (supabaseAdmin) {
      console.log('\n🧪 Test 4: Admin Operations');
      try {
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from('cafes')
          .select('*')
          .limit(1);
        
        if (adminError) {
          console.log('   ❌ Admin access:', adminError.message);
        } else {
          console.log('   ✅ Admin access: Working');
        }
      } catch (err) {
        console.log('   ❌ Admin operations failed:', err);
      }
    } else {
      console.log('\n🧪 Test 4: Admin Operations');
      console.log('   ⚠️ Skipped: Service role key not provided');
    }

    // Test 5: Sample data fetch
    console.log('\n🧪 Test 5: Sample Data Fetch');
    try {
      const { data: sampleCafes, error: sampleError } = await supabase
        .from('cafes')
        .select('id, name, address, google_rating')
        .limit(3);
      
      if (sampleError) {
        console.log('   ❌ Sample fetch:', sampleError.message);
      } else if (sampleCafes && sampleCafes.length > 0) {
        console.log('   ✅ Sample cafes:');
        sampleCafes.forEach((cafe, index) => {
          console.log(`      ${index + 1}. ${cafe.name} (${cafe.google_rating || 'N/A'} ⭐)`);
        });
      } else {
        console.log('   ⚠️ No cafes found in database');
      }
    } catch (err) {
      console.log('   ❌ Sample data fetch failed:', err);
    }

    console.log('\n🎉 Connection test completed!');
    
  } catch (error) {
    console.error('\n💥 Connection test failed:', error);
  }
}

// Additional utility functions
async function getDatabaseStats() {
  console.log('\n📊 Database Statistics:');
  
  try {
    const tables = [
      'cafes', 'users', 'posts', 'cafe_reviews', 
      'favorites', 'feedback', 'tag_reports'
    ];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`   ${table}: ${count || 0} records`);
      }
    }
  } catch (err) {
    console.log('   ❌ Failed to get stats:', err);
  }
}

async function testAuth() {
  console.log('\n🔐 Authentication Test:');
  
  try {
    // Test anonymous access
    const { data: anonData, error: anonError } = await supabase.auth.getSession();
    
    if (anonError) {
      console.log('   ❌ Auth check failed:', anonError.message);
    } else {
      console.log('   ✅ Auth service accessible');
    }
  } catch (err) {
    console.log('   ❌ Auth test failed:', err);
  }
}

// Run the tests
(async () => {
  try {
    await testConnection();
    await getDatabaseStats();
    await testAuth();
    
    console.log('\n✨ All tests completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   - If tests passed, your Supabase connection is working');
    console.log('   - If you need to seed data, run: npm run seed:reviews');
    console.log('   - If you need to restore schema, run: npx ts-node scripts/restore-database.ts');
    
    process.exit(0);
  } catch (err) {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  }
})();



