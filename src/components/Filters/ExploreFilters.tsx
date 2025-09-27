import { useState } from "react";
import { Filter, X, DollarSign, Star, Clock, MapPin, Navigation, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  sortBy: 'distance' | 'rating' | 'price' | 'name' | 'newest';
  sortOrder: 'asc' | 'desc';
}

interface ExploreFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export function ExploreFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters
}: ExploreFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = 
    filters.priceLevel.length > 0 ||
    filters.rating > 0 ||
    filters.distance < 25 ||
    filters.openNow ||
    filters.neighborhoods.length > 0 ||
    filters.sortBy !== 'newest';

  const activeFilterCount = 
    (filters.priceLevel.length > 0 ? 1 : 0) +
    (filters.rating > 0 ? 1 : 0) +
    (filters.distance < 25 ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (filters.neighborhoods.length > 0 ? 1 : 0) +
    (filters.sortBy !== 'newest' ? 1 : 0);

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

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex-shrink-0 relative"
          >
            <Filter className="w-4 h-4" />
            {hasActiveFilters && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                {activeFilterCount}
              </div>
            )}
          </Button>
        </SheetTrigger>
        
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="pb-6">
            <SheetTitle className="flex items-center justify-between">
              Filter Cafes
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearFilters}
                  className="text-muted-foreground"
                >
                  Clear All
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            {/* Sort By */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Sort By</Label>
              <div className="flex gap-2">
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: any) => onFiltersChange({ ...filters, sortBy: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onFiltersChange({ 
                    ...filters, 
                    sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                  })}
                >
                  {filters.sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Distance Filter */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Distance: {filters.distance < 25 ? `${filters.distance} miles` : "Show All"}
              </Label>
              <div className="px-3">
                <Slider
                  value={[filters.distance]}
                  onValueChange={([value]) => onFiltersChange({ ...filters, distance: value })}
                  max={25}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1 mi</span>
                <span>Show All</span>
              </div>
            </div>

            {/* Neighborhoods */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Neighborhoods</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {HOUSTON_NEIGHBORHOODS.map((neighborhood) => (
                  <Button
                    key={neighborhood}
                    variant={filters.neighborhoods.includes(neighborhood) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newNeighborhoods = filters.neighborhoods.includes(neighborhood)
                        ? filters.neighborhoods.filter(n => n !== neighborhood)
                        : [...filters.neighborhoods, neighborhood];
                      onFiltersChange({ ...filters, neighborhoods: newNeighborhoods });
                    }}
                    className="text-xs justify-start"
                  >
                    {neighborhood}
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Level */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Price Level</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((level) => (
                  <Button
                    key={level}
                    variant={filters.priceLevel.includes(level) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePriceLevel(level)}
                    className="flex items-center gap-1 h-10"
                  >
                    {renderPriceLevel(level, filters.priceLevel.includes(level))}
                  </Button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Minimum Rating: {filters.rating > 0 ? filters.rating.toFixed(1) : "Any"}
              </Label>
              <div className="px-3">
                <Slider
                  value={[filters.rating]}
                  onValueChange={([value]) => onFiltersChange({ ...filters, rating: value })}
                  max={5}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Any</span>
                <span>5.0</span>
              </div>
            </div>

            {/* Open Now */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="open-now" className="text-sm font-medium">Open Now</Label>
              </div>
              <Switch
                id="open-now"
                checked={filters.openNow}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, openNow: checked })}
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t">
            <Button
              onClick={() => setIsOpen(false)}
              className="w-full coffee-gradient text-white"
            >
              Apply Filters
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
              variant="secondary"
              className="flex items-center gap-1 text-xs"
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
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
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
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
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

          {filters.neighborhoods.map((neighborhood) => (
            <Badge
              key={`neighborhood-${neighborhood}`}
              variant="secondary"
              className="flex items-center gap-1 text-xs"
            >
              {neighborhood}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => {
                  const newNeighborhoods = filters.neighborhoods.filter(n => n !== neighborhood);
                  onFiltersChange({ ...filters, neighborhoods: newNeighborhoods });
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}

          {filters.sortBy !== 'newest' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <ArrowUpDown className="w-3 h-3" />
              {filters.sortBy}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, sortBy: 'newest' })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.openNow && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
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
