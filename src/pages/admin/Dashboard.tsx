import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Database, TrendingUp, MapPin, AlertCircle } from 'lucide-react';
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
    cafesNeedingEnrichment: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
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
        const cafesNeedingEnrichment = cafesResult.data.filter(
          c => !c.opening_hours || !c.opening_hours.length
        ).length;

        setStats({
          totalCafes: cafesResult.data.length,
          cafesWithHours: cafesResult.data.filter(c => c.opening_hours?.length).length,
          cafesWithParking: cafesResult.data.filter(c => c.parking_info).length,
          cafesWithPhone: cafesResult.data.filter(c => c.phone_number).length,
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
          description: data.message || 'An error occurred',
          variant: 'destructive',
        });
      }

      await fetchStats();
    } catch (error: any) {
      toast({
        title: 'Operation failed',
        description: error.message || 'Edge Function not found. Please create the required Edge Functions.',
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
              <span className="text-sm text-muted-foreground">Est. cost: ~${estimatedCost} for all cafés</span>
            </div>

            <div className="grid gap-3">
              <Button
                onClick={() => showConfirmation(
                  'Add Reviews',
                  `This will fetch reviews from Google Places for ${stats.totalCafes} cafés. Estimated cost: $${estimatedCost}. Continue?`,
                  () => runOperation('add-reviews')
                )}
                disabled={operations.addReviews}
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
                disabled={operations.refreshAmenities}
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
                disabled={operations.fullEnrichment}
                variant="secondary"
                className="w-full justify-start"
              >
                {operations.fullEnrichment ? 'Running Full Enrichment...' : 'Full Enrichment (Reviews + Amenities)'}
              </Button>
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
