import { useEffect, useState } from 'react';
import { Cloud, Droplets, Wind, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getHoustonWeather, getWeatherIcon, getWeatherColor, type WeatherData } from '@/services/weatherService';

function getDefaultUnit() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('weatherUnit');
    if (stored === 'C' || stored === 'F') return stored;
    const locale = navigator.language || '';
    if (locale.startsWith('en-US')) return 'F';
  }
  return 'C';
}

export function WeatherWidget({ unit: propUnit }: { unit?: 'F' | 'C' }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<'F' | 'C'>(propUnit || getDefaultUnit());

  useEffect(() => {
    if (propUnit) setUnit(propUnit);
  }, [propUnit]);

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

  useEffect(() => {
    if (!propUnit) localStorage.setItem('weatherUnit', unit);
  }, [unit, propUnit]);

  const toggleUnit = () => setUnit(u => (u === 'F' ? 'C' : 'F'));

  function toCelsius(f: number) { return ((f - 32) * 5) / 9; }
  function toFahrenheit(c: number) { return (c * 9) / 5 + 32; }

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
  const tempF = weather.temperature;
  const tempC = toCelsius(tempF);
  const displayTemp = unit === 'F' ? Math.round(tempF) : Math.round(tempC);
  const temperatureColor = getWeatherColor(unit === 'F' ? tempF : tempC);

  // Precipitation
  const precipitation = weather.precipitation;
  const precipitationDisplay =
    precipitation !== undefined && precipitation !== null
      ? `${precipitation}%`
      : 'No precipitation data';

  // 6-12h summary (use weather.summary if available)
  const summary = weather.summary || 'No summary available';

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
            <button
              className="ml-2 px-2 py-0.5 rounded text-xs border border-border bg-background hover:bg-muted transition"
              onClick={toggleUnit}
              aria-label="Toggle temperature unit"
              type="button"
            >
              {unit === 'F' ? '°F' : '°C'}
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-semibold ${temperatureColor}`}>{displayTemp}°{unit}</span>
              <span className="text-sm text-muted-foreground">{weather.condition}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                <span>{precipitationDisplay}</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3" />
                <span>{weather.windSpeed} mph</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Humidity:</span>
                <span>{weather.humidity}%</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <span>{summary}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}



