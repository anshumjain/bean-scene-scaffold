import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Onboarding from "@/components/Onboarding";
import { migrateLocalStorageToSupabase, migrateAnonymousToAuthenticated } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Search from "./pages/Search";
import CheckIn from "./pages/CheckIn";
import RecentlyViewed from "./pages/RecentlyViewed";
import Profile from "./pages/Profile";
import CafeDetail from "./pages/CafeDetail";
import ImageUpload from "./pages/ImageUpload";
import DataValidation from "./pages/DataValidation";
import Moments from "./pages/Moments";
import Share from "./pages/Share";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";
import PostView from "./pages/PostView";
import Feedback from "./pages/Feedback";
import RequestCafe from "./pages/RequestCafe";
import Badges from "./pages/Badges";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import CafeRequests from "./pages/admin/CafeRequests";

const queryClient = new QueryClient();

const App = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    // Run client-side migration for existing users
    const runMigration = async () => {
      try {
        // First, try to migrate anonymous data to authenticated user if they're logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // User is authenticated, try to migrate anonymous data to authenticated account
          const authMigrationResult = await migrateAnonymousToAuthenticated();
          
          if (authMigrationResult.success && authMigrationResult.data?.migrated) {
            toast({
              title: "Account Migrated!",
              description: authMigrationResult.data.message,
              duration: 5000,
            });
          }
        } else {
          // User is anonymous, migrate localStorage data to database
          const migrationResult = await migrateLocalStorageToSupabase();
          
          if (migrationResult.success && migrationResult.data?.migrated) {
            // Show success message only if data was actually migrated
            toast({
              title: "Data Migrated!",
              description: migrationResult.data.message,
              duration: 5000,
            });
          } else if (migrationResult.success && migrationResult.data?.message.includes("already taken")) {
            // Show warning if username is taken
            toast({
              title: "Username Conflict",
              description: migrationResult.data.message,
              variant: "destructive",
              duration: 8000,
            });
          }
        }
      } catch (error) {
        console.error("Migration failed:", error);
        // Don't show error to user as this is background migration
      }
    };

    // Run migration after a short delay to not interfere with app loading
    const migrationTimeout = setTimeout(runMigration, 1000);
    
    return () => clearTimeout(migrationTimeout);
  }, [toast]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/explore" element={<Search />} />
            <Route path="/home" element={<Home />} />
            <Route path="/moments" element={<Moments />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/share" element={<Share />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/post" element={<CreatePost />} />
            <Route path="/edit-post" element={<EditPost />} />
            <Route path="/post-view" element={<PostView />} />
            <Route path="/recent" element={<RecentlyViewed />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/badges" element={<Badges />} />
            <Route path="/cafe/:id" element={<CafeDetail />} />
            <Route path="/cafe/:id/upload" element={<ImageUpload />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/request-cafe" element={<RequestCafe />} />
            <Route path="/admin/validation" element={<DataValidation />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/cafe-requests" element={<CafeRequests />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;