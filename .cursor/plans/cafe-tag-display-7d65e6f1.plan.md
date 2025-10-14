<!-- 7d65e6f1-6d1f-4730-8b8b-3aa5af6629d3 56f270fe-29c4-4768-bd9c-580037c6f8ce -->
# Add Tag Display with Counts to Cafe Cards in Explore

## Overview

Display top 3 most popular tags with usage counts under each cafe name in the Explore page. When a tag filter is active, prioritize showing that tag first and sort cafes by that tag's popularity.

## Implementation Steps

### 1. Extend Cafe Type with Tag Counts

**File**: `src/services/types.ts`

- Add `tagCounts?: Record<string, number>` to the `Cafe` interface
- This will store the count of how many times each tag has been used for a cafe

### 2. Create Tag Counting Service Function

**File**: `src/services/tagService.ts`

- Create new function `getCafeTagsWithCounts(cafeId: string, placeId: string): Promise<Record<string, number>>`
- Count tags from:
  - Posts table: `SELECT tags FROM posts WHERE place_id = ?`
  - Cafe table: `SELECT tags FROM cafes WHERE id = ?`
- Aggregate counts for each unique tag
- Return object mapping tag names to their counts

### 3. Create Formatted Count Display Helper

**File**: `src/services/tagService.ts`

- Add function `formatTagCount(count: number): string`
- Logic:
  - 1-99: Show exact number (e.g., "5")
  - 100-999: Show exact number (e.g., "234")
  - 1000+: Show "1k+" format (e.g., "1k+", "2k+")

### 4. Update Cafe Fetching to Include Tag Counts

**File**: `src/hooks/useOptimizedCafes.ts` or `src/hooks/useInfiniteCafes.ts`

- After fetching cafes, enrich each cafe with tag counts
- Call `getCafeTagsWithCounts()` for each cafe
- Attach `tagCounts` to cafe object

### 5. Add Tag Sorting Logic

**File**: `src/hooks/useOptimizedCafes.ts` or relevant hook

- When `activeTagFilter` exists:
  - Sort cafes by the count of that specific tag (descending)
  - Cafes without the tag go to the end
- When no tag filter: Use existing sort (distance/rating)

### 6. Update InfiniteCafeList Component

**File**: `src/components/InfiniteCafeList.tsx` (lines 130-146)

**Current code** (lines 130-146):

```tsx
{/* Tags */}
{cafe.tags && cafe.tags.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-2">
    {cafe.tags.slice(0, 3).map((tag) => (
      <span 
        key={tag}
        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
      >
        #{tag}
      </span>
    ))}
    {cafe.tags.length > 3 && (
      <span className="text-xs text-gray-500">
        +{cafe.tags.length - 3} more
      </span>
    )}
  </div>
)}
```

**Changes needed**:

- Replace simple tag display with tag + count display
- Implement tag selection logic:
  - If `activeTagFilter` prop exists and tag exists in cafe: Show filtered tag first
  - Fill remaining 2 slots with most popular tags (by count)
  - If no tags exist: Don't show tag section
- Display format: `#tag-name (count)` or `#tag-name count×`
- Use `formatTagCount()` for count display

### 7. Add Active Tag Filter Prop

**File**: `src/components/InfiniteCafeList.tsx`

- Add `activeTagFilter?: string` to `InfiniteCafeListProps` interface
- Pass this prop from parent (Search.tsx or wherever cafes are displayed)

### 8. Update Parent Component (Explore/Search)

**File**: `src/pages/Search.tsx` or relevant page

- Pass current tag filter to `InfiniteCafeList`
- Ensure tag filter state is accessible

### 9. Add Empty State for Filtered Tags

**File**: `src/components/InfiniteCafeList.tsx` (around line 81-90)

- When `activeTagFilter` exists but no cafes match:
- Show message: "No user has tagged a cafe with this vibe; be first to help others find the right cafe by tagging the next cafe you visit"
- Include button to clear filter

### 10. Styling and Polish

- Ensure tag badges are visually distinct
- Highlight filtered tag differently (e.g., darker background or border)
- Ensure counts are readable but not overwhelming
- Test responsive layout with various tag lengths

## Key Files to Modify

1. `src/services/types.ts` - Add tagCounts to Cafe interface
2. `src/services/tagService.ts` - Add counting and formatting functions
3. `src/hooks/useOptimizedCafes.ts` or `useInfiniteCafes.ts` - Enrich cafes with counts, add sorting
4. `src/components/InfiniteCafeList.tsx` - Update tag display UI
5. `src/pages/Search.tsx` - Pass tag filter prop

## Technical Considerations

- **Performance**: Tag counting queries should be efficient; consider caching
- **Data freshness**: Tag counts update when new posts/tags are added
- **Edge cases**: Handle cafes with 0 tags, tags with 0 counts, very long tag names
- **Existing function**: Leverage `getCafeTopTags()` in tagService.ts as foundation

### To-dos

- [ ] Add tagCounts field to Cafe interface in types.ts
- [ ] Create getCafeTagsWithCounts() function in tagService.ts to aggregate tag counts from posts and cafe tables
- [ ] Add formatTagCount() helper function for smart count display (1-999 exact, 1000+ as '1k+')
- [ ] Update cafe fetching hooks to call getCafeTagsWithCounts() and attach tagCounts to each cafe
- [ ] Add sorting logic to sort cafes by specific tag count when tag filter is active
- [ ] Modify InfiniteCafeList to show top 3 tags with counts, prioritizing filtered tag when active
- [ ] Add activeTagFilter prop to InfiniteCafeList component interface
- [ ] Update parent components to pass activeTagFilter to InfiniteCafeList
- [ ] Add empty state message when tag filter has no matching cafes
- [ ] Style tag badges, highlight filtered tags, ensure responsive layout