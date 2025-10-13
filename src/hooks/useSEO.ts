import { useEffect } from 'react';
import { updateMetaTags, generatePageSEO, cleanupSEO } from '@/services/seoService';

/**
 * Hook for managing SEO meta tags on page components
 * Automatically handles cleanup when component unmounts
 */
export const useSEO = (page: string, customData?: any) => {
  useEffect(() => {
    const seoData = customData || generatePageSEO(page);
    updateMetaTags(seoData);

    return () => {
      cleanupSEO();
    };
  }, [page, customData]);
};

/**
 * Hook specifically for cafe pages with structured data
 */
export const useCafeSEO = (cafe: any) => {
  useEffect(() => {
    if (cafe) {
      const { generateCafeSEO, addStructuredData } = require('@/services/seoService');
      const seoData = generateCafeSEO(cafe);
      updateMetaTags(seoData);
      if (seoData.structuredData) {
        addStructuredData(seoData.structuredData);
      }
    }

    return () => {
      cleanupSEO();
    };
  }, [cafe]);
};
