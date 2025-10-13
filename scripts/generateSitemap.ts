/**
 * Script to generate a dynamic sitemap.xml with all cafes
 * Run this periodically to keep sitemap updated
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// You'll need to set these environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

interface Cafe {
  id: string;
  placeId: string;
  name: string;
  updated_at: string;
}

async function generateSitemap() {
  try {
    console.log('Generating sitemap...');
    
    // Fetch all cafes from database
    const { data: cafes, error } = await supabase
      .from('cafes')
      .select('id, placeId, name, updated_at')
      .eq('isActive', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching cafes:', error);
      return;
    }

    const baseUrl = 'https://beanscene.app';
    const today = new Date().toISOString().split('T')[0];

    // Static pages
    const staticPages = [
      { url: baseUrl, priority: 1.0, changefreq: 'daily' },
      { url: `${baseUrl}/feed`, priority: 0.9, changefreq: 'hourly' },
      { url: `${baseUrl}/search`, priority: 0.8, changefreq: 'daily' },
      { url: `${baseUrl}/check-in`, priority: 0.7, changefreq: 'weekly' },
      { url: `${baseUrl}/moments`, priority: 0.8, changefreq: 'daily' },
      { url: `${baseUrl}/recently-viewed`, priority: 0.6, changefreq: 'weekly' },
      { url: `${baseUrl}/request-cafe`, priority: 0.5, changefreq: 'monthly' }
    ];

    // Generate XML content
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add static pages
    staticPages.forEach(page => {
      xml += `
  <url>
    <loc>${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    // Add cafe pages
    if (cafes && cafes.length > 0) {
      cafes.forEach(cafe => {
        const lastmod = new Date(cafe.updated_at).toISOString().split('T')[0];
        xml += `
  <url>
    <loc>${baseUrl}/cafe/${cafe.placeId}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      });
    }

    xml += `
</urlset>`;

    // Write to public directory
    const sitemapPath = join(process.cwd(), 'public', 'sitemap.xml');
    writeFileSync(sitemapPath, xml);

    console.log(`✅ Sitemap generated successfully with ${cafes?.length || 0} cafes`);
    console.log(`📁 Saved to: ${sitemapPath}`);

  } catch (error) {
    console.error('Error generating sitemap:', error);
  }
}

// Run if called directly
if (require.main === module) {
  generateSitemap();
}

export { generateSitemap };
