import { useState, useEffect } from 'react';
import { MapPin, DollarSign, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getParkingInfo, getParkingStatus, type ParkingInfo } from '@/services/parkingService';

/**
 * Parse stored parking info string into ParkingInfo object
 */
function parseStoredParkingInfo(parkingInfoString: string): ParkingInfo {
  const text = parkingInfoString.toLowerCase();
  
  if (text.includes('limited') || text.includes('no parking')) {
    return {
      available: false,
      type: 'none',
      cost: 'N/A',
      notes: parkingInfoString
    };
  } else if (text.includes('garage')) {
    return {
      available: true,
      type: 'garage',
      cost: 'Paid',
      notes: parkingInfoString
    };
  } else if (text.includes('lot')) {
    return {
      available: true,
      type: 'lot',
      cost: 'Paid',
      notes: parkingInfoString
    };
  } else if (text.includes('street')) {
    return {
      available: true,
      type: 'street',
      cost: 'Free',
      notes: parkingInfoString
    };
  } else if (text.includes('parking')) {
    return {
      available: true,
      type: 'street',
      cost: 'Varies',
      notes: parkingInfoString
    };
  }
  
  // Default fallback
  return {
    available: true,
    type: 'street',
    cost: 'Varies',
    notes: parkingInfoString || 'Parking information not available'
  };
}

interface ParkingInfoProps {
  placeId: string;
  cafeName: string;
  parkingInfo?: string; // Add parking info from cafe data
}

export function ParkingInfoComponent({ placeId, cafeName, parkingInfo: storedParkingInfo }: ParkingInfoProps) {
  const [parkingInfo, setParkingInfo] = useState<ParkingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadParkingInfo = async () => {
      try {
        setLoading(true);
        
        // If we have stored parking info from the database, use it
        if (storedParkingInfo) {
          const parsedInfo = parseStoredParkingInfo(storedParkingInfo);
          setParkingInfo(parsedInfo);
        } else {
          // Fallback to API call if no stored info
          const result = await getParkingInfo(placeId);
          
          if (result.success && result.data) {
            setParkingInfo(result.data);
          } else {
            setError(result.error || 'Failed to load parking info');
          }
        }
      } catch (err) {
        setError('Failed to load parking info');
      } finally {
        setLoading(false);
      }
    };

    loadParkingInfo();
  }, [placeId, storedParkingInfo]);

  if (loading) {
    return (
      <Card className="p-4 bg-muted/30 border-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground animate-pulse" />
          <span className="text-sm text-muted-foreground">Loading parking info...</span>
        </div>
      </Card>
    );
  }

  if (error || !parkingInfo) {
    return (
      <Card className="p-4 bg-muted/30 border-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Parking info unavailable</span>
        </div>
      </Card>
    );
  }

  const status = getParkingStatus(parkingInfo);

  return (
    <Card className="p-4 bg-muted/30 border-0">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <span className="text-lg">{status.icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium">Parking</h4>
            <Badge 
              variant="secondary" 
              className={`text-xs ${status.color} bg-transparent border-0 p-0`}
            >
              {status.status}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{parkingInfo.cost}</span>
            </div>
            
            {parkingInfo.notes && (
              <div className="flex items-start gap-2">
                <Info className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">{parkingInfo.notes}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

