/**
 * SEO Service for managing meta tags and structured data
 * Safe, non-breaking SEO improvements for Bean Scene
 */

export interface SEOData {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'place';
  structuredData?: any;
}

export interface CafeSEOData extends SEOData {
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  priceLevel?: number;
  latitude?: number;
  longitude?: number;
  openingHours?: string[];
  photos?: string[];
}

/**
 * Update document title and meta tags dynamically
 */
export const updateMetaTags = (data: SEOData) => {
  // Update title
  if (data.title) {
    document.title = data.title;
  }

  // Update or create meta description
  updateMetaTag('description', data.description);
  
  // Update or create meta keywords
  if (data.keywords) {
    updateMetaTag('keywords', data.keywords);
  }

  // Update Open Graph tags
  updateOGTag('og:title', data.title);
  updateOGTag('og:description', data.description);
  updateOGTag('og:type', data.type || 'website');
  updateOGTag('og:url', data.url || window.location.href);
  
  if (data.image) {
    updateOGTag('og:image', data.image);
  }

  // Update Twitter Card tags
  updateMetaTag('twitter:title', data.title);
  updateMetaTag('twitter:description', data.description);
  
  if (data.image) {
    updateMetaTag('twitter:image', data.image);
  }

  // Add canonical URL
  updateCanonicalURL(data.url);
};

/**
 * Generate SEO data for a cafe page
 */
export const generateCafeSEO = (cafe: any): CafeSEOData => {
  const baseUrl = window.location.origin;
  const cafeUrl = `${baseUrl}/cafe/${cafe.placeId}`;
  
  const title = `${cafe.name} - Houston Coffee Shop | Bean Scene`;
  const description = `Discover ${cafe.name} in Houston. ${cafe.googleRating ? `Rated ${cafe.googleRating}/5 stars. ` : ''}${cafe.neighborhood ? `Located in ${cafe.neighborhood}. ` : ''}Check-in, share photos, and connect with fellow coffee lovers on Bean Scene.`;
  
  const keywords = [
    cafe.name.toLowerCase(),
    'houston coffee',
    'houston cafe',
    cafe.neighborhood?.toLowerCase(),
    'coffee shop',
    'local cafe',
    'bean scene'
  ].filter(Boolean).join(', ');

  return {
    title,
    description,
    keywords,
    url: cafeUrl,
    type: 'place',
    name: cafe.name,
    address: cafe.address || cafe.formattedAddress,
    phone: cafe.phoneNumber,
    rating: cafe.googleRating || cafe.rating,
    priceLevel: cafe.priceLevel,
    latitude: cafe.latitude,
    longitude: cafe.longitude,
    openingHours: cafe.openingHours,
    photos: cafe.photos,
    image: cafe.heroPhotoUrl || cafe.photos?.[0] || '/cafe-social.jpg',
    structuredData: generateCafeStructuredData(cafe, cafeUrl)
  };
};

/**
 * Generate JSON-LD structured data for a cafe
 */
export const generateCafeStructuredData = (cafe: any, url: string) => {
  const baseUrl = window.location.origin;
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": cafe.name,
    "description": `Coffee shop and cafe in Houston${cafe.neighborhood ? `, ${cafe.neighborhood}` : ''}`,
    "url": url,
    "image": cafe.photos?.map((photo: string) => `${baseUrl}${photo}`) || [`${baseUrl}/cafe-social.jpg`],
    "telephone": cafe.phoneNumber,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": cafe.address || cafe.formattedAddress,
      "addressLocality": "Houston",
      "addressRegion": "TX",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": cafe.latitude,
      "longitude": cafe.longitude
    },
    "aggregateRating": cafe.googleRating ? {
      "@type": "AggregateRating",
      "ratingValue": cafe.googleRating,
      "reviewCount": cafe.userRatingsTotal || 1,
      "bestRating": 5,
      "worstRating": 1
    } : undefined,
    "priceRange": cafe.priceLevel ? "$".repeat(cafe.priceLevel) : undefined,
    "servesCuisine": "Coffee",
    "acceptsReservations": false,
    "hasMap": `https://maps.google.com/maps?q=${cafe.latitude},${cafe.longitude}`,
    "openingHoursSpecification": cafe.openingHours?.map((hours: string) => ({
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "06:00",
      "closes": "22:00"
    })) || undefined
  };

  // Remove undefined properties
  return JSON.parse(JSON.stringify(structuredData));
};

/**
 * Generate SEO data for main pages
 */
export const generatePageSEO = (page: string, data?: any): SEOData => {
  const baseUrl = window.location.origin;
  
  const seoData: Record<string, SEOData> = {
    home: {
      title: "Bean Scene - Houston Cafe Discovery & Social Check-ins",
      description: "Discover Houston's best coffee spots and share your cafe experiences with Bean Scene. Check in, share photos, and connect with fellow coffee enthusiasts.",
      keywords: "houston coffee, cafe discovery, coffee check-in, social coffee, houston cafes, coffee community",
      url: baseUrl,
      type: "website",
      image: "/cafe-social.jpg"
    },
    feed: {
      title: "Coffee Feed - Discover Houston Cafes | Bean Scene",
      description: "Browse the latest posts and check-ins from Houston's coffee community. Discover new cafes and see what fellow coffee lovers are enjoying.",
      keywords: "houston coffee feed, cafe posts, coffee check-ins, houston coffee community",
      url: `${baseUrl}/feed`,
      type: "website",
      image: "/cafe-social.jpg"
    },
    search: {
      title: "Search Houston Cafes | Bean Scene",
      description: "Find the perfect coffee shop in Houston. Search by location, rating, price, and more to discover your next favorite cafe.",
      keywords: "search houston cafes, find coffee shops, houston cafe finder, coffee shop search",
      url: `${baseUrl}/search`,
      type: "website",
      image: "/cafe-social.jpg"
    },
    profile: {
      title: "My Coffee Journey | Bean Scene",
      description: "View your coffee check-ins, posts, and favorite cafes. Track your coffee adventures across Houston.",
      keywords: "my coffee posts, coffee check-ins, favorite cafes, coffee journey",
      url: `${baseUrl}/profile`,
      type: "website",
      image: "/cafe-social.jpg"
    }
  };

  return seoData[page] || seoData.home;
};

/**
 * Helper function to update meta tags
 */
const updateMetaTag = (name: string, content: string) => {
  if (!content) return;
  
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
};

/**
 * Helper function to update Open Graph tags
 */
const updateOGTag = (property: string, content: string) => {
  if (!content) return;
  
  let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.content = content;
};

/**
 * Helper function to update canonical URL
 */
const updateCanonicalURL = (url?: string) => {
  if (!url) return;
  
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
};

/**
 * Add JSON-LD structured data to page
 */
export const addStructuredData = (data: any) => {
  // Remove existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

/**
 * Clean up SEO data when component unmounts
 */
export const cleanupSEO = () => {
  // Reset to default title
  document.title = "Bean Scene - Houston Cafe Discovery & Social Check-ins";
  
  // Reset meta description
  updateMetaTag('description', "Discover Houston's best coffee spots and share your cafe experiences with Bean Scene. Check in, share photos, and connect with fellow coffee enthusiasts.");
  
  // Reset Open Graph tags
  updateOGTag('og:title', "Bean Scene - Houston Cafe Discovery");
  updateOGTag('og:description', "Discover Houston's best coffee spots and share your cafe experiences with Bean Scene.");
  updateOGTag('og:type', 'website');
  updateOGTag('og:url', window.location.origin);
  updateOGTag('og:image', '/cafe-social.jpg');
  
  // Remove structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }
};
