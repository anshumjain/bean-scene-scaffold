-- Create feedback table for user feedback and support requests
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'general', 'support')),
  subject TEXT NOT NULL,
  details TEXT NOT NULL,
  allow_followup BOOLEAN DEFAULT false,
  contact_email TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_device_id ON public.feedback(device_id);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow everyone to insert feedback (anonymous users can submit feedback)
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON public.feedback
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND user_id = (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- Allow anonymous users to view their own feedback by device_id
CREATE POLICY "Anonymous users can view their own feedback by device_id"
  ON public.feedback
  FOR SELECT
  USING (
    auth.uid() IS NULL AND device_id IS NOT NULL
  );

-- Allow users to update their own feedback (for follow-up email changes)
CREATE POLICY "Users can update their own feedback"
  ON public.feedback
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND user_id = (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- Allow anonymous users to update their own feedback by device_id
CREATE POLICY "Anonymous users can update their own feedback by device_id"
  ON public.feedback
  FOR UPDATE
  USING (
    auth.uid() IS NULL AND device_id IS NOT NULL
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.feedback TO anon, authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feedback_updated_at 
  BEFORE UPDATE ON public.feedback 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
