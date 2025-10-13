import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Coffee, Clock, DollarSign, Phone, Globe, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CafeRequest {
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
}

const NEIGHBORHOODS = [
  'Missouri City',
  'Sugar Land',
  'Richmond',
  'Rosenberg',
  'Stafford',
  'Alief',
  'Westchase',
  'Bellaire',
  'Other'
];

const PRICE_LEVELS = [
  { value: '0', label: 'Free' },
  { value: '1', label: '$ - Inexpensive' },
  { value: '2', label: '$$ - Moderate' },
  { value: '3', label: '$$$ - Expensive' },
  { value: '4', label: '$$$$ - Very Expensive' }
];

const AMENITIES = [
  'WiFi',
  'Outdoor Seating',
  'Pet Friendly',
  'Study Friendly',
  'Parking Available',
  'Drive Through',
  'Live Music',
  'Food Available',
  'Vegan Options',
  'Gluten Free Options',
  'Local Roaster',
  'Latte Art',
  'Meeting Space'
];

export default function RequestCafe() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CafeRequest>({
    name: '',
    address: '',
    neighborhood: '',
    phoneNumber: '',
    website: '',
    description: '',
    priceLevel: '',
    hours: '',
    amenities: [],
    submittedBy: '',
    submittedEmail: ''
  });

  const handleInputChange = (field: keyof CafeRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For now, we'll store in localStorage or you can create a simple API endpoint
      const requests = JSON.parse(localStorage.getItem('cafe-requests') || '[]');
      const newRequest = {
        ...formData,
        id: Date.now(),
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };
      
      requests.push(newRequest);
      localStorage.setItem('cafe-requests', JSON.stringify(requests));

      toast({
        title: "Cafe Request Submitted! 🎉",
        description: "Thank you for your submission. We'll review and add it to our database soon!",
      });

      // Reset form
      setFormData({
        name: '',
        address: '',
        neighborhood: '',
        phoneNumber: '',
        website: '',
        description: '',
        priceLevel: '',
        hours: '',
        amenities: [],
        submittedBy: '',
        submittedEmail: ''
      });

      // Navigate back to search
      navigate('/search');

    } catch (error) {
      console.error('Error submitting cafe request:', error);
      toast({
        title: "Error",
        description: "Failed to submit cafe request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-4">
            <Coffee className="inline-block w-10 h-10 mr-3" />
            Request a Cafe
          </h1>
          <p className="text-amber-700 text-lg">
            Know a great coffee shop in Missouri City area? Help us add it to our database!
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-900">
              <MapPin className="w-5 h-5 mr-2" />
              Cafe Information
            </CardTitle>
            <CardDescription>
              Fill out the details below. We'll review and add the cafe to our database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-amber-900 font-medium">
                    <Coffee className="inline-block w-4 h-4 mr-1" />
                    Cafe Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Local Coffee Co."
                    required
                    className="border-amber-200 focus:border-amber-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood" className="text-amber-900 font-medium">
                    <MapPin className="inline-block w-4 h-4 mr-1" />
                    Neighborhood *
                  </Label>
                  <Select
                    value={formData.neighborhood}
                    onValueChange={(value) => handleInputChange('neighborhood', value)}
                    required
                  >
                    <SelectTrigger className="border-amber-200 focus:border-amber-400">
                      <SelectValue placeholder="Select neighborhood" />
                    </SelectTrigger>
                    <SelectContent>
                      {NEIGHBORHOODS.map(neighborhood => (
                        <SelectItem key={neighborhood} value={neighborhood}>
                          {neighborhood}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-amber-900 font-medium">
                  <MapPin className="inline-block w-4 h-4 mr-1" />
                  Full Address *
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="e.g., 123 Main St, Missouri City, TX 77489"
                  required
                  className="border-amber-200 focus:border-amber-400"
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-amber-900 font-medium">
                    <Phone className="inline-block w-4 h-4 mr-1" />
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="(281) 123-4567"
                    className="border-amber-200 focus:border-amber-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-amber-900 font-medium">
                    <Globe className="inline-block w-4 h-4 mr-1" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://example.com"
                    className="border-amber-200 focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Price Level and Hours */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceLevel" className="text-amber-900 font-medium">
                    <DollarSign className="inline-block w-4 h-4 mr-1" />
                    Price Level
                  </Label>
                  <Select
                    value={formData.priceLevel}
                    onValueChange={(value) => handleInputChange('priceLevel', value)}
                  >
                    <SelectTrigger className="border-amber-200 focus:border-amber-400">
                      <SelectValue placeholder="Select price level" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours" className="text-amber-900 font-medium">
                    <Clock className="inline-block w-4 h-4 mr-1" />
                    Opening Hours
                  </Label>
                  <Input
                    id="hours"
                    value={formData.hours}
                    onChange={(e) => handleInputChange('hours', e.target.value)}
                    placeholder="e.g., Mon-Fri 6AM-8PM, Sat-Sun 7AM-9PM"
                    className="border-amber-200 focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-amber-900 font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Tell us about this cafe... What makes it special? What kind of coffee do they serve?"
                  rows={4}
                  className="border-amber-200 focus:border-amber-400"
                />
              </div>

              {/* Amenities */}
              <div className="space-y-3">
                <Label className="text-amber-900 font-medium">
                  <Camera className="inline-block w-4 h-4 mr-1" />
                  Amenities (select all that apply)
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {AMENITIES.map(amenity => (
                    <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm text-amber-800">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submitter Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-amber-900 mb-4">Your Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="submittedBy" className="text-amber-900 font-medium">
                      Your Name
                    </Label>
                    <Input
                      id="submittedBy"
                      value={formData.submittedBy}
                      onChange={(e) => handleInputChange('submittedBy', e.target.value)}
                      placeholder="Your name"
                      className="border-amber-200 focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="submittedEmail" className="text-amber-900 font-medium">
                      Email (optional)
                    </Label>
                    <Input
                      id="submittedEmail"
                      type="email"
                      value={formData.submittedEmail}
                      onChange={(e) => handleInputChange('submittedEmail', e.target.value)}
                      placeholder="your.email@example.com"
                      className="border-amber-200 focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/search')}
                  className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData.name || !formData.address || !formData.neighborhood}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {loading ? 'Submitting...' : 'Submit Cafe Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-amber-700">
          <p className="text-sm">
            💡 <strong>Tip:</strong> The more details you provide, the better we can add this cafe to our database!
          </p>
        </div>
      </div>
    </div>
  );
}
