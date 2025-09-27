import { useState, useEffect } from 'react';
import { MapPin, DollarSign, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getParkingInfo, getParkingStatus, type ParkingInfo } from '@/services/parkingService';

interface ParkingInfoProps {
  placeId: string;
  cafeName: string;
}

export function ParkingInfoComponent({ placeId, cafeName }: ParkingInfoProps) {
  const [parkingInfo, setParkingInfo] = useState<ParkingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadParkingInfo = async () => {
      try {
        setLoading(true);
        const result = await getParkingInfo(placeId);
        
        if (result.success && result.data) {
          setParkingInfo(result.data);
        } else {
          setError(result.error || 'Failed to load parking info');
        }
      } catch (err) {
        setError('Failed to load parking info');
      } finally {
        setLoading(false);
      }
    };

    loadParkingInfo();
  }, [placeId]);

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
