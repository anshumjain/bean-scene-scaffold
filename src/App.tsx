import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Search from "./pages/Search";
import CheckIn from "./pages/CheckIn";
import RecentlyViewed from "./pages/RecentlyViewed";
import Profile from "./pages/Profile";
import CafeDetail from "./pages/CafeDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Feed />} />
          <Route path="/search" element={<Search />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/recent" element={<RecentlyViewed />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/cafe/:id" element={<CafeDetail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
