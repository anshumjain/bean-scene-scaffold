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
              Discover cafés, vibes, and connections in your city
            </p>
          </div>
        </div>

        {/* Origins / Story Section */}
        <div className="p-6 space-y-6">
          <Card className="shadow-coffee border-0">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Connected, but Lonely</h3>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We live in a world more connected than ever,yet most of us feel more isolated than ever. Algorithms keep us scrolling, but rarely help us belong in our own cities.
                </p>

                <h3 className="text-xl font-semibold mt-4">Why Coffee?</h3>
                <p>
                  Coffee is more than caffeine. It’s ritual, comfort, and the backdrop for so many parts of life, whether you’re working solo, catching up with a friend, or starting a new conversation.
                </p>

                <h3 className="text-xl font-semibold mt-4">The Idea</h3>
                <p>
                  Bean Scene helps you discover cafés that fit your vibe: laptop-friendly, cozy, social, or just a quiet corner to think. And along the way, it makes it easier to turn everyday coffee runs into real connections.
                </p>

                <h3 className="text-xl font-semibold mt-4">The Vision</h3>
                <p>
                  This is just the beginning. Our bigger goal is to help people step away from algorithms and into real life, building a culture where belonging happens naturally, one café at a time.
                </p>

                <p className="mt-4 font-medium text-foreground text-center">
                  ✨ More than coffee. More than connections.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-coffee border-0 cursor-pointer hover:shadow-warm transition-smooth" onClick={() => navigate('/explore')}>
              <CardContent className="p-6 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-1">Discover</h3>
                <p className="text-xs text-muted-foreground">Find your perfect café</p>
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
