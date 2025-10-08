#!/usr/bin/env bun
/**
 * Auto-run photo migration until complete
 * Runs npm run migrate:photos repeatedly until all cafes are migrated
 */

import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.VITE_API_BASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getRemainingCount(): Promise<number> {
  const { count } = await supabase
    .from('cafes')
    .select('*', { count: 'exact', head: true })
    .not('google_photo_reference', 'is', null)
    .is('hero_photo_url', null)
    .eq('is_active', true);
  
  return count || 0;
}

function runMigration(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('\n🔄 Starting migration batch...\n');
    
    const child = spawn('npm', ['run', 'migrate:photos'], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      console.log(`\n📊 Migration batch completed with exit code: ${code}`);
      resolve(code === 0);
    });

    child.on('error', (error) => {
      console.error(`❌ Migration batch failed: ${error.message}`);
      resolve(false);
    });
  });
}

async function autoMigrate() {
  console.log('🚀 Starting auto photo migration...\n');
  
  let totalMigrated = 0;
  let batchNumber = 1;
  
  try {
    const initialCount = await getRemainingCount();
    console.log(`📊 Initial cafes needing migration: ${initialCount}`);
    
    if (initialCount === 0) {
      console.log('✅ No cafes need migration - all done!');
      return;
    }
    
    while (true) {
      const remainingCount = await getRemainingCount();
      
      if (remainingCount === 0) {
        console.log('\n🎉 All cafes migrated successfully!');
        console.log(`📊 Total cafes migrated: ${totalMigrated}`);
        break;
      }
      
      console.log(`\n📊 Batch ${batchNumber} - ${remainingCount} cafes remaining\n`);
      
      const success = await runMigration();
      
      if (!success) {
        console.log('\n❌ Migration batch failed. Stopping auto-migration.');
        console.log('💡 You can manually run: npm run migrate:photos');
        break;
      }
      
      const newCount = await getRemainingCount();
      const batchMigrated = remainingCount - newCount;
      totalMigrated += batchMigrated;
      
      console.log(`\n✅ Batch ${batchNumber} completed: ${batchMigrated} cafes migrated`);
      console.log(`📊 Total progress: ${totalMigrated}/${initialCount} (${Math.round((totalMigrated / initialCount) * 100)}%)`);
      
      batchNumber++;
      
      // Small delay between batches
      console.log('\n⏳ Waiting 5 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
  } catch (error: any) {
    console.error('❌ Auto-migration failed:', error.message);
    console.log('💡 You can manually run: npm run migrate:photos');
  }
}

// Run auto migration
autoMigrate().catch(console.error);
