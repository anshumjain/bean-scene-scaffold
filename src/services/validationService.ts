import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './types';

interface ValidationResult {
  isValid: boolean;
  cafeExists: boolean;
  message: string;
}

interface ValidationAttempt {
  cafeId: string;
  userId: string;
  isValid: boolean;
  attemptedAt: string;
}

/**
 * Cafe ID validation service with database integration
 */
export class ValidationService {
  /**
   * Validate if a cafe exists in the database
   */
  static async validateCafeId(cafeId: string, userId?: string): Promise<ApiResponse<ValidationResult>> {
    try {
      // Check if cafe exists
      const { data: cafe, error } = await supabase
        .from('cafes')
        .select('id, name, is_active')
        .eq('id', cafeId)
        .eq('is_active', true)
        .single();

      const cafeExists = !error && cafe !== null;
      const isValid = cafeExists;

      // Log validation attempt
      if (userId) {
        await this.logValidationAttempt(cafeId, userId, isValid);
      }

      const result: ValidationResult = {
        isValid,
        cafeExists,
        message: isValid 
          ? `Valid cafe: ${cafe?.name}`
          : 'Cafe not found or inactive'
      };

      return {
        data: result,
        success: true
      };
    } catch (error) {
      return {
        data: {
          isValid: false,
          cafeExists: false,
          message: 'Validation failed'
        },
        success: false,
        error: error instanceof Error ? error.message : 'Validation error'
      };
    }
  }

  /**
   * Log validation attempt for monitoring
   */
  private static async logValidationAttempt(
    cafeId: string,
    userId: string,
    isValid: boolean
  ): Promise<void> {
    try {
      await supabase
        .from('validation_logs')
        .insert({
          place_id: cafeId,
          user_id: userId,
          validation_result: isValid,
          action_type: 'cafe_validation'
        });
    } catch (error) {
      console.warn('Failed to log validation attempt:', error);
    }
  }

  /**
   * Get validation statistics for monitoring
   */
  static async getValidationStats(days: number = 7): Promise<ApiResponse<any>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('validation_logs')
        .select('validation_result, created_at')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const totalAttempts = data.length;
      const validAttempts = data.filter(log => log.validation_result).length;
      const invalidAttempts = totalAttempts - validAttempts;

      const stats = {
        totalAttempts,
        validAttempts,
        invalidAttempts,
        validationRate: totalAttempts > 0 ? (validAttempts / totalAttempts) * 100 : 0,
        period: `${days} days`
      };

      return {
        data: stats,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get validation stats'
      };
    }
  }

  /**
   * Validate multiple cafe IDs in batch
   */
  static async batchValidateCafeIds(cafeIds: string[]): Promise<ApiResponse<Record<string, ValidationResult>>> {
    try {
      const results: Record<string, ValidationResult> = {};

      // Process in batches of 10
      for (let i = 0; i < cafeIds.length; i += 10) {
        const batch = cafeIds.slice(i, i + 10);
        
        const { data: cafes, error } = await supabase
          .from('cafes')
          .select('id, name, is_active')
          .in('id', batch)
          .eq('is_active', true);

        if (error) throw error;

        // Map results
        for (const cafeId of batch) {
          const cafe = cafes?.find(c => c.id === cafeId);
          const cafeExists = !!cafe;
          
          results[cafeId] = {
            isValid: cafeExists,
            cafeExists,
            message: cafeExists ? `Valid cafe: ${cafe.name}` : 'Cafe not found or inactive'
          };
        }
      }

      return {
        data: results,
        success: true
      };
    } catch (error) {
      return {
        data: {},
        success: false,
        error: error instanceof Error ? error.message : 'Batch validation failed'
      };
    }
  }
}