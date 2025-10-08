# Bean Scene Database Schema

## Overview
Bean Scene uses Supabase PostgreSQL for data storage with the following core tables and relationships.

## Tables

### cafes
Stores cafe information fetched from Google Places API

```sql
CREATE TABLE cafes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  place_id VARCHAR(255) UNIQUE NOT NULL, -- Google Places ID
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  neighborhood VARCHAR(100),
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  google_rating DECIMAL(2, 1),
  hours TEXT, -- JSON string of operating hours
  phone VARCHAR(20),
  price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cafes_place_id ON cafes(place_id);
CREATE INDEX idx_cafes_neighborhood ON cafes(neighborhood);
CREATE INDEX idx_cafes_location ON cafes(lat, lng);
```

### posts
User check-ins with photos and reviews

```sql
CREATE TABLE posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id VARCHAR(255) REFERENCES cafes(place_id) ON DELETE CASCADE,
  image_url TEXT NOT NULL, -- Cloudinary URL
  tags TEXT[] DEFAULT '{}', -- Array of tag strings
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  text_review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_place_id ON posts(place_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
```

### post_likes
Track user likes on posts

```sql
CREATE TABLE post_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Indexes
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
```

### post_comments
Comments on posts

```sql
CREATE TABLE post_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_post_comments_created_at ON post_comments(created_at);
```

### favorite_cafes
User's favorite cafes

```sql
CREATE TABLE favorite_cafes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id VARCHAR(255) REFERENCES cafes(place_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

-- Indexes
CREATE INDEX idx_favorite_cafes_user_id ON favorite_cafes(user_id);
```

### user_profiles
Extended user information

```sql
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  full_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS) Policies

### cafes
- Public read access
- Admin write access only

### posts
- Public read access
- Users can create/update/delete their own posts

### post_likes
- Public read access for counts
- Users can like/unlike posts

### post_comments
- Public read access
- Users can create/update/delete their own comments

### favorite_cafes
- Users can only see/modify their own favorites

### user_profiles
- Public read access for basic info
- Users can update their own profile

## Environment Variables

```bash
# Google Places API (server-side only)
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Cloudinary for image storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Supabase (auto-provided by Lovable integration)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## API Endpoints (Placeholder Structure)

### Cafe Endpoints
- `GET /api/cafes/nearby?lat={lat}&lng={lng}&radius={radius}` - Get nearby cafes
- `GET /api/cafes/search?q={query}&neighborhood={neighborhood}` - Search cafes
- `GET /api/cafes/{placeId}` - Get cafe details
- `POST /api/cafes` - Add new cafe (from Google Places)

### Post Endpoints
- `GET /api/posts?cafe={placeId}&limit={limit}&offset={offset}` - Get posts
- `POST /api/posts` - Create new post
- `PUT /api/posts/{id}` - Update post
- `DELETE /api/posts/{id}` - Delete post

### User Endpoints  
- `GET /api/users/{id}/posts` - Get user's posts
- `GET /api/users/{id}/favorites` - Get user's favorite cafes
- `POST /api/users/{id}/favorites` - Add cafe to favorites
- `DELETE /api/users/{id}/favorites/{placeId}` - Remove from favorites

## Future Enhancements
- Cafe busy status tracking
- Popular times integration
- User leaderboards and badges
- Real-time notifications
- Advanced search filters
- Cafe owner verification