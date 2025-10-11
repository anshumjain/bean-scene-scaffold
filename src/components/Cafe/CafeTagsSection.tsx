import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Plus, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCafeTopTags } from "@/services/tagService";
import { reportIncorrectTag, hasUserReportedTag } from "@/services/tagReportingService";
import { toast } from "@/hooks/use-toast";

interface CafeTagsSectionProps {
  cafeId: string;
  cafeName: string;
  refreshTrigger?: number; // Increment this to refresh tags
}

export function CafeTagsSection({ cafeId, cafeName, refreshTrigger = 0 }: CafeTagsSectionProps) {
  const navigate = useNavigate();
  const [topTags, setTopTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportedTags, setReportedTags] = useState<Set<string>>(new Set());

  const loadTopTags = async () => {
    try {
      setLoading(true);
      const tags = await getCafeTopTags(cafeId);
      setTopTags(tags);
      
      // Check which tags user has already reported
      const reportedSet = new Set<string>();
      for (const tag of tags) {
        const hasReported = await hasUserReportedTag(cafeId, tag);
        if (hasReported) {
          reportedSet.add(tag);
        }
      }
      setReportedTags(reportedSet);
    } catch (error) {
      console.error("Failed to load top tags:", error);
      setTopTags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopTags();
  }, [cafeId, refreshTrigger]);

  const handleAddTag = () => {
    navigate('/checkin', { state: { cafeId, cafeName } });
  };

  const handleReportTag = async (tag: string) => {
    try {
      const result = await reportIncorrectTag(cafeId, tag, 'User reported as incorrect');
      if (result.success) {
        setReportedTags(prev => new Set([...prev, tag]));
        toast({
          title: "Tag reported",
          description: `"${tag}" has been reported as incorrect. Thank you for your feedback!`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to report tag",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error reporting tag:', error);
      toast({
        title: "Error",
        description: "Failed to report tag",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="px-6 pb-4">
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-primary">What's the vibe?</h3>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddTag}
            className="text-xs h-7 px-3 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Tag
          </Button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="ml-2 text-xs text-muted-foreground">Loading tags...</span>
          </div>
        ) : topTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topTags.map((tag, index) => (
              <div key={tag} className="relative group">
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-2 py-1 border-0 transition-colors ${
                    reportedTags.has(tag) 
                      ? "bg-gray-100 text-gray-400" 
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  #{tag}
                </Badge>
                {!reportedTags.has(tag) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReportTag(tag)}
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700"
                    title={`Report "${tag}" as incorrect`}
                  >
                    <Flag className="h-2 w-2" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No tags yet! Be the first to describe the vibe.
            </p>
            <Button 
              size="sm"
              onClick={handleAddTag}
              className="coffee-gradient text-white text-xs h-8 px-4"
            >
              <Tag className="w-3 h-3 mr-1" />
              Add First Tag
            </Button>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-3">
          Based on the last 30 days of check-ins
        </p>
      </div>
    </div>
  );
}
