import { ApiResponse } from './types';

// Mock parking data - in real implementation, this would come from Google Places Details API
const MOCK_PARKING_DATA: Record<string, ParkingInfo> = {
  'ChIJd8BlQ2BZwokRAFQEcDlJRAI': { // Example place ID
    available: true,
    type: 'street' as const,
    cost: 'Free',
    notes: 'Street parking available'
  },
  'ChIJN1t_tDeuEmsRUsoyG83frY4': {
    available: true,
    type: 'lot' as const,
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
 * Get parking information for a cafe from stored database data
 */
export async function getParkingInfo(placeId: string): Promise<ApiResponse<ParkingInfo | null>> {
  try {
    // Get parking info from the cafe data that should already be loaded
    // This function is called from ParkingInfoComponent which should have access to cafe data
    // For now, we'll return a default response and let the component handle the display
    
    // Default parking info for cafes without specific data
    return {
      data: {
        available: true,
        type: 'street',
        cost: 'Varies',
        notes: 'Street parking typically available'
      } as ParkingInfo,
      success: true
    };
  } catch (error) {
    console.error('Error getting parking info:', error);
    
    // Fallback to mock data if something goes wrong
    const parkingInfo = MOCK_PARKING_DATA[placeId as keyof typeof MOCK_PARKING_DATA];
    
    if (parkingInfo) {
      return {
        data: parkingInfo as ParkingInfo,
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
      } as ParkingInfo,
      success: true
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

