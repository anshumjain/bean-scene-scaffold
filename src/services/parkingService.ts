import { ApiResponse } from './types';

// Mock parking data - in real implementation, this would come from Google Places Details API
const MOCK_PARKING_DATA = {
  'ChIJd8BlQ2BZwokRAFQEcDlJRAI': { // Example place ID
    available: true,
    type: 'street',
    cost: 'Free',
    notes: 'Street parking available'
  },
  'ChIJN1t_tDeuEmsRUsoyG83frY4': {
    available: true,
    type: 'lot',
    cost: '$2/hour',
    notes: 'Paid parking lot nearby'
  }
};

export interface ParkingInfo {
  available: boolean;
  type: 'street' | 'lot' | 'garage' | 'valet' | 'none';
  cost: string;
  notes?: string;
}

/**
 * Get parking information for a cafe
 * In real implementation, this would call Google Places Details API server-side
 */
export async function getParkingInfo(placeId: string): Promise<ApiResponse<ParkingInfo | null>> {
  try {
    // Mock implementation - in real app, this would call server-side API
    const parkingInfo = MOCK_PARKING_DATA[placeId as keyof typeof MOCK_PARKING_DATA];
    
    if (parkingInfo) {
      return {
        data: parkingInfo,
        success: true
      };
    }

    // Default parking info for cafes without specific data
    return {
      data: {
        available: true,
        type: 'street',
        cost: 'Varies',
        notes: 'Street parking typically available'
      },
      success: true
    };
  } catch (error) {
    return {
      data: null,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get parking info'
    };
  }
}

/**
 * Get parking availability status
 */
export function getParkingStatus(parkingInfo: ParkingInfo): {
  status: 'available' | 'limited' | 'paid' | 'none';
  color: string;
  icon: string;
} {
  if (!parkingInfo.available) {
    return { status: 'none', color: 'text-red-500', icon: '🚫' };
  }

  switch (parkingInfo.type) {
    case 'street':
      return { status: 'available', color: 'text-green-500', icon: '🅿️' };
    case 'lot':
    case 'garage':
      return { status: 'paid', color: 'text-yellow-500', icon: '💰' };
    case 'valet':
      return { status: 'paid', color: 'text-blue-500', icon: '🚗' };
    default:
      return { status: 'limited', color: 'text-orange-500', icon: '⚠️' };
  }
}
