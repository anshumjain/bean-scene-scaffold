import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Database, TrendingUp, MapPin } from 'lucide-react';

interface EnrichmentProgress {
  current: number;
  total: number;
  cafeName: string;
  status: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalCafes: 0,
    cafesWithHours: 0,
    cafesWithParking: 0,
    cafesWithPhone: 0,
    cafesWithWebsite: 0,
    totalReviews: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [operations, setOperations] = useState({
    addReviews: false,
    refreshAmenities: false,
    enrichCafes: false,
    fullEnrichment: false,
  });
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null);

  useEffect(() => {
    // Check authentication
    if (sessionStorage.getItem('admin_authenticated') !== 'true') {
      navigate('/admin/login');
      return;
    }

    fetchStats();
  }, [navigate]);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const [cafesResult, reviewsResult] = await Promise.all([
        supabase.from('cafes').select('opening_hours, parking_info, phone_number, website'),
        supabase.from('cafe_reviews').select('id', { count: 'exact' }),
      ]);

      if (cafesResult.data) {
        setStats({
          totalCafes: cafesResult.data.length,
          cafesWithHours: cafesResult.data.filter(c => c.opening_hours?.length).length,
          cafesWithParking: cafesResult.data.filter(c => c.parking_info).length,
          cafesWithPhone: cafesResult.data.filter(c => c.phone_number).length,
          cafesWithWebsite: cafesResult.data.filter(c => c.website).length,
          totalReviews: reviewsResult.count || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setIsLoadingStats(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    navigate('/admin/login');
  };

  const runOperation = async (operation: 'add-reviews' | 'refresh-amenities' | 'enrich-cafes') => {
    const opKey = operation === 'add-reviews' ? 'addReviews' : 
                   operation === 'refresh-amenities' ? 'refreshAmenities' : 'enrichCafes';
    
    setOperations(prev => ({ ...prev, [opKey]: true }));
    setProgress(null);

    try {
      const { data, error } = await supabase.functions.invoke(operation, {
        body: { action: 'start' }
      });

      if (error) throw error;

      toast({
        title: 'Operation completed',
        description: data.message || 'Operation finished successfully',
      });

      // Refresh stats after operation
      await fetchStats();
    } catch (error: any) {
      toast({
        title: 'Operation failed',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setOperations(prev => ({ ...prev, [opKey]: false }));
      setProgress(null);
    }
  };

  const runFullEnrichment = async () => {
    setOperations(prev => ({ ...prev, fullEnrichment: true }));
    
    try {
      await runOperation('add-reviews');
      await runOperation('refresh-amenities');
      
      toast({
        title: 'Full enrichment completed',
        description: 'Both reviews and amenities have been updated',
      });
    } catch (error) {
      console.error('Full enrichment error:', error);
    } finally {
      setOperations(prev => ({ ...prev, fullEnrichment: false }));
    }
  };

  const apiKeyConfigured = import.meta.env.VITE_GOOGLE_PLACES_API_KEY ? true : false;

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
        {/* Google Places Data Enrichment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Google Places Data Enrichment
            </CardTitle>
            <CardDescription>
              Fetch and update café data from Google Places API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              {apiKeyConfigured ? (
                <span className="text-sm text-green-600">✅ API Key: Configured</span>
              ) : (
                <span className="text-sm text-destructive">❌ API Key: Missing (add VITE_GOOGLE_PLACES_API_KEY)</span>
              )}
              <span className="text-sm text-muted-foreground">| Estimated cost: ~$0.017 per café</span>
            </div>

            <div className="grid gap-3">
              <Button
                onClick={() => runOperation('add-reviews')}
                disabled={operations.addReviews || !apiKeyConfigured}
                className="w-full justify-start"
              >
                {operations.addReviews ? 'Adding Reviews...' : 'Add Reviews from Google Places'}
              </Button>

              <Button
                onClick={() => runOperation('refresh-amenities')}
                disabled={operations.refreshAmenities || !apiKeyConfigured}
                className="w-full justify-start"
              >
                {operations.refreshAmenities ? 'Refreshing Amenities...' : 'Refresh Amenities & Hours'}
              </Button>

              <Button
                onClick={runFullEnrichment}
                disabled={operations.fullEnrichment || !apiKeyConfigured}
                variant="secondary"
                className="w-full justify-start"
              >
                {operations.fullEnrichment ? 'Running Full Enrichment...' : 'Full Enrichment (Reviews + Amenities)'}
              </Button>
            </div>

            {progress && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">{progress.status}</p>
                <p className="text-sm text-muted-foreground">
                  Processing: {progress.cafeName} ({progress.current}/{progress.total})
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enrich Existing Cafés Script */}
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
            <Button
              onClick={() => runOperation('enrich-cafes')}
              disabled={operations.enrichCafes || !apiKeyConfigured}
              className="w-full"
            >
              {operations.enrichCafes ? 'Enriching Cafés...' : 'Run Enrichment Script'}
            </Button>
          </CardContent>
        </Card>

        {/* Data Overview */}
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
              <p className="text-sm text-muted-foreground">Loading statistics...</p>
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
      </main>
    </div>
  );
}
