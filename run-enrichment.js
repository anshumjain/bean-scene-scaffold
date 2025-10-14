// Run the enrichment function again
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hhdcequsdmosxzjebdyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoZGNlcXVzZG1vc3h6amViZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjQwODMsImV4cCI6MjA3MzY0MDA4M30.BJ8tbA2zBC_IgC3Li_uE5P1-cPHA1Gi6mESaJVToPqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runEnrichment() {
  try {
    console.log('🚀 Running enrichment function again...\n');
    console.log('📊 This run should be faster and less likely to timeout since it will only process cafes that still need data.\n');
    
    const { data, error } = await supabase.functions.invoke('enrich-cafes', {
      body: { action: 'start' }
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('🎉 Enrichment Results:');
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
      console.log('\n✅ SUCCESS! More cafes have been enriched!');
      console.log('🔄 The function will continue processing remaining batches automatically.');
    } else {
      console.log('\n🎯 All cafes appear to have complete data!');
      console.log('💡 You can run this again anytime to check for new cafes or updates.');
    }
    
  } catch (error) {
    console.error('❌ Run failed:', error);
  }
}

runEnrichment();








