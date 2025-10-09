# Google Content Attribution System

## Overview

This document describes the comprehensive attribution system implemented to ensure full compliance with Google Places API Terms of Service Section 3.2.3. The system clearly distinguishes Google-sourced content from user-generated content throughout the Bean Scene application.

## 🎯 Compliance Requirements

### What Must Be Attributed to Google
- **Photos**: All images sourced from Google Places API or migrated from Google
- **Reviews**: Reviews seeded from Google Places API
- **Ratings**: Google ratings displayed in the app
- **Business Information**: Hours, phone numbers, websites from Google

### What Must NOT Be Attributed to Google
- User-uploaded photos from check-ins
- User-written reviews and ratings
- User comments and tags
- User-generated content

## 🏗️ System Architecture

### Database Schema
```sql
-- cafes table
photo_source VARCHAR(20) DEFAULT NULL  -- 'google', 'user', or null

-- cafe_reviews table  
source VARCHAR(20) DEFAULT 'google'    -- 'google' or 'user'

-- posts table
source VARCHAR(20) DEFAULT 'user'      -- 'google' or 'user'
photo_source VARCHAR(20) DEFAULT 'user' -- 'google' or 'user'
```

### Source Detection Logic

#### Cafe Photos
```typescript
const photoSource = cafe.photo_source || 
  (cafe.google_photo_reference ? 'google' : 
   (cafe.hero_photo_url && cafe.hero_photo_url.includes('bean-scene/google-places') ? 'google' : 'user'));
```

#### Post Photos
```typescript
const photoSource = post.photo_source || 
  (post.image_url && post.image_url.includes('bean-scene/google-places') ? 'google' : 'user');
```

#### Reviews
```typescript
const source = review.source || 'google'; // Existing reviews default to Google
```

## 🎨 Attribution Components

### GoogleAttribution Component

**Location**: `src/components/Attribution/GoogleAttribution.tsx`

**Features**:
- Multiple size variants (sm, md, lg)
- Different types (photo, review, rating, info)
- Optional source URL linking to Google Maps
- Official Google logo integration
- Subtle, non-intrusive styling

**Usage**:
```tsx
<GoogleAttribution 
  type="photo" 
  sourceUrl="https://www.google.com/maps/search/?api=1&query_place_id=PLACE_ID"
  size="sm" 
/>
```

### Variants

#### Overlay (for photos)
```tsx
<GoogleAttributionOverlay type="photo" sourceUrl={mapsUrl} />
```

#### Inline (for ratings)
```tsx
<GoogleAttributionInline type="rating" sourceUrl={mapsUrl} />
```

## 📱 Implementation Details

### CafeHeader Component

**Location**: `src/components/Cafe/CafeHeader.tsx`

**Attributions Added**:
1. **Photo Attribution**: Overlay on hero images from Google
2. **Rating Attribution**: Inline attribution next to Google ratings

**Key Changes**:
- Added `photoSource` and `googleRating` props
- Conditional rendering of attribution overlays
- Google Maps links for source URLs

### CafeReviews Component

**Location**: `src/components/Cafe/CafeReviews.tsx`

**Attributions Added**:
1. **Review Attribution**: Below each Google review
2. **Anonymous Display**: Google reviews show "Anonymous Reviewer"
3. **Visual Differentiation**: Google reviews have muted appearance

**Key Changes**:
- Source-based rendering logic
- Profile photo hiding for Google reviews
- Attribution badges for Google content

### PostCard Component

**Location**: `src/components/Feed/PostCard.tsx`

**Attributions Added**:
1. **Photo Attribution**: Overlay on Google-sourced images
2. **Review Attribution**: Below Google-sourced review text

**Key Changes**:
- Added `source` and `photoSource` props
- Conditional attribution rendering
- Google Maps links for source URLs

## 🔧 Service Layer Updates

### cafeService.ts

**Key Updates**:
- `transformCafeData()` includes source detection logic
- Photo source determination based on Google photo references
- Cloudinary path analysis for migrated photos

