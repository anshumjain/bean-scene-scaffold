import { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface RadiusFilterProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  userLocation?: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
  locationError?: string;
}

export function RadiusFilter({ 
  radius, 
  onRadiusChange, 
  userLocation, 
  onRequestLocation,
  locationError 
}: RadiusFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const radiusOptions = [
    { value: 1, label: '1 mile', color: 'bg-green-500' },
    { value: 3, label: '3 miles', color: 'bg-yellow-500' },
    { value: 5, label: '5 miles', color: 'bg-orange-500' },
    { value: 10, label: '10 miles', color: 'bg-red-500' },
    { value: 25, label: 'Show All', color: 'bg-gray-500' }
  ];

  const getCurrentRadiusOption = () => {
    return radiusOptions.find(option => option.value === radius) || radiusOptions[4];
  };

  const currentOption = getCurrentRadiusOption();

  if (!userLocation) {
    return (
      <Card className="p-4 bg-muted/30 border-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Near Me</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestLocation}
            className="text-xs"
          >
            Enable Location
          </Button>
        </div>
        {locationError && (
          <p className="text-xs text-muted-foreground mt-2">{locationError}</p>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-muted/30 border-0">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Search Radius</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Collapse' : 'Customize'}
          </Button>
        </div>

        {/* Quick Radius Options */}
        <div className="flex gap-2 flex-wrap">
          {radiusOptions.map((option) => (
            <Button
              key={option.value}
              variant={radius === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onRadiusChange(option.value)}
              className="text-xs h-8"
            >
              <div className={`w-2 h-2 rounded-full ${option.color} mr-1`} />
              {option.label}
            </Button>
          ))}
        </div>

        {/* Current Selection */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <div className={`w-2 h-2 rounded-full ${currentOption.color} mr-1`} />
            {currentOption.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {radius < 25 ? `Within ${radius} mile${radius > 1 ? 's' : ''}` : 'All Houston cafes'}
          </span>
        </div>

        {/* Expanded Custom Slider */}
        {isExpanded && (
          <div className="pt-3 border-t border-border">
            <Label className="text-sm font-medium mb-3 block">
              Custom Radius: {radius} mile{radius > 1 ? 's' : ''}
            </Label>
            <div className="px-3">
              <Slider
                value={[radius]}
                onValueChange={([value]) => onRadiusChange(value)}
                max={25}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 mi</span>
              <span>25 mi</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}















