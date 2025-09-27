import { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getHoustonWeather, getWeatherIcon, getWeatherColor, type WeatherData } from '@/services/weatherService';

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        setLoading(true);
        const result = await getHoustonWeather();
        
        if (result.success && result.data) {
          setWeather(result.data);
        } else {
          setError(result.error || 'Failed to load weather');
        }
      } catch (err) {
        setError('Failed to load weather');
      } finally {
        setLoading(false);
      }
    };

    loadWeather();
  }, []);

  if (loading) {
    return (
      <Card className="p-4 bg-muted/30 border-0">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-muted-foreground animate-pulse" />
          <span className="text-sm text-muted-foreground">Loading weather...</span>
        </div>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="p-4 bg-muted/30 border-0">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Weather unavailable</span>
        </div>
      </Card>
    );
  }

  const weatherIcon = getWeatherIcon(weather.condition);
  const temperatureColor = getWeatherColor(weather.temperature);

  return (
    <Card className="p-4 bg-muted/30 border-0">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <span className="text-2xl">{weatherIcon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium">Houston Weather</h4>
            <Badge variant="secondary" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-semibold ${temperatureColor}`}>
                {weather.temperature}°F
              </span>
              <span className="text-sm text-muted-foreground">{weather.condition}</span>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                <span>{weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3" />
                <span>{weather.windSpeed} mph</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
