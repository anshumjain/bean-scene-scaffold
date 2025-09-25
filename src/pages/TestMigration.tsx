import React, { useState } from 'react';

export default function TestMigration() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState('');

  const runMigration = async () => {
    setIsLoading(true);
    setResult('');
    
    try {
      const response = await fetch('/api/migrate-photos-cloudinary', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data.message || JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSingleUpload = async () => {
    setIsTesting(true);
    setResult('');
    
    try {
      const response = await fetch('/api/test-single-upload', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      // Format the result for better readability
      setResult(JSON.stringify(data, null, 2));
      
      // Also log to console for easy inspection
      console.log('Single upload test results:', data);
      
    } catch (error) {
      setResult(`Test Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Photo Migration Testing
          </h1>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <button
                onClick={testSingleUpload}
                disabled={isTesting || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {isTesting ? 'Testing Single Upload...' : 'Test Single Upload'}
              </button>
              
              <button
                onClick={runMigration}
                disabled={isLoading || isTesting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Running Migration...' : 'Run Full Migration'}
              </button>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Test Single Upload:</strong> Tests just one cafe photo upload to see detailed error information</p>
              <p><strong>Run Full Migration:</strong> Processes all 164 cafes (takes 3-4 minutes)</p>
            </div>

            {result && (
              <div className="mt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Results:</h2>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
                  {result}
                </pre>
              </div>
            )}

            {(isLoading || isTesting) && (
              <div className="mt-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">
                  {isTesting ? 'Testing single upload...' : 'Running migration...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
