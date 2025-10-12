import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleAnalytics } from '@/hooks/use-google-analytics';
import { LogOut, Database, TrendingUp, MapPin, AlertCircle, Users, Activity, BarChart3, MessageSquare, Mail, Calendar, Filter } from 'lucide-react';
import { getEngagementMetrics, getDailyActiveUsers, getMonthlyActiveUsers, getUserGrowth, EngagementMetrics, DailyActiveUsers, UserGrowth } from '@/services/analyticsService';
import { fetchCafes } from '@/services/cafeService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OperationResult {
  success: boolean;
  message: string;
  stats?: {
    processed: number;
    succeeded: number;
    failed: number;
    reviewsAdded?: number;
    apiCalls: number;
    estimatedCost: number;
  };
  errors?: Array<{ cafe: string; error: string }>;
}

interface FeedbackStats {
  total: number;
  by_type: {
    bug: number;
    feature: number;
    general: number;
    support: number;
  };
  with_followup: number;
  recent_count: number;
}

interface AdminFeedback {
  id: string;
  feedback_type: 'bug' | 'feature' | 'general' | 'support';
  subject: string;
  details: string;
  allow_followup: boolean;
  contact_email?: string;
  user_id?: string;
  device_id?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackAdminAction } = useGoogleAnalytics();
  const [stats, setStats] = useState({
    totalCafes: 0,
    cafesWithHours: 0,
    cafesWithParking: 0,
    cafesWithPhone: 0,
    cafesWithWebsite: 0,
    totalReviews: 0,
    cafesNeedingEnrichment: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics | null>(null);
  const [dailyActiveUsers, setDailyActiveUsers] = useState<DailyActiveUsers[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserGrowth[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [operations, setOperations] = useState({
    addReviews: false,
    refreshAmenities: false,
    enrichCafes: false,
    fullEnrichment: false,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    operation: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    operation: '',
    message: '',
    onConfirm: () => {},
  });
  const [lastResult, setLastResult] = useState<OperationResult | null>(null);
  
  // Feedback state
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
  const [feedbackFilter, setFeedbackFilter] = useState<string>('all');

  useEffect(() => {
    // Check authentication
    if (sessionStorage.getItem('admin_authenticated') !== 'true') {
      navigate('/admin/login');
      return;
    }

    fetchStats();
    fetchAnalytics();
    fetchFeedback();
  }, [navigate, feedbackFilter]);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const [cafesResult, reviewsResult] = await Promise.all([
        fetchCafes(), // Use fetchCafes to get all cafes
        supabase.from('cafe_reviews').select('id', { count: 'exact' }),
      ]);

      if (cafesResult.success && cafesResult.data) {
        console.log(`Admin Dashboard: Fetched ${cafesResult.data.length} cafes`);
        const cafesNeedingEnrichment = cafesResult.data.filter(
          c => !c.openingHours || !c.openingHours.length
        ).length;

        setStats({
          totalCafes: cafesResult.data.length,
          cafesWithHours: cafesResult.data.filter(c => c.openingHours?.length).length,
          cafesWithParking: cafesResult.data.filter(c => c.parkingInfo).length,
          cafesWithPhone: cafesResult.data.filter(c => c.phoneNumber).length,
          cafesWithWebsite: cafesResult.data.filter(c => c.website).length,
          totalReviews: reviewsResult.count || 0,
          cafesNeedingEnrichment,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setIsLoadingStats(false);
  };

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const [engagementResult, dauResult, growthResult] = await Promise.all([
        getEngagementMetrics(),
        getDailyActiveUsers(30),
        getUserGrowth(30)
      ]);

      if (engagementResult.success) {
        setEngagementMetrics(engagementResult.data);
      }

      if (dauResult.success) {
        setDailyActiveUsers(dauResult.data);
      }

      if (growthResult.success) {
        setUserGrowth(growthResult.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
    setIsLoadingAnalytics(false);
  };

  const fetchFeedback = async () => {
    setIsLoadingFeedback(true);
    try {
      // Fetch feedback stats using direct table access
      try {
        // Fallback: try direct table access with any type
        const { count: totalCount } = await (supabase as any)
          .from('feedback')
          .select('*', { count: 'exact', head: true });

        const { count: followupCount } = await (supabase as any)
          .from('feedback')
          .select('*', { count: 'exact', head: true })
          .eq('allow_followup', true);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: recentCount } = await (supabase as any)
          .from('feedback')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString());

        const { data: typeData } = await (supabase as any)
          .from('feedback')
          .select('feedback_type');

        const stats: FeedbackStats = {
          total: totalCount || 0,
          by_type: {
            bug: typeData?.filter((t: any) => t.feedback_type === 'bug').length || 0,
            feature: typeData?.filter((t: any) => t.feedback_type === 'feature').length || 0,
            general: typeData?.filter((t: any) => t.feedback_type === 'general').length || 0,
            support: typeData?.filter((t: any) => t.feedback_type === 'support').length || 0
          },
          with_followup: followupCount || 0,
          recent_count: recentCount || 0
        };

        setFeedbackStats(stats);
      } catch (statsError) {
        // If feedback table doesn't exist yet, set empty stats
        setFeedbackStats({
          total: 0,
          by_type: { bug: 0, feature: 0, general: 0, support: 0 },
          with_followup: 0,
          recent_count: 0
        });
      }

      // Fetch feedback list
      let query = (supabase as any)
        .from('feedback')
        .select(`
          *,
          users!feedback_user_id_fkey (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (feedbackFilter !== 'all') {
        query = query.eq('feedback_type', feedbackFilter);
      }

      const { data: feedbackData, error } = await query;

      if (error) throw new Error(error.message);

      const transformedData = feedbackData?.map((item: any) => ({
        ...item,
        user_name: item.users?.name || 'Anonymous',
        user_email: item.users?.email || null
      })) || [];

      setFeedback(transformedData);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      // Set empty stats on error
      setFeedbackStats({
        total: 0,
        by_type: { bug: 0, feature: 0, general: 0, support: 0 },
        with_followup: 0,
        recent_count: 0
      });
      setFeedback([]);
    }
    setIsLoadingFeedback(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    navigate('/admin/login');
  };

  const showConfirmation = (operation: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      open: true,
      operation,
      message,
      onConfirm,
    });
  };

  const runOperation = async (operation: 'add-reviews' | 'refresh-amenities' | 'enrich-cafes') => {
    const opKey = operation === 'add-reviews' ? 'addReviews' : 
                   operation === 'refresh-amenities' ? 'refreshAmenities' : 'enrichCafes';
    
    // Track admin action
    trackAdminAction(operation, { 
      total_cafes: stats.totalCafes,
      estimated_cost: (stats.totalCafes * 0.017).toFixed(2)
    });
    
    setOperations(prev => ({ ...prev, [opKey]: true }));
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(operation, {
        body: { action: 'start' }
      });

      if (error) throw error;

      setLastResult(data as OperationResult);

      if (data.success) {
        const stats = data.stats;
        const details = stats 
          ? `Processed: ${stats.processed} | Success: ${stats.succeeded} | Failed: ${stats.failed}${stats.reviewsAdded ? ` | Reviews: ${stats.reviewsAdded}` : ''} | API Calls: ${stats.apiCalls} | Cost: $${stats.estimatedCost.toFixed(2)}`
          : data.message;

        toast({
          title: 'Operation completed',
          description: details,
        });
      } else {
        toast({
          title: 'Operation failed',
          description: data.message || data.error || 'An error occurred',
          variant: 'destructive',
        });
      }

      await fetchStats();
    } catch (error: any) {
      console.error('Operation error:', error);
      toast({
        title: 'Operation failed',
        description: error.message || error.error || 'Edge Function not found. Please create the required Edge Functions.',
        variant: 'destructive',
      });
    } finally {
      setOperations(prev => ({ ...prev, [opKey]: false }));
    }
  };

  const runFullEnrichment = async () => {
    setOperations(prev => ({ ...prev, fullEnrichment: true }));
    setLastResult(null);
    
    try {
      toast({ title: 'Starting reviews...', description: 'Fetching reviews from Google Places' });
      const reviewsResult = await supabase.functions.invoke('add-reviews', {
        body: { action: 'start' }
      });
      
      if (reviewsResult.error) throw new Error('Reviews failed: ' + reviewsResult.error.message);
      
      toast({ title: 'Starting amenities...', description: 'Refreshing amenities data' });
      const amenitiesResult = await supabase.functions.invoke('refresh-amenities', {
        body: { action: 'start' }
      });
      
      if (amenitiesResult.error) throw new Error('Amenities failed: ' + amenitiesResult.error.message);
      
      const reviewStats = reviewsResult.data?.stats;
      const amenitiesStats = amenitiesResult.data?.stats;
      
      toast({
        title: 'Full enrichment completed',
        description: `Reviews: ${reviewStats?.processed || 0} cafés | Amenities: ${amenitiesStats?.processed || 0} cafés`,
      });
      
      await fetchStats();
    } catch (error: any) {
      toast({
        title: 'Full enrichment failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setOperations(prev => ({ ...prev, fullEnrichment: false }));
    }
  };

  const runFullSeeding = async () => {
    setOperations(prev => ({ ...prev, fullEnrichment: true }));
    setLastResult(null);
    
    try {
      toast({ title: 'Starting full seeding...', description: 'This will seed all cafe data from Google Places' });
      
      // Call the seeding function via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('seed-cafes', {
        body: { action: 'seed-all' }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: 'Full seeding completed',
          description: `Added ${data.stats.cafes_added} cafes`,
        });
        
        setLastResult(data);
      } else {
        throw new Error(data.message || 'Seeding failed');
      }
      
      await fetchStats();
    } catch (error: any) {
      toast({
        title: 'Full seeding failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setOperations(prev => ({ ...prev, fullEnrichment: false }));
    }
  };

  const estimatedCost = (stats.totalCafes * 0.017).toFixed(2);
  const apiKeyConfigured = true; // Simplified - assuming configured

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">BeanScene Admin Dashboard</h1>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Analytics Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics Dashboard
            </CardTitle>
            <CardDescription>
              User engagement and activity metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAnalytics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                    <div className="h-8 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : engagementMetrics ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{engagementMetrics.totalUsers}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Daily Active</p>
                    <p className="text-2xl font-bold">{engagementMetrics.dau}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Monthly Active</p>
                    <p className="text-2xl font-bold">{engagementMetrics.mau}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Database className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                    <p className="text-2xl font-bold">{engagementMetrics.totalPosts}</p>
                  </div>
                </div>

                {/* Engagement Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Check-ins</p>
                    <p className="text-2xl font-bold">{engagementMetrics.totalCheckins}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Reviews</p>
                    <p className="text-2xl font-bold">{engagementMetrics.totalReviews}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">{engagementMetrics.averageRating}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                    <p className="text-2xl font-bold">
                      {engagementMetrics.totalUsers > 0 
                        ? Math.round((engagementMetrics.mau / engagementMetrics.totalUsers) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* Daily Active Users Chart */}
                {dailyActiveUsers.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Daily Active Users (Last 30 Days)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyActiveUsers}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            formatter={(value) => [value, 'Active Users']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#8B5CF6" 
                            strokeWidth={2}
                            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* User Growth Chart */}
                {userGrowth.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">User Growth (Last 30 Days)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            formatter={(value, name) => [
                              value, 
                              name === 'totalUsers' ? 'Total Users' : 'New Users'
                            ]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="totalUsers" 
                            stroke="#8B5CF6" 
                            strokeWidth={2}
                            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="newUsers" 
                            stroke="#10B981" 
                            strokeWidth={2}
                            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No analytics data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Seeding & Data Management
            </CardTitle>
            <CardDescription>
              Seed all cafe data from Google Places API and manage existing data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">
                {stats.totalCafes === 0 
                  ? 'No cafes found - run full seeding to populate database' 
                  : `Current: ${stats.totalCafes} cafes | Est. cost: ~$${estimatedCost} for enrichment`}
              </span>
            </div>

            <div className="grid gap-3">
              <Button
                onClick={() => showConfirmation(
                  'Full Database Seeding',
                  `This will seed the entire database with cafe data from Google Places API. This is a comprehensive operation that will fetch cafes from all Houston areas. Continue?`,
                  runFullSeeding
                )}
                disabled={operations.fullEnrichment}
                className="w-full justify-start coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth"
              >
                {operations.fullEnrichment ? 'Seeding Database...' : '🌱 Seed All Cafe Data'}
              </Button>

              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground mb-3">Existing Data Enrichment:</p>
                
                <Button
                  onClick={() => showConfirmation(
                    'Add Reviews',
                    `This will fetch reviews from Google Places for ${stats.totalCafes} cafés. Estimated cost: $${estimatedCost}. Continue?`,
                    () => runOperation('add-reviews')
                  )}
                  disabled={operations.addReviews || stats.totalCafes === 0}
                  className="w-full justify-start"
                >
                  {operations.addReviews ? 'Adding Reviews...' : 'Add Reviews from Google Places'}
                </Button>

                <Button
                  onClick={() => showConfirmation(
                    'Refresh Amenities',
                    `This will refresh amenities for ${stats.totalCafes} cafés. Estimated cost: $${estimatedCost}. Continue?`,
                    () => runOperation('refresh-amenities')
                  )}
                  disabled={operations.refreshAmenities || stats.totalCafes === 0}
                  className="w-full justify-start"
                >
                  {operations.refreshAmenities ? 'Refreshing Amenities...' : 'Refresh Amenities & Hours'}
                </Button>

                <Button
                  onClick={() => showConfirmation(
                    'Full Enrichment',
                    `This will run both reviews and amenities operations. Estimated cost: $${(parseFloat(estimatedCost) * 2).toFixed(2)}. Continue?`,
                    runFullEnrichment
                  )}
                  disabled={operations.fullEnrichment || stats.totalCafes === 0}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  {operations.fullEnrichment ? 'Running Full Enrichment...' : 'Full Enrichment (Reviews + Amenities)'}
                </Button>
              </div>
            </div>

            {lastResult && lastResult.errors && lastResult.errors.length > 0 && (
              <div className="mt-4 p-4 border border-destructive/50 rounded-lg bg-destructive/10">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Failed Cafés ({lastResult.errors.length})</p>
                    <div className="mt-2 space-y-1 text-sm">
                      {lastResult.errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-muted-foreground">
                          • {err.cafe}: {err.error}
                        </p>
                      ))}
                      {lastResult.errors.length > 5 && (
                        <p className="text-muted-foreground">...and {lastResult.errors.length - 5} more</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Enrich Missing Café Data
            </CardTitle>
            <CardDescription>
              Update cafés missing opening hours, phone numbers, and other details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {stats.cafesNeedingEnrichment} cafés need enrichment
            </p>
            <Button
              onClick={() => showConfirmation(
                'Enrich Missing Data',
                `This will enrich ${stats.cafesNeedingEnrichment} cafés missing data. Estimated cost: $${(stats.cafesNeedingEnrichment * 0.017).toFixed(2)}. Continue?`,
                () => runOperation('enrich-cafes')
              )}
              disabled={operations.enrichCafes || stats.cafesNeedingEnrichment === 0}
              className="w-full"
            >
              {operations.enrichCafes ? 'Enriching Cafés...' : 'Run Enrichment Script'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Statistics
            </CardTitle>
            <CardDescription>Current state of café data</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                    <div className="h-8 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cafés</p>
                  <p className="text-2xl font-bold">{stats.totalCafes}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">With Opening Hours</p>
                  <p className="text-2xl font-bold">{stats.cafesWithHours} / {stats.totalCafes}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">With Parking Info</p>
                  <p className="text-2xl font-bold">{stats.cafesWithParking} / {stats.totalCafes}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">With Phone Numbers</p>
                  <p className="text-2xl font-bold">{stats.cafesWithPhone} / {stats.totalCafes}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">With Websites</p>
                  <p className="text-2xl font-bold">{stats.cafesWithWebsite} / {stats.totalCafes}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold">{stats.totalReviews}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Feedback Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              User Feedback
            </CardTitle>
            <CardDescription>
              Manage user feedback and support requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingFeedback ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-20 mb-2"></div>
                      <div className="h-8 bg-muted rounded w-12"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : feedbackStats ? (
              <div className="space-y-6">
                {/* Feedback Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <MessageSquare className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Total Feedback</p>
                    <p className="text-2xl font-bold">{feedbackStats.total}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Mail className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Follow-up Requests</p>
                    <p className="text-2xl font-bold">{feedbackStats.with_followup}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold">{feedbackStats.recent_count}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Bug Reports</p>
                    <p className="text-2xl font-bold">{feedbackStats.by_type.bug}</p>
                  </div>
                </div>

                {/* Feedback Type Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Bug Reports</p>
                    <p className="text-lg font-bold text-red-700">{feedbackStats.by_type.bug}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Feature Requests</p>
                    <p className="text-lg font-bold text-blue-700">{feedbackStats.by_type.feature}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">General</p>
                    <p className="text-lg font-bold text-green-700">{feedbackStats.by_type.general}</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Support</p>
                    <p className="text-lg font-bold text-purple-700">{feedbackStats.by_type.support}</p>
                  </div>
                </div>

                {/* Feedback Filter and List */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Select value={feedbackFilter} onValueChange={setFeedbackFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="bug">Bug Reports</SelectItem>
                        <SelectItem value="feature">Feature Requests</SelectItem>
                        <SelectItem value="general">General Feedback</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={fetchFeedback} variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {/* Feedback List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {feedback.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No feedback found</p>
                    ) : (
                      feedback.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={
                                  item.feedback_type === 'bug' ? 'destructive' :
                                  item.feedback_type === 'feature' ? 'default' :
                                  item.feedback_type === 'support' ? 'secondary' : 'outline'
                                }>
                                  {item.feedback_type}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <h4 className="font-medium">{item.subject}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.details}
                              </p>
                            </div>
                            {item.allow_followup && item.contact_email && (
                              <div className="text-right">
                                <Badge variant="outline" className="text-xs">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Follow-up
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.contact_email}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>From: {item.user_name || 'Anonymous'}</span>
                            <span>ID: {item.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Failed to load feedback</p>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {confirmDialog.operation}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              confirmDialog.onConfirm();
              setConfirmDialog(prev => ({ ...prev, open: false }));
            }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
