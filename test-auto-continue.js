// Test the auto-continue functionality
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hhdcequsdmosxzjebdyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAutoContinue() {
  try {
    console.log('🧪 Testing auto-continue functionality...\n');
    console.log('This will start batch 1 and automatically continue through all batches!');
    
    const { data, error } = await supabase.functions.invoke('enrich-cafes', {
      body: { action: 'start' }
    });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('✅ Auto-Continue Test Results:');
    console.log(`📊 Message: ${data.message}`);
    console.log(`📈 Stats:`);
    console.log(`  - Processed: ${data.stats?.processed || 0} cafes`);
    console.log(`  - Enriched: ${data.stats?.enriched || 0} cafes with new data`);
    console.log(`  - Failed: ${data.stats?.failed || 0} cafes`);
    console.log(`  - Reviews added: ${data.stats?.reviewsAdded || 0}`);
    console.log(`  - Batch: ${data.stats?.batchProcessed || 0}/${data.stats?.totalBatches || 0}`);
    console.log(`  - API calls: ${data.stats?.apiCalls || 0}`);
    console.log(`  - Cost: $${data.stats?.estimatedCost?.toFixed(2) || '0.00'}`);
    
    console.log('\n🔄 The function will now automatically continue processing all remaining batches...');
    console.log('📝 Check the Supabase function logs to see the progress of subsequent batches.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAutoContinue();

