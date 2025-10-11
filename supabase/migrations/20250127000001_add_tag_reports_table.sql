-- Create tag_reports table
CREATE TABLE IF NOT EXISTS tag_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT, -- For anonymous reporting
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_tag_reports_cafe_tag ON tag_reports(cafe_id, tag);
CREATE INDEX IF NOT EXISTS idx_tag_reports_device ON tag_reports(device_id);

-- Enable RLS
ALTER TABLE tag_reports ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to report tags
CREATE POLICY "Allow anonymous tag reporting" ON tag_reports
  FOR INSERT WITH CHECK (true);

-- Allow users to read their own reports
CREATE POLICY "Users can read their own reports" ON tag_reports
  FOR SELECT USING (auth.uid() = user_id OR device_id = current_setting('request.device_id', true));

-- Allow users to read all reports for analytics (admin use)
CREATE POLICY "Allow reading all reports" ON tag_reports
  FOR SELECT USING (true);



