import { useState } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { fetchCafes } from "@/services/cafeService";
import { submitCheckin } from "@/services/postService";
import { getCurrentLocation } from "@/services/utils";
import { useToast } from "@/hooks/use-toast";

function getAnonId() {
  let id = localStorage.getItem("anonId");
  if (!id) {
    id = Math.random().toString(36).slice(2);
    localStorage.setItem("anonId", id);
  }
  return id;
}

export default function CreatePost() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [cafeQuery, setCafeQuery] = useState("");
  const [cafeResults, setCafeResults] = useState<any[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCafeSearch() {
    setLoading(true);
    const result = await fetchCafes({ query: cafeQuery });
    setCafeResults(result.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!imageFile) {
      setError("Image is required");
      return;
    }
    
    if (!selectedCafe) {
      setError("Please select a cafe");
      return;
    }
    
    setLoading(true);
    
    try {
      // Get location
      const position = await getCurrentLocation();
      
      // Submit the check-in
      const result = await submitCheckin({
        cafeId: selectedCafe.id,
        placeId: selectedCafe.placeId,
        rating: 5, // Default rating for posts
        tags: [],
        review: caption,
        imageFile,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      });
      
      if (result.success) {
        toast({
          title: "Photo shared!",
          description: "Your photo has been posted successfully"
        });
        navigate("/feed");
      } else {
        setError(result.error || "Failed to share photo");
        toast({
          title: "Error",
          description: result.error || "Failed to share photo",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error sharing photo:", error);
      setError("Failed to share photo. Please try again.");
      toast({
        title: "Error",
        description: "Failed to share photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background pb-20 p-4">
        <h1 className="text-2xl font-bold mb-4">Share a Photo</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Image <span className="text-destructive">*</span></label>
            <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} required />
            {imageFile && <div className="mt-2 text-xs text-muted-foreground">{imageFile.name}</div>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Caption</label>
            <Textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} placeholder="Say something about this photo..." />
          </div>
          <div>
            <label className="block mb-1 font-medium">Tag a Cafe</label>
            <div className="flex gap-2">
              <Input value={cafeQuery} onChange={e => setCafeQuery(e.target.value)} placeholder="Search cafes..." />
              <Button type="button" onClick={handleCafeSearch} disabled={loading}>Search</Button>
            </div>
            {cafeResults.length > 0 && (
              <div className="border rounded mt-2 bg-muted divide-y">
                {cafeResults.map(cafe => (
                  <div key={cafe.id} className={`p-2 cursor-pointer ${selectedCafe?.id === cafe.id ? 'bg-primary/10' : ''}`} onClick={() => setSelectedCafe(cafe)}>
                    <div className="font-medium">{cafe.name}</div>
                    <div className="text-xs text-muted-foreground">{cafe.neighborhood}</div>
                  </div>
                ))}
              </div>
            )}
            {selectedCafe && (
              <div className="mt-2 p-2 bg-primary/10 rounded text-sm">
                <div className="font-medium text-primary">Selected: {selectedCafe.name}</div>
                <div className="text-xs text-muted-foreground">{selectedCafe.neighborhood}</div>
              </div>
            )}
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sharing..." : "Share Photo"}</Button>
        </form>
      </div>
    </AppLayout>
  );
}

