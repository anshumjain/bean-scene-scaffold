import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestMigration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const runMigration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/migrate-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data.message);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1>Photo Migration</h1>
      <Button onClick={runMigration} disabled={loading}>
        {loading ? 'Fixing Photos...' : 'Fix Cafe Photos'}
      </Button>
      {result && <p className="mt-4">{result}</p>}
    </div>
  );
}