### postService.ts

**Key Updates**:
- `fetchPosts()` includes source detection logic
- Photo source determination based on image URLs
- Default to 'user' for new posts

## 🎨 Visual Design

### Attribution Styling

**Colors**:
- Background: Semi-transparent with backdrop blur
- Text: Muted foreground color
- Border: Subtle border with reduced opacity

**Sizes**:
- `sm`: 10px text, 12px icon (photo overlays)
- `md`: 12px text, 14px icon (review cards)
- `lg`: 14px text, 16px icon (prominent sections)

**Google Logo**:
- Official multi-color Google "G" logo
- SVG format for scalability
- Optimized for small sizes (12-16px)

### Visual Hierarchy

1. **Google Reviews**: Muted appearance (opacity-90)
2. **User Reviews**: Normal, full opacity
3. **Attribution**: Subtle but clearly visible
4. **Links**: External link icons for source URLs

## 🚀 Deployment

### Database Migration

**File**: `supabase/migrations/20250120000000_add_google_content_attribution.sql`

**Steps**:
1. Run migration to add source tracking columns
2. Update existing data to mark Google content
3. Create performance indexes

### Migration Script

**File**: `scripts/markGoogleContent.ts`

**Usage**:
```bash
npm run mark-google-content
```

**Features**:
- Automatic source detection and marking
- Progress logging
- Error handling and rollback
- Verification of attribution

## ✅ Testing Checklist

### Manual Testing

- [ ] Cafe with Google photo shows attribution overlay
- [ ] Cafe with user photo shows no attribution
- [ ] Google review shows "Anonymous Reviewer" and attribution badge
- [ ] User review shows normal display without attribution
- [ ] Attribution links open Google Maps in new tab
- [ ] Feed shows correct attributions for mixed content

### Data Testing

- [ ] Cafes with `google_photo_reference` marked as Google photos
- [ ] Cafes with Cloudinary paths containing 'google-places' marked as Google
- [ ] Existing reviews default to Google source
- [ ] New posts default to user source
- [ ] No user content incorrectly marked as Google

### Compliance Testing

- [ ] All Google photos have visible attribution
- [ ] All Google reviews have visible attribution
- [ ] No Google reviewer names or photos displayed
- [ ] Attribution links open Google Maps correctly
- [ ] User content has NO Google attribution

## 🚨 Critical Rules

### ALWAYS Attribute to Google
- Photos from `google_photo_reference`
- Photos migrated from Google (Cloudinary path contains 'google-places')
- Reviews from Google Places API
- Google ratings (`google_rating` field)
- Business info from Google (hours, phone, website)

### NEVER Attribute to Google
- User-uploaded photos (from check-ins)
- User-written reviews
- User ratings
- User comments
- User tags

### When in Doubt
- **Over-attribute rather than under-attribute**
- **If source is unclear, add attribution**
- **Compliance > aesthetics**

## 📊 Monitoring

### Key Metrics
- Number of Google photos with attribution
- Number of Google reviews with attribution
- Number of user posts without Google attribution
- Attribution link click-through rates

### Alerts
- Missing attribution on Google content
- Incorrect attribution on user content
- Broken Google Maps links

## 🔄 Maintenance

### Regular Tasks
- Monitor new content for proper attribution
- Update attribution logic as content sources change
- Verify Google Maps links remain functional
- Review compliance with updated Google ToS

### Future Enhancements
- Automated attribution detection
- Real-time compliance monitoring
- Enhanced attribution analytics
- Multi-language attribution support

## 📞 Support

For questions about the Google Content Attribution System:

1. **Technical Issues**: Check component implementation in `src/components/Attribution/`
2. **Data Issues**: Verify source detection logic in service files
3. **Compliance Issues**: Review this documentation and Google ToS Section 3.2.3
4. **Design Issues**: Check attribution styling and placement

---

**Priority**: This is a compliance requirement. Google can revoke API access for ToS violations. Attribution must be implemented correctly before launch.
