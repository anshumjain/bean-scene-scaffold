import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/Layout/AppLayout';
import { validateAllCafes } from '@/services/validationService';

export default function DataValidation() {
  const [validationResults, setValidationResults] = useState<{
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
    duplicates: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runValidation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await validateAllCafes();
      
      if (result.success && result.data) {
        setValidationResults(result.data);
      } else {
        setError(result.error || 'Failed to validate data');
      }
    } catch (err) {
      setError('Failed to run validation');
    } finally {
      setLoading(false);
    }
  };

  const getValidationScore = () => {
    if (!validationResults) return 0;
    return Math.round((validationResults.valid / validationResults.total) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <AppLayout showBottomNav={false}>
      <div className="max-w-4xl mx-auto min-h-screen bg-background pb-20">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Data Validation</h1>
          </div>

          {/* Validation Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Run Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Validate all cafe data for completeness, accuracy, and duplicates.
              </p>
              <Button 
                onClick={runValidation} 
                disabled={loading}
                className="coffee-gradient text-white shadow-coffee hover:shadow-glow transition-smooth"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Validating...
                  </>
                ) : (
                  'Run Validation'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Validation Error</span>
                </div>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Validation Results */}
          {validationResults && (
            <div className="space-y-4">
              {/* Overall Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Validation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold">
                      <span className={getScoreColor(getValidationScore())}>
                        {getValidationScore()}%
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Data Quality Score</p>
                      <p>{validationResults.valid} of {validationResults.total} cafes valid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Total Cafes</span>
                    </div>
                    <div className="text-2xl font-bold mt-2">{validationResults.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Valid</span>
                    </div>
                    <div className="text-2xl font-bold mt-2 text-green-500">
                      {validationResults.valid}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">Invalid</span>
                    </div>
                    <div className="text-2xl font-bold mt-2 text-red-500">
                      {validationResults.invalid}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">Warnings</span>
                    </div>
                    <div className="text-2xl font-bold mt-2 text-yellow-500">
                      {validationResults.warnings}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Issues Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Issues Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {validationResults.invalid > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">
                          {validationResults.invalid} Invalid Records
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Cafes with missing required data
                        </span>
                      </div>
                    )}
                    
                    {validationResults.warnings > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {validationResults.warnings} Warnings
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Cafes with potential data issues
                        </span>
                      </div>
                    )}
                    
                    {validationResults.duplicates > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-orange-200 text-orange-800">
                          {validationResults.duplicates} Potential Duplicates
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Cafes that may be duplicates
                        </span>
                      </div>
                    )}
                    
                    {validationResults.invalid === 0 && validationResults.warnings === 0 && validationResults.duplicates === 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 font-medium">
                          No issues found! All data looks good.
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}







