import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Eye, MapPin, Phone, Globe, Clock, DollarSign, Coffee } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CafeRequest {
  id: number;
  name: string;
  address: string;
  neighborhood: string;
  phoneNumber: string;
  website: string;
  description: string;
  priceLevel: string;
  hours: string;
  amenities: string[];
  submittedBy: string;
  submittedEmail: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
}

const PRICE_LEVELS = [
  { value: '0', label: 'Free' },
  { value: '1', label: '$ - Inexpensive' },
  { value: '2', label: '$$ - Moderate' },
  { value: '3', label: '$$$ - Expensive' },
  { value: '4', label: '$$$$ - Very Expensive' }
];

export default function CafeRequests() {
  const [requests, setRequests] = useState<CafeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CafeRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = () => {
    try {
      const storedRequests = JSON.parse(localStorage.getItem('cafe-requests') || '[]');
      setRequests(storedRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: "Error",
        description: "Failed to load cafe requests.",
        variant: "destructive",
      });
    }
  };

  const updateRequestStatus = (requestId: number, status: 'approved' | 'rejected') => {
    setLoading(true);
    
    try {
      const updatedRequests = requests.map(req => 
        req.id === requestId 
          ? { ...req, status, adminNotes }
          : req
      );
      
      setRequests(updatedRequests);
      localStorage.setItem('cafe-requests', JSON.stringify(updatedRequests));
      
      if (status === 'approved') {
        toast({
          title: "Request Approved! ✅",
          description: "The cafe request has been approved and added to the database.",
        });
        // Here you would typically add the cafe to your Supabase database
        addCafeToDatabase(requests.find(r => r.id === requestId)!);
      } else {
        toast({
          title: "Request Rejected ❌",
          description: "The cafe request has been rejected.",
        });
      }
      
      setSelectedRequest(null);
      setAdminNotes('');
      
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: "Failed to update request status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addCafeToDatabase = async (request: CafeRequest) => {
    try {
      // This is a mock function - in reality you'd call your Supabase API
      console.log('Adding cafe to database:', {
        name: request.name,
        address: request.address,
        neighborhood: request.neighborhood,
        phone_number: request.phoneNumber,
        website: request.website,
        price_level: parseInt(request.priceLevel),
        opening_hours: request.hours,
        tags: request.amenities,
        is_active: true
      });
      
      // TODO: Implement actual Supabase insertion
      // const { error } = await supabase
      //   .from('cafes')
      //   .insert({
      //     name: request.name,
      //     address: request.address,
      //     neighborhood: request.neighborhood,
      //     phone_number: request.phoneNumber,
      //     website: request.website,
      //     price_level: parseInt(request.priceLevel),
      //     opening_hours: request.hours,
      //     tags: request.amenities,
      //     is_active: true
      //   });
      
    } catch (error) {
      console.error('Error adding cafe to database:', error);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-4">
            <Coffee className="inline-block w-10 h-10 mr-3" />
            Cafe Request Management
          </h1>
          <p className="text-amber-700 text-lg">
            Review and manage cafe requests from users
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-900">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    Pending ({pendingRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingRequests.length === 0 ? (
                    <p className="text-amber-600 text-sm">No pending requests</p>
                  ) : (
                    pendingRequests.map(request => (
                      <div
                        key={request.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedRequest?.id === request.id
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-amber-200 hover:border-amber-300 bg-white'
                        }`}
                        onClick={() => setSelectedRequest(request)}
                      >
                        <h4 className="font-medium text-amber-900">{request.name}</h4>
                        <p className="text-sm text-amber-600">{request.neighborhood}</p>
                        <p className="text-xs text-amber-500">
                          Submitted by {request.submittedBy} • {new Date(request.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-900">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    Approved ({approvedRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {approvedRequests.length === 0 ? (
                    <p className="text-amber-600 text-sm">No approved requests</p>
                  ) : (
                    approvedRequests.map(request => (
                      <div key={request.id} className="p-3 rounded-lg border border-green-200 bg-green-50">
                        <h4 className="font-medium text-green-900">{request.name}</h4>
                        <p className="text-sm text-green-600">{request.neighborhood}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-900">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    Rejected ({rejectedRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rejectedRequests.length === 0 ? (
                    <p className="text-amber-600 text-sm">No rejected requests</p>
                  ) : (
                    rejectedRequests.map(request => (
                      <div key={request.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                        <h4 className="font-medium text-red-900">{request.name}</h4>
                        <p className="text-sm text-red-600">{request.neighborhood}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Request Details */}
          <div className="lg:col-span-2">
            {selectedRequest ? (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-amber-900">
                    <span>{selectedRequest.name}</span>
                    <Badge variant={selectedRequest.status === 'pending' ? 'secondary' : selectedRequest.status === 'approved' ? 'default' : 'destructive'}>
                      {selectedRequest.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Submitted by {selectedRequest.submittedBy} on {new Date(selectedRequest.submittedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-amber-900 font-medium flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        Address
                      </Label>
                      <p className="text-amber-700">{selectedRequest.address}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-amber-900 font-medium">Neighborhood</Label>
                      <p className="text-amber-700">{selectedRequest.neighborhood}</p>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedRequest.phoneNumber && (
                      <div className="space-y-2">
                        <Label className="text-amber-900 font-medium flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          Phone
                        </Label>
                        <p className="text-amber-700">{selectedRequest.phoneNumber}</p>
                      </div>
                    )}
                    
                    {selectedRequest.website && (
                      <div className="space-y-2">
                        <Label className="text-amber-900 font-medium flex items-center">
                          <Globe className="w-4 h-4 mr-1" />
                          Website
                        </Label>
                        <a href={selectedRequest.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {selectedRequest.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Price and Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedRequest.priceLevel && (
                      <div className="space-y-2">
                        <Label className="text-amber-900 font-medium flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Price Level
                        </Label>
                        <p className="text-amber-700">
                          {PRICE_LEVELS.find(p => p.value === selectedRequest.priceLevel)?.label}
                        </p>
                      </div>
                    )}
                    
                    {selectedRequest.hours && (
                      <div className="space-y-2">
                        <Label className="text-amber-900 font-medium flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Hours
                        </Label>
                        <p className="text-amber-700">{selectedRequest.hours}</p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedRequest.description && (
                    <div className="space-y-2">
                      <Label className="text-amber-900 font-medium">Description</Label>
                      <p className="text-amber-700">{selectedRequest.description}</p>
                    </div>
                  )}

                  {/* Amenities */}
                  {selectedRequest.amenities.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-amber-900 font-medium">Amenities</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.amenities.map(amenity => (
                          <Badge key={amenity} variant="outline" className="text-amber-700 border-amber-300">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Actions */}
                  {selectedRequest.status === 'pending' && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="adminNotes" className="text-amber-900 font-medium">
                          Admin Notes (Optional)
                        </Label>
                        <Textarea
                          id="adminNotes"
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add any notes about this request..."
                          rows={3}
                          className="border-amber-200 focus:border-amber-400"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={() => updateRequestStatus(selectedRequest.id, 'approved')}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve & Add to Database
                        </Button>
                        <Button
                          onClick={() => updateRequestStatus(selectedRequest.id, 'rejected')}
                          disabled={loading}
                          variant="destructive"
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg">
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-amber-600">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a request to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
