import { useState, useEffect, useRef } from "react";
import { X, Tag, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addTagsToCafe, getTagSuggestions, validateTag, normalizeTag } from "@/services/tagService";
import { toast } from "@/hooks/use-toast";

interface AddTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafeId: string;
  cafeName: string;
  onTagsAdded: () => void; // Callback to refresh tags
}

export function AddTagsModal({ isOpen, onClose, cafeId, cafeName, onTagsAdded }: AddTagsModalProps) {
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Popular tag suggestions
  const popularTags = [
    "wifi", "study-spot", "quiet", "busy", "date-spot", 
    "pet-friendly", "outdoor-seating", "great-coffee", 
    "latte-art", "bakery", "vegan", "student-friendly",
    "wfh-friendly", "always-space", "cozy", "modern"
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTagInput("");
      setSelectedTags([]);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [isOpen]);

  const handleInputChange = async (value: string) => {
    setTagInput(value);
    
    if (value.trim()) {
      setShowSuggestions(true);
      const newSuggestions = await getTagSuggestions(value);
      setSuggestions(newSuggestions);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const addTag = (tag: string) => {
    const normalizedTag = normalizeTag(tag);
    const validation = validateTag(normalizedTag);
    
    if (!validation.valid) {
      toast({
        title: "Invalid tag",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    if (!selectedTags.includes(normalizedTag)) {
      setSelectedTags(prev => [...prev, normalizedTag]);
      setTagInput("");
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim());
    }
  };

  const handleSubmit = async () => {
    if (selectedTags.length === 0) {
      toast({
        title: "No tags selected",
        description: "Please add at least one tag before submitting",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await addTagsToCafe(cafeId, selectedTags);
      
      if (result.success) {
        toast({
          title: "Tags added!",
          description: `Successfully added ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} to ${cafeName}`,
        });
        onTagsAdded();
        onClose();
      } else {
        toast({
          title: "Error adding tags",
          description: result.error || "Failed to add tags",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding tags:', error);
      toast({
        title: "Error adding tags",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSuggestions = suggestions.filter(suggestion => 
    !selectedTags.includes(suggestion)
  );

  const filteredPopularTags = popularTags.filter(tag => 
    !selectedTags.includes(tag) && 
    tag.toLowerCase().includes(tagInput.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Add Tags to {cafeName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Selected tags:</p>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    #{tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTag(tag)}
                      className="h-4 w-4 p-0 ml-1 hover:bg-primary/20"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tag Input */}
          <div className="relative">
            <Input
              ref={inputRef}
              placeholder="Type a tag..."
              value={tagInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(true)}
              className="pr-10"
            />
            {tagInput.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addTag(tagInput.trim())}
                className="absolute right-1 top-1 h-6 w-6 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Suggestions and Popular Tags */}
          {showSuggestions && (filteredSuggestions.length > 0 || filteredPopularTags.length > 0) && (
            <div className="border rounded-lg p-3 max-h-32 overflow-y-auto">
              {filteredSuggestions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions:</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {filteredSuggestions.slice(0, 5).map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="ghost"
                        size="sm"
                        onClick={() => addTag(suggestion)}
                        className="h-6 text-xs px-2 bg-muted hover:bg-primary/10"
                      >
                        #{suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {filteredPopularTags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Popular:</p>
                  <div className="flex flex-wrap gap-1">
                    {filteredPopularTags.slice(0, 8).map((tag) => (
                      <Button
                        key={tag}
                        variant="ghost"
                        size="sm"
                        onClick={() => addTag(tag)}
                        className="h-6 text-xs px-2 bg-muted hover:bg-primary/10"
                      >
                        #{tag}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Popular Tags (when no input and no suggestions) */}
          {!tagInput.trim() && selectedTags.length === 0 && !showSuggestions && (
            <div>
              <p className="text-sm font-medium mb-2">Popular tags:</p>
              <div className="flex flex-wrap gap-1">
                {popularTags.slice(0, 12).map((tag) => (
                  <Button
                    key={tag}
                    variant="ghost"
                    size="sm"
                    onClick={() => addTag(tag)}
                    className="h-7 text-xs px-3 bg-muted hover:bg-primary/10"
                  >
                    #{tag}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={selectedTags.length === 0 || submitting}
              className="coffee-gradient text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                `Add ${selectedTags.length} Tag${selectedTags.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
