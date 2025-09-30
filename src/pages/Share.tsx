import { Camera, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";

export default function Share() {
  const navigate = useNavigate();

  return (
    <AppLayout showBottomNav={false}>
      <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Share Your Coffee Moment</h1>
          <p className="text-muted-foreground">How would you like to share?</p>
        </div>

        <div className="w-full space-y-4 max-w-sm">
          {/* Check In Option */}
          <Card 
            className="cursor-pointer hover:shadow-warm transition-smooth border-2 hover:border-primary"
            onClick={() => navigate('/checkin')}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Check In</h2>
              <p className="text-sm text-muted-foreground">
                Rate a cafe, add photos, and share your full experience
              </p>
            </CardContent>
          </Card>

          {/* Quick Post Option */}
          <Card 
            className="cursor-pointer hover:shadow-warm transition-smooth border-2 hover:border-primary"
            onClick={() => navigate('/post')}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Quick Post</h2>
              <p className="text-sm text-muted-foreground">
                Snap and share a quick photo from any cafe
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
