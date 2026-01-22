import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface Lead {
  id: string;
  companyName: string;
  contactName?: string;
  phone: string;
  status: 'pending' | 'completed' | 'no_answer';
  callResult?: 'no_answer' | 'answered_not_interested' | 'answered_interested' | 'answered_closed';
  callDuration?: number;
  recordingUrl?: string;
  transcript?: string;
  notes?: string;
  completedAt?: Date;
  order: number;
}

interface LeadsContextType {
  leads: Lead[];
  visibleLeads: Lead[];
  currentLead: Lead | null;
  completedLeads: Lead[];
  callbackList: Lead[];
  setCurrentLead: (lead: Lead | null) => void;
  completeLead: (leadId: string, result: Lead['callResult'], duration: number, notes?: string) => Promise<void>;
  getLeadById: (id: string) => Lead | undefined;
  totalLeads: number;
  completedCount: number;
  isLoading: boolean;
  refreshLeads: () => Promise<void>;
}

const LeadsContext = createContext<LeadsContextType | undefined>(undefined);

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch leads assigned to current user
  const fetchLeads = useCallback(async () => {
    if (!user) {
      setLeads([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', user.id)
        .order('lead_order', { ascending: true });

      if (error) {
        console.error('Error fetching leads:', error);
        setIsLoading(false);
        return;
      }

      const mappedLeads: Lead[] = (data || []).map(lead => ({
        id: lead.id,
        companyName: lead.company_name,
        contactName: lead.contact_name || undefined,
        phone: lead.phone,
        status: lead.status as Lead['status'],
        callResult: lead.call_result as Lead['callResult'],
        callDuration: lead.call_duration || undefined,
        recordingUrl: lead.recording_url || undefined,
        transcript: lead.transcript || undefined,
        notes: lead.notes || undefined,
        completedAt: lead.completed_at ? new Date(lead.completed_at) : undefined,
        order: lead.lead_order
      }));

      setLeads(mappedLeads);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const pendingLeads = leads.filter(l => l.status === 'pending').sort((a, b) => a.order - b.order);
  const visibleLeads = pendingLeads.slice(0, 3);
  const completedLeads = leads.filter(l => l.status === 'completed');
  const callbackList = leads.filter(l => l.status === 'no_answer');

  const completeLead = useCallback(async (
    leadId: string, 
    result: Lead['callResult'], 
    duration: number, 
    notes?: string
  ) => {
    if (!user) return;

    const newStatus = result === 'no_answer' ? 'no_answer' : 'completed';

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          call_result: result,
          call_duration: duration,
          notes: notes || null,
          completed_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) {
        console.error('Error completing lead:', error);
        return;
      }

      // Add to callback list if no answer
      if (result === 'no_answer') {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          await supabase.from('callback_list').insert({
            lead_id: leadId,
            original_campaign_id: null // Would need campaign context
          });
        }
      }

      // Update local state
      setLeads(prev => prev.map(lead => {
        if (lead.id === leadId) {
          return {
            ...lead,
            status: newStatus,
            callResult: result,
            callDuration: duration,
            notes,
            completedAt: new Date()
          };
        }
        return lead;
      }));
      
      setCurrentLead(null);
    } catch (error) {
      console.error('Error completing lead:', error);
    }
  }, [user, leads]);

  const getLeadById = useCallback((id: string) => {
    return leads.find(l => l.id === id);
  }, [leads]);

  return (
    <LeadsContext.Provider value={{
      leads,
      visibleLeads,
      currentLead,
      completedLeads,
      callbackList,
      setCurrentLead,
      completeLead,
      getLeadById,
      totalLeads: leads.length,
      completedCount: completedLeads.length + callbackList.length,
      isLoading,
      refreshLeads: fetchLeads
    }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const context = useContext(LeadsContext);
  if (context === undefined) {
    throw new Error('useLeads must be used within a LeadsProvider');
  }
  return context;
}
