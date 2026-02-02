/**
 * Instagram-style Followers/Following List
 * Shows a modal with list of users following or being followed
 */

import { useState, useEffect } from 'react';
import { X, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getFollowers, getFollowing, followUser, unfollowUser, isFollowing } from '@/services/followService';
import { getUserByUsername } from '@/services/userService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { UserLevelDisplay } from '@/components/ui/level-badge';

interface UserInfo {
  id: string;
  username: string;
  userId: string;
}

interface FollowersFollowingListProps {
  userId: string;
  username: string;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'followers' | 'following';
}

export function FollowersFollowingList({ 
  userId, 
  username, 
  isOpen, 
  onClose,
  initialTab = 'followers'
}: FollowersFollowingListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const [loadingFollow, setLoadingFollow] = useState<Record<string, boolean>>({});

  // Load followers and following lists
  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadLists = async () => {
      setLoading(true);
      try {
        const { supabase: supabaseClient } = await import('@/integrations/supabase/client');
        
        // Get followers (users following this user)
        const { data: followersData, error: followersError } = await supabaseClient
          .from('user_follows')
          .select(`
            *,
            follower:users!user_follows_follower_id_fkey(id, username)
          `)
          .eq('following_id', userId);
        
        let loadedFollowers: UserInfo[] = [];
        if (!followersError && followersData) {
          loadedFollowers = followersData
            .map(f => {
              const user = (f as any).follower;
              return user ? {
                id: f.id,
                username: user.username || 'Unknown',
                userId: user.id
              } : null;
            })
            .filter(Boolean) as UserInfo[];
          setFollowers(loadedFollowers);
        }

        // Get following (users this user is following)
        const { data: followingData, error: followingError } = await supabaseClient
          .from('user_follows')
          .select(`
            *,
            following:users!user_follows_following_id_fkey(id, username)
          `)
          .eq('follower_id', userId);
        
        let loadedFollowing: UserInfo[] = [];
        if (!followingError && followingData) {
          loadedFollowing = followingData
            .map(f => {
              const user = (f as any).following;
              return user ? {
                id: f.id,
                username: user.username || 'Unknown',
                userId: user.id
              } : null;
            })
            .filter(Boolean) as UserInfo[];
          setFollowing(loadedFollowing);
        }

        // Check follow status for all users
        const allUserIds = [...loadedFollowers, ...loadedFollowing].map(u => u.userId);
        if (allUserIds.length > 0) {
          const statusMap: Record<string, boolean> = {};
          for (const uid of allUserIds) {
            const status = await isFollowing(uid);
            if (status.success) {
              statusMap[uid] = status.data;
            }
          }
          setFollowingStatus(statusMap);
        }
      } catch (error) {
        console.error('Error loading followers/following:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLists();
  }, [isOpen, userId]);

  const handleFollow = async (targetUserId: string) => {
    setLoadingFollow(prev => ({ ...prev, [targetUserId]: true }));
    try {
      const result = await followUser(targetUserId);
      if (result.success) {
        setFollowingStatus(prev => ({ ...prev, [targetUserId]: true }));
        toast({
          title: "Following",
          description: "You're now following this user",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to follow",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoadingFollow(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    setLoadingFollow(prev => ({ ...prev, [targetUserId]: true }));
    try {
      const result = await unfollowUser(targetUserId);
      if (result.success) {
        setFollowingStatus(prev => ({ ...prev, [targetUserId]: false }));
        toast({
          title: "Unfollowed",
          description: "You're no longer following this user",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to unfollow",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoadingFollow(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const renderUserList = (users: UserInfo[]) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No {activeTab === 'followers' ? 'followers' : 'following'} yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {users.map((user) => {
          const isFollowingUser = followingStatus[user.userId] || false;
          const isLoading = loadingFollow[user.userId] || false;

          return (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
              onClick={() => {
                navigate(`/profile/${user.username}`);
                onClose();
              }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <UserLevelDisplay 
                    username={user.username || 'Unknown'} 
                    level={1}
                    clickable={false}
                  />
                </div>
              </div>
              <Button
                variant={isFollowingUser ? "outline" : "default"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFollowingUser) {
                    handleUnfollow(user.userId);
                  } else {
                    handleFollow(user.userId);
                  }
                }}
                disabled={isLoading}
                className="ml-2 flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowingUser ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle className="text-center">{username}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'followers' | 'following')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
            <TabsTrigger value="followers">
              Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({following.length})
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <TabsContent value="followers" className="mt-4 mb-0">
              {renderUserList(followers)}
            </TabsContent>
            <TabsContent value="following" className="mt-4 mb-0">
              {renderUserList(following)}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
