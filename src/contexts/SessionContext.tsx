import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface WorkSession {
  id: string;
  callerId: string;
  startTime: Date;
  endTime?: Date;
  leadsCompleted: number;
  totalCallDuration: number;
}

interface SessionContextType {
  currentSession: WorkSession | null;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  incrementLeadsCompleted: () => void;
  addCallDuration: (duration: number) => void;
  isSessionActive: boolean;
  sessionDuration: number;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (currentSession && !currentSession.endTime) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentSession]);

  const startSession = useCallback(async () => {
    if (!user) return;

    try {
      // First, close any existing open sessions for this caller
      const { error: closeError } = await supabase
        .from('sessions')
        .update({
          end_time: new Date().toISOString()
        })
        .eq('caller_id', user.id)
        .is('end_time', null);

      if (closeError) {
        console.error('Error closing previous sessions:', closeError);
      }

      // Now create a new session
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          caller_id: user.id,
          start_time: new Date().toISOString(),
          leads_completed: 0,
          total_call_duration: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting session:', error);
        return;
      }

      setCurrentSession({
        id: data.id,
        callerId: data.caller_id,
        startTime: new Date(data.start_time),
        leadsCompleted: 0,
        totalCallDuration: 0
      });
      setSessionDuration(0);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }, [user]);

  const endSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          end_time: new Date().toISOString(),
          leads_completed: currentSession.leadsCompleted,
          total_call_duration: currentSession.totalCallDuration
        })
        .eq('id', currentSession.id);

      if (error) {
        console.error('Error ending session:', error);
      }

      setCurrentSession(null);
      setSessionDuration(0);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, [currentSession]);

  const incrementLeadsCompleted = useCallback(() => {
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        leadsCompleted: prev.leadsCompleted + 1
      } : null);
    }
  }, [currentSession]);

  const addCallDuration = useCallback((duration: number) => {
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        totalCallDuration: prev.totalCallDuration + duration
      } : null);
    }
  }, [currentSession]);

  return (
    <SessionContext.Provider value={{
      currentSession,
      startSession,
      endSession,
      incrementLeadsCompleted,
      addCallDuration,
      isSessionActive: !!currentSession,
      sessionDuration
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
