import { ApiResponse } from './types';
import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CafeValidationData {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  rating?: number;
  priceLevel?: number;
}

/**
 * Validate cafe data for completeness and accuracy
 */
export async function validateCafeData(cafe: CafeValidationData): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required field validation
  if (!cafe.name || cafe.name.trim().length === 0) {
    errors.push('Cafe name is required');
  }

  if (!cafe.address || cafe.address.trim().length === 0) {
    errors.push('Cafe address is required');
  }

  if (!cafe.latitude || !cafe.longitude) {
    errors.push('Cafe coordinates are required');
  }

  // Coordinate validation (Houston area bounds)
  if (cafe.latitude && cafe.longitude) {
    if (cafe.latitude < 29.0 || cafe.latitude > 30.5) {
      warnings.push('Latitude seems outside Houston metro area');
    }
    if (cafe.longitude < -96.0 || cafe.longitude > -94.5) {
      warnings.push('Longitude seems outside Houston metro area');
    }
  }

  // Phone number validation
  if (cafe.phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(cafe.phone.replace(/[\s\-\(\)]/g, ''))) {
      warnings.push('Phone number format may be invalid');
    }
  }

  // Website validation
  if (cafe.website) {
    try {
      new URL(cafe.website);
    } catch {
      warnings.push('Website URL format may be invalid');
    }
  }

  // Rating validation
  if (cafe.rating !== undefined) {
    if (cafe.rating < 0 || cafe.rating > 5) {
      errors.push('Rating must be between 0 and 5');
    }
  }

  // Price level validation
  if (cafe.priceLevel !== undefined) {
    if (cafe.priceLevel < 1 || cafe.priceLevel > 4) {
      errors.push('Price level must be between 1 and 4');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check for duplicate cafes based on name and location
 */
export async function checkForDuplicates(cafe: CafeValidationData): Promise<ApiResponse<string[]>> {
  try {
    const { data, error } = await supabase
      .from('cafes')
      .select('id, name, latitude, longitude')
      .neq('id', cafe.id);

    if (error) {
      throw new Error(error.message);
    }

    const duplicates: string[] = [];
    const threshold = 0.01; // ~0.6 miles

    for (const existingCafe of data || []) {
      // Check name similarity
      const nameSimilarity = calculateStringSimilarity(
        cafe.name.toLowerCase(),
        existingCafe.name.toLowerCase()
      );

      // Check location proximity
      const distance = calculateDistance(
        cafe.latitude,
        cafe.longitude,
        existingCafe.latitude,
        existingCafe.longitude
      );

      if (nameSimilarity > 0.8 && distance < threshold) {
        duplicates.push(existingCafe.id);
      }
    }

    return {
      data: duplicates,
      success: true
    };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check for duplicates'
    };
  }
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
}

/**
 * Calculate distance between two coordinates in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validate all cafes in the database
 */
export async function validateAllCafes(): Promise<ApiResponse<{
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  duplicates: number;
}>> {
  try {
    const { data: cafes, error } = await supabase
      .from('cafes')
      .select('*');

    if (error) {
      throw new Error(error.message);
    }

    let valid = 0;
    let invalid = 0;
    let warnings = 0;
    let duplicates = 0;

    for (const cafe of cafes || []) {
      const validation = await validateCafeData(cafe);
      const duplicateCheck = await checkForDuplicates(cafe);

      if (validation.isValid) {
        valid++;
      } else {
        invalid++;
      }

      if (validation.warnings.length > 0) {
        warnings++;
      }

      if (duplicateCheck.success && duplicateCheck.data.length > 0) {
        duplicates++;
      }
    }

    return {
      data: {
        total: cafes?.length || 0,
        valid,
        invalid,
        warnings,
        duplicates
      },
      success: true
    };
  } catch (error) {
    return {
      data: {
        total: 0,
        valid: 0,
        invalid: 0,
        warnings: 0,
        duplicates: 0
      },
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate cafes'
    };
  }
}