import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { fixExistingCafePhotos } from '@/services/cafeService';

export default function TestMigration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const runMigration = async () => {
    setLoading(true);
    try {
      const result = await fixExistingCafePhotos();
      setResult(`Fixed ${result.data} cafe photos!`);
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
