import { useState } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { fetchCafes } from "@/services/cafeService";
import { getCurrentLocation } from "@/services/utils";

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [cafeQuery, setCafeQuery] = useState("");
  const [cafeResults, setCafeResults] = useState<any[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<any | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCafeModal, setShowCafeModal] = useState(false);

  // Throttle: 1 post per 2 min per anonId
  function isThrottled() {
    const anonId = getAnonId();
    const last = localStorage.getItem(`lastPost_${anonId}`);
    if (!last) return false;
    return Date.now() - parseInt(last, 10) < 2 * 60 * 1000;
  }

  async function handleCafeSearch() {
    setLoading(true);
    const result = await fetchCafes({ query: cafeQuery });
    setCafeResults(result.data || []);
    setLoading(false);
  }

  async function handleLocation() {
    try {
      setLoading(true);
      const pos = await getCurrentLocation();
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setError("Could not get location");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!imageFile) {
      setError("Image is required");
      return;
    }
    if (isThrottled()) {
      setError("You can only post once every 2 minutes.");
      return;
    }
    setLoading(true);
    const anonId = getAnonId();
    const post = {
      type: "post",
      image: imageFile,
      caption,
      cafeId: selectedCafe?.id,
      coords,
      timestamp: Date.now(),
      anonId,
    };
    // Store locally or send to server as needed
    localStorage.setItem(`lastPost_${anonId}`, String(Date.now()));
    setLoading(false);
    navigate("/feed");
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
              <div className="mt-2 text-xs text-primary">Selected: {selectedCafe.name}</div>
            )}
          </div>
          <div>
            <label className="block mb-1 font-medium">Add Location</label>
            <Button type="button" onClick={handleLocation} disabled={loading || !!coords}>Tag Current Location</Button>
            {coords && <div className="mt-2 text-xs text-primary">Location tagged</div>}
          </div>
          {error && <div className="text-destructive text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sharing..." : "Share Photo"}</Button>
        </form>
      </div>
    </AppLayout>
  );
}

