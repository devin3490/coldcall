import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Building2, User, Clock, Loader2 } from 'lucide-react';

interface CallbackLead {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string;
  completed_at: string | null;
  caller_name: string | null;
}

export function CallbackListDialog() {
  const [open, setOpen] = useState(false);
  const [leads, setLeads] = useState<CallbackLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCallbackLeads();
    }
  }, [open]);

  const fetchCallbackLeads = async () => {
    setIsLoading(true);
    try {
      // Fetch leads with no_answer status
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, company_name, contact_name, phone, completed_at, assigned_to')
        .eq('status', 'no_answer')
        .order('completed_at', { ascending: false });

      if (leadsError) {
        console.error('Error fetching callback leads:', leadsError);
        return;
      }

      // Get unique caller IDs
      const callerIds = [...new Set((leadsData || []).map(l => l.assigned_to).filter(Boolean))];
      
      // Fetch caller names
      let callersMap: Record<string, string> = {};
      if (callerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', callerIds);
        
        callersMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
      }

      const mappedLeads: CallbackLead[] = (leadsData || []).map(lead => ({
        id: lead.id,
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        phone: lead.phone,
        completed_at: lead.completed_at,
        caller_name: lead.assigned_to ? callersMap[lead.assigned_to] || null : null
      }));

      setLeads(mappedLeads);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Voir la liste complète
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-warning" />
            Callback List - Leads à rappeler
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun lead à rappeler
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div 
                key={lead.id} 
                className="glass rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{lead.company_name}</span>
                    </div>
                    
                    {lead.contact_name && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{lead.contact_name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-mono text-muted-foreground">{lead.phone}</span>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(lead.completed_at)}
                    </div>
                    {lead.caller_name && (
                      <p className="text-xs text-muted-foreground">
                        par {lead.caller_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
