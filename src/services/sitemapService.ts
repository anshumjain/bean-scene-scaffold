/**
 * Sitemap Service for generating XML sitemaps
 * Helps search engines discover and index pages
 */

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Generate XML sitemap content
 */
export const generateSitemapXML = (entries: SitemapEntry[]): string => {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  const footer = `</urlset>`;

  const urlEntries = entries.map(entry => {
    const lastmod = entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : '';
    const changefreq = entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : '';
    const priority = entry.priority ? `    <priority>${entry.priority}</priority>` : '';

    return `  <url>
    <loc>${entry.url}</loc>${lastmod}${changefreq}${priority}
  </url>`;
  }).join('\n');

  return `${header}\n${urlEntries}\n${footer}`;
};

/**
 * Generate static pages sitemap entries
 */
export const generateStaticPagesEntries = (baseUrl: string): SitemapEntry[] => {
  const today = new Date().toISOString().split('T')[0];
  
  return [
    {
      url: baseUrl,
      lastmod: today,
      changefreq: 'daily',
      priority: 1.0
    },
    {
      url: `${baseUrl}/feed`,
      lastmod: today,
      changefreq: 'hourly',
      priority: 0.9
    },
    {
      url: `${baseUrl}/search`,
      lastmod: today,
      changefreq: 'daily',
      priority: 0.8
    },
    {
      url: `${baseUrl}/check-in`,
      lastmod: today,
      changefreq: 'weekly',
      priority: 0.7
    },
    {
      url: `${baseUrl}/moments`,
      lastmod: today,
      changefreq: 'daily',
      priority: 0.8
    },
    {
      url: `${baseUrl}/recently-viewed`,
      lastmod: today,
      changefreq: 'weekly',
      priority: 0.6
    },
    {
      url: `${baseUrl}/request-cafe`,
      lastmod: today,
      changefreq: 'monthly',
      priority: 0.5
    }
  ];
};

/**
 * Generate cafe pages sitemap entries
 */
export const generateCafePagesEntries = (cafes: any[], baseUrl: string): SitemapEntry[] => {
  const today = new Date().toISOString().split('T')[0];
  
  return cafes.map(cafe => ({
    url: `${baseUrl}/cafe/${cafe.placeId}`,
    lastmod: today,
    changefreq: 'weekly',
    priority: 0.7
  }));
};

/**
 * Generate complete sitemap
 */
export const generateCompleteSitemap = async (baseUrl: string): Promise<string> => {
  // Get cafes from your database (you'll need to implement this)
  // For now, we'll generate a basic sitemap with static pages
  
  const staticEntries = generateStaticPagesEntries(baseUrl);
  
  // You can add cafe entries here when you have access to the cafe data
  // const cafeEntries = generateCafePagesEntries(cafes, baseUrl);
  
  const allEntries = [
    ...staticEntries,
    // ...cafeEntries
  ];
  
  return generateSitemapXML(allEntries);
};

/**
 * Create sitemap.txt (alternative format)
 */
export const generateSitemapTxt = (entries: SitemapEntry[]): string => {
  return entries.map(entry => entry.url).join('\n');
};
