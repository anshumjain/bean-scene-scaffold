/**
 * Utility functions for parsing and checking cafe opening hours
 */

export interface OpeningHours {
  day: string;
  hours: string;
  isOpen24h?: boolean;
  isClosed?: boolean;
}

/**
 * Parse opening hours from Google Places API format
 * Example: ["Monday: 6:00 AM – 10:00 PM", "Tuesday: 6:00 AM – 10:00 PM", ...]
 */
export function parseOpeningHours(hoursArray: string[]): OpeningHours[] {
  if (!hoursArray || hoursArray.length === 0) {
    return [];
  }

  return hoursArray.map(hoursString => {
    // Handle "Closed" entries
    if (hoursString.toLowerCase().includes('closed')) {
      return {
        day: hoursString.split(':')[0],
        hours: 'Closed',
        isClosed: true
      };
    }

    // Handle "Open 24 hours" entries
    if (hoursString.toLowerCase().includes('24 hours') || hoursString.toLowerCase().includes('open 24')) {
      return {
        day: hoursString.split(':')[0],
        hours: 'Open 24 hours',
        isOpen24h: true
      };
    }

    // Parse normal hours format: "Monday: 6:00 AM – 10:00 PM"
    const [day, hours] = hoursString.split(': ');
    return {
      day: day.trim(),
      hours: hours?.trim() || 'Closed',
      isClosed: !hours || hours.toLowerCase().includes('closed')
    };
  });
}

/**
 * Check if a cafe is currently open based on its opening hours
 */
export function isCafeOpenNow(openingHoursArray: string[]): boolean {
  if (!openingHoursArray || openingHoursArray.length === 0) {
    return false; // No hours data, assume closed
  }

  const parsedHours = parseOpeningHours(openingHoursArray);
  const now = new Date();
  const currentDay = getDayName(now.getDay());
  const currentTime = formatTimeForComparison(now);

  // Find today's hours
  const todayHours = parsedHours.find(hours => 
    hours.day.toLowerCase() === currentDay.toLowerCase()
  );

  if (!todayHours) {
    return false; // No hours for today
  }

  // Handle closed days
  if (todayHours.isClosed) {
    return false;
  }

  // Handle 24-hour cafes
  if (todayHours.isOpen24h) {
    return true;
  }

  // Parse opening and closing times
  const timeRange = todayHours.hours;
  if (!timeRange || timeRange === 'Closed') {
    return false;
  }

  // Handle formats like "6:00 AM – 10:00 PM" or "6:00 AM - 10:00 PM"
  const timeMatch = timeRange.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[–-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  
  if (!timeMatch) {
    return false; // Can't parse time format
  }

  const [, openTime, closeTime] = timeMatch;
  
  let openTimeFormatted: number;
  let closeTimeFormatted: number;
  
  try {
    openTimeFormatted = formatTimeForComparison(parseTimeString(openTime));
    closeTimeFormatted = formatTimeForComparison(parseTimeString(closeTime));
  } catch (error) {
    console.warn('Error parsing opening hours:', error, 'for time range:', timeRange);
    return false; // Can't parse time, assume closed
  }

  // Handle overnight hours (e.g., 10 PM - 6 AM)
  if (closeTimeFormatted < openTimeFormatted) {
    return currentTime >= openTimeFormatted || currentTime <= closeTimeFormatted;
  }

  // Normal hours (e.g., 6 AM - 10 PM)
  return currentTime >= openTimeFormatted && currentTime <= closeTimeFormatted;
}

/**
 * Get day name from day number (0 = Sunday, 1 = Monday, etc.)
 */
function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber];
}

/**
 * Parse time string like "6:00 AM" into a Date object for today
 */
function parseTimeString(timeString: string): Date {
  if (!timeString || typeof timeString !== 'string') {
    throw new Error('Invalid time string');
  }
  
  const trimmed = timeString.trim();
  const parts = trimmed.split(' ');
  
  if (parts.length < 2) {
    throw new Error('Time string must include AM/PM');
  }
  
  const [time, period] = parts;
  const timeParts = time.split(':');
  
  if (timeParts.length !== 2) {
    throw new Error('Time must be in HH:MM format');
  }
  
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error('Invalid time format');
  }
  
  if (!period) {
    throw new Error('Period (AM/PM) is required');
  }
  
  const date = new Date();
  let hour24 = hours;
  
  const periodUpper = period.toUpperCase();
  if (periodUpper === 'PM' && hours !== 12) {
    hour24 += 12;
  } else if (periodUpper === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  date.setHours(hour24, minutes, 0, 0);
  return date;
}

/**
 * Format time for comparison (HHMM format)
 */
function formatTimeForComparison(date: Date): number {
  return date.getHours() * 100 + date.getMinutes();
}

/**
 * Get human-readable opening status
 */
export function getOpeningStatus(openingHoursArray: string[]): {
  isOpen: boolean;
  status: string;
  nextChange?: string;
} {
  if (!openingHoursArray || openingHoursArray.length === 0) {
    return {
      isOpen: false,
      status: 'Hours not available'
    };
  }

  const isOpen = isCafeOpenNow(openingHoursArray);
  
  if (isOpen) {
    return {
      isOpen: true,
      status: 'Open now'
    };
  } else {
    return {
      isOpen: false,
      status: 'Closed now'
    };
  }
}
