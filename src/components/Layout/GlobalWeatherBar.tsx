import { useEffect, useState } from "react";
import { Cloud } from "lucide-react";
import { getHoustonWeather, type WeatherData } from "@/services/weatherService";

export function GlobalWeatherBar() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      setLoading(true);
      const result = await getHoustonWeather();
      if (result.success) {
        setWeather(result.data);
      }
      setLoading(false);
    }
    fetchWeather();
  }, []);

  if (loading || !weather) {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 bg-primary/10 backdrop-blur-md border-b border-primary/20">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Houston</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{weather.icon}</span>
          <span className="text-sm font-semibold">{Math.round(weather.temperature)}°F</span>
          <span className="text-sm text-muted-foreground">{weather.condition}</span>
        </div>
      </div>
    </div>
  );
}
