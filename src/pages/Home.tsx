import { Coffee } from "lucide-react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Home() {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center mt-16 mb-10">
          <h1 className="text-2xl font-bold mb-4">Coffee is better when shared.</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Bean Scene makes it easy to find cafés and people, whether you're there to focus, hang out, or maybe even meet someone special.
          </p>
          <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
            <Button className="w-full" onClick={() => navigate("/explore")}>Explore Cafés</Button>
            <Button className="w-full" variant="outline" onClick={() => navigate("/checkin")}>Check In</Button>
            <Button className="w-full" variant="secondary" onClick={() => navigate("/create-post")}>Share a Photo</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}