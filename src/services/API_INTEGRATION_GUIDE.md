# API Integration Guide

This guide explains where to update API endpoints in the Houston Coffee Connect service layer to connect to real backend services.

## Service Layer Architecture

The app uses a service layer pattern with the following files:
- `src/services/types.ts` - TypeScript interfaces and types
- `src/services/utils.ts` - Utility functions for API calls
- `src/services/cafeService.ts` - Cafe-related API calls
- `src/services/postService.ts` - Post/review-related API calls
- `src/services/cloudinaryService.ts` - Image upload and management
- `src/services/scheduledService.ts` - Background sync operations

## Where to Update APIs

### 1. Cafe Service (`src/services/cafeService.ts`)

#### Get Nearby Cafes
**Location:** Lines 15-45 in `fetchNearbyCafes()`
**Current:** Returns mock data
**Update:** Replace with Google Places Nearby Search API call
```typescript
// TODO: Replace this mock implementation
const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=cafe&key=${GOOGLE_PLACES_API_KEY}`;
```

#### Search Cafes
**Location:** Lines 67-85 in `searchCafes()`
**Current:** Filters mock data
**Update:** Replace with Google Places Text Search API call
```typescript
// TODO: Replace with real API call
const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)} coffee houston&key=${GOOGLE_PLACES_API_KEY}`;
```

#### Get Cafe Details
**Location:** Lines 107-125 in `getCafeDetails()`
**Current:** Returns mock data by ID
**Update:** Replace with Google Places Details API call
```typescript
// TODO: Replace with real API call
const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${cafeId}&key=${GOOGLE_PLACES_API_KEY}`;
```

#### Sync Cafes (Background)
**Location:** Lines 200-250 in `syncCafesFromGooglePlaces()`
**Current:** Console logs only
**Update:** Implement full Google Places integration with database storage

### 2. Post Service (`src/services/postService.ts`)

#### Fetch Posts
**Location:** Lines 15-35 in `fetchPosts()`  
**Current:** Returns mock data
**Update:** Replace with your backend API call
```typescript
// TODO: Replace with real API endpoint
const response = await fetch(`${API_BASE_URL}/api/posts`);
```

#### Create Post
**Location:** Lines 57-75 in `createPost()`
**Current:** Simulates creation with mock data
**Update:** Replace with POST request to your backend
```typescript
// TODO: Replace with real API endpoint
const response = await fetch(`${API_BASE_URL}/api/posts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(postData)
});
```

#### Filter by Tag
**Location:** Lines 97-110 in `filterFeedByTag()`
**Current:** Filters mock data
**Update:** Replace with backend query
```typescript
// TODO: Replace with real API endpoint
const response = await fetch(`${API_BASE_URL}/api/posts?tag=${tag}`);
```

### 3. Cloudinary Service (`src/services/cloudinaryService.ts`)

#### Upload Image
**Location:** Lines 26-87 in `uploadImage()`
**Current:** Fully implemented for Cloudinary
**Update:** Add your Cloudinary credentials
```typescript
// TODO: Replace with your Cloudinary cloud name
const CLOUDINARY_CLOUD_NAME = 'your-cloud-name';
const CLOUDINARY_UPLOAD_PRESET = 'your-upload-preset';
```

#### Delete Image
**Location:** Lines 151-176 in `deleteImage()`
**Current:** Placeholder implementation
**Update:** Implement server-side deletion
```typescript
// TODO: Implement server-side image deletion
// This requires your backend API with Cloudinary admin credentials
```

### 4. Scheduled Service (`src/services/scheduledService.ts`)

#### All Functions
**Location:** All functions in the file
**Current:** Console logs and mock implementations
**Update:** Replace with real background job implementations

## Required Environment Variables

Create these environment variables in your deployment environment:

```bash
# Google Places API
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Cloudinary (already configured)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Your Backend API
VITE_API_BASE_URL=https://your-backend-api.com

# Optional: Analytics
VITE_ANALYTICS_ID=your_analytics_id
```

## API Response Format

All services follow a consistent response format defined in `src/services/types.ts`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}
```

Your backend APIs should return responses in this format for consistency.

## Error Handling

All services use the `handleApiError()` utility function from `src/services/utils.ts`. This provides:
- Consistent error logging
- User-friendly error messages
- Proper error response formatting

## Testing Your Integration

1. **Check Browser Console:** All API calls are logged for debugging
2. **Mock Data:** Services gracefully fall back to mock data on API errors
3. **Error Toasts:** Failed API calls show user-friendly error messages
4. **Loading States:** All services include loading state management

## Next Steps

1. Set up your backend API or choose a Backend-as-a-Service (BaaS)
2. Configure Google Places API credentials
3. Replace mock implementations with real API calls
4. Test each service individually
5. Update error messages and loading states as needed

## Common Integration Patterns

### Supabase Integration
If using Supabase, replace API calls with Supabase client calls:
```typescript
import { supabase } from '@/lib/supabase';

// Example: Fetch posts
const { data, error } = await supabase
  .from('posts')
  .select('*, cafe(*)')
  .order('created_at', { ascending: false });
```

### Firebase Integration  
If using Firebase, replace with Firestore calls:
```typescript
import { collection, getDocs } from 'firebase/firestore';

// Example: Fetch posts
const querySnapshot = await getDocs(collection(db, 'posts'));
```

### Custom REST API
If using your own REST API, ensure CORS is configured and endpoints match the expected data structure.