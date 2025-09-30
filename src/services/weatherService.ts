import { ApiResponse } from './types';

export interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  summary: string;
  cachedAt: string;
}

// In-memory cache (per session)
const weatherCache: Record<string, { data: WeatherData; expires: number }> = {};

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

function getCacheKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export async function getWeatherForLatLng(lat: number, lng: number): Promise<ApiResponse<WeatherData>> {
  const cacheKey = getCacheKey(lat, lng);
  const now = Date.now();
  if (weatherCache[cacheKey] && weatherCache[cacheKey].expires > now) {
    return { data: weatherCache[cacheKey].data, success: true };
  }
  try {
    // Open-Meteo API with Fahrenheit temperature unit
    const url = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=precipitation&timezone=auto&temperature_unit=fahrenheit`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch weather');
    const json = await resp.json();
    const current = json.current_weather;
    const precipitation = json.hourly?.precipitation?.[0] ?? 0;
    const summary = getWeatherSummary(current.weathercode);
    const icon = getWeatherIcon(summary);
    const data: WeatherData = {
      temperature: current.temperature,
      condition: summary,
      icon,
      humidity: current.relative_humidity ?? 0,
      windSpeed: current.windspeed,
      precipitation,
      summary,
      cachedAt: new Date().toISOString(),
    };
    weatherCache[cacheKey] = { data, expires: now + 60 * 60 * 1000 };
    return { data, success: true };
  } catch (error: any) {
    return {
      data: weatherCache[cacheKey]?.data || {
        temperature: 0,
        condition: 'Unavailable',
        icon: '',
        humidity: 0,
        windSpeed: 0,
        precipitation: 0,
        summary: 'Unavailable',
        cachedAt: new Date().toISOString(),
      },
      success: false,
      error: error.message || 'Failed to fetch weather',
    };
  }
}

export async function getHoustonWeather(): Promise<ApiResponse<WeatherData>> {
  // Houston center: 29.7604, -95.3698
  return getWeatherForLatLng(29.7604, -95.3698);
}

// Open-Meteo weathercode to summary
function getWeatherSummary(code: number): string {
  // See https://open-meteo.com/en/docs#api_form for codes
  if ([0].includes(code)) return 'Clear';
  if ([1, 2, 3].includes(code)) return 'Partly Cloudy';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Unknown';
}

export function getWeatherIcon(condition: string): string {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes('sunny') || conditionLower.includes('clear')) return '\u2600\ufe0f';
  if (conditionLower.includes('cloudy')) return '\u26c5';
  if (conditionLower.includes('rain')) return '\ud83c\udf27\ufe0f';
  if (conditionLower.includes('storm')) return '\u26c8\ufe0f';
  if (conditionLower.includes('snow')) return '\u2744\ufe0f';
  if (conditionLower.includes('fog')) return '\ud83c\udf2b\ufe0f';
  return '\ud83c\udf24\ufe0f'; // Default
}

export function getWeatherColor(temperature: number): string {
  if (temperature < 50) return 'text-blue-500';
  if (temperature < 70) return 'text-green-500';
  if (temperature < 85) return 'text-yellow-500';
  return 'text-red-500';
}


