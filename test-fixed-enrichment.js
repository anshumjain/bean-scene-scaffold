// Test the fixed enrichment function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hhdcequsdmosxzjebdyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedEnrichment() {
  try {
    console.log('🧪 Testing fixed enrichment function...\n');
    console.log('This should now properly enrich cafes with the data from Google Places API!');
    
    const { data, error } = await supabase.functions.invoke('enrich-cafes', {
      body: { action: 'start' }
    });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('✅ Fixed Enrichment Results:');
    console.log(`📊 Message: ${data.message}`);
    console.log(`📈 Stats:`);
    console.log(`  - Processed: ${data.stats?.processed || 0} cafes`);
    console.log(`  - Enriched: ${data.stats?.enriched || 0} cafes with new data`);
    console.log(`  - Failed: ${data.stats?.failed || 0} cafes`);
    console.log(`  - Reviews added: ${data.stats?.reviewsAdded || 0}`);
    console.log(`  - Batch: ${data.stats?.batchProcessed || 0}/${data.stats?.totalBatches || 0}`);
    console.log(`  - API calls: ${data.stats?.apiCalls || 0}`);
    console.log(`  - Cost: $${data.stats?.estimatedCost?.toFixed(2) || '0.00'}`);
    
    if (data.stats?.enriched > 0) {
      console.log('\n🎉 SUCCESS! Cafes are now being properly enriched with data!');
      console.log('📝 The function will automatically continue processing all remaining batches.');
    } else {
      console.log('\n⚠️ No cafes were enriched - this might mean they already have complete data.');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFixedEnrichment();

