import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: 'scripts' | 'videos' | 'faq';
  file_url: string | null;
  file_name: string | null;
  content: string | null;
  created_by: string | null;
  created_at: string;
}

export function useResources(category?: string) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResources = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching resources:', error);
    } else {
      setResources((data as Resource[]) || []);
    }
    
    setIsLoading(false);
  };

  const deleteResource = async (id: string, fileUrl: string | null) => {
    // Delete file from storage if exists
    if (fileUrl) {
      const path = fileUrl.split('/resources/')[1];
      if (path) {
        await supabase.storage.from('resources').remove([path]);
      }
    }

    // Delete record
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    setResources(prev => prev.filter(r => r.id !== id));
  };

  useEffect(() => {
    fetchResources();
  }, [category]);

  return { resources, isLoading, refetch: fetchResources, deleteResource };
}
