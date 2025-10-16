import React from "react";
import { Camera, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useGoogleAnalytics } from "@/hooks/use-google-analytics";

export default function Share() {
  const navigate = useNavigate();
  const { trackEngagement } = useGoogleAnalytics();

  // Redirect directly to unified share form
  React.useEffect(() => {
    trackEngagement('share_page_accessed', { option: 'direct_unified' });
    navigate('/share/unified');
  }, [navigate, trackEngagement]);

  return (
    <AppLayout showBottomNav={false}>
      <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Share Form...</h1>
          <p className="text-muted-foreground">Taking you to the share form</p>
        </div>
      </div>
    </AppLayout>
  );
}
