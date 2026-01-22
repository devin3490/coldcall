import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CallerStats {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  has_active_session: boolean;
  leads_count: number;
  completed_count: number;
  total_duration: number;
  answered_count: number;
  booked_count: number;
  rejected_count: number;
  booking_rate: number;
  rejection_rate: number;
  total_session_time: number;
  sessions_count: number;
}

interface AdminStats {
  totalCallers: number;
  activeCallers: number;
  totalLeads: number;
  completedLeads: number;
  noAnswerLeads: number;
  interestedLeads: number;
  notInterestedLeads: number;
  closedLeads: number;
  avgCallDuration: string;
  responseRate: string;
  closeRate: string;
  callers: CallerStats[];
  callbackCount: number;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch all callers
      const { data: callersData, error: callersError } = await supabase
        .from('profiles')
        .select('id, name, email, is_active, role')
        .eq('role', 'caller');

      if (callersError) throw callersError;

      const callers = callersData || [];

      // Fetch all sessions for all callers
      const { data: allSessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*');

      if (sessionsError) throw sessionsError;

      const allSessions = allSessionsData || [];

      const activeSessionCallerIds = new Set(
        allSessions.filter(s => !s.end_time).map(s => s.caller_id)
      );

      const callersWithActiveSessions = callers.filter(c => activeSessionCallerIds.has(c.id));

      // Fetch all leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*');

      if (leadsError) throw leadsError;

      const leads = leadsData || [];

      // Calculate stats
      const completedLeads = leads.filter(l => l.status === 'completed');
      const noAnswerLeads = leads.filter(l => l.status === 'no_answer');
      const interestedLeads = leads.filter(l => l.call_result === 'answered_interested');
      const notInterestedLeads = leads.filter(l => l.call_result === 'answered_not_interested');
      const closedLeads = leads.filter(l => l.call_result === 'answered_closed');

      // Callback count - count leads with no_answer status
      const callbackCount = noAnswerLeads.length;

      // Total call duration
      const totalDuration = leads.reduce((sum, l) => sum + (l.call_duration || 0), 0);
      const avgDurationSecs = completedLeads.length > 0 
        ? Math.round(totalDuration / completedLeads.length) 
        : 0;
      const avgMinutes = Math.floor(avgDurationSecs / 60);
      const avgSeconds = avgDurationSecs % 60;

      // Response rate (calls answered / total calls attempted)
      const attemptedCalls = leads.filter(l => l.status !== 'pending').length;
      const answeredCalls = leads.filter(l => l.call_result && l.call_result !== 'no_answer').length;
      const responseRate = attemptedCalls > 0 
        ? Math.round((answeredCalls / attemptedCalls) * 100) 
        : 0;

      // Close rate (closed / answered)
      const closeRate = answeredCalls > 0 
        ? Math.round((closedLeads.length / answeredCalls) * 100) 
        : 0;

      // Per-caller stats
      const callerStats: CallerStats[] = callers.map(caller => {
        const callerLeads = leads.filter(l => l.assigned_to === caller.id);
        const callerCompleted = callerLeads.filter(l => l.status === 'completed');
        const callerDuration = callerLeads.reduce((sum, l) => sum + (l.call_duration || 0), 0);
        
        // Calls where someone answered (not no_answer and has a result)
        const answeredLeads = callerLeads.filter(l => 
          l.call_result && l.call_result !== 'no_answer'
        );
        
        // Booked = interested or closed
        const bookedLeads = callerLeads.filter(l => 
          l.call_result === 'answered_interested' || l.call_result === 'answered_closed'
        );
        
        // Rejected = not interested
        const rejectedLeads = callerLeads.filter(l => 
          l.call_result === 'answered_not_interested'
        );

        const answeredCount = answeredLeads.length;
        const bookedCount = bookedLeads.length;
        const rejectedCount = rejectedLeads.length;

        // Calculate total session time for this caller
        const callerSessions = allSessions.filter(s => s.caller_id === caller.id);
        const maxDuration = 12 * 60 * 60; // 12 hours max per session
        const totalSessionTime = callerSessions.reduce((sum, session) => {
          const start = new Date(session.start_time).getTime();
          const end = session.end_time ? new Date(session.end_time).getTime() : Date.now();
          let duration = Math.floor((end - start) / 1000);
          
          // Cap sessions without end_time to avoid counting orphaned sessions
          if (!session.end_time && duration > maxDuration) {
            duration = maxDuration;
          }
          
          return sum + duration;
        }, 0);

        return {
          id: caller.id,
          name: caller.name,
          email: caller.email,
          is_active: caller.is_active,
          has_active_session: activeSessionCallerIds.has(caller.id),
          leads_count: callerLeads.length,
          completed_count: callerCompleted.length,
          total_duration: callerDuration,
          answered_count: answeredCount,
          booked_count: bookedCount,
          rejected_count: rejectedCount,
          booking_rate: answeredCount > 0 ? Math.round((bookedCount / answeredCount) * 100) : 0,
          rejection_rate: answeredCount > 0 ? Math.round((rejectedCount / answeredCount) * 100) : 0,
          total_session_time: totalSessionTime,
          sessions_count: callerSessions.length,
        };
      });

      setStats({
        totalCallers: callers.length,
        activeCallers: callersWithActiveSessions.length,
        totalLeads: leads.length,
        completedLeads: completedLeads.length,
        noAnswerLeads: noAnswerLeads.length,
        interestedLeads: interestedLeads.length,
        notInterestedLeads: notInterestedLeads.length,
        closedLeads: closedLeads.length,
        avgCallDuration: `${avgMinutes}:${avgSeconds.toString().padStart(2, '0')}`,
        responseRate: `${responseRate}%`,
        closeRate: `${closeRate}%`,
        callers: callerStats,
        callbackCount: callbackCount || 0
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refetch: fetchStats };
}
