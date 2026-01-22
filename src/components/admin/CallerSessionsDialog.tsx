import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Clock, Phone, CheckCircle2, XCircle, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SessionData {
  id: string;
  start_time: string;
  end_time: string | null;
  leads_completed: number;
  total_call_duration: number;
}

interface SessionWithStats extends SessionData {
  answered_count: number;
  booked_count: number;
  rejected_count: number;
}

interface CallerSessionsDialogProps {
  callerId: string;
  callerName: string;
}

export function CallerSessionsDialog({ callerId, callerName }: CallerSessionsDialogProps) {
  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, callerId]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      // Fetch all sessions for this caller
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('caller_id', callerId)
        .order('start_time', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch leads to calculate per-session stats
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('completed_at, call_result')
        .eq('assigned_to', callerId)
        .not('completed_at', 'is', null);

      if (leadsError) throw leadsError;

      // Calculate stats for each session
      const sessionsWithStats: SessionWithStats[] = (sessionsData || []).map(session => {
        const sessionStart = new Date(session.start_time);
        const sessionEnd = session.end_time ? new Date(session.end_time) : new Date();

        // Filter leads completed during this session
        const sessionLeads = (leadsData || []).filter(lead => {
          if (!lead.completed_at) return false;
          const completedAt = new Date(lead.completed_at);
          return completedAt >= sessionStart && completedAt <= sessionEnd;
        });

        const answeredLeads = sessionLeads.filter(l => 
          l.call_result && l.call_result !== 'no_answer'
        );
        const bookedLeads = sessionLeads.filter(l => 
          l.call_result === 'answered_interested' || l.call_result === 'answered_closed'
        );
        const rejectedLeads = sessionLeads.filter(l => 
          l.call_result === 'answered_not_interested'
        );

        return {
          ...session,
          answered_count: answeredLeads.length,
          booked_count: bookedLeads.length,
          rejected_count: rejectedLeads.length,
        };
      });

      setSessions(sessionsWithStats);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getSessionDuration = (session: SessionData) => {
    const start = new Date(session.start_time);
    const end = session.end_time ? new Date(session.end_time) : new Date();
    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    // Cap sessions without end_time to max 12 hours to avoid counting orphaned sessions
    const maxDuration = 12 * 60 * 60; // 12 hours in seconds
    if (!session.end_time && durationSeconds > maxDuration) {
      return maxDuration;
    }
    
    return durationSeconds;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          <Eye className="w-4 h-4 mr-1" />
          Voir plus
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Historique des sessions - {callerName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucune session enregistrée pour ce caller.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
                <p className="text-xs text-muted-foreground">Sessions totales</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {formatDuration(sessions.reduce((sum, s) => sum + getSessionDuration(s), 0))}
                </p>
                <p className="text-xs text-muted-foreground">Temps total</p>
              </div>
              <div className="bg-success/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-success">
                  {sessions.reduce((sum, s) => sum + s.booked_count, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total meetings</p>
              </div>
              <div className="bg-destructive/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-destructive">
                  {sessions.reduce((sum, s) => sum + s.rejected_count, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total rejets</p>
              </div>
            </div>

            {/* Sessions list */}
            <div className="space-y-3">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`
                    border rounded-lg p-4 
                    ${!session.end_time ? 'border-success bg-success/5' : 'border-border'}
                  `}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-2 h-2 rounded-full
                        ${!session.end_time ? 'bg-success animate-pulse' : 'bg-muted-foreground'}
                      `} />
                      <span className="font-medium text-foreground">
                        {format(new Date(session.start_time), "EEEE d MMMM yyyy", { locale: fr })}
                      </span>
                      {!session.end_time && (
                        <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                          En cours
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(session.start_time), "HH:mm", { locale: fr })}
                      {' → '}
                      {session.end_time 
                        ? format(new Date(session.end_time), "HH:mm", { locale: fr })
                        : 'En cours'
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-warning" />
                      <div>
                        <p className="font-medium text-foreground">
                          {formatDuration(getSessionDuration(session))}
                        </p>
                        <p className="text-xs text-muted-foreground">Durée session</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{session.leads_completed}</p>
                        <p className="text-xs text-muted-foreground">Appels effectués</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{session.answered_count}</p>
                        <p className="text-xs text-muted-foreground">Répondus</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <div>
                        <p className="font-medium text-success">{session.booked_count}</p>
                        <p className="text-xs text-muted-foreground">Meetings</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">{session.rejected_count}</p>
                        <p className="text-xs text-muted-foreground">Rejets</p>
                      </div>
                    </div>
                  </div>

                  {session.total_call_duration > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        Temps d'appel actif: <span className="text-foreground font-medium">{formatDuration(session.total_call_duration)}</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
