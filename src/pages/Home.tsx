import { Coffee, MapPin, Camera, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/Layout/AppLayout";
import heroImage from "@/assets/hero-coffee.jpg";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: MapPin,
    title: "Discover Cafes",
    description: "Find the best coffee spots in Houston"
  },
  {
    icon: Camera,
    title: "Share Moments",
    description: "Check in and share your coffee experiences"
  },
  {
    icon: Users,
    title: "Join Community",
    description: "Connect with fellow coffee enthusiasts"
  }
];

const trendingTags = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave", 
  "cold-brew", "pastries", "rooftop", "instagram-worthy"
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroImage})` }}
          >
            <div className="absolute inset-0 coffee-gradient opacity-80" />
          </div>
          
          <div className="relative z-10 text-center text-white px-6 max-w-lg">
            <div className="mb-6">
              <Coffee className="w-16 h-16 mx-auto mb-4 text-yellow-200" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Bean Scene
            </h1>
            <p className="text-xl mb-8 text-cream-200 leading-relaxed">
              Discover Houston's best coffee spots and share your cafe experiences
            </p>
            <div className="space-y-4">
              <Button 
                size="lg"
                onClick={() => navigate('/explore')}
                className="w-full bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-md shadow-glow transition-smooth"
              >
                Start Exploring
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => navigate('/checkin')}
                className="w-full glass-effect text-white border-white/30 hover:bg-white/10"
              >
                Check In Now
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-6 cream-gradient">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Your Coffee Community
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="text-center shadow-coffee border-0">
                  <CardContent className="p-8">
                    <Icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-3">{title}</h3>
                    <p className="text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Trending Tags */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Trending in Houston</h2>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {trendingTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="px-4 py-2 text-sm bg-accent/30 text-accent-foreground border-0 cursor-pointer hover:bg-accent/50 transition-smooth"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
            <Button 
              onClick={() => navigate('/explore')}
              className="coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth"
            >
              Explore All Tags
            </Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}