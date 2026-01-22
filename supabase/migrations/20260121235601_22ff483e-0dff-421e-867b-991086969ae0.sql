-- Create storage bucket for call recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Allow callers to upload their own recordings
CREATE POLICY "Callers can upload recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'recordings' 
  AND auth.uid() IS NOT NULL
);

-- Allow callers to view their own recordings (based on folder structure: user_id/filename)
CREATE POLICY "Callers can view their recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins and supervisors to view all recordings
CREATE POLICY "Admins can view all recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'recordings' 
  AND get_user_role(auth.uid()) IN ('admin', 'supervisor')
);