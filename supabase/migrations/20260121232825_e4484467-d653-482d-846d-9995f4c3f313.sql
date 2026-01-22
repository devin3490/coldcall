-- Create resources table
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('scripts', 'videos', 'faq')),
  file_url TEXT,
  file_name TEXT,
  content TEXT, -- For FAQ text content
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Callers can view all resources
CREATE POLICY "All authenticated users can view resources"
  ON public.resources FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins and supervisors can manage resources
CREATE POLICY "Admins can manage resources"
  ON public.resources FOR ALL
  USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Supervisors can manage resources"
  ON public.resources FOR ALL
  USING (get_user_role(auth.uid()) = 'supervisor'::app_role);

-- Create trigger for updated_at
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for resources
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resources', 'resources', true);

-- Storage policies
CREATE POLICY "Anyone can view resource files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resources');

CREATE POLICY "Admins can upload resource files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resources' 
    AND get_user_role(auth.uid()) = 'admin'::app_role
  );

CREATE POLICY "Supervisors can upload resource files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resources' 
    AND get_user_role(auth.uid()) = 'supervisor'::app_role
  );

CREATE POLICY "Admins can delete resource files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resources' 
    AND get_user_role(auth.uid()) = 'admin'::app_role
  );

CREATE POLICY "Supervisors can delete resource files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resources' 
    AND get_user_role(auth.uid()) = 'supervisor'::app_role
  );