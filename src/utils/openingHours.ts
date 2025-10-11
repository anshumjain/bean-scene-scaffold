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
  const openTimeFormatted = formatTimeForComparison(parseTimeString(openTime));
  const closeTimeFormatted = formatTimeForComparison(parseTimeString(closeTime));

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
  const [time, period] = timeString.trim().split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  const date = new Date();
  let hour24 = hours;
  
  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hour24 += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
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
