// TypeScript interfaces for Bean Scene Houston Cafe App

export interface Cafe {
  id: string;
  placeId: string;
  name: string;
  address: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  rating?: number;
  googleRating?: number;
  priceLevel?: number;
  phoneNumber?: string;
  website?: string;
  openingHours?: string[];
  parkingInfo?: string;
  photos?: string[];
  heroPhotoUrl?: string;
  photoSource?: 'google' | 'user' | null;
  googlePhotoReference?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Post {
  id: string;
  userId: string;
  cafeId: string;
  placeId: string;
  imageUrl: string;
  rating: number;
  textReview: string;
  tags: string[];
  likes: number;
  comments: number;
  createdAt: string;
  username?: string;
  deviceId?: string;
  source?: 'google' | 'user';
  photoSource?: 'google' | 'user';
  cafe?: Pick<Cafe, 'name' | 'neighborhood' | 'placeId'>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  createdAt: string;
}

export interface CheckInData {
  cafeId: string;
  placeId: string;
  rating: number;
  imageFile?: File;
  imageUrl?: string;
  tags: string[];
  review: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface FeedItem {
  type: "cafe" | "post" | "check-in";
  id: string;
  createdAt: string;
  // Cafe-specific fields (when type === "cafe")
  cafe?: Cafe;
  // Post-specific fields (when type === "post")
  post?: Post;
  // Check-in-specific fields (when type === "check-in")
  checkIn?: {
    cafeId: string;
    coords: { lat: number; lng: number };
    timestamp: number;
    image?: string;
    caption?: string;
    tags?: string[];
    anonId: string;
  };
}

export interface GooglePlacesResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  price_level?: number;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text: string[];
  };
  photos?: Array<{
    photo_reference: string;
  }>;
}

export interface GoogleReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

export interface CafeReview {
  id: string;
  cafeId: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  profilePhotoUrl?: string;
  time: string;
  source: 'google' | 'user';
}

// Content source type for attribution
export type ContentSource = 'google' | 'user';

export interface SearchFilters {
  query?: string;
  neighborhoods?: string[];
  tags?: string[];
  rating?: number;
  distance?: number;
  priceLevel?: number[];
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// Houston Metro Area Bounds
export const HOUSTON_BOUNDS = {
  north: 30.110732,
  south: 29.523624,
  east: -95.014648,
  west: -95.669403
};

// Houston Neighborhoods
export const HOUSTON_NEIGHBORHOODS = [
  "Montrose", "Heights", "Downtown", "Midtown", "Rice Village",
  "West University", "River Oaks", "Memorial", "Galleria", "East End",
  "Museum District", "Washington Avenue", "EaDo", "Third Ward", "Fifth Ward"
];

// Popular Coffee Tags
export const COFFEE_TAGS = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave", "cold-brew",
  "pastries", "rooftop", "instagram-worthy", "pet-friendly", "outdoor-seating",
  "wifi", "quiet", "busy", "date-spot", "group-friendly", "drive-thru"
];

// Favorites and Activity Types
export interface Favorite {
  id: string;
  userId?: string;
  deviceId?: string;
  cafeId: string;
  createdAt: string;
}

export type ActivityType = 'check-in' | 'review' | 'photo-upload' | 'favorite';

export interface UserActivity {
  id: string;
  userId?: string;
  username?: string;
  activityType: ActivityType;
  cafeId?: string;
  createdAt: string;
  metadata?: any;
}