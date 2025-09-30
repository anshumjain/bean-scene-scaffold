import { Coffee, MapPin, Heart, Users } from "lucide-react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background pb-20">
        {/* Hero Section */}
        <div className="relative h-[40vh] bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center p-6">
          <div className="text-center">
            <Coffee className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold mb-3">BeanScene</h1>
            <p className="text-lg text-muted-foreground max-w-sm mx-auto">
              Houston's coffee community, where every cup tells a story
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="p-6 space-y-6">
          <Card className="shadow-coffee border-0">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  BeanScene started with a simple idea: coffee is better when shared. 
                  Whether you're hunting for the perfect latte, need a cozy spot to work, 
                  or hoping to meet someone special over espresso, we're here to help.
                </p>
                <p>
                  From Montrose's artisan roasters to Downtown's hidden gems, we've mapped 
                  Houston's coffee culture so you can discover your next favorite spot—and 
                  maybe your next favorite person.
                </p>
                <p className="font-medium text-foreground">
                  Find cafés. Share moments. Build connections.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-coffee border-0 cursor-pointer hover:shadow-warm transition-smooth" onClick={() => navigate('/explore')}>
              <CardContent className="p-6 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-1">Discover</h3>
                <p className="text-xs text-muted-foreground">Find your perfect cafe</p>
              </CardContent>
            </Card>

            <Card className="shadow-coffee border-0 cursor-pointer hover:shadow-warm transition-smooth" onClick={() => navigate('/share')}>
              <CardContent className="p-6 text-center">
                <Coffee className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-1">Share</h3>
                <p className="text-xs text-muted-foreground">Post your coffee moments</p>
              </CardContent>
            </Card>

            <Card className="shadow-coffee border-0 cursor-pointer hover:shadow-warm transition-smooth" onClick={() => navigate('/moments')}>
              <CardContent className="p-6 text-center">
                <Heart className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-1">Connect</h3>
                <p className="text-xs text-muted-foreground">See community moments</p>
              </CardContent>
            </Card>

            <Card className="shadow-coffee border-0 cursor-pointer hover:shadow-warm transition-smooth" onClick={() => navigate('/profile')}>
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-1">Profile</h3>
                <p className="text-xs text-muted-foreground">Track your journey</p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="text-center pt-4">
            <Button 
              size="lg" 
              className="coffee-gradient text-white shadow-glow"
              onClick={() => navigate('/explore')}
            >
              Start Exploring
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}