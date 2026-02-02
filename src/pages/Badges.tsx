import { useState, useEffect } from "react";
import { Award, Trophy, Star, Camera, MapPin, PenTool, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/Layout/AppLayout";
import { getUserStats, getUserBadges, BADGE_DEFINITIONS } from "@/services/gamificationService";
import { getUsername, getDeviceId } from "@/services/userService";
import { useSEO } from "@/hooks/useSEO";

interface BadgeWithStatus {
  type: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  earned: boolean;
  earnedAt?: string;
  progress?: {
    current: number;
    target: number;
    description: string;
  };
}

const badgeIcons: Record<string, string> = {
  first_sip: "☕",
  first_post: "📝",
  early_adopter: "🌟",
  social_sharer: "📱",
  coffee_explorer: "🗺️", 
  cafe_expert: "🏆",
  photographer: "📸",
  reviewer: "✍️",
  detailed_reviewer: "✍️",
  content_creator: "🎨",
  pioneer: "🚀",
};

const badgeColors: Record<string, string> = {
  first_sip: "from-yellow-400 to-yellow-600",
  first_post: "from-blue-400 to-blue-600",
  early_adopter: "from-purple-400 to-purple-600",
  social_sharer: "from-green-400 to-green-600",
  coffee_explorer: "from-indigo-400 to-indigo-600",
  cafe_expert: "from-amber-400 to-amber-600",
  photographer: "from-pink-400 to-pink-600", 
  reviewer: "from-emerald-400 to-emerald-600",
  detailed_reviewer: "from-teal-400 to-teal-600",
  content_creator: "from-violet-400 to-violet-600",
  pioneer: "from-red-400 to-red-600",
};

export default function Badges() {
  useSEO('badges');
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [badgesWithStatus, setBadgesWithStatus] = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBadgeData = async () => {
      try {
        const username = getUsername();
        const deviceId = getDeviceId();
        
        const [badgesResult, statsResult] = await Promise.all([
          getUserBadges(undefined, deviceId, username),
          getUserStats(undefined, deviceId, username)
        ]);

        setUserBadges(badgesResult || []);
        setUserStats(statsResult);

        // Create badges with status information
        const badgesWithStatusData = Object.entries(BADGE_DEFINITIONS).map(([key, badge]) => {
          const earnedBadge = badgesResult?.find(b => b.badge_type === badge.type);
          const earned = !!earnedBadge;
          
          // Calculate progress for each badge dynamically
          let progress = undefined;
          if (!earned && statsResult) {
            // Extract target number from condition or description
            let target = 1;
            let current = 0;
            
            // Determine current value and target based on badge type
            if (badge.type === 'first_sip') {
              current = statsResult.total_checkins || 0;
              target = 1;
            } else if (badge.type === 'first_post') {
              current = statsResult.total_posts || 0;
              target = 1;
            } else if (badge.type === 'early_adopter') {
              current = statsResult.total_posts || 0;
              target = 3;
            } else if (badge.type === 'social_sharer') {
              current = statsResult.total_posts || 0;
              target = 10;
            } else if (badge.type === 'coffee_explorer') {
              current = statsResult.total_cafes_visited || 0;
              target = 5;
            } else if (badge.type === 'cafe_expert') {
              current = statsResult.total_cafes_visited || 0;
              target = 15;
            } else if (badge.type === 'photographer') {
              current = statsResult.total_photos || 0;
              target = 10;
            } else if (badge.type === 'reviewer') {
              current = statsResult.total_reviews || 0;
              target = 5;
            } else if (badge.type === 'detailed_reviewer') {
              current = statsResult.total_reviews || 0;
              target = 10;
            } else if (badge.type === 'content_creator') {
              current = statsResult.posts_with_photos || 0;
              target = 25;
            } else if (badge.type === 'pioneer') {
              current = statsResult.pioneer_count || 0;
              target = 1;
            }
            
            if (current < target) {
              progress = {
                current: Math.min(current, target),
                target: target,
                description: badge.description
              };
            }
          }

          return {
            type: badge.type,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            xp: badge.xp,
            earned,
            earnedAt: earnedBadge?.earned_at,
            progress
          };
        });

        setBadgesWithStatus(badgesWithStatusData);
      } catch (error) {
        console.error('Error loading badge data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBadgeData();
  }, []);

  const earnedCount = badgesWithStatus.filter(b => b.earned).length;
  const totalCount = badgesWithStatus.length;

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading badges...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Badges</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {earnedCount} of {totalCount} badges earned
          </p>
        </div>

        <div className="p-4 space-y-6">
          {/* Progress Overview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Badge Progress</span>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {earnedCount}/{totalCount}
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(earnedCount / totalCount) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {totalCount - earnedCount} badges remaining
              </p>
            </CardContent>
          </Card>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 gap-4">
            {badgesWithStatus.map((badge) => (
              <Card 
                key={badge.type} 
                className={`transition-all duration-200 ${
                  badge.earned 
                    ? 'border-primary/20 bg-primary/5 shadow-md' 
                    : 'border-border/50 bg-muted/30'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Badge Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      badge.earned 
                        ? `bg-gradient-to-r ${badgeColors[badge.type] || 'from-gray-400 to-gray-600'} text-white shadow-lg` 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {badge.icon || badgeIcons[badge.type] || '🏆'}
                    </div>

                    {/* Badge Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${
                          badge.earned ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {badge.name}
                        </h3>
                        {badge.earned && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      
                      <p className={`text-sm mb-2 ${
                        badge.earned ? 'text-foreground/80' : 'text-muted-foreground'
                      }`}>
                        {badge.description}
                      </p>

                      {/* Progress or Earned Date */}
                      {badge.earned ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                            <Zap className="w-3 h-3 mr-1" />
                            Earned
                          </Badge>
                          {badge.earnedAt && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(badge.earnedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : badge.progress ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {badge.progress.current}/{badge.progress.target}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className="bg-gradient-to-r from-primary/50 to-primary/30 h-1.5 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min((badge.progress.current / badge.progress.target) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {badge.progress.description}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Achievement Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                How to Earn Badges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Explore New Cafés</p>
                  <p className="text-xs text-muted-foreground">Visit different coffee shops to earn the Coffee Explorer badge</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Camera className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Share Photos</p>
                  <p className="text-xs text-muted-foreground">Upload photos with your check-ins to earn the Photographer badge</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <PenTool className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Write Reviews</p>
                  <p className="text-xs text-muted-foreground">Share your thoughts to help others and earn the Reviewer badge</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
