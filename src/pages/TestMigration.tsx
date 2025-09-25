import React, { useState } from 'react';

export default function TestMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState({ success: 0, errors: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const uploadToCloudinary = async (imageBlob: Blob, cafeId: string, placeid: string) => {
    const formData = new FormData();
    formData.append('file', imageBlob, `cafe-${placeid}.jpg`);
    formData.append('upload_preset', 'unsigned_hero_upload'); // Your preset name
    formData.append('folder', 'cafe-heroes');
    formData.append('public_id', `cafe-${placeid}`);

    const response = await fetch('https://api.cloudinary.com/v1_1/BeanSceneCloud/image/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.status}`);
    }

    return await response.json();
  };

  const updateCafePhoto = async (cafeId: string, photoUrl: string) => {
    const response = await fetch('/api/update-cafe-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cafeId, photoUrl }),
    });

    if (!response.ok) {
      throw new Error(`Database update failed: ${response.status}`);
    }

    return await response.json();
  };

  const runClientMigration = async () => {
    setIsRunning(true);
    setProgress({ current: 0, total: 0 });
    setResults({ success: 0, errors: 0 });
    setLogs([]);
    
    try {
      // Get cafes needing migration
      addLog('Fetching cafes needing photo migration...');
      const cafesResponse = await fetch('/api/get-cafes-for-migration');
      const { cafes } = await cafesResponse.json();
      
      setProgress({ current: 0, total: cafes.length });
      addLog(`Found ${cafes.length} cafes to process`);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < cafes.length; i++) {
        const cafe = cafes[i];
        setProgress({ current: i + 1, total: cafes.length });
        
        try {
          addLog(`Processing ${cafe.name}...`);
          
          // Create Google Photos URL - you'll need to add your Google API key as NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
          const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&maxheight=600&photoreference=${cafe.google_photo_reference}&key=AIzaSyCwMuwNAi18rXNM_7tV5nYYljTGtEjiYXA`;
          
          // Download image (works in browser)
          const imageResponse = await fetch(googlePhotoUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status}`);
          }
          
          const imageBlob = await imageResponse.blob();
          addLog(`Downloaded ${cafe.name} (${Math.round(imageBlob.size / 1024)}KB)`);
          
          // Upload to Cloudinary
          const uploadResult = await uploadToCloudinary(imageBlob, cafe.id, cafe.place_id);
          addLog(`Uploaded ${cafe.name} to Cloudinary`);
          
          // Update database
          await updateCafePhoto(cafe.id, uploadResult.secure_url);
          addLog(`✅ Updated ${cafe.name} in database`);
          
          successCount++;
          setResults({ success: successCount, errors: errorCount });
          
        } catch (error) {
          errorCount++;
          addLog(`❌ Error processing ${cafe.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setResults({ success: successCount, errors: errorCount });
        }
        
        // Rate limiting
        if (i < cafes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      addLog(`Migration completed! Success: ${successCount}, Errors: ${errorCount}`);
      
    } catch (error) {
      addLog(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Photo Migration (Client-Side)
          </h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">How This Works</h3>
              <p className="text-blue-800 text-sm">
                This runs in your browser where Google Photos API works properly. 
                It downloads images from Google, uploads them to Cloudinary, and updates your database.
              </p>
            </div>

            <button
              onClick={runClientMigration}
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors"
            >
              {isRunning ? 'Running Migration...' : 'Start Client-Side Migration'}
            </button>

            {progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress: {progress.current} / {progress.total}</span>
                  <span>Success: {results.success} | Errors: {results.errors}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div className="bg-gray-100 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Migration Log</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="text-sm font-mono text-gray-700">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
