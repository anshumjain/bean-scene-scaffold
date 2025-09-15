import { useState } from "react";
import { Camera, MapPin, Star, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";

const predefinedTags = [
  "latte-art", "cozy-vibes", "laptop-friendly", "third-wave", "cold-brew",
  "pastries", "rooftop", "instagram-worthy", "busy", "quiet", "date-spot",
  "pet-friendly", "outdoor-seating", "wifi", "study-spot"
];

const nearbyCafes = [
  { id: "1", name: "Blacksmith Coffee", neighborhood: "Montrose", distance: "0.2 mi" },
  { id: "2", name: "Greenway Coffee", neighborhood: "Heights", distance: "0.5 mi" },
  { id: "3", name: "Hugo's Coffee", neighborhood: "Downtown", distance: "0.8 mi" }
];

export default function CheckIn() {
  const navigate = useNavigate();
  const [selectedCafe, setSelectedCafe] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [review, setReview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags(prev => [...prev, customTag]);
      setCustomTag("");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleSubmit = () => {
    // Here you would normally upload to Cloudinary and save to Supabase
    console.log({
      selectedCafe,
      rating,
      selectedTags,
      review,
      imageFile
    });
    
    // Show success and navigate back
    navigate('/explore');
  };

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border p-4">
          <h1 className="text-2xl font-bold">Check In</h1>
          <p className="text-sm text-muted-foreground">Share your cafe experience</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Select Cafe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Select Cafe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {nearbyCafes.map((cafe) => (
                <div
                  key={cafe.id}
                  onClick={() => setSelectedCafe(cafe.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-smooth ${
                    selectedCafe === cafe.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{cafe.name}</h3>
                      <p className="text-sm text-muted-foreground">{cafe.neighborhood}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{cafe.distance}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Add Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                {imageFile ? (
                  <div className="space-y-2">
                    <p className="text-sm text-foreground">{imageFile.name}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setImageFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Tap to add photo</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rating */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Your Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-smooth hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Add Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-primary/20 text-primary border-0 cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      #{tag}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Predefined Tags */}
              <div className="flex flex-wrap gap-2">
                {predefinedTags.filter(tag => !selectedTags.includes(tag)).slice(0, 10).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-smooth"
                    onClick={() => handleTagToggle(tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>

              {/* Custom Tag Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Create custom tag..."
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomTag()}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={handleCustomTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Review */}
          <Card>
            <CardHeader>
              <CardTitle>Write a Review</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Share your thoughts about this cafe..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedCafe || !rating}
            className="w-full coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth"
            size="lg"
          >
            Share Check-In
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}