import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Phone, 
  Clock, 
  Calendar, 
  Building2, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  PhoneOff,
  PhoneForwarded,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Pause,
  Volume2,
  RefreshCw
} from 'lucide-react';

interface CompletedLead {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string;
  call_result: string | null;
  call_duration: number | null;
  notes: string | null;
  completed_at: string | null;
  recording_url: string | null;
  transcript: string | null;
}

const resultConfig: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  interested: { label: 'Intéressé', icon: <CheckCircle2 className="w-3 h-3" />, variant: 'default' },
  answered_interested: { label: 'Intéressé', icon: <CheckCircle2 className="w-3 h-3" />, variant: 'default' },
  answered_closed: { label: 'Fermé', icon: <CheckCircle2 className="w-3 h-3" />, variant: 'default' },
  callback: { label: 'Rappeler', icon: <PhoneForwarded className="w-3 h-3" />, variant: 'secondary' },
  not_interested: { label: 'Pas intéressé', icon: <XCircle className="w-3 h-3" />, variant: 'destructive' },
  answered_not_interested: { label: 'Pas intéressé', icon: <XCircle className="w-3 h-3" />, variant: 'destructive' },
  no_answer: { label: 'Pas de réponse', icon: <PhoneOff className="w-3 h-3" />, variant: 'outline' },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '--';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

interface AudioPlayerProps {
  recordingPath: string;
}

function AudioPlayer({ recordingPath }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Extract path from full URL or use as-is
        let path = recordingPath;
        if (recordingPath.includes('/storage/v1/object/public/recordings/')) {
          path = recordingPath.split('/storage/v1/object/public/recordings/')[1];
        } else if (recordingPath.includes('/storage/v1/object/recordings/')) {
          path = recordingPath.split('/storage/v1/object/recordings/')[1];
        }
        
        const { data, error: signError } = await supabase.storage
          .from('recordings')
          .createSignedUrl(path, 3600); // 1 hour expiry
        
        if (signError) {
          console.error('Error getting signed URL:', signError);
          setError('Impossible de charger l\'audio');
          return;
        }
        
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error:', err);
        setError('Erreur de chargement');
      } finally {
        setIsLoading(false);
      }
    };

    if (recordingPath) {
      getSignedUrl();
    }
  }, [recordingPath]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement de l'audio...</span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
        <XCircle className="w-5 h-5 text-destructive" />
        <span className="text-sm text-destructive">{error || 'Audio non disponible'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
      <audio
        ref={audioRef}
        src={signedUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </Button>
      
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground w-10">
          {formatDuration(Math.floor(currentTime))}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />
        <span className="text-xs font-mono text-muted-foreground w-10">
          {formatDuration(Math.floor(duration))}
        </span>
      </div>
      
      <Volume2 className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

export default function CallHistory() {
  const { user } = useAuth();
  const [completedLeads, setCompletedLeads] = useState<CompletedLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());

  const fetchCompletedLeads = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('id, company_name, contact_name, phone, call_result, call_duration, notes, completed_at, recording_url, transcript')
      .eq('assigned_to', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching completed leads:', error);
    } else {
      setCompletedLeads(data || []);
    }
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchCompletedLeads();
  }, [fetchCompletedLeads]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const triggerTranscription = async (lead: CompletedLead) => {
    if (!lead.recording_url) {
      toast.error('Aucun enregistrement disponible');
      return;
    }

    setTranscribingIds(prev => new Set(prev).add(lead.id));
    toast.info('Transcription lancée...');

    try {
      const { error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          recording_url: lead.recording_url, 
          lead_id: lead.id 
        }
      });

      if (error) {
        console.error('Transcription error:', error);
        toast.error('Erreur lors de la transcription');
      } else {
        toast.success('Transcription terminée !');
        // Refresh to get the new transcript
        await fetchCompletedLeads();
      }
    } catch (err) {
      console.error('Error triggering transcription:', err);
      toast.error('Erreur lors de la transcription');
    } finally {
      setTranscribingIds(prev => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-0.5 sm:mb-1">Historique des appels</h1>
            <p className="text-sm text-muted-foreground">
              {completedLeads.length} appel{completedLeads.length !== 1 ? 's' : ''} complété{completedLeads.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCompletedLeads} className="self-start sm:self-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {completedLeads.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-8 sm:py-12 text-center">
              <Phone className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">Aucun appel complété pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-11rem)] sm:h-[calc(100vh-12rem)]">
            <div className="space-y-2 sm:space-y-3 pr-2 sm:pr-4">
              {completedLeads.map((lead) => {
                const result = lead.call_result ? resultConfig[lead.call_result] : null;
                const isExpanded = expandedId === lead.id;
                const isTranscribing = transcribingIds.has(lead.id);

                return (
                  <Card key={lead.id} className="glass overflow-hidden">
                    <CardHeader 
                      className="p-3 sm:p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                      onClick={() => toggleExpand(lead.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm sm:text-base font-semibold truncate">
                              {lead.company_name}
                            </CardTitle>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {lead.contact_name || 'Contact non spécifié'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          {result && (
                            <Badge variant={result.variant} className="gap-1 text-xs hidden sm:flex">
                              {result.icon}
                              {result.label}
                            </Badge>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      {/* Mobile badge */}
                      {result && (
                        <div className="sm:hidden mt-2">
                          <Badge variant={result.variant} className="gap-1 text-xs">
                            {result.icon}
                            {result.label}
                          </Badge>
                        </div>
                      )}
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0 pb-3 sm:pb-4 px-3 sm:px-4 border-t border-border/50">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-3 sm:mt-4">
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-mono truncate">{lead.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                            <span>{formatDuration(lead.call_duration)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm col-span-2">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{formatDate(lead.completed_at)}</span>
                          </div>
                        </div>

                        {/* Recording Player */}
                        {lead.recording_url && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                              <Volume2 className="w-4 h-4" />
                              Enregistrement
                            </h4>
                            <AudioPlayer recordingPath={lead.recording_url} />
                          </div>
                        )}

                        {/* Transcript */}
                        {lead.transcript && (
                          <div className="mt-4 p-3 bg-accent/50 rounded-lg border border-accent">
                            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              Transcription
                            </h4>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{lead.transcript}</p>
                          </div>
                        )}

                        {/* Transcript action button */}
                        {lead.recording_url && !lead.transcript && (
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => triggerTranscription(lead)}
                              disabled={isTranscribing}
                              className="w-full"
                            >
                              {isTranscribing ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Transcription en cours...
                                </>
                              ) : (
                                <>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Générer la transcription
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {lead.notes && (
                          <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <p className="text-sm text-foreground">{lead.notes}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
