import { Camera, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { useGoogleAnalytics } from "@/hooks/use-google-analytics";

export default function Share() {
  const navigate = useNavigate();
  const { trackEngagement } = useGoogleAnalytics();

  const handleCheckInClick = () => {
    trackEngagement('share_option_selected', { option: 'check_in' });
    navigate('/checkin');
  };

  const handleQuickPostClick = () => {
    trackEngagement('share_option_selected', { option: 'quick_post' });
    navigate('/post');
  };

  return (
    <AppLayout showBottomNav={false}>
      <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Share Your Coffee Moment</h1>
          <p className="text-muted-foreground">Choose how you'd like to share your experience</p>
        </div>

        <div className="w-full space-y-4 max-w-sm">
          {/* Check In Option */}
          <Card 
            className="cursor-pointer hover:shadow-warm transition-smooth border-2 hover:border-primary"
            onClick={handleCheckInClick}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Check In</h2>
              <p className="text-sm text-muted-foreground">
                Rate a cafe, add photos, tags, and share your complete experience
              </p>
            </CardContent>
          </Card>

          {/* Quick Post Option */}
          <Card 
            className="cursor-pointer hover:shadow-warm transition-smooth border-2 hover:border-primary"
            onClick={handleQuickPostClick}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Quick Post</h2>
              <p className="text-sm text-muted-foreground">
                Share a photo with a caption - no rating or detailed review needed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
