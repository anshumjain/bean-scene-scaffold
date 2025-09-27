import { ApiResponse } from './types';

export interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  cachedAt: string;
}

// Mock weather data - in real implementation, this would call Open-Meteo API
const MOCK_WEATHER_DATA: WeatherData = {
  temperature: 72,
  condition: 'Partly Cloudy',
  icon: '⛅',
  humidity: 65,
  windSpeed: 8,
  cachedAt: new Date().toISOString()
};

/**
 * Get weather information for Houston
 * In real implementation, this would call Open-Meteo API server-side
 */
export async function getHoustonWeather(): Promise<ApiResponse<WeatherData>> {
  try {
    // Mock implementation - in real app, this would call server-side API
    // that fetches from Open-Meteo API with 1-hour caching
    
    return {
      data: MOCK_WEATHER_DATA,
      success: true
    };
  } catch (error) {
    return {
      data: MOCK_WEATHER_DATA, // Fallback to mock data
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get weather data'
    };
  }
}

/**
 * Get weather icon based on condition
 */
export function getWeatherIcon(condition: string): string {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('sunny') || conditionLower.includes('clear')) return '☀️';
  if (conditionLower.includes('cloudy')) return '⛅';
  if (conditionLower.includes('rain')) return '🌧️';
  if (conditionLower.includes('storm')) return '⛈️';
  if (conditionLower.includes('snow')) return '❄️';
  if (conditionLower.includes('fog')) return '🌫️';
  
  return '🌤️'; // Default
}

/**
 * Get weather color based on temperature
 */
export function getWeatherColor(temperature: number): string {
  if (temperature < 50) return 'text-blue-500';
  if (temperature < 70) return 'text-green-500';
  if (temperature < 85) return 'text-yellow-500';
  return 'text-red-500';
}
