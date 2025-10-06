import React, { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { setUsername } from "@/services/userService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const UsernameSelection: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [username, setUsernameInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await setUsername(username);
    setLoading(false);
    if (res.success) {
      toast({
        title: "Success",
        description: "Username set successfully!"
      });
      onComplete();
    } else {
      toast({
        title: "Error",
        description: res.error || "Failed to set username",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Choose Your Username</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsernameInput(e.target.value)}
                placeholder="Enter your username"
                required
                minLength={3}
                maxLength={20}
                pattern="^[a-zA-Z0-9_]+$"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !username}
            >
              {loading ? "Saving..." : "Save Username"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
