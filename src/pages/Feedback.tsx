import { useState } from 'react';
import { MessageSquare, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/Layout/AppLayout';
import { useToast } from '@/hooks/use-toast';
import { submitFeedback, type FeedbackData } from '@/services/feedbackService';

const feedbackTypes = [
  { value: 'bug', label: 'Bug Report', description: 'Something isn\'t working' },
  { value: 'feature', label: 'Feature Request', description: 'Suggest a new feature' },
  { value: 'general', label: 'General Feedback', description: 'Share your thoughts' },
  { value: 'support', label: 'Support', description: 'Need help with something' }
] as const;

export default function Feedback() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Form state
  const [feedbackType, setFeedbackType] = useState<FeedbackData['feedback_type']>('general');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [allowFollowup, setAllowFollowup] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  
  // Validation state
  const [errors, setErrors] = useState<{
    subject?: string;
    details?: string;
    contactEmail?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Required fields
    if (!subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!details.trim()) {
      newErrors.details = 'Details are required';
    }

    // Email validation if follow-up is requested
    if (allowFollowup) {
      if (!contactEmail.trim()) {
        newErrors.contactEmail = 'Email is required for follow-up';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        newErrors.contactEmail = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData: FeedbackData = {
        feedback_type: feedbackType,
        subject: subject.trim(),
        details: details.trim(),
        allow_followup: allowFollowup,
        contact_email: allowFollowup ? contactEmail.trim() : undefined
      };

      const result = await submitFeedback(feedbackData);

      if (result.success) {
        setIsSubmitted(true);
        toast({
          title: "Feedback Submitted",
          description: "Thank you for your feedback! We'll review it soon.",
        });
        
        // Reset form
        setSubject('');
        setDetails('');
        setAllowFollowup(false);
        setContactEmail('');
        setErrors({});
      } else {
        throw new Error(result.error || 'Failed to submit feedback');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit feedback",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewFeedback = () => {
    setIsSubmitted(false);
    setFeedbackType('general');
    setSubject('');
    setDetails('');
    setAllowFollowup(false);
    setContactEmail('');
    setErrors({});
  };

  if (isSubmitted) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto min-h-screen bg-background pb-20">
          {/* Header */}
          <div className="sticky top-0 z-40 coffee-header p-4">
            <h1 className="text-2xl font-bold coffee-heading">Feedback</h1>
            <p className="text-sm text-white/90">Share your thoughts with us</p>
          </div>

          <div className="p-4">
            <Card className="coffee-card">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-xl font-semibold mb-2 coffee-section-heading">Thank You!</h2>
                <p className="text-muted-foreground mb-6">
                  Your feedback has been submitted successfully. We appreciate you taking the time to help us improve BeanScene.
                </p>
                <Button 
                  onClick={handleNewFeedback}
                  className="coffee-button"
                >
                  Submit Another
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 coffee-header p-4">
          <h1 className="text-2xl font-bold coffee-heading">Feedback</h1>
          <p className="text-sm text-white/90">Share your thoughts with us</p>
        </div>

        <div className="p-4 space-y-6">
          {/* Feedback Type Selection */}
          <Card className="coffee-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 coffee-section-heading">
                <MessageSquare className="w-5 h-5 coffee-location-pin" />
                What's this about?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedbackTypes.map((type) => (
                <div
                  key={type.value}
                  onClick={() => setFeedbackType(type.value)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    feedbackType === type.value
                      ? 'border-primary bg-primary/10 coffee-interactive'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-sm text-muted-foreground">{type.description}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Feedback Form */}
          <Card className="coffee-card">
            <CardHeader>
              <CardTitle className="coffee-section-heading">Tell us more</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Subject */}
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium coffee-cafe-name">
                    Subject *
                  </label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your feedback"
                    className="coffee-input"
                  />
                  {errors.subject && (
                    <p className="text-sm text-red-500">{errors.subject}</p>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <label htmlFor="details" className="text-sm font-medium coffee-cafe-name">
                    Details *
                  </label>
                  <Textarea
                    id="details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Please provide as much detail as possible..."
                    rows={4}
                    className="coffee-input resize-none"
                  />
                  {errors.details && (
                    <p className="text-sm text-red-500">{errors.details}</p>
                  )}
                </div>

                {/* Follow-up Checkbox */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowFollowup"
                      checked={allowFollowup}
                      onChange={(e) => setAllowFollowup(e.target.checked)}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <label htmlFor="allowFollowup" className="text-sm font-medium coffee-cafe-name">
                      Yes, you can reach out to me about this
                    </label>
                  </div>

                  {/* Conditional Email Field */}
                  {allowFollowup && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <label htmlFor="contactEmail" className="text-sm font-medium coffee-cafe-name">
                        Email Address *
                      </label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="Enter your email for follow-up"
                        className="coffee-input"
                      />
                      {errors.contactEmail && (
                        <p className="text-sm text-red-500">{errors.contactEmail}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full coffee-button"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
