import { useState } from "react";
import { Filter, X, DollarSign, Star, Clock, MapPin, Navigation, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HOUSTON_NEIGHBORHOODS } from "@/services/types";

export interface FilterState {
  priceLevel: number[];
  rating: number;
  distance: number;
  openNow: boolean;
  neighborhoods: string[];
  selectedTags: string[];
}

interface ExploreFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  onRequestLocation?: () => void;
  isRequestingLocation?: boolean;
  popularTags?: string[];
}

export function ExploreFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
  userLocation,
  onRequestLocation,
  isRequestingLocation = false,
  popularTags = []
}: ExploreFiltersProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;

  const hasActiveFilters = 
    filters.priceLevel.length > 0 ||
    filters.rating > 0 ||
    filters.distance < 25 ||
    filters.openNow ||
    filters.neighborhoods.length > 0 ||
    filters.selectedTags.length > 0;

  const activeFilterCount = 
    (filters.priceLevel.length > 0 ? 1 : 0) +
    (filters.rating > 0 ? 1 : 0) +
    (filters.distance < 25 ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (filters.neighborhoods.length > 0 ? 1 : 0) +
    (filters.selectedTags.length > 0 ? 1 : 0);

  const renderPriceLevel = (level: number, isSelected: boolean) => {
    return Array.from({ length: 4 }, (_, i) => (
      <DollarSign
        key={i}
        className={`w-3 h-3 ${
          i < level
            ? isSelected 
              ? "text-primary fill-primary" 
              : "text-foreground fill-foreground"
            : "text-muted-foreground"
        }`}
      />
    ));
  };

  const togglePriceLevel = (level: number) => {
    const newPriceLevels = filters.priceLevel.includes(level)
      ? filters.priceLevel.filter(p => p !== level)
      : [...filters.priceLevel, level];
    onFiltersChange({ ...filters, priceLevel: newPriceLevels });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.selectedTags.includes(tag)
      ? filters.selectedTags.filter(t => t !== tag)
      : [...filters.selectedTags, tag];
    onFiltersChange({ ...filters, selectedTags: newTags });
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-gradient-to-b from-[#faf8f5] to-[#f5efe8] flex flex-col h-full">
        <SheetHeader className="pb-4 border-b border-[#d9cdb8] flex-shrink-0">
          <SheetTitle className="flex items-center justify-between text-[#4a3728] text-lg">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#8b5a3c]" />
              <span>Filter & Sort</span>
            </div>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearFilters}
                className="text-[#8b5a3c] hover:bg-[#d9cdb8]/50 text-sm"
              >
                Clear All
              </Button>
            )}
          </SheetTitle>
          <SheetDescription className="text-[#8b5a3c] text-sm">
            Filter cafes by distance, price, rating, and more.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 pt-3 overflow-y-auto">
          <div className="space-y-4 pb-4">

            {/* Distance Filter */}
            <div className="bg-white/60 rounded-lg p-3 border border-[#d9cdb8]/50">
              <Label className="text-sm font-semibold mb-2 block text-[#4a3728] flex items-center gap-2">
                <MapPin className="w-3 h-3 text-[#8b5a3c]" />
                Distance: {filters.distance < 25 ? `${filters.distance} mi` : "All"}
              </Label>
              
              {!userLocation ? (
                <div className="text-center py-2">
                  <Button
                    onClick={onRequestLocation}
                    disabled={isRequestingLocation}
                    className="bg-[#8b5a3c] hover:bg-[#6b4423] text-white text-xs px-3 py-1.5 h-auto"
                  >
                    {isRequestingLocation ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3 mr-1" />
                        Enable Location
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="px-2">
                    <Slider
                      value={[filters.distance]}
                      onValueChange={([value]) => onFiltersChange({ ...filters, distance: value })}
                      max={25}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#8b5a3c] mt-1 font-medium">
                    <span>1 mi</span>
                    <span>All</span>
                  </div>
                </>
              )}
            </div>

            {/* Price Level */}
            <div className="bg-white/60 rounded-lg p-3 border border-[#d9cdb8]/50">
              <Label className="text-sm font-semibold mb-2 block text-[#4a3728] flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-[#8b5a3c]" />
                Price Level
              </Label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((level) => (
                  <Button
                    key={level}
                    variant={filters.priceLevel.includes(level) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePriceLevel(level)}
                    className={`flex items-center gap-1 h-8 text-xs ${
                      filters.priceLevel.includes(level) 
                        ? "bg-[#8b5a3c] hover:bg-[#6b4423] text-white" 
                        : "bg-white border-[#d9cdb8] hover:bg-[#f5efe8] hover:border-[#8b5a3c] text-[#4a3728]"
                    }`}
                  >
                    {renderPriceLevel(level, filters.priceLevel.includes(level))}
                  </Button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="bg-white/60 rounded-lg p-3 border border-[#d9cdb8]/50">
              <Label className="text-sm font-semibold mb-2 block text-[#4a3728] flex items-center gap-2">
                <Star className="w-3 h-3 text-[#8b5a3c]" />
                Rating: {filters.rating > 0 ? filters.rating.toFixed(1) : "Any"}
              </Label>
              <div className="px-2">
                <Slider
                  value={[filters.rating]}
                  onValueChange={([value]) => onFiltersChange({ ...filters, rating: value })}
                  max={5}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-[#8b5a3c] mt-1 font-medium">
                <span>Any</span>
                <span>5.0 ⭐</span>
              </div>
            </div>

            {/* Open Now */}
            <div className="bg-white/60 rounded-lg p-3 border border-[#d9cdb8]/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-[#8b5a3c]" />
                  <Label htmlFor="open-now" className="text-sm font-semibold text-[#4a3728]">Open Now</Label>
                </div>
                <Switch
                  id="open-now"
                  checked={filters.openNow}
                  onCheckedChange={(checked) => onFiltersChange({ ...filters, openNow: checked })}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white/60 rounded-lg p-3 border border-[#d9cdb8]/50">
              <Label className="text-sm font-semibold mb-3 block text-[#4a3728] flex items-center gap-2">
                <Tag className="w-3 h-3 text-[#8b5a3c]" />
                Popular Tags
              </Label>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={filters.selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs h-7 px-2 ${
                      filters.selectedTags.includes(tag) 
                        ? "bg-[#8b5a3c] hover:bg-[#6b4423] text-white" 
                        : "bg-white border-[#d9cdb8] hover:bg-[#f5efe8] hover:border-[#8b5a3c] text-[#4a3728]"
                    }`}
                  >
                    #{tag}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Apply Filters Button - Fixed at bottom */}
        <div className="mt-4 pt-3 border-t border-[#d9cdb8] flex-shrink-0">
          <Button
            onClick={() => setIsOpen(false)}
            className="w-full bg-gradient-to-r from-[#8b5a3c] to-[#6b4423] hover:from-[#6b4423] hover:to-[#4a3728] text-white font-semibold py-2 rounded-lg shadow-lg text-sm"
          >
            ✨ Apply Filters
          </Button>
        </div>
        </SheetContent>
      </Sheet>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3">
          {filters.priceLevel.map((level) => (
            <Badge
              key={`price-${level}`}
              className="flex items-center gap-1 text-xs bg-[#8b5a3c] text-white hover:bg-[#6b4423]"
            >
              {renderPriceLevel(level, true)}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => togglePriceLevel(level)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          
          {filters.rating > 0 && (
            <Badge className="flex items-center gap-1 text-xs bg-[#8b5a3c] text-white hover:bg-[#6b4423]">
              <Star className="w-3 h-3" />
              {filters.rating.toFixed(1)}+
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, rating: 0 })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.distance < 25 && (
            <Badge className="flex items-center gap-1 text-xs bg-[#8b5a3c] text-white hover:bg-[#6b4423]">
              <MapPin className="w-3 h-3" />
              {filters.distance} mi
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, distance: 25 })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}


          
          {filters.openNow && (
            <Badge className="flex items-center gap-1 text-xs bg-[#8b5a3c] text-white hover:bg-[#6b4423]">
              <Clock className="w-3 h-3" />
              Open Now
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, openNow: false })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </>
  );
}
