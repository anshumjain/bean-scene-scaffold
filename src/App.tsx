import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Onboarding from "@/components/Onboarding";
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
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import CafeRequests from "./pages/admin/CafeRequests";

const queryClient = new QueryClient();

const App = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

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
            <Route path="/" element={<Search />} />
            <Route path="/explore" element={<Search />} />
            <Route path="/home" element={<Home />} />
            <Route path="/moments" element={<Moments />} />
            <Route path="/share" element={<Share />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/post" element={<CreatePost />} />
            <Route path="/edit-post" element={<EditPost />} />
            <Route path="/post-view" element={<PostView />} />
            <Route path="/recent" element={<RecentlyViewed />} />
            <Route path="/profile" element={<Profile />} />
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