import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call Edge Function to verify credentials (keeps credentials server-side)
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { username, password }
      });

      if (error || !data?.authenticated) {
        toast({
          title: 'Login failed',
          description: 'Invalid username or password',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Store auth token with expiry (1 hour)
      const authToken = data.token;
      const expiry = Date.now() + (60 * 60 * 1000); // 1 hour
      sessionStorage.setItem('admin_token', authToken);
      sessionStorage.setItem('admin_token_expiry', expiry.toString());

      toast({
        title: 'Login successful',
        description: 'Welcome to the admin dashboard',
      });
      
      navigate('/admin/dashboard');
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>BeanScene Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
